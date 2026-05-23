export const navItems = [
  { key: "home", label: "首页", mark: "首" },
  { key: "records", label: "记录", mark: "录" },
  { key: "profile", label: "我的", mark: "我" }
];

export const features = [
  {
    key: "temp",
    title: "临时代吵",
    desc: "对方说一句，你告诉我一句，App 帮你实时接话、稳住主线。",
    tone: "开始实时吵",
    mark: "实时",
    color: "pink"
  },
  {
    key: "persona",
    title: "专属嘴替",
    desc: "带入你的说话风格、关系背景和表达边界，帮你实时回话。",
    tone: "创建嘴替并开吵",
    mark: "嘴替",
    color: "blue"
  },
  {
    key: "training",
    title: "吵架训练场",
    desc: "系统扮演难缠对手，你一轮一轮回复，练习不被带偏、守住主线。",
    tone: "开始训练",
    mark: "训练",
    color: "yellow"
  }
];

export const tempIntensities = ["温和", "阴阳", "强硬", "发疯"];

export const tempStyles = tempIntensities;

export const tempReplies = {
  冷静反击:
    "我理解你有情绪，但这件事不能只按你的感受来定。我们先把事实说清楚：问题发生在哪里、谁负责什么、接下来怎么补救。你可以不认同我，但请别把讨论变成扣帽子。",
  阴阳怪气:
    "你这个角度还挺新鲜的，主打一个把问题绕开再把锅精准投递。没关系，我们回到现实：这件事不是我一个人的责任，也不是你声音大就自动成立。",
  强硬拒绝:
    "这件事我不同意，也不会照你这个说法接受。我的底线很清楚：可以沟通，可以协商，但不能用指责和施压替代事实。",
  体面收场:
    "我不想把这件事继续升级。我们各自先冷静一下，把能解决的部分列出来。如果只是互相消耗，那今天就先到这里。"
};

const intensityLines = {
  温和: {
    main: "先稳住边界，再把事实和诉求说清楚。",
    recommended:
      "我知道这件事可能在你看来不大，但它确实影响到我了。我们可以好好说，但不能用一句“你太计较”把问题带过去。我的诉求很简单：请正面回应这件事，并给出一个明确处理方式。",
    harder:
      "别用“你太计较”来转移重点。问题不是我情绪多，而是你的做法确实造成了影响。你可以解释，但别把责任推回给我。",
    decent:
      "我不想把话说难听。我们就事论事，把已经发生的影响和接下来怎么处理说清楚，这样对彼此都更体面。"
  },
  阴阳: {
    main: "抓住对方偷换概念，用轻讽刺把荒谬感点出来。",
    recommended:
      "原来只要你觉得没事，别人就必须自动消化，挺方便的逻辑。可惜这件事不是一句“你太计较”就能翻篇。我们还是回到重点：你做了什么、影响是什么、打算怎么处理。",
    harder:
      "你这个说法很省事，先把事情弄出来，再把别人正常反馈包装成“计较”。但我不接这个锅。问题在事情本身，不在我有没有配合你装没事。",
    decent:
      "我理解你可能不觉得严重，但用“太计较”评价我的反馈并不能解决问题。我们还是把事情本身说清楚。"
  },
  强硬: {
    main: "直接定边界，压住对方的指责，不给继续带偏的空间。",
    recommended:
      "我不接受你这个说法。你可以不同意我的感受，但不能用贬低来逃避问题。现在要讨论的是这件事怎么处理，不是给我扣一个“计较”的标签。",
    harder:
      "别再把问题往我身上推。我表达不满，是因为你的行为造成了影响，不是因为我好欺负。要么正面解决，要么承认你不想负责，别绕。",
    decent:
      "这件事我会明确表达不满，但我不想继续升级。请你正面回应问题，我们把处理方式定下来。"
  },
  发疯: {
    main: "释放情绪但不越界，用高能表达把重点砸回桌面。",
    recommended:
      "我真的要被这个逻辑气笑了：事情发生了，影响出现了，然后最后变成我太计较？这不是沟通，这是把锅做了个蝴蝶结递给我。我不收。现在请回到问题本身。",
    harder:
      "别演了，真的。你一句“太计较”不能把已经发生的影响抹掉，也不能把你的责任洗成我的情绪问题。我现在只问一句：这事你到底处理不处理？",
    decent:
      "我现在情绪确实上来了，所以我尽量把话说清楚：我在意的不是输赢，而是这件事造成的影响需要被正面处理。"
  }
};

