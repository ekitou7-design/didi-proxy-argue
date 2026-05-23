import { buildTrainingScorePrompt } from "../prompts.mjs";
import { requestJsonFromAI } from "../openaiClient.mjs";

const insultPattern = /傻子|滚|废物|神经病|闭嘴|有病|脑子|蠢|垃圾|白痴|傻逼|sb/i;
const evidencePattern = /什么意思|证据|谁说的|具体指什么|哪一句|凭什么|怎么证明|说清楚|具体|依据/;
const boundaryPattern = /我不接受|不接受|到此为止|请你|不要再|别再|先别|不要|停止|边界|正面回应|别转移|不要转移|别把|而不是|不是一句/;
const mainlinePattern = /事实|影响|诉求|要求|边界|责任|处理|解决|客户|任务|承诺|约定|规则|主线|问题是|现在的问题/;

export async function scoreTrainingReply(input = {}) {
  const normalizedInput = normalizeTrainingScoreInput(input);

  if (!normalizedInput.userReply) {
    const error = new Error("userReply 不能为空");
    error.status = 400;
    throw error;
  }

  if (!process.env.OPENAI_API_KEY) {
    return mockScoreTrainingReply(normalizedInput);
  }

  const result = await requestJsonFromAI({
    ...buildTrainingScorePrompt(normalizedInput),
    temperature: 0.35,
    maxCompletionTokens: 1200
  });

  return normalizeTrainingScoreResult(result);
}

export function normalizeTrainingScoreInput(input = {}) {
  return {
    scenario: textOf(input.scenario),
    difficulty: textOf(input.difficulty),
    opponentType: textOf(input.opponentType),
    opponentMessage: textOf(input.opponentMessage),
    userReply: textOf(input.userReply),
    round: Number(input.round || 1),
    mainline: input.mainline && typeof input.mainline === "object" ? input.mainline : {},
    traps: Array.isArray(input.traps) ? input.traps : [],
    trainingFocus: Array.isArray(input.trainingFocus) ? input.trainingFocus : []
  };
}

export function normalizeTrainingScoreResult(result = {}) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    const error = new Error("AI returned invalid training score JSON");
    error.status = 502;
    throw error;
  }

  const scores = normalizeScores(result.scores || {});
  const overallScore = clampScore(result.overallScore ?? scores.winRate);

  return {
    scores,
    overallScore,
    advantages: textOf(result.advantages || result.analysis),
    weaknesses: textOf(result.weaknesses || result.suggestion),
    analysis: textOf(result.analysis || result.advantages),
    suggestion: textOf(result.suggestion || result.weaknesses),
    betterReply: textOf(result.betterReply),
    nextOpponentMessage: textOf(result.nextOpponentMessage),
    isOffTopic: Boolean(result.isOffTopic)
  };
}

export function mockScoreTrainingReply(input = {}) {
  const userReply = textOf(input.userReply);
  const hasInsult = insultPattern.test(userReply);
  const hasEvidence = evidencePattern.test(userReply);
  const hasBoundary = boundaryPattern.test(userReply);
  const hasMainline = mainlinePattern.test(userReply);
  const isTooShort = userReply.replace(/\s/g, "").length < 6;
  const jitter = stableJitter(userReply);

  let logic = 50 + jitter;
  let power = 52 + Math.floor(userReply.length / 12) + jitter;
  let boundary = 45 + jitter;
  let mainline = 46 + jitter;
  let risk = 42 - jitter;

  if (hasEvidence) {
    logic += 20;
    mainline += 14;
    risk -= 8;
  }
  if (hasBoundary) {
    boundary += 26;
    power += 8;
    risk -= 7;
  }
  if (hasMainline) {
    logic += 12;
    mainline += 22;
  }
  if (isTooShort) {
    logic -= 18;
    mainline -= 16;
    boundary -= 8;
  }
  if (hasInsult) {
    logic = 22 + jitter;
    boundary = 18 + jitter;
    mainline = 20 + jitter;
    power = 58 + jitter;
    risk = 86 - jitter;
  }

  logic = clampScore(logic);
  power = clampScore(power);
  boundary = clampScore(boundary);
  mainline = clampScore(mainline);
  risk = clampScore(risk);
  const winRate = clampScore(Math.round((logic + power + boundary + mainline + (100 - risk)) / 5));

  return {
    scores: { logic, power, boundary, mainline, risk, winRate },
    overallScore: winRate,
    advantages: buildAdvantages({ hasInsult, hasEvidence, hasBoundary, hasMainline, isTooShort }),
    weaknesses: buildWeaknesses({ hasInsult, hasEvidence, hasBoundary, hasMainline, isTooShort }),
    analysis: buildAdvantages({ hasInsult, hasEvidence, hasBoundary, hasMainline, isTooShort }),
    suggestion: buildWeaknesses({ hasInsult, hasEvidence, hasBoundary, hasMainline, isTooShort }),
    betterReply: buildBetterReply(input, { hasInsult, hasEvidence, hasBoundary, hasMainline, isTooShort }),
    nextOpponentMessage: buildNextOpponentMessage(input, { hasInsult, hasBoundary, hasEvidence }),
    isOffTopic: !hasMainline && !hasEvidence && !hasBoundary
  };
}

