export const navItems = [
  { key: "temp", label: "临时吵", mark: "吵" },
  { key: "persona", label: "专属嘴替", mark: "替" },
  { key: "training", label: "训练场", mark: "练" },
  { key: "records", label: "记录", mark: "记" },
  { key: "profile", label: "我的", mark: "我" }
];

export const features = [
  {
    key: "temp",
    title: "临时代吵",
    desc: "陌生人、商家、网友、客服都能用。对方说一句，你告诉我一句，App 帮你实时接话。",
    tone: "开一局临时冲突",
    mark: "实时",
    color: "pink"
  },
  {
    key: "persona",
    title: "专属嘴替",
    desc: "保存熟人关系档案，记住你们的矛盾、你的风格和不能越过的表达边界。",
    tone: "选档案或新建开吵",
    mark: "嘴替",
    color: "blue"
  },
  {
    key: "training",
    title: "吵架训练场",
    desc: "开放输入你想练的场景，系统扮演对方，多轮练习不被带偏。",
    tone: "开始训练",
    mark: "训练",
    color: "yellow"
  }
];

export const whoOptions = ["情侣", "朋友", "室友", "同事", "家人", "商家", "陌生人", "网友", "同学"];
export const toneOptions = ["低", "中", "高"];
export const proxyStyleOptions = ["冷静拆台", "阴阳怪气", "高压控场", "体面反击"];
export const proxyReplyModes = ["像我本人", "说得更清楚", "攻击力加强"];
export const proxyReplyStrengths = ["低", "中", "高"];
export const difficultyOptions = ["热身", "普通", "嘴硬", "阴阳大师"];
export const trainingGoalOptions = ["抓住核心问题", "不被嘲讽带偏", "不情绪失控", "练习反击阴阳怪气", "坚持提出明确要求"];
export const trainingDifficultyOptions = [
  { value: "easy", label: "温和" },
  { value: "normal", label: "正常" },
  { value: "hard", label: "强势" },
  { value: "hell", label: "地狱" }
];

export const relationProfiles = [
  {
    id: "boyfriend-3m",
    name: "谈了 3 个月的男友",
    relation: "刚确认关系不久，关系暧昧和恋爱边界还在磨合。",
    commonConflict: "他临时改约、不回消息，被指出后说我太敏感。",
    tactics: "用“你又来了”“这点小事”把问题变成我的情绪问题。",
    style: "我平时会先解释原因，不喜欢把话说绝，但希望对方认真听。",
    boundary: "不要骂脏话、不要提分手、不要牵扯家人。",
    expectation: "帮我说得像本人，但更短、更稳、更有边界。"
  },
  {
    id: "roommate",
    name: "经常阴阳怪气的室友",
    relation: "住在一起，日常还要见面，不想彻底闹僵。",
    commonConflict: "公共卫生、噪音、轮流做事时经常装没看见。",
    tactics: "说我事多、要求高，或者把话题绕到我也有做得不好的地方。",
    style: "我想讲清规则，不想被她带着互相翻旧账。",
    boundary: "不要人身攻击，不要把宿舍气氛彻底弄死。",
    expectation: "帮我守住主线，让她承认公共规则需要一起执行。"
  }
];

export const initialProxyPersonaState = {
  userId: 1,
  activeTab: "upload",
  upload: {
    relationship: "谈了 3 个月的男友",
    background: "他最近经常不回消息，临时改约后说我太敏感。",
    chatText: "我不是想吵架，我只是希望你尊重之前说好的约定。你先别把问题说成我太敏感。"
  },
  testAnswers: {},
  personas: [],
  selectedPersonaId: "",
  replyForm: {
    opponentMessage: "你怎么又开始了？这点小事也要上纲上线？",
    background: "",
    goal: "",
    mode: "像我本人",
    strength: "中"
  },
  chatTurns: [],
  replyResult: null,
  isReplyGenerating: false,
  message: ""
};

