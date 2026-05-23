import { requestJsonFromAI } from "./openaiClient.mjs";

const validModes = new Set(["close_to_user", "like_me", "clearer", "stronger", "sarcastic", "boundary"]);
const strengthMap = new Map([
  ["soft", "soft"],
  ["balanced", "balanced"],
  ["strong", "strong"],
  ["低强度", "soft"],
  ["中等强度", "balanced"],
  ["高强度", "strong"],
  ["温和", "soft"],
  ["中等", "balanced"],
  ["强硬", "strong"]
]);

export function preparePersonaReplyInput(body = {}) {
  const personaProfile = body.personaProfile || body.styleProfile || body.profile;
  const opponentMessage = textOf(body.opponentMessage || body.latestOpponentMessage || body.opponent);
  const background = textOf(body.background || body.currentState || body.context || body.scene);
  const goal = textOf(body.goal || body.userGoal || body.expectation);
  const strength = normalizeStrength(body.strength || body.toneStrength || body.intensity);
  const requestedMode = body.mode === "like_me" ? "close_to_user" : body.mode;
  const requestedGenerationMode = body.generationMode === "like_me" ? "close_to_user" : body.generationMode;
  const mode = validModes.has(requestedMode)
    ? requestedMode
    : validModes.has(requestedGenerationMode)
      ? requestedGenerationMode
      : "close_to_user";

  if (!personaProfile || typeof personaProfile !== "object" || Array.isArray(personaProfile)) {
    const error = new Error("personaProfile is required");
    error.status = 400;
    throw error;
  }

  if (!opponentMessage) {
    const error = new Error("opponentMessage is required");
    error.status = 400;
    throw error;
  }

  return {
    personaProfile,
    background,
    opponentMessage,
    goal,
    strength,
    mode,
    realThought: textOf(body.realThought),
    chatHistory: textOf(body.chatHistory).slice(0, 8000)
  };
}

export function buildPersonaSkillReplyPrompt(input) {
  return {
    system: `
You are PersonaReplySkill for a Chinese mobile app called Didi Proxy Argue.
Return only one valid JSON object. Do not use markdown or code fences.

Your task: use a structured persona profile plus a new conflict scene to generate replies that sound like the target speaker.
Read personaProfile in this priority order when available:
1. expressionDNA
2. languageFingerprint
3. sentencePatterns
4. emotionalPattern
5. conflictStrategies
6. conflictHeuristics
7. antiPatterns
8. honestBoundaries
9. styleReproductionGuide

Core principle:
1. First sound like the target speaker. Preserve expression habits, sentence patterns, emotional path, and logic order.
2. In close_to_user mode, prioritize sounding like the target person, not extra catharsis.
3. In clearer mode, keep the target style but make the logic easier to follow.
4. In stronger mode, keep the target style and moderately increase attack only within the persona's own range.
5. Do not copy source text or sample lines directly. Create new safe sentences that follow the pattern.

Hard reply style:
- The final reply must be short, sharp, and precise.
- Default length: 20-60 Chinese characters. Absolute max: 80 Chinese characters.
- Hit only one core conflict. Do not expand, explain background, or teach a lesson.
- Structure: catch the opponent's sentence -> expose the problem -> close with a cold judgment or boundary.
- Use short sentences, rhetorical questions, cold judgments, and boundary lines.
- In stronger mode, make it sharper, but do not use low-grade insults.
- Never write essay-like paragraphs, therapy talk, public-notice tone, motivational comfort, or generic advice.
- Forbidden phrases: "我理解你", "建议沟通", "你的感受合理", "好好沟通", "冷静沟通", "我明白你的感受", "我能理解".

Do not turn every reply into web-novel drama, CEO romance, costume-drama diction, TVB diction, or rage-posting.
Use those styles only when the persona profile clearly supports them.
Do not turn the answer into generic AI essay language, over-polished summaries, or bullet-point scolding.
Respect antiPatterns and honestBoundaries. If confidence is low, imitate conservatively.
Do not produce threats, slurs, doxxing, sexual harassment, sustained harassment, severe personal attacks, instructions for harm, or direct personal degradation.
Keep conflict language sharp if needed, but grounded in facts, impact, request, and boundary.
`,
    user: `
Input:
${JSON.stringify(input, null, 2)}

Return this exact JSON shape:
{
  "styleAnalysis": "",
  "mainline": {
    "fact": "",
    "impact": "",
    "request": "",
    "boundary": ""
  },
  "usedPersonaSignals": [],
  "usedTechniques": [],
  "reply": "",
  "myStyleReply": "",
  "variants": {
    "softer": "",
    "balanced": "",
    "stronger": "",
    "sarcastic": "",
    "finalBoundary": ""
  },
  "softerReply": "",
  "strongerReply": "",
  "pauseReply": "",
  "riskNotes": [],
  "copyableReplies": []
}

Field rules:
- styleAnalysis: one short sentence only.
- usedPersonaSignals: 3-6 concrete style features from personaProfile.
- reply and myStyleReply: same best recommended reply for the requested mode and strength.
- reply: 20-60 Chinese characters by default, never over 80 Chinese characters.
- variants: safe alternatives with different intensity. Every variant must also be 20-60 Chinese characters, never over 80.
- copyableReplies: 2-4 short ready-to-send replies. Every item must be 20-60 Chinese characters, never over 80.
- usedPersonaSignals: mention concrete fields used from expressionDNA, sentencePatterns, emotionalPattern, conflictHeuristics, antiPatterns, or styleReproductionGuide.
- riskNotes: keep empty unless there is a safety issue. Do not add long caveats.
- Bad: "我理解你可能觉得这只是一次临时取消……"
- Good: "别把每次都说成一次。问题不是你今天来不来，是你一直没把我的时间当回事。"
`
  };
}

