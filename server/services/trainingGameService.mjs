import { requestJsonFromAI } from "../openaiClient.mjs";

const insultPattern = /傻子|滚|废物|神经病|闭嘴|有病|脑子|蠢|垃圾|白痴|傻逼|sb|去死/i;
const boundaryPattern = /我不接受|不接受|到此为止|请你|不要再|别再|先别|不要|停止|边界|正面回应|别转移|不要转移|别把|不能|别拿|别用/;
const mainlinePattern = /问题不是|核心|重点|事实|影响|诉求|要求|边界|责任|处理|解决|承诺|约定|规则|失约|冷暴力|甩锅|偷换|回避|正面回应/;
const responsePattern = /你刚才|你说|这句话|不是.*是|别把|别说|我说的是|现在说的是|你现在/;
const counterTacticPattern = /甩锅|偷换概念|冷处理|冷暴力|阴阳|贴标签|上纲上线|小题大做|敏感|转移|回避|道德绑架|情绪/;

export async function handleTrainingGameReply(input = {}) {
  const normalizedInput = normalizeTrainingGameInput(input);

  if (normalizedInput.forceEnd) {
    return finishGame(normalizedInput, 0, "你手动结束了本轮，按当前说服度结算。", "");
  }

  const userReply = latestUserReply(normalizedInput.messages);
  if (!userReply) {
    const error = new Error("user reply is required");
    error.status = 400;
    throw error;
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await requestJsonFromAI({
        ...buildTrainingGamePrompt(normalizedInput),
        temperature: 0.35,
        maxCompletionTokens: 1200
      });
      return normalizeAiTrainingGameResult(result, normalizedInput);
    } catch (error) {
      console.error("[training/reply] AI failed, using local judge:", error);
    }
  }

  return localTrainingGameReply(normalizedInput, userReply);
}

export function normalizeTrainingGameInput(input = {}) {
  const maxRounds = clampNumber(input.maxRounds || 5, 1, 8);
  return {
    scene: textOf(input.scene),
    difficulty: normalizeDifficulty(input.difficulty),
    goal: textOf(input.goal) || "守住主线，清楚表达诉求和边界。",
    round: clampNumber(input.round || 1, 1, maxRounds),
    maxRounds,
    persuasionScore: clampNumber(input.persuasionScore, 0, 100),
    forceEnd: Boolean(input.forceEnd),
    offTrackStreak: clampNumber(input.offTrackStreak, 0, 10),
    mainline: input.mainline && typeof input.mainline === "object" ? input.mainline : {},
    messages: Array.isArray(input.messages)
      ? input.messages
          .map((item) => ({
            role: item?.role === "user" ? "user" : "assistant",
            content: textOf(item?.content)
          }))
          .filter((item) => item.content)
          .slice(-12)
      : []
  };
}

function localTrainingGameReply(input, userReply) {
  const evaluation = evaluateReply(input, userReply);
  const nextScore = clampNumber(input.persuasionScore + evaluation.delta, 0, 100);
  const offTrackStreak = evaluation.seriousOffTrack ? input.offTrackStreak + 1 : 0;
  const opponentState = getOpponentState(nextScore);
  const shouldFinish = nextScore >= 100 || input.round >= input.maxRounds || offTrackStreak >= 2;
  const assistantMessage = shouldFinish
    ? buildFinalOpponentMessage(input, nextScore, opponentState, offTrackStreak)
    : buildOpponentMessage(input, nextScore, opponentState);

  if (shouldFinish) {
    return finishGame(input, evaluation.delta, evaluation.feedback, assistantMessage, {
      persuasionScore: nextScore,
      opponentState,
      offTrackStreak,
      forcedLose: offTrackStreak >= 2
    });
  }

  return {
    gameState: "playing",
    assistantMessage,
    round: input.round + 1,
    maxRounds: input.maxRounds,
    persuasionScore: nextScore,
    persuasionDelta: evaluation.delta,
    feedback: evaluation.feedback,
    opponentState,
    offTrackStreak,
    review: null
  };
}

