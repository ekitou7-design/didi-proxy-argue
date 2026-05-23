const invalidJsonMessage = "AI returned invalid JSON";

export function parseJsonSafely(text) {
  return safeParseJson(text);
}

export function safeParseJson(text) {
  if (!text || typeof text !== "string") {
    throw new Error(invalidJsonMessage);
  }

  const cleanedText = stripMarkdownCodeFence(text);

  try {
    return JSON.parse(cleanedText);
  } catch {
    const jsonText = extractJsonFromText(cleanedText);
    if (!jsonText) throw new Error(invalidJsonMessage);
    return JSON.parse(jsonText);
  }
}

export function extractJsonFromText(text) {
  return extractFirstJsonObject(stripMarkdownCodeFence(text || ""));
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

export function stripMarkdownCodeFence(text) {
  return String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function jsonParseErrorResponse(response) {
  return response.status(502).json({ error: invalidJsonMessage });
}
