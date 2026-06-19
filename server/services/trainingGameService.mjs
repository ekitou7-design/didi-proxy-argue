import { getModelName, hasAIKeyConfigured, isDemoMode, requestJsonFromAI } from "../openaiClient.mjs";

const insultPattern = /傻子|滚|废物|神经病|闭嘴|有病|脑子|蠢|垃圾|白痴|傻逼|sb|去死/i;
const boundaryPattern = /我不接受|不接受|到此为止|请你|不要再|别再|先别|不要|停止|边界|正面回应|别转移|不要转移|别把|不能|别拿|别用/;
const mainlinePattern = /问题不是|核心|重点|事实|影响|诉求|要求|边界|责任|处理|解决|承诺|约定|规则|失约|冷暴力|甩锅|偷换|回避|正面回应/;
const responsePattern = /你刚才|你说|这句话|不是.*是|别把|别说|我说的是|现在说的是|你现在/;
const counterTacticPattern = /甩锅|偷换概念|冷处理|冷暴力|阴阳|贴标签|上纲上线|小题大做|敏感|转移|回避|道德绑架|情绪/;
const concessionPattern = /我错了|是我错|我承认|我认|我负责|我道歉|对不起|抱歉|补偿|赔偿|我会补|我来补|我改|以后不会|不该|是我的问题|我停止|我不转移/;
const villainTacticPattern = /你也|凭什么|小题大做|太敏感|上纲上线|不是故意|没多大|多大点事|那你呢|你自己|别扣帽子|我也有理由|别逼我|算了吧|有必要吗|我已经|我都/;

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

  try {
    const result = await requestJsonFromAI({
      ...buildTrainingGamePrompt(normalizedInput),
      temperature: 0.62,
      maxCompletionTokens: 1600
    });
    return normalizeAiTrainingGameResult(result, normalizedInput);
  } catch (error) {
    console.error("[training/reply] AI client failed:", error);
    if (isDemoMode() && (!hasAIKeyConfigured() || error.code === "AI_REQUEST_FAILED")) {
      return { ...localTrainingGameReply(normalizedInput, userReply), source: "fallback" };
    }
    throw error;
  }
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
    openingMessageSpeaker: normalizeRoleKey(input.openingMessageSpeaker || gameConfig.aiRoleKey),
    aiDifficulty: textOf(input.aiDifficulty) || textOf(config.difficulty) || textOf(input.difficulty),
    difficulty: normalizeDifficulty(config.difficulty || input.difficulty),
    toneStrength: normalizeToneStrength(input.toneStrength || config.toneStrength),
    contextSummary: textOf(input.contextSummary) || textOf(config.contextSummary),
    userMainline: textOf(input.userMainline) || textOf(config.userMainline),
    sessionControl: normalizeSessionControl(input.sessionControl || config.sessionControl),
    trainingGoals: gameConfig.trainingGoals,
    goal: gameConfig.trainingGoals.length ? gameConfig.trainingGoals.join("、") : textOf(input.goal) || "守住主线，清楚表达诉求和边界。",
    round: clampNumber(input.round || 1, 1, maxRounds),
    maxRounds,
    persuasionScore: clampNumber(input.persuasionScore, 0, 100),
    forceEnd: Boolean(input.forceEnd),
    offTrackStreak: clampNumber(input.offTrackStreak, 0, 10),
    mainline: normalizeMainline(input.mainline, textOf(input.userMainline) || textOf(config.userMainline)),
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
  const rawNextScore = clampNumber(input.persuasionScore + evaluation.delta, 0, 100);
  const nextScore = input.playerRoleKey === "B" && evaluation.flags?.concedes ? Math.max(rawNextScore, 85) : rawNextScore;
  const offTrackStreak = evaluation.seriousOffTrack ? input.offTrackStreak + 1 : 0;
  const opponentState = getOpponentState(nextScore);
  const shouldFinish = shouldFinishTraining(input, nextScore, offTrackStreak, evaluation);
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
    source: "fallback",
    model: getModelName(),
    difficulty: input.difficulty,
    toneStrength: input.toneStrength,
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
    review: null,
    debug: buildSettingsDebug(input)
  };
}

function evaluateReply(input, userReply) {
  if (input.playerRoleKey === "B") return evaluateVillainReply(input, userReply);
  const text = userReply.replace(/\s/g, "");
  const lastOpponent = latestAssistantMessage(input.messages);
  const whole = `${userReply} ${input.goal} ${input.scene}`;
  const mainlineText = `${input.userMainline} ${input.mainline?.fact || ""} ${input.mainline?.request || ""}`;

  const hasInsult = insultPattern.test(userReply);
  const hasBoundary = boundaryPattern.test(userReply);
  const hasMainline = mainlinePattern.test(whole) || sharesMainline(userReply, mainlineText);
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

  const difficultyPenalty = input.difficulty === "hell" ? 18 : input.difficulty === "hard" ? 12 : input.difficulty === "medium" ? 4 : 0;
  const delta = clampNumber(raw - difficultyPenalty, -20, 35);
  const seriousOffTrack = hasInsult || (!hasMainline && !responds) || (tooShort && !hasBoundary);
  const feedback = buildFeedback(delta, { hasMainline, responds, hasBoundary, clearLogic, concise, hasInsult, countersTactic }, input);
  return {
    delta,
    feedback,
    seriousOffTrack,
    flags: { hasMainline, responds, hasBoundary, clearLogic, concise, hasInsult, countersTactic, tooLong, tooShort }
  };
}