const personaAngles = {
  gentle: "语气可以平静，但每一句都要守住边界。",
  sarcasm: "可以轻微阴阳，重点是让对方意识到自己的逻辑不成立。",
  logic: "按事实、影响、诉求三段推进，不被对方带偏。",
  wild: "情绪表达可以更戏剧化，但不要辱骂和威胁。",
  office: "适合留痕表达，措辞克制但态度明确。"
};

export function buildTempArgueResult({ form, personaId, intensity }) {
  const selectedPersona = personas.find((persona) => persona.id === personaId) || personas[0];
  const lines = intensityLines[intensity] || intensityLines.温和;
  const scene = form.scene || "这次冲突";
  const opponent = form.opponent || "对方的说法";
  const goal = form.goal || "把诉求讲清楚";

  return {
    mainLine: `围绕“${scene}”反击，不接“${opponent}”里的情绪标签，最终把话题拉回“${goal}”。${personaAngles[selectedPersona.id]}`,
    recommended: `${selectedPersona.name}：${lines.recommended}`,
    harder: lines.harder,
    decent: lines.decent,
    offTopic:
      "跑题提醒：不要被“你太敏感”“你也有问题”“就这点事”带走。只盯住事实、影响、责任和你要的结果。"
  };
}

export const initialPersonaForm = {
  style: "我平时说话会先解释原因，不太喜欢把话说绝，但情绪上来时容易反复强调自己不是无理取闹。",
  problem: "吵架时容易解释太多，被对方带偏，最后忘记自己真正想要什么。",
  expectation: "帮我把感受、事实和诉求说清楚，语气像我本人，但更稳、更有边界。",
  boundary: "不要辱骂、不要威胁、不要翻旧账攻击对方人格，也不要把关系说死。"
};

export function buildPersonaReplyResult(form) {
  const style = form.style || "我的说话风格";
  const problem = form.problem || "我吵架时最容易出现的问题";
  const expectation = form.expectation || "我希望嘴替帮我做到什么";
  const boundary = form.boundary || "我不想越过的表达边界";

  return {
    styleAnalysis:
      `你的嘴替人格会保留这种底色：${style} 但会主动修正这个弱点：${problem}`,
    mainLine: `核心任务是：${expectation} 表达边界是：${boundary}`,
    myVersion:
      "我的专属嘴替人格：平时温和，但关键时刻不退让。先说事实，再说感受，最后落到明确诉求；不靠骂人赢，而是靠把主线拉回来赢。",
    softer:
      "温和模式：先承认关系和情绪，再把自己的需求讲清楚，适合还想继续好好沟通的熟人关系。",
    harder:
      "强硬模式：不接对方扣帽子，不陷入自证，直接指出问题、影响和下一步要求。",
    pause:
      "暂停模式：当对话开始失控时，先停止互相消耗，保留之后继续沟通的余地。"
  };
}

export const personas = [
  {
    id: "gentle",
    name: "温柔但致命型",
    intro: "语气平静，刀刀落在事实和边界上。",
    tags: ["不失礼", "有分寸", "后劲大"],
    sample: "我不是在为难你，我只是在提醒你：尊重是双向的，责任也是。"
  },
  {
    id: "sarcasm",
    name: "阴阳怪气型",
    intro: "表面客气，实际把荒谬感精准放大。",
    tags: ["轻讽刺", "反问", "梗感"],
    sample: "原来只要你觉得麻烦，事情就自动变成我的错了，学到了。"
  },
  {
    id: "logic",
    name: "逻辑碾压型",
    intro: "拆概念、列证据、堵住偷换话题。",
    tags: ["有条理", "证据链", "压迫感"],
    sample: "先别扩大问题。我们只讨论三点：事实、责任、解决方案。"
  },
  {
    id: "wild",
    name: "发疯文学型",
    intro: "夸张但不过界，用戏剧感释放情绪。",
    tags: ["高能", "戏剧化", "表情包"],
    sample: "我现在像一台被迫营业的复读机：重点是解决问题，不是比谁更委屈。"
  },
  {
    id: "office",
    name: "职场老油条型",
    intro: "体面、精准、留痕，适合工作沟通。",
    tags: ["邮件感", "边界", "留证据"],
    sample: "为避免理解偏差，我把目前共识和待确认事项整理如下。"
  }
];

