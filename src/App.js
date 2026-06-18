import BottomNav from "./components/BottomNav.js";
import { OnboardingCoach, OnboardingGlobalTip, onboardingModules } from "./components/OnboardingCoach.js";
import HomePage from "./pages/HomePage.js";
import TempArguePage from "./pages/TempArguePage.js";
import PersonaPage from "./pages/PersonaPage.js";
import PersonaDistillPage from "./pages/PersonaDistillPage.js";
import PersonaTestPage from "./pages/PersonaTestPage.js";
import TrainingPage from "./pages/TrainingPage.js";
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
  clearProxyConversation,
  createPersonaFromTest,
  deleteProfileResult,
  finishProxyConversation,
  generateDistillPersona,
  generateProxyReply,
  saveDistillPersona,
  setCurrentProfile
} from "./controllers/personaController.js";
import {
  clearTempConversation,
  finishTempConversation,
  generateTempScenario,
  handleTempReply
} from "./controllers/tempController.js";
import {
  applyGeneratedTrainingScenario,
  clearTrainingConversation,
  finishTrainingGame,
  generatePresetTrainingScenario,
  generateRandomTrainingScenario,
  handleTrainingSubmit,
  resetTrainingGame,
  startTrainingGame,
  submitTrainingGame,
  toggleTrainingGoal,
  updateTrainingSetup
} from "./controllers/trainingController.js";
import {
  getProfileName,
  mergePersonas,
  normalizeDistillResult,
  normalizeProfile,
  normalizeTestResult
} from "./domain/persona.js";
import {
  CURRENT_PROFILE_KEY,
  DISTILL_RESULTS_KEY,
  FEISHU_WEBHOOK_KEY,
  ONBOARDING_KEY,
  PERSONA_CHAT_HISTORY_KEY,
  PERSONA_CHAT_KEY,
  TEMP_CHAT_HISTORY_KEY,
  TRAINING_CHAT_HISTORY_KEY,
  TEST_RESULTS_KEY
} from "./constants/storageKeys.js";
import { getMessageContent, normalizeMessage } from "./utils/messageModel.js";
import { readJson, writeJson } from "./utils/storage.js";
import { dedicatedPersonaQuizQuestions } from "./data/njutiQuizData.js";
import {
  initialPersonaSession,
  initialProxyPersonaState,
  initialTempSession,
  initialTrainingSession,
  relationProfiles
} from "./data/mockData.js";

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
      onboarding: createOnboardingState(),
      onboardingStep: 0,
      onboardingActivePage: "",
      onboardingMessage: "",
      records: {
        expandedRecordIds: []
      },
      temp: {
        ...structuredClone(initialTempSession),
        chatHistories: readHistoryWithStableIds(TEMP_CHAT_HISTORY_KEY, "temp")
      },
      persona: structuredClone(initialPersonaSession),
      training: structuredClone(initialTrainingSession)
    };
    this.state.training.chatHistories = readHistoryWithStableIds(TRAINING_CHAT_HISTORY_KEY, "training");

    this.root.addEventListener("click", (event) => this.handleClick(event));
    this.root.addEventListener("keydown", (event) => this.handleKeyDown(event));
    this.root.addEventListener("input", (event) => this.handleInput(event));
    this.root.addEventListener("change", (event) => this.handleChange(event));
    this.didiDebugFlag = localStorage.getItem("didi_debug");
    window.setInterval(() => {
      const nextDebugFlag = localStorage.getItem("didi_debug");
      if (nextDebugFlag === this.didiDebugFlag) return;
      this.didiDebugFlag = nextDebugFlag;
      if (this.state.page === "training") this.render();
    }, 500);
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
        proxyPersona: this.state.proxyPersona,
        training: this.state.training,
        records: this.state.records
      });
    }
    if (this.state.page === "profile") {
      return ProfilePage({ preferences: this.state.profilePreferences, feishu: this.state.feishu });
    }
    return HomePage();
  }

  async handleClick(event) {
    const onboardingTarget = event.target.closest("[data-onboarding-action]");
    if (onboardingTarget) {
      this.handleOnboardingAction(onboardingTarget.dataset.onboardingAction);
      return;
    }

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
        this.updateTrainingSetup(["training", "gameConfig", ...field.split(".")], chipTarget.dataset.chipValue);
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
    if (action === "set-distill-input-type") {
      this.setDistillInputType(actionTarget.dataset.distillType);
      return;
    }
    if (action === "distill-placeholder") {
      window.alert?.(actionTarget.dataset.placeholderMessage || "这个入口将在后续版本支持。");
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
    if (action === "reset-onboarding") {
      this.resetOnboarding();
      return;
    }
    if (action === "delete-history-record") {
      event.preventDefault();
      event.stopPropagation();
      this.deleteHistoryRecord(actionTarget.dataset.historySource, actionTarget.dataset.historyId);
      return;
    }
    if (action === "toggle-history-record") {
      this.toggleHistoryRecord(actionTarget.dataset.historySource, actionTarget.dataset.historyId);
      return;
    }
    if (action === "clear-history-source") {
      event.preventDefault();
      event.stopPropagation();
      this.clearHistorySource(actionTarget.dataset.historySource);
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
      await this.createPersonaFromTest();
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
    if (action === "finish-proxy-conversation") {
      this.finishProxyConversation();
      return;
    }
    if (action === "clear-proxy-conversation") {
      this.clearProxyConversation();
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
    if (action === "generate-preset-training-scenario") {
      await this.generatePresetTrainingScenario();
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
    if (action === "open-training-dev-debug") {
      this.setState({ training: { ...this.state.training, devDebugDrawerOpen: true } });
      return;
    }
    if (action === "close-training-dev-debug") {
      this.setState({ training: { ...this.state.training, devDebugDrawerOpen: false } });
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
    if (action === "finish-temp-conversation") {
      this.finishTempConversation();
      return;
    }
    if (action === "clear-temp-conversation") {
      this.clearTempConversation();
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
      this.setState({
        persona: {
          ...this.state.persona,
          scenarioMessage: "这个旧入口已停用，避免使用本地固定话术。请使用“专属嘴替”页面底部的生成回怼，它会调用真实 AI API。"
        }
      });
      return;
    }
    if (action === "start-training-game" || action === "start-training-chat") {
      await this.startTrainingGame();
      return;
    }
    if (action === "finish-training-game") {
      await this.finishTrainingGame();
      return;
    }
    if (action === "clear-training-conversation") {
      this.clearTrainingConversation();
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

  handleKeyDown(event) {
    const action = event.target.dataset.enterAction;
    if (!action || event.key !== "Enter" || event.shiftKey || event.isComposing) return;

    event.preventDefault();
    const actionTarget = [...this.root.querySelectorAll("[data-action]")].find(
      (target) => target.dataset.action === action
    );
    if (!actionTarget || actionTarget.disabled) return;
    actionTarget.click();
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
        if (parts[0] === "proxyPersona" && parts[1] === "upload" && parts[2] === "chatText") {
          this.state.proxyPersona = {
            ...this.state.proxyPersona,
            upload: {
              ...this.state.proxyPersona.upload,
              chatText: event.target.value,
              normalizedTrainingText: event.target.value
            }
          };
          return;
        }
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

    const fileInput = event.target.closest("[data-file-input^='persona-distill']");
    if (!fileInput) return;
    const file = fileInput.files?.[0];
    if (!file) return;
    const format = fileInput.dataset.distillFormat || "text";
    if (!isAllowedDistillFile(file, format)) {
      this.updateProxyPersona({ message: distillFileError(format) });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const rawText = String(reader.result || "");
      const parsed = parseDistillFile(rawText, format, file.name);
      this.updateProxyPersona({
        upload: {
          ...this.state.proxyPersona.upload,
          distillInputType: format,
          chatText: parsed.text,
          normalizedTrainingText: parsed.normalizedTrainingText,
          uploadedFileName: file.name
        },
        message: parsed.message
      });
    };
    reader.readAsText(file, "utf-8");
  }

  navigate(page) {
    const hash = hashFromPage(page);
    if (hash && window.location.hash !== hash) window.location.hash = hash;
    this.setState({ page });
  }

  handleOnboardingAction(action) {
    if (action === "next-global-step") {
      this.setState({ onboardingStep: this.state.onboardingStep + 1 });
      return;
    }

    if (action === "dismiss-global") {
      this.updateOnboarding({ seenGlobalTip: true });
      return;
    }

    if (action === "skip-all") {
      this.updateOnboarding({
        seenGlobalTip: true,
        skipAll: true,
        modules: {
          temp: true,
          persona: true,
          training: true
        }
      });
      return;
    }

    if (action === "next-step") {
      this.setState({ onboardingStep: this.state.onboardingStep + 1 });
      return;
    }

    if (action === "finish-module") {
      const page = this.state.onboardingActivePage;
      if (!onboardingModules[page]) return;
      this.updateOnboarding({
        modules: {
          ...this.state.onboarding.modules,
          [page]: true
        }
      });
    }
  }

  resetOnboarding() {
    this.setState({
      onboarding: createDefaultOnboardingState(),
      onboardingStep: 0,
      onboardingActivePage: "",
      onboardingMessage: "已重置，新手攻略会在你第一次进入各功能时再次出现。"
    });
    writeJson(ONBOARDING_KEY, createDefaultOnboardingState());
  }

  deleteHistoryRecord(source, id) {
    const config = getHistoryConfig(source);
    if (!config || !id) return;
    const current = config.get(this.state);
    const next = current.filter((item) => String(item.id) !== String(id));
    writeJson(config.storageKey, next);
    const recordKey = makeExpandedRecordKey(source, id);
    this.setState({
      ...config.set(this.state, next),
      records: {
        ...this.state.records,
        expandedRecordIds: (this.state.records.expandedRecordIds || []).filter((item) => item !== recordKey)
      }
    });
  }

  toggleHistoryRecord(source, id) {
    if (!source || !id) return;
    const recordKey = makeExpandedRecordKey(source, id);
    const expandedRecordIds = this.state.records.expandedRecordIds || [];
    const isExpanded = expandedRecordIds.includes(recordKey);
    this.setState({
      records: {
        ...this.state.records,
        expandedRecordIds: isExpanded
          ? expandedRecordIds.filter((item) => item !== recordKey)
          : [...expandedRecordIds, recordKey]
      }
    });
  }

  clearHistorySource(source) {
    const config = getHistoryConfig(source);
    if (!config) return;
    writeJson(config.storageKey, []);
    this.setState({
      ...config.set(this.state, []),
      records: {
        ...this.state.records,
        expandedRecordIds: (this.state.records.expandedRecordIds || []).filter(
          (item) => !item.startsWith(`${source}:`)
        )
      }
    });
  }

  updateOnboarding(partial) {
    const next = normalizeOnboardingState({
      ...this.state.onboarding,
      ...partial,
      modules: {
        ...this.state.onboarding.modules,
        ...(partial.modules || {})
      }
    });
    writeJson(ONBOARDING_KEY, next);
    this.setState({
      onboarding: next,
      onboardingActivePage: "",
      onboardingStep: 0,
      onboardingMessage: ""
    });
  }

  updateProxyPersona(partial) {
    this.setState({
      proxyPersona: {
        ...this.state.proxyPersona,
        ...partial
      }
    });
  }

  setDistillInputType(type) {
    if (!type) return;
    this.updateProxyPersona({
      upload: {
        ...this.state.proxyPersona.upload,
        distillInputType: type
      },
      message: ""
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
    return updateTrainingSetup(this, parts, value, render);
  }

  toggleTrainingGoal(goal) {
    return toggleTrainingGoal(this, goal);
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

  async createPersonaFromTest() {
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

  finishProxyConversation() {
    return finishProxyConversation(this);
  }

  clearProxyConversation() {
    return clearProxyConversation(this);
  }

  async handleTempReply({ inputAsIntent = false } = {}) {
    return handleTempReply(this, { inputAsIntent });
  }

  finishTempConversation() {
    return finishTempConversation(this);
  }

  clearTempConversation() {
    return clearTempConversation(this);
  }

  async generateTempScenario() {
    return generateTempScenario(this);
  }

  async generateRandomTrainingScenario() {
    return generateRandomTrainingScenario(this);
  }

  async generatePresetTrainingScenario() {
    return generatePresetTrainingScenario(this);
  }

  applyGeneratedTrainingScenario(scenario, scenarioMessage, scenarioStatus = "done", scenarioRequestId = "") {
    return applyGeneratedTrainingScenario(this, scenario, scenarioMessage, scenarioStatus, scenarioRequestId);
  }

  async startTrainingGame() {
    return startTrainingGame(this);
  }

  resetTrainingGame() {
    return resetTrainingGame(this);
  }

  async finishTrainingGame() {
    return finishTrainingGame(this);
  }

  clearTrainingConversation() {
    return clearTrainingConversation(this);
  }

  async handleTrainingSubmit() {
    return handleTrainingSubmit(this);
  }

  async submitTrainingGame(options = {}) {
    return submitTrainingGame(this, options);
  }

  render() {
    this.syncOnboardingForPage();
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
          ${this.state.onboardingMessage ? `<p class="onboarding-reset-toast">${this.state.onboardingMessage}</p>` : ""}
          ${this.getOnboardingMarkup()}
        </div>
      </div>
    `;
    this.scrollChatAreasToBottom();
    this.positionOnboardingCoach();
  }

  syncOnboardingForPage() {
    const onboarding = this.state.onboarding;
    if (!onboarding || onboarding.skipAll) {
      this.state.onboardingActivePage = "";
      this.state.onboardingStep = 0;
      return;
    }

    if (!onboarding.seenGlobalTip) {
      this.state.onboardingActivePage = "";
      return;
    }

    const page = this.state.page;
    if (!onboardingModules[page] || onboarding.modules[page]) {
      this.state.onboardingActivePage = "";
      this.state.onboardingStep = 0;
      return;
    }

    if (this.state.onboardingActivePage !== page) {
      this.state.onboardingActivePage = page;
      this.state.onboardingStep = 0;
    }
  }

  getOnboardingMarkup() {
    const onboarding = this.state.onboarding;
    if (!onboarding?.seenGlobalTip && !onboarding?.skipAll) return OnboardingGlobalTip(this.state.onboardingStep);
    if (!this.state.onboardingActivePage) return "";
    return OnboardingCoach({
      page: this.state.onboardingActivePage,
      step: this.state.onboardingStep
    });
  }

  positionOnboardingCoach() {
    window.requestAnimationFrame?.(() => {
      const overlay = this.root.querySelector("[data-onboarding-overlay]");
      if (!overlay) return;
      const targetKey = overlay.dataset.onboardingTarget;
      const target = targetKey ? this.findOnboardingTarget(targetKey) : null;
      if (!target) {
        overlay.classList.add("no-target");
        return;
      }
      target.scrollIntoView?.({ block: "center", inline: "nearest", behavior: "smooth" });
      window.requestAnimationFrame?.(() => {
        const visibleTarget = this.findOnboardingTarget(targetKey) || target;
        if (!isVisibleTourTarget(visibleTarget)) {
          overlay.classList.add("no-target");
          return;
        }
        const rect = visibleTarget.getBoundingClientRect();
        overlay.classList.remove("no-target");
        overlay.style.setProperty("--tour-top", `${Math.max(8, rect.top - 8)}px`);
        overlay.style.setProperty("--tour-left", `${Math.max(8, rect.left - 8)}px`);
        overlay.style.setProperty("--tour-width", `${Math.max(48, rect.width + 16)}px`);
        overlay.style.setProperty("--tour-height", `${Math.max(48, rect.height + 16)}px`);
        overlay.classList.toggle("card-above", rect.top > window.innerHeight * 0.55);
      });
    });
  }

  findOnboardingTarget(targetKey) {
    const candidates = Array.from(this.root.querySelectorAll(`[data-tour="${targetKey}"]`)).filter(isRenderableTourTarget);
    if (!candidates.length) return null;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    return candidates
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const priority = Number(element.dataset.tourPriority || 0);
        const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
        const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
        const visibleArea = visibleWidth * visibleHeight;
        const distanceFromCenter =
          Math.abs(rect.left + rect.width / 2 - viewportWidth / 2) +
          Math.abs(rect.top + rect.height / 2 - viewportHeight / 2);
        return { element, priority, visibleArea, distanceFromCenter };
      })
      .sort((a, b) => b.priority - a.priority || b.visibleArea - a.visibleArea || a.distanceFromCenter - b.distanceFromCenter)[0].element;
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
      distillInputType: "text",
      targetSpeaker: "我",
      sourceType: "chat",
      relationship: "谈了 3 个月的男友",
      background: "他最近经常不回消息，临时改约后说我太敏感。",
      chatText: "我不是想吵架，我只是希望你尊重之前说好的约定。你先别把问题说成我太敏感。",
      normalizedTrainingText: "",
      uploadedFileName: ""
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
      background: "",
      goal: "",
      mode: "像我本人",
      strength: "中"
    },
    replySettingsOpen: false,
    chatTurns: readPersonaChatTurns(),
    chatHistories: readHistoryWithStableIds(PERSONA_CHAT_HISTORY_KEY, "persona"),
    generationRequestId: "",
    replyResult: null,
    message: ""
  };
}

function readPersonaChatTurns() {
  const rawTurns = readJson(PERSONA_CHAT_KEY, []);
  const turns = rawTurns
    .map((turn) => {
      const role = turn.role === "user" ? "opponent" : turn.role;
      return normalizeMessage({ ...turn, role });
    })
    .filter((turn) => ["opponent", "assistant"].includes(turn.role))
    .filter((turn) => getMessageContent(turn).trim())
    .filter((turn) => !isLeakedPersonaConfigTurn(turn));
  if (turns.length !== rawTurns.length) writeJson(PERSONA_CHAT_KEY, turns);
  return turns;
}

function isLeakedPersonaConfigTurn(turn) {
  const text = getMessageContent(turn);
  return turn.role === "opponent" && (text.includes("\n") || /我想表达[:：]/.test(text));
}

function getHistoryConfig(source) {
  const configs = {
    temp: {
      storageKey: TEMP_CHAT_HISTORY_KEY,
      get: (state) => state.temp.chatHistories || [],
      set: (state, chatHistories) => ({
        temp: {
          ...state.temp,
          chatHistories
        }
      })
    },
    persona: {
      storageKey: PERSONA_CHAT_HISTORY_KEY,
      get: (state) => state.proxyPersona.chatHistories || [],
      set: (state, chatHistories) => ({
        proxyPersona: {
          ...state.proxyPersona,
          chatHistories
        }
      })
    },
    training: {
      storageKey: TRAINING_CHAT_HISTORY_KEY,
      get: (state) => state.training.chatHistories || [],
      set: (state, chatHistories) => ({
        training: {
          ...state.training,
          chatHistories
        }
      })
    }
  };
  return configs[source] || null;
}

function readHistoryWithStableIds(storageKey, source) {
  const histories = readJson(storageKey, []);
  let changed = false;
  const next = histories.map((item, index) => {
    if (item?.id) return item;
    changed = true;
    return {
      ...item,
      id: `${source}-${item?.createdAt || index}`
    };
  });
  if (changed) writeJson(storageKey, next);
  return next;
}

function makeExpandedRecordKey(source, id) {
  return `${source}:${id}`;
}

function isAllowedDistillFile(file, format) {
  const name = file.name.toLowerCase();
  if (format === "text") return name.endsWith(".txt") || name.endsWith(".md") || file.type === "text/plain" || file.type === "text/markdown";
  if (format === "csv") return name.endsWith(".csv") || file.type === "text/csv";
  if (format === "json") return name.endsWith(".json") || file.type === "application/json";
  return false;
}

function distillFileError(format) {
  if (format === "csv") return "请上传 .csv 文件。";
  if (format === "json") return "请上传 .json 文件。";
  return "请上传 .txt 或 .md 文本文件。";
}

function parseDistillFile(rawText, format, fileName = "") {
  if (format === "csv") {
    const normalizedTrainingText = csvToDistillText(rawText);
    return {
      text: normalizedTrainingText,
      normalizedTrainingText,
      message: `已解析 CSV：${fileName || "未命名文件"}`
    };
  }
  if (format === "json") {
    const normalizedTrainingText = jsonToDistillText(rawText);
    return {
      text: normalizedTrainingText,
      normalizedTrainingText,
      message: `已解析 JSON：${fileName || "未命名文件"}`
    };
  }
  return {
    text: rawText,
    normalizedTrainingText: rawText,
    message: `已读取 ${fileName?.toLowerCase().endsWith(".md") ? "md" : "txt"} 文件内容。`
  };
}

function csvToDistillText(rawText) {
  const rows = parseCsvRows(rawText);
  if (rows.length < 2) return rawText;
  const headers = rows[0].map((item) => String(item || "").trim());
  const records = rows.slice(1).filter((row) => row.some((cell) => String(cell || "").trim()));
  const pick = (row, names) => {
    const index = headers.findIndex((header) => names.includes(header));
    return index >= 0 ? String(row[index] || "").trim() : "";
  };
  return records
    .map((row, index) => {
      const scene = pick(row, ["scene", "场景"]);
      const opponent = pick(row, ["opponent", "对方说"]);
      const reply = pick(row, ["reply", "回复"]);
      const intensity = pick(row, ["intensity", "强度"]);
      const strategy = pick(row, ["strategy", "策略"]);
      return [
        `样本 ${index + 1}`,
        scene ? `场景：${scene}` : "",
        opponent ? `对方：${opponent}` : "",
        reply ? `我：${reply}` : "",
        intensity ? `强度：${intensity}` : "",
        strategy ? `策略：${strategy}` : ""
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function parseCsvRows(rawText) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const text = String(rawText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" && !inQuotes) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

function jsonToDistillText(rawText) {
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    return rawText;
  }
  const examples = Array.isArray(data.examples) ? data.examples : [];
  const header = [
    data.personaName ? `人格名称：${data.personaName}` : "",
    Array.isArray(data.styleTags) && data.styleTags.length ? `风格标签：${data.styleTags.join("、")}` : ""
  ].filter(Boolean);
  const body = examples.map((item, index) =>
    [
      `样本 ${index + 1}`,
      item.scene ? `场景：${item.scene}` : "",
      item.opponent ? `对方：${item.opponent}` : "",
      item.reply ? `我：${item.reply}` : "",
      item.strategy ? `策略：${item.strategy}` : ""
    ]
      .filter(Boolean)
      .join("\n")
  );
  return [...header, ...body].filter(Boolean).join("\n\n") || rawText;
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

function createDefaultOnboardingState() {
  return {
    seenGlobalTip: false,
    skipAll: false,
    modules: {
      temp: false,
      persona: false,
      training: false
    }
  };
}

function normalizeOnboardingState(value) {
  return {
    seenGlobalTip: Boolean(value?.seenGlobalTip),
    skipAll: Boolean(value?.skipAll),
    modules: {
      temp: Boolean(value?.modules?.temp),
      persona: Boolean(value?.modules?.persona),
      training: Boolean(value?.modules?.training)
    }
  };
}

function createOnboardingState() {
  return normalizeOnboardingState(readJson(ONBOARDING_KEY, createDefaultOnboardingState()));
}

function isRenderableTourTarget(element) {
  if (!element) return false;
  const style = window.getComputedStyle?.(element);
  if (style?.display === "none" || style?.visibility === "hidden" || style?.opacity === "0") return false;
  const rect = element.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return false;
  return true;
}

function isVisibleTourTarget(element) {
  if (!isRenderableTourTarget(element)) return false;
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  return rect.bottom > 0 && rect.right > 0 && rect.top < viewportHeight && rect.left < viewportWidth;
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