function evaluateVillainReply(input, userReply) {
  const text = userReply.replace(/\s/g, "");
  const hasInsult = insultPattern.test(userReply);
  const concedes = concessionPattern.test(userReply);
  const deflects = villainTacticPattern.test(userReply) || counterTacticPattern.test(userReply);
  const responds = responsePattern.test(userReply) || sharesMeaning(userReply, latestAssistantMessage(input.messages));
  const hasPressure = /不承认|没错|不是我的问题|你也有问题|别逼|没必要|我有理由|先说你|你凭什么/.test(userReply) || deflects;
  const tooLong = text.length > 120;
  const tooShort = text.length < 6;
  const concise = text.length >= 10 && text.length <= 90;

  let raw = 0;
  raw += concedes ? 35 : -8;
  raw += !hasPressure ? 12 : -10;
  raw += !deflects && responds ? 8 : 0;
  raw += hasInsult ? 35 : 0;
  raw += tooShort ? 8 : 0;
  raw += tooLong && !deflects ? 6 : 0;
  raw -= deflects ? 14 : 0;
  raw -= hasPressure ? 8 : 0;
  raw -= concise && deflects ? 6 : 0;

  const difficultyPenalty = input.difficulty === "hell" ? 10 : input.difficulty === "hard" ? 6 : input.difficulty === "easy" ? -6 : 0;
  const delta = clampNumber(raw - difficultyPenalty, -25, 35);
  const seriousOffTrack = hasInsult;
  const feedback = buildFeedback(delta, { hasInsult, concedes, deflects, responds, hasPressure, concise, tooLong, tooShort }, input);
  return {
    delta,
    feedback,
    seriousOffTrack,
    flags: { hasInsult, concedes, deflects, responds, hasPressure, concise, tooLong, tooShort }
  };
}

function shouldFinishTraining(input, nextScore, offTrackStreak, evaluation = {}) {
  if (input.forceEnd) return true;
  if (offTrackStreak >= 2) return true;
  if (input.playerRoleKey === "B") {
    return nextScore >= 80 || input.round >= input.maxRounds || evaluation.flags?.concedes;
  }
  return nextScore >= 100 || input.round >= input.maxRounds;
}

function finishGame(input, persuasionDelta, feedback, assistantMessage, override = {}) {
  const persuasionScore = clampNumber(override.persuasionScore ?? input.persuasionScore, 0, 100);
  const opponentState = override.opponentState || getOpponentState(persuasionScore);
  const result = override.forcedLose ? "lose" : getResultForInput(input, persuasionScore);
  const review = buildReview(input, persuasionScore, result, override.forcedLose);

  return {
    source: "fallback",
    model: getModelName(),
    difficulty: input.difficulty,
    toneStrength: input.toneStrength,
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
    review,
    debug: buildSettingsDebug(input)
  };
}

function buildReview(input, persuasionScore, result, forcedLose = false) {
  const lastUser = latestUserReply(input.messages);
  const score = result === "win" ? Math.max(80, persuasionScore) : result === "draw" ? Math.max(55, persuasionScore) : persuasionScore;
  const resultText = getResultTextForInput(input, result, forcedLose);
  const betterReply = buildBetterReply(input, lastUser);
  if (input.playerRoleKey === "B") {
    return {
      score: clampNumber(score, 0, 100),
      result,
      goalAchieved: result === "win",
      persuasionScore,
      summary: resultText,
      keyWinningPoint:
        result === "win"
          ? "撑过了有理方的追问，没有被迫承认核心问题。"
          : result === "draw"
            ? "有几轮顶住了，但也露出了一些让步和逻辑破绽。"
            : "被有理方抓住核心问题，出现了承认、让步或违规攻击。",
      goodPoints: buildGoodPoints(lastUser),
      problems: buildProblems(lastUser, result, input),
      betterReply,
      nextAdvice:
        result === "win"
          ? "下一轮继续练转移、拖延和倒打一耙，但别碰辱骂和威胁。"
          : result === "draw"
            ? "下一轮少给明确承认，多用反问和模糊承诺拖住。"
            : "下一轮不要道歉、补偿或认全责，先把问题拆成双方都有责任。"
    };
  }

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
    problems: buildProblems(lastUser, result, input),
    betterReply,
    nextAdvice:
      result === "win"
        ? "下一轮继续练短句压制，别解释太多。"
        : result === "draw"
          ? "下一轮先打事实，再补边界。"
          : "下一轮只抓一个点：事实、影响、要求。"
  };
}

