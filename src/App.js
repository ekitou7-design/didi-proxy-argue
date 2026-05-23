import BottomNav from "./components/BottomNav.js";
import HomePage from "./pages/HomePage.js";
import TempArguePage from "./pages/TempArguePage.js";
import PersonaPage from "./pages/PersonaPage.js";
import PersonaDistillPage from "./pages/PersonaDistillPage.js";
import PersonaTestPage from "./pages/PersonaTestPage.js";
import TrainingPage from "./pages/TrainingPage.js";
import ProfilePage from "./pages/ProfilePage.js";
import RecordsPage from "./pages/RecordsPage.js";
import { personaTestQuestions } from "./data/njutiQuizData.js";
import {
  buildPersonaChatTurn,
  buildTempChatTurn,
  buildTrainingChatTurn,
  initialPersonaSession,
  initialProxyPersonaState,
  initialTempSession,
  initialTrainingSession,
  makeOpeningOpponent,
  relationProfiles
} from "./data/mockData.js";

const DISTILL_RESULTS_KEY = "persona_distill_results";
const TEST_RESULTS_KEY = "persona_test_results";
const CURRENT_PROFILE_KEY = "current_persona_profile";

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
    if (this.state.page === "persona") return PersonaPage(this.state.proxyPersona);
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
      return ProfilePage({ preferences: this.state.profilePreferences });
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
      const opponent = makeOpeningOpponent(this.state.training.scene);
      this.setState({ training: { ...this.state.training, step: "chat", opponent } });
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
      const result = await postJson("/api/persona/analyze-chat", {
        chatHistory: upload.chatText,
        relationship: upload.relationship,
        background: upload.background,
        userGoal: "生成用户的专属嘴替表达风格"
      });
      this.updateProxyPersona({
        distillStatus: "done",
        distillResult: makeDistillResult(result.personaProfile, upload),
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
        distillResult: null,
        distillStatus: "idle",
        message: "已保存蒸馏嘴替档案，并设为当前嘴替。"
      }
    });
    if (window.location.hash !== "#/persona") window.location.hash = "#/persona";
  }

  createPersonaFromTest() {
    const result = makeTestResult(this.state.proxyPersona.testAnswers);
    const testResults = [result, ...this.state.proxyPersona.testResults];
    writeJson(TEST_RESULTS_KEY, testResults);
    this.setState({
      page: "persona",
      proxyPersona: {
        ...this.state.proxyPersona,
        testResults,
        personas: mergePersonas(this.state.proxyPersona.distillResults, testResults),
        selectedPersonaId: result.id,
        message: "已生成测试结果。"
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
    const styleProfile =
      state.personas.find((persona) => String(persona.id) === String(state.selectedPersonaId)) ||
      state.currentProfile;
    if (!styleProfile) {
      this.updateProxyPersona({ message: "请先生成或选择一个嘴替档案。" });
      return;
    }

    try {
      const result = await postJson("/api/persona-reply", {
        chatHistory: state.upload.chatText,
        latestOpponentMessage: state.replyForm.opponentMessage,
        currentState: state.replyForm.background,
        realThought: "",
        goal: state.replyForm.goal,
        styleProfile
      });
      this.updateProxyPersona({
        replyResult: {
          reply: result.myStyleReply,
          strategy: result.styleAnalysis,
          tone: getProfileTone(styleProfile)
        },
        message: "回应已生成。"
      });
    } catch (error) {
      this.updateProxyPersona({
        replyResult: makeLocalReply(state.replyForm, styleProfile),
        message: `${error.message}。先用本地示例回应预览。`
      });
    }
  }

  async handleTempReply() {
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

  async handleTrainingSubmit() {
    const training = this.state.training;
    if (training.isSubmitting) return;

    const reply = training.input.trim();
    if (!reply) return;

    this.setState({
      training: {
        ...training,
        input: "",
        isSubmitting: true
      }
    });

    let feedback;
    let fallbackFeedback;
    try {
      const result = await postJson("/api/training/score", {
        scenario: training.scene,
        difficulty: training.difficulty,
        opponentType: "嘴硬型",
        opponentMessage: training.opponent,
        userReply: reply,
        round: training.round
      });
      fallbackFeedback = buildTrainingChatTurn(training, reply);
      feedback = {
        id: Date.now(),
        userReply: reply,
        score: result.scores?.winRate || 0,
        strengths: result.analysis || fallbackFeedback.strengths,
        problems: result.suggestion || fallbackFeedback.problems,
        optimized: result.betterReply || fallbackFeedback.optimized,
        nextOpponent: result.nextOpponentMessage || fallbackFeedback.nextOpponent
      };
    } catch {
      feedback = buildTrainingChatTurn(training, reply);
    }
    this.setState({
      training: {
        ...this.state.training,
        input: "",
        isSubmitting: false,
        round: training.round + 1,
        opponent: feedback.nextOpponent,
        feedbacks: [...training.feedbacks, feedback]
      }
    });
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
  const distillResults = readJson(DISTILL_RESULTS_KEY, []).map(normalizeDistillResult);
  const testResults = readJson(TEST_RESULTS_KEY, []).map(normalizeTestResult);
  const currentProfile = readJson(CURRENT_PROFILE_KEY, null);
  const personas = mergePersonas(distillResults, testResults);

  return {
    ...structuredClone(initialProxyPersonaState),
    activeTab: "upload",
    upload: {
      relationship: "谈了 3 个月的男友",
      background: "他最近经常不回消息，临时改约后说我太敏感。",
      chatText: "我不是想吵架，我只是希望你尊重之前说好的约定。你先别把问题说成我太敏感。"
    },
    testAnswers: Object.fromEntries(personaTestQuestions.map((question) => [question.id, ""])),
    distillResults,
    testResults,
    personas,
    selectedPersonaId: currentProfile?.id || personas[0]?.id || "",
    currentProfile,
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
      tone: profile.tone || "冷静但有压迫感",
      emotionLevel: Number(profile.emotionLevel || 3),
      logicStyle: profile.logicStyle || "先指出问题，再反问对方逻辑漏洞，最后给出边界",
      commonPhrases: profile.commonPhrases || ["你先别转移话题", "我现在说的是这件事本身", "这不是我敏感，是你的处理方式有问题"],
      avoidWords: profile.avoidWords || ["脏话", "人身攻击", "过度服软"],
      replyStrategy: profile.replyStrategy || "不跟随对方转移话题，持续围绕核心问题推进",
      profileSummary: profile.profileSummary || "适合生成冷静、清楚、有边界感的个性化回应。"
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
  const pool = [
    { typeName: "冷面判官", nickname: "逻辑处刑台", subtitle: "你不是在吵架，你是在宣判对方逻辑死刑。", tags: ["冷静", "逻辑", "压迫", "证据"] },
    { typeName: "阴阳补刀王", nickname: "笑面小刀", subtitle: "你不一定骂人，但你每句话都像带了小倒刺。", tags: ["阴阳", "反讽", "补刀", "轻刺"] },
    { typeName: "边界封门员", nickname: "人际门禁系统", subtitle: "你不是不好惹，你只是所有越界行为都会被系统拦截。", tags: ["边界", "拒绝", "稳定", "不内耗"] },
    { typeName: "反问审讯官", nickname: "证据席管理员", subtitle: "你不会急着解释，你会先让对方上证据席。", tags: ["反问", "证据", "审讯", "拆招"] },
    { typeName: "主线追杀者", nickname: "跑题终结机", subtitle: "对方每转移一次话题，你就把他拖回案发现场一次。", tags: ["主线", "控场", "追问", "回拉"] },
    { typeName: "双标反杀机", nickname: "规则回旋镖", subtitle: "对方定规则，你负责把规则原样砸回去。", tags: ["双标", "反杀", "规则", "回旋镖"] },
    { typeName: "发疯炮台", nickname: "精神状态领先版", subtitle: "你的精神状态很稳定，稳定地准备开炮。", tags: ["高能", "爆发", "压制", "戏剧感"] },
    { typeName: "体面绝杀师", nickname: "优雅封口器", subtitle: "你不脏嘴，但你一句话能把这段对话钉进棺材里。", tags: ["体面", "收口", "绝杀", "克制"] }
  ];
  const answers = Object.values(testAnswers).filter(Boolean);
  const score = answers.reduce((sum, answer) => sum + answer.charCodeAt(0), 0);
  const base = pool[score % pool.length] || pool[0];
  return normalizeTestResult({
    id: `test-${Date.now()}`,
    createdAt: new Date().toISOString(),
    sourceType: "test",
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
    relationship: result.relationship || "",
    background: result.background || "",
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
  const typeName = result.typeName || result.name || "冷面判官";
  const nickname = result.nickname || "逻辑处刑台";
  const subtitle = result.subtitle || "你不是在吵架，你是在宣判对方逻辑死刑。";
  const tags = result.tags || result.dimensions || ["冷静", "逻辑", "压迫", "证据"];
  return {
    id: String(result.id || `test-${Date.now()}`),
    createdAt: result.createdAt || new Date().toISOString(),
    sourceType: "test",
    typeName,
    nickname,
    subtitle,
    tags,
    styleProfile: {
      tone: typeName,
      emotionLevel: 3,
      logicStyle: nickname,
      commonPhrases: tags,
      avoidWords: ["脏话", "人身攻击"],
      replyStrategy: subtitle,
      profileSummary: subtitle
    }
  };
}

function mergePersonas(distillResults, testResults) {
  return [...distillResults, ...testResults];
}

function getProfileName(profile) {
  return profile.profileName || profile.typeName || profile.name || "我的嘴替";
}

function getProfileTone(profile) {
  return profile.styleProfile?.tone || profile.tone || profile.typeName || "";
}

function makeLocalReply(replyForm, styleProfile) {
  return {
    reply: `我先把重点说清楚：你刚才这句话是在把问题转成我的情绪。现在要谈的是${replyForm.goal || "这件事怎么处理"}，不是我有没有资格不舒服。请你正面回应。`,
    strategy: "本地预览：识别贴标签/转移话题，拉回事实、影响、诉求和边界。",
    tone: getProfileTone(styleProfile) || "温柔但有边界"
  };
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
