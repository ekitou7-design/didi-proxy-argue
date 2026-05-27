import { makeOpeningOpponent } from "../data/mockData.js";
import {
  buildPresetScenarioDraft,
  buildScenarioFromGameConfig,
  difficultyLabelForConfig,
  formatTrainingGoals,
  getAiRoleFromConfig,
  getPlayerRoleFromConfig,
  maxRoundsForDifficulty,
  normalizeTrainingGameConfig,
  oppositeRoleKey,
  scenarioToGameConfig
} from "../domain/training.js";
import { getGameConfig } from "../pages/TrainingPage.js";
import {
  generatePresetTrainingScenario as requestPresetTrainingScenario,
  generateRandomTrainingScenario as requestRandomTrainingScenario,
  submitTrainingReply
} from "../services/api.js";

export function updateTrainingSetup(app, parts, value, render = true) {
  const training = app.state.training;
  const nextTraining =
    parts.length === 4
      ? {
          ...training,
          [parts[1]]: {
            ...training[parts[1]],
            [parts[2]]: {
              ...training[parts[1]]?.[parts[2]],
              [parts[3]]: value
            }
          }
        }
      : parts.length === 3
      ? {
          ...training,
          [parts[1]]: {
            ...training[parts[1]],
            [parts[2]]: value
          }
        }
      : {
          ...training,
          [parts[1]]: value
        };

  const rawConfig = nextTraining.gameConfig || {};
  const playerRoleKey = rawConfig.playerRoleKey === "B" ? "B" : "A";
  const gameConfig = normalizeTrainingGameConfig({
    ...rawConfig,
    playerRoleKey,
    aiRoleKey: oppositeRoleKey(playerRoleKey)
  });
  const updatedTraining = {
    ...nextTraining,
    gameConfig,
    scene: gameConfig.scene,
    debateTopic: gameConfig.scene,
    playerIdentity: getPlayerRoleFromConfig(gameConfig).name,
    aiIdentity: getAiRoleFromConfig(gameConfig).name,
    playerSide: gameConfig.playerRoleKey,
    aiSide: gameConfig.aiRoleKey,
    goal: formatTrainingGoals(gameConfig.trainingGoals),
    difficulty: difficultyLabelForConfig(gameConfig.difficulty),
    aiDifficulty: difficultyLabelForConfig(gameConfig.difficulty),
    generatedScenario: null,
    opponent: "",
    messages: [],
    feedbacks: [],
    review: null,
    result: "",
    persuasionScore: 0,
    persuasionDelta: 0,
    opponentState: "strong",
    offTrackStreak: 0,
    round: 1,
    scenarioStatus: "idle",
    scenarioMessage: "设置已修改，将按中间区域的本局配置开始训练。",
    scenarioRequestId: ""
  };

  if (render) app.setState({ training: updatedTraining });
  else app.state.training = updatedTraining;
}

export function toggleTrainingGoal(app, goal) {
  if (!goal) return;
  const config = getGameConfig(app.state.training);
  const goals = config.trainingGoals.includes(goal)
    ? config.trainingGoals.filter((item) => item !== goal)
    : [...config.trainingGoals, goal];
  updateTrainingSetup(app, ["training", "gameConfig", "trainingGoals"], goals.length ? goals : [goal]);
}

export async function generateRandomTrainingScenario(app) {
  const training = app.state.training;
  if (training.scenarioStatus === "loading") return;

  app.setState({
    training: {
      ...training,
      scenarioStatus: "loading",
      scenarioMessage: "正在生成真实吵架现场..."
    }
  });

  try {
    const result = await requestRandomTrainingScenario();
    const scenario = result.scenario;
    if (!scenario?.openingMessage) throw new Error("场景生成结果为空");

    applyGeneratedTrainingScenario(app, scenario, "AI 已随机生成一局，仍可在中间区域手动修改。");
  } catch (error) {
    app.setState({
      training: {
        ...app.state.training,
        scenarioStatus: "error",
        scenarioMessage: error.message || "场景生成失败，请再试一次。"
      }
    });
  }
}

