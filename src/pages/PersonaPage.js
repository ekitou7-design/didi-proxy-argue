const goals = ["反击对方逻辑", "表达不满", "争取道歉", "不吵大但讲清楚"];
const strengths = ["低强度", "中等强度", "高强度", "直接开怼"];

export default function PersonaPage(state) {
  return `
    <div class="page persona-page">
      <section class="hero-panel compact-hero">
        <div class="brand-lockup">
          <p class="hero-kana">PROXY PERSONA</p>
          <h2>专属嘴替</h2>
          <p>做一套人格测试，生成你的嘴替战斗皮肤。</p>
        </div>
      </section>

      ${CurrentProfile(state.currentProfile)}

      <section class="feature-list two-entry">
        <button class="feature-card blue" data-page="personaTest">
          <span class="feature-tone">测试</span>
          <div><h3>做个测试题</h3><p>跳到独立测试页，22 道题生成嘴替人格。</p></div>
          <span class="feature-arrow">›</span>
        </button>
        ${TestHistory(state.testResults)}
      </section>
    </div>
  `;
}

function CurrentProfile(profile) {
  if (!profile) {
    return `<section class="empty-chat">当前嘴替：还没设置。可以先蒸馏自己，或者做一次测试。</section>`;
  }

  return `
    <section class="chat-status persona-status">
      <strong>当前嘴替：${escapeHtml(profile.profileName || profile.typeName)}</strong>
      <p>${escapeHtml(profile.styleProfile?.profileSummary || profile.subtitle || "")}</p>
    </section>
  `;
}

function DistillHistory(results) {
  if (!results.length) {
    return `<div class="empty-chat compact-empty">还没有蒸馏结果。完成蒸馏后会显示在这里。</div>`;
  }

  return `
    <section class="persona-history">
      <h2>蒸馏结果</h2>
      ${results.map(DistillCard).join("")}
    </section>
  `;
}

function DistillCard(result) {
  const profile = result.styleProfile || {};
  const phrases = (profile.commonPhrases || []).slice(0, 3);
  return `
    <article class="persona-summary">
      <div class="card-title-row">
        <h2>${escapeHtml(result.profileName)}</h2>
        <span class="stamp">聊天记录蒸馏</span>
      </div>
      <p><strong>生成时间：</strong>${formatTime(result.createdAt)}</p>
      <p><strong>关系：</strong>${escapeHtml(result.relationship || "未填写")}</p>
      <p>${escapeHtml(profile.profileSummary)}</p>
      <div class="tag-row">
        ${phrases.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
      <div class="button-row result-actions-stack">
        <button class="secondary-button warm" data-action="set-current-profile" data-profile-id="${escapeAttr(result.id)}">设为当前嘴替</button>
        <button class="secondary-button" data-action="delete-profile-result" data-profile-id="${escapeAttr(result.id)}">删除</button>
      </div>
    </article>
  `;
}

function TestHistory(results) {
  if (!results.length) {
    return `<div class="empty-chat compact-empty">还没有历史测评结果。做完测试后会显示在这里。</div>`;
  }

  return `
    <section class="persona-history">
      <h2>历史测评结果</h2>
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
      <p><strong>测试时间：</strong>${formatTime(result.createdAt)}</p>
      <div class="button-row result-actions-stack">
        <button class="secondary-button warm" data-action="set-current-profile" data-profile-id="${escapeAttr(result.id)}">设为当前嘴替</button>
        <button class="secondary-button" data-action="delete-profile-result" data-profile-id="${escapeAttr(result.id)}">删除</button>
      </div>
    </article>
  `;
}

function PersonaList(state) {
  if (!state.personas.length) {
    return `<section class="empty-chat">还没有嘴替档案。先蒸馏自己，或去做一次测试。</section>`;
  }

  return `
    <section class="profile-section">
      <h2>我的嘴替档案</h2>
      <label>
        <span>选择嘴替档案</span>
        <select class="select-field" data-setup-input="proxyPersona.selectedPersonaId">
          ${state.personas
            .map(
              (persona) =>
                `<option value="${escapeAttr(persona.id)}" ${String(persona.id) === String(state.selectedPersonaId) ? "selected" : ""}>${escapeHtml(persona.profileName || persona.typeName)} · ${escapeHtml(persona.styleProfile?.tone || persona.nickname || "")}</option>`
            )
            .join("")}
        </select>
      </label>
    </section>
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
      ${state.message ? `<p class="section-note">${escapeHtml(state.message)}</p>` : ""}
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

function formatTime(value) {
  if (!value) return "刚刚";
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
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