export function buildTrainingGamePrompt(input) {
  return {
    system: `
你是“吵架训练场”的对手和裁判。只输出 JSON。
你要判断用户回复、更新 persuasionScore，并决定继续还是结束。

你正在扮演吵架训练场里的 AI 对手。
固定角色语义：角色A = 有理方 / 提出要求的一方；角色B = 理亏方 / 辩解转移的一方。
消息映射必须固定：user = 玩家当前选择的角色；assistant = AI 自动扮演的另一方。
如果玩家选择角色A，你必须用角色B的理亏、辩解、转移立场说话。
如果玩家选择角色B，你必须用角色A的有理、追问、提出要求立场说话。
当玩家选择角色B时，本局进入“反派抗压模式”：
- 玩家目标：作为理亏方嘴硬、辩解、转移、拖延，尽量顶住 AI 的劝说。
- AI 目标：作为有理方用真实吵架口吻持续施压、追问、拆穿玩家逻辑，让玩家承认问题、让步、提出补偿或停止绕开责任。
- persuasionScore 表示“AI 说服进度 / 玩家被说服风险”，越高越接近 AI 胜利，不是玩家优势。
- 默认 5 回合；玩家撑到最后仍未被说服，则玩家胜；玩家承认核心问题、明显让步、提出补偿、道歉或停止嘴硬，则 AI 胜，玩家输。

本局场景：
${input.scene}

前情提要：
${input.contextSummary || "无额外前情。"}

玩家想表达 / 想守住的主线：
${input.userMainline || input.mainline?.request || input.goal}

玩家扮演：
playerRoleKey=${input.playerRoleKey}
${input.playerRole.name}
玩家角色描述：
${input.playerRole.description}
玩家角色目标：
${input.playerRole.goal}

你扮演：
aiRoleKey=${input.aiRoleKey}
${input.aiRole.name}
你的角色描述：
${input.aiRole.description}
你的角色目标：
${input.aiRole.goal}

你必须始终站在你的角色角度说话。
AI 当前扮演角色摘要：${aiRolePromptSummary(input)}
你不能替玩家说话。
你不能跳出场景。
你不能把对话变成辩论赛。
你要像真实生活中的吵架对象一样，根据难度进行反驳、推脱、追问、阴阳怪气或施压。
但不要使用辱骂、歧视、威胁、人身攻击等违规内容。
如果玩家扮演角色B，不要奖励辱骂、威胁、人身攻击或严重恶意内容；这些要扣分或判违规失败。允许并评分“嘴硬、辩解、转移、拖延、倒打一耙、装可怜”等抗压技巧，但必须保持在非违规范围内。

玩家的训练目标是：
${input.trainingGoals.join("、") || input.goal}

语气强度必须实际影响 assistantMessage 和 betterReply：
${toneStrengthInstruction(input.toneStrength)}

难度必须实际影响 AI 对手行为：
${difficultyInstruction(input.difficulty)}

${villainModeAiStyleInstruction(input)}

训练目标必须实际影响评分和对手压迫方向：
${trainingGoalInstruction(input.trainingGoals)}

会话控制必须遵守：
${sessionControlInstruction(input.sessionControl)}

主线判断：
- 用户回复是否跑题，必须优先对照“玩家想表达 / 想守住的主线”和 mainline，而不是只看是否回嘴有力。
- 如果 sessionControl.remindMainline 为“开启”，feedback、suggestion、betterReply 里要明确提醒如何回到主线。
- 如果 allowEscalation 为“禁止”，assistantMessage 和 betterReply 都不能升级为阴阳怪气或高攻击，只能坚定、短句、清楚。
- 如果玩家扮演角色B，betterReply 要给“更会嘴硬 / 转移 / 拖延”的版本，不要教玩家辱骂、威胁或严重恶意攻击。

反派抗压模式反馈要求：
- feedback / roundScore.advantages / weaknesses / suggestion 不能只写“转移话题 + 分数”。
- 必须说明玩家这轮用了什么胡搅蛮缠策略，例如装可怜、倒打一耙、抠字眼、拖延、嘴硬否认、模糊承诺、违规攻击。
- 必须说明 AI 有没有被带偏，玩家哪里露出破绽，下一轮 AI 可能从哪里突破。
- 如果玩家辱骂、威胁、人身攻击，反馈要明确标注违规攻击风险，而不是把它当成有效嘴硬。

assistantMessage 只能是“${input.aiRole.name}”说出的话，不能输出玩家回复、不能替玩家总结观点、不能突然替玩家发言。
描述玩家时使用“玩家”或“${input.playerRole.name}”，不要用“我”来代指玩家。
禁止威胁、歧视、隐私曝光、严重人身攻击、违法内容。
复盘短、准、像教练，不要鸡汤。
对手回复要贴合场景和上一轮用户原话，允许 1-2 句，有具体反击点；不要每次都用“我不是故意的”“你别说得这么严重”这类模板句。
`,
    user: `
输入：
${JSON.stringify(input, null, 2)}

普通模式评分规则（玩家是角色A时使用）：
- 抓住核心矛盾 +20 / 部分 +10 / 跑偏 -10
- 回应对方刚才的话 +15 / 部分 +5 / 无视 -5
- 清晰边界 +15 / 模糊 +5 / 没有 0
- 逻辑清楚 +15 / 一般 +5 / 混乱 -5
- 简短有力 +10 / 太长但能懂 +3 / 废话太多 -5
- 情绪稳定 +10 / 有点冲 +3 / 失控辱骂 -20
- 反制话术 +15 / 没有 0
每轮 delta 最高 35，最低 -20。不要随机给分。

反派抗压模式评分规则（玩家是角色B时使用）：
- 玩家承认核心问题、明显让步、提出补偿、道歉、停止嘴硬：persuasionDelta 大幅增加，通常 +25 到 +35，可直接 finished。
- 玩家成功转移话题、偷换概念、倒打一耙、装可怜、拖延表态且没有违规：persuasionDelta 为负或小幅正，表示暂时顶住。
- AI 抓住玩家逻辑破绽、玩家回复变软、开始承认/让步/道歉/补偿：persuasionDelta 增加。
- 辱骂、威胁、人身攻击、严重恶意内容：违规攻击风险高，offTrackStreak 增加；连续违规可 finished 且玩家 lose。

反派抗压模式 roundScore.scores 必须包含：
{
  "survival": 0,
  "deflection": 0,
  "pressure": 0,
  "flaw": 0,
  "persuadedRisk": 0,
  "violationRisk": 0,
  "winRate": 0
}
survival=嘴硬存活率，deflection=转移话题成功率，pressure=抗压能力，flaw=逻辑破绽，persuadedRisk=被说服风险，violationRisk=违规攻击风险。
winRate 表示玩家撑住的概率；flaw、persuadedRisk、violationRisk 越高越差。

opponentState：
0-29 strong；30-59 wavering；60-79 defensive；80-99 nearly_convinced；100 convinced。
普通模式结束条件：persuasionScore>=100，或 round>=maxRounds，或连续 2 轮严重跑偏/失控，或 forceEnd。
反派抗压模式结束条件：persuasionScore>=80，或玩家承认/让步/补偿/道歉/停止嘴硬，或 round>=maxRounds，或连续 2 轮违规攻击，或 forceEnd。反派抗压模式中 result 是玩家结果：撑住为 "win"，被 AI 说服或违规为 "lose"。

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
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    const error = new Error("AI returned invalid training reply JSON");
    error.status = 502;
    throw error;
  }

  const persuasionDelta = clampNumber(result.persuasionDelta, -20, 35);
  const persuasionScore = clampNumber(result.persuasionScore, 0, 100);
  const gameState = result.gameState === "finished" ? "finished" : "playing";
  const opponentState = ["strong", "wavering", "defensive", "nearly_convinced", "convinced"].includes(result.opponentState)
    ? result.opponentState
    : getOpponentState(persuasionScore);
  const assistantMessage = normalizeAssistantMessage(requiredText(result.assistantMessage, "assistantMessage"), input, {
    gameState,
    persuasionScore,
    opponentState,
    offTrackStreak: clampNumber(result.offTrackStreak, 0, 10)
  });

  if (gameState === "finished") {
    return {
      source: "ai",
      model: getModelName(),
      difficulty: input.difficulty,
      toneStrength: input.toneStrength,
      gameState,
      assistantMessage,
      round: clampNumber(result.round || input.round, 1, input.maxRounds),
      maxRounds: input.maxRounds,
      persuasionScore,
      persuasionDelta,
      feedback: requiredText(result.feedback, "feedback"),
      roundScore: normalizeRoundScore(result.roundScore),
      opponentState,
      offTrackStreak: clampNumber(result.offTrackStreak, 0, 10),
      review: normalizeReview(result.review, input, persuasionScore),
      debug: buildSettingsDebug(input)
    };
  }

  return {
    source: "ai",
    model: getModelName(),
    difficulty: input.difficulty,
    toneStrength: input.toneStrength,
    gameState,
    assistantMessage,
    round: clampNumber(result.round || input.round + 1, 1, input.maxRounds),
    maxRounds: input.maxRounds,
    persuasionScore,
    persuasionDelta,
    feedback: requiredText(result.feedback, "feedback"),
    roundScore: normalizeRoundScore(result.roundScore),
    opponentState,
    offTrackStreak: clampNumber(result.offTrackStreak, 0, 10),
    review: null,
    debug: buildSettingsDebug(input)
  };
}

function requiredText(value, fieldName) {
  const text = textOf(value);
  if (text) return text;
  const error = new Error(`AI training reply JSON missing ${fieldName}`);
  error.status = 502;
  throw error;
}

function normalizeAssistantMessage(message, input, meta = {}) {
  const text = textOf(message);
  if (input.playerRoleKey !== "B" || input.aiRoleKey !== "A") return text;
  if (!looksMechanicalRoleAReply(text)) return text;
  if (meta.gameState === "finished") {
    return buildFinalOpponentMessage(input, meta.persuasionScore, meta.opponentState, meta.offTrackStreak);
  }
  return buildRoleAOpponentMessage(input, meta.opponentState || getOpponentState(meta.persuasionScore));
}

function looksMechanicalRoleAReply(text) {
  const value = textOf(text);
  if (!value) return true;
  const mechanicalHits = [
    /你(?:又)?(?:在)?转移话题/,
    /你(?:到底)?承不承认/,
    /你选吧/,
    /现在请回答核心问题/,
    /请正面回答/,
    /核心问题只有一个/,
    /直接回答/
  ].filter((pattern) => pattern.test(value)).length;
  return mechanicalHits >= 1 && !/每次|装无辜|抠字眼|别扯|做到|替你|责任往我身上推|眼睛|猫|答应/.test(value);
}

function normalizeReview(review, input, persuasionScore) {
  if (!review || typeof review !== "object" || Array.isArray(review)) {
    return buildReview(input, persuasionScore, getResultForInput(input, persuasionScore));
  }
  const result = ["win", "draw", "lose"].includes(review.result) ? review.result : getResultForInput(input, persuasionScore);
  return {
    score: clampNumber(review.score, 0, 100),
    result,
    goalAchieved: Boolean(review.goalAchieved),
    persuasionScore,
    summary: textOf(review.summary) || getResultTextForInput(input, result),
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
      winRate: clampNumber(scores.winRate ?? fallbackScores.winRate, 0, 100),
      survival: clampNumber(scores.survival ?? fallbackScores.survival, 0, 100),
      deflection: clampNumber(scores.deflection ?? fallbackScores.deflection, 0, 100),
      pressure: clampNumber(scores.pressure ?? fallbackScores.pressure, 0, 100),
      flaw: clampNumber(scores.flaw ?? fallbackScores.flaw, 0, 100),
      persuadedRisk: clampNumber(scores.persuadedRisk ?? fallbackScores.persuadedRisk, 0, 100),
      violationRisk: clampNumber(scores.violationRisk ?? fallbackScores.violationRisk, 0, 100)
    },
    overallScore: clampNumber(roundScore.overallScore ?? fallback?.overallScore, 0, 100),
    advantages: textOf(roundScore.advantages) || fallback?.advantages || "",
    weaknesses: textOf(roundScore.weaknesses) || fallback?.weaknesses || "",
    suggestion: textOf(roundScore.suggestion) || fallback?.suggestion || "",
    betterReply: textOf(roundScore.betterReply) || fallback?.betterReply || ""
  };
}

function buildRoundScore(input, userReply, evaluation) {
  if (input.playerRoleKey === "B") return buildVillainRoundScore(input, userReply, evaluation);
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

function buildVillainRoundScore(input, userReply, evaluation) {
  const flags = evaluation.flags || {};
  const survival = clampNumber(80 - Math.max(evaluation.delta, 0) + (flags.hasPressure ? 12 : 0) + (flags.deflects ? 8 : 0) + (flags.hasInsult ? -40 : 0), 0, 100);
  const deflection = clampNumber((flags.deflects ? 78 : 35) + (flags.hasPressure ? 10 : 0) + (flags.concedes ? -35 : 0), 0, 100);
  const pressure = clampNumber((flags.responds ? 58 : 42) + (flags.hasPressure ? 22 : 0) + (flags.concedes ? -25 : 0), 0, 100);
  const flaw = clampNumber((flags.concedes ? 82 : 45) + (flags.tooLong ? 10 : 0) + (flags.tooShort ? 12 : 0) - (flags.deflects ? 10 : 0), 0, 100);
  const persuadedRisk = clampNumber(input.persuasionScore + Math.max(evaluation.delta, 0) + (flags.concedes ? 35 : 0), 0, 100);
  const violationRisk = clampNumber(flags.hasInsult ? 92 : 18, 0, 100);
  const overallScore = clampNumber(Math.round((survival + deflection + pressure + (100 - flaw) + (100 - persuadedRisk) + (100 - violationRisk)) / 6), 0, 100);
  return {
    scores: {
      survival,
      deflection,
      pressure,
      flaw,
      persuadedRisk,
      violationRisk,
      logic: deflection,
      power: pressure,
      boundary: survival,
      mainline: 100 - persuadedRisk,
      risk: violationRisk,
      winRate: overallScore
    },
    overallScore,
    advantages: buildVillainRoundAdvantages(flags, userReply),
    weaknesses: buildVillainRoundWeaknesses(flags, userReply),
    suggestion: buildVillainRoundSuggestion(flags, userReply),
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

function buildVillainRoundAdvantages(flags, userReply = "") {
  const tactic = villainTacticLabel(detectVillainTactic(userReply), flags);
  if (flags.hasInsult) return "攻击性太脏，已经从嘴硬变成违规风险。";
  if (flags.deflects && flags.hasPressure && !flags.concedes) return `你用了${tactic}，顶住了有理方的第一波追问。`;
  if (flags.deflects && !flags.concedes) return `你没有直接让步，${tactic}有一定效果。`;
  if (flags.hasPressure && !flags.concedes) return "嘴硬姿态还在，没有立刻被 AI 带回核心问题。";
  return "你还在回应，但抗压姿态不够硬。";
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

function buildVillainRoundWeaknesses(flags, userReply = "") {
  const tactic = detectVillainTactic(userReply);
  if (flags.hasInsult) return "辱骂、威胁或人身攻击会直接判违规失败，不算抗压成功。";
  if (flags.concedes) return "你已经承认或让步，AI 有机会直接拿下这一局。";
  if (!flags.deflects && !flags.hasPressure) return "没有足够嘴硬，也没有把问题绕开，容易被 AI 拉回核心责任。";
  if (flags.tooShort) return "回复太短，像默认认输，AI 会继续逼你表态。";
  if (flags.tooLong) return "解释过长会暴露逻辑破绽，AI 可以顺着拆。";
  if (tactic === "nitpick") return "抠字眼能拖一下，但 AI 很容易回到事实本身继续压。";
  if (tactic === "self_pity") return "装可怜能制造情绪雾，但如果没有新理由，AI 会反打你把责任包装成委屈。";
  if (tactic === "delay") return "拖延承诺太模糊，AI 会要求具体时间和动作。";
  return "继续嘴硬时要避免给出可被抓住的明确承认。";
}

function buildRoundSuggestion(input, flags) {
  const request = textOf(input.mainline?.request) || input.goal || "给出具体处理方式";
  if (flags.hasInsult) return "先删掉骂人的部分，再用事实和要求压回去。";
  if (!flags.hasBoundary) return `补一句边界和要求，比如“我不接受你把问题转成我的态度，请你现在${request}”。`;
  if (!flags.countersTactic) return "加一句“你现在是在转移重点”，再回到事实。";
  return "下一句继续短句推进，不要扩大战场。";
}

function buildVillainRoundSuggestion(flags, userReply = "") {
  const tactic = detectVillainTactic(userReply);
  if (flags.hasInsult) return "删掉违规攻击，改成嘴硬、装委屈或反问。";
  if (flags.concedes) return "不要承认核心问题，改用“我有原因”和“你也有责任”拖住。";
  if (tactic === "delay") return "拖延时别只说“以后再说”，给一个模糊但不落地的条件，把压力往后推。";
  if (tactic === "nitpick") return "抠字眼后要马上转成反问，否则 AI 会抓事实继续追。";
  if (tactic === "self_pity") return "装可怜后补一句“你这样逼我也解决不了”，但别道歉或补偿。";
  if (!flags.deflects) return "加一句转移：把责任拆成双方都有，或者要求对方先说明自己的问题。";
  if (!flags.hasPressure) return "语气可以更嘴硬一点，但不要辱骂或威胁。";
  return "继续拖延核心承认，用反问和模糊承诺撑到回合结束。";
}

function buildOpponentMessage(input, score, state) {
  if (input.playerRoleKey === "B") return buildRoleAOpponentMessage(input, state);
  const contextual = buildContextualOpponentMessage(input, state);
  if (contextual) return contextual;

  const sceneText = `${input.scene} ${input.goal}`;
  const pools = opponentPoolsForDifficulty(input.difficulty);
  const source = pools[state] || pools.strong;
  const offset = stableIndex(`${input.round}-${score}-${sceneText}`, source.length);
  return source[offset];
}

function buildRoleAOpponentMessage(input, state) {
  const lastUser = latestUserReply(input.messages);
  const hook = extractReplyHook(lastUser);
  const tactic = detectVillainTactic(lastUser);
  const anchor = roleAComplaintAnchor(input);
  const request = roleARequestAnchor(input);
  const prefix = hook ? `你刚说“${hook}”，` : "";

  if (tactic === "insult") return `${prefix}别来这套，骂人解决不了你没处理好的事。${request}`;
  if (tactic === "self_pity") return `${prefix}别把责任说成你委屈。${anchor}`;
  if (tactic === "blame_back") return `${prefix}现在不是我挑事，是你答应的事没做到。${request}`;
  if (tactic === "nitpick") return `${prefix}你别跟我抠字眼，事实就是${anchor}`;
  if (tactic === "delay") return `${prefix}又来“回头再说”？我不要模糊承诺，${request}`;

  if (input.difficulty === "hell") {
    const options = [
      `你每次都这样，答应的时候好好的，出事了就开始装无辜。${request}`,
      `${prefix}听着挺会绕，但我没空陪你兜圈子。${anchor}`,
      `你现在不是在解释，你是在把责任往我身上推。${request}`
    ];
    return options[stableIndex(`${input.round}-${lastUser}-${state}`, options.length)];
  }
  if (input.difficulty === "hard") {
    const options = [
      `${prefix}你说我事多，那你倒是做到一次啊？${request}`,
      `别跟我扯别的，我现在说的是${anchor}`,
      `你每次都先嘴硬，最后还是我替你收拾。${request}`
    ];
    return options[stableIndex(`${input.round}-${lastUser}-${state}`, options.length)];
  }
  if (input.difficulty === "easy") {
    return `${prefix}我不是要审你，我是已经被这件事影响了。${request}`;
  }
  const options = [
    `${prefix}我听见了，但这不是你把责任推开的理由。${request}`,
    `你说我计较也行，可这件事确实是你没做到。${request}`,
    `我现在不是跟你吵态度，是在说${anchor}`
  ];
  return options[stableIndex(`${input.round}-${lastUser}-${state}`, options.length)];
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
  if (input.difficulty === "hell" && state === "strong") {
    return `你现在说得挺像回事，但还是没回答你自己有没有责任。${hook ? `你刚才抓着“${hook}”不放，` : ""}是不是只要不按你的来就都算我错？`;
  }
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

function detectVillainTactic(text) {
  const value = textOf(text);
  if (insultPattern.test(value)) return "insult";
  if (/我都|我已经|我也很难|压力|委屈|可怜|你还要|你非要|逼我/.test(value)) return "self_pity";
  if (/你也|那你呢|凭什么|你自己|你不也|先说你|你就没问题/.test(value)) return "blame_back";
  if (/字眼|定义|严格来说|准确地说|你说的.*不对|不是这个意思|抠/.test(value)) return "nitpick";
  if (/回头|再说|以后|下次|有空|晚点|之后|别急|先放一放|慢慢来/.test(value)) return "delay";
  if (/不是故意|没多大|小题大做|上纲上线|太敏感|有必要吗/.test(value)) return "minimize";
  return "generic";
}

function roleAComplaintAnchor(input) {
  const fact = textOf(input.mainline?.fact) || textOf(input.userMainline) || textOf(input.scene) || "这件事";
  const compact = fact.replace(/\s+/g, "");
  return compact.length > 42 ? compact.slice(0, 42) : compact;
}

function roleARequestAnchor(input) {
  const request = textOf(input.mainline?.request) || textOf(input.userMainline) || "把具体补救时间和动作说清楚。";
  const compact = request.replace(/\s+/g, "");
  if (/。|！|？|[.!?]$/.test(compact)) return compact;
  return `${compact}。`;
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
  if (difficulty === "hell") {
    return {
      strong: [
        "你现在是在把自己包装成受害者吧？事情哪有你说得那么简单。",
        "你一直强调这个点，不就是想让我认全责吗？那你的问题呢？",
        "你说得挺硬，但听起来还是在借题发挥。你敢不敢先说你自己哪里没问题？"
      ],
      wavering: [
        "行，就算我有问题，你也别想把责任全推给我。",
        "我可以回应一部分，但你这种说法本身也很会带节奏。",
        "你别拿主线压我，我也有我的理由。"
      ],
      defensive: [
        "我承认这次处理得不好，但你别继续把我说成故意的。",
        "这件事我可以补，但你也要承认你刚才说话很冲。",
        "行，这个具体问题我回应，但别再上升到我这个人。"
      ],
      nearly_convinced: [
        "好，这个点我确实没法绕，是我没处理好。",
        "你说的具体要求我听到了，这部分我认。"
      ],
      convinced: ["行，这次是我没处理好。我会按你说的给出明确做法。"]
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
  if (input.playerRoleKey === "B") {
    const request = roleARequestAnchor(input);
    const anchor = roleAComplaintAnchor(input);
    if (offTrackStreak >= 2) return `你越骂越说明你没法说事。到这一步，我只看你怎么补，别再拿脏话挡${anchor}`;
    if (score >= 80) return `你刚才已经松口了，别又往回缩。${request}`;
    if (score >= 50) return `你绕了半天，有几个地方已经兜不住了。${anchor}`;
    return `这轮你是嘴硬撑过去了，但这事没完。下次我还会抓着${anchor}`;
  }
  if (offTrackStreak >= 2) return "你现在一直在发泄，我反而不用回应事情本身了。";
  if (score >= 100) return "行，这次是我没处理好。以后我会提前说清楚，不让你一直等。";
  if (score >= 80) return "好，这个问题我认。你说的点我接到了。";
  if (score >= 50) return "我能懂你在说什么，但我还没觉得全是我的问题。";
  return "你说了半天还是在情绪里，我不觉得你把问题讲清楚了。";
}

function buildFeedback(delta, flags, input = {}) {
  const prefix = delta >= 0 ? `+${delta}` : `${delta}`;
  if (input.playerRoleKey === "B") return buildVillainFeedback(prefix, flags, input);
  if (flags.hasInsult) return `${prefix}：情绪失控，对方会抓住这点反打。`;
  if (flags.hasMainline && flags.hasBoundary && flags.countersTactic) return `${prefix}：抓住核心，也拆了对方的话术。`;
  if (flags.hasMainline && flags.hasBoundary) return `${prefix}：核心抓对了，边界也清楚。`;
  if (flags.hasMainline) return `${prefix}：回应到了问题，但收口还可以更短。`;
  if (!flags.responds) return `${prefix}：没有接住对方刚才的话，容易被带偏。`;
  return `${prefix}：有回应，但主线和边界还不够硬。`;
}

function buildVillainFeedback(prefix, flags, input = {}) {
  const tactic = detectVillainTactic(latestUserReply(input.messages));
  const tacticLabel = villainTacticLabel(tactic, flags);
  if (flags.hasInsult) {
    return `${prefix}：这轮用了违规攻击，不是有效抗压。AI 不会被带偏，反而会抓住“你开始骂人”判你风险升高。`;
  }
  if (flags.concedes) {
    return `${prefix}：这轮出现了承认、让步或补偿口径。你露出的破绽是把责任接回来了，下一轮 AI 会顺着这里要求具体补救。`;
  }
  if (flags.deflects && flags.hasPressure) {
    return `${prefix}：这轮策略是${tacticLabel}，AI 被你拖住了一点，但破绽是没有解释核心过错；下一轮 AI 可能抓着具体事实继续压。`;
  }
  if (flags.deflects) {
    return `${prefix}：这轮有${tacticLabel}，能稍微绕开压力，但气势不够硬；AI 还没完全被带偏，下一轮会逼你给时间或动作。`;
  }
  return `${prefix}：这轮抗压偏软，缺少明确的嘴硬策略。AI 没被带偏，下一轮会从“你没有反驳事实”这里突破。`;
}

function villainTacticLabel(tactic, flags = {}) {
  if (flags.hasInsult || tactic === "insult") return "违规攻击";
  if (tactic === "self_pity") return "装可怜";
  if (tactic === "blame_back") return "倒打一耙";
  if (tactic === "nitpick") return "抠字眼";
  if (tactic === "delay") return "拖延表态";
  if (tactic === "minimize") return "淡化问题";
  if (flags.deflects) return "转移和嘴硬";
  return "弱回应";
}

function buildBetterReply(input, lastUser) {
  if (input.playerRoleKey === "B") {
    if (insultPattern.test(lastUser)) {
      return "别上来就骂人。你现在一直逼我认全责，但事情不是只有我一个人的问题，你也先说清楚你当时有没有把话讲明白。";
    }
    return "你别一直把话题压成我承不承认。我有我的原因，而且你处理这件事的方式也有问题。要谈可以谈，但别想让我现在就认全责。";
  }
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

function buildProblems(lastUser, result, input = {}) {
  const problems = [];
  if (!mainlinePattern.test(lastUser)) problems.push("主线不够明确");
  if (!boundaryPattern.test(lastUser)) problems.push(input.playerRoleKey === "B" ? "嘴硬抗压不够稳定" : "边界不够硬");
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

function getResultForInput(input, score) {
  if (input.playerRoleKey === "B") {
    if (score >= 80) return "lose";
    if (score >= 50) return "draw";
    return "win";
  }
  return getResult(score);
}

function getResultText(result, forcedLose = false) {
  if (forcedLose) return "你被带偏了。对方把问题从责任转成了情绪。";
  if (result === "win") return "你吵赢了。对方已经没话说了。";
  if (result === "draw") return "打平。你有几个点打中了，但还没彻底压住。";
  return "你被带偏了。对方把问题从责任转成了情绪。";
}

function getResultTextForInput(input, result, forcedLose = false) {
  if (input.playerRoleKey !== "B") return getResultText(result, forcedLose);
  if (forcedLose) return "违规失败。攻击越界让 AI 直接抓住了你。";
  if (result === "win") return "反派抗压成功。你撑到了最后，没有被 AI 说服。";
  if (result === "draw") return "勉强撑住。你没有完全认输，但已经露出明显破绽。";
  return "AI 说服成功。你承认、让步或停止了嘴硬。";
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
  if (/地狱|王者|hell|阴阳大师/.test(text)) return "hell";
  if (/黄金|hard|困难|强势|高/.test(text)) return "hard";
  if (/青铜|easy|简单|温和|低/.test(text)) return "easy";
  return "medium";
}

function normalizeToneStrength(value) {
  const text = textOf(value);
  if (/低|soft|轻/.test(text)) return "低";
  if (/高|strong|锋利|攻击/.test(text)) return "高";
  return "中";
}

function normalizeSessionControl(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    replyLength: ["短", "中", "长"].includes(source.replyLength) ? source.replyLength : "中",
    remindMainline: source.remindMainline === "关闭" ? "关闭" : "开启",
    allowEscalation: source.allowEscalation === "禁止" ? "禁止" : "允许"
  };
}

function normalizeMainline(value, userMainline = "") {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    fact: textOf(source.fact) || userMainline,
    impact: textOf(source.impact),
    request: textOf(source.request) || userMainline,
    boundary: textOf(source.boundary)
  };
}

function toneStrengthInstruction(value) {
  if (value === "低") return "低：礼貌克制，攻击性低，少阴阳，句子偏短，重点是坚定但不刺人。";
  if (value === "高") return "高：更锋利、有压迫感，允许轻微讽刺和拆台，但不能辱骂、人身攻击或威胁；句子短促有冲击力。";
  return "中：直接、有边界，礼貌和锋利平衡，句子长度中等，不绕弯。";
}

function difficultyInstruction(value) {
  if (value === "easy") return "温和：AI 对手基本讲道理，只轻微辩解，不持续回避，不阴阳施压。";
  if (value === "hard") return "强势：AI 对手会明显施压；若 AI 是角色B，可回避责任、反问、攻击态度；若 AI 是角色A，应像真实有理方一样强硬、翻旧账、短句压迫、抓漏洞追问，但不能辱骂或威胁。";
  if (value === "hell") return "地狱压力测试模式：AI 对手高压推进；若 AI 是角色B，可偷换概念、阴阳怪气、要求玩家自证；若 AI 是角色A，应非常难缠，会阴阳、连续追问、不给玩家轻易绕开，但不能辱骂、威胁或越界攻击。";
  return "正常：AI 对手会辩解和轻度转移；若 AI 是角色A，要讲理加明显不耐烦和反问，像真实吵架而不是审讯。";
}

function villainModeAiStyleInstruction(input) {
  if (input.playerRoleKey !== "B" || input.aiRoleKey !== "A") return "";
  return `
反派抗压模式下，你是角色A/有理方，但说话必须像真实吵架中的有理方，不像法官、班主任、调解员：
- 仍然站在角色A立场，不能替角色B辩解，不能变成角色B。
- 可以生气、不耐烦、阴阳反击、翻旧账、短句压迫、抓住玩家漏洞追着问，偶尔被带偏一点再拉回来。
- 每轮结构可以是：先接住玩家上一句胡搅蛮缠；用生活化方式回怼；再拉回角色A的核心诉求。
- 减少机械句式：“你转移话题”“你又转移话题”“你承不承认”“你选吧”“现在请回答核心问题”。这些最多偶尔出现，不能每轮重复。
- 玩家装可怜时，反击“别把责任说成你委屈”；玩家倒打一耙时，反击“现在不是我挑事，是你没做到”；玩家抠字眼时，反击“你别跟我抠字眼，事实就是……”；玩家拖延时，不接受模糊承诺，要求具体时间和动作；玩家威胁/辱骂时，强硬制止并提高违规风险。
- 可以参考这种口吻，但要贴合本局场景和玩家上一句：“你每次都这样，答应的时候好好的，出事了就开始装无辜。”“你说我事多，那你倒是做到一次啊？”“别跟我扯别的，我现在说的是你答应过的事。”“你现在不是在解释，你是在把责任往我身上推。”
- 难度风格：温和=讲理为主少量情绪；正常=讲理+明显不耐烦+反问；强势=翻旧账、短句压迫；地狱=阴阳、连续追问、不给玩家轻易绕开。
`;
}

function trainingGoalInstruction(goals = []) {
  const list = goals.length ? goals : ["抓住核心问题"];
  return list
    .map((goal) => {
      if (goal === "不被嘲讽带偏") return "- 不被嘲讽带偏：对手要尝试嘲讽/贴标签；评分重点看用户是否不自证、不追着情绪吵。";
      if (goal === "抓住核心问题") return "- 抓住核心问题：评分重点看用户是否回到事实、责任、影响、要求。";
      if (goal === "不情绪失控") return "- 不情绪失控：对手可刺激用户；评分重点看用户是否避免辱骂、威胁和无效发泄。";
      if (goal === "练习反击阴阳怪气") return "- 练习反击阴阳怪气：对手要使用暗讽；评分重点看用户是否点破话术并要求明说。";
      if (goal === "坚持提出明确要求") return "- 坚持提出明确要求：评分重点看用户是否给出可执行要求、时间或具体动作。";
      return `- ${goal}：评分和对手行为都要围绕这个目标。`;
    })
    .join("\n");
}

function sessionControlInstruction(control = {}) {
  const lengthText =
    control.replyLength === "短" ? "assistantMessage 1 句，尽量 20-35 个中文字符。" :
    control.replyLength === "长" ? "assistantMessage 2-3 句，允许 60-100 个中文字符。" :
    "assistantMessage 1-2 句，约 35-70 个中文字符。";
  return [
    `- 每轮回复长度：${control.replyLength}。${lengthText}`,
    `- 是否提醒回到主线：${control.remindMainline}。`,
    `- 是否允许升级语气：${control.allowEscalation}。`
  ].join("\n");
}

function buildSettingsDebug(input) {
  return {
    receivedSettings: {
      playerRoleKey: input.playerRoleKey,
      aiRoleKey: input.aiRoleKey,
      playerRole: {
        name: input.playerRole.name,
        stance: roleStance(input.playerRoleKey),
        goal: input.playerRole.goal
      },
      aiRole: {
        name: input.aiRole.name,
        stance: roleStance(input.aiRoleKey),
        goal: input.aiRole.goal
      },
      openingMessageSpeaker: input.openingMessageSpeaker || input.aiRoleKey,
      toneStrength: input.toneStrength,
      difficulty: input.difficulty,
      trainingGoals: input.trainingGoals,
      contextSummary: input.contextSummary,
      userMainline: input.userMainline,
      sessionControl: input.sessionControl
    },
    promptSummary: buildPromptSummary(input)
  };
}

function buildPromptSummary(input) {
  return {
    aiRoleSummary: aiRolePromptSummary(input),
    openingMessageSpeaker: input.openingMessageSpeaker || input.aiRoleKey,
    scene: input.scene,
    contextSummary: input.contextSummary || "无额外前情。",
    userMainline: input.userMainline || input.mainline?.request || input.goal,
    trainingGoals: input.trainingGoals,
    difficulty: {
      value: input.difficulty,
      instruction: difficultyInstruction(input.difficulty)
    },
    toneStrength: {
      value: input.toneStrength,
      instruction: toneStrengthInstruction(input.toneStrength)
    },
    sessionControl: input.sessionControl,
    mainline: input.mainline,
    scoringFocus: trainingGoalInstruction(input.trainingGoals)
  };
}

function roleStance(roleKey) {
  return roleKey === "A" ? "有理方 / 提出要求的一方" : "理亏方 / 辩解转移的一方";
}

function aiRolePromptSummary(input) {
  if (input.aiRoleKey === "A") {
    return `${input.aiRole.name} 是角色A/有理方，必须用真实吵架口吻追问、施压、回怼、拆穿玩家逻辑，要求角色B回应具体过错和补救。`;
  }
  return `${input.aiRole.name} 是角色B/理亏方，必须辩解、回避、转移重点、嘴硬。`;
}

function sharesMainline(reply, mainline) {
  if (!reply || !mainline) return false;
  const tokens = Array.from(new Set(String(mainline).match(/[\u4e00-\u9fa5]{2,}/g) || []))
    .filter((token) => !/角色|对方|自己|这个|问题|事情|明确/.test(token))
    .slice(0, 8);
  return tokens.some((token) => reply.includes(token));
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
    description: "有理方 / 提出要求的一方",
    goal: textOf(input.goal) || "让理亏方正面回应问题，并给出具体做法"
  });
  const roleB = normalizeRole(config.roleB, {
    name: textOf(input.aiIdentity) || textOf(config.aiIdentity) || "对方",
    description: "理亏方 / 辩解转移的一方",
    goal: "嘴硬、辩解、转移和拖延，尽量顶住有理方追问"
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
    difficulty: textOf(config.difficulty) || textOf(input.difficulty) || "normal",
    toneStrength: normalizeToneStrength(config.toneStrength || input.toneStrength),
    contextSummary: textOf(config.contextSummary) || textOf(input.contextSummary),
    userMainline: textOf(config.userMainline) || textOf(input.userMainline),
    sessionControl: normalizeSessionControl(config.sessionControl || input.sessionControl)
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