export async function generatePresetTrainingScenario(app) {
  const training = app.state.training;
  if (training.scenarioStatus === "loading") return;
  const config = getGameConfig(training);
  const request = {
    ...(training.randomScenarioForm || {}),
    gameConfig: config,
    customScene: config.scene,
    userGoal: formatTrainingGoals(config.trainingGoals),
    debateTopic: config.scene,
    aiDifficulty: difficultyLabelForConfig(config.difficulty)
  };
  const requestId = `preset_${Date.now()}`;
  const draftScenario = buildPresetScenarioDraft(request);

  applyGeneratedTrainingScenario(app, draftScenario, "已按本局配置生成训练草稿，正在用 API 精修...", "loading", requestId);

  try {
    const result = await requestPresetTrainingScenario(request);
    const scenario = result.scenario;
    if (!scenario?.openingMessage) throw new Error("场景生成结果为空");
    if (app.state.training.scenarioRequestId !== requestId || app.state.training.gameState !== "idle") return;

    applyGeneratedTrainingScenario(app, scenario, "已按本局配置生成训练草稿，可以继续修改或开始训练。");
  } catch (error) {
    if (app.state.training.scenarioRequestId !== requestId || app.state.training.gameState !== "idle") return;
    app.setState({
      training: {
        ...app.state.training,
        scenarioStatus: "done",
        scenarioMessage: `API 精修较慢或失败，已保留当前设置生成的场景。${error.message ? `（${error.message}）` : ""}`
      }
    });
  }
}

export function applyGeneratedTrainingScenario(app, scenario, scenarioMessage, scenarioStatus = "done", scenarioRequestId = "") {
  const gameConfig = scenarioToGameConfig(scenario, app.state.training.gameConfig);
  app.setState({
    training: {
      ...app.state.training,
      gameState: "idle",
      step: "setup",
      gameConfig,
      scene: gameConfig.scene,
      debateTopic: gameConfig.scene,
      playerIdentity: getPlayerRoleFromConfig(gameConfig).name,
      aiIdentity: getAiRoleFromConfig(gameConfig).name,
      playerSide: gameConfig.playerRoleKey,
      aiSide: gameConfig.aiRoleKey,
      aiDifficulty: difficultyLabelForConfig(gameConfig.difficulty),
      difficulty: difficultyLabelForConfig(gameConfig.difficulty),
      goal: formatTrainingGoals(gameConfig.trainingGoals),
      maxRounds: maxRoundsForDifficulty(gameConfig.difficulty),
      opponent: scenario.openingMessage,
      generatedScenario: scenario,
      messages: [],
      feedbacks: [],
      review: null,
      result: "",
      round: 1,
      persuasionScore: 0,
      persuasionDelta: 0,
      opponentState: "strong",
      offTrackStreak: 0,
      scenarioStatus,
      scenarioMessage,
      scenarioRequestId: scenarioRequestId || app.state.training.scenarioRequestId || ""
    }
  });
}

export function startTrainingGame(app) {
  const training = app.state.training;
  const config = getGameConfig(training);
  const playerRole = getPlayerRoleFromConfig(config);
  const aiRole = getAiRoleFromConfig(config);
  if (!config.scene.trim()) {
    app.setState({
      training: {
        ...training,
        scenarioMessage: "请先填写本局场景。"
      }
    });
    return;
  }
  if (!playerRole.name.trim() || !aiRole.name.trim()) {
    app.setState({
      training: {
        ...training,
        scenarioMessage: "请先填写两个角色名称。"
      }
    });
    return;
  }
  const scenario = training.generatedScenario || buildScenarioFromGameConfig(config);
  const opponent = scenario?.openingMessage || training.opponent || makeOpeningOpponent(config.scene);
  app.setState({
    training: {
      ...training,
      gameState: "playing",
      step: "chat",
      gameConfig: config,
      scene: config.scene,
      playerSide: config.playerRoleKey,
      aiSide: config.aiRoleKey,
      debateTopic: config.scene,
      playerIdentity: playerRole.name,
      aiIdentity: aiRole.name,
      aiDifficulty: difficultyLabelForConfig(config.difficulty),
      difficulty: difficultyLabelForConfig(config.difficulty),
      goal: formatTrainingGoals(config.trainingGoals),
      generatedScenario: scenario,
      opponent,
      input: "",
      isSubmitting: false,
      round: 1,
      maxRounds: maxRoundsForDifficulty(config.difficulty),
      persuasionScore: 0,
      persuasionDelta: 0,
      opponentState: "strong",
      offTrackStreak: 0,
      review: null,
      result: "",
      feedbacks: [],
      messages: [{ role: "assistant", content: opponent }],
      scenarioMessage: ""
    }
  });
}

