import { escapeHtml } from "./html.js";

export function assertAiSource(result, label = "AI 响应") {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error(`${label}返回结构异常`);
  }
  if (result.source === "ai") return result;
  if (result.source === "fallback") {
    throw new Error("当前是 fallback/demo，不是真实 API 结果。");
  }
  throw new Error(`${label}返回结构异常：缺少 source 字段`);
}

export function aiSourceText(source) {
  if (source === "ai") return "真实 AI";
  if (source === "current_game_config") return "本局配置";
  if (source === "fallback") return "fallback/demo";
  return "来源异常";
}

export function AiSourceBadge(source, successLabel = "真实 AI") {
  const type = source === "ai" ? "ai" : source === "current_game_config" ? "local" : source === "fallback" ? "fallback" : "unknown";
  const label = source === "ai" ? successLabel : aiSourceText(source);
  return `<span class="ai-source-pill ${type}">${escapeHtml(label)}</span>`;
}
