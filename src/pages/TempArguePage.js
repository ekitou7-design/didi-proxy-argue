import { goalOptions, makeContextSummary, toneOptions, whoOptions } from "../data/mockData.js";

export default function TempArguePage(session) {
  if (session.step === "chat") return ChatPage(session);

  return `
    <div class="page form-page">
      <section class="temp-intro">
        <strong>临时冲突，不存长期档案</strong>
        <p>适合陌生人、商家、网友、客服、临时合作对象。标签只是垫脚石，真正重要的是你写下来的关系和前情。</p>
      </section>
      ${SetupForm("temp", session)}
    </div>
  `;
}

function SetupForm(key, session) {
  return `
    <section class="input-panel setup-panel">
      ${Field({
        label: "你现在要和谁吵？",
        path: `${key}.who`,
        value: session.who,
        placeholder: "比如：谈了 3 个月的男友、总是甩锅的组员、态度很差的客服、经常阴阳怪气的室友、刚认识但关系暧昧的人"
      })}
      ${ChipGroup(key, "who", whoOptions, session.who)}

      ${Field({
        label: "前情提要",
        path: `${key}.context`,
        value: session.context,
        placeholder: "比如：我们谈了 3 个月，最近他经常不回消息。昨天约好一起吃饭，他临时说要和朋友出去，我表达不满后他说我太敏感。",
        className: "long-field",
        hint: "写得越具体，App 越能帮你抓住主线。"
      })}

      ${Field({
        label: "对方刚刚说了什么？",
        path: `${key}.latest`,
        value: session.latest,
        placeholder: "把对方最新一句话复制或转述到这里。"
      })}

      ${Field({
        label: "你想达到什么目的？",
        path: `${key}.goal`,
        value: session.goal,
        placeholder: "比如：我想让他知道我不是无理取闹，而是希望他尊重约定。"
      })}
      ${ChipGroup(key, "goal", goalOptions, session.goal)}

      ${Field({
        label: "你希望用什么语气？",
        path: `${key}.tone`,
        value: session.tone,
        placeholder: "比如：像我平时说话一样，不要太官方，但要有压迫感。"
      })}
      ${ChipGroup(key, "tone", toneOptions, session.tone)}

      ${Field({
        label: "有什么话不能说？",
        path: `${key}.boundary`,
        value: session.boundary,
        placeholder: "比如：不要骂脏话、不要人身攻击、不要提分手、不要牵扯家人、不要把关系彻底闹僵。"
      })}

      <button class="primary-button" data-action="start-temp-chat">开始实时接话</button>
    </section>
  `;
}

function ChatPage(session) {
  const summary = makeContextSummary(session);
  return `
    <div class="page chat-page">
      <section class="chat-status">
        <div class="status-head">
          <strong>临时代吵中</strong>
          <button class="tiny-button" data-action="edit-temp-setup">修改背景</button>
        </div>
        <p>对象：${escapeHtml(summary.object)}</p>
        <p>目标：${escapeHtml(summary.goal)}</p>
        <p>语气：${escapeHtml(summary.tone)}</p>
      </section>

      <section class="chat-log">
        ${session.rounds.length ? session.rounds.map(ChatRound).join("") : EmptyChat("对方说一句，你告诉我一句，App 帮你实时接话。")}
      </section>

      <section class="chat-composer">
        <textarea data-session-input="temp" placeholder="对方又说了什么？">${escapeHtml(session.input)}</textarea>
        <button class="primary-button" data-action="temp-reply">帮我接一句</button>
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

function Field({ label, path, value, placeholder, className = "", hint = "" }) {
  return `
    <label class="${className}">
      <span>${label}</span>
      <textarea data-setup-input="${path}" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value)}</textarea>
      ${hint ? `<small>${hint}</small>` : ""}
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