export const trainingScenes = [
  "宿舍卫生大战",
  "情侣冷战",
  "朋友借钱不还",
  "小组作业队友摆烂",
  "商家扯皮",
  "职场甩锅",
  "家庭催婚",
  "网友阴阳怪气"
];

export const trainingDifficulties = [
  { id: "bronze", name: "青铜", desc: "对方讲道理", boost: 10 },
  { id: "silver", name: "白银", desc: "对方嘴硬", boost: 0 },
  { id: "gold", name: "黄金", desc: "对方阴阳怪气", boost: -8 },
  { id: "king", name: "王者", desc: "偷换概念 + 情绪勒索", boost: -16 }
];

export const trainingOpponents = ["嘴硬型", "阴阳型", "甩锅型", "装委屈型"];

const openingAttacks = {
  宿舍卫生大战: "你也太较真了吧？宿舍又不是你一个人的，凭什么都按你的标准来？",
  情侣冷战: "我都不想说话了，你还非要逼我表态，是不是一定要吵起来你才满意？",
  朋友借钱不还: "不就这点钱吗？你催成这样，搞得我像故意赖账一样。",
  小组作业队友摆烂: "你这么能干你就多做点呗，反正最后大家分数都一样。",
  商家扯皮: "这个不是我们的问题，你自己也没看清楚规则，现在找我们也没用。",
  职场甩锅: "这个需求当时你也在群里，怎么现在出问题就全算我头上？",
  家庭催婚: "我们都是为你好，你现在不听，以后后悔了别怪家里没提醒你。",
  网友阴阳怪气: "哇，你好认真哦，网上说两句也能破防，建议少上网。"
};

export const initialTrainingState = {
  scene: trainingScenes[0],
  difficulty: trainingDifficulties[1].id,
  opponentType: trainingOpponents[1],
  round: 1,
  started: false,
  currentAttack: openingAttacks[trainingScenes[0]],
  reply: "我不是要求所有人都按我的标准来，我是在说公共空间需要基本规则。现在的问题不是谁更较真，而是谁在逃避自己该做的部分。",
  result: null,
  report: null
};

export function buildTrainingRound({ scene, difficulty, opponentType, round, reply }) {
  const selectedDifficulty =
    trainingDifficulties.find((item) => item.id === difficulty) || trainingDifficulties[0];
  const lengthBonus = Math.min(Math.floor((reply || "").length / 12), 12);
  const hasBoundary = /不接受|边界|不能|请|需要|规则|责任|解决/.test(reply || "");
  const base = 66 + selectedDifficulty.boost + lengthBonus + (hasBoundary ? 8 : -6);
  const logic = clamp(base + (reply.includes("问题") ? 7 : 0));
  const power = clamp(base + (reply.includes("不是") ? 6 : 0) - 2);
  const boundary = clamp(base + (hasBoundary ? 10 : -4));
  const mainline = clamp(base + (reply.includes("现在") || reply.includes("重点") ? 8 : -2));
  const risk = clamp(100 - base + (reply.includes("你就是") ? 18 : 0));
  const winRate = clamp(Math.round((logic + power + boundary + mainline - risk) / 3.4));
  const drifted = mainline < 72 || risk > 42;

  return {
    scores: { logic, power, boundary, mainline, risk, winRate },
    drifted,
    suggestion: drifted
      ? "你有回击，但容易被对方带去争输赢。建议回到事实、责任和下一步要求，少解释自己的情绪是否合理。"
      : "主线守得不错。可以再把诉求说得更具体，比如要求对方给时间、给方案、给明确回应。",
    optimized:
      "重点不是我是不是较真，而是公共规则有没有被执行。你可以不喜欢被提醒，但这不等于责任不存在。我们现在只说一件事：这部分你什么时候处理？",
    nextAttack: buildNextAttack(scene, opponentType, round),
    report: buildTrainingReport({ scene, difficulty: selectedDifficulty, opponentType, winRate, drifted })
  };
}

