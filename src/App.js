import BottomNav from "./components/BottomNav.js";
import HomePage from "./pages/HomePage.js";
import TempArguePage from "./pages/TempArguePage.js";
import PersonaPage from "./pages/PersonaPage.js";
import PersonaDistillPage from "./pages/PersonaDistillPage.js";
import PersonaTestPage from "./pages/PersonaTestPage.js";
import TrainingPage, { getGameConfig, TrainingPreviewContent } from "./pages/TrainingPage.js";
import ProfilePage from "./pages/ProfilePage.js";
import RecordsPage from "./pages/RecordsPage.js";
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
} from "./domain/training.js";
import {
  extractPersona,
  generatePersonaReply,
  generatePresetTrainingScenario as requestPresetTrainingScenario,
  generateRandomTrainingScenario as requestRandomTrainingScenario,
  generateTempReply,
  generateTempScenario as requestTempScenario,
  sendToFeishu,
  submitTrainingReply
} from "./services/api.js";
import { escapeAttr, escapeHtml } from "./utils/html.js";
import { splitReplyMessages } from "./utils/message.js";
import { readJson, writeJson } from "./utils/storage.js";
import {
  dedicatedPersonaPersonalities,
  dedicatedPersonaPersonalityWeights,
  dedicatedPersonaQuizQuestions
} from "./data/njutiQuizData.js";
import {
  buildPersonaChatTurn,
  buildTempChatTurn,
  features,
  initialPersonaSession,
  initialProxyPersonaState,
  initialTempSession,
  initialTrainingSession,
  goalOptions,
  makeOpeningOpponent,
  navItems,
  proxyReplyModes,
  proxyReplyStrengths,
  relationProfiles,
  toneOptions,
  tempScenarioPresets
} from "./data/mockData.js";

const DISTILL_RESULTS_KEY = "persona_distill_results";
const TEST_RESULTS_KEY = "persona_test_results";
const CURRENT_PROFILE_KEY = "current_persona_profile";
const PERSONA_CHAT_KEY = "persona_chat_turns";
const FEISHU_WEBHOOK_KEY = "didi_feishu_webhook_url";

const pageTitles = {
  home: "临时吵",
  temp: "临时吵",
  persona: "专属嘴替",
  personaDistill: "蒸馏自己",
  personaTest: "嘴替测试",
  training: "吵架训练",
  records: "记录",
  profile: "我的"
};

export default class App {
  constructor(root) {
    this.root = root;
    this.state = {
      page: pageFromHash() || "temp",
      profiles: structuredClone(relationProfiles),
      proxyPersona: createProxyPersonaState(),
      activePersona: initialPersonaSession.who,
      profilePreferences: {
        tone: "冷静反击",
        strength: "中等",
        length: "中等",
        mainlineLock: "开启"
      },
      feishu: createFeishuState(),
      temp: structuredClone(initialTempSession),
      persona: structuredClone(initialPersonaSession),
      training: structuredClone(initialTrainingSession)
    };

    this.root.addEventListener("click", (event) => this.handleClick(event));
    this.root.addEventListener("input", (event) => this.handleInput(event));
    this.root.addEventListener("change", (event) => this.handleChange(event));
    window.addEventListener("hashchange", () => {
      const page = pageFromHash();
      if (page && page !== this.state.page) this.setState({ page });
    });
  }

  setState(nextState) {
    this.state = { ...this.state, ...nextState };
    this.render();
  }

  getPage() {
    if (this.state.page === "temp") return TempArguePage(this.state.temp);
    if (this.state.page === "persona") return PersonaPage({ ...this.state.proxyPersona, feishu: this.state.feishu });
    if (this.state.page === "personaDistill") return PersonaDistillPage(this.state.proxyPersona);
    if (this.state.page === "personaTest") return PersonaTestPage(this.state.proxyPersona);
    if (this.state.page === "training") return TrainingPage(this.state.training);
    if (this.state.page === "records") {
      return RecordsPage({
        temp: this.state.temp,
        persona: this.state.persona,
        training: this.state.training
      });
    }
    if (this.state.page === "profile") {
      return ProfilePage({ preferences: this.state.profilePreferences, feishu: this.state.feishu });
    }
    return HomePage();
  }

  async handleClick(event) {
    const copyTarget = event.target.closest("[data-copy-reply]");
    if (copyTarget) {
      navigator.clipboard?.writeText(copyTarget.dataset.copyReply);
      copyTarget.textContent = "已复制";
      return;
    }

    const pageTarget = event.target.closest("[data-page]");
    if (pageTarget) {
      if (["personaDistill", "personaTest"].includes(pageTarget.dataset.page)) {
        this.state.proxyPersona = { ...this.state.proxyPersona, createSheetOpen: false, personaInfoOpen: false };
      }
      this.navigate(pageTarget.dataset.page);
      return;
    }

    const chipTarget = event.target.closest("[data-chip-session]");
    if (chipTarget) {
      const sessionKey = chipTarget.dataset.chipSession;
      const field = chipTarget.dataset.chipField;
      if (sessionKey === "proxyPersona.replyForm") {
        this.setNestedState("proxyPersona", "replyForm", field, chipTarget.dataset.chipValue);
        return;
      }
      if (sessionKey === "training.gameConfig") {
        this.updateTrainingSetup(["training", "gameConfig", field], chipTarget.dataset.chipValue);
        return;
      }
      this.setState({
        [sessionKey]: { ...this.state[sessionKey], [field]: chipTarget.dataset.chipValue }
      });
      return;
    }

    const testTarget = event.target.closest("[data-test-answer]");
    if (testTarget) {
      const questionId = testTarget.dataset.questionId;
      this.state.proxyPersona = {
        ...this.state.proxyPersona,
        testAnswers: {
          ...this.state.proxyPersona.testAnswers,
          [questionId]: testTarget.dataset.testAnswer
        }
      };
      testTarget
        .closest("[data-test-question]")
        ?.querySelectorAll("[data-test-answer]")
        .forEach((button) => button.classList.toggle("active", button === testTarget));
      return;
    }

    const profilePrefTarget = event.target.closest("[data-profile-pref]");
    if (profilePrefTarget) {
      const field = profilePrefTarget.dataset.profilePref;
      this.setState({
        profilePreferences: {
          ...this.state.profilePreferences,
          [field]: profilePrefTarget.dataset.profileValue
        }
      });
      return;
    }

    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) return;
    const action = actionTarget.dataset.action;

