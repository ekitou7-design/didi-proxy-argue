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
- styleAnalysis: explain briefly which persona signals you used.
- usedPersonaSignals: 3-6 concrete style features from personaProfile.
- reply and myStyleReply: same best recommended reply for the requested mode and strength.
- variants: safe alternatives with different intensity.
- copyableReplies: 2-4 short ready-to-send replies.
- usedPersonaSignals: mention concrete fields used from expressionDNA, sentencePatterns, emotionalPattern, conflictHeuristics, antiPatterns, or styleReproductionGuide.
- riskNotes: include honest boundary notes if the profile sample is weak or likely to drift.
- If evidence is weak, still generate, but state the limitation in riskNotes and avoid over-stylizing.
`
  };
}

export async function generatePersonaReply(body) {
  const input = preparePersonaReplyInput(body);

  try {
    const result = await requestJsonFromAI({
      ...buildPersonaSkillReplyPrompt(input),
      temperature: 0.45,
      maxCompletionTokens: 1700
    });

    return normalizePersonaReplyResult(result);
  } catch (error) {
    if (shouldUseMockReply(error)) {
      return buildMockPersonaReply();
    }
    throw error;
  }
}

export function buildMockPersonaReply() {
  const data = {
    isMock: true,
    reply:
      "我不是非要跟你吵，我只是觉得你每次都用忙来解释，然后就好像我的感受都变成了我太敏感。问题不是这一条消息，而是你一直让我觉得自己没有被认真对待。",
    alternatives: [
      "我真的不是想把事情闹大，我只是觉得你每次都这样，我会很累。",
      "你可以忙，但你不能每次都让我自己消化，然后还觉得是我想太多。"
    ],
    styleMatchNotes: [
      "保留了先自我澄清再指出问题的结构",
      "使用了“我不是……我只是……”句式",
      "没有加入粗口或过度网络腔"
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

export function normalizePersonaReplyResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    const error = new Error("AI returned invalid persona reply JSON");
    error.status = 502;
    throw error;
  }

  const variants = result.variants && typeof result.variants === "object" ? result.variants : {};
  const reply = textOf(result.reply || result.myStyleReply || variants.balanced || variants.stronger || variants.softer);

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
    myStyleReply: textOf(result.myStyleReply || reply),
    variants: {
      softer: textOf(variants.softer || result.softerReply),
      balanced: textOf(variants.balanced || reply),
      stronger: textOf(variants.stronger || result.strongerReply),
      sarcastic: textOf(variants.sarcastic),
      finalBoundary: textOf(variants.finalBoundary || result.pauseReply)
    },
    softerReply: textOf(result.softerReply || variants.softer),
    strongerReply: textOf(result.strongerReply || variants.stronger),
    pauseReply: textOf(result.pauseReply || variants.finalBoundary),
    riskNotes: Array.isArray(result.riskNotes) ? result.riskNotes : [],
    copyableReplies: Array.isArray(result.copyableReplies) ? result.copyableReplies : [reply]
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
