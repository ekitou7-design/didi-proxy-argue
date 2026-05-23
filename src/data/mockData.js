export const navItems = [
  { key: "temp", label: "临时吵", mark: "吵" },
  { key: "persona", label: "专属嘴替", mark: "替" },
  { key: "training", label: "吵架训练", mark: "练" }
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
export const goalOptions = [
  "压回去",
  "要道歉",
  "讲清楚",
  "体面结束"
];
export const toneOptions = ["低", "中", "高"];
export const tempScenarioPresets = [
  {
    label: "客服扯皮",
    who: "态度很差的客服",
    context: "我买的东西有明显质量问题，联系客服后对方一直让我自己看规则，不正面处理退款。",
    latest: "这个不是我们的问题，你自己也没有看清楚规则。",
    goal: "要道歉",
    tone: "中"
  },
  {
    label: "对象改约",
    who: "临时改约的对象",
    context: "昨天约好一起吃饭，他临时说要和朋友出去，我表达不满后他说我太敏感。",
    latest: "你怎么又开始了？这点小事也要上纲上线？",
    goal: "讲清楚",
    tone: "中"
  },
  {
    label: "室友装傻",
    who: "经常装没看见的室友",
    context: "公共卫生说好轮流做，对方经常跳过，被提醒后说我要求太多。",
    latest: "你也别说得自己多守规矩，宿舍又不是你一个人的。",
    goal: "压回去",
    tone: "中"
  },
  {
    label: "同事甩锅",
    who: "项目里甩锅的同事",
    context: "对方没按时交付，影响了我的部分，现在想把延期说成大家都有责任。",
    latest: "这也不能全怪我吧，你要求这么高，那你来做不是更快吗？",
    goal: "讲清楚",
    tone: "高"
  }
];
export const proxyStyleOptions = ["冷静拆台", "阴阳怪气", "高压控场", "体面反击"];
export const proxyReplyModes = ["像我本人", "说得更清楚", "攻击力加强"];
export const proxyReplyStrengths = ["低", "中", "高"];
export const difficultyOptions = ["热身", "普通", "嘴硬", "阴阳大师"];

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
    background: "昨天约好一起吃饭，他临时说要和朋友出去。",
    goal: "反击对方逻辑",
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
  who: "态度很差的客服",
  context: "我买的东西有明显质量问题，联系客服后对方一直让我自己看规则，不正面处理退款。",
  latest: "这个不是我们的问题，你自己也没有看清楚规则。",
  goal: "压回去",
  tone: "中",
  boundary: "不要骂脏话，不要人身攻击，只要求对方给明确处理方案。",
  input: "",
  isSubmitting: false,
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
  scene: "男朋友临时改约还说我太敏感",
  difficulty: "普通",
  randomScenarioForm: {
    category: "随机",
    difficulty: "随机",
    opponentType: "随机",
    userGoal: ""
  },
  generatedScenario: null,
  scenarioStatus: "idle",
  scenarioMessage: "",
  round: 1,
  opponent: "",
  input: "",
  isSubmitting: false,
  feedbacks: []
};

export function makeContextSummary(session) {
  return {
    object: session.who || session.scene || "这次冲突",
    goal: session.goal || "先把话说清楚",
    tone: session.tone || "冷静有理"
  };
}

export function buildTempChatTurn(session, opponentText) {
  return buildRealtimeTurn(session, opponentText);
}

export function buildPersonaChatTurn(session, opponentText) {
  return buildRealtimeTurn(session, opponentText, true);
}

function buildRealtimeTurn(session, opponentText, hasPersona = false) {
  const analysis = detectTactic(opponentText);
  const object = session.who || "对方";
  const goal = session.goal || "把诉求说清楚";
  const tone = session.tone || "冷静有理";
  const boundary = session.boundary || "不越界、不人身攻击";

  return {
    id: Date.now(),
    opponent: opponentText,
    analysis,
    mainline: `这一轮抓住“${goal}”。你面对的是${object}，不要被对方带去证明自己有没有资格生气；只讲事实、影响、责任和下一步。表达边界：${boundary}`,
    replies: [
      {
        label: "稳妥版",
        text: `我不是要把事情闹大，我是在说这件事确实对我造成了影响。我们先回到具体问题：${goal}。请你正面回应这件事，而不是把重点转成评价我的情绪。`
      },
      {
        label: "强硬版",
        text: `别把问题绕成“我太敏感”或者“我要求太多”。现在讨论的是你刚才这句话背后的责任和处理方式。我的要求很明确：${goal}，请直接回应。`
      },
      {
        label: hasPersona ? "嘴替版/阴阳版" : "嘴替版/阴阳版",
        text: `这个转移重点的角度挺熟练的，但我不接。事情不会因为你给我贴个情绪标签就自动消失。我们还是回到主线：${goal}。`
      }
    ],
    toneReminder: `按“${tone}”来，但别为了显得好说话把边界让没了。`
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

export function makeOpeningOpponent(scene) {
  if (/男朋友|女朋友|对象|恋爱|暧昧/.test(scene)) {
    return "你怎么又开始了？我只是临时有点事，你非要把气氛弄成这样吗？";
  }
  if (/组员|同事|工作|项目/.test(scene)) {
    return "这也不能全怪我吧，你要求这么高，那你来做不是更快吗？";
  }
  if (/室友|卫生|宿舍/.test(scene)) {
    return "你也别说得自己多守规矩，宿舍又不是你一个人的。";
  }
  if (/商家|客服|退款|售后/.test(scene)) {
    return "这个不符合我们的处理规则，你自己下单前也应该看清楚。";
  }
  return "你现在这样说就很没必要，本来不是什么大事，被你一讲反而变复杂了。";
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
