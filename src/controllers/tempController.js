import { buildTempChatTurn } from "../data/mockData.js";
import { buildLocalTempScenario, normalizeTempScenario, uniqueReplyOptions } from "../domain/temp.js";
import {
  generateTempReply,
  generateTempScenario as requestTempScenario
} from "../services/api.js";

export async function handleTempReply(app, { inputAsIntent = false } = {}) {
  const temp = app.state.temp;
  if (temp.isSubmitting) return;

  const typedText = temp.input.trim();
  const opponentText = inputAsIntent
    ? temp.latest.trim() || temp.generatedScenario?.openingMessage || ""
    : typedText || temp.latest.trim() || temp.generatedScenario?.openingMessage || "";
  const userIntent = inputAsIntent ? typedText : "";
  if (!opponentText && !userIntent) return;
  const displayText = inputAsIntent ? userIntent : opponentText;

  app.setState({
    temp: {
      ...temp,
      input: "",
      isSubmitting: true
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
    const fallbackTurn = buildTempChatTurn(temp, displayText, { inputAsIntent });
    const resultMainline = result.mainline && typeof result.mainline === "object"
      ? [result.mainline.fact, result.mainline.impact, result.mainline.request, result.mainline.boundary].filter(Boolean).join(" ")
      : "";
    turn = {
      id: Date.now(),
      opponent: inputAsIntent ? "我想表达：" + userIntent : opponentText,
      analysis: result.opponentTactic || fallbackTurn.analysis,
      mainline: [result.strategy, resultMainline, result.offTopicWarning].filter(Boolean).join(" ") || fallbackTurn.mainline,
      replies: uniqueReplyOptions([
        { label: "稳妥版", text: result.recommendedReply },
        { label: "强硬版", text: result.strongerReply },
        { label: "嘴替版/阴阳版", text: result.sarcasticReply || result.politeFinalReply },
        ...fallbackTurn.replies
      ])
    };
  } catch {
    turn = buildTempChatTurn(temp, displayText, { inputAsIntent });
    turn.replies = uniqueReplyOptions(turn.replies);
  }
  app.setState({
    temp: {
      ...app.state.temp,
      latest: opponentText || temp.latest,
      input: "",
      isSubmitting: false,
      rounds: [...temp.rounds, turn]
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
    const scenario = normalizeTempScenario(result.scenario || result, temp);
    app.setState({
      temp: {
        ...app.state.temp,
        who: scenario.opponentPersona || app.state.temp.who,
        context: scenario.background || app.state.temp.context,
        latest: scenario.openingMessage || app.state.temp.latest,
        goal: scenario.userGoal || app.state.temp.goal,
        generatedScenario: scenario,
        scenarioStatus: "done",
        scenarioMessage: "临时场景已生成，对方先开口了。",
        scenarioRefreshCount: nextRefreshCount,
        input: "",
        rounds: []
      }
    });
  } catch (error) {
    const scenario = buildLocalTempScenario({ ...temp, scenarioRefreshCount: nextRefreshCount });
    app.setState({
      temp: {
        ...app.state.temp,
        latest: scenario.openingMessage,
        generatedScenario: scenario,
        scenarioStatus: "done",
        scenarioMessage: `API 生成较慢或失败，已先生成本地场景。${error.message ? `（${error.message}）` : ""}`,
        scenarioRefreshCount: nextRefreshCount,
        input: "",
        rounds: []
      }
    });
  }
}
