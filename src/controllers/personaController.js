import { dedicatedPersonaQuizQuestions } from "../data/njutiQuizData.js";
import {
  CURRENT_PROFILE_KEY,
  DISTILL_RESULTS_KEY,
  PERSONA_CHAT_HISTORY_KEY,
  PERSONA_CHAT_KEY,
  TEST_RESULTS_KEY
} from "../constants/storageKeys.js";
import {
  getProfileName,
  getProfileTone,
  makeDistillResult,
  makeTestResult,
  mapReplyMode,
  mergePersonas
} from "../domain/persona.js";
import { extractPersona, generatePersonaReply } from "../services/api.js";
import { splitReplyMessages } from "../utils/message.js";
import { readJson, writeJson } from "../utils/storage.js";
import { getMessageContent, normalizeMessage } from "../utils/messageModel.js";

export async function generateDistillPersona(app) {
  const { upload } = app.state.proxyPersona;
  app.updateProxyPersona({ distillStatus: "loading", distillResult: null, message: "" });
  const rawText = upload.normalizedTrainingText || upload.chatText;

  try {
    const result = await extractPersona({
      rawText,
      targetSpeaker: upload.targetSpeaker || "我",
      sourceType: upload.sourceType || "chat"
    });
    app.updateProxyPersona({
      distillStatus: "done",
      distillResult: makeDistillResult(result, upload),
      message: "蒸馏完成，可以保存档案。"
    });
  } catch (error) {
    app.updateProxyPersona({
      distillStatus: "error",
      distillResult: null,
      message: `AI 调用失败：${error.message}`
    });
  }
}

export function saveDistillPersona(app) {
  const result = app.state.proxyPersona.distillResult;
  if (!result) return;
  const distillResults = [result, ...app.state.proxyPersona.distillResults];
  writeJson(DISTILL_RESULTS_KEY, distillResults);
  writeJson(CURRENT_PROFILE_KEY, result);
  app.setState({
    page: "persona",
    activePersona: result.profileName,
    proxyPersona: {
      ...app.state.proxyPersona,
      distillResults,
      personas: mergePersonas(distillResults, app.state.proxyPersona.testResults),
      selectedPersonaId: result.id,
      currentProfile: result,
      createSheetOpen: false,
      distillResult: null,
      distillStatus: "idle",
      message: "已保存蒸馏嘴替档案，并设为当前嘴替。"
    }
  });
  if (window.location.hash !== "#/persona") window.location.hash = "#/persona";
}

export function createPersonaFromTest(app) {
  const answered = Object.values(app.state.proxyPersona.testAnswers).filter(Boolean).length;
  const unanswered = dedicatedPersonaQuizQuestions.length - answered;
  if (unanswered > 1) {
    window.alert?.(`还有 ${unanswered} 道题未作答，最多只能空 1 道题。`);
    return;
  }

  const result = makeTestResult(app.state.proxyPersona.testAnswers);
  const testResults = [result, ...app.state.proxyPersona.testResults];
  writeJson(TEST_RESULTS_KEY, testResults);
  writeJson(CURRENT_PROFILE_KEY, result);
  app.setState({
    page: "persona",
    proxyPersona: {
      ...app.state.proxyPersona,
      testResults,
      personas: mergePersonas(app.state.proxyPersona.distillResults, testResults),
      selectedPersonaId: result.id,
      currentProfile: result,
      createSheetOpen: false,
      message: `已生成专属嘴替人格：${result.typeName}，并设为当前嘴替。`
    }
  });
  if (window.location.hash !== "#/persona") window.location.hash = "#/persona";
}

export function setCurrentProfile(app, profileId) {
  const profile = app.state.proxyPersona.personas.find((item) => item.id === profileId);
  if (!profile) return;
  writeJson(CURRENT_PROFILE_KEY, profile);
  app.updateProxyPersona({
    currentProfile: profile,
    selectedPersonaId: profile.id,
    createSheetOpen: false,
    personaInfoOpen: false,
    message: `当前嘴替已设为：${getProfileName(profile)}`
  });
}

export function deleteProfileResult(app, profileId) {
  const distillResults = app.state.proxyPersona.distillResults.filter((item) => item.id !== profileId);
  const testResults = app.state.proxyPersona.testResults.filter((item) => item.id !== profileId);
  writeJson(DISTILL_RESULTS_KEY, distillResults);
  writeJson(TEST_RESULTS_KEY, testResults);

  const currentProfile =
    app.state.proxyPersona.currentProfile?.id === profileId ? null : app.state.proxyPersona.currentProfile;
  if (!currentProfile) localStorage.removeItem(CURRENT_PROFILE_KEY);

  app.updateProxyPersona({
    distillResults,
    testResults,
    personas: mergePersonas(distillResults, testResults),
    currentProfile,
    selectedPersonaId: currentProfile?.id || "",
    message: "已删除。"
  });
}

