import { requestJsonFromAI } from "./openaiClient.mjs";

const MAX_RAW_TEXT_LENGTH = 100_000;
const MAX_ANALYZED_TEXT_LENGTH = 18_000;
const validSourceTypes = new Set(["chat", "script", "unknown"]);
const validExtractionModes = new Set(["single", "multi"]);

export function preparePersonaExtractionInput(body = {}) {
  const rawText = typeof body.rawText === "string" ? body.rawText.trim() : "";

  if (!rawText) {
    const error = new Error("rawText is required");
    error.status = 400;
    throw error;
  }

  if (rawText.length > MAX_RAW_TEXT_LENGTH) {
    const error = new Error(`rawText is too long. Maximum length is ${MAX_RAW_TEXT_LENGTH} characters.`);
    error.status = 413;
    throw error;
  }

  const sourceType = validSourceTypes.has(body.sourceType) ? body.sourceType : "unknown";
  const extractionMode = validExtractionModes.has(body.extractionMode) ? body.extractionMode : "single";
  const targetSpeaker = typeof body.targetSpeaker === "string" ? body.targetSpeaker.trim() : "";

  if (!targetSpeaker) {
    const error = new Error("targetSpeaker is required");
    error.status = 400;
    throw error;
  }

  const analyzedPartOnly = rawText.length > MAX_ANALYZED_TEXT_LENGTH;

  return {
    rawText,
    analysisText: analyzedPartOnly ? rawText.slice(0, MAX_ANALYZED_TEXT_LENGTH) : rawText,
    targetSpeaker,
    sourceType,
    extractionMode,
    analyzedPartOnly,
    rawTextLength: rawText.length,
    analyzedTextLength: Math.min(rawText.length, MAX_ANALYZED_TEXT_LENGTH)
  };
}

export function buildPersonaExtractionPrompt(input) {
  return {
    system: `
You are PersonaExtractorSkill, a backend-only analyzer for a Chinese mobile app.
Return only one valid JSON object. Do not use markdown or code fences.

Your job is to extract the target speaker's arguing and speaking persona from the provided chat log or script.
Focus on the named targetSpeaker. Do not summarize the whole text unless it helps explain that speaker.
If the source has multiple speakers, separate the target speaker's language material from other people's lines.
Analyze what the target speaker says, how they express emotion, how they counterattack, explain, tease sarcastically,
reason, escalate conflict, and end arguments.
Do not generate insults, threats, discriminatory phrases, sexual content, private data, doxxing details, or instructions for harm.
When the source contains unsafe or private content, summarize it abstractly and put the constraint in safetyBoundary.
sampleLines must be original, newly written examples that demonstrate style. Do not copy any sentence from the source text.
Keep all generated examples safe, non-abusive, non-threatening, and non-discriminatory.
If evidence is insufficient, say so instead of inventing exact facts.
Core principle for future use: first preserve the target speaker's habits, then make the user's point clearer; strengthen attack only within the extracted style.
`,
    user: `
Input:
${JSON.stringify(
  {
    targetSpeaker: input.targetSpeaker || null,
    sourceType: input.sourceType,
    extractionMode: input.extractionMode,
    analyzedPartOnly: input.analyzedPartOnly,
    rawTextLength: input.rawTextLength,
    analyzedTextLength: input.analyzedTextLength,
    text: input.analysisText
  },
  null,
  2
)}

Return this exact JSON shape:
{
  "profileName": "",
  "sourceSummary": "",
  "targetSpeaker": "",
  "targetEvidence": {
    "speakerDetection": "",
    "usableMaterialSummary": "",
    "evidenceLimitations": []
  },
  "personalityTags": [],
  "corePersonality": {
    "summary": "",
    "traits": [],
    "emotionalBaseline": "",
    "values": [],
    "conflictTriggers": []
  },
  "languageFeatures": {
    "tone": "",
    "sentencePattern": "",
    "vocabulary": [],
    "rhythm": "",
    "emojiAndPunctuation": "",
    "commonMoves": [],
    "emotionMoves": [],
    "sarcasmPattern": "",
    "sampleLines": []
  },
  "argumentStyle": {
    "logicPattern": "",
    "counterattackPattern": "",
    "explanationPattern": "",
    "conflictEscalationPattern": "",
    "closingPattern": "",
    "pressureStyle": "",
    "boundaryStyle": "",
    "weaknesses": [],
    "recommendedUseCases": []
  },
  "imitationGuide": {
    "dos": [],
    "donts": [],
    "replyFormula": "",
    "strengthLevels": {
      "soft": "",
      "balanced": "",
      "strong": ""
    }
  },
  "safetyBoundary": {
    "doNotImitate": [],
    "privacyNotes": [],
    "unsafeContentPolicy": ""
  },
  "systemPromptFragment": "",
  "analyzedPartOnly": ${input.analyzedPartOnly}
}

Field rules:
- profileName: short Chinese name for this persona profile.
- targetSpeaker: use the requested speaker if present; otherwise infer the main speaker or return "unknown".
- targetEvidence: explain how you identified usable material for this speaker.
- personalityTags: 4-8 short tags.
- sampleLines: 3-5 original safe lines, not copied from source.
- systemPromptFragment: concise Chinese instruction fragment that future reply generation can reuse.
- Do not force the style into melodrama, CEO romance, costume-drama diction, TVB diction, or rage-posting unless the evidence clearly supports it.
`
  };
}

