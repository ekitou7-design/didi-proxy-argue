import express from "express";
import cors from "cors";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import {
  buildAnalyzeChatPrompt,
  buildPersonaReplyPrompt,
  buildTempArguePrompt,
  buildTestResultPrompt,
  buildTrainingScorePrompt
} from "./prompts.mjs";
import { requestJsonFromAI } from "./openaiClient.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const port = Number(process.env.PORT || 3000);
const isCheck = process.argv.includes("--check");

if (isCheck) {
  await Promise.all([
    readFile(join(root, "index.html"), "utf8"),
    readFile(join(root, "src", "main.js"), "utf8"),
    readFile(join(root, "src", "styles.css"), "utf8")
  ]);
  console.log("Express app and static frontend files are present.");
  process.exit(0);
}

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (request, response) => {
  response.json({
    ok: true,
    name: "didi-proxy-argue-backend"
  });
});

app.post("/api/temp-argue", async (request, response) => {
  await handleAIEndpoint(response, buildTempArguePrompt(request.body));
});

app.post("/api/persona/analyze-chat", async (request, response) => {
  await handleAIEndpoint(response, buildAnalyzeChatPrompt(request.body));
});

app.post("/api/persona/test-result", async (request, response) => {
  await handleAIEndpoint(response, buildTestResultPrompt(request.body));
});

app.post("/api/persona-reply", async (request, response) => {
  await handleAIEndpoint(response, buildPersonaReplyPrompt(request.body));
});

app.post("/api/training/score", async (request, response) => {
  await handleAIEndpoint(response, buildTrainingScorePrompt(request.body));
});

app.use(express.static(root));

app.use((request, response) => {
  response.sendFile(join(root, "index.html"));
});

app.listen(port, () => {
  console.log(`滴滴代吵 running at http://localhost:${port}`);
});

async function handleAIEndpoint(response, prompt) {
  try {
    const result = await requestJsonFromAI(prompt);
    response.json(result);
  } catch (error) {
    if (error.code === "MISSING_OPENAI_API_KEY") {
      response.status(500).json({ error: "Missing OPENAI_API_KEY" });
      return;
    }

    if (error.message === "AI 返回格式解析失败") {
      response.status(502).json({ error: "AI 返回格式解析失败" });
      return;
    }

    response.status(502).json({ error: "AI request failed" });
  }
}