function evaluateReply(input, userReply) {
  const text = userReply.replace(/\s/g, "");
  const lastOpponent = latestAssistantMessage(input.messages);
  const whole = `${userReply} ${input.goal} ${input.scene}`;

  const hasInsult = insultPattern.test(userReply);
  const hasBoundary = boundaryPattern.test(userReply);
  const hasMainline = mainlinePattern.test(whole);
  const responds = responsePattern.test(userReply) || sharesMeaning(userReply, lastOpponent);
  const countersTactic = counterTacticPattern.test(userReply);
  const clearLogic = /不是.*是|先.*再|事实|因为|所以|请你|现在要/.test(userReply) || hasMainline;
  const concise = text.length >= 12 && text.length <= 70;
  const tooLong = text.length > 120;
  const tooShort = text.length < 6;

  let raw = 0;
  raw += hasMainline ? 20 : /问题|责任|约定|处理|回应/.test(userReply) ? 10 : -10;
  raw += responds ? 15 : text.length > 0 ? 5 : -5;
  raw += hasBoundary ? 15 : /请|别|不要|需要/.test(userReply) ? 5 : 0;
  raw += clearLogic ? 15 : /你|我|这/.test(userReply) ? 5 : -5;
  raw += concise ? 10 : tooLong ? -5 : tooShort ? -5 : 3;
  raw += hasInsult ? -20 : /气死|烦|服了/.test(userReply) ? 3 : 10;
  raw += countersTactic ? 15 : 0;

  const difficultyPenalty = input.difficulty === "hard" ? 12 : input.difficulty === "medium" ? 4 : 0;
  const delta = clampNumber(raw - difficultyPenalty, -20, 35);
  const seriousOffTrack = hasInsult || (!hasMainline && !responds) || (tooShort && !hasBoundary);
  const feedback = buildFeedback(delta, { hasMainline, responds, hasBoundary, clearLogic, concise, hasInsult, countersTactic });
  return { delta, feedback, seriousOffTrack };
}

function finishGame(input, persuasionDelta, feedback, assistantMessage, override = {}) {
  const persuasionScore = clampNumber(override.persuasionScore ?? input.persuasionScore, 0, 100);
  const opponentState = override.opponentState || getOpponentState(persuasionScore);
  const result = override.forcedLose ? "lose" : getResult(persuasionScore);
  const review = buildReview(input, persuasionScore, result, override.forcedLose);

  return {
    gameState: "finished",
    assistantMessage: assistantMessage || buildFinalOpponentMessage(input, persuasionScore, opponentState, override.offTrackStreak || 0),
    round: Math.min(input.round, input.maxRounds),
    maxRounds: input.maxRounds,
    persuasionScore,
    persuasionDelta,
    feedback,
    opponentState,
    offTrackStreak: override.offTrackStreak ?? input.offTrackStreak,
    review
  };
}

function buildReview(input, persuasionScore, result, forcedLose = false) {
  const lastUser = latestUserReply(input.messages);
  const score = result === "win" ? Math.max(80, persuasionScore) : result === "draw" ? Math.max(55, persuasionScore) : persuasionScore;
  const resultText = getResultText(result, forcedLose);
  const betterReply = buildBetterReply(input, lastUser);

  return {
    score: clampNumber(score, 0, 100),
    result,
    goalAchieved: result === "win",
    persuasionScore,
    summary: resultText,
    keyWinningPoint:
      result === "win"
        ? "把问题从情绪争吵拉回行为责任。"
        : result === "draw"
          ? "打中了几个点，但收口还不够狠。"
          : "主线没守住，对方把责任转成了你的情绪。",
    goodPoints: buildGoodPoints(lastUser),
    problems: buildProblems(lastUser, result),
    betterReply,
    nextAdvice:
      result === "win"
        ? "下一轮继续练短句压制，别解释太多。"
        : result === "draw"
          ? "下一轮先打事实，再补边界。"
          : "下一轮只抓一个点：事实、影响、要求。"
  };
}

