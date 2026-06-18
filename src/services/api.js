export async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    let message = `请求失败：${response.status}`;
    try {
      const data = await response.json();
      if (data.error === "Missing OPENAI_API_KEY" || data.error === "Missing DEEPSEEK_API_KEY or OPENAI_API_KEY") {
        message = "还没有配置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY";
      }
      else if (data.error?.message) message = data.error.message;
      else if (data.error) message = data.detail ? `${data.error}：${data.detail}` : data.error;
    } catch {
      // Keep the status-based message.
    }
    throw new Error(message);
  }
  return response.json();
}

export function extractPersona(payload) {
  return postJson("/api/persona/extract", payload);
}

export function generatePersonaReply(payload) {
  return postJson("/api/persona/reply", payload);
}

export function generatePersonaTestResult(payload) {
  return postJson("/api/persona/test-result", payload);
}

export function generateTempReply(payload) {
  return postJson("/api/temp-chat", payload);
}

export function generateTempScenario(payload) {
  return postJson("/api/temp-scenario", payload);
}

export function generateRandomTrainingScenario(payload = {}) {
  return postJson("/api/training/scenario/random", payload);
}

export function generatePresetTrainingScenario(payload) {
  return postJson("/api/training/scenario/preset", payload);
}

export function submitTrainingReply(payload) {
  return postJson("/api/training/reply", payload);
}

export function sendToFeishu(payload) {
  return postJson("/api/feishu/send", payload);
}
