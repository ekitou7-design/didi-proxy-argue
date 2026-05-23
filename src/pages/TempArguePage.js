import { goalOptions, makeContextSummary, toneOptions } from "../data/mockData.js";

export default function TempArguePage(session) {
  if (session.step === "chat") return ChatPage(session);

  return `
    <div class="page form-page">
      <section class="temp-intro">
        <strong>临时吵</strong>
        <p>马上遇事，马上开吵。</p>
      </section>

      <section class="input-panel setup-panel">
        ${Field({
          label: "对方是谁",
          path: "temp.who",
          value: session.who,
          placeholder: "比如：客服、同学、路人、网友、商家"
        })}
        ${Field({
          label: "对方说了什么",
          path: "temp.latest",
          value: session.latest,
          placeholder: "把对方刚刚说的话粘到这里。"
        })}
        ${Field({
          label: "前情提要",
          path: "temp.context",
          value: session.context,
          placeholder: "简单说一下为什么吵起来。",
          className: "long-field"
        })}

        <div class="field-title">我想达到的效果</div>
        ${ChipGroup("temp", "goal", goalOptions, session.goal)}

        <div class="field-title">攻击力选择</div>
        ${ChipGroup("temp", "tone", toneOptions, session.tone)}

        <button class="primary-button" data-action="start-temp-chat">生成话术</button>
      </section>
    </div>
  `;
}

function ChatPage(session) {
  const summary = makeContextSummary(session);
  const visibleRounds = [...session.rounds].reverse();
  return `
    <div class="page chat-page">
      <section class="chat-status">
        <div class="status-head">
          <strong>临时吵</strong>
          <button class="tiny-button" data-action="edit-temp-setup">修改</button>
        </div>
        <p>对象：${escapeHtml(summary.object)}</p>
        <p>目标：${escapeHtml(summary.goal)} / 攻击力：${escapeHtml(summary.tone)}</p>
      </section>

      <section class="chat-log">
        ${visibleRounds.length ? visibleRounds.map(ChatRound).join("") : EmptyChat("对方说一句，你告诉我一句，App 帮你实时接话。")}
      </section>

      <section class="chat-composer">
        <textarea data-session-input="temp" placeholder="对方又说了什么？">${escapeHtml(session.input)}</textarea>
        <button class="primary-button" data-action="temp-reply" ${session.isSubmitting ? "disabled" : ""}>
          ${session.isSubmitting ? "正在接话..." : "帮我接一句"}
        </button>
      </section>
    </div>
  `;
}

export function ChatRound(round) {
  return `
    <article class="chat-round">
      <div class="bubble-card opponent"><span>对方</span><p>${escapeHtml(round.opponent)}</p></div>
      <div class="ai-panel">
        <h3>对方话术分析</h3>
        <p>${escapeHtml(round.analysis)}</p>
        <h3>本轮主线提醒</h3>
        <p>${escapeHtml(round.mainline)}</p>
        <div class="reply-list">
          ${round.replies.map(ReplyOption).join("")}
        </div>
      </div>
    </article>
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

function Field({ label, path, value, placeholder, className = "" }) {
  return `
    <label class="${className}">
      <span>${label}</span>
      <textarea data-setup-input="${path}" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value)}</textarea>
    </label>
  `;
}

function ChipGroup(sessionKey, field, options, active) {
  return `
    <div class="chip-group">
      ${options
        .map(
          (item) =>
            `<button class="chip ${active === item ? "active" : ""}" data-chip-session="${sessionKey}" data-chip-field="${field}" data-chip-value="${escapeAttr(item)}">${item}</button>`
        )
        .join("")}
    </div>
  `;
}

function EmptyChat(text) {
  return `<div class="empty-chat">${text}</div>`;
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
