import { tempGoalOptions, tempToneOptions, tempWhoOptions } from "../data/mockData.js";

export default function TempArguePage(session) {
  if (session.step === "chat") return ChatPage(session);

  return `
    <div class="page form-page">
      <section class="input-panel">
        <div class="field-title">这次和谁吵</div>
        <div class="chip-group">
          ${tempWhoOptions.map((item) => Chip(item, session.who, "temp-who")).join("")}
        </div>

        <div class="field-title">你想达到什么目的</div>
        <div class="chip-group">
          ${tempGoalOptions.map((item) => Chip(item, session.goal, "temp-goal")).join("")}
        </div>

        <div class="field-title">想用什么语气</div>
        <div class="chip-group">
          ${tempToneOptions.map((item) => Chip(item, session.tone, "temp-tone")).join("")}
        </div>

        <button class="primary-button" data-action="start-temp-chat">开始实时吵</button>
      </section>
    </div>
  `;
}

function ChatPage(session) {
  return `
    <div class="page chat-page">
      <section class="chat-status">
        <strong>临时代吵</strong>
        <p>目标：${escapeHtml(session.goal)} / 语气：${escapeHtml(session.tone)}</p>
      </section>

      <section class="chat-log">
        ${session.rounds.length ? session.rounds.map(TempRound).join("") : EmptyChat("把对方刚刚说的话贴进来，我帮你接这一轮。")}
      </section>

      <section class="chat-composer">
        <textarea data-session-input="temp" placeholder="对方刚刚说了什么？">${escapeHtml(session.input)}</textarea>
        <button class="primary-button" data-action="temp-reply">帮我接一句</button>
      </section>
    </div>
  `;
}

function TempRound(round) {
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
      <strong>${reply.label}</strong>
      <p>${escapeHtml(reply.text)}</p>
      <button class="mini-copy" data-copy-reply="${escapeAttr(reply.text)}">复制发送</button>
    </div>
  `;
}

function Chip(item, active, key) {
  return `<button class="chip ${active === item ? "active" : ""}" data-${key}="${item}">${item}</button>`;
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
