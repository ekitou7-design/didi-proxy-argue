import dotenv from "dotenv";
import OpenAI from "openai";
import { parseJsonSafely } from "./jsonUtils.mjs";

dotenv.config({ quiet: true });
dotenv.config({ path: "api.env", override: false, quiet: true });

const defaultModel = "gpt-4.1-mini";
const defaultDeepSeekBaseURL = "https://api.deepseek.com";
const defaultDeepSeekModel = "deepseek-chat";

export function isDemoMode() {
  return String(process.env.DEMO_MODE || "").toLowerCase() === "true";
}

export function hasAIKeyConfigured() {
  return Boolean(process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY);
}

export function getAIProviderConfig() {
  if (process.env.DEEPSEEK_API_KEY) {
    return {
      provider: "deepseek",
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || process.env.AI_BASE_URL || defaultDeepSeekBaseURL,
      model: process.env.DEEPSEEK_MODEL || process.env.AI_MODEL || defaultDeepSeekModel
    };
  }

  return {
    provider: "openai",
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || "",
    model: process.env.OPENAI_MODEL || process.env.AI_MODEL || defaultModel
  };
}

export function getModelName() {
  return getAIProviderConfig().model;
}

export function assertOpenAIKey() {
  if (!hasAIKeyConfigured()) {
    const error = new Error("Missing DEEPSEEK_API_KEY or OPENAI_API_KEY");
    error.code = "MISSING_AI_API_KEY";
    throw error;
  }
}

export function createOpenAIClient() {
  assertOpenAIKey();
  const config = getAIProviderConfig();
  if (config.baseURL) {
    return new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });
  }
  return new OpenAI({ apiKey: config.apiKey });
}

export async function requestJsonFromAI({ system, user, temperature = 0.4, maxCompletionTokens = 900 }) {
  const client = createOpenAIClient();
  const config = getAIProviderConfig();

  try {
    const completion = await client.chat.completions.create({
      model: config.model,
      response_format: { type: "json_object" },
      temperature,
      max_completion_tokens: maxCompletionTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    });

    const content = completion.choices?.[0]?.message?.content || "";
    return parseJsonSafely(content);
  } catch (error) {
    if (error.message === "AI returned invalid JSON" || error.message === "AI 返回格式解析失败") throw error;
    if (error.code === "MISSING_AI_API_KEY" || error.code === "MISSING_OPENAI_API_KEY") throw error;
    const detail = error?.message || String(error);
    const wrapped = new Error(`AI request failed (${config.provider}/${config.model}): ${detail}`);
    wrapped.code = "AI_REQUEST_FAILED";
    wrapped.status = error?.status || error?.response?.status || 502;
    wrapped.cause = error;
    throw wrapped;
  }
}
