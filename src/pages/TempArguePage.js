import { toneOptions } from "../data/mockData.js";
import { ChatBubble, CopyAction } from "../components/ChatBubble.js";
import { escapeAttr, escapeHtml } from "../utils/html.js";
import { splitReplyMessages } from "../utils/message.js";

export default function TempArguePage(session) {
  return `
    <div class="page realtime-chat-page temp-chat-page">
      ${TempSettings(session)}
      ${TempChatPanel(session)}
      ${TempInputBar(session)}
      ${session.settingsOpen ? TempSettingsSheet(session) : ""}
    </div>
  `;
}

function TempSettings(session) {
  const scenario = session.generatedScenario;
  return `
    <section class="realtime-settings-card temp-settings-card">
      <div class="settings-title-row">
        <div>
          <span class="persona-kicker">当前临时场景</span>
          <h2>${escapeHtml(scenario?.title || session.who || "临时对手")}</h2>
          <p>${escapeHtml(scenario?.background || session.context || "先补一下前情，嘴替才好接话。")}</p>
        </div>
        <div class="temp-settings-actions">
          <button class="secondary-button warm random-scenario-button" data-action="generate-temp-scenario" data-tour="temp-generate-scenario" ${session.scenarioStatus === "loading" ? "disabled" : ""}>
            ${session.scenarioStatus === "loading" ? "刷新中..." : "换个场景"}
          </button>
          <button class="primary-button random-scenario-button" data-action="open-temp-settings" data-tour="temp-settings">场景设置</button>
        </div>
      </div>
      ${session.scenarioMessage ? `<p class="section-note compact-status-note">${escapeHtml(session.scenarioMessage)}</p>` : ""}
    </section>
  `;
}

function TempSettingsSheet(session) {
  return `
    <section class="persona-sheet-backdrop">
      <div class="persona-create-sheet compact-settings-sheet" role="dialog" aria-label="临时吵设置">
        <div class="card-title-row">
          <h2>场景设置</h2>
          <button class="tiny-button" data-action="close-temp-settings">完成</button>
        </div>
        <button class="primary-button compact-full-button" data-action="generate-temp-scenario" ${session.scenarioStatus === "loading" ? "disabled" : ""}>
          ${session.scenarioStatus === "loading" ? "生成中..." : session.generatedScenario ? "刷新临时吵架场景" : "生成临时吵架场景"}
        </button>
        ${session.generatedScenario ? TempScenarioSummary(session.generatedScenario) : ""}
        <div class="settings-grid">
          ${SmallField("和谁吵", "temp.who", session.who, "用户自己填写，例如：客服、同学、对象、室友")}
          ${SmallField("对方说了什么", "temp.latest", session.latest, "把对方刚刚说的话放这里")}
          ${SmallField("前情提要", "temp.context", session.context, "简单说一下为什么吵起来", "wide")}
          ${SmallField("我的诉求", "temp.goal", session.goal, "写清楚这次想达到什么，例如：要求退款、要求道歉、讲清责任", "wide")}
        </div>
        <div class="settings-inline-groups" data-tour="temp-intensity">
          <div>
            <span class="mini-field-title">攻击力</span>
            ${ChipGroup("tone", toneOptions, session.tone, "intensity")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function TempScenarioSummary(scenario) {
  const mainline = scenario.mainline || {};
  return `
    <div class="temp-scenario-summary">
      <div class="temp-result-block">
        <h3>对方人设</h3>
        <p>${escapeHtml(scenario.opponentPersona)}</p>
      </div>
      <div class="temp-result-block">
        <h3>推荐主线</h3>
        <p>${escapeHtml([mainline.fact, mainline.impact, mainline.request, mainline.boundary].filter(Boolean).join(" "))}</p>
      </div>
    </div>
  `;
}

function TempChatPanel(session) {
  const visibleRounds = [...session.rounds];
  return `
    <section class="realtime-chat-panel temp-dialog-panel" aria-label="临时吵实时对话">
      <div class="persona-chat-scroll realtime-chat-scroll">
        ${
          visibleRounds.length
            ? visibleRounds.map(ChatRound).join("")
            : EmptyConversationState("当前还没有对话。", "输入对方新一句后，这里只显示真实对话和生成回复。")
        }
      </div>
    </section>
  `;
}

function EmptyConversationState(title, text) {
  return `
    <div class="conversation-empty-state">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
}

function ChatRound(round) {
  const bestReply = round.replies?.[0]?.text || "";
  const otherReplies = (round.replies || []).slice(1);
  const replyContent = bestReply || round.analysis || "AI 调用失败，请稍后重试。";
  const isAiFailed = round.source === "fallback" || !bestReply;
  return `
    <article class="realtime-round">
      ${ChatBubble({ side: "left", label: "对方", avatar: "对", content: round.opponent })}
      ${
        isAiFailed
          ? ChatBubble({ side: "right", label: "AI 调用失败", avatar: "吵", content: replyContent })
          : ReplyBubbles(bestReply)
      }
      <details class="round-more">
        <summary>看分析和备选</summary>
        <div class="temp-result-block">
          <h3>对方话术</h3>
          <p>${escapeHtml(round.analysis)}</p>
        </div>
        <div class="temp-result-block">
          <h3>主线提醒</h3>
          <p>${escapeHtml(round.mainline)}</p>
        </div>
        <div class="reply-list compact-replies">
          ${otherReplies.map(ReplyOption).join("")}
        </div>
      </details>
    </article>
  `;
}

function ReplyBubbles(text) {
  return splitReplyMessages(text)
    .map(
      (piece) =>
        ChatBubble({
          side: "right",
          label: "可发送回复",
          avatar: "吵",
          content: piece,
          actions: CopyAction(piece)
        })
    )
    .join("");
}

function TempInputBar(session) {
  return `
    <section class="realtime-input-bar">
      <textarea data-session-input="temp" data-enter-action="temp-reply" data-tour="temp-opponent-input" placeholder="输入对方新一句，或写下你想表达的意思">${escapeHtml(session.input)}</textarea>
      <div class="temp-input-actions">
        <button class="secondary-button warm" data-action="temp-reply-intent" data-tour="temp-reply-intent" ${session.isSubmitting ? "disabled" : ""}>
          按我的意思
        </button>
        <button class="primary-button" data-action="temp-reply" data-tour="temp-reply-opponent" ${session.isSubmitting ? "disabled" : ""}>
          ${session.isSubmitting ? "接话中..." : "按对方新话"}
        </button>
      </div>
    </section>
  `;
}

function ReplyOption(reply) {
  return `
    <div class="reply-option">
      <strong>${escapeHtml(reply.label)}</strong>
      <p>${escapeHtml(reply.text)}</p>
      <button class="mini-copy" data-copy-reply="${escapeAttr(reply.text)}">复制发送</button>
    </div>
  `;
}

function SmallField(label, path, value, placeholder, className = "") {
  return `
    <label class="compact-field ${className}">
      <span>${label}</span>
      <textarea data-setup-input="${path}" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value)}</textarea>
    </label>
  `;
}

function ChipGroup(field, options, active, extraClass = "") {
  return `
    <div class="chip-group compact">
      ${options
        .map(
          (item) =>
            `<button class="chip tiny-chip ${extraClass} ${active === item ? "active" : ""}" data-chip-session="temp" data-chip-field="${field}" data-chip-value="${escapeAttr(item)}">${item}</button>`
        )
        .join("")}
    </div>
  `;
}
