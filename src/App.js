import BottomNav from "./components/BottomNav.js";
import HomePage from "./pages/HomePage.js";
import TempArguePage from "./pages/TempArguePage.js";
import PersonaPage from "./pages/PersonaPage.js";
import PersonaDistillPage from "./pages/PersonaDistillPage.js";
import PersonaTestPage from "./pages/PersonaTestPage.js";
import TrainingPage, { getGameConfig } from "./pages/TrainingPage.js";
import ProfilePage from "./pages/ProfilePage.js";
import RecordsPage from "./pages/RecordsPage.js";
import { DesktopContextPanel, DesktopSidebar, TopNav } from "./layout/appLayout.js";
import {
  openFeishuSettings,
  saveFeishuSettings,
  sendReplyToFeishu,
  testFeishuWebhook,
  updateFeishuStatusForTurn
} from "./controllers/feishuController.js";
import {
  createPersonaFromTest,
  deleteProfileResult,
  generateDistillPersona,
  generateProxyReply,
  saveDistillPersona,
  setCurrentProfile
} from "./controllers/personaController.js";
import {
  generateTempScenario,
  handleTempReply,
  useTempScenario
} from "./controllers/tempController.js";
import {
  getProfileName,
  mergePersonas,
  normalizeDistillResult,
  normalizeProfile,
  normalizeTestResult
} from "./domain/persona.js";
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
  generatePresetTrainingScenario as requestPresetTrainingScenario,
  generateRandomTrainingScenario as requestRandomTrainingScenario,
  submitTrainingReply
} from "./services/api.js";
import { readJson } from "./utils/storage.js";
import { dedicatedPersonaQuizQuestions } from "./data/njutiQuizData.js";
import {
  buildPersonaChatTurn,
  initialPersonaSession,
  initialProxyPersonaState,
  initialTempSession,
  initialTrainingSession,
  makeOpeningOpponent,
  relationProfiles,
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
    return openFeishuSettings(this, status);
  }

  saveFeishuSettings() {
    return saveFeishuSettings(this);
  }

  async testFeishuWebhook() {
    return testFeishuWebhook(this);
  }

  async sendReplyToFeishu(turnId) {
    return sendReplyToFeishu(this, turnId);
  }

  updateFeishuStatusForTurn(turnId, status, message = "") {
    return updateFeishuStatusForTurn(this, turnId, status, message);
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
    return useTempScenario(this, index);
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
    return generateDistillPersona(this);
  }

  saveDistillPersona() {
    return saveDistillPersona(this);
  }

  createPersonaFromTest() {
    return createPersonaFromTest(this);
  }

  setCurrentProfile(profileId) {
    return setCurrentProfile(this, profileId);
  }

  deleteProfileResult(profileId) {
    return deleteProfileResult(this, profileId);
  }

  async generateProxyReply() {
    return generateProxyReply(this);
  }

  async handleTempReply({ inputAsIntent = false } = {}) {
    return handleTempReply(this, { inputAsIntent });
  }

  async generateTempScenario() {
    return generateTempScenario(this);
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
