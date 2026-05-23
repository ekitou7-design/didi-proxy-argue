export default function PersonaDistillPage(state) {
  return `
    <div class="page persona-distill-page">
      <section class="flow-hero persona-intro">
        <div>
          <strong>上传 txt，生成专属嘴替人格</strong>
          <p>把聊天记录、剧本或对话文本交给嘴替，让它学你的表达习惯和回怼方式。</p>
        </div>
        <button class="tiny-button" data-page="persona">返回</button>
      </section>

      <section class="input-panel setup-panel distill-flow-panel">
        <p class="privacy-warning">上传前建议删掉姓名、手机号、地址、学校、公司等隐私信息。</p>

        <section class="upload-strip">
          <strong>上传 txt 文件</strong>
          <p>也可以跳过上传，直接在下面粘贴文本。</p>
          <label class="file-button">
            <span>选择 txt 文件</span>
            <input type="file" accept=".txt,text/plain" data-file-input="persona-distill" />
          </label>
        </section>

        ${Field(
          "粘贴文本",
          "proxyPersona.upload.chatText",
          state.upload.chatText,
          "例如：\n我：你昨天为什么不回我？\n对方：你能不能别这么敏感？\n我：我不是要求你秒回，我是在说你每次都这样。",
          "chat-log-input"
        )}
        ${Field("目标人物是谁？", "proxyPersona.upload.targetSpeaker", state.upload.targetSpeaker, "例如：我 / 对方 / 甄嬛 / 顾里 / 男朋友")}
        ${SourceTypeField(state.upload.sourceType || "chat")}

        <button class="primary-button" data-action="generate-distill-persona">
          ${state.distillStatus === "loading" ? "正在蒸馏..." : "生成嘴替人格"}
        </button>
        ${state.message ? `<p class="section-note">${escapeHtml(state.message)}</p>` : ""}
      </section>

      ${state.distillResult ? DistillResult(state.distillResult) : ""}
    </div>
  `;
}

function DistillResult(result) {
  const persona = result.personaProfile || result;
  const expressionDNA = persona.expressionDNA || {};
  const antiPatterns = persona.antiPatterns || {};
  const boundaries = persona.honestBoundaries || {};
  const tags = persona.personalityTags || result.styleProfile?.commonPhrases || [];
  const sentencePatterns = persona.sentencePatterns || persona.languageFeatures?.sampleLines || result.styleProfile?.commonPhrases || [];

  return `
    <section class="result-card distill-result-card">
      <div class="card-title-row">
        <div>
          <h2>${escapeHtml(result.profileName)}</h2>
          <p>${escapeHtml(persona.oneLineSummary || result.styleProfile?.profileSummary || "已生成一个可用的嘴替人格。")}</p>
        </div>
        <span class="stamp">${persona.isMock ? "Demo" : "已生成"}</span>
      </div>

      <div class="tag-row">
        ${tags.slice(0, 5).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>

      <div class="profile-detail-grid">
        ${DetailBlock("表达 DNA", compactList([
          expressionDNA.messageLengthPreference,
          expressionDNA.rhythm,
          expressionDNA.punctuationHabits,
          expressionDNA.internetSlangLevel ? `网络感：${expressionDNA.internetSlangLevel}` : ""
        ]))}
        ${DetailBlock("常用句式", compactList(sentencePatterns.slice(0, 4)))}
        ${DetailBlock("不要这样说", compactList([
          ...(antiPatterns.neverUseTone || []),
          ...(antiPatterns.neverUseStructures || []),
          ...(antiPatterns.neverUseWords || []).slice(0, 3)
        ].slice(0, 5)))}
        ${DetailBlock("样本置信度", compactList([
          boundaries.confidence ? `置信度：${boundaries.confidence}` : "",
          boundaries.sampleSize ? `样本：${boundaries.sampleSize}` : "",
          ...(boundaries.limitations || []).slice(0, 2)
        ]))}
      </div>

      <details class="profile-details-fold">
        <summary>查看人格详情</summary>
        ${DetailBlock("回怼规则", compactList(persona.styleReproductionGuide?.sentenceRules || result.styleProfile?.commonPhrases || []))}
        ${DetailBlock("安全边界", compactList(persona.generationRules?.mustAvoid || persona.safetyBoundary?.doNotImitate || result.styleProfile?.avoidWords || []))}
      </details>

      <div class="button-row result-actions-stack">
        <button class="primary-button" data-action="save-distill-persona">使用这个嘴替</button>
        <button class="secondary-button warm" data-action="reset-distill-result">重新生成</button>
      </div>
    </section>
  `;
}

function DetailBlock(title, text) {
  return `
    <div class="temp-result-block">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text || "暂无明显特征，后续可以上传更多样本。")}</p>
    </div>
  `;
}

function SourceTypeField(value) {
  const options = [
    ["chat", "聊天记录"],
    ["script", "影视剧本"],
    ["unknown", "其他"]
  ];
  return `
    <label>
      <span>文本类型</span>
      <select class="select-field" data-setup-input="proxyPersona.upload.sourceType">
        ${options
          .map(
            ([key, label]) => `<option value="${key}" ${value === key ? "selected" : ""}>${label}</option>`
          )
          .join("")}
      </select>
    </label>
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

function compactList(items) {
  return items.filter(Boolean).join(" / ");
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
