import { AiSourceBadge } from "../utils/aiSource.js";

export default function PersonaDistillPage(state) {
  return `
    <div class="page persona-distill-page">
      <section class="flow-hero persona-intro">
        <div>
          <strong>多格式人格蒸馏</strong>
          <p>把聊天记录、剧本、语录或结构化样本交给嘴替，让它学习你的表达习惯。</p>
        </div>
        <button class="tiny-button" data-page="persona">返回</button>
      </section>

      <section class="input-panel setup-panel distill-flow-panel">
        <p class="privacy-warning">上传前建议删掉姓名、手机号、地址、学校、公司等隐私信息。</p>

        ${DistillEntryCards(state.upload.distillInputType || "text")}
        ${DistillInputPanel(state)}
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

function DistillEntryCards(activeType) {
  const entries = [
    { type: "text", title: "上传 txt / md", desc: "按纯文本读取", tone: "TXT" },
    { type: "paste", title: "粘贴聊天记录", desc: "聊天、剧本、语录", tone: "粘" },
    { type: "csv", title: "上传 csv", desc: "字段样本训练", tone: "CSV" },
    { type: "json", title: "上传 json", desc: "结构化人格样本", tone: "JSON" },
    { type: "image", title: "上传聊天截图", desc: "beta / 即将支持", tone: "图", placeholder: "截图识别将在后续版本支持，目前请先复制文字粘贴。" },
    { type: "media", title: "上传音频 / 视频", desc: "beta / 即将支持", tone: "音", placeholder: "音视频转写将在后续版本支持，目前请先粘贴转写文本。" }
  ];
  return `
    <div class="distill-entry-grid">
      ${entries
        .map((entry) => {
          const isPlaceholder = Boolean(entry.placeholder);
          const active = activeType === entry.type;
          return `
            <button
              class="distill-entry-card ${active ? "active" : ""} ${isPlaceholder ? "is-beta" : ""}"
              data-action="${isPlaceholder ? "distill-placeholder" : "set-distill-input-type"}"
              data-distill-type="${escapeAttr(entry.type)}"
              ${isPlaceholder ? `data-placeholder-message="${escapeAttr(entry.placeholder)}"` : ""}
            >
              <span>${escapeHtml(entry.tone)}</span>
              <strong>${escapeHtml(entry.title)}</strong>
              <small>${escapeHtml(entry.desc)}</small>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function DistillInputPanel(state) {
  const upload = state.upload || {};
  const type = upload.distillInputType || "text";
  if (type === "csv") return CsvInputPanel(upload);
  if (type === "json") return JsonInputPanel(upload);
  if (type === "paste") return PasteInputPanel(upload);
  return TextFileInputPanel(upload);
}

function TextFileInputPanel(upload) {
  return `
    <section class="upload-strip distill-source-panel">
      <strong>上传 txt / md 文件</strong>
      <p>txt / md 都按纯文本读取，也可以上传后在下方继续编辑。</p>
      <label class="file-button">
        <span>选择 txt / md 文件</span>
        <input type="file" accept=".txt,.md,text/plain,text/markdown" data-file-input="persona-distill-text" data-distill-format="text" />
      </label>
      ${upload.uploadedFileName ? `<p class="section-note compact-status-note">当前文件：${escapeHtml(upload.uploadedFileName)}</p>` : ""}
    </section>
    ${TrainingTextPreview(upload.chatText)}
  `;
}

function PasteInputPanel(upload) {
  return Field(
    "粘贴聊天记录 / 剧本 / 语录",
    "proxyPersona.upload.chatText",
    upload.chatText,
    "支持格式：\nA：xxx\nB：xxx\n对方：xxx\n我：xxx\n角色名：台词",
    "chat-log-input"
  );
}

function CsvInputPanel(upload) {
  return `
    <section class="upload-strip distill-source-panel">
      <strong>上传 csv 文件</strong>
      <p>支持 scene, opponent, reply, intensity, strategy；或 场景, 对方说, 回复, 强度, 策略。</p>
      <label class="file-button">
        <span>选择 csv 文件</span>
        <input type="file" accept=".csv,text/csv" data-file-input="persona-distill-csv" data-distill-format="csv" />
      </label>
      ${upload.uploadedFileName ? `<p class="section-note compact-status-note">当前文件：${escapeHtml(upload.uploadedFileName)}</p>` : ""}
    </section>
    ${TrainingTextPreview(upload.normalizedTrainingText || upload.chatText)}
  `;
}

function JsonInputPanel(upload) {
  return `
    <section class="upload-strip distill-source-panel">
      <strong>上传 json 文件</strong>
      <p>支持 personaName、styleTags 和 examples 数组，前端会组合成训练文本。</p>
      <label class="file-button">
        <span>选择 json 文件</span>
        <input type="file" accept=".json,application/json" data-file-input="persona-distill-json" data-distill-format="json" />
      </label>
      ${upload.uploadedFileName ? `<p class="section-note compact-status-note">当前文件：${escapeHtml(upload.uploadedFileName)}</p>` : ""}
    </section>
    ${TrainingTextPreview(upload.normalizedTrainingText || upload.chatText)}
  `;
}

function TrainingTextPreview(value) {
  return Field(
    "训练文本预览",
    "proxyPersona.upload.chatText",
    value,
    "上传或粘贴后，这里会显示最终送去蒸馏的文本。",
    "chat-log-input"
  );
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
        ${result.source ? AiSourceBadge(result.source, "真实 AI") : `<span class="ai-source-pill unknown">来源异常</span>`}
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