function buildTrainingGamePrompt(input) {
  return {
    system: `
你是“吵架训练场”的对手和裁判。只输出 JSON。
你要判断用户回复、更新 persuasionScore，并决定继续还是结束。
禁止威胁、歧视、隐私曝光、严重人身攻击、违法内容。
复盘短、准、像教练，不要鸡汤。
`,
    user: `
输入：
${JSON.stringify(input, null, 2)}

评分规则：
- 抓住核心矛盾 +20 / 部分 +10 / 跑偏 -10
- 回应对方刚才的话 +15 / 部分 +5 / 无视 -5
- 清晰边界 +15 / 模糊 +5 / 没有 0
- 逻辑清楚 +15 / 一般 +5 / 混乱 -5
- 简短有力 +10 / 太长但能懂 +3 / 废话太多 -5
- 情绪稳定 +10 / 有点冲 +3 / 失控辱骂 -20
- 反制话术 +15 / 没有 0
每轮 delta 最高 35，最低 -20。不要随机给分。

opponentState：
0-29 strong；30-59 wavering；60-79 defensive；80-99 nearly_convinced；100 convinced。
结束条件：persuasionScore>=100，或 round>=maxRounds，或连续 2 轮严重跑偏/失控，或 forceEnd。

返回 JSON：
{
  "gameState": "playing | finished",
  "assistantMessage": "",
  "round": 1,
  "maxRounds": 5,
  "persuasionScore": 0,
  "persuasionDelta": 0,
  "feedback": "",
  "opponentState": "strong | wavering | defensive | nearly_convinced | convinced",
  "offTrackStreak": 0,
  "review": null
}
finished 时 review 必须是：
{
  "score": 0,
  "result": "win | draw | lose",
  "goalAchieved": false,
  "persuasionScore": 0,
  "summary": "",
  "keyWinningPoint": "",
  "goodPoints": [],
  "problems": [],
  "betterReply": "",
  "nextAdvice": ""
}
`
  };
}

function normalizeAiTrainingGameResult(result, input) {
  const localFallback = localTrainingGameReply(input, latestUserReply(input.messages));
  if (!result || typeof result !== "object" || Array.isArray(result)) return localFallback;

  const persuasionDelta = clampNumber(result.persuasionDelta, -20, 35);
  const persuasionScore = clampNumber(result.persuasionScore, 0, 100);
  const gameState = result.gameState === "finished" ? "finished" : "playing";
  const opponentState = ["strong", "wavering", "defensive", "nearly_convinced", "convinced"].includes(result.opponentState)
    ? result.opponentState
    : getOpponentState(persuasionScore);

  if (gameState === "finished") {
    return {
      gameState,
      assistantMessage: textOf(result.assistantMessage) || localFallback.assistantMessage,
      round: clampNumber(result.round || input.round, 1, input.maxRounds),
      maxRounds: input.maxRounds,
      persuasionScore,
      persuasionDelta,
      feedback: textOf(result.feedback) || localFallback.feedback,
      opponentState,
      offTrackStreak: clampNumber(result.offTrackStreak, 0, 10),
      review: normalizeReview(result.review, input, persuasionScore)
    };
  }

  return {
    gameState,
    assistantMessage: textOf(result.assistantMessage) || localFallback.assistantMessage,
    round: clampNumber(result.round || input.round + 1, 1, input.maxRounds),
    maxRounds: input.maxRounds,
    persuasionScore,
    persuasionDelta,
    feedback: textOf(result.feedback) || localFallback.feedback,
    opponentState,
    offTrackStreak: clampNumber(result.offTrackStreak, 0, 10),
    review: null
  };
}

function normalizeReview(review, input, persuasionScore) {
  if (!review || typeof review !== "object" || Array.isArray(review)) {
    return buildReview(input, persuasionScore, getResult(persuasionScore));
  }
  const result = ["win", "draw", "lose"].includes(review.result) ? review.result : getResult(persuasionScore);
  return {
    score: clampNumber(review.score, 0, 100),
    result,
    goalAchieved: Boolean(review.goalAchieved),
    persuasionScore,
    summary: textOf(review.summary) || getResultText(result),
    keyWinningPoint: textOf(review.keyWinningPoint),
    goodPoints: arrayOfText(review.goodPoints).slice(0, 3),
    problems: arrayOfText(review.problems).slice(0, 3),
    betterReply: textOf(review.betterReply),
    nextAdvice: textOf(review.nextAdvice)
  };
}