export const initialTempSession = {
  type: "临时代吵",
  step: "setup",
  who: "",
  context: "",
  latest: "",
  goal: "",
  tone: "中",
  boundary: "不要骂脏话，不要人身攻击，只围绕主线表达。",
  generatedScenario: null,
  scenarioStatus: "idle",
  scenarioMessage: "",
  scenarioRefreshCount: 0,
  settingsOpen: false,
  input: "",
  isSubmitting: false,
  generationRequestId: "",
  rounds: []
};

export const initialPersonaSession = {
  type: "专属嘴替",
  step: "setup",
  profileId: relationProfiles[0].id,
  who: relationProfiles[0].name,
  relation: relationProfiles[0].relation,
  commonConflict: relationProfiles[0].commonConflict,
  tactics: relationProfiles[0].tactics,
  style: relationProfiles[0].style,
  expectation: relationProfiles[0].expectation,
  context: "我们谈了 3 个月，最近他经常不回消息。昨天约好一起吃饭，他临时说要和朋友出去，我表达不满后他说我太敏感。",
  latest: "你怎么又开始了？这点小事也要上纲上线？",
  goal: "表达不满，但不想吵到分手",
  tone: "温柔但有边界",
  boundary: relationProfiles[0].boundary,
  input: "",
  rounds: []
};

export const initialTrainingSession = {
  type: "吵架训练",
  step: "setup",
  gameState: "idle",
  scene: "宿舍里，室友一直不倒垃圾。小雨提醒后，室友还嘲讽小雨小题大做。",
  debateTopic: "宿舍里，室友一直不倒垃圾。小雨提醒后，室友还嘲讽小雨小题大做。",
  playerIdentity: "小雨",
  aiIdentity: "室友",
  playerSide: "A",
  aiSide: "B",
  aiDifficulty: "正常争论",
  difficulty: "普通",
  goal: "抓住核心问题、不被嘲讽带偏",
  gameConfig: {
    scene: "宿舍里，室友一直不倒垃圾。小雨提醒后，室友还嘲讽小雨小题大做。",
    roleA: {
      name: "小雨",
      description: "有理方 / 提出要求的一方，被室友不倒垃圾影响的人",
      goal: "让室友承担责任，不要再嘲讽和转移话题"
    },
    roleB: {
      name: "室友",
      description: "理亏方 / 辩解转移的一方，不想倒垃圾，还觉得小雨管太多",
      goal: "嘴硬拖延，强调自己也有理由，尽量不承认核心问题"
    },
    playerRoleKey: "A",
    aiRoleKey: "B",
    trainingGoals: ["抓住核心问题", "不被嘲讽带偏"],
    difficulty: "normal",
    toneStrength: "中",
    contextSummary: "室友连续几次没有倒垃圾，小雨提醒后，室友把问题说成小雨小题大做。",
    userMainline: "让室友承认公共规则需要一起执行，并给出之后怎么轮流倒垃圾的明确做法。",
    sessionControl: {
      replyLength: "中",
      remindMainline: "开启",
      allowEscalation: "允许"
    }
  },
  maxRounds: 5,
  persuasionScore: 0,
  persuasionDelta: 0,
  opponentState: "strong",
  review: null,
  result: "",
  offTrackStreak: 0,
  randomScenarioForm: {
    category: "随机",
    difficulty: "随机",
    opponentType: "随机",
    userGoal: ""
  },
  generatedScenario: null,
  scenarioStatus: "idle",
  scenarioMessage: "",
  settingsOpen: false,
  round: 1,
  opponent: "",
  messages: [],
  input: "",
  isSubmitting: false,
  generationRequestId: "",
  feedbacks: []
};

export function makeContextSummary(session) {
  return {
    object: session.who || session.scene || "这次冲突",
    goal: session.goal || "先把话说清楚",
    tone: session.tone || "冷静有理"
  };
}

export function buildTempChatTurn(session, text, options = {}) {
  return buildTargetedTempTurn(session, text, options);
}

