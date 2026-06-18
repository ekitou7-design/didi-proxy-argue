import { buildTrainingScorePrompt } from "../prompts.mjs";
import { isDemoMode, requestJsonFromAI } from "../openaiClient.mjs";

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

  try {
    const result = await requestJsonFromAI({
      ...buildTrainingScorePrompt(normalizedInput),
      temperature: 0.35,
      maxCompletionTokens: 1200
    });

    return normalizeTrainingScoreResult(result);
  } catch (error) {
    console.error("[training/score] AI client failed:", error);
    if (isDemoMode()) return { ...mockScoreTrainingReply(normalizedInput), source: "fallback" };
    throw error;
  }
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
    trainingFocus: Array.isArray(input.trainingFocus) ? input.trainingFocus : [],
    history: Array.isArray(input.history)
      ? input.history
          .map((item) => ({
            userReply: textOf(item?.userReply),
            opponentMessage: textOf(item?.opponentMessage)
          }))
          .filter((item) => item.userReply || item.opponentMessage)
          .slice(-6)
      : []
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
    source: "ai",
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
  const context = analyzeTrainingContext(input, userReply);
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
    advantages: buildAdvantages({ hasInsult, hasEvidence, hasBoundary, hasMainline, isTooShort }, context),
    weaknesses: buildWeaknesses({ hasInsult, hasEvidence, hasBoundary, hasMainline, isTooShort }, context),
    analysis: buildAdvantages({ hasInsult, hasEvidence, hasBoundary, hasMainline, isTooShort }, context),
    suggestion: buildWeaknesses({ hasInsult, hasEvidence, hasBoundary, hasMainline, isTooShort }, context),
    betterReply: buildBetterReply(input, { hasInsult, hasEvidence, hasBoundary, hasMainline, isTooShort }, context),
    nextOpponentMessage: buildNextOpponentMessage(input, { hasInsult, hasBoundary, hasEvidence }, context),
    isOffTopic: !hasMainline && !hasEvidence && !hasBoundary
  };
}

function buildAdvantages(flags, context = {}) {
  if (flags.hasInsult) return "情绪有表达出来，对方能感受到你不接受这件事。";
  if (flags.hasEvidence && flags.hasBoundary) {
    return `你一边追问“${context.tacticLabel}”里的具体依据，一边把边界立住了，对方比较难继续把话题绕开。`;
  }
  if (flags.hasEvidence) return `你开始要求对方把话说具体，这能压住${context.tacticLabel}，也能逼对方回到事实。`;
  if (flags.hasBoundary) return `你有明确的边界表达，尤其适合这个${context.sceneLabel}场景，不容易被对方一句“${context.opponentHook}”带跑。`;
  if (flags.hasMainline) return `你抓到了${context.mainlineLabel}这条主线，没有完全陷入对方设置的情绪互怼。`;
  if (flags.isTooShort) return "回复很短，气势直接，适合先打断对方节奏，但信息量还不够。";
  return `你表达了不满，已经开始从“谁态度不好”往${context.mainlineLabel}上拉。`;
}

function buildWeaknesses(flags, context = {}) {
  if (flags.hasInsult) return "纯辱骂容易被对方抓住你失控，主线、证据和诉求都会被盖过去。";
  if (flags.isTooShort) return "回复太短，事实、影响、诉求和边界都不够完整，对方还有空间继续打太极。";
  if (!flags.hasBoundary && !flags.hasMainline) return `还需要补上明确边界和具体诉求，否则对方可能继续用${context.tacticLabel}转移责任。`;
  if (!flags.hasBoundary) return `可以再补一句“我不接受什么”，并点名你要对方做的下一步：${context.defaultRequest}。`;
  if (!flags.hasEvidence && !flags.hasMainline) return `可以要求对方给出具体事实，不要只接住“${context.opponentHook}”这种情绪评价。`;
  return `可以把句子再压短一点，围绕${context.mainlineLabel}先说事实、再说影响、最后给要求，攻击力会更集中。`;
}

