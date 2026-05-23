import { proxyStyleOptions } from "../data/mockData.js";

export default function PersonaPage(state) {
  const activeProfile = getActiveProfile(state);

  return `
    <div class="page persona-page">
      <section class="temp-intro persona-intro">
        <strong>专属嘴替</strong>
        <p>训练一个最像你的嘴替人格。</p>
      </section>

      ${CurrentProfile(activeProfile)}

      <section class="input-panel setup-panel persona-reply-panel">
        <button class="feature-card pink upload-entry" data-page="personaDistill">
          <span class="feature-tone">上传</span>
          <div><h3>上传聊天记录入口</h3><p>粘贴聊天记录，让 AI 学你的说话方式。</p></div>
          <span class="feature-arrow">›</span>
        </button>

        <button class="feature-card blue upload-entry" data-page="personaTest">
          <span class="feature-tone">测试</span>
          <div><h3>做个嘴替人格测试</h3><p>22 道题生成你的回怼人格，并设为当前嘴替。</p></div>
          <span class="feature-arrow">›</span>
        </button>

        ${Field("对方刚刚说了什么", "proxyPersona.replyForm.opponentMessage", state.replyForm.opponentMessage, "把对方最新一句话粘到这里，嘴替会按当前人格帮你回怼。")}
        ${Field("当前前情提要", "proxyPersona.replyForm.background", state.replyForm.background, "比如：他刚刚说我太敏感，但我想说的是他临时改约这件事。")}
        ${Field("我想达到什么目的", "proxyPersona.replyForm.goal", state.replyForm.goal, "比如：让对方别再转移话题，承认这件事确实处理得不尊重人。")}

        <div class="field-title">选择嘴替风格</div>
        <div class="chip-group">
          ${proxyStyleOptions
            .map(
              (item) =>
                `<button class="chip ${state.replyForm.strength === item ? "active" : ""}" data-chip-session="proxyPersona.replyForm" data-chip-field="strength" data-chip-value="${escapeAttr(item)}">${item}</button>`
            )
            .join("")}
        </div>

        <button class="primary-button" data-action="${activeProfile ? "generate-proxy-reply" : "go-persona-distill"}" ${state.isReplyGenerating ? "disabled" : ""}>
          ${state.isReplyGenerating ? "生成中..." : "开始专属代吵"}
        </button>
        ${state.message ? `<p class="section-note">${escapeHtml(state.message)}</p>` : ""}
        ${state.replyResult ? ReplyResult(state.replyResult) : ""}
      </section>
    </div>
  `;
}

function CurrentProfile(profile) {
  if (!profile) {
    return `<section class="empty-chat">当前嘴替人格：还没创建。可以先上传聊天记录蒸馏自己。</section>`;
  }

  const style = profile.styleProfile || {};
  return `
    <section class="persona-summary compact-style-card">
      <div class="card-title-row">
        <h2>当前嘴替人格</h2>
        <span class="stamp">${escapeHtml(getProfileName(profile))}</span>
      </div>
      <p>${escapeHtml(style.profileSummary || profile.subtitle || "已准备按你的风格接话。")}</p>
      <div class="tag-row">
        ${(style.commonPhrases || profile.tags || profile.dimensions || []).slice(0, 4).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </section>
  `;
}

function ReplyResult(result) {
  return `
    <section class="result-card inner-result">
      <h2>专属嘴替生成</h2>
      <div class="speech-paper"><p>${escapeHtml(result.reply)}</p></div>
      <div class="temp-result-block"><h3>回应策略</h3><p>${escapeHtml(result.strategy)}</p></div>
      <div class="temp-result-block"><h3>语气</h3><p>${escapeHtml(result.tone)}</p></div>
    </section>
  `;
}

function Field(label, path, value, placeholder) {
  return `
    <label>
      <span>${label}</span>
      <textarea data-setup-input="${path}" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value)}</textarea>
    </label>
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
