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

  if (process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY) {
    try {
      const result = await requestJsonFromAI({
        ...buildTrainingGamePrompt(normalizedInput),
        temperature: 0.62,
        maxCompletionTokens: 1600
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
  const config = input.gameConfig && typeof input.gameConfig === "object" ? input.gameConfig : {};
  const gameConfig = normalizeGameConfig(config, input);
  const playerRole = roleFromConfig(gameConfig, gameConfig.playerRoleKey);
  const aiRole = roleFromConfig(gameConfig, gameConfig.aiRoleKey);
  return {
    scene: gameConfig.scene,
    gameConfig,
    roleA: gameConfig.roleA,
    roleB: gameConfig.roleB,
    playerRoleKey: gameConfig.playerRoleKey,
    aiRoleKey: gameConfig.aiRoleKey,
    playerRole,
    aiRole,
    playerIdentity: playerRole.name,
    aiIdentity: aiRole.name,
    aiDifficulty: textOf(input.aiDifficulty) || textOf(config.difficulty) || textOf(input.difficulty),
    difficulty: normalizeDifficulty(config.difficulty || input.difficulty),
    trainingGoals: gameConfig.trainingGoals,
    goal: gameConfig.trainingGoals.length ? gameConfig.trainingGoals.join("、") : textOf(input.goal) || "守住主线，清楚表达诉求和边界。",
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
  const roundScore = buildRoundScore(input, userReply, evaluation);
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
      roundScore,
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
    roundScore,
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
  return {
    delta,
    feedback,
    seriousOffTrack,
    flags: { hasMainline, responds, hasBoundary, clearLogic, concise, hasInsult, countersTactic, tooLong, tooShort }
  };
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
    roundScore: override.roundScore || null,
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

你正在扮演吵架训练场里的 AI 对手。

本局场景：
${input.scene}

玩家扮演：
${input.playerRole.name}
玩家角色描述：
${input.playerRole.description}
玩家角色目标：
${input.playerRole.goal}

你扮演：
${input.aiRole.name}
你的角色描述：
${input.aiRole.description}
你的角色目标：
${input.aiRole.goal}

你必须始终站在你的角色角度说话。
你不能替玩家说话。
你不能跳出场景。
你不能把对话变成辩论赛。
你要像真实生活中的吵架对象一样，根据难度进行反驳、推脱、追问、阴阳怪气或施压。
但不要使用辱骂、歧视、威胁、人身攻击等违规内容。

玩家的训练目标是：
${input.trainingGoals.join("、") || input.goal}

assistantMessage 只能是“${input.aiRole.name}”说出的话，不能输出玩家回复、不能替玩家总结观点、不能突然替玩家发言。
描述玩家时使用“玩家”或“${input.playerRole.name}”，不要用“我”来代指玩家。
禁止威胁、歧视、隐私曝光、严重人身攻击、违法内容。
复盘短、准、像教练，不要鸡汤。
对手回复要贴合场景和上一轮用户原话，允许 1-2 句，有具体反击点；不要每次都用“我不是故意的”“你别说得这么严重”这类模板句。
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
  "roundScore": {
    "scores": {
      "logic": 0,
      "power": 0,
      "boundary": 0,
      "mainline": 0,
      "risk": 0,
      "winRate": 0
    },
    "overallScore": 0,
    "advantages": "",
    "weaknesses": "",
    "suggestion": "",
    "betterReply": ""
  },
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
      roundScore: normalizeRoundScore(result.roundScore, localFallback.roundScore),
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
    roundScore: normalizeRoundScore(result.roundScore, localFallback.roundScore),
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

function normalizeRoundScore(roundScore, fallback) {
  if (!roundScore || typeof roundScore !== "object" || Array.isArray(roundScore)) return fallback || null;
  const scores = roundScore.scores && typeof roundScore.scores === "object" ? roundScore.scores : {};
  const fallbackScores = fallback?.scores || {};
  return {
    scores: {
      logic: clampNumber(scores.logic ?? fallbackScores.logic, 0, 100),
      power: clampNumber(scores.power ?? fallbackScores.power, 0, 100),
      boundary: clampNumber(scores.boundary ?? fallbackScores.boundary, 0, 100),
      mainline: clampNumber(scores.mainline ?? fallbackScores.mainline, 0, 100),
      risk: clampNumber(scores.risk ?? fallbackScores.risk, 0, 100),
      winRate: clampNumber(scores.winRate ?? fallbackScores.winRate, 0, 100)
    },
    overallScore: clampNumber(roundScore.overallScore ?? fallback?.overallScore, 0, 100),
    advantages: textOf(roundScore.advantages) || fallback?.advantages || "",
    weaknesses: textOf(roundScore.weaknesses) || fallback?.weaknesses || "",
    suggestion: textOf(roundScore.suggestion) || fallback?.suggestion || "",
    betterReply: textOf(roundScore.betterReply) || fallback?.betterReply || ""
  };
}

function buildRoundScore(input, userReply, evaluation) {
  const flags = evaluation.flags || {};
  const scores = {
    logic: clampNumber((flags.hasMainline ? 76 : 45) + (flags.clearLogic ? 12 : 0) + (flags.tooLong ? -8 : 0), 0, 100),
    power: clampNumber(56 + Math.max(evaluation.delta, -10) + (flags.concise ? 12 : 0) + (flags.hasInsult ? -15 : 0), 0, 100),
    boundary: clampNumber(flags.hasBoundary ? 82 : flags.hasMainline ? 58 : 38, 0, 100),
    mainline: clampNumber(flags.hasMainline ? 82 : flags.responds ? 55 : 32, 0, 100),
    risk: clampNumber(flags.hasInsult ? 88 : flags.tooLong ? 46 : flags.tooShort ? 52 : 24, 0, 100),
    winRate: 0
  };
  scores.winRate = clampNumber(Math.round((scores.logic + scores.power + scores.boundary + scores.mainline + (100 - scores.risk)) / 5), 0, 100);
  return {
    scores,
    overallScore: scores.winRate,
    advantages: buildRoundAdvantages(flags),
    weaknesses: buildRoundWeaknesses(flags),
    suggestion: buildRoundSuggestion(input, flags),
    betterReply: buildBetterReply(input, userReply)
  };
}

function buildRoundAdvantages(flags) {
  if (flags.hasInsult) return "情绪强度出来了，但有效攻击点被削弱了。";
  if (flags.hasMainline && flags.hasBoundary && flags.countersTactic) return "你抓住主线、设了边界，也点破了对方的话术。";
  if (flags.hasMainline && flags.hasBoundary) return "你没有被对方带偏，核心问题和边界都比较清楚。";
  if (flags.hasMainline) return "你抓到了事情本身，开始把争论从情绪拉回责任。";
  if (flags.responds) return "你接住了对方上一句，没有完全另起炉灶。";
  return "你有回应意愿，但还需要更明确地抓住问题。";
}

function buildRoundWeaknesses(flags) {
  if (flags.hasInsult) return "辱骂会让对方抓住“你失控”反打，事实和诉求都会被盖住。";
  if (flags.tooShort) return "句子太短，事实、影响、要求都没展开，对方容易继续打太极。";
  if (flags.tooLong) return "信息太多，攻击点分散，对方可以挑一句继续绕。";
  if (!flags.hasBoundary && !flags.hasMainline) return "主线和边界都不够明确，容易被拖进解释情绪。";
  if (!flags.hasBoundary) return "还缺一句明确边界：你不接受什么，对方接下来要怎么做。";
  if (!flags.countersTactic) return "可以点破对方正在转移重点，不要只顺着内容辩。";
  return "可以再压短一点，让事实、影响、要求更集中。";
}

function buildRoundSuggestion(input, flags) {
  const request = textOf(input.mainline?.request) || input.goal || "给出具体处理方式";
  if (flags.hasInsult) return "先删掉骂人的部分，再用事实和要求压回去。";
  if (!flags.hasBoundary) return `补一句边界和要求，比如“我不接受你把问题转成我的态度，请你现在${request}”。`;
  if (!flags.countersTactic) return "加一句“你现在是在转移重点”，再回到事实。";
  return "下一句继续短句推进，不要扩大战场。";
}

function buildOpponentMessage(input, score, state) {
  const contextual = buildContextualOpponentMessage(input, state);
  if (contextual) return contextual;

  const sceneText = `${input.scene} ${input.goal}`;
  const pools = opponentPoolsForDifficulty(input.difficulty);
  const source = pools[state] || pools.strong;
  const offset = stableIndex(`${input.round}-${score}-${sceneText}`, source.length);
  return source[offset];
}

function buildContextualOpponentMessage(input, state) {
  const lastUser = latestUserReply(input.messages);
  const hook = extractReplyHook(lastUser);
  const scene = `${input.scene} ${input.goal}`;
  const isWork = /工作|职场|同事|项目|材料|客户|任务/.test(scene);
  const isRelationship = /男朋友|女朋友|对象|恋爱|冷战|消息|约/.test(scene);
  const isRoommate = /室友|宿舍|卫生|垃圾|公共/.test(scene);
  const isMoney = /朋友|借钱|还钱|转账/.test(scene);

  if (!lastUser) return "";
  if (state === "nearly_convinced" || state === "defensive") {
    if (isWork) return `行，你说的时间线我听到了，但你也不能把流程里所有漏洞都算我一个人的吧？${hook ? `你刚才说“${hook}”，这个我可以补。` : ""}`;
    if (isRelationship) return `我承认这次让你不舒服了，但你别把它上升成我完全不尊重你。${hook ? `你说“${hook}”，这点我会想。` : ""}`;
    if (isRoommate) return `好，我这次可以处理，但你别搞得像我故意破坏宿舍规则一样。`;
    if (isMoney) return `我知道钱该还，但你这样说我压力也很大。你要我给时间，我可以给。`;
    return `行，你这个点我听到了，但我不接受你把我说成完全没责任心。`;
  }

  if (isWork) return `你说${hook ? `“${hook}”` : "这些"}听起来很有道理，但当时情况那么乱，你也不能说我就是故意甩锅吧？`;
  if (isRelationship) return `你现在抓着${hook ? `“${hook}”` : "这个点"}不放，可我也不是故意让你难受的，你能不能别先把我定性？`;
  if (isRoommate) return `你说规则可以，但你这个语气就像在审我。${hook ? `“${hook}”这话听着也挺冲的。` : ""}`;
  if (isMoney) return `你一直讲还钱计划，我不是不还，只是你这样催真的让我觉得这段关系只剩钱了。`;
  return `你说${hook ? `“${hook}”` : "这些"}，但我觉得你还是把事情说得太绝对了。`;
}

function extractReplyHook(text) {
  const clean = textOf(text).replace(/\s+/g, "");
  if (!clean) return "";
  return clean.length > 16 ? `${clean.slice(0, 16)}...` : clean;
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

function normalizeGameConfig(config = {}, input = {}) {
  const playerRoleKey = normalizeRoleKey(config.playerRoleKey || input.playerRoleKey || "A");
  const aiRoleKey = oppositeRoleKey(playerRoleKey);
  const scene =
    textOf(config.scene) ||
    textOf(input.scene) ||
    textOf(config.topic) ||
    textOf(input.debateTopic) ||
    "一次真实生活冲突已经发生，对方正在回避具体问题。";
  const roleA = normalizeRole(config.roleA, {
    name: textOf(input.playerIdentity) || textOf(config.playerIdentity) || "我",
    description: "冲突中需要表达诉求、守住边界的一方",
    goal: textOf(input.goal) || "让对方正面回应问题，并给出具体做法"
  });
  const roleB = normalizeRole(config.roleB, {
    name: textOf(input.aiIdentity) || textOf(config.aiIdentity) || "对方",
    description: "冲突中会辩解、回避或反击的一方",
    goal: "为自己的行为找理由，反驳玩家，并试图转移重点"
  });
  const trainingGoals = Array.isArray(config.trainingGoals)
    ? config.trainingGoals.map(textOf).filter(Boolean)
    : Array.isArray(config.goals)
      ? config.goals.map(textOf).filter(Boolean)
      : arrayOfText(input.trainingGoals);

  return {
    scene,
    roleA,
    roleB,
    playerRoleKey,
    aiRoleKey,
    trainingGoals,
    difficulty: textOf(config.difficulty) || textOf(input.difficulty) || "normal"
  };
}

function normalizeRole(role, fallback) {
  const source = role && typeof role === "object" && !Array.isArray(role) ? role : {};
  return {
    name: textOf(source.name) || fallback.name,
    description: textOf(source.description) || fallback.description,
    goal: textOf(source.goal) || fallback.goal
  };
}

function normalizeRoleKey(value) {
  return value === "B" ? "B" : "A";
}

function oppositeRoleKey(value) {
  return normalizeRoleKey(value) === "A" ? "B" : "A";
}

function roleFromConfig(config, key) {
  return normalizeRoleKey(key) === "A" ? config.roleA : config.roleB;
}
