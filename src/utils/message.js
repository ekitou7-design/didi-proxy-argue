export function splitReplyMessages(text) {
  const value = String(text || "").trim();
  if (!value) return [];
  const pieces = value.match(/[^。！？!?]+[。！？!?]?/g) || [value];
  return pieces.map((piece) => piece.trim()).filter(Boolean);
}
