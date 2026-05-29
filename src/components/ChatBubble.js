import { escapeAttr, escapeHtml } from "../utils/html.js";

export function ChatBubble({
  side = "left",
  label = "",
  avatar = "",
  content = "",
  actions = "",
  meta = "",
  className = ""
} = {}) {
  const safeLabel = label || (side === "right" ? "我" : "AI");
  const safeAvatar = avatar || avatarFromLabel(safeLabel);
  return `
    <article class="persona-bubble chat-bubble ${side === "right" ? "from-user" : "from-proxy"} ${className}">
      <div class="chat-avatar" aria-hidden="true">${escapeHtml(safeAvatar)}</div>
      <div class="chat-bubble-body">
        <span class="bubble-name">${escapeHtml(safeLabel)}</span>
        <p>${escapeHtml(content)}</p>
        ${meta ? `<div class="bubble-meta">${meta}</div>` : ""}
        ${actions ? `<div class="bubble-actions">${actions}</div>` : ""}
      </div>
    </article>
  `;
}

export function CopyAction(text, label = "复制") {
  return `<button class="mini-copy bubble-copy" data-copy-reply="${escapeAttr(text)}">${escapeHtml(label)}</button>`;
}

export function avatarFromLabel(label = "") {
  const clean = String(label || "").trim();
  if (!clean) return "AI";
  if (/代吵|助手/.test(clean)) return "吵";
  if (/嘴替/.test(clean)) return "替";
  if (/AI/.test(clean)) return "AI";
  return Array.from(clean)[0] || "AI";
}