function buildBetterReply(input, flags = {}, context = {}) {
  const mainline = input.mainline || {};
  const fact = textOf(mainline.fact) || context.fact;
  const impact = textOf(mainline.impact) || context.impact;
  const request = textOf(mainline.request) || context.defaultRequest;
  const boundary = textOf(mainline.boundary) || context.boundary;

  if (flags.hasInsult) {
    return `我不靠骂人解决这件事。${fact}，${impact}。你需要正面回应：${request}。${boundary}。`;
  }
  if (flags.isTooShort) {
    return `${fact}。这已经带来了影响：${impact}。我现在的要求很明确，${request}；同时，${boundary}。`;
  }
  if (flags.hasEvidence && !flags.hasBoundary) {
    return `你先把话说具体。${fact}，${impact}。请你说明依据，并给出处理方式：${request}。${boundary}。`;
  }
  if (flags.hasBoundary && !flags.hasEvidence) {
    return `我不接“${context.opponentHook}”这个说法。${fact}，${impact}。你可以不同意我的感受，但要正面回应：${request}。${boundary}。`;
  }
  if (flags.hasMainline) {
    return `${fact}。重点不是互相评价态度，而是${context.mainlineLabel}。${impact}，所以我需要你现在给出明确回应：${request}。`;
  }
  return `先回到这件事本身：${fact}。${impact}。我现在要的是：${request}。${boundary}。`;
}

function buildNextOpponentMessage(input, flags, context = {}) {
  const scenarioText = `${input.scenario} ${input.opponentMessage} ${input.opponentType} ${context.sceneLabel || ""}`;
  const used = new Set((input.history || []).map((item) => item.opponentMessage).filter(Boolean));
  const pools = [];

  if (flags.hasInsult) {
    pools.push([
      "你看，你现在就开始骂人了，那还有什么好沟通的？",
      "你一急就开始攻击人，这事还能讲清楚吗？",
      "你先把情绪收一收吧，不然说什么都没意义。"
    ]);
  }
  if (flags.hasBoundary) {
    pools.push([
      context.boundaryPushback,
      "你一直说边界，那你具体要我怎么补救？",
      "我也不是不听，但你别把话说得像我故意的一样。"
    ]);
  }
  if (flags.hasEvidence) {
    pools.push([
      context.evidencePushback,
      "你非要我一条条列出来，这不就是在钻字眼吗？",
      "你现在抓证据，那我的感受就不算了吗？"
    ]);
  }
  if (/客户|客服|售后|退款|商家|规则/.test(scenarioText)) {
    pools.push([
      context.defaultPushback,
      "规则就是这样，我也只能按流程处理，你一直说也没用。",
      "你要是觉得不满意可以继续投诉，但现在我这边就是这个结果。",
      "我们不是不给你处理，是你这个情况确实不符合条件。"
    ]);
  }
  if (/工作|职场|项目|同事|小组|交付|延期/.test(scenarioText)) {
    pools.push([
      context.defaultPushback,
      "那你现在说这些也没用啊，事情已经这样了，别什么都算我头上。",
      "项目又不是我一个人的，你别把责任都推给我。",
      "你要早说标准这么高，我一开始就不会这么做。"
    ]);
  }
  if (/情侣|男友|女友|对象|冷战|约|敏感|亲密关系/.test(scenarioText)) {
    pools.push([
      context.defaultPushback,
      "本来没多大的事，你现在这样一说反而显得我好像多过分一样。",
      "我不是不在乎你，但你每次都这样追着说，我也会累。",
      "我都解释了，你还要一直抓着这个点不放吗？"
    ]);
  }
  if (/室友|宿舍|合租|卫生|公共/.test(scenarioText)) {
    pools.push([
      context.defaultPushback,
      "宿舍又不是我一个人的，你也别说得好像全是我的问题。",
      "我不是不做，只是今天确实没顾上，你没必要这么上纲上线。",
      "你提醒可以，但别每次都像在审我一样。"
    ]);
  }

  pools.push([
    context.defaultPushback,
    "我不是这个意思，你别老把话往最严重的方向理解。",
    "那你说这么多，最后不还是觉得全是我的问题吗？",
    "你现在这样逼我表态，我反而不知道该怎么接了。"
  ]);

  const options = pools.flat().map(textOf).filter(Boolean);
  const offset = ((input.round || 1) + stableJitter(`${input.userReply} ${input.opponentMessage}`)) % options.length;
  const ordered = [...options.slice(offset), ...options.slice(0, offset)];
  return ordered.find((item) => !used.has(item) && item !== input.opponentMessage) || ordered[0];
}

