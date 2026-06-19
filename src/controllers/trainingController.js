import {
  buildScenarioFromGameConfig,
  buildPresetScenarioDraft,
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
import { TRAINING_CHAT_HISTORY_KEY } from "../constants/storageKeys.js";
import { assertAiSource } from "../utils/aiSource.js";
import { readJson, writeJson } from "../utils/storage.js";
import { getMessageContent, normalizeMessage } from "../utils/messageModel.js";

export function updateTrainingSetup(app, parts, value, render = true) {
  const training = app.state.training;
  const isTrainingStoryInput = parts[0] === "training" && parts[1] === "gameConfig" && parts[2] === "contextSummary";
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

  const rawConfig = {
    ...(nextTraining.gameConfig || {}),
    ...(isTrainingStoryInput
      ? {
          contextSummary: value,
          scene: summarizeTrainingStory(value)
        }
      : {})
  };
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
    toneStrength: gameConfig.toneStrength,
    contextSummary: gameConfig.contextSummary,
    userMainline: gameConfig.userMainline,
    sessionControl: gameConfig.sessionControl,
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
    scenarioMessage: "设置已修改，将按中间区域的本局配置开始对练。",
    scenarioRequestId: "",
    generationRequestId: ""
  };

  if (render) app.setState({ training: updatedTraining });
  else app.state.training = updatedTraining;
}