function buildTargetedTempTurn(session, text, { inputAsIntent = false } = {}) {
  const rawText = String(text || "").trim();
  const object = session.who || session.generatedScenario?.opponentPersona || "对方";
  const goal = session.goal || session.generatedScenario?.userGoal || "把诉求说清楚";
  const scene = session.generatedScenario?.background || session.context || "这次冲突";
  const tone = session.tone || "中";
  const boundary = session.boundary || "不要骂脏话，不要人身攻击，只围绕主线表达。";
  const analysis = inputAsIntent ? "你现在给的是想表达的意思，需要把它变成更清楚、更有压迫感但不越界的话。" : detectTactic(rawText);
  const tacticReply = buildTempReplyCore({ text: rawText, object, goal, scene, tone, inputAsIntent });

  return {
    id: Date.now(),
    opponent: inputAsIntent ? `我想表达：${rawText}` : rawText,
    analysis,
    mainline: `本轮围绕“${goal}”。场景是：${scene}。不要顺着${object}去解释情绪，先抓事实和影响，再给明确要求。边界：${boundary}`,
    replies: [
      {
        label: "稳妥版",
        text: tacticReply.balanced
      },
      {
        label: "强硬版",
        text: tacticReply.strong
      },
      {
        label: "嘴替版/阴阳版",
        text: tacticReply.sharp
      }
    ],
    toneReminder: `按“${tone}”来，但别为了显得好说话把边界让没了。`
  };
}

function buildTempReplyCore({ text, object, goal, scene, tone, inputAsIntent }) {
  const safeText = text || goal;
  const highTone = tone === "高";

  if (inputAsIntent) {
    const intent = safeText.replace(/[。！？\s]+$/g, "");
    return {
      balanced: `我说这件事不是为了跟你耗，是要把问题讲清楚：${intent}。请你正面回应，而不是继续绕开。`,
      strong: `我不接受你把重点带偏。我的意思很明确：${intent}。这件事需要一个正面说法和处理结果。`,
      sharp: `别急着给我扣态度问题，我现在讲的是：${intent}。能回应就回应，不能回应也别装没听懂。`
    };
  }

  if (/敏感|上纲上线|小事|又开始|想太多|事多/.test(safeText)) {
    return {
      balanced: `别把问题说成我太敏感。现在讨论的是${scene}里已经发生的事，以及你准备怎么处理。我的要求是：${goal}。`,
      strong: `你可以不认同我的感受，但不能用“我太敏感”把事情盖过去。问题还在这儿：${goal}，请正面回应。`,
      sharp: `把具体问题包装成我情绪大，这招不新鲜。我们别演了，回到事实：${goal}。`
    };
  }

  if (/规则|不符合|自己看|没看清|不是我们|不关我|流程/.test(safeText)) {
    return {
      balanced: `规则我可以看，但你也要说明这件事具体怎么处理。别只把责任推回来，我要的是明确方案：${goal}。`,
      strong: `别用一句规则就结束问题。你现在需要回答的是责任和处理方案，不是让我自己消化损失。我的诉求是：${goal}。`,
      sharp: `规则不是挡箭牌。能处理就说方案，不能处理就说依据，别只会把锅推给用户。`
    };
  }

  if (/随你|行吧|呵呵|你开心|懂的都懂|至于吗|不会吧|无语/.test(safeText)) {
    return {
      balanced: `你如果有具体意见可以直接说，别用这种话把问题悬着。我们回到事情本身：${goal}。`,
      strong: `阴阳怪气解决不了问题。你要么说清楚哪里不同意，要么正面回应我的诉求：${goal}。`,
      sharp: `这种话术省力，但不解决事。你要表达不满就明说，别拿语气逃避主线。`
    };
  }

  if (/那你想|怎么办|怎么做|还要怎样|你说/.test(safeText)) {
    return {
      balanced: `我说得很具体：先承认这件事造成的影响，再给出处理办法。我的诉求是：${goal}。`,
      strong: `别把责任又丢回来让我替你想。你需要给的是回应和方案，我的要求就是：${goal}。`,
      sharp: `不是我替你补作业。问题是你这边造成的，方案也该由你先给。`
    };
  }

  if (/为你好|不听劝|后悔|都是关心|我还不是/.test(safeText)) {
    return {
      balanced: `如果是关心，就应该尊重我的选择，而不是把控制包装成建议。现在我要讲清楚的是：${goal}。`,
      strong: `别用“为你好”压住我的表达。关心不能替代尊重，我的边界和诉求是：${goal}。`,
      sharp: `打着关心的旗号替我做决定，这不叫为我好，叫不尊重。`
    };
  }

  return {
    balanced: `我先把话说清楚：这件事的重点不是谁声音大，而是${scene}已经影响到我。我的诉求是：${goal}。`,
    strong: `别继续绕开重点。现在要解决的是这件事本身，以及你准备怎么回应我的诉求：${goal}。`,
    sharp: highTone
      ? `别把话题搅浑。你可以有情绪，但问题不会因为你转移重点就消失。回到主线：${goal}。`
      : `我不接跑题。事情说回具体的：${goal}，请你正面回应。`
  };
}

