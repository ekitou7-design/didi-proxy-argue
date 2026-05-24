import BottomNav from "./components/BottomNav.js";
import HomePage from "./pages/HomePage.js";
import TempArguePage from "./pages/TempArguePage.js";
import PersonaPage from "./pages/PersonaPage.js";
import PersonaDistillPage from "./pages/PersonaDistillPage.js";
import PersonaTestPage from "./pages/PersonaTestPage.js";
import TrainingPage from "./pages/TrainingPage.js";
import ProfilePage from "./pages/ProfilePage.js";
import RecordsPage from "./pages/RecordsPage.js";
import {
  dedicatedPersonaPersonalities,
  dedicatedPersonaPersonalityWeights,
  dedicatedPersonaQuizQuestions
} from "./data/njutiQuizData.js";
import {
  buildPersonaChatTurn,
  buildTempChatTurn,
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
        this.state.proxyPersona = { ...this.state.proxyPersona, createSheetOpen: false };
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
    if (action === "start-training-chat") {
      const scenario = this.state.training.generatedScenario;
      const opponent = scenario?.openingMessage || this.state.training.opponent || makeOpeningOpponent(this.state.training.scene);
      this.setState({
        training: {
          ...this.state.training,
          step: "chat",
          opponent,
          round: 1,
          feedbacks: []
        }
      });
      return;
    }
    if (action === "edit-training-setup") {
      this.setState({ training: { ...this.state.training, step: "setup" } });
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

  useTempScenario(index) {
    const preset = tempScenarioPresets[Number(index)];
    if (!preset) return;
    this.setState({
      temp: {
        ...this.state.temp,
        ...preset,
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
      const result = await postJson("/api/persona/extract", {
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
      const result = await postJson("/api/persona/reply", {
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

  async handleTempReply() {
    const temp = this.state.temp;
    if (temp.isSubmitting) return;

    const text = temp.input.trim() || temp.latest.trim();
    if (!text) return;

    this.setState({
      temp: {
        ...temp,
        input: "",
        isSubmitting: true
      }
    });

    let turn;
    try {
      const result = await postJson("/api/temp-argue", {
        scene: temp.context,
        opponent: text,
        goal: temp.goal,
        persona: temp.tone,
        intensity: temp.tone
      });
      turn = {
        id: Date.now(),
        opponent: text,
        analysis: result.opponentTactic,
        mainline: `${result.strategy} ${result.offTopicWarning || ""}`,
        replies: uniqueReplyOptions([
          { label: "稳妥版", text: result.recommendedReply },
          { label: "强硬版", text: result.strongerReply },
          { label: "嘴替版/阴阳版", text: result.sarcasticReply || result.politeFinalReply }
        ])
      };
    } catch {
      turn = buildTempChatTurn(temp, text);
      turn.replies = uniqueReplyOptions(turn.replies);
    }
    this.setState({
      temp: {
        ...this.state.temp,
        latest: text,
        input: "",
        isSubmitting: false,
        rounds: [...temp.rounds, turn]
      }
    });
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
      const result = await postJson("/api/training/scenario/random", training.randomScenarioForm || {});
      const scenario = result.scenario;
      if (!scenario?.openingMessage) throw new Error("场景生成结果为空");

      this.setState({
        training: {
          ...this.state.training,
          scene: scenario.title || scenario.background,
          difficulty: scenario.difficulty || this.state.training.difficulty,
          opponent: scenario.openingMessage,
          generatedScenario: scenario,
          scenarioStatus: "done",
          scenarioMessage: "场景已生成，可以开始这一局。"
        }
      });
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

  async handleTrainingSubmit() {
    const training = this.state.training;
    if (training.isSubmitting) return;

    {
      const reply = training.input.trim();
      if (!reply) {
        this.setState({
          training: {
            ...training,
            scenarioMessage: "请先输入你的回复。"
          }
        });
        return;
      }

      const generatedScenario = training.generatedScenario;
      const payload = {
        scenario: generatedScenario?.title || generatedScenario?.background || training.scene,
        difficulty: generatedScenario?.difficulty || training.difficulty,
        opponentType: generatedScenario?.opponentProfile?.type || "嘴硬型",
        opponentMessage: training.opponent || generatedScenario?.openingMessage || makeOpeningOpponent(training.scene),
        userReply: reply,
        round: training.round,
        mainline: generatedScenario?.mainline,
        traps: generatedScenario?.traps,
        trainingFocus: generatedScenario?.trainingFocus
      };
      console.log("training score payload", payload);

      this.setState({
        training: {
          ...training,
          isSubmitting: true,
          scenarioMessage: "正在分析你的回复..."
        }
      });

      try {
        const result = await postJson("/api/training/score", payload);
        console.log("training score response", result);
        const feedback = {
          id: Date.now(),
          userReply: reply,
          scores: result.scores || {},
          overallScore: result.overallScore ?? result.scores?.winRate ?? 0,
          advantages: result.advantages || result.analysis || "",
          weaknesses: result.weaknesses || result.suggestion || "",
          suggestion: result.suggestion || "",
          betterReply: result.betterReply || "",
          nextOpponent: result.nextOpponentMessage || "",
          isOffTopic: Boolean(result.isOffTopic)
        };
        this.setState({
          training: {
            ...this.state.training,
            step: "chat",
            input: "",
            isSubmitting: false,
            scenarioMessage: "",
            round: training.round + 1,
            opponent: feedback.nextOpponent || payload.opponentMessage,
            feedbacks: [...training.feedbacks, feedback]
          }
        });
      } catch (error) {
        console.error("training score failed", error);
        this.setState({
          training: {
            ...this.state.training,
            input: reply,
            isSubmitting: false,
            scenarioMessage: "评分失败，请稍后重试。"
          }
        });
      }
      return;
    }
  }

  render() {
    const { page } = this.state;
    this.root.innerHTML = `
      <div class="app-shell">
        <div class="phone-frame">
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
          <main class="page-scroll ${["temp", "persona", "training"].includes(page) ? "realtime-scroll" : ""} ${page === "persona" ? "persona-scroll" : ""}">${this.getPage()}</main>
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

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    let message = `请求失败：${response.status}`;
    try {
      const data = await response.json();
      if (data.error === "Missing OPENAI_API_KEY") message = "还没有配置 OPENAI_API_KEY";
      else if (data.error?.message) message = data.error.message;
      else if (data.error) message = data.detail ? `${data.error}：${data.detail}` : data.error;
    } catch {
      // Keep the status-based message.
    }
    throw new Error(message);
  }
  return response.json();
}

async function sendToFeishu({ webhookUrl, text }) {
  return postJson("/api/feishu/send", { webhookUrl, text });
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

function splitReplyMessages(text) {
  const value = String(text || "").trim();
  if (!value) return [];
  const pieces = value.match(/[^。！？!?]+[。！？!?]?/g) || [value];
  return pieces.map((piece) => piece.trim()).filter(Boolean);
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

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
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