export async function extractPersonaProfile(body) {
  const input = preparePersonaExtractionInput(body);
  const prompt = buildPersonaExtractionPrompt(input);

  try {
    const result = await requestJsonFromAI({
      ...prompt,
      temperature: 0.2,
      maxCompletionTokens: 1800
    });

    return normalizePersonaExtractionResult(result, input);
  } catch (error) {
    if (shouldUseMockPersona(error)) {
      return buildMockPersonaProfile(input);
    }
    throw error;
  }
}

export function buildMockPersonaProfile(input) {
  return {
    profileId: `mock-${Date.now()}`,
    profileName: "克制解释型嘴替",
    targetSpeaker: input.targetSpeaker,
    sourceType: input.sourceType,
    isMock: true,
    oneLineSummary: "根据上传文本初步生成的嘴替人格档案。",
    personalityTags: ["克制", "解释型", "重视边界", "先讲道理再表达不满"],
    languageFingerprint: {
      sentenceLength: "中等偏长",
      messageShape: "常用几句话组成一段完整表达",
      openingHabits: ["我不是", "其实", "我真的觉得"],
      transitionWords: ["但是", "问题是", "所以"],
      modalParticles: ["真的", "吧", "啊"],
      punctuationStyle: "问号较多，感叹号较少",
      internetSlangLevel: "低"
    },
    sentencePatterns: [
      "我不是……我只是……",
      "问题不是……而是……",
      "你每次都……然后还觉得是我……"
    ],
    emotionalPattern: {
      angerStyle: "先解释自己，再指出对方长期问题",
      defenseStyle: "倾向于先澄清自己不是无理取闹",
      conflictEscalation: "克制说明 → 指出问题 → 表达失望 → 提出边界"
    },
    conflictStrategies: {
      mainStrategy: "先自我澄清，再指出对方行为中的问题",
      typicalMoves: ["自我澄清", "指出长期模式", "表达感受", "设立边界"]
    },
    replyStructure: [
      "先自我澄清",
      "再指出对方行为",
      "再说明自己的感受",
      "最后提出边界"
    ],
    generationRules: {
      mustKeep: ["第一人称", "先解释再反击", "不要突然变成爽文腔"],
      mustAvoid: ["粗口", "威胁", "歧视", "隐私曝光", "过度网络热梗"]
    },
    safetyRules: {
      avoidThreats: true,
      avoidDiscrimination: true,
      avoidPrivacyExposure: true,
      avoidHarassment: true,
      avoidSeverePersonalAttack: true
    },
    systemPromptFragment: "生成回复时请使用第一人称，保留用户先解释、再指出问题、最后表达边界的表达习惯。",
    sourceSummary: "根据上传文本初步生成的嘴替人格档案。",
    languageFeatures: {
      tone: "克制、解释型、重视边界",
      sentencePattern: "先澄清自己的意图，再指出对方行为造成的问题。",
      vocabulary: ["我不是", "其实", "问题是", "所以"],
      sampleLines: [
        "我不是非要跟你吵，我只是觉得这件事不能每次都这样过去。",
        "问题不是你忙，而是你每次都让我自己消化。",
        "你可以有你的安排，但也要尊重我已经说过的感受。"
      ]
    },
    argumentStyle: {
      logicPattern: "先自我澄清，再指出对方行为中的问题",
      boundaryStyle: "克制说明后提出清晰边界"
    },
    imitationGuide: {
      replyFormula: "先自我澄清 → 再指出对方行为 → 再说明自己的感受 → 最后提出边界"
    },
    safetyBoundary: {
      doNotImitate: ["粗口", "威胁", "歧视", "隐私曝光", "过度网络热梗"],
      privacyNotes: [],
      unsafeContentPolicy: "保持安全表达，避免威胁、歧视、隐私曝光和严重人身攻击。"
    },
    analyzedPartOnly: input.analyzedPartOnly
  };
}

export function normalizePersonaExtractionResult(result, input) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    const error = new Error("AI returned invalid persona extraction JSON");
    error.status = 502;
    throw error;
  }

  const requiredFields = [
    "profileName",
    "sourceSummary",
    "targetSpeaker",
    "personalityTags",
    "corePersonality",
    "languageFeatures",
    "argumentStyle",
    "imitationGuide",
    "safetyBoundary",
    "systemPromptFragment"
  ];

  const missingFields = requiredFields.filter((field) => !(field in result));
  if (missingFields.length) {
    const error = new Error(`AI persona extraction JSON missing fields: ${missingFields.join(", ")}`);
    error.status = 502;
    throw error;
  }

  return {
    profileName: result.profileName,
    sourceSummary: result.sourceSummary,
    targetSpeaker: result.targetSpeaker || input.targetSpeaker || "unknown",
    targetEvidence: result.targetEvidence || {
      speakerDetection: "",
      usableMaterialSummary: "",
      evidenceLimitations: []
    },
    personalityTags: Array.isArray(result.personalityTags) ? result.personalityTags : [],
    corePersonality: result.corePersonality,
    languageFeatures: result.languageFeatures,
    argumentStyle: result.argumentStyle,
    imitationGuide: result.imitationGuide,
    safetyBoundary: result.safetyBoundary,
    systemPromptFragment: result.systemPromptFragment,
    analyzedPartOnly: input.analyzedPartOnly
  };
}

function shouldUseMockPersona(error) {
  return (
    error?.code === "MISSING_OPENAI_API_KEY" ||
    error?.code === "AI_REQUEST_FAILED" ||
    error?.message === "AI 返回格式解析失败" ||
    error?.message === "AI returned invalid persona extraction JSON" ||
    error?.message?.startsWith("AI persona extraction JSON missing fields:")
  );
}
