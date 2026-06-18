import { getMessageContent } from "../utils/messageModel.js";

const RECORD_GROUPS = [
  { key: "temp", title: "临时代吵", empty: "还没有保存过临时代吵记录。" },
  { key: "persona", title: "专属嘴替", empty: "还没有保存过专属嘴替记录。" },
  { key: "training", title: "训练场", empty: "还没有保存过训练场记录。" }
];

export default function RecordsPage({ temp, proxyPersona, training, records: recordState } = {}) {
  const expandedRecordIds = recordState?.expandedRecordIds || [];
  const groups = {
    temp: (temp?.chatHistories || []).map((item, index) => normalizeTempRecord(item, index)),
    persona: (proxyPersona?.chatHistories || []).map((item, index) => normalizePersonaRecord(item, index)),
    training: (training?.chatHistories || []).map((item, index) => normalizeTrainingRecord(item, index))
  };

  return `
    <div class="page records-page">
      <section class="profile-section">
        <h2>全部历史记录</h2>
        <p class="section-note">按来源归档，只保存真实对话；配置项会作为标签展示。</p>
      </section>

      ${RECORD_GROUPS.map((group) => RecordGroup(group, groups[group.key], expandedRecordIds)).join("")}
    </div>
  `;
}

function RecordGroup(group, records = [], expandedRecordIds = []) {
  return `
    <section class="records-group source-${escapeAttr(group.key)}">
      <div class="records-group-head">
        <div>
          <span class="persona-kicker">${escapeHtml(group.title)}</span>
          <h2>${records.length} 条记录</h2>
        </div>
        <button
          class="tiny-button"
          data-action="clear-history-source"
          data-history-source="${escapeAttr(group.key)}"
          ${records.length ? "" : "disabled"}
        >
          清空本类
        </button>
      </div>
      ${
        records.length
          ? records.map((record) => RecordCard(record, group.key, expandedRecordIds)).join("")
          : `<p class="records-empty-note">${escapeHtml(group.empty)}</p>`
      }
    </section>
  `;
}

function RecordCard(record, sourceKey, expandedRecordIds = []) {
  const recordKey = makeRecordKey(sourceKey, record.id);
  const isExpanded = expandedRecordIds.includes(recordKey);
  return `
    <section class="record-card ${isExpanded ? "expanded" : ""}">
      <div
        class="record-card-header"
        data-action="toggle-history-record"
        data-history-source="${escapeAttr(sourceKey)}"
        data-history-id="${escapeAttr(record.id)}"
        role="button"
        tabindex="0"
        aria-expanded="${isExpanded ? "true" : "false"}"
      >
        <div class="record-summary-main">
          <h3>${escapeHtml(record.title)}</h3>
          <div class="record-meta">
            <span>来源：${escapeHtml(record.source)}</span>
            <span>${escapeHtml(record.createdAt)}</span>
            <span>${escapeHtml(record.subjectLabel)}：${escapeHtml(record.subject)}</span>
            <span>强度：${escapeHtml(record.intensity)}</span>
            <span>${escapeHtml(record.messageCount)} 条消息</span>
          </div>
        </div>
        <button
          class="tiny-button danger-lite"
          data-action="delete-history-record"
          data-history-source="${escapeAttr(sourceKey)}"
          data-history-id="${escapeAttr(record.id)}"
        >
          删除
        </button>
      </div>
      ${
        isExpanded
          ? `
        <div class="record-detail">
          ${record.goal ? `<p><strong>目标</strong>${escapeHtml(record.goal)}</p>` : ""}
          ${record.context ? `<p><strong>背景</strong>${escapeHtml(record.context)}</p>` : ""}
          ${record.strategy ? `<p><strong>策略</strong>${escapeHtml(record.strategy)}</p>` : ""}
          <div class="record-transcript">
            ${record.messages.length ? record.messages.map(RecordMessage).join("") : `<p class="records-empty-note">这条记录没有可展示的对话。</p>`}
          </div>
        </div>
      `
          : ""
      }
    </section>
  `;
}

function RecordMessage(message) {
  const label = messageLabel(message.role);
  return `
    <article class="record-message role-${escapeAttr(message.role)}">
      <span>${escapeHtml(label)}</span>
      <p>${escapeHtml(getMessageContent(message))}</p>
    </article>
  `;
}

function normalizeTempRecord(item = {}, index = 0) {
  const messages = normalizeTempMessages(item);
  return {
    id: item.id || `temp-${item.createdAt || index}`,
    source: "临时代吵",
    title: item.object || "临时对手",
    subjectLabel: "场景",
    subject: item.object || "临时对手",
    intensity: item.tone || "未设置",
    strategy: item.tone ? `攻击力 ${item.tone}` : "",
    context: item.context || "",
    goal: item.goal || "",
    messageCount: messages.length,
    messages,
    createdAt: formatRecordTime(item.createdAt)
  };
}

function normalizePersonaRecord(item = {}, index = 0) {
  const messages = normalizeMessages(item.messages);
  return {
    id: item.id || `persona-${item.createdAt || index}`,
    source: "专属嘴替",
    title: item.personaName || "当前嘴替",
    subjectLabel: "人格",
    subject: item.personaName || "当前嘴替",
    intensity: item.intensity || "未设置",
    strategy: item.strategy || "",
    context: item.contextSummary || "",
    goal: item.userGoal || "",
    messageCount: messages.length,
    messages,
    createdAt: formatRecordTime(item.createdAt)
  };
}

function normalizeTrainingRecord(item = {}, index = 0) {
  const messages = normalizeMessages(item.messages);
  return {
    id: item.id || `training-${item.createdAt || index}`,
    source: "训练场",
    title: item.scene || "训练局",
    subjectLabel: "场景",
    subject: item.scene || "训练局",
    intensity: item.difficulty || "未设置",
    strategy: [item.playerRole, item.aiRole].filter(Boolean).join(" vs "),
    context: item.scene || "",
    goal: item.goal || "",
    messageCount: messages.length,
    messages,
    createdAt: formatRecordTime(item.createdAt)
  };
}

function normalizeTempMessages(item = {}) {
  if (Array.isArray(item.messages)) return normalizeMessages(item.messages);
  if (!Array.isArray(item.rounds)) return [];
  return item.rounds.flatMap((round) => {
    const reply = round.replies?.[0]?.text || "";
    return [
      { role: "opponent", content: round.opponent || "" },
      reply ? { role: "assistant", content: reply } : null
    ].filter(Boolean);
  });
}

function normalizeMessages(messages = []) {
  return messages
    .map((message) => ({
      role: normalizeRole(message.role),
      content: getMessageContent(message)
    }))
    .filter((message) => message.content);
}

function normalizeRole(role) {
  if (role === "user") return "user";
  if (role === "opponent") return "opponent";
  if (role === "assistant") return "assistant";
  if (role === "system") return "system";
  return "assistant";
}

function messageLabel(role) {
  if (role === "opponent") return "对方";
  if (role === "user") return "我";
  if (role === "system") return "训练提示";
  return "回复";
}

function makeRecordKey(sourceKey, id) {
  return `${sourceKey}:${id}`;
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

function formatRecordTime(value) {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