function buildOpponentMessage(input, score, state) {
  const sceneText = `${input.scene} ${input.goal}`;
  const pools = opponentPoolsForDifficulty(input.difficulty);
  const source = pools[state] || pools.strong;
  const offset = stableIndex(`${input.round}-${score}-${sceneText}`, source.length);
  return source[offset];
}

function opponentPoolsForDifficulty(difficulty) {
  if (difficulty === "easy") {
    return {
      strong: ["我不是故意的，但你这么说我也听到了。", "这事可能确实是我没处理好，你先说你希望我怎么补。"],
      wavering: ["行，这次我确实有点没顾上。", "你这么说我能理解一点，那我应该怎么补？"],
      defensive: ["好，我承认这次没提前说清楚。", "这点我接到了，我之后会注意。"],
      nearly_convinced: ["好吧，这点确实是我没考虑周到。"],
      convinced: ["行，这次是我没处理好。以后我会提前说清楚，不让你一直等。"]
    };
  }
  if (difficulty === "hard") {
    return {
      strong: [
        "你现在说得好像全是我的问题，但你自己就一点责任没有吗？",
        "你别把责任都扣我头上，我也不是故意让事情变成这样。",
        "你现在抓着这个点不放，不就是想证明我很差吗？"
      ],
      wavering: [
        "行，就算我这次没处理好，你也没必要把以前的账都翻出来吧。",
        "我可以承认一部分，但你这个说法也太绝对了。",
        "你说边界可以，但别把我说得像完全不在乎你一样。"
      ],
      defensive: [
        "我承认这次没提前说清楚，但你也别把我的动机想得那么坏。",
        "这件事我可以补，但你不能把所有问题都压到我一个人身上。",
        "好，我知道你在意这个点，但我也不接受你把话说死。"
      ],
      nearly_convinced: [
        "好吧，这个点我确实没法反驳，是我处理得不够好。",
        "你说的这部分我认，确实应该提前讲清楚。"
      ],
      convinced: ["行，这次是我没处理好。以后我会提前说清楚，不让你一直等。"]
    };
  }
  return {
    strong: [
      "你别把问题说得这么严重，我又不是故意的。",
      "我觉得你现在就是在放大这件事，没必要这样。",
      "你先别急着扣帽子，我也有我的理由。"
    ],
    wavering: [
      "行，就算我这次没处理好，但你也没必要这么上纲上线吧。",
      "我承认有点问题，但你说得像我故意针对你一样。",
      "那你说我要怎么做？我也不是完全不听。"
    ],
    defensive: [
      "我承认我这次确实没提前说清楚，但你刚才那个语气也挺冲的。",
      "这点我可以补，但你不能把之前所有事都算到这一次。",
      "好，我知道你在意的是这个，但我也不想被说成完全不负责。"
    ],
    nearly_convinced: [
      "好吧，这点我确实没考虑到你的感受。",
      "你这么说我能明白，这次确实是我处理得不好。",
      "行，这次我认，我应该提前说清楚。"
    ],
    convinced: ["行，这次是我没处理好。以后我会提前说清楚，不让你一直等。"]
  };
}

function buildFinalOpponentMessage(input, score, state, offTrackStreak) {
  if (offTrackStreak >= 2) return "你现在一直在发泄，我反而不用回应事情本身了。";
  if (score >= 100) return "行，这次是我没处理好。以后我会提前说清楚，不让你一直等。";
  if (score >= 80) return "好，这个问题我认。你说的点我接到了。";
  if (score >= 50) return "我能懂你在说什么，但我还没觉得全是我的问题。";
  return "你说了半天还是在情绪里，我不觉得你把问题讲清楚了。";
}