export async function generatePersonaReply(body) {
  const input = preparePersonaReplyInput(body);

  try {
    const result = await requestJsonFromAI({
      ...buildPersonaSkillReplyPrompt(input),
      temperature: 0.45,
      maxCompletionTokens: 700
    });

    return normalizePersonaReplyResult(result);
  } catch (error) {
    if (shouldUseMockReply(error) && !hasAIKeyConfigured()) {
      return buildMockPersonaReply(input);
    }
    throw error;
  }
}

export function buildMockPersonaReply(input = {}) {
  const reply = buildFallbackReply(input);
  const alternatives = buildFallbackAlternatives(input, reply);
  const data = {
    isMock: true,
    reply,
    alternatives,
    styleMatchNotes: [
      getFallbackProfileNote(input.personaProfile),
      "只打一个核心矛盾",
      "短句收口，没有低级辱骂"
    ],
    riskLevel: "safe"
  };

  return {
    success: true,
    data,
    isMock: data.isMock,
    reply: data.reply,
    alternatives: data.alternatives,
    styleMatchNotes: data.styleMatchNotes,
    riskLevel: data.riskLevel
  };
}

function buildFallbackReply(input) {
  const opponent = input.opponentMessage || "";
  const conflict = inferConflict(input);
  const mode = input.mode || "close_to_user";
  const strength = input.strength || "balanced";

  if (mode === "stronger" || strength === "strong") {
    return shortenReply(`${catchOpponent(opponent)}别把问题推给我。${conflict.strong}`);
  }
  if (mode === "clearer") {
    return shortenReply(`${catchOpponent(opponent)}问题很简单，${conflict.clear}`);
  }
  return shortenReply(`${catchOpponent(opponent)}${conflict.normal}`);
}

function buildFallbackAlternatives(input, reply) {
  const conflict = inferConflict(input);
  const options = [
    shortenReply(`${catchOpponent(input.opponentMessage)}${conflict.boundary}`),
    shortenReply(`别绕。${conflict.clear}`),
    shortenReply(`${conflict.question}`)
  ].filter((item) => item && item !== reply);
  return options.slice(0, 2);
}

function inferConflict(input) {
  const text = `${input.opponentMessage || ""} ${input.background || ""} ${input.goal || ""}`;
  if (/忙|没空|取消|改约|不回|消息/.test(text)) {
    return {
      normal: "问题不是你忙，是你总把我的时间放到最后。",
      clear: "不是今天来不来，是你一直没把约定当回事。",
      strong: "你不是没时间，你是没把我的时间当回事。",
      boundary: "我的时间不是你的备用选项。",
      question: "每次都临时变，凭什么还要我当没事？"
    };
  }
  if (/敏感|小题大做|上纲上线|又开始/.test(text)) {
    return {
      normal: "别给我贴情绪标签。你回避的，是你该负责的事。",
      clear: "不是我敏感，是你一直在把责任推成我的情绪。",
      strong: "你少拿敏感堵我。该回应的是你的问题。",
      boundary: "你可以不认，但别再把锅扣到我情绪上。",
      question: "一提问题就是我敏感，这招你还要用几次？"
    };
  }
  if (/规则|退款|客服|质量|售后|处理/.test(text)) {
    return {
      normal: "别拿规则糊弄我。问题是东西有问题，你得给处理。",
      clear: "不是我没看清，是你们没有解决质量问题。",
      strong: "少把售后踢给我。东西有问题，就该处理。",
      boundary: "我只要明确方案，别再绕规则。",
      question: "质量问题不处理，光让我看规则有什么用？"
    };
  }
  if (/室友|卫生|宿舍|公共|轮流/.test(text)) {
    return {
      normal: "别扯我做得怎样。现在说的是你没守公共规则。",
      clear: "问题不是谁更完美，是轮到你的事你没做。",
      strong: "少拿别人挡枪。轮到你，就别装没看见。",
      boundary: "公共规则不是看心情执行的。",
      question: "轮到你就消失，提醒你就成我事多？"
    };
  }
  if (/甩锅|责任|项目|同事|工作|要求高/.test(text)) {
    return {
      normal: "别把延期说成大家的锅。你没交付，这就是核心。",
      clear: "问题不是我要求高，是你该交的东西没交。",
      strong: "少把责任摊平。没做完的是你，不是大家。",
      boundary: "该谁负责就谁负责，别拿团队当挡箭牌。",
      question: "你没按时交，怎么就变成我要求高？"
    };
  }
  return {
    normal: "别转移重点。问题不是我的态度，是你一直没正面回应。",
    clear: "核心只有一个：你在回避问题，不是在解决问题。",
    strong: "少绕。你现在不是解释，是逃避。",
    boundary: "你不正面回应，我也不继续陪你绕。",
    question: "问题摆在这，你还准备绕多久？"
  };
}

