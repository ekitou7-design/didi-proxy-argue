import { personaTestQuestions } from "../data/mockData.js";

const goals = ["反击对方逻辑", "表达不满", "争取道歉", "不吵大但讲清楚"];
const strengths = ["低强度", "中等强度", "高强度", "直接开怼"];

export default function PersonaPage(state) {
  return `
    <div class="page persona-page">
      <section class="hero-panel compact-hero">
        <div class="brand-lockup">
          <p class="hero-kana">PROXY PERSONA</p>
          <h2>专属嘴替</h2>
          <p>训练一个像你的吵架分身，替你稳定输出。</p>
        </div>
      </section>

      <section class="feature-list two-entry">
        <button class="feature-card pink ${state.activeTab === "upload" ? "selected" : ""}" data-persona-tab="upload">
          <span class="feature-tone">蒸馏</span>
          <div><h3>蒸馏自己</h3><p>上传或粘贴聊天记录，生成更像你的表达风格。</p></div>
          <span class="feature-arrow">›</span>
        </button>
        <button class="feature-card blue ${state.activeTab === "test" ? "selected" : ""}" data-persona-tab="test">
          <span class="feature-tone">测试</span>
          <div><h3>做个测试题</h3><p>通过几道题快速生成你的嘴替人格。</p></div>
          <span class="feature-arrow">›</span>
        </button>
      </section>

      ${state.activeTab === "test" ? TestForm(state) : UploadForm(state)}
      ${PersonaList(state)}
      ${ReplyGenerator(state)}
    </div>
  `;
}

function UploadForm(state) {
  return `
    <section class="input-panel setup-panel">
      <div class="card-title-row"><h2>蒸馏自己</h2><span class="stamp">更像你</span></div>
      <p class="privacy-warning">聊天记录可能包含隐私信息，请尽量删除姓名、手机号、地址等敏感内容后再上传。</p>
      ${Field("我和对方的关系", "proxyPersona.upload.relationship", state.upload.relationship, "比如：谈了 3 个月的男友、总是甩锅的组员")}
      ${Field("前情提要", "proxyPersona.upload.background", state.upload.background, "比如：最近他经常不回消息，昨天临时改约后说我太敏感。", "long-field")}
      ${Field("聊天记录文本", "proxyPersona.upload.chatText", state.upload.chatText, "粘贴你自己的聊天记录，越能体现你的说话方式越好。", "chat-log-input")}
      <button class="primary-button" data-action="upload-chat-persona">生成嘴替档案</button>
      ${Message(state.message)}
    </section>
  `;
}

function TestForm(state) {
  return `
    <section class="input-panel setup-panel">
      <div class="card-title-row"><h2>测试题生成</h2><span class="stamp">5 题</span></div>
      ${personaTestQuestions.map((question) => Question(question, state.testAnswers[question.id])).join("")}
      <button class="primary-button" data-action="submit-persona-test">提交并生成档案</button>
      ${Message(state.message)}
    </section>
  `;
}

function Question(question, answer) {
  return `
    <div class="test-question">
      <strong>${question.title}</strong>
      <div class="answer-grid">
        ${question.options
          .map(
            (option) => `
              <button class="answer-chip ${answer === option.value ? "active" : ""}" data-question-id="${question.id}" data-test-answer="${option.value}">
                ${option.label}
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function PersonaList(state) {
  if (!state.personas.length) {
    return `<section class="empty-chat">还没有嘴替档案。先用上面的任一入口生成一个。</section>`;
  }
  return `
    <section class="profile-section">
      <h2>我的嘴替档案</h2>
      <label>
        <span>选择嘴替档案</span>
        <select class="select-field" data-setup-input="proxyPersona.selectedPersonaId">
          ${state.personas.map((persona) => `<option value="${persona.id}" ${String(persona.id) === String(state.selectedPersonaId) ? "selected" : ""}>${escapeHtml(persona.name)} · ${escapeHtml(persona.tone)}</option>`).join("")}
        </select>
      </label>
      ${state.personas.map(PersonaCard).join("")}
    </section>
  `;
}

function PersonaCard(persona) {
  return `
    <article class="persona-summary">
      <div class="card-title-row">
        <h2>${escapeHtml(persona.name)}</h2>
        <span class="stamp">${persona.sourceType === "test" ? "测试" : "蒸馏"}</span>
      </div>
      <p>${escapeHtml(persona.profileSummary)}</p>
      <div class="tag-row">
        <span>${escapeHtml(persona.tone)}</span>
        <span>情绪 ${persona.emotionLevel}/5</span>
        <span>${escapeHtml(persona.logicStyle)}</span>
      </div>
    </article>
  `;
}

function ReplyGenerator(state) {
  return `
    <section class="input-panel setup-panel">
      <div class="card-title-row"><h2>个性化回应</h2><span class="stamp">实时接话</span></div>
      ${Field("对方刚刚说的话", "proxyPersona.replyForm.opponentMessage", state.replyForm.opponentMessage, "把对方最新一句话复制或转述到这里。")}
      ${Field("当前前情提要", "proxyPersona.replyForm.background", state.replyForm.background, "比如：刚才为什么吵起来、你们现在卡在哪里。", "long-field")}
      <div class="field-title">回应目标</div>
      ${ChipGroup("goal", goals, state.replyForm.goal)}
      <div class="field-title">回应强度</div>
      ${ChipGroup("strength", strengths, state.replyForm.strength)}
      <button class="primary-button" data-action="generate-proxy-reply">生成回应</button>
      ${state.replyResult ? ReplyResult(state.replyResult) : ""}
    </section>
  `;
}

function ReplyResult(result) {
  return `
    <section class="result-card inner-result">
      <h2>生成结果</h2>
      <div class="speech-paper"><p>${escapeHtml(result.reply)}</p></div>
      <div class="temp-result-block">
        <h3>回应策略</h3>
        <p>${escapeHtml(result.strategy)}</p>
      </div>
      <div class="temp-result-block">
        <h3>语气</h3>
        <p>${escapeHtml(result.tone)}</p>
      </div>
    </section>
  `;
}

function Field(label, path, value, placeholder, className = "") {
  return `
    <label class="${className}">
      <span>${label}</span>
      <textarea data-setup-input="${path}" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value)}</textarea>
    </label>
  `;
}

function ChipGroup(field, options, active) {
  return `
    <div class="chip-group">
      ${options
        .map(
          (item) =>
            `<button class="chip ${active === item ? "active" : ""}" data-chip-session="proxyPersona.replyForm" data-chip-field="${field}" data-chip-value="${escapeAttr(item)}">${item}</button>`
        )
        .join("")}
    </div>
  `;
}

function Message(text) {
  return text ? `<p class="section-note">${escapeHtml(text)}</p>` : "";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