function buildFeedback(delta, flags) {
  const prefix = delta >= 0 ? `+${delta}` : `${delta}`;
  if (flags.hasInsult) return `${prefix}：情绪失控，对方会抓住这点反打。`;
  if (flags.hasMainline && flags.hasBoundary && flags.countersTactic) return `${prefix}：抓住核心，也拆了对方的话术。`;
  if (flags.hasMainline && flags.hasBoundary) return `${prefix}：核心抓对了，边界也清楚。`;
  if (flags.hasMainline) return `${prefix}：回应到了问题，但收口还可以更短。`;
  if (!flags.responds) return `${prefix}：没有接住对方刚才的话，容易被带偏。`;
  return `${prefix}：有回应，但主线和边界还不够硬。`;
}

function buildBetterReply(input, lastUser) {
  const mainline = input.mainline || {};
  const fact = textOf(mainline.fact) || "问题不是我的态度，是这件事本身没有被处理";
  const request = textOf(mainline.request) || "请你正面回应并给出具体做法";
  const boundary = textOf(mainline.boundary) || "别再把责任推成我的情绪";
  if (insultPattern.test(lastUser)) {
    return `${fact}。${request}。${boundary}。`;
  }
  return `别把重点转走。${fact}。我现在要的是：${request}。${boundary}。`;
}

function buildGoodPoints(lastUser) {
  const points = [];
  if (mainlinePattern.test(lastUser)) points.push("抓住核心");
  if (boundaryPattern.test(lastUser)) points.push("边界清楚");
  if (!insultPattern.test(lastUser)) points.push("没有无效辱骂");
  return points.length ? points.slice(0, 3) : ["敢于正面回应"];
}

function buildProblems(lastUser, result) {
  const problems = [];
  if (!mainlinePattern.test(lastUser)) problems.push("主线不够明确");
  if (!boundaryPattern.test(lastUser)) problems.push("边界不够硬");
  if ((lastUser || "").replace(/\s/g, "").length > 90) problems.push("话太长");
  if (insultPattern.test(lastUser)) problems.push("情绪失控");
  if (!problems.length && result !== "win") problems.push("可以再短一点");
  return problems.slice(0, 3);
}

function getOpponentState(score) {
  if (score >= 100) return "convinced";
  if (score >= 80) return "nearly_convinced";
  if (score >= 60) return "defensive";
  if (score >= 30) return "wavering";
  return "strong";
}

function getResult(score) {
  if (score >= 80) return "win";
  if (score >= 50) return "draw";
  return "lose";
}

function getResultText(result, forcedLose = false) {
  if (forcedLose) return "你被带偏了。对方把问题从责任转成了情绪。";
  if (result === "win") return "你吵赢了。对方已经没话说了。";
  if (result === "draw") return "打平。你有几个点打中了，但还没彻底压住。";
  return "你被带偏了。对方把问题从责任转成了情绪。";
}

function latestUserReply(messages) {
  return [...(messages || [])].reverse().find((item) => item.role === "user")?.content || "";
}

function latestAssistantMessage(messages) {
  return [...(messages || [])].reverse().find((item) => item.role === "assistant")?.content || "";
}

function sharesMeaning(reply, opponent) {
  if (!reply || !opponent) return false;
  const keys = ["敏感", "小事", "责任", "约定", "失约", "规则", "处理", "冷暴力", "朋友", "钱", "工作", "卫生"];
  return keys.some((key) => reply.includes(key) && opponent.includes(key));
}

function normalizeDifficulty(value) {
  const text = textOf(value);
  if (/黄金|王者|hard|困难|高/.test(text)) return "hard";
  if (/青铜|easy|简单|低/.test(text)) return "easy";
  return "medium";
}

function stableIndex(text, length) {
  if (!length) return 0;
  return Array.from(text || "").reduce((total, char) => total + char.charCodeAt(0), 0) % length;
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function arrayOfText(value) {
  return Array.isArray(value) ? value.map(textOf).filter(Boolean) : [];
}

function textOf(value) {
  return typeof value === "string" ? value.trim() : "";
}
