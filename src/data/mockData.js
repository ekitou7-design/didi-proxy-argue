export const navItems = [
  { key: "home", label: "首页", mark: "首" },
  { key: "temp", label: "代吵", mark: "吵" },
  { key: "training", label: "训练", mark: "练" },
  { key: "profile", label: "我的", mark: "我" }
];

export const features = [
  {
    key: "temp",
    title: "临时代吵",
    desc: "填场景、填诉求，直接生成能发出去的回复。",
    tone: "急救包",
    color: "pink"
  },
  {
    key: "persona",
    title: "专属嘴替",
    desc: "贴聊天记录，生成更像你本人、更有分寸的回复。",
    tone: "熟人局",
    color: "blue"
  },
  {
    key: "training",
    title: "吵架训练场",
    desc: "小游戏式对练，练逻辑、练气势、练边界。",
    tone: "开练",
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
  chatLog:
    "我：你今天又临时改时间，我有点不舒服。\n对方：我不是说了吗，我很忙啊，你能不能别这么敏感？\n我：我不是不能理解你忙，但你每次都这样。",
  latest: "你怎么又开始了？我真的很累，不想吵。",
  state: "有点委屈，也有点生气，但不想把关系搞僵。",
  realMessage: "我希望对方知道我不是无理取闹，我是在意被尊重和提前沟通。",
  goal: "让对方认真回应我，之后不要总是临时变卦。"
};

export function buildPersonaReplyResult(form) {
  const latest = form.latest || "对方最新一句话";
  const state = form.state || "我现在的状态";
  const realMessage = form.realMessage || "我真实想表达的内容";
  const goal = form.goal || "我希望达到的效果";

  return {
    styleAnalysis:
      "你的表达风格偏克制，会先解释自己的感受，再补充理由；你不太想把话说绝，但会反复强调“我不是不理解你”。适合用更短的句子把委屈、边界和期待说清楚。",
    mainLine: `不要顺着“${latest}”去证明自己不是在吵，而是把重点拉回：我现在的状态是“${state}”，真正想说的是“${realMessage}”，希望最后走向“${goal}”。`,
    myVersion:
      "我不是想跟你吵，也不是不理解你累。但我真的会在意这种临时改变，因为这会让我觉得我的时间和感受没有被放在心上。我想要的不是你立刻道歉，而是你能认真听我说完，以后如果有变化，提前跟我讲清楚。",
    softer:
      "我知道你现在很累，我也不想继续把气氛弄得更僵。但这件事对我确实有影响，所以我希望你不是把它当成我又在闹，而是能听听我为什么会不舒服。",
    harder:
      "我可以理解你累，但不能接受每次问题一出现，就变成我“又开始了”。我表达不舒服，不是在找事，而是在告诉你这件事已经反复影响到我了。你可以累，但不能用累来跳过我的感受。",
    pause:
      "我们先暂停一下吧。我现在有情绪，你也很累，继续说下去很容易互相伤人。等我们都冷静一点，再把这件事认真说完。"
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