function summarizeTrainingStory(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const firstSentence = text.split(/[。！？!?]/).find(Boolean) || text;
  return firstSentence.length > 80 ? `${firstSentence.slice(0, 80)}...` : firstSentence;
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
  const config = getGameConfig(training);
  const scenarioConfig = freeCreativeScenarioConfig(config);
  const previousScenarioSummary = summarizePreviousScenario(training.generatedScenario);
  const payload = {
    scenarioMode: "random",
    gameConfig: scenarioConfig,
    customScene: "",
    userGoal: "",
    aiDifficulty: difficultyLabelForConfig(config.difficulty),
    toneStrength: config.toneStrength,
    contextSummary: "",
    userMainline: "",
    sessionControl: config.sessionControl,
    creativitySeed: `creative_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    previousScenarioSummary,
    previousScenario: training.generatedScenario
      ? {
          title: training.generatedScenario.title,
          scene: training.generatedScenario.scene || training.generatedScenario.background,
          background: training.generatedScenario.background,
          openingMessage: training.generatedScenario.openingMessage
        }
      : null
  };

  app.setState({
    training: {
      ...training,
      scenarioStatus: "loading",
      scenarioMessage: "正在生成真实吵架现场..."
    }
  });

  try {
    console.log("[training/scenario/random] request payload", payload);
    const result = await requestRandomTrainingScenario(payload);
    console.log("[training/scenario/random] response scenario", result.scenario);
    assertAiSource(result, "训练场景");
    const scenario = { ...(result.scenario || {}), source: result.source };
    if (!scenario?.openingMessage) throw new Error("场景生成结果为空");

    applyGeneratedTrainingScenario(app, scenario, "真实 AI 已生成完整训练局，你可以修改剧情、角色和目标，再开始对练。");
  } catch (error) {
    app.setState({
      training: {
        ...app.state.training,
        scenarioStatus: "error",
        scenarioMessage: `AI 生成失败，请检查 API key / 后端服务 / 模型配置：${error.message || "场景生成失败，请再试一次。"}`
      }
    });
  }
}

function freeCreativeScenarioConfig(config) {
  return {
    ...config,
    scene: "",
    contextSummary: "",
    userMainline: "",
    roleA: {
      name: "角色A",
      description: "有理方 / 提出要求的一方",
      goal: formatTrainingGoals(config.trainingGoals)
    },
    roleB: {
      name: "角色B",
      description: "理亏方 / 辩解转移的一方",
      goal: "嘴硬、辩解、转移和拖延，尽量顶住有理方追问"
    }
  };
}

function summarizePreviousScenario(scenario) {
  if (!scenario) return "";
  return [scenario.title, scenario.scene || scenario.background, scenario.openingMessage].filter(Boolean).join(" / ");
}

export async function generatePresetTrainingScenario(app) {
  const training = app.state.training;
  if (training.scenarioStatus === "loading") return;
  const config = getGameConfig(training);
  const request = {
    ...(training.randomScenarioForm || {}),
    scenarioMode: "expand",
    gameConfig: config,
    customScene: config.contextSummary || config.scene,
    userGoal: config.userMainline || formatTrainingGoals(config.trainingGoals),
    debateTopic: config.contextSummary || config.scene,
    aiDifficulty: difficultyLabelForConfig(config.difficulty),
    toneStrength: config.toneStrength,
    contextSummary: config.contextSummary,
    userMainline: config.userMainline,
    sessionControl: config.sessionControl
  };
  const requestId = `preset_${Date.now()}`;
  const draftScenario = buildPresetScenarioDraft(request);

  applyGeneratedTrainingScenario(app, draftScenario, "已按本局配置生成训练草稿，正在用 API 精修。精修完成后仍可继续修改。", "loading", requestId);

  try {
    console.log("[training/scenario/preset] request payload", request);
    const result = await requestPresetTrainingScenario(request);
    assertAiSource(result, "训练场景");
    const scenario = { ...(result.scenario || {}), source: result.source };
    if (!scenario?.openingMessage) throw new Error("场景生成结果为空");
    if (app.state.training.scenarioRequestId !== requestId || app.state.training.gameState !== "idle") return;

    applyGeneratedTrainingScenario(app, scenario, "真实 AI 已生成完整训练局，你可以修改剧情、角色和目标，再开始对练。");
  } catch (error) {
    if (app.state.training.scenarioRequestId !== requestId || app.state.training.gameState !== "idle") return;
    app.setState({
      training: {
        ...app.state.training,
        scenarioStatus: "error",
        scenarioMessage: `AI 调用失败：${error.message || "训练场景生成失败，请稍后重试。"}`
      }
    });
  }
}

export function applyGeneratedTrainingScenario(app, scenario, scenarioMessage, scenarioStatus = "done", scenarioRequestId = "") {
  const gameConfig = scenarioToGameConfig(scenario, app.state.training.gameConfig);
  const normalizedScenario = normalizeScenarioForCurrentRoles(scenario, gameConfig);
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
      toneStrength: gameConfig.toneStrength,
      contextSummary: gameConfig.contextSummary,
      userMainline: gameConfig.userMainline,
      sessionControl: gameConfig.sessionControl,
      maxRounds: maxRoundsForConfig(gameConfig),
      opponent: normalizedScenario.openingMessage,
      generatedScenario: normalizedScenario,
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

export async function startTrainingGame(app) {
  const training = app.state.training;
  const config = getGameConfig(training);
  const playerRole = getPlayerRoleFromConfig(config);
  const aiRole = getAiRoleFromConfig(config);
  if (!config.scene.trim()) {
    app.setState({
      training: {
        ...training,
        scenarioMessage: "请先填写本局剧情。"
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

  const currentConfigScenario = {
    ...buildScenarioFromGameConfig(config),
    source: "current_game_config",
    openingMessageUsedFrom: "current_game_config"
  };
  const scenario = normalizeScenarioForCurrentRoles(currentConfigScenario, config);
  const opponent = scenario.openingMessage;
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
      toneStrength: config.toneStrength,
      contextSummary: config.contextSummary,
      userMainline: config.userMainline,
      sessionControl: config.sessionControl,
      generatedScenario: scenario,
      opponent,
      input: "",
      isSubmitting: false,
      round: 1,
      maxRounds: maxRoundsForConfig(config),
      persuasionScore: 0,
      persuasionDelta: 0,
      opponentState: "strong",
      offTrackStreak: 0,
      review: null,
      result: "",
      feedbacks: [],
      messages: [{ role: "assistant", content: opponent, source: scenario.source || "ai" }],
      scenarioMessage: "",
      generationRequestId: ""
    }
  });
}

function maxRoundsForConfig(config) {
  return config.playerRoleKey === "B" ? 5 : maxRoundsForDifficulty(config.difficulty);
}

export function normalizeScenarioForCurrentRoles(scenario = {}, config) {
  const playerRole = getPlayerRoleFromConfig(config);
  const aiRole = getAiRoleFromConfig(config);
  const openingMessageInfo = openingMessageForAiRole(scenario, config, { playerRole, aiRole });
  return {
    ...scenario,
    playerRoleKey: config.playerRoleKey,
    aiRoleKey: config.aiRoleKey,
    playerIdentity: playerRole.name,
    aiIdentity: aiRole.name,
    openingMessage: openingMessageInfo.message,
    openingMessageSpeaker: config.aiRoleKey,
    openingMessageSpeakerName: aiRole.name,
    openingMessageUsedFrom: scenario.openingMessageUsedFrom || openingMessageInfo.usedFrom,
    assistantMessageRoleKey: config.aiRoleKey,
    assistantMessageRoleName: aiRole.name
  };
}

function openingMessageForAiRole(scenario = {}, config, { playerRole, aiRole }) {
  const text = String(scenario.openingMessage || "").trim();
  const sourceSpeaker = normalizeOptionalRoleKey(scenario.openingMessageSpeaker);
  if (sourceSpeaker && sourceSpeaker !== config.aiRoleKey) {
    return {
      message: fallbackOpeningForAiRole(config, { playerRole, aiRole, scenario }),
      usedFrom: `regenerated_speaker_mismatch_${sourceSpeaker}_to_${config.aiRoleKey}`
    };
  }
  if (config.aiRoleKey === "A") {
    if (!text || looksLikeRoleBOpening(text)) {
      return {
        message: fallbackOpeningForAiRole(config, { playerRole, aiRole, scenario }),
        usedFrom: text ? "regenerated_inferred_roleB_opening" : "generated_fallback_empty"
      };
    }
    return { message: text, usedFrom: sourceSpeaker ? "scenario_verified_speaker" : "scenario_inferred_ai_role" };
  }
  if (!text || looksLikeRoleAOpening(text)) {
    return {
      message: fallbackOpeningForAiRole(config, { playerRole, aiRole, scenario }),
      usedFrom: text ? "regenerated_inferred_roleA_opening" : "generated_fallback_empty"
    };
  }
  return { message: text, usedFrom: sourceSpeaker ? "scenario_verified_speaker" : "scenario_inferred_ai_role" };
}

function fallbackOpeningForAiRole(config, { playerRole, aiRole, scenario = {} }) {
  if (config.aiRoleKey === "A") return buildRoleAOpening(config, { playerRole, aiRole, scenario });
  return buildRoleBOpening(config, { playerRole, aiRole });
}

function buildRoleAOpening(config, { playerRole, aiRole, scenario = {} }) {
  const text = [
    config.contextSummary,
    config.scene,
    scenario.scene,
    scenario.background,
    scenario.stanceJudgment?.aJustification,
    scenario.stanceJudgment?.bFault,
    scenario.mainline?.fact,
    scenario.mainline?.request
  ]
    .filter(Boolean)
    .join(" ");
  if (/黑色|白色|颜色随机|外套|商品详情|退货|退款|运费|卖家|买家/.test(text)) {
    return `${aiRole.name}先开口：我买的是黑色外套，你发来的是白色。商品详情没有清楚写明可以随便发色，现在请你处理退货、退款和运费。`;
  }
  if (/寄养|猫|跳蚤|抓伤|延期|寄养费|医疗费/.test(text)) {
    return `${aiRole.name}先开口：先别扯别的。你延期不接、隐瞒情况造成的费用，现在要给一个明确处理方式。`;
  }
  const bFault = String(scenario.stanceJudgment?.bFault || scenario.mainline?.fact || config.userMainline || config.scene || "这件事").trim();
  return `${aiRole.name}先开口：${playerRole.name}，别把责任往我身上推。${trimSentence(bFault, 42)}，你现在给个明确说法。`;
}

function buildRoleBOpening(config, { aiRole }) {
  const goal = String(aiRole.goal || "").trim();
  return goal ? `${aiRole.name}先开口：${goal}。` : "哎呀，不就一点小事吗，你别这么上纲上线。";
}

function looksLikeRoleBOpening(text) {
  if (!text) return true;
  return /不就|小事|上纲上线|不是故意|不能全怪我|你别|你太敏感|你想太多|都是我的问题|我也有|商品详情|颜色随机|你自己不看|没看清楚|怪我|不退|凭什么退|发货没问题|别找茬|找茬|我写了|详情里/.test(text);
}

function looksLikeRoleAOpening(text) {
  if (!text) return true;
  return /我买的是|你发的是|退款|退货|运费|你答应|你承诺|你没有|你没按|你延期|你隐瞒|你弄坏|你迟到|你不接|你已读不回|正面处理|给个说法/.test(text);
}

function normalizeOptionalRoleKey(value) {
  if (value === "A" || value === "B") return value;
  return "";
}

function trimSentence(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, "");
  if (!text) return "这件事已经造成影响";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
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
      scenarioRequestId: "",
      generationRequestId: ""
    }
  });
}

export async function finishTrainingGame(app) {
  const training = app.state.training;
  const messages = normalizeTrainingMessages(training.messages);
  if (!messages.length) {
    app.setState({
      training: {
        ...training,
        input: "",
        isSubmitting: false,
        generationRequestId: "",
        scenarioMessage: "当前没有可保存的对话。"
      }
    });
    return;
  }

  const config = getGameConfig(training);
  const historyItem = {
    id: `training-history-${Date.now()}`,
    type: "吵架训练记录",
    source: "训练场",
    scene: config.scene,
    goal: formatTrainingGoals(config.trainingGoals),
    difficulty: difficultyLabelForConfig(config.difficulty),
    playerRole: getPlayerRoleFromConfig(config).name,
    aiRole: getAiRoleFromConfig(config).name,
    messages,
    feedbacks: training.feedbacks || [],
    review: training.review || null,
    createdAt: new Date().toISOString()
  };
  const histories = [historyItem, ...readJson(TRAINING_CHAT_HISTORY_KEY, [])].slice(0, 50);
  writeJson(TRAINING_CHAT_HISTORY_KEY, histories);

  app.setState({
    training: clearTrainingSessionState(training, {
      chatHistories: histories,
      scenarioMessage: "本轮训练已保存。"
    })
  });
}

export function clearTrainingConversation(app) {
  app.setState({
    training: clearTrainingSessionState(app.state.training, {
      scenarioMessage: "当前训练对话已清空。"
    })
  });
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

function normalizeTrainingMessages(messages = []) {
  return messages
    .map((message) => normalizeMessage(message))
    .filter((message) => ["assistant", "user"].includes(message.role))
    .filter((message) => getMessageContent(message).trim());
}

function clearTrainingSessionState(training, partial = {}) {
  return {
    ...training,
    gameState: "idle",
    step: "setup",
    input: "",
    isSubmitting: false,
    generationRequestId: "",
    round: 1,
    persuasionScore: 0,
    persuasionDelta: 0,
    opponentState: "strong",
    offTrackStreak: 0,
    messages: [],
    feedbacks: [],
    review: null,
    result: "",
    ...partial
  };
}

export async function submitTrainingGame(app, { userReply = "", forceEnd = false } = {}) {
  const training = app.state.training;
  const requestId = `training-reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const generatedScenario = training.generatedScenario;
  const config = getGameConfig(training);
  const isVillainMode = config.playerRoleKey === "B";
  const userMessage = userReply ? { role: "user", content: userReply } : null;
  const messages = userMessage ? [...training.messages, userMessage] : training.messages;
  const payload = {
    gameConfig: config,
    scene: config.scene,
    aiDifficulty: difficultyLabelForConfig(config.difficulty),
    difficulty: config.difficulty,
    goal: formatTrainingGoals(config.trainingGoals),
    toneStrength: config.toneStrength,
    contextSummary: config.contextSummary,
    userMainline: config.userMainline,
    sessionControl: config.sessionControl,
    round: training.round,
    maxRounds: training.maxRounds || 5,
    persuasionScore: training.persuasionScore || 0,
    forceEnd,
    offTrackStreak: training.offTrackStreak || 0,
    mainline: generatedScenario?.mainline,
    messages,
    openingMessageSpeaker: generatedScenario?.openingMessageSpeaker || config.aiRoleKey
  };

  console.log("[training/reply] request payload", payload);

  app.setState({
    training: {
      ...training,
      input: userReply ? "" : training.input,
      isSubmitting: true,
      generationRequestId: requestId,
      scenarioMessage: forceEnd ? "正在结算本轮..." : isVillainMode ? "正在判断本轮抗压结果..." : "正在判断本轮说服度...",
      messages,
      devDebug: {
        ...(training.devDebug || {}),
        lastReplyRequestBody: payload,
        lastReplyResponseDebug: null,
        lastAiResponseMeta: null
      }
    }
  });

  try {
    const result = await submitTrainingReply(payload);
    if (app.state.training.generationRequestId !== requestId) return;
    const responseDebug = result.debug || null;
    const responseMeta = {
      source: result.source || "",
      model: result.model || responseDebug?.model || "",
      difficulty: result.difficulty || responseDebug?.receivedSettings?.difficulty || config.difficulty,
      toneStrength: result.toneStrength || responseDebug?.receivedSettings?.toneStrength || config.toneStrength
    };
    if (result.source === "fallback") {
      app.setState({
        training: {
          ...app.state.training,
          devDebug: {
            ...(app.state.training.devDebug || {}),
            lastReplyResponseDebug: responseDebug,
            lastAiResponseMeta: responseMeta
          }
        }
      });
    }
    assertAiSource(result, "训练回复");
    const assistantMessage = result.assistantMessage || training.opponent || "";
    const nextMessages = assistantMessage ? [...messages, { role: "assistant", content: assistantMessage, source: result.source }] : messages;
    const feedback = userReply
      ? {
          id: Date.now(),
          userReply,
          nextOpponent: assistantMessage,
          persuasionDelta: result.persuasionDelta || 0,
          persuasionScore: result.persuasionScore || 0,
          feedback: result.feedback || "",
          roundScore: result.roundScore || null,
          opponentState: result.opponentState || "strong",
          source: result.source
        }
      : null;

    app.setState({
      training: {
        ...app.state.training,
        gameState: result.gameState || "playing",
        step: result.gameState === "finished" ? "finished" : "chat",
        input: "",
        isSubmitting: false,
        generationRequestId: "",
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
        result: result.review?.result || "",
        devDebug: {
          ...(app.state.training.devDebug || {}),
          lastReplyResponseDebug: responseDebug,
          lastAiResponseMeta: responseMeta
        }
      }
    });
  } catch (error) {
    if (app.state.training.generationRequestId !== requestId) return;
    console.error("training game failed", error);
    app.setState({
      training: {
        ...app.state.training,
        input: userReply || app.state.training.input,
        isSubmitting: false,
        generationRequestId: "",
        scenarioMessage: `AI 调用失败：${error.message || "本轮判断失败，请稍后重试。"}`
      }
    });
  }
}
