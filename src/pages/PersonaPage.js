export default function PersonaPage(session) {
  if (session.step === "chat") return ChatPage(session);

  return `
    <div class="page persona-page">
      <section class="input-panel">
        ${Field("我的说话风格", "style", session.style)}
        ${Field("我和对方的关系", "relation", session.relation)}
        ${Field("我吵架时最容易出现的问题", "problem", session.problem)}
        ${Field("我希望嘴替帮我做到什么", "expectation", session.expectation)}
        ${Field("我不想越过的表达边界", "boundary", session.boundary)}
        <button class="primary-button" data-action="start-persona-chat">保存嘴替人格</button>
      </section>
    </div>
  `;
}

function ChatPage(session) {
  return `
    <div class="page chat-page">
      <section class="chat-status persona-status">
        <strong>专属嘴替</strong>
        <p>当前嘴替人格：${escapeHtml(session.personaName)}</p>
      </section>

      <section class="chat-log">
        ${session.rounds.length ? session.rounds.map(PersonaRound).join("") : EmptyChat("把对方最新一句贴进来，我按你的风格接话。")}
      </section>

      <section class="chat-composer">
        <textarea data-session-input="persona" placeholder="对方刚刚说了什么？">${escapeHtml(session.input)}</textarea>
        <button class="primary-button" data-action="persona-reply">按我的风格接一句</button>
      </section>
    </div>
  `;
}

function PersonaRound(round) {
  return `
    <article class="chat-round">
      <div class="bubble-card opponent"><span>对方</span><p>${escapeHtml(round.opponent)}</p></div>
      <div class="ai-panel">
        <h3>你的风格提醒</h3>
        <p>${escapeHtml(round.styleReminder)}</p>
        <h3>对方话术分析</h3>
        <p>${escapeHtml(round.analysis)}</p>
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

function Field(label, key, value) {
  return `
    <label>
      <span>${label}</span>
      <textarea data-persona-setup="${key}">${escapeHtml(value)}</textarea>
    </label>
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
