import { normalizeTempScenario, uniqueReplyOptions } from "../domain/temp.js";
import {
  generateTempReply,
  generateTempScenario as requestTempScenario
} from "../services/api.js";
import { TEMP_CHAT_HISTORY_KEY } from "../constants/storageKeys.js";
import { assertAiSource } from "../utils/aiSource.js";
import { readJson, writeJson } from "../utils/storage.js";

export async function handleTempReply(app, { inputAsIntent = false } = {}) {
  const temp = app.state.temp;
  if (temp.isSubmitting) return;

  const typedText = temp.input.trim();
  const opponentText = inputAsIntent
    ? temp.latest.trim() || temp.generatedScenario?.openingMessage || ""
    : typedText || temp.latest.trim() || temp.generatedScenario?.openingMessage || "";
  const userIntent = inputAsIntent ? typedText : "";
  if (!opponentText && !userIntent) return;
  const requestId = `temp-reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  app.setState({
    temp: {
      ...temp,
      input: "",
      isSubmitting: true,
      generationRequestId: requestId
    }
  });

  let turn;
  try {
    const result = await generateTempReply({
      scenario: temp.generatedScenario,
      scene: temp.context,
      who: temp.who,
      currentInput: typedText,
      inputMode: inputAsIntent ? "userIntent" : "opponentMessage",
      latestOpponentMessage: opponentText,
      opponent: opponentText,
      userIntent,
      goal: temp.goal,
      tone: temp.tone,
      intensity: temp.tone,
      boundary: temp.boundary,
      history: temp.rounds.map((round) => ({
        opponent: round.opponent,
        reply: round.replies?.[0]?.text || "",
        analysis: round.analysis
      }))
    });
    if (app.state.temp.generationRequestId !== requestId) return;
    assertAiSource(result, "临时代吵回复");
    const resultMainline = result.mainline && typeof result.mainline === "object"
      ? [result.mainline.fact, result.mainline.impact, result.mainline.request, result.mainline.boundary].filter(Boolean).join(" ")
      : "";
    const replies = uniqueReplyOptions([
      { label: "稳妥版", text: result.recommendedReply },
      { label: "强硬版", text: result.strongerReply },
      { label: "嘴替版/阴阳版", text: result.sarcasticReply || result.politeFinalReply }
    ]);
    if (!replies.length) throw new Error("AI 调用失败：回复内容为空");
    turn = {
      id: Date.now(),
      source: result.source,
      opponent: inputAsIntent ? "我想表达：" + userIntent : opponentText,
      analysis: result.opponentTactic || "AI 已生成回应。",
      mainline: [result.strategy, resultMainline, result.offTopicWarning].filter(Boolean).join(" "),
      replies
    };
  } catch (error) {
    if (app.state.temp.generationRequestId !== requestId) return;
    turn = {
      id: Date.now(),
      source: "fallback",
      opponent: inputAsIntent ? "我想表达：" + userIntent : opponentText,
      analysis: `AI 调用失败：${error.message || "请稍后重试。"}`,
      mainline: "",
      replies: []
    };
  }
  app.setState({
    temp: {
      ...app.state.temp,
      latest: opponentText || temp.latest,
      input: "",
      isSubmitting: false,
      generationRequestId: "",
      rounds: [...temp.rounds, turn]
    }
  });
}

export function finishTempConversation(app) {
  const temp = app.state.temp;
  const nextTemp = {
    ...temp,
    input: "",
    isSubmitting: false,
    generationRequestId: "",
    rounds: []
  };

  if (!temp.rounds?.length) {
    app.setState({
      temp: {
        ...nextTemp,
        scenarioMessage: "当前没有可保存的对话。"
      }
    });
    return;
  }

  const messages = temp.rounds.flatMap((round) => {
    const reply = round.replies?.[0]?.text || "";
    return [
      { role: "opponent", content: round.opponent || "" },
      reply ? { role: "assistant", content: reply } : null
    ].filter((item) => item?.content);
  });
  const historyItem = {
    id: `temp-history-${Date.now()}`,
    type: "临时代吵记录",
    source: "临时代吵",
    object: temp.who || temp.generatedScenario?.opponentPersona || "临时对手",
    context: temp.context || temp.generatedScenario?.background || "本轮临时代吵",
    goal: temp.goal || temp.generatedScenario?.userGoal || "把话说清楚",
    tone: temp.tone,
    messages,
    roundCount: temp.rounds.length,
    createdAt: new Date().toISOString()
  };
  const histories = [historyItem, ...readJson(TEMP_CHAT_HISTORY_KEY, [])].slice(0, 50);
  writeJson(TEMP_CHAT_HISTORY_KEY, histories);
  app.setState({
    temp: {
      ...nextTemp,
      chatHistories: histories,
      scenarioMessage: "本轮临时代吵已保存。"
    }
  });
}

export function clearTempConversation(app) {
  app.setState({
    temp: {
      ...app.state.temp,
      input: "",
      isSubmitting: false,
      generationRequestId: "",
      rounds: [],
      scenarioMessage: "当前临时对话已清空。"
    }
  });
}

export async function generateTempScenario(app) {
  const temp = app.state.temp;
  if (temp.scenarioStatus === "loading") return;
  const nextRefreshCount = Number(temp.scenarioRefreshCount || 0) + 1;
  const latestForScenario = temp.latest && temp.latest !== temp.generatedScenario?.openingMessage ? temp.latest : "";

  app.setState({
    temp: {
      ...temp,
      scenarioStatus: "loading",
      scenarioMessage: "正在生成临时冲突现场..."
    }
  });

  try {
    const result = await requestTempScenario({
      who: temp.who,
      context: temp.context,
      goal: temp.goal,
      tone: temp.tone,
      latest: latestForScenario,
      refreshCount: nextRefreshCount
    });
    assertAiSource(result, "临时代吵场景");
    const rawScenario = result.scenario || result;
    if (!rawScenario?.openingMessage || !rawScenario?.background || !rawScenario?.mainline?.request) {
      throw new Error("AI 临时场景返回不完整");
    }
    const scenario = normalizeTempScenario(rawScenario, temp);
    app.setState({
      temp: {
        ...app.state.temp,
        who: scenario.opponentPersona || app.state.temp.who,
        context: scenario.background || app.state.temp.context,
        latest: scenario.openingMessage || app.state.temp.latest,
        goal: scenario.userGoal || app.state.temp.goal,
        generatedScenario: scenario,
        scenarioStatus: "done",
        scenarioMessage: "真实 AI 已生成临时场景，对方先开口了。",
        scenarioRefreshCount: nextRefreshCount,
        input: "",
        rounds: []
      }
    });
  } catch (error) {
    app.setState({
      temp: {
        ...app.state.temp,
        scenarioStatus: "error",
        scenarioMessage: `AI 调用失败：${error.message || "临时场景生成失败，请稍后重试。"}`,
        scenarioRefreshCount: nextRefreshCount,
        input: ""
      }
    });
  }
}
