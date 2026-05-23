const goals = ["反击对方逻辑", "表达不满", "争取道歉", "不吵大但讲清楚"];
const strengths = ["低强度", "中等强度", "高强度", "直接开怼"];

export default function PersonaPage(state) {
  const activeProfile = getActiveProfile(state);

  return `
    <div class="page persona-page">
      ${RealtimeReply(state, activeProfile)}
      ${StyleAnalysis(activeProfile)}

      <section class="feature-list two-entry">
        <button class="feature-card pink" data-page="personaDistill">
          <span class="feature-tone">蒸馏</span>
          <div><h3>蒸馏自己的语言</h3><p>粘贴聊天记录，让 AI 解构你的说话风格。</p><span class="enter-pill">去蒸馏</span></div>
          <span class="feature-arrow">›</span>
        </button>
        <button class="feature-card blue" data-page="personaTest">
          <span class="feature-tone">测试</span>
          <div><h3>做个嘴替测试</h3><p>用测试题快速生成一个嘴替人格。</p><span class="enter-pill">去测试</span></div>
          <span class="feature-arrow">›</span>
        </button>
      </section>

      ${DistillHistory(state.distillResults)}
      ${TestHistory(state.testResults)}
    </div>
  `;
}

function RealtimeReply(state, activeProfile) {
  return `
    <section class="input-panel setup-panel persona-reply-panel">
      <div class="card-title-row">
        <h2>按我的风格实时回复</h2>
        <span class="stamp">${activeProfile ? "已学习" : "先蒸馏"}</span>
      </div>
      ${
        activeProfile
          ? `<p class="section-note">当前使用：${escapeHtml(getProfileName(activeProfile))}</p>`
          : `<p class="section-note">先上传聊天记录蒸馏自己的语言风格，再让 AI 像你本人一样接话。</p>`
      }
      ${Field("对方刚刚说的话", "proxyPersona.replyForm.opponentMessage", state.replyForm.opponentMessage, "把对方最新一句话复制或转述到这里。")}
      ${Field("当前前情提要", "proxyPersona.replyForm.background", state.replyForm.background, "比如：刚才为什么吵起来、你们现在卡在哪里。", "long-field")}
      <div class="field-title">回应目标</div>
      ${ChipGroup("goal", goals, state.replyForm.goal)}
      <div class="field-title">回应强度</div>
      ${ChipGroup("strength", strengths, state.replyForm.strength)}
      <button class="primary-button" data-action="${activeProfile ? "generate-proxy-reply" : "go-persona-distill"}">${activeProfile ? "按我的风格接一句" : "先去蒸馏自己"}</button>
      ${state.message ? `<p class="section-note">${escapeHtml(state.message)}</p>` : ""}
      ${state.replyResult ? ReplyResult(state.replyResult) : ""}
    </section>
  `;
}

function StyleAnalysis(profile) {
  if (!profile) {
    return `
      <section class="empty-chat">
        还没有语言风格分析。点击“蒸馏自己的语言”，粘贴熟人聊天记录，AI 会拆出你的语气、逻辑方式、常用表达和表达边界。
      </section>
    `;
  }

  const style = profile.styleProfile || {};
  return `
    <section class="persona-summary compact-style-card">
      <div class="card-title-row">
        <h2>我的语言风格分析</h2>
        <span class="stamp">${escapeHtml(getProfileName(profile))}</span>
      </div>
      <p><strong>语气：</strong>${escapeHtml(style.tone || profile.nickname || "像本人，有边界")}</p>
      <p><strong>逻辑方式：</strong>${escapeHtml(style.logicStyle || profile.subtitle || "")}</p>
      <p><strong>回应策略：</strong>${escapeHtml(style.replyStrategy || style.profileSummary || profile.subtitle || "")}</p>
      <div class="tag-row">
        ${(style.commonPhrases || profile.dimensions || []).slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </section>
  `;
}

function DistillHistory(results) {
  if (!results.length) return "";
  return `
    <section class="persona-history compact-history">
      <h2>蒸馏历史</h2>
      ${results.map(DistillCard).join("")}
    </section>
  `;
}

function DistillCard(result) {
  const profile = result.styleProfile || {};
  return `
    <article class="persona-summary">
      <div class="card-title-row">
        <h2>${escapeHtml(result.profileName)}</h2>
        <span class="stamp">聊天记录</span>
      </div>
      <p>${escapeHtml(profile.profileSummary || profile.tone || "")}</p>
      <div class="button-row result-actions-stack">
        <button class="secondary-button warm" data-action="set-current-profile" data-profile-id="${escapeAttr(result.id)}">设为当前嘴替</button>
        <button class="secondary-button" data-action="delete-profile-result" data-profile-id="${escapeAttr(result.id)}">删除</button>
      </div>
    </article>
  `;
}

function TestHistory(results) {
  if (!results.length) return "";
  return `
    <section class="persona-history compact-history">
      <h2>测试历史</h2>
      ${results.map(TestCard).join("")}
    </section>
  `;
}

function TestCard(result) {
  const dimensions = result.dimensions || result.tags || [];
  return `
    <article class="persona-summary">
      <div class="card-title-row">
        <h2>${escapeHtml(result.typeName)}</h2>
        <span class="stamp">${escapeHtml(result.nickname)}</span>
      </div>
      <p>${escapeHtml(result.subtitle)}</p>
      <div class="tag-row">
        ${dimensions.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
      <div class="button-row result-actions-stack">
        <button class="secondary-button warm" data-action="set-current-profile" data-profile-id="${escapeAttr(result.id)}">设为当前嘴替</button>
        <button class="secondary-button" data-action="delete-profile-result" data-profile-id="${escapeAttr(result.id)}">删除</button>
      </div>
    </article>
  `;
}

function ReplyResult(result) {
  return `
    <section class="result-card inner-result">
      <h2>按你风格生成</h2>
      <div class="speech-paper"><p>${escapeHtml(result.reply)}</p></div>
      <div class="temp-result-block"><h3>回应策略</h3><p>${escapeHtml(result.strategy)}</p></div>
      <div class="temp-result-block"><h3>语气</h3><p>${escapeHtml(result.tone)}</p></div>
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

function getActiveProfile(state) {
  return (
    state.personas.find((persona) => String(persona.id) === String(state.selectedPersonaId)) ||
    state.currentProfile
  );
}

function getProfileName(profile) {
  return profile.profileName || profile.typeName || profile.name || "我的嘴替";
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