function buildAdvantages(flags) {
  if (flags.hasInsult) return "情绪有表达出来，对方能感受到你不接受这件事。";
  if (flags.hasEvidence && flags.hasBoundary) return "你既追问了具体依据，也设置了表达边界，不容易被对方带偏。";
  if (flags.hasEvidence) return "你开始要求对方把话说具体，这能压住模糊甩锅和阴阳怪气。";
  if (flags.hasBoundary) return "你有明确的边界表达，能让对方知道哪些说法你不接。";
  if (flags.hasMainline) return "你抓到了责任、处理或影响这些主线信息，没有完全陷入情绪互怼。";
  if (flags.isTooShort) return "回复很短，气势直接，但信息量还不够。";
  return "你表达了不满，已经开始把问题从情绪拉回事情本身。";
}

function buildWeaknesses(flags) {
  if (flags.hasInsult) return "纯辱骂容易被对方抓住你失控，主线、证据和诉求都会被盖过去。";
  if (flags.isTooShort) return "回复太短，事实、影响、诉求和边界都不够完整，对方还有空间继续打太极。";
  if (!flags.hasBoundary && !flags.hasMainline) return "还需要补上明确边界和具体诉求，否则对方可能继续转移责任。";
  if (!flags.hasBoundary) return "可以再补一句你不接受什么，以及希望对方接下来怎么做。";
  if (!flags.hasEvidence && !flags.hasMainline) return "可以要求对方给出具体事实，不要只接他的情绪评价。";
  return "可以把句子再压短一点，先事实、再影响、再要求，攻击力会更集中。";
}

function buildBetterReply(input, flags = {}) {
  const mainline = input.mainline || {};
  const fact = textOf(mainline.fact) || "现在的问题不是我的态度，而是这件事已经造成了实际影响";
  const impact = textOf(mainline.impact) || "你刚才的说法把责任推走了，也没有回应怎么处理";
  const request = textOf(mainline.request) || "请你正面说明接下来准备怎么解决";
  const boundary = textOf(mainline.boundary) || "不要再把问题转成我太敏感、太计较或态度不好";

  if (flags.hasInsult) {
    return `我不靠骂人解决这件事。${fact}，${impact}。你需要正面回应：${request}。${boundary}。`;
  }
  if (flags.isTooShort) {
    return `${fact}。这已经带来了影响：${impact}。我现在的要求很明确，${request}；同时，${boundary}。`;
  }
  if (flags.hasEvidence && !flags.hasBoundary) {
    return `你先把话说具体。${fact}，${impact}。请你说明依据，并给出处理方式：${request}。${boundary}。`;
  }
  return `你先别把重点转走。${fact}，${impact}。我现在要的是：${request}。${boundary}。`;
}

function buildNextOpponentMessage(input, flags) {
  if (flags.hasInsult) return "你看，你现在就开始骂人了，那还有什么好沟通的？";
  if (flags.hasBoundary) return "行，你说得这么严重，那你到底想让我怎么做？";
  if (flags.hasEvidence) return "我说的就是这个感觉啊，难道什么都要拿证据出来你才承认？";
  if (/客户|工作|职场|项目/.test(`${input.scenario} ${input.opponentMessage}`)) {
    return "那你现在说这些也没用啊，事情已经这样了，别什么都算我头上。";
  }
  return "本来没多大的事，你现在这样一说反而显得我好像多过分一样。";
}

function normalizeScores(scores) {
  return {
    logic: clampScore(scores.logic),
    power: clampScore(scores.power),
    boundary: clampScore(scores.boundary),
    mainline: clampScore(scores.mainline),
    risk: clampScore(scores.risk),
    winRate: clampScore(scores.winRate)
  };
}

function stableJitter(text) {
  const sum = Array.from(text || "").reduce((total, char) => total + char.charCodeAt(0), 0);
  return sum % 9;
}

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function textOf(value) {
  return typeof value === "string" ? value.trim() : "";
}
