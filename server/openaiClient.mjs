import dotenv from "dotenv";
import OpenAI from "openai";
import { parseJsonSafely } from "./jsonUtils.mjs";

dotenv.config({ quiet: true });
dotenv.config({ path: "api.env", override: false, quiet: true });

const defaultModel = "gpt-4.1-mini";
const defaultDeepSeekBaseURL = "https://api.deepseek.com";
const defaultDeepSeekModel = "deepseek-chat";

export function getModelName() {
  if (process.env.DEEPSEEK_API_KEY) {
    return process.env.DEEPSEEK_MODEL || defaultDeepSeekModel;
  }
  return process.env.OPENAI_MODEL || defaultModel;
}

export function assertOpenAIKey() {
  if (!process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY) {
    const error = new Error("Missing DEEPSEEK_API_KEY or OPENAI_API_KEY");
    error.code = "MISSING_AI_API_KEY";
    throw error;
  }
}

export function createOpenAIClient() {
  assertOpenAIKey();
  if (process.env.DEEPSEEK_API_KEY) {
    return new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || defaultDeepSeekBaseURL
    });
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function requestJsonFromAI({ system, user, temperature = 0.4, maxCompletionTokens = 900 }) {
  const client = createOpenAIClient();

  try {
    const completion = await client.chat.completions.create({
      model: getModelName(),
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
    const wrapped = new Error("AI request failed");
    wrapped.code = "AI_REQUEST_FAILED";
    wrapped.cause = error;
    throw wrapped;
  }
}