function detectTactic(text) {
  const value = text || "";
  if (/敏感|上纲上线|小事|又开始/.test(value)) {
    return "对方在给你贴“情绪化/太计较”的标签，把具体问题偷换成你的性格问题。";
  }
  if (/不是我|不关我|你自己|规则|没看清/.test(value)) {
    return "对方在甩锅和转移责任，试图让你解释自己有没有错，而不是回应怎么处理。";
  }
  if (/算了|随便|不想说|冷静一下/.test(value)) {
    return "对方可能在用冷处理结束讨论，你需要分清“暂停降温”和“逃避回应”。";
  }
  if (/都是为你好|你以后会后悔|不听劝/.test(value)) {
    return "对方在道德绑架，把控制包装成关心，容易让你陷入自证。";
  }
  return "对方这句话里可能混着情绪压迫和转移话题。先别急着解释自己，先把主线拉回事实、影响和诉求。";
}


export function buildTrainingChatTurn(session, userReply) {
  const hasMainline = /重点|现在|问题|责任|处理|解决|规则|影响|诉求|要求/.test(userReply);
  const hasBoundary = /不接受|不能|请你|不要|边界|正面/.test(userReply);
  const score = Math.max(48, Math.min(94, 58 + (hasMainline ? 18 : 0) + (hasBoundary ? 12 : 0) + Math.min(userReply.length / 8, 6)));
  const nextOpponent = buildNextOpponent(session.scene, session.difficulty, session.round);

  return {
    id: Date.now(),
    userReply,
    score: Math.round(score),
    strengths: hasMainline ? "你有把话题拉回具体问题，没有完全被对方的情绪标签带跑。" : "你表达了不满，但主线还可以更明确。",
    problems: hasBoundary ? "可以再补一句具体要求，比如希望对方道歉、给方案或停止某种行为。" : "边界不够硬，对方可能继续用“你想太多”压回你身上。",
    optimized: "我不是在争谁声音更大，我是在说这件事造成了影响，需要被正面处理。请你别再评价我的情绪，直接回应：这件事你准备怎么解决？",
    nextOpponent
  };
}

function buildNextOpponent(scene, difficulty, round) {
  if (difficulty === "阴阳大师") {
    return round > 1 ? "行行行，你最会讲道理，我们都不配跟你沟通。" : "哇，你好认真哦，这么点事也能分析出一篇论文。";
  }
  if (/工作|组员|同事/.test(scene)) return "那你说怎么办？反正别什么都算我头上。";
  if (/恋爱|男朋友|女朋友|暧昧/.test(scene)) return "我都说了不是故意的，你还想让我怎么样？";
  return "那你现在到底要我怎么做？别一直说我有问题。";
}

export const realtimeRecords = [
  {
    type: "临时代吵记录",
    object: "态度很差的客服",
    context: "售后一直让用户自己看规则，不给明确处理方案。",
    goal: "争取权益",
    rounds: 4,
    time: "今天 14:20"
  },
  {
    type: "专属嘴替记录",
    object: "谈了 3 个月的男友",
    context: "临时改约后说用户太敏感。",
    goal: "表达不满，但不想吵到分手",
    rounds: 3,
    time: "昨天 22:10"
  },
  {
    type: "吵架训练记录",
    object: "室友卫生倒打一耙",
    context: "训练如何守住公共规则主线。",
    goal: "主线守护训练",
    rounds: 5,
    time: "周一 19:35"
  }
];
