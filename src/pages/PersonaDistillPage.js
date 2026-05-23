export default function PersonaDistillPage(state) {
  return `
    <div class="page persona-distill-page">
      <section class="temp-intro persona-intro">
        <div class="card-title-row">
          <div>
            <strong>蒸馏自己</strong>
            <p>上传你的聊天记录，让嘴替学会你的说话方式。</p>
          </div>
          <button class="tiny-button" data-page="persona">返回</button>
        </div>
      </section>

      <section class="input-panel setup-panel">
        <p class="privacy-warning">聊天记录可能包含隐私信息。上传前建议删除姓名、手机号、地址、学校、公司等敏感内容。本功能仅用于生成你的嘴替表达风格。</p>

        ${Field("我和对方的关系", "proxyPersona.upload.relationship", state.upload.relationship, "例如：谈了三个月的男朋友、室友、同学、同事、陌生人、甲方")}
        ${Field("前情提要", "proxyPersona.upload.background", state.upload.background, "例如：他经常已读不回，我表达不满后，他说我太敏感。", "long-field")}
        ${Field(
          "聊天记录文本",
          "proxyPersona.upload.chatText",
          state.upload.chatText,
          "请粘贴聊天记录，例如：\n我：你昨天为什么不回我？\n对方：我很忙啊，你能不能别这么敏感？\n我：我不是要求你秒回，我是在说你每次都这样。",
          "chat-log-input"
        )}

        <section class="upload-strip">
          <strong>上传聊天记录文件</strong>
          <p>上传聊天记录文件，目前建议使用 txt 文本文件。截图识别功能后续再支持。</p>
          <label class="file-button">
            <span>选择 txt 文件</span>
            <input type="file" accept=".txt,text/plain" data-file-input="persona-distill" />
          </label>
        </section>

        <button class="primary-button" data-action="generate-distill-persona">
          ${state.distillStatus === "loading" ? "正在蒸馏中..." : "生成我的嘴替档案"}
        </button>
        ${state.message ? `<p class="section-note">${escapeHtml(state.message)}</p>` : ""}
      </section>

      ${state.distillResult ? DistillResult(state.distillResult) : ""}
    </div>
  `;
}

function DistillResult(result) {
  const profile = result.styleProfile || {};
  return `
    <section class="result-card">
      <div class="card-title-row">
        <h2>${escapeHtml(result.profileName)}</h2>
        <span class="stamp">测出来了</span>
      </div>
      <div class="temp-result-block">
        <h3>表达风格</h3>
        <p>${escapeHtml(profile.tone)}</p>
      </div>
      <div class="temp-result-block">
        <h3>情绪强度</h3>
        <p>${escapeHtml(profile.emotionLevel)} / 5</p>
      </div>
      <div class="temp-result-block">
        <h3>逻辑方式</h3>
        <p>${escapeHtml(profile.logicStyle)}</p>
      </div>
      <div class="temp-result-block">
        <h3>常用表达</h3>
        <p>${escapeHtml((profile.commonPhrases || []).join(" / "))}</p>
      </div>
      <div class="temp-result-block">
        <h3>避免用语</h3>
        <p>${escapeHtml((profile.avoidWords || []).join(" / "))}</p>
      </div>
      <div class="temp-result-block">
        <h3>回应策略</h3>
        <p>${escapeHtml(profile.replyStrategy)}</p>
      </div>
      <div class="button-row result-actions-stack">
        <button class="primary-button" data-action="save-distill-persona">保存档案并返回专属嘴替</button>
        <button class="secondary-button warm" data-action="reset-distill-result">重新生成</button>
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
