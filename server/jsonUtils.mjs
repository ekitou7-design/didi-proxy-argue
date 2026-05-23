export function parseJsonSafely(text) {
  if (!text || typeof text !== "string") {
    throw new Error("AI 返回格式解析失败");
  }

  try {
    return JSON.parse(text);
  } catch {
    const jsonText = extractFirstJsonObject(text);
    if (!jsonText) throw new Error("AI 返回格式解析失败");
    return JSON.parse(jsonText);
  }
}

export function extractFirstJsonObject(text) {
  const start = text.indexOf("{");
  if (start === -1) return "";

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (depth === 0) {
      return text.slice(start, index + 1);
    }
  }

  return "";
}

export function jsonParseErrorResponse(response) {
  return response.status(502).json({ error: "AI 返回格式解析失败" });
}
