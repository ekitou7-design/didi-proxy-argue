import { dedicatedPersonaQuizQuestions } from "../data/njutiQuizData.js";
import {
  getProfileName,
  getProfileTone,
  makeDistillResult,
  makeLocalReply,
  makeMockDistillProfile,
  makeTestResult,
  mapReplyMode,
  mergePersonas
} from "../domain/persona.js";
import { extractPersona, generatePersonaReply } from "../services/api.js";
import { splitReplyMessages } from "../utils/message.js";
import { writeJson } from "../utils/storage.js";

const DISTILL_RESULTS_KEY = "persona_distill_results";
const TEST_RESULTS_KEY = "persona_test_results";
const CURRENT_PROFILE_KEY = "current_persona_profile";
const PERSONA_CHAT_KEY = "persona_chat_turns";

export async function generateDistillPersona(app) {
  const { upload } = app.state.proxyPersona;
  app.updateProxyPersona({ distillStatus: "loading", distillResult: null, message: "" });

  try {
    const result = await extractPersona({
      rawText: upload.chatText,
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
      distillStatus: "done",
      distillResult: makeDistillResult(makeMockDistillProfile().personaProfile, upload),
      message: `${error.message}。先用本地模拟结果跑通流程。`
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

  const styleProfile =
    state.personas.find((persona) => String(persona.id) === String(state.selectedPersonaId)) ||
    state.currentProfile;
  if (!styleProfile) {
    app.updateProxyPersona({ message: "请先生成或选择一个嘴替档案。" });
    return;
  }

  app.updateProxyPersona({
    isReplyGenerating: true,
    replyResult: null,
    message: "正在生成回应..."
  });

  const userText = [
    state.replyForm.background,
    state.replyForm.opponentMessage,
    state.replyForm.goal ? `我想表达：${state.replyForm.goal}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await generatePersonaReply({
      chatHistory: state.upload.chatText,
      personaProfile: styleProfile.personaProfile || styleProfile,
      opponentMessage: state.replyForm.opponentMessage,
      background: state.replyForm.background,
      realThought: "",
      goal: state.replyForm.goal,
      strength: state.replyForm.strength,
      mode: mapReplyMode(state.replyForm.mode)
    });
    const reply = result.reply || result.myStyleReply || result.data?.reply;
    const assistantTurns = splitReplyMessages(reply).map((text, index) => ({
      id: `assistant-${Date.now()}-${index}`,
      role: "assistant",
      text
    }));
    const chatTurns = [
      ...state.chatTurns,
      { id: `user-${Date.now()}`, role: "user", text: userText || state.replyForm.opponentMessage },
      ...assistantTurns
    ];
    writeJson(PERSONA_CHAT_KEY, chatTurns);
    app.updateProxyPersona({
      chatTurns,
      replyResult: {
        reply,
        strategy: result.styleAnalysis,
        tone: getProfileTone(styleProfile)
      },
      isReplyGenerating: false,
      replyForm: {
        ...state.replyForm,
        opponentMessage: "",
        background: "",
        goal: ""
      },
      message: "嘴替已经接上了。"
    });
  } catch (error) {
    const fallback = makeLocalReply(state.replyForm, styleProfile);
    const assistantTurns = splitReplyMessages(fallback.reply).map((text, index) => ({
      id: `assistant-${Date.now()}-${index}`,
      role: "assistant",
      text
    }));
    const chatTurns = [
      ...state.chatTurns,
      { id: `user-${Date.now()}`, role: "user", text: userText || state.replyForm.opponentMessage },
      ...assistantTurns
    ];
    writeJson(PERSONA_CHAT_KEY, chatTurns);
    app.updateProxyPersona({
      chatTurns,
      replyResult: fallback,
      isReplyGenerating: false,
      message: `${error.message}。先用本地示例回应预览。`
    });
  }
}