function analyzeTrainingContext(input = {}, userReply = "") {
  const combined = `${input.scenario} ${input.opponentMessage} ${userReply}`;
  const opponentHook = extractOpponentHook(input.opponentMessage);
  const tacticLabel = detectOpponentTactic(input.opponentMessage);

  if (/客户|客服|商家|退款|售后|质量|规则/.test(combined)) {
    return {
      sceneLabel: "售后扯皮",
      tacticLabel,
      opponentHook,
      mainlineLabel: "责任归属和处理方案",
      fact: "现在争议点是商品或服务问题怎么处理，不是我有没有看规则",
      impact: "你一直把责任推回给我，却没有给出可执行的处理方案",
      defaultRequest: "请明确退款、补发、维修或升级处理的具体方案和时间",
      boundary: "不要再用规则两个字替代正面处理",
      evidencePushback: "规则就是规则啊，你不能只挑对自己有利的部分看吧？",
      boundaryPushback: "你这么说也没用，我们这边就是按流程处理。",
      defaultPushback: "那你现在一直说影响，也得看平台规则啊。"
    };
  }

  if (/工作|职场|项目|同事|任务|交付|延期|客户/.test(combined)) {
    return {
      sceneLabel: "职场甩锅",
      tacticLabel,
      opponentHook,
      mainlineLabel: "任务责任和补救动作",
      fact: "现在的问题是交付已经被影响，责任和补救动作需要说清楚",
      impact: "你把问题说成大家都有责任，会让后续排期和对外解释继续失真",
      defaultRequest: "请明确你负责补哪一部分、什么时候交、需要谁配合",
      boundary: "不要再把我的要求高当成你不交付的理由",
      evidencePushback: "你说得好像全是我一个人的问题，那之前沟通的时候你怎么不说？",
      boundaryPushback: "行，那你列这么细，是不是以后所有锅都算我头上？",
      defaultPushback: "现在追这个责任有什么意义，先把事情做完不行吗？"
    };
  }

  if (/室友|宿舍|卫生|公共|噪音|水电|合租/.test(combined)) {
    return {
      sceneLabel: "室友规则冲突",
      tacticLabel,
      opponentHook,
      mainlineLabel: "公共规则和轮流责任",
      fact: "现在的问题是公共空间的规则没有被稳定执行",
      impact: "你把提醒说成我事多，会让该轮到谁做这件事永远说不清",
      defaultRequest: "请按之前说好的规则把这次该做的部分补上",
      boundary: "不要再把公共责任转成对我性格的评价",
      evidencePushback: "你也不是每次都做得很好吧，怎么就只盯着我？",
      boundaryPushback: "你要这么计较，那以后大家都别舒服了。",
      defaultPushback: "宿舍又不是只有我一个人，你别说得好像全是我的问题。"
    };
  }

  if (/男朋友|女朋友|对象|恋爱|暧昧|约|消息|敏感|分手/.test(combined)) {
    return {
      sceneLabel: "亲密关系拉扯",
      tacticLabel,
      opponentHook,
      mainlineLabel: "约定、感受和尊重",
      fact: "现在的问题是之前说好的约定被临时改变了",
      impact: "你把我的反馈说成敏感，会让我觉得这件事没有被认真对待",
      defaultRequest: "请正面回应这次改约，并说明以后类似情况怎么提前沟通",
      boundary: "不要再用“你又来了”来代替解释和道歉",
      evidencePushback: "我又不是故意的，你非要把一次临时情况说这么严重吗？",
      boundaryPushback: "行，那我以后是不是做什么都得先跟你报备？",
      defaultPushback: "我都说了不是故意的，你还想让我怎么样？"
    };
  }

  return {
    sceneLabel: "日常冲突",
    tacticLabel,
    opponentHook,
    mainlineLabel: "事实、影响和下一步处理",
    fact: "现在的问题不是谁声音更大，而是这件事本身需要被处理",
    impact: "你刚才的说法把责任推走了，也没有回应下一步怎么办",
    defaultRequest: "请正面说明接下来准备怎么解决",
    boundary: "不要再把问题转成我太敏感、太计较或态度不好",
    evidencePushback: "我说的是整体感觉啊，难道什么都要拿证据出来才算数？",
    boundaryPushback: "行，你说得这么严重，那你到底想让我怎么做？",
    defaultPushback: "本来没多大的事，你现在这样一说反而显得我好像多过分一样。"
  };
}

function detectOpponentTactic(text) {
  const value = textOf(text);
  if (/敏感|上纲上线|小事|又开始|计较/.test(value)) return "情绪标签";
  if (/规则|你自己|不是我|不关我|没看清/.test(value)) return "甩锅推责";
  if (/随便|算了|不想说|冷静/.test(value)) return "冷处理";
  if (/都怪我|你满意了|我还能怎么办/.test(value)) return "情绪勒索";
  if (/你也|凭什么|要求这么高|你来/.test(value)) return "反向追责";
  return "转移重点";
}

function extractOpponentHook(text) {
  const value = textOf(text).replace(/\s+/g, " ");
  if (!value) return "你刚才那句话";
  const sentence = value.split(/[。！？!?]/).find(Boolean) || value;
  return sentence.length > 18 ? `${sentence.slice(0, 18)}...` : sentence;
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