function buildNextAttack(scene, opponentType, round) {
  if (round <= 1) {
    return `${openingAttacks[scene]} 再说了，你现在这个语气也没多好吧？`;
  }

  const attacks = {
    嘴硬型: "我又没说不处理，你现在一直逼我，有必要吗？",
    阴阳型: "行行行，你最讲规则，你最成熟，我们都不配跟你沟通。",
    甩锅型: "这事又不是我一个人的问题，你怎么只盯着我？",
    装委屈型: "我已经很累了，你还这样说，我真的不知道怎么跟你相处。"
  };
  return attacks[opponentType] || attacks.嘴硬型;
}

function buildTrainingReport({ scene, difficulty, opponentType, winRate, drifted }) {
  return {
    title: `${scene} / ${difficulty.name}局`,
    summary: drifted
      ? `面对${opponentType}对手时，你有表达力度，但中途容易接对方情绪球。`
      : `面对${opponentType}对手时，你守住了主线，表达清楚，也没有明显失控。`,
    badges: winRate >= 75 ? ["主线守护者", "边界清楚", "稳定输出"] : ["有气势", "需防带偏", "继续练习"],
    finalAdvice:
      "下一次先用一句话定主线，再说事实和要求。记住：不用证明自己配不配生气，只要说明问题怎么解决。"
  };
}

function clamp(value) {
  return Math.max(8, Math.min(96, Math.round(value)));
}

export const historyItems = [
  "室友半夜外放视频，已生成冷静反击版",
  "同事甩锅项目延期，已生成职场留痕版",
  "朋友临时爽约，已生成体面收场版"
];

export const recordGroups = [
  {
    title: "临时代吵记录",
    items: ["商家拒绝退款：强硬版", "路人插队争执：体面收场版", "网友阴阳怪气：阴阳版"]
  },
  {
    title: "专属嘴替记录",
    items: ["亲密关系嘴替人格：温和但有边界", "室友沟通嘴替人格：规则清晰型"]
  },
  {
    title: "训练场记录",
    items: ["宿舍卫生大战：胜率 78", "职场甩锅：主线守护值 82", "网友阴阳怪气：失控风险 24"]
  }
];

export const tempWhoOptions = ["陌生人", "商家", "网友", "同学", "路人", "其他"];
export const tempGoalOptions = ["表达不满", "拒绝对方", "要求道歉", "争取权益", "结束对话"];
export const tempToneOptions = ["冷静有理", "强硬反击", "阴阳怪气", "体面收场", "嘴毒但不脏"];

export const initialTempSession = {
  step: "setup",
  who: "商家",
  goal: "争取权益",
  tone: "强硬反击",
  input: "这个问题不是我们造成的，你自己没看清规则。",
  rounds: []
};

export function buildTempChatTurn(session, opponentText) {
  const target = session.goal || "稳住主线";
  const tone = session.tone || "冷静有理";
  return {
    id: Date.now(),
    opponent: opponentText,
    analysis: `对方在把责任推回给你，核心话术是“规则/责任不在我”。不要顺着解释自己有没有看清，先把问题拉回事实和${target}。`,
    mainline: `本轮主线：你面对的是${session.who}，目标是${target}，语气保持“${tone}”。`,
    replies: [
      {
        label: "稳妥版",
        text: `我理解你提到规则，但现在的问题是实际服务结果没有解决。请你直接说明这件事接下来怎么处理，而不是把责任全部推给我。`
      },
      {
        label: "强硬版",
        text: `别把问题绕成“我没看清”。我现在讨论的是你们提供的结果和应承担的处理责任。请给明确方案，不要继续转移重点。`
      },
      {
        label: "嘴替版/阴阳版",
        text: `原来只要一句“你没看清规则”，问题就能自动消失，挺省事的。但我这边需要的是解决方案，不是甩锅模板。`
      }
    ]
  };
}