export async function generateProxyReply(app) {
  const state = app.state.proxyPersona;
  if (state.isReplyGenerating) return;
  const opponentText = state.replyForm.opponentMessage.trim();
  if (!opponentText) {
    app.updateProxyPersona({ message: "先把对方刚说的话填到底部输入框。" });
    return;
  }

  const styleProfile =
    state.personas.find((persona) => String(persona.id) === String(state.selectedPersonaId)) ||
    state.currentProfile;
  if (!styleProfile) {
    app.updateProxyPersona({ message: "请先生成或选择一个嘴替档案。" });
    return;
  }

  const requestId = `persona-reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const currentTurns = normalizeConversationTurns(state.chatTurns);
  const opponentTurn = normalizeMessage({
    id: `opponent-${Date.now()}`,
    role: "opponent",
    content: opponentText
  });
  const pendingTurns = [...currentTurns, opponentTurn];
  writeJson(PERSONA_CHAT_KEY, pendingTurns);

  app.updateProxyPersona({
    chatTurns: pendingTurns,
    isReplyGenerating: true,
    generationRequestId: requestId,
    replyResult: null,
    message: "正在生成回应..."
  });

  try {
    const result = await generatePersonaReply({
      personaId: styleProfile.id || state.selectedPersonaId,
      chatHistory: state.upload.chatText,
      personaProfile: styleProfile.personaProfile || styleProfile,
      opponentText,
      opponentMessage: opponentText,
      contextSummary: state.replyForm.background,
      background: state.replyForm.background,
      userGoal: state.replyForm.goal,
      goal: state.replyForm.goal,
      strategy: state.replyForm.mode,
      intensity: state.replyForm.strength,
      strength: state.replyForm.strength,
      mode: mapReplyMode(state.replyForm.mode),
      history: pendingTurns
    });
    if (app.state.proxyPersona.generationRequestId !== requestId) return;
    if (result.source === "fallback") throw new Error("AI 调用失败：后端返回了 fallback 回复");
    const reply = result.reply || result.myStyleReply || result.data?.reply;
    if (!reply) throw new Error("AI 调用失败：回复内容为空");
    const assistantTurns = splitReplyMessages(reply).map((text, index) =>
      normalizeMessage({
        id: `assistant-${Date.now()}-${index}`,
        role: "assistant",
        content: text
      })
    );
    const chatTurns = [...pendingTurns, ...assistantTurns];
    writeJson(PERSONA_CHAT_KEY, chatTurns);
    app.updateProxyPersona({
      chatTurns,
      replyResult: {
        reply,
        source: result.source || "ai",
        strategy: result.styleAnalysis,
        tone: getProfileTone(styleProfile)
      },
      isReplyGenerating: false,
      generationRequestId: "",
      replyForm: {
        ...state.replyForm,
        opponentMessage: ""
      },
      message: "嘴替已经接上了。"
    });
  } catch (error) {
    if (app.state.proxyPersona.generationRequestId !== requestId) return;
    app.updateProxyPersona({
      chatTurns: pendingTurns,
      replyResult: {
        source: "fallback",
        error: error.message,
        reply: ""
      },
      isReplyGenerating: false,
      generationRequestId: "",
      message: `AI 调用失败：${error.message}`
    });
  }
}

export function finishProxyConversation(app) {
  const state = app.state.proxyPersona;
  const chatTurns = normalizeConversationTurns(state.chatTurns);
  const nextState = {
    chatTurns: [],
    isReplyGenerating: false,
    generationRequestId: "",
    replyForm: {
      ...state.replyForm,
      opponentMessage: ""
    }
  };

  if (!chatTurns.length) {
    localStorage.removeItem(PERSONA_CHAT_KEY);
    app.updateProxyPersona({
      ...nextState,
      message: "当前没有可保存的对话。"
    });
    return;
  }

  const profile =
    state.personas.find((persona) => String(persona.id) === String(state.selectedPersonaId)) ||
    state.currentProfile;
  const historyItem = {
    id: `persona-history-${Date.now()}`,
    type: "专属嘴替记录",
    source: "专属嘴替",
    personaId: profile?.id || state.selectedPersonaId || "",
    personaName: profile ? getProfileName(profile) : "当前嘴替",
    contextSummary: state.replyForm.background,
    userGoal: state.replyForm.goal,
    strategy: state.replyForm.mode,
    intensity: state.replyForm.strength,
    messages: chatTurns,
    createdAt: new Date().toISOString()
  };
  const histories = [historyItem, ...readJson(PERSONA_CHAT_HISTORY_KEY, [])].slice(0, 50);
  writeJson(PERSONA_CHAT_HISTORY_KEY, histories);
  localStorage.removeItem(PERSONA_CHAT_KEY);
  app.updateProxyPersona({
    ...nextState,
    chatHistories: histories,
    message: "本轮嘴替已保存。"
  });
}

export function clearProxyConversation(app) {
  localStorage.removeItem(PERSONA_CHAT_KEY);
  app.updateProxyPersona({
    chatTurns: [],
    isReplyGenerating: false,
    generationRequestId: "",
    replyForm: {
      ...app.state.proxyPersona.replyForm,
      opponentMessage: ""
    },
    message: "当前对话已清空。"
  });
}

function normalizeConversationTurns(turns = []) {
  return turns
    .map((turn) => {
      const role = turn.role === "user" ? "opponent" : turn.role;
      return normalizeMessage({ ...turn, role });
    })
    .filter((turn) => ["opponent", "assistant"].includes(turn.role))
    .filter((turn) => getMessageContent(turn).trim())
    .filter((turn) => !isConfigLeakedTurn(turn));
}

function isConfigLeakedTurn(turn) {
  const text = getMessageContent(turn);
  return turn.role === "opponent" && (text.includes("\n") || /我想表达[:：]/.test(text));
}
