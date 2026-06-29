import "dotenv/config";
import express from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildAnalyzeChatPrompt,
  buildTempChatPrompt,
  buildTempArguePrompt,
  buildTempScenarioPrompt,
  buildTestResultPrompt
} from "./prompts.mjs";
import { getModelName, hasAIKeyConfigured, isDemoMode, requestJsonFromAI } from "./openaiClient.mjs";
import { extractPersonaProfile } from "./personaExtractorSkill.mjs";
import { generatePersonaReply } from "./personaReplySkill.mjs";
import { handleFeishuEvent, handleFeishuWebhookSend } from "./feishuBot.mjs";
import { handleTrainingGameReply } from "./services/trainingGameService.mjs";
import { generatePresetTrainingScenario, generateRandomTrainingScenario } from "./services/trainingScenarioService.mjs";
import { scoreTrainingReply } from "./services/trainingScoreService.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const distRoot = join(root, "dist");
const frontendRoot = existsSync(join(distRoot, "index.html")) ? distRoot : root;
const port = Number(process.env.PORT || 3000);

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

if (!process.env.FEISHU_APP_ID || !process.env.FEISHU_APP_SECRET) {
  console.warn("[feishu] FEISHU_APP_ID or FEISHU_APP_SECRET is missing; Feishu replies will be skipped.");
}

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    name: "didi-proxy-argue-backend",
    demoMode: isDemoMode(),
    aiConfigured: hasAIKeyConfigured(),
    model: hasAIKeyConfigured() ? getModelName() : null
  });
});

app.post("/api/temp-argue", async (request, response) => {
  await handleAIEndpoint(response, buildTempArguePrompt(request.body));
});

app.post("/api/temp-scenario", async (request, response) => {
  await handleAIEndpoint(response, buildTempScenarioPrompt(request.body));
});

app.post("/api/temp-chat", async (request, response) => {
  await handleAIEndpoint(response, buildTempChatPrompt(request.body));
});

app.post("/api/persona/analyze-chat", async (request, response) => {
  await handleAIEndpoint(response, buildAnalyzeChatPrompt(request.body));
});

app.post("/api/persona/test-result", async (request, response) => {
  await handleAIEndpoint(response, buildTestResultPrompt(request.body));
});

app.post("/api/persona-reply", async (request, response) => {
  await handlePersonaReply(request, response);
});

app.post("/api/persona/reply", async (request, response) => {
  await handlePersonaReply(request, response);
});

app.post("/api/feishu/events", async (request, response) => {
  await handleFeishuEvent(request, response);
});

app.post("/api/feishu/send", async (request, response) => {
  await handleFeishuWebhookSend(request, response);
});

app.post("/api/training/score", async (request, response) => {
  console.log("POST /api/training/score", request.body);
  try {
    const result = await scoreTrainingReply(request.body);
    response.json({ ...result, source: result?.source || "ai" });
  } catch (error) {
    console.error("[training/score] failed:", error);
    handleEndpointError(response, error, "Training score failed");
  }
});

app.post("/api/training/reply", async (request, response) => {
  console.log("[training/reply] received settings", {
    toneStrength: request.body?.toneStrength || request.body?.gameConfig?.toneStrength,
    difficulty: request.body?.difficulty || request.body?.gameConfig?.difficulty,
    trainingGoals: request.body?.gameConfig?.trainingGoals || request.body?.trainingGoals,
    contextSummary: request.body?.contextSummary || request.body?.gameConfig?.contextSummary,
    userMainline: request.body?.userMainline || request.body?.gameConfig?.userMainline,
    sessionControl: request.body?.sessionControl || request.body?.gameConfig?.sessionControl
  });
  try {
    const result = await handleTrainingGameReply(request.body);
    response.json(result);
  } catch (error) {
    console.error("[training/reply] failed:", error);
    handleEndpointError(response, error, "Training reply failed");
  }
});

app.post("/api/training/scenario/random", async (request, response) => {
  try {
    const result = await generateRandomTrainingScenario(request.body);
    response.json(result);
  } catch (error) {
    console.error("[training/scenario/random] failed:", error);
    handleEndpointError(response, error, "Random training scenario generation failed");
  }
});

app.post("/api/training/scenario/preset", async (request, response) => {
  try {
    const result = await generatePresetTrainingScenario(request.body);
    response.json(result);
  } catch (error) {
    console.error("[training/scenario/preset] failed:", error);
    handleEndpointError(response, error, "Preset training scenario generation failed");
  }
});

app.post("/api/persona/extract", async (request, response) => {
  await handlePersonaExtraction(request, response);
});

app.post("/api/skills/persona-extract", async (request, response) => {
  await handlePersonaExtraction(request, response);
});

async function handlePersonaExtraction(request, response) {
  try {
    const result = await extractPersonaProfile(request.body);
    response.json(result);
  } catch (error) {
    console.error("[persona/extract] failed:", error);
    handleEndpointError(response, error, "Persona extraction failed");
  }
}

async function handlePersonaReply(request, response) {
  try {
    const result = await generatePersonaReply(request.body);
    response.json(result);
  } catch (error) {
    console.error("[persona/reply] failed:", error);
    handleEndpointError(response, error, "Persona reply generation failed");
  }
}

app.use("/src", express.static(join(frontendRoot, "src")));
app.use("/public", express.static(join(frontendRoot, "public")));

app.get("/", (request, response) => {
  response.sendFile(join(frontendRoot, "index.html"));
});

app.use((request, response, next) => {
  if (request.path.includes(".")) {
    response.status(404).json({ error: "Not found" });
    return;
  }
  next();
});

app.use((request, response) => {
  response.sendFile(join(frontendRoot, "index.html"));
});

app.listen(port, () => {
  console.log(`滴滴代吵 running at http://localhost:${port}`);
});

async function handleAIEndpoint(response, prompt) {
  try {
    const result = await requestJsonFromAI(prompt);
    response.json({ ...result, source: result?.source || "ai" });
  } catch (error) {
    console.error("[ai] failed:", error);
    if (error.code === "MISSING_AI_API_KEY" || error.code === "MISSING_OPENAI_API_KEY") {
      response.status(500).json({ error: error.message || "Missing DEEPSEEK_API_KEY or OPENAI_API_KEY" });
      return;
    }

    if (error.message === "AI returned invalid JSON" || error.message === "AI 返回格式解析失败") {
      response.status(502).json({ error: "AI returned invalid JSON" });
      return;
    }

    response.status(error.status || 502).json({ error: error.message || "AI request failed" });
  }
}

function handleEndpointError(response, error, fallbackMessage) {
  if (error.status) {
    response.status(error.status).json({ error: error.message });
    return;
  }

  if (error.code === "MISSING_AI_API_KEY" || error.code === "MISSING_OPENAI_API_KEY") {
    response.status(500).json({ error: error.message || "Missing DEEPSEEK_API_KEY or OPENAI_API_KEY" });
    return;
  }

  if (error.message === "AI returned invalid JSON" || error.message === "AI 返回格式解析失败") {
    response.status(502).json({ error: "AI returned invalid JSON" });
    return;
  }

  response.status(error.status || 502).json({ error: error.message || fallbackMessage });
}
