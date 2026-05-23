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
  buildPersonaChatTurn,
  buildTempChatTurn,
  buildTrainingChatTurn,
  initialProxyPersonaState,
  initialPersonaSession,
  initialTempSession,
  initialTrainingSession,
  makeOpeningOpponent,
  relationProfiles
} from "./data/mockData.js";

const pageTitles = {
  home: "滴滴代吵",
  temp: "临时代吵",
  persona: "专属嘴替",
  personaDistill: "蒸馏自己",
  personaTest: "嘴替测试",
  training: "吵架训练场",
  records: "记录",
  profile: "我的"
};

export default class App {
  constructor(root) {
    this.root = root;
    this.state = {
      page: pageFromHash() || "home",
      profiles: structuredClone(relationProfiles),
      proxyPersona: createProxyPersonaState(),
      activePersona: initialPersonaSession.who,
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
    if (this.state.page === "persona") {
      return PersonaPage(this.state.proxyPersona);
    }
    if (this.state.page === "personaDistill") {
      return PersonaDistillPage(this.state.proxyPersona);
    }
    if (this.state.page === "personaTest") {
      return PersonaTestPage(this.state.proxyPersona);
    }
    if (this.state.page === "training") return TrainingPage(this.state.training);
    if (this.state.page === "records") {
      return RecordsPage({
        temp: this.state.temp,
        persona: this.state.persona,
        training: this.state.training
      });
    }
    if (this.state.page === "profile") {
      return ProfilePage({ activePersona: this.state.activePersona, profiles: this.state.profiles });
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

    const tabTarget = event.target.closest("[data-persona-tab]");
    if (tabTarget) {
      this.setState({
        proxyPersona: { ...this.state.proxyPersona, activeTab: tabTarget.dataset.personaTab }
      });
      return;
    }

    const testTarget = event.target.closest("[data-test-answer]");
    if (testTarget) {
      this.setState({
        proxyPersona: {
          ...this.state.proxyPersona,
          testAnswers: {
            ...this.state.proxyPersona.testAnswers,
            [testTarget.dataset.questionId]: testTarget.dataset.testAnswer
          }
        }
      });
      return;
    }

    const profileTarget = event.target.closest("[data-load-profile]");
    if (profileTarget) {
      const profile = this.state.profiles.find((item) => item.id === profileTarget.dataset.loadProfile);
      if (!profile) return;
      this.setState({
        activePersona: profile.name,
        persona: {
          ...this.state.persona,
          profileId: profile.id,
          who: profile.name,
          relation: profile.relation,
          commonConflict: profile.commonConflict,
          tactics: profile.tactics,
          style: profile.style,
          boundary: profile.boundary,
          expectation: profile.expectation
        }
      });
      return;
    }

    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) return;

    const action = actionTarget.dataset.action;

    if (action === "upload-chat-persona") {
      await this.createPersonaFromChat();
    }

    if (action === "generate-distill-persona") {
      await this.generateDistillPersona();
    }

    if (action === "save-distill-persona") {
      this.saveDistillPersona();
    }

    if (action === "reset-distill-result") {
      this.setState({
        proxyPersona: {
          ...this.state.proxyPersona,
          distillResult: null,
          distillStatus: "idle",
          message: ""
        }
      });
    }

    if (action === "submit-persona-test") {
      await this.createPersonaFromTest();
    }

    if (action === "generate-proxy-reply") {
      await this.generateProxyReply();
    }

    if (action === "start-temp-chat") {
      this.setState({ temp: { ...this.state.temp, step: "chat", input: this.state.temp.latest || "" } });
    }

    if (action === "edit-temp-setup") {
      this.setState({ temp: { ...this.state.temp, step: "setup" } });
    }

    if (action === "temp-reply") {
      const text = this.state.temp.input.trim();
      if (!text) return;
      let turn;
      try {
        const result = await postJson("/api/temp-argue", {
          scene: this.state.temp.context,
          opponent: text,
          goal: this.state.temp.goal,
          persona: this.state.temp.tone,
          intensity: this.state.temp.tone
        });
        turn = {
          id: Date.now(),
          opponent: text,
          analysis: result.opponentTactic,
          mainline: `${result.strategy} ${result.offTopicWarning || ""}`,
          replies: [
            { label: "稳妥版", text: result.recommendedReply },
            { label: "强硬版", text: result.strongerReply },
            { label: "嘴替版/阴阳版", text: result.sarcasticReply || result.politeFinalReply }
          ]
        };
      } catch {
        turn = buildTempChatTurn(this.state.temp, text);
      }
      this.setState({
        temp: { ...this.state.temp, latest: text, input: "", rounds: [...this.state.temp.rounds, turn] }
      });
    }

    if (action === "save-persona-profile") {
      const profile = this.buildProfileFromPersona();
      const profiles = this.state.profiles.some((item) => item.id === profile.id)
        ? this.state.profiles.map((item) => (item.id === profile.id ? profile : item))
        : [profile, ...this.state.profiles];
      this.setState({ profiles, activePersona: profile.name, persona: { ...this.state.persona, profileId: profile.id } });
    }

    if (action === "start-persona-chat") {
      this.setState({
        activePersona: this.state.persona.who,
        persona: { ...this.state.persona, step: "chat", input: this.state.persona.latest || "" }
      });
    }

    if (action === "edit-persona-setup") {
      this.setState({ persona: { ...this.state.persona, step: "setup" } });
    }

    if (action === "persona-reply") {
      const text = this.state.persona.input.trim();
      if (!text) return;
      const turn = buildPersonaChatTurn(this.state.persona, text);
      this.setState({
        persona: { ...this.state.persona, latest: text, input: "", rounds: [...this.state.persona.rounds, turn] }
      });
    }

    if (action === "start-training-chat") {
      const opponent = makeOpeningOpponent(this.state.training.scene);
      this.setState({ training: { ...this.state.training, step: "chat", opponent } });
    }

    if (action === "edit-training-setup") {
      this.setState({ training: { ...this.state.training, step: "setup" } });
    }

    if (action === "training-submit") {
      const reply = this.state.training.input.trim();
      if (!reply) return;
      let feedback;
      try {
        const result = await postJson("/api/training/score", {
          scenario: this.state.training.scene,
          difficulty: this.state.training.difficulty,
          opponentType: "嘴硬型",
          opponentMessage: this.state.training.opponent,
          userReply: reply,
          round: this.state.training.round
        });
        feedback = {
          id: Date.now(),
          userReply: reply,
          score: result.scores?.winRate || 0,
          strengths: result.analysis,
          problems: result.suggestion,
          optimized: result.betterReply,
          nextOpponent: result.nextOpponentMessage
        };
      } catch {
        feedback = buildTrainingChatTurn(this.state.training, reply);
      }
      this.setState({
        training: {
          ...this.state.training,
          input: "",
          round: this.state.training.round + 1,
          opponent: feedback.nextOpponent,
          feedbacks: [...this.state.training.feedbacks, feedback]
        }
      });
    }
  }

  handleInput(event) {
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
    const fileInput = event.target.closest("[data-file-input='persona-distill']");
    if (!fileInput) return;
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt") && file.type !== "text/plain") {
      this.setState({
        proxyPersona: {
          ...this.state.proxyPersona,
          message: "目前只支持 txt 文本文件。"
        }
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.setState({
        proxyPersona: {
          ...this.state.proxyPersona,
          upload: {
            ...this.state.proxyPersona.upload,
            chatText: String(reader.result || "")
          },
          message: "已读取 txt 文件内容。"
        }
      });
    };
    reader.readAsText(file, "utf-8");
  }

  navigate(page) {
    const hash = hashFromPage(page);
    if (hash && window.location.hash !== hash) {
      window.location.hash = hash;
    }
    this.setState({ page });
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

  async createPersonaFromChat() {
    const { userId, upload } = this.state.proxyPersona;
    try {
      const result = await postJson("/api/persona/analyze-chat", {
        chatHistory: upload.chatText,
        relationship: upload.relationship,
        background: upload.background,
        userGoal: upload.userGoal || ""
      });
      this.addGeneratedPersona(
        { ...result.personaProfile, id: Date.now(), sourceType: "chat_upload" },
        "已生成聊天蒸馏嘴替档案"
      );
    } catch (error) {
      this.addGeneratedPersona(
        makeLocalPersona("chat_upload", upload.relationship),
        `${error.message}。先用本地示例档案预览，配置 OPENAI_API_KEY 后会生成 AI 档案。`
      );
    }
  }

  async generateDistillPersona() {
    const { upload } = this.state.proxyPersona;
    this.setState({
      proxyPersona: {
        ...this.state.proxyPersona,
        distillStatus: "loading",
        message: "",
        distillResult: null
      }
    });

    try {
      const result = await postJson("/api/persona/analyze-chat", {
        chatHistory: upload.chatText,
        relationship: upload.relationship,
        background: upload.background,
        userGoal: upload.userGoal || ""
      });
      this.setState({
        proxyPersona: {
          ...this.state.proxyPersona,
          distillStatus: "done",
          distillResult: makeDistillResult(result.personaProfile, upload),
          message: "蒸馏完成，可以保存档案。"
        }
      });
    } catch (error) {
      this.setState({
        proxyPersona: {
          ...this.state.proxyPersona,
          distillStatus: "done",
          distillResult: makeDistillResult(makeLocalPersona("chat_upload", upload.relationship), upload),
          message: `${error.message}。先用本地示例档案预览，配置 OPENAI_API_KEY 后会生成 AI 档案。`
        }
      });
    }
  }

  saveDistillPersona() {
    const result = this.state.proxyPersona.distillResult;
    if (!result) return;
    this.addGeneratedPersona(flattenDistillPersona(result), "已保存蒸馏嘴替档案");
  }

  async createPersonaFromTest() {
    const { userId, testAnswers } = this.state.proxyPersona;
    const answers = Object.entries(testAnswers).map(([questionId, answer]) => ({
      questionId: Number(questionId),
      answer
    }));
    try {
      const result = await postJson("/api/persona/test-result", { userId, answers });
      this.addGeneratedPersona(
        { ...result.personaProfile, id: Date.now(), sourceType: "test" },
        "已生成测试嘴替档案"
      );
    } catch (error) {
      this.addGeneratedPersona(
        makeLocalPersona("test", "测试生成嘴替"),
        `${error.message}。先用本地示例档案预览，配置 OPENAI_API_KEY 后会生成 AI 档案。`
      );
    }
  }

  addGeneratedPersona(persona, message) {
    this.setState({
      page: "persona",
      activePersona: persona.name,
      proxyPersona: {
        ...this.state.proxyPersona,
        personas: [persona, ...this.state.proxyPersona.personas],
        selectedPersonaId: String(persona.id),
        distillResult: null,
        distillStatus: "idle",
        message
      }
    });
    if (window.location.hash !== "#/persona") window.location.hash = "#/persona";
  }

  async generateProxyReply() {
    const state = this.state.proxyPersona;
    if (!state.selectedPersonaId) {
      this.setState({ proxyPersona: { ...state, message: "请先生成或选择一个嘴替档案" } });
      return;
    }
    const styleProfile = state.personas.find((persona) => String(persona.id) === String(state.selectedPersonaId));
    try {
      const result = await postJson("/api/persona-reply", {
        chatHistory: state.upload.chatText,
        latestOpponentMessage: state.replyForm.opponentMessage,
        currentState: state.replyForm.background,
        realThought: "",
        goal: state.replyForm.goal,
        styleProfile
      });
      this.setState({
        proxyPersona: {
          ...this.state.proxyPersona,
          replyResult: {
            reply: result.myStyleReply,
            strategy: result.styleAnalysis,
            tone: styleProfile?.tone || ""
          },
          message: "回应已生成"
        }
      });
    } catch (error) {
      this.setState({
        proxyPersona: {
          ...this.state.proxyPersona,
          replyResult: makeLocalReply(state.replyForm, styleProfile),
          message: `${error.message}。先用本地示例回应预览。`
        }
      });
    }
  }

  buildProfileFromPersona() {
    const session = this.state.persona;
    return {
      id: session.profileId || `profile-${Date.now()}`,
      name: session.who || "新的关系对象",
      relation: session.relation || "",
      commonConflict: session.commonConflict || "",
      tactics: session.tactics || "",
      style: session.style || "",
      boundary: session.boundary || "",
      expectation: session.expectation || ""
    };
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
            <button class="mini-sticker danger" data-page="records">录</button>
          </header>
          <main class="page-scroll">${this.getPage()}</main>
          ${BottomNav(page)}
        </div>
      </div>
    `;
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
      else if (data.error) message = data.error;
    } catch {
      // Keep the status-based message.
    }
    throw new Error(message);
  }
  return response.json();
}

function createProxyPersonaState() {
  return {
    ...structuredClone(initialProxyPersonaState),
    activeTab: "upload",
    upload: {
      relationship: "谈了 3 个月的男友",
      background: "他最近经常不回消息，临时改约后说我太敏感。",
      chatText: "我不是想吵架，我只是希望你尊重之前说好的约定。你先别把问题说成我太敏感。"
    },
    testAnswers: {
      1: "A",
      2: "B",
      3: "A",
      4: "C",
      5: "B"
    },
    personas: [],
    selectedPersonaId: "",
    distillStatus: "idle",
    distillResult: null,
    replyForm: {
      opponentMessage: "你怎么又开始了？这点小事也要上纲上线？",
      background: "昨天约好一起吃饭，他临时说要和朋友出去。",
      goal: "反击对方逻辑",
      strength: "中等强度"
    },
    replyResult: null,
    message: ""
  };
}

function makeDistillResult(personaProfile, upload) {
  const profile = personaProfile.styleProfile || personaProfile;
  return {
    id: `distill-${Date.now()}`,
    createdAt: new Date().toISOString(),
    sourceType: "chat_upload",
    profileName: personaProfile.profileName || personaProfile.name || "我的蒸馏嘴替",
    relationship: upload.relationship || "",
    background: upload.background || "",
    styleProfile: {
      tone: profile.tone || "温柔但有边界",
      emotionLevel: Number(profile.emotionLevel || 3),
      logicStyle: profile.logicStyle || "先说事实，再讲影响，最后落到诉求。",
      commonPhrases: profile.commonPhrases || [],
      avoidWords: profile.avoidWords || [],
      replyStrategy: profile.replyStrategy || "不自证，不跑题，守住事实和边界。",
      profileSummary: profile.profileSummary || "根据聊天记录生成的嘴替表达风格。"
    }
  };
}

function flattenDistillPersona(result) {
  const profile = result.styleProfile || {};
  return {
    id: result.id,
    createdAt: result.createdAt,
    sourceType: result.sourceType,
    profileName: result.profileName,
    name: result.profileName,
    relationship: result.relationship,
    background: result.background,
    styleProfile: profile,
    tone: profile.tone,
    emotionLevel: profile.emotionLevel,
    logicStyle: profile.logicStyle,
    commonPhrases: profile.commonPhrases,
    avoidWords: profile.avoidWords,
    replyStrategy: profile.replyStrategy,
    profileSummary: profile.profileSummary
  };
}

function makeLocalPersona(sourceType, nameSeed) {
  return {
    id: Date.now(),
    name: sourceType === "test" ? "测试生成嘴替" : `${nameSeed || "我的"}嘴替`,
    sourceType,
    tone: "温柔但有边界",
    emotionLevel: 3,
    logicStyle: "先抓住事实，再说明影响，最后给出明确诉求。",
    commonPhrases: ["我先把重点说清楚", "这不是情绪问题", "请你正面回应"],
    avoidWords: ["脏话", "人身攻击", "威胁", "翻旧账"],
    replyStrategy: "不自证，不跑题，把对方的话术压回事实和责任。",
    profileSummary: "本地预览档案：用于没有配置 API Key 时先体验页面流程。"
  };
}

function makeLocalReply(replyForm, styleProfile) {
  return {
    reply: `我先把重点说清楚：你刚才这句话是在把问题转成我的情绪。现在要谈的是${replyForm.goal || "这件事怎么处理"}，不是我有没有资格不舒服。请你正面回应。`,
    strategy: "本地预览：识别贴标签/转移话题，拉回事实、影响、诉求和边界。",
    tone: styleProfile?.tone || "温柔但有边界"
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
    records: "records",
    profile: "profile",
    home: "home"
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
    home: "#/home"
  };
  return map[page] || "";
}
