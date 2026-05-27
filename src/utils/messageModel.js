function createMessageId() {
  const randomId =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `msg-${randomId}`;
}

export function createMessage({ role, content, text, id, createdAt } = {}) {
  return {
    id: id || createMessageId(),
    role: role || "user",
    content: content ?? text ?? "",
    createdAt: createdAt || new Date().toISOString()
  };
}

export function normalizeMessage(message = {}) {
  return {
    id: message.id || createMessageId(),
    role: message.role || "user",
    content: message.content ?? message.text ?? "",
    createdAt: message.createdAt || new Date().toISOString()
  };
}

export function getMessageContent(message = {}) {
  return message.content ?? message.text ?? "";
}

export function toLegacyTextMessage(message = {}) {
  const normalized = normalizeMessage(message);
  return {
    id: normalized.id,
    role: normalized.role,
    text: normalized.content,
    createdAt: normalized.createdAt
  };
}

export function toLegacyContentMessage(message = {}) {
  const normalized = normalizeMessage(message);
  return {
    id: normalized.id,
    role: normalized.role,
    content: normalized.content,
    createdAt: normalized.createdAt
  };
}