    if (action === "generate-distill-persona") {
      await this.generateDistillPersona();
      return;
    }
    if (action === "save-distill-persona") {
      this.saveDistillPersona();
      return;
    }
    if (action === "reset-distill-result") {
      this.updateProxyPersona({ distillResult: null, distillStatus: "idle", message: "" });
      return;
    }
    if (action === "open-persona-create") {
      this.updateProxyPersona({ createSheetOpen: true });
      return;
    }
    if (action === "close-persona-create") {
      this.updateProxyPersona({ createSheetOpen: false });
      return;
    }
    if (action === "open-persona-info") {
      this.updateProxyPersona({ personaInfoOpen: true });
      return;
    }
    if (action === "close-persona-info") {
      this.updateProxyPersona({ personaInfoOpen: false });
      return;
    }
    if (action === "open-reply-settings") {
      this.updateProxyPersona({ replySettingsOpen: true });
      return;
    }
    if (action === "close-reply-settings") {
      this.updateProxyPersona({ replySettingsOpen: false });
      return;
    }
    if (action === "open-feishu-settings") {
      this.openFeishuSettings();
      return;
    }
    if (action === "close-feishu-settings") {
      this.updateFeishu({ settingsOpen: false });
      return;
    }
    if (action === "save-feishu-settings") {
      this.saveFeishuSettings();
      return;
    }
    if (action === "test-feishu-webhook") {
      await this.testFeishuWebhook();
      return;
    }
    if (action === "submit-persona-test") {
      this.createPersonaFromTest();
      return;
    }
    if (action === "set-current-profile") {
      this.setCurrentProfile(actionTarget.dataset.profileId);
      return;
    }
    if (action === "delete-profile-result") {
      this.deleteProfileResult(actionTarget.dataset.profileId);
      return;
    }
    if (action === "generate-proxy-reply") {
      await this.generateProxyReply();
      return;
    }
    if (action === "send-reply-to-feishu") {
      await this.sendReplyToFeishu(actionTarget.dataset.turnId);
      return;
    }
    if (action === "generate-random-training-scenario") {
      await this.generateRandomTrainingScenario();
      return;
    }
    if (action === "toggle-training-goal") {
      this.toggleTrainingGoal(actionTarget.dataset.goal);
      return;
    }
    if (action === "confirm-training-scenario") {
      await this.generatePresetTrainingScenario();
      return;
    }
    if (action === "open-training-settings") {
      this.setState({ training: { ...this.state.training, settingsOpen: true } });
      return;
    }
    if (action === "close-training-settings") {
      this.setState({ training: { ...this.state.training, settingsOpen: false } });
      return;
    }
    if (action === "go-persona-distill") {
      this.navigate("personaDistill");
      return;
    }
    if (action === "start-temp-chat") {
      this.setState({ temp: { ...this.state.temp, step: "chat", input: this.state.temp.latest || "" } });
      return;
    }
    if (action === "edit-temp-setup") {
      this.setState({ temp: { ...this.state.temp, step: "setup" } });
      return;
    }
    if (action === "temp-reply") {
      await this.handleTempReply();
      return;
    }
    if (action === "temp-reply-intent") {
      await this.handleTempReply({ inputAsIntent: true });
      return;
    }
    if (action === "open-temp-settings") {
      this.setState({ temp: { ...this.state.temp, settingsOpen: true } });
      return;
    }
    if (action === "close-temp-settings") {
      this.setState({ temp: { ...this.state.temp, settingsOpen: false } });
      return;
    }
    if (action === "generate-temp-scenario") {
      await this.generateTempScenario();
      return;
    }
    if (action === "use-temp-scenario") {
      this.useTempScenario(actionTarget.dataset.scenarioIndex);
      return;
    }
    if (action === "start-persona-chat") {
      this.setState({
        activePersona: this.state.persona.who,
        persona: { ...this.state.persona, step: "chat", input: this.state.persona.latest || "" }
      });
      return;
    }
    if (action === "edit-persona-setup") {
      this.setState({ persona: { ...this.state.persona, step: "setup" } });
      return;
    }
    if (action === "persona-reply") {
      const text = this.state.persona.input.trim();
      if (!text) return;
      const turn = buildPersonaChatTurn(this.state.persona, text);
      this.setState({
        persona: { ...this.state.persona, latest: text, input: "", rounds: [...this.state.persona.rounds, turn] }
      });
      return;
    }
    if (action === "start-training-game" || action === "start-training-chat") {
      this.startTrainingGame();
      return;
    }
    if (action === "finish-training-game") {
      await this.finishTrainingGame();
      return;
    }
    if (action === "restart-training-game") {
      this.startTrainingGame();
      return;
    }
    if (action === "reset-training-game") {
      this.resetTrainingGame();
      return;
    }
    if (action === "edit-training-setup") {
      this.resetTrainingGame();
      return;
    }
    if (action === "training-submit") {
      await this.handleTrainingSubmit();
    }
  }

  handleInput(event) {
    const feishuInput = event.target.dataset.feishuInput;
    if (feishuInput) {
      this.state.feishu = {
        ...this.state.feishu,
        [feishuInput]: event.target.value,
        status: ""
      };
      return;
    }

    const setup = event.target.dataset.setupInput;
    if (setup) {
      const parts = setup.split(".");
      if (parts[0] === "training") {
        this.updateTrainingSetup(parts, event.target.value, false);
        return;
      }
      if (parts.length === 3) {
        this.setNestedState(parts[0], parts[1], parts[2], event.target.value, false);
        return;
      }
      const [sessionKey, field] = parts;
      this.state[sessionKey] = { ...this.state[sessionKey], [field]: event.target.value };
      return;
    }

    const inputType = event.target.dataset.sessionInput;
    if (inputType) {
      this.state[inputType] = { ...this.state[inputType], input: event.target.value };
    }
  }

  handleChange(event) {
    const setup = event.target.dataset.setupInput;
    if (setup) {
      const parts = setup.split(".");
      if (parts[0] === "training") {
        this.updateTrainingSetup(parts, event.target.value);
        return;
      }
      if (parts.length === 3) {
        this.setNestedState(parts[0], parts[1], parts[2], event.target.value);
        return;
      }
      const [sessionKey, field] = parts;
      this.setState({
        [sessionKey]: { ...this.state[sessionKey], [field]: event.target.value }
      });
      return;
    }

    const fileInput = event.target.closest("[data-file-input='persona-distill']");
    if (!fileInput) return;
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt") && file.type !== "text/plain") {
      this.updateProxyPersona({ message: "目前只支持 txt 文本文件。" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.updateProxyPersona({
        upload: {
          ...this.state.proxyPersona.upload,
          chatText: String(reader.result || "")
        },
        message: "已读取 txt 文件内容。"
      });
    };
    reader.readAsText(file, "utf-8");
  }

  navigate(page) {
    const hash = hashFromPage(page);
    if (hash && window.location.hash !== hash) window.location.hash = hash;
    this.setState({ page });
  }

  updateProxyPersona(partial) {
    this.setState({
      proxyPersona: {
        ...this.state.proxyPersona,
        ...partial
      }
    });
  }

  updateFeishu(partial) {
    this.setState({
      feishu: {
        ...this.state.feishu,
        ...partial
      }
    });
  }

  openFeishuSettings(status = "") {
    const hash = hashFromPage("profile");
    if (hash && window.location.hash !== hash) window.location.hash = hash;
    this.setState({
      page: "profile",
      feishu: {
        ...this.state.feishu,
        settingsOpen: true,
        status
      }
    });
  }

  saveFeishuSettings() {
    const webhookUrl = this.state.feishu.webhookUrl.trim();
    localStorage.setItem(FEISHU_WEBHOOK_KEY, webhookUrl);
    this.updateFeishu({
      webhookUrl,
      savedWebhookUrl: webhookUrl,
      status: webhookUrl ? "已保存飞书 Webhook。" : "已清空飞书 Webhook。"
    });
  }

  async testFeishuWebhook() {
    const webhookUrl = this.state.feishu.webhookUrl.trim();
    if (!webhookUrl) {
      this.updateFeishu({ status: "请先填写飞书群 Webhook URL。" });
      return;
    }

    this.updateFeishu({ testStatus: "sending", status: "正在测试发送..." });
    try {
      await sendToFeishu({ webhookUrl, text: "飞书接入测试：App 已经可以把 AI 回怼推送到群里。" });
      localStorage.setItem(FEISHU_WEBHOOK_KEY, webhookUrl);
      this.updateFeishu({
        savedWebhookUrl: webhookUrl,
        testStatus: "sent",
        status: "测试发送成功。"
      });
    } catch (error) {
      this.updateFeishu({
        testStatus: "error",
        status: `测试发送失败：${error.message}`
      });
    }
  }

  async sendReplyToFeishu(turnId) {
    const turn = this.state.proxyPersona.chatTurns.find((item) => String(item.id) === String(turnId));
    if (!turn?.text) return;

    const webhookUrl = this.state.feishu.webhookUrl.trim() || localStorage.getItem(FEISHU_WEBHOOK_KEY) || "";
    if (!webhookUrl) {
      this.updateProxyPersona({ message: "请先配置飞书 Webhook" });
      this.openFeishuSettings("请先配置飞书 Webhook");
      return;
    }

    this.updateFeishuStatusForTurn(turnId, "sending");
    try {
      await sendToFeishu({ webhookUrl, text: turn.text });
      this.updateFeishuStatusForTurn(turnId, "sent", "已发送到飞书。");
    } catch (error) {
      this.updateFeishuStatusForTurn(turnId, "error", `发送失败：${error.message}`);
    }
  }

  updateFeishuStatusForTurn(turnId, status, message = "") {
    this.setState({
      feishu: {
        ...this.state.feishu,
        sendingByTurnId: {
          ...this.state.feishu.sendingByTurnId,
          [turnId]: status
        }
      },
      proxyPersona: {
        ...this.state.proxyPersona,
        message: message || this.state.proxyPersona.message
      }
    });
  }

  updateTrainingSetup(parts, value, render = true) {
    const training = this.state.training;
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

    if (render) this.setState({ training: updatedTraining });
    else this.state.training = updatedTraining;
  }

  toggleTrainingGoal(goal) {
    if (!goal) return;
    const config = getGameConfig(this.state.training);
    const goals = config.trainingGoals.includes(goal)
      ? config.trainingGoals.filter((item) => item !== goal)
      : [...config.trainingGoals, goal];
    this.updateTrainingSetup(["training", "gameConfig", "trainingGoals"], goals.length ? goals : [goal]);
  }

  useTempScenario(index) {
    const preset = tempScenarioPresets[Number(index)];
    if (!preset) return;
    this.setState({
      temp: {
        ...this.state.temp,
        ...preset,
        generatedScenario: null,
        scenarioStatus: "idle",
        scenarioMessage: "",
        settingsOpen: false,
        input: "",
        rounds: []
      }
    });
  }

  setNestedState(rootKey, groupKey, field, value, render = true) {
    this.state[rootKey] = {
      ...this.state[rootKey],
      [groupKey]: {
        ...this.state[rootKey][groupKey],
        [field]: value
      }
    };
    if (render) this.render();
  }

  async generateDistillPersona() {
    const { upload } = this.state.proxyPersona;
    this.updateProxyPersona({ distillStatus: "loading", distillResult: null, message: "" });

    try {
      const result = await extractPersona({
        rawText: upload.chatText,
        targetSpeaker: upload.targetSpeaker || "我",
        sourceType: upload.sourceType || "chat"
      });
      this.updateProxyPersona({
        distillStatus: "done",
        distillResult: makeDistillResult(result, upload),
        message: "蒸馏完成，可以保存档案。"
      });
    } catch (error) {
      this.updateProxyPersona({
        distillStatus: "done",
        distillResult: makeDistillResult(makeMockDistillProfile().personaProfile, upload),
        message: `${error.message}。先用本地模拟结果跑通流程。`
      });
    }
  }

  saveDistillPersona() {
    const result = this.state.proxyPersona.distillResult;
    if (!result) return;
    const distillResults = [result, ...this.state.proxyPersona.distillResults];
    writeJson(DISTILL_RESULTS_KEY, distillResults);
    writeJson(CURRENT_PROFILE_KEY, result);
    this.setState({
      page: "persona",
      activePersona: result.profileName,
      proxyPersona: {
        ...this.state.proxyPersona,
        distillResults,
        personas: mergePersonas(distillResults, this.state.proxyPersona.testResults),
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

  createPersonaFromTest() {
    const answered = Object.values(this.state.proxyPersona.testAnswers).filter(Boolean).length;
    const unanswered = dedicatedPersonaQuizQuestions.length - answered;
    if (unanswered > 1) {
      window.alert?.(`还有 ${unanswered} 道题未作答，最多只能空 1 道题。`);
      return;
    }

    const result = makeTestResult(this.state.proxyPersona.testAnswers);
    const testResults = [result, ...this.state.proxyPersona.testResults];
    writeJson(TEST_RESULTS_KEY, testResults);
    writeJson(CURRENT_PROFILE_KEY, result);
    this.setState({
      page: "persona",
      proxyPersona: {
        ...this.state.proxyPersona,
        testResults,
        personas: mergePersonas(this.state.proxyPersona.distillResults, testResults),
        selectedPersonaId: result.id,
        currentProfile: result,
        createSheetOpen: false,
        message: `已生成专属嘴替人格：${result.typeName}，并设为当前嘴替。`
      }
    });
    if (window.location.hash !== "#/persona") window.location.hash = "#/persona";
  }

  setCurrentProfile(profileId) {
    const profile = this.state.proxyPersona.personas.find((item) => item.id === profileId);
    if (!profile) return;
    writeJson(CURRENT_PROFILE_KEY, profile);
    this.updateProxyPersona({
      currentProfile: profile,
      selectedPersonaId: profile.id,
      createSheetOpen: false,
      personaInfoOpen: false,
      message: `当前嘴替已设为：${getProfileName(profile)}`
    });
  }

  deleteProfileResult(profileId) {
    const distillResults = this.state.proxyPersona.distillResults.filter((item) => item.id !== profileId);
    const testResults = this.state.proxyPersona.testResults.filter((item) => item.id !== profileId);
    writeJson(DISTILL_RESULTS_KEY, distillResults);
    writeJson(TEST_RESULTS_KEY, testResults);

    const currentProfile =
      this.state.proxyPersona.currentProfile?.id === profileId ? null : this.state.proxyPersona.currentProfile;
    if (!currentProfile) localStorage.removeItem(CURRENT_PROFILE_KEY);

    this.updateProxyPersona({
      distillResults,
      testResults,
      personas: mergePersonas(distillResults, testResults),
      currentProfile,
      selectedPersonaId: currentProfile?.id || "",
      message: "已删除。"
    });
  }

  async generateProxyReply() {
    const state = this.state.proxyPersona;
    if (state.isReplyGenerating) return;

    const styleProfile =
      state.personas.find((persona) => String(persona.id) === String(state.selectedPersonaId)) ||
      state.currentProfile;
    if (!styleProfile) {
      this.updateProxyPersona({ message: "请先生成或选择一个嘴替档案。" });
      return;
    }

    this.updateProxyPersona({
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
      this.updateProxyPersona({
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
      this.updateProxyPersona({
        chatTurns,
        replyResult: fallback,
        isReplyGenerating: false,
        message: `${error.message}。先用本地示例回应预览。`
      });
    }
  }

  async handleTempReply({ inputAsIntent = false } = {}) {
    const temp = this.state.temp;
    if (temp.isSubmitting) return;

    const typedText = temp.input.trim();
    const opponentText = inputAsIntent
      ? temp.latest.trim() || temp.generatedScenario?.openingMessage || ""
      : typedText || temp.latest.trim() || temp.generatedScenario?.openingMessage || "";
    const userIntent = inputAsIntent ? typedText : "";
    if (!opponentText && !userIntent) return;

    this.setState({
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
        latestOpponentMessage: opponentText,
        opponent: opponentText,
        userIntent,
        goal: temp.goal,
        tone: temp.tone,
        intensity: temp.tone,
        history: temp.rounds.map((round) => ({
          opponent: round.opponent,
          reply: round.replies?.[0]?.text || "",
          analysis: round.analysis
        }))
      });
      turn = {
        id: Date.now(),
        opponent: opponentText || "我想表达：" + userIntent,
        analysis: result.opponentTactic,
        mainline: `${result.strategy} ${result.offTopicWarning || ""}`,
        replies: uniqueReplyOptions([
          { label: "稳妥版", text: result.recommendedReply },
          { label: "强硬版", text: result.strongerReply },
          { label: "嘴替版/阴阳版", text: result.sarcasticReply || result.politeFinalReply }
        ])
      };
    } catch {
      turn = buildTempChatTurn(temp, opponentText || userIntent);
      turn.replies = uniqueReplyOptions(turn.replies);
    }
    this.setState({
      temp: {
        ...this.state.temp,
        latest: opponentText || temp.latest,
        input: "",
        isSubmitting: false,
        rounds: [...temp.rounds, turn]
      }
    });
  }

  async generateTempScenario() {
    const temp = this.state.temp;
    if (temp.scenarioStatus === "loading") return;

    this.setState({
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
        latest: temp.latest
      });
      const scenario = normalizeTempScenario(result.scenario || result, temp);
      this.setState({
        temp: {
          ...this.state.temp,
          who: scenario.opponentPersona || this.state.temp.who,
          context: scenario.background || this.state.temp.context,
          latest: scenario.openingMessage || this.state.temp.latest,
          goal: scenario.userGoal || this.state.temp.goal,
          generatedScenario: scenario,
          scenarioStatus: "done",
          scenarioMessage: "临时场景已生成，对方先开口了。",
          input: "",
          rounds: []
        }
      });
    } catch (error) {
      const scenario = buildLocalTempScenario(temp);
      this.setState({
        temp: {
          ...this.state.temp,
          latest: scenario.openingMessage,
          generatedScenario: scenario,
          scenarioStatus: "done",
          scenarioMessage: `API 生成较慢或失败，已先生成本地场景。${error.message ? `（${error.message}）` : ""}`,
          input: "",
          rounds: []
        }
      });
    }
  }

  async generateRandomTrainingScenario() {
    const training = this.state.training;
    if (training.scenarioStatus === "loading") return;

    this.setState({
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

      this.applyGeneratedTrainingScenario(scenario, "AI 已随机生成一局，仍可在中间区域手动修改。");
    } catch (error) {
      this.setState({
        training: {
          ...this.state.training,
          scenarioStatus: "error",
          scenarioMessage: error.message || "场景生成失败，请再试一次。"
        }
      });
    }
  }

  async generatePresetTrainingScenario() {
    const training = this.state.training;
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

    this.applyGeneratedTrainingScenario(draftScenario, "已按本局配置生成训练草稿，正在用 API 精修...", "loading", requestId);

    try {
      const result = await requestPresetTrainingScenario(request);
      const scenario = result.scenario;
      if (!scenario?.openingMessage) throw new Error("场景生成结果为空");
      if (this.state.training.scenarioRequestId !== requestId || this.state.training.gameState !== "idle") return;

      this.applyGeneratedTrainingScenario(scenario, "已按本局配置生成训练草稿，可以继续修改或开始训练。");
    } catch (error) {
      if (this.state.training.scenarioRequestId !== requestId || this.state.training.gameState !== "idle") return;
      this.setState({
        training: {
          ...this.state.training,
          scenarioStatus: "done",
          scenarioMessage: `API 精修较慢或失败，已保留当前设置生成的场景。${error.message ? `（${error.message}）` : ""}`
        }
      });
    }
  }

  applyGeneratedTrainingScenario(scenario, scenarioMessage, scenarioStatus = "done", scenarioRequestId = "") {
    const gameConfig = scenarioToGameConfig(scenario, this.state.training.gameConfig);
    this.setState({
      training: {
        ...this.state.training,
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
        scenarioRequestId: scenarioRequestId || this.state.training.scenarioRequestId || ""
      }
    });
  }

  startTrainingGame() {
    const training = this.state.training;
    const config = getGameConfig(training);
    const playerRole = getPlayerRoleFromConfig(config);
    const aiRole = getAiRoleFromConfig(config);
    if (!config.scene.trim()) {
      this.setState({
        training: {
          ...training,
          scenarioMessage: "请先填写本局场景。"
        }
      });
      return;
    }
    if (!playerRole.name.trim() || !aiRole.name.trim()) {
      this.setState({
        training: {
          ...training,
          scenarioMessage: "请先填写两个角色名称。"
        }
      });
      return;
    }
    const scenario = training.generatedScenario || buildScenarioFromGameConfig(config);
    const opponent = scenario?.openingMessage || training.opponent || makeOpeningOpponent(config.scene);
    this.setState({
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

  resetTrainingGame() {
    this.setState({
      training: {
        ...this.state.training,
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

  async finishTrainingGame() {
    const training = this.state.training;
    if (training.gameState !== "playing" || training.isSubmitting) return;
    await this.submitTrainingGame({ forceEnd: true });
  }

  async handleTrainingSubmit() {
    const training = this.state.training;
    if (training.isSubmitting) return;

    {
      const reply = training.input.trim();
      if (!reply) {
        this.setState({
          training: {
            ...training,
            scenarioMessage: "请先输入玩家回复。"
          }
        });
        return;
      }
      await this.submitTrainingGame({ userReply: reply });
      return;
    }
  }

  async submitTrainingGame({ userReply = "", forceEnd = false } = {}) {
    const training = this.state.training;
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

    this.setState({
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

      this.setState({
        training: {
          ...this.state.training,
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
      this.setState({
        training: {
          ...this.state.training,
          input: userReply || this.state.training.input,
          isSubmitting: false,
          scenarioMessage: "本轮判断失败，请稍后重试。"
        }
      });
    }
  }

  render() {
    const { page } = this.state;
    const isRealtimePage =
      page === "temp" ||
      page === "persona" ||
      (page === "training" && this.state.training.gameState === "playing");
    this.root.innerHTML = `
      <div class="app-shell">
        <div class="phone-frame web-app-frame">
          ${TopNav(page)}
          <header class="top-bar">
            <button class="mini-sticker logo-sticker" data-page="home" aria-label="回到首页">
              <img src="/public/app-logo.svg" alt="" />
            </button>
            <div>
              <p class="eyebrow">对方说一句，我帮你接一句</p>
              <h1>${pageTitles[page]}</h1>
            </div>
            <button class="mini-sticker danger" data-page="persona">替</button>
          </header>
          <div class="desktop-workspace">
            <aside class="desktop-sidebar">${DesktopSidebar(this.state)}</aside>
            <main class="page-scroll ${isRealtimePage ? "realtime-scroll" : ""} ${page === "persona" ? "persona-scroll" : ""}">${this.getPage()}</main>
            <aside class="desktop-context">${DesktopContextPanel(this.state)}</aside>
          </div>
          ${BottomNav(page)}
        </div>
      </div>
    `;
    this.scrollChatAreasToBottom();
  }

  scrollChatAreasToBottom() {
    if (!["temp", "persona", "training"].includes(this.state.page)) return;
    window.requestAnimationFrame?.(() => {
      this.root.querySelectorAll(".persona-chat-scroll, .realtime-chat-scroll").forEach((element) => {
        element.scrollTop = element.scrollHeight;
      });
    });
  }
}

function TopNav(activePage) {
  return `
    <nav class="web-top-nav" aria-label="顶部导航">
      <button class="web-brand" data-page="temp">
        <img src="/public/app-logo.svg" alt="" />
        <span>滴滴代吵</span>
      </button>
      <div class="web-nav-links">
        ${navItems
          .map(
            (item) => `
              <button class="web-nav-link ${activePage === item.key ? "active" : ""}" data-page="${item.key}">
                ${item.label}
              </button>
            `
          )
          .join("")}
      </div>
    </nav>
  `;
}

function DesktopSidebar(state) {
  const activePage = state.page;
  const profile = getCurrentProxyProfile(state.proxyPersona);
  return `
    <section class="desktop-panel">
      <h2>功能入口</h2>
      <div class="desktop-mode-list">
        ${features
          .map(
            (feature) => `
              <button class="desktop-mode-card ${activePage === feature.key ? "active" : ""}" data-page="${feature.key}">
                <b>${feature.mark}</b>
                <span>${feature.title}</span>
              </button>
            `
          )
          .join("")}
      </div>
    </section>
    <section class="desktop-panel">
      <h2>最近状态</h2>
      <p>临时吵：${state.temp.rounds.length} 轮</p>
      <p>专属嘴替：${state.proxyPersona.chatTurns.length} 条消息</p>
      <p>训练场：第 ${state.training.round || 1} 轮</p>
    </section>
    <section class="desktop-panel">
      <h2>当前人格</h2>
      <p>${profile ? escapeHtml(getProfileName(profile)) : "还没创建嘴替人格"}</p>
      <div class="desktop-tag-row">
        ${getProfileTagsForLayout(profile).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
    </section>
  `;
}

function DesktopContextPanel(state) {
  if (state.page === "persona") return PersonaDesktopContext(state.proxyPersona);
  if (state.page === "training") return TrainingDesktopContext(state.training);
  if (state.page === "records") return SimpleDesktopContext("记录", "这里会沉淀你的临时吵、专属嘴替和训练结果。");
  if (state.page === "profile") return SimpleDesktopContext("我的", "管理偏好、飞书同步和后续账号设置。");
  return TempDesktopContext(state.temp);
}

function TempDesktopContext(temp) {
  return `
    <section class="desktop-panel context-panel">
      <h2>主线锁定</h2>
      ${DesktopField("和谁吵", "temp.who", temp.who, "客服、室友、对象、同事")}
      ${DesktopField("对方说了什么", "temp.latest", temp.latest, "对方刚刚那句话")}
      ${DesktopField("前情提要", "temp.context", temp.context, "为什么吵起来")}
      <h3>我的诉求</h3>
      ${DesktopChipGroup("temp", "goal", goalOptions, temp.goal)}
      <h3>语气强度</h3>
      ${DesktopChipGroup("temp", "tone", toneOptions, temp.tone)}
      <div class="desktop-preset-list">
        ${tempScenarioPresets
          .map((item, index) => `<button class="tiny-button" data-action="use-temp-scenario" data-scenario-index="${index}">${escapeHtml(item.label)}</button>`)
          .join("")}
      </div>
    </section>
  `;
}

function PersonaDesktopContext(proxyPersona) {
  const profile = getCurrentProxyProfile(proxyPersona);
  return `
    <section class="desktop-panel context-panel">
      <h2>嘴替人格</h2>
      <p>${profile ? escapeHtml(getProfileName(profile)) : "还没有专属嘴替"}</p>
      <div class="desktop-tag-row">
        ${getProfileTagsForLayout(profile).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
      <button class="secondary-button warm compact-full-button" data-action="open-persona-create">创建 / 切换人格</button>
      <button class="secondary-button compact-full-button" data-page="personaDistill">上传 txt 蒸馏</button>
      <button class="secondary-button compact-full-button" data-page="personaTest">做人格测试</button>
      <h3>生成策略</h3>
      ${DesktopChipGroup("proxyPersona.replyForm", "mode", proxyReplyModes, proxyPersona.replyForm.mode)}
      ${DesktopChipGroup("proxyPersona.replyForm", "strength", proxyReplyStrengths, proxyPersona.replyForm.strength)}
      ${DesktopField("前情提要", "proxyPersona.replyForm.background", proxyPersona.replyForm.background, "这次冲突的背景")}
      ${DesktopField("我想表达", "proxyPersona.replyForm.goal", proxyPersona.replyForm.goal, "想守住的主线")}
    </section>
  `;
}

function TrainingDesktopContext(training) {
  const config = getGameConfig(training);
  return `
    <section class="desktop-panel context-panel">
      ${TrainingPreviewContent(training, config)}
    </section>
  `;
}

function SimpleDesktopContext(title, text) {
  return `<section class="desktop-panel context-panel"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></section>`;
}

function DesktopField(label, path, value, placeholder) {
  return `
    <label class="desktop-field">
      <span>${escapeHtml(label)}</span>
      <textarea data-setup-input="${path}" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value)}</textarea>
    </label>
  `;
}

function DesktopChipGroup(sessionKey, field, options, active, labelFormatter = (item) => item) {
  return `
    <div class="desktop-chip-group">
      ${options
        .map(
          (item) => `<button class="chip tiny-chip ${active === item ? "active" : ""}" data-chip-session="${sessionKey}" data-chip-field="${field}" data-chip-value="${escapeAttr(item)}">${escapeHtml(labelFormatter(item))}</button>`
        )
        .join("")}
    </div>
  `;
}

function getCurrentProxyProfile(proxyPersona) {
  return (
    proxyPersona.personas.find((persona) => String(persona.id) === String(proxyPersona.selectedPersonaId)) ||
    proxyPersona.currentProfile
  );
}

function getProfileTagsForLayout(profile) {
  if (!profile) return ["先创建", "再开吵"];
  return (profile.personaProfile?.personalityTags || profile.tags || profile.styleProfile?.commonPhrases || ["专属", "边界"]).slice(0, 4);
}

function createProxyPersonaState() {
  const distillResults = readJson(DISTILL_RESULTS_KEY, []).map(normalizeDistillResult);
  const testResults = readJson(TEST_RESULTS_KEY, []).map(normalizeTestResult);
  const storedCurrentProfile = readJson(CURRENT_PROFILE_KEY, null);
  const currentProfile = storedCurrentProfile ? normalizeProfile(storedCurrentProfile) : null;
  const personas = mergePersonas(distillResults, testResults);

  return {
    ...structuredClone(initialProxyPersonaState),
    activeTab: "upload",
    upload: {
      targetSpeaker: "我",
      sourceType: "chat",
      relationship: "谈了 3 个月的男友",
      background: "他最近经常不回消息，临时改约后说我太敏感。",
      chatText: "我不是想吵架，我只是希望你尊重之前说好的约定。你先别把问题说成我太敏感。"
    },
    testAnswers: Object.fromEntries(dedicatedPersonaQuizQuestions.map((question) => [question.id, ""])),
    distillResults,
    testResults,
    personas,
    selectedPersonaId: currentProfile?.id || personas[0]?.id || "",
    currentProfile,
    createSheetOpen: false,
    personaInfoOpen: false,
    distillStatus: "idle",
    distillResult: null,
    replyForm: {
      opponentMessage: "你怎么又开始了？这点小事也要上纲上线？",
      background: "昨天约好一起吃饭，他临时说要和朋友出去。",
      goal: "反击对方逻辑",
      mode: "像我本人",
      strength: "中"
    },
    replySettingsOpen: false,
    chatTurns: readJson(PERSONA_CHAT_KEY, []),
    replyResult: null,
    message: ""
  };
}

function createFeishuState() {
  const webhookUrl = localStorage.getItem(FEISHU_WEBHOOK_KEY) || "";
  return {
    webhookUrl,
    savedWebhookUrl: webhookUrl,
    settingsOpen: false,
    testStatus: "idle",
    sendingByTurnId: {},
    status: ""
  };
}

function makeDistillResult(personaProfile, upload) {
  const profile = personaProfile.styleProfile || personaProfile;
  return {
    id: `distill-${Date.now()}`,
    createdAt: new Date().toISOString(),
    sourceType: "chat_upload",
    profileName: personaProfile.profileName || personaProfile.name || "我的蒸馏嘴替",
    targetSpeaker: personaProfile.targetSpeaker || upload.targetSpeaker || "",
    relationship: upload.relationship || "",
    background: upload.background || "",
    personaProfile,
    styleProfile: {
      tone: profile.tone || personaProfile.languageFeatures?.tone || "冷静但有压迫感",
      emotionLevel: Number(profile.emotionLevel || 3),
      logicStyle: profile.logicStyle || personaProfile.argumentStyle?.logicPattern || "先指出问题，再反问对方逻辑漏洞，最后给出边界",
      commonPhrases:
        profile.commonPhrases ||
        personaProfile.languageFeatures?.sampleLines ||
        personaProfile.languageFeatures?.vocabulary ||
        ["你先别转移话题", "我现在说的是这件事本身", "这不是我敏感，是你的处理方式有问题"],
      avoidWords: profile.avoidWords || personaProfile.safetyBoundary?.doNotImitate || ["脏话", "人身攻击", "过度服软"],
      replyStrategy: profile.replyStrategy || personaProfile.imitationGuide?.replyFormula || "不跟随对方转移话题，持续围绕核心问题推进",
      profileSummary: profile.profileSummary || personaProfile.sourceSummary || personaProfile.corePersonality?.summary || "适合生成冷静、清楚、有边界感的个性化回应。"
    }
  };
}

function makeMockDistillProfile() {
  return {
    personaProfile: {
      profileName: "我的蒸馏嘴替",
      tone: "冷静但有压迫感",
      emotionLevel: 3,
      logicStyle: "先指出问题，再反问对方逻辑漏洞，最后给出边界",
      commonPhrases: ["你先别转移话题", "我现在说的是这件事本身", "这不是我敏感，是你的处理方式有问题"],
      avoidWords: ["脏话", "人身攻击", "过度服软"],
      replyStrategy: "不跟随对方转移话题，持续围绕核心问题推进",
      profileSummary: "适合生成冷静、清楚、有边界感的个性化回应。"
    }
  };
}

function makeTestResult(testAnswers) {
  const scores = Object.fromEntries(Object.keys(dedicatedPersonaPersonalities).map((key) => [key, 0]));

  Object.entries(testAnswers).forEach(([questionId, answer]) => {
    const weights = dedicatedPersonaPersonalityWeights[questionId]?.[answer];
    if (!weights) return;
    Object.entries(weights).forEach(([key, value]) => {
      scores[key] = (scores[key] || 0) + value;
    });
  });

  let resultKey = "RESTRAINED";
  Object.entries(scores).forEach(([key, value]) => {
    if (value > scores[resultKey]) resultKey = key;
  });

  const base = dedicatedPersonaPersonalities[resultKey] || dedicatedPersonaPersonalities.RESTRAINED;
  return normalizeTestResult({
    id: `test-${Date.now()}`,
    createdAt: new Date().toISOString(),
    sourceType: "test",
    resultKey,
    scores,
    ...base
  });
}

function normalizeDistillResult(result) {
  const profile = result.styleProfile || result;
  return {
    id: String(result.id || `distill-${Date.now()}`),
    createdAt: result.createdAt || new Date().toISOString(),
    sourceType: "chat_upload",
    profileName: result.profileName || result.name || "我的蒸馏嘴替",
    targetSpeaker: result.targetSpeaker || "",
    relationship: result.relationship || "",
    background: result.background || "",
    personaProfile: result.personaProfile || result,
    styleProfile: {
      tone: profile.tone || "冷静但有压迫感",
      emotionLevel: Number(profile.emotionLevel || 3),
      logicStyle: profile.logicStyle || "",
      commonPhrases: profile.commonPhrases || [],
      avoidWords: profile.avoidWords || [],
      replyStrategy: profile.replyStrategy || "",
      profileSummary: profile.profileSummary || ""
    }
  };
}

function normalizeTestResult(result) {
  const fallback = dedicatedPersonaPersonalities.RESTRAINED;
  const typeName = result.typeName || result.name || fallback.typeName;
  const nickname = result.nickname || fallback.nickname;
  const subtitle = result.subtitle || fallback.subtitle;
  const tags = result.tags || result.dimensions || fallback.tags;
  const styleProfile = result.styleProfile || fallback.styleProfile;
  return {
    id: String(result.id || `test-${Date.now()}`),
    createdAt: result.createdAt || new Date().toISOString(),
    sourceType: "test",
    resultKey: result.resultKey || "",
    emoji: result.emoji || fallback.emoji,
    category: result.category || fallback.category,
    scores: result.scores || {},
    typeName,
    nickname,
    subtitle,
    tags,
    styleProfile: {
      tone: styleProfile.tone || typeName,
      emotionLevel: Number(styleProfile.emotionLevel || 3),
      logicStyle: styleProfile.logicStyle || nickname,
      commonPhrases: styleProfile.commonPhrases || tags,
      avoidWords: styleProfile.avoidWords || ["脏话", "人身攻击"],
      replyStrategy: styleProfile.replyStrategy || subtitle,
      profileSummary: styleProfile.profileSummary || subtitle
    }
  };
}

function mergePersonas(distillResults, testResults) {
  return [...distillResults, ...testResults];
}

function normalizeProfile(profile) {
  if (profile.sourceType === "chat_upload" || profile.profileName) return normalizeDistillResult(profile);
  return normalizeTestResult(profile);
}

function getProfileName(profile) {
  return profile.profileName || profile.typeName || profile.name || "我的嘴替";
}

function getProfileTone(profile) {
  return profile.styleProfile?.tone || profile.tone || profile.typeName || "";
}

function makeLocalReply(replyForm, styleProfile) {
  const profile = styleProfile.styleProfile || styleProfile;
  const phrase = profile.commonPhrases?.[0] || "你先别转移话题";
  const strategy = profile.replyStrategy || "拉回主线，压住对方的偷换概念。";
  return {
    reply: `${phrase}。你刚才这句话是在把问题转成我的情绪。现在要谈的是${replyForm.goal || "这件事怎么处理"}，不是我有没有资格不舒服。请你正面回应。`,
    strategy: `本地预览：按「${getProfileName(styleProfile)}」人格生成。${strategy}`,
    tone: getProfileTone(styleProfile) || "温柔但有边界"
  };
}

function normalizeTempScenario(scenario, temp) {
  const mainline = scenario?.mainline && typeof scenario.mainline === "object" ? scenario.mainline : {};
  const fallback = buildLocalTempScenario(temp);
  return {
    title: String(scenario?.title || fallback.title || "").trim(),
    background: String(scenario?.background || fallback.background || "").trim(),
    opponentPersona: String(scenario?.opponentPersona || fallback.opponentPersona || "").trim(),
    openingMessage: String(scenario?.openingMessage || fallback.openingMessage || "").trim(),
    mainline: {
      fact: String(mainline.fact || fallback.mainline.fact || "").trim(),
      impact: String(mainline.impact || fallback.mainline.impact || "").trim(),
      request: String(mainline.request || fallback.mainline.request || "").trim(),
      boundary: String(mainline.boundary || fallback.mainline.boundary || "").trim()
    },
    userGoal: String(scenario?.userGoal || fallback.userGoal || "").trim(),
    tone: String(scenario?.tone || temp.tone || "").trim()
  };
}

function buildLocalTempScenario(temp) {
  const who = temp.who || "临时对手";
  const context = temp.context || "发生了一次具体冲突，对方正在回避责任。";
  const goal = temp.goal || "讲清楚";
  return {
    title: `${who}临时冲突`,
    background: context,
    opponentPersona: who,
    openingMessage: temp.latest || makeTempOpening(who, context),
    mainline: {
      fact: context,
      impact: "对方的说法正在把具体问题转成你的态度或情绪。",
      request: `你的目标是：${goal}`,
      boundary: "不要接受辱骂、人身攻击或继续转移重点。"
    },
    userGoal: goal,
    tone: temp.tone || "中"
  };
}

function makeTempOpening(who, context) {
  if (/客服|商家|售后|退款/.test(`${who} ${context}`)) return "这个不是我们的问题，你自己下单前也应该看清楚规则。";
  if (/对象|男朋友|女朋友|恋爱|约/.test(`${who} ${context}`)) return "你怎么又开始了？这点小事也要说这么严重吗？";
  if (/室友|宿舍|卫生/.test(`${who} ${context}`)) return "你别说得好像自己多守规矩一样，宿舍又不是你一个人的。";
  if (/同事|工作|项目/.test(`${who} ${context}`)) return "这也不能全怪我吧，你要求这么高，那你来做不是更快吗？";
  return "你现在这样说就很没必要，本来没多大的事。";
}

function mapReplyMode(mode) {
  if (mode === "说得更清楚") return "clearer";
  if (mode === "攻击力加强") return "stronger";
  return "close_to_user";
}

function uniqueReplyOptions(replies) {
  const seen = new Set();
  return replies.filter((reply) => {
    const text = String(reply.text || "").trim();
    if (!text || seen.has(text)) return false;
    seen.add(text);
    return true;
  });
}

function pageFromHash() {
  const value = window.location.hash.replace(/^#\/?/, "");
  const map = {
    persona: "persona",
    "persona-distill": "personaDistill",
    "persona-test": "personaTest",
    temp: "temp",
    training: "training",
    profile: "profile",
    records: "records",
    home: "temp"
  };
  return map[value] || "";
}

function hashFromPage(page) {
  const map = {
    persona: "#/persona",
    personaDistill: "#/persona-distill",
    personaTest: "#/persona-test",
    temp: "#/temp",
    training: "#/training",
    records: "#/records",
    profile: "#/profile",
    home: "#/temp"
  };
  return map[page] || "";
}