export function resetTrainingGame(app) {
  app.setState({
    training: {
      ...app.state.training,
      gameState: "idle",
      step: "setup",
      input: "",
      isSubmitting: false,
      round: 1,
      persuasionScore: 0,
      persuasionDelta: 0,
      opponentState: "strong",
      offTrackStreak: 0,
      review: null,
      result: "",
      generatedScenario: null,
      scenarioStatus: "idle",
      opponent: "",
      messages: [],
      feedbacks: [],
      scenarioMessage: "",
      scenarioRequestId: ""
    }
  });
}

export async function finishTrainingGame(app) {
  const training = app.state.training;
  if (training.gameState !== "playing" || training.isSubmitting) return;
  await submitTrainingGame(app, { forceEnd: true });
}

export async function handleTrainingSubmit(app) {
  const training = app.state.training;
  if (training.isSubmitting) return;

  {
    const reply = training.input.trim();
    if (!reply) {
      app.setState({
        training: {
          ...training,
          scenarioMessage: "请先输入玩家回复。"
        }
      });
      return;
    }
    await submitTrainingGame(app, { userReply: reply });
    return;
  }
}

export async function submitTrainingGame(app, { userReply = "", forceEnd = false } = {}) {
  const training = app.state.training;
  const generatedScenario = training.generatedScenario;
  const config = getGameConfig(training);
  const userMessage = userReply ? { role: "user", content: userReply } : null;
  const messages = userMessage ? [...training.messages, userMessage] : training.messages;
  const payload = {
    gameConfig: config,
    scene: config.scene,
    aiDifficulty: difficultyLabelForConfig(config.difficulty),
    difficulty: config.difficulty,
    goal: formatTrainingGoals(config.trainingGoals),
    round: training.round,
    maxRounds: training.maxRounds || 5,
    persuasionScore: training.persuasionScore || 0,
    forceEnd,
    offTrackStreak: training.offTrackStreak || 0,
    mainline: generatedScenario?.mainline,
    messages
  };

  app.setState({
    training: {
      ...training,
      input: userReply ? "" : training.input,
      isSubmitting: true,
      scenarioMessage: forceEnd ? "正在结算本轮..." : "正在判断本轮说服度...",
      messages
    }
  });

  try {
    const result = await submitTrainingReply(payload);
    const assistantMessage = result.assistantMessage || training.opponent || "";
    const nextMessages = assistantMessage ? [...messages, { role: "assistant", content: assistantMessage }] : messages;
    const feedback = userReply
      ? {
          id: Date.now(),
          userReply,
          nextOpponent: assistantMessage,
          persuasionDelta: result.persuasionDelta || 0,
          persuasionScore: result.persuasionScore || 0,
          feedback: result.feedback || "",
          roundScore: result.roundScore || null,
          opponentState: result.opponentState || "strong"
        }
      : null;

    app.setState({
      training: {
        ...app.state.training,
        gameState: result.gameState || "playing",
        step: result.gameState === "finished" ? "finished" : "chat",
        input: "",
        isSubmitting: false,
        scenarioMessage: "",
        round: result.round || training.round,
        maxRounds: result.maxRounds || training.maxRounds || 5,
        persuasionScore: result.persuasionScore ?? training.persuasionScore,
        persuasionDelta: result.persuasionDelta || 0,
        opponentState: result.opponentState || training.opponentState,
        offTrackStreak: result.offTrackStreak || 0,
        opponent: assistantMessage || training.opponent,
        messages: nextMessages,
        feedbacks: feedback ? [...training.feedbacks, feedback] : training.feedbacks,
        review: result.review || null,
        result: result.review?.result || ""
      }
    });
  } catch (error) {
    console.error("training game failed", error);
    app.setState({
      training: {
        ...app.state.training,
        input: userReply || app.state.training.input,
        isSubmitting: false,
        scenarioMessage: "本轮判断失败，请稍后重试。"
      }
    });
  }
}