export const initialPersonaSession = {
  step: "setup",
  style: "我说话会先解释原因，不喜欢把话说绝，但希望对方认真听。",
  relation: "室友",
  problem: "容易解释太多，被对方带偏，最后忘记自己的诉求。",
  expectation: "帮我说得像我本人，但更短、更稳、更有边界。",
  boundary: "不辱骂、不威胁、不翻旧账，不把关系说死。",
  personaName: "温和边界型嘴替",
  input: "你怎么又开始了？这点小事也要上纲上线？",
  rounds: []
};

export function buildPersonaChatTurn(session, opponentText) {
  return {
    id: Date.now(),
    opponent: opponentText,
    styleReminder: `保持你的风格：${session.style} 这轮少解释，多说感受、边界和请求。`,
    analysis: `对方在用“你又开始了”给你扣情绪标签，容易让你陷入自证。先承认关系还重要，再把问题带回具体事情。`,
    replies: [
      {
        label: "像我本人版",
        text: `我不是想把事情闹大，也不是要跟你争输赢。但这件事确实影响到我了，我希望你先听我把重点说完，而不是一上来就说我又开始了。`
      },
      {
        label: "更强硬版",
        text: `别用“你又开始了”来跳过问题。我表达不舒服，不等于我在找事。我们现在说具体事情，不要把话题转成评价我这个人。`
      },
      {
        label: "体面收尾版",
        text: `如果你现在不想聊，我们可以先停一下。但这件事不能当作没发生，等都冷静一点，我们再把边界和处理方式说清楚。`
      }
    ]
  };
}

export const initialTrainingSession = {
  step: "setup",
  scene: "宿舍卫生大战",
  difficulty: "白银",
  round: 1,
  opponent: "你也太较真了吧？宿舍又不是你一个人的，凭什么都按你的标准来？",
  input: "我不是要求所有人都按我的标准来，我是在说公共空间需要基本规则。",
  feedbacks: []
};

export function buildTrainingChatTurn(session, userReply) {
  const hasMainline = /规则|重点|现在|问题|责任|处理|解决/.test(userReply);
  const score = hasMainline ? 84 : 61;
  const nextOpponent =
    session.difficulty === "王者"
      ? "你这么说不就是觉得自己最委屈吗？我们都得围着你转？"
      : "行，那你说怎么办？反正别什么都算我头上。";

  return {
    id: Date.now(),
    userReply,
    score,
    strengths: hasMainline
      ? "你没有被“较真”这个标签带偏，能把话题拉回公共规则。"
      : "你有表达不满，但主线还可以更明确。",
    problems: hasMainline
      ? "可以再补一句具体要求，比如什么时候处理、谁负责哪部分。"
      : "容易陷入解释自己为什么生气，对方会继续抓你的情绪做文章。",
    optimized:
      "重点不是我较不较真，而是公共空间要有基本规则。你可以不喜欢被提醒，但这部分确实需要处理。我们现在只定一件事：今天谁来收拾、以后怎么轮。",
    nextOpponent
  };
}

export const realtimeRecords = [
  {
    type: "临时代吵记录",
    scene: "商家扯皮",
    time: "今天 14:20",
    goal: "争取权益",
    rounds: 4,
    summary: "最后生成了强硬版：请给明确处理方案，不要继续转移责任。"
  },
  {
    type: "专属嘴替记录",
    scene: "室友沟通",
    time: "昨天 22:10",
    goal: "保持关系但说清边界",
    rounds: 3,
    summary: "最后生成了像本人版：我不是要闹大，但这件事需要被认真听见。"
  },
  {
    type: "吵架训练记录",
    scene: "宿舍卫生大战",
    time: "周一 19:35",
    goal: "主线守护训练",
    rounds: 5,
    summary: "最终评分 84，主线清楚，建议补充具体要求。"
  }
];