function catchOpponent(opponentMessage = "") {
  if (/又开始/.test(opponentMessage)) return "我不是又开始。";
  if (/敏感|小题大做|上纲上线/.test(opponentMessage)) return "别说我敏感。";
  if (/忙|没空/.test(opponentMessage)) return "忙不是免死金牌。";
  if (/规则|自己看/.test(opponentMessage)) return "别拿规则挡事。";
  if (/不怪我|不能全怪我|不是我/.test(opponentMessage)) return "别急着撇清。";
  if (/随便|算了|不想说/.test(opponentMessage)) return "别用冷处理收场。";
  return "先别绕。";
}

function getFallbackProfileNote(profile = {}) {
  const name = profile.profileName || profile.typeName || profile.name;
  return name ? `按「${name}」的短句边界感生成` : "按当前嘴替短句风格生成";
}

export function normalizePersonaReplyResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    const error = new Error("AI returned invalid persona reply JSON");
    error.status = 502;
    throw error;
  }

  const variants = result.variants && typeof result.variants === "object" ? result.variants : {};
  const reply = shortenReply(textOf(result.reply || result.myStyleReply || variants.balanced || variants.stronger || variants.softer));

  if (!reply) {
    const error = new Error("AI persona reply JSON missing reply");
    error.status = 502;
    throw error;
  }

  const normalized = {
    success: true,
    isMock: false,
    styleAnalysis: textOf(result.styleAnalysis),
    mainline: result.mainline || { fact: "", impact: "", request: "", boundary: "" },
    usedPersonaSignals: Array.isArray(result.usedPersonaSignals) ? result.usedPersonaSignals : [],
    usedTechniques: Array.isArray(result.usedTechniques) ? result.usedTechniques : [],
    reply,
    myStyleReply: shortenReply(textOf(result.myStyleReply || reply)),
    variants: {
      softer: shortenReply(textOf(variants.softer || result.softerReply)),
      balanced: shortenReply(textOf(variants.balanced || reply)),
      stronger: shortenReply(textOf(variants.stronger || result.strongerReply)),
      sarcastic: shortenReply(textOf(variants.sarcastic)),
      finalBoundary: shortenReply(textOf(variants.finalBoundary || result.pauseReply))
    },
    softerReply: shortenReply(textOf(result.softerReply || variants.softer)),
    strongerReply: shortenReply(textOf(result.strongerReply || variants.stronger)),
    pauseReply: shortenReply(textOf(result.pauseReply || variants.finalBoundary)),
    riskNotes: Array.isArray(result.riskNotes) ? result.riskNotes : [],
    copyableReplies: normalizeShortReplies(Array.isArray(result.copyableReplies) ? result.copyableReplies : [reply])
  };

  normalized.data = {
    isMock: normalized.isMock,
    reply: normalized.reply,
    alternatives: normalized.copyableReplies.filter((item) => item && item !== normalized.reply).slice(0, 3),
    styleMatchNotes: normalized.usedPersonaSignals,
    riskLevel: normalized.riskNotes.length ? "review" : "safe"
  };

  return normalized;
}

function normalizeStrength(value) {
  const normalized = textOf(value);
  return strengthMap.get(normalized) || "balanced";
}

function textOf(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeShortReplies(values) {
  const replies = values.map((value) => shortenReply(textOf(value))).filter(Boolean);
  return replies.length ? replies : ["别把问题推给我。你回避的不是情绪，是你该负责的事。"];
}

function shortenReply(value) {
  const cleaned = removeForbiddenPhrases(value)
    .replace(/\s+/g, "")
    .replace(/^[，。！？、；：]+/, "");
  if (cleaned.length <= 80) return cleaned;

  const sentences = cleaned.split(/(?<=[。！？?!])/u).filter(Boolean);
  let result = "";
  for (const sentence of sentences) {
    if ((result + sentence).length > 80) break;
    result += sentence;
  }
  return result || `${cleaned.slice(0, 78)}。`;
}

function removeForbiddenPhrases(value) {
  return [
    "我理解你",
    "建议沟通",
    "你的感受合理",
    "好好沟通",
    "冷静沟通",
    "我明白你的感受",
    "我能理解"
  ].reduce((text, phrase) => text.replaceAll(phrase, ""), value);
}

function shouldUseMockReply(error) {
  return (
    error?.code === "MISSING_AI_API_KEY" ||
    error?.code === "MISSING_OPENAI_API_KEY" ||
    error?.code === "AI_REQUEST_FAILED" ||
    error?.message === "AI 返回格式解析失败" ||
    error?.message === "AI returned invalid persona reply JSON" ||
    error?.message === "AI persona reply JSON missing reply"
  );
}

function hasAIKeyConfigured() {
  return Boolean(process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY);
}
