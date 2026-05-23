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
  "expressionDNA": {
    "averageSentenceLength": "",
    "messageLengthPreference": "",
    "openingPatterns": [],
    "closingPatterns": [],
    "transitionPatterns": [],
    "questionFrequency": "",
    "exclamationFrequency": "",
    "ellipsisFrequency": "",
    "firstPersonUsage": "",
    "certaintyLevel": "",
    "emotionalDensity": "",
    "rhythm": "",
    "iconicPhrases": [],
    "repeatedWords": [],
    "punctuationHabits": "",
    "internetSlangLevel": "",
    "formalityLevel": ""
  },
  "thinkingPattern": {
    "howTheyFrameProblems": "",
    "howTheyJustifyThemselves": "",
    "howTheyReadOthers": "",
    "howTheyEscalateConflict": "",
    "howTheyDeEscalateConflict": "",
    "coreBeliefsInConflict": []
  },
  "conflictHeuristics": {
    "whenAccused": "",
    "whenIgnored": "",
    "whenMocked": "",
    "whenGaslighted": "",
    "whenOpponentAvoidsResponsibility": "",
    "whenSettingBoundary": "",
    "whenEndingConversation": ""
  },
  "antiPatterns": {
    "neverUseTone": [],
    "neverUseWords": [],
    "neverUseStructures": [],
    "avoidPersonaDrift": [],
    "examplesOfBadImitation": []
  },
  "honestBoundaries": {
    "sampleSize": "",
    "confidence": "",
    "limitations": [],
    "sourceStage": "",
    "whatCanBeImitated": [],
    "whatShouldNotBeClaimed": []
  },
  "qualityChecklist": {
    "doesItSoundLikeTarget": "",
    "avoidsGenericAIStyle": true,
    "avoidsOverPolishing": true,
    "avoidsCopyingSourceText": true,
    "keepsOriginalEmotionalLogic": true,
    "respectsAntiPatterns": true,
    "safetyPassed": true
  },
  "styleReproductionGuide": {
    "primaryGoal": "",
    "stylePriority": [],
    "sentenceRules": [],
    "vocabularyRules": [],
    "emotionRules": [],
    "logicRules": [],
    "forbiddenDrifts": []
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
- expressionDNA: describe observable expression habits, not personality guesses.
- antiPatterns: record what would make imitation drift away from this speaker.
- honestBoundaries: state what the source can and cannot support. Do not claim private motives or facts not visible in the source.
- qualityChecklist: self-check the profile for recognizable style, non-generic language, source-text non-copying, anti-pattern respect, and safety.
- styleReproductionGuide: practical rules for PersonaReplySkill to preserve sentence habits, vocabulary, emotion path, and logic order.
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
      maxCompletionTokens: 3200
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
    expressionDNA: {
      averageSentenceLength: "中等偏长",
      messageLengthPreference: "倾向于几句话连成一段，把前因后果说完整",
      openingPatterns: ["我不是", "其实", "我真的觉得"],
      closingPatterns: ["你至少要尊重我的感受", "这件事不能每次都这样过去"],
      transitionPatterns: ["但是", "问题是", "所以", "不是……而是……"],
      questionFrequency: "中等，常用反问确认对方逻辑",
      exclamationFrequency: "低",
      ellipsisFrequency: "中等，常用于留出情绪停顿",
      firstPersonUsage: "高，频繁用我来澄清立场和感受",
      certaintyLevel: "中高，先解释再给出明确判断",
      emotionalDensity: "中等，有委屈但不爆炸",
      rhythm: "先铺垫解释，再指出问题，最后收束边界",
      iconicPhrases: ["我不是", "我只是", "问题不是", "你每次都"],
      repeatedWords: ["真的", "每次", "感受", "尊重"],
      punctuationHabits: "逗号较多，问号适中，感叹号较少",
      internetSlangLevel: "低",
      formalityLevel: "口语化但不粗俗"
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
    thinkingPattern: {
      howTheyFrameProblems: "把单次争执放到长期互动模式里理解",
      howTheyJustifyThemselves: "先说明自己不是无理取闹，再说明自己的需求合理",
      howTheyReadOthers: "会关注对方是否在逃避责任、轻描淡写自己的感受",
      howTheyEscalateConflict: "从澄清立场升级到指出长期忽视，再表达失望",
      howTheyDeEscalateConflict: "用边界和具体请求把争执拉回可处理的问题",
      coreBeliefsInConflict: ["感受需要被认真对待", "约定应该被尊重", "解释不能代替负责"]
    },
    conflictHeuristics: {
      whenAccused: "先否认自己是在无理取闹，再把焦点拉回具体行为",
      whenIgnored: "强调自己不是第一次被这样对待，并说明累积伤害",
      whenMocked: "指出对方把问题轻飘飘带过，而不是正面回应",
      whenGaslighted: "澄清这不是自己太敏感，而是对方处理方式有问题",
      whenOpponentAvoidsResponsibility: "拆开对方的解释和真正该承担的责任",
      whenSettingBoundary: "先讲清感受，再提出以后不能继续接受的处理方式",
      whenEndingConversation: "不放狠话，用失望和边界收尾"
    },
    antiPatterns: {
      neverUseTone: ["爽文式碾压", "古风腔", "霸总命令口吻", "TVB式夸张对白", "发疯文学"],
      neverUseWords: ["滚", "废物", "贱", "死", "毁了你"],
      neverUseStructures: ["排比式审判长文", "过度金句化", "突然第三人称旁白", "大段AI总结"],
      avoidPersonaDrift: ["不要突然变得极端强势", "不要加入过多网络热梗", "不要把克制解释变成冷冰冰说教"],
      examplesOfBadImitation: [
        "你这种人根本不配跟我说话。",
        "本宫今日便让你知道什么叫边界。",
        "综上所述，你的行为存在以下三点问题。"
      ]
    },
    honestBoundaries: {
      sampleSize: "mock 示例文本较少",
      confidence: "medium",
      limitations: ["只能根据上传文本初步判断", "无法确认目标人物真实动机", "不能保证覆盖所有场景"],
      sourceStage: "demo_mock",
      whatCanBeImitated: ["第一人称澄清", "先解释再反击", "克制提出边界"],
      whatShouldNotBeClaimed: ["真实人格", "长期心理状态", "未在文本中出现的私人事实"]
    },
    qualityChecklist: {
      doesItSoundLikeTarget: "保留了先解释、再指出问题、最后设边界的习惯",
      avoidsGenericAIStyle: true,
      avoidsOverPolishing: true,
      avoidsCopyingSourceText: true,
      keepsOriginalEmotionalLogic: true,
      respectsAntiPatterns: true,
      safetyPassed: true
    },
    styleReproductionGuide: {
      primaryGoal: "优先像目标人物本人，而不是追求爽感或攻击性",
      stylePriority: ["表达习惯", "句式结构", "情绪路径", "逻辑顺序", "安全边界"],
      sentenceRules: ["多用第一人称", "先澄清不是要吵", "再指出对方长期模式", "最后提出边界"],
      vocabularyRules: ["可使用我不是、我只是、问题是、每次、感受、尊重", "避免粗口和过度网络热梗"],
      emotionRules: ["委屈和不满可以明显，但不要失控辱骂", "强度提高也要保留克制感"],
      logicRules: ["先说明自己的合理性", "再拆对方逃避责任的部分", "最后落到具体边界"],
      forbiddenDrifts: ["古风", "霸总", "TVB", "发疯文学", "通用AI作文"]
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
    expressionDNA: normalizeExpressionDNA(result.expressionDNA, result, input),
    thinkingPattern: normalizeThinkingPattern(result.thinkingPattern, result),
    conflictHeuristics: normalizeConflictHeuristics(result.conflictHeuristics),
    antiPatterns: normalizeAntiPatterns(result.antiPatterns, result),
    honestBoundaries: normalizeHonestBoundaries(result.honestBoundaries, input),
    qualityChecklist: normalizeQualityChecklist(result.qualityChecklist),
    styleReproductionGuide: normalizeStyleReproductionGuide(result.styleReproductionGuide, result),
    systemPromptFragment: result.systemPromptFragment,
    analyzedPartOnly: input.analyzedPartOnly
  };
}

function normalizeExpressionDNA(value, result, input) {
  const languageFeatures = result.languageFeatures && typeof result.languageFeatures === "object" ? result.languageFeatures : {};
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    averageSentenceLength: textOr(source.averageSentenceLength, "unknown"),
    messageLengthPreference: textOr(source.messageLengthPreference, languageFeatures.sentencePattern || "unknown"),
    openingPatterns: arrayOfText(source.openingPatterns),
    closingPatterns: arrayOfText(source.closingPatterns),
    transitionPatterns: arrayOfText(source.transitionPatterns),
    questionFrequency: textOr(source.questionFrequency, "unknown"),
    exclamationFrequency: textOr(source.exclamationFrequency, "unknown"),
    ellipsisFrequency: textOr(source.ellipsisFrequency, "unknown"),
    firstPersonUsage: textOr(source.firstPersonUsage, input.targetSpeaker ? "target speaker focused" : "unknown"),
    certaintyLevel: textOr(source.certaintyLevel, "unknown"),
    emotionalDensity: textOr(source.emotionalDensity, languageFeatures.tone || "unknown"),
    rhythm: textOr(source.rhythm, languageFeatures.rhythm || ""),
    iconicPhrases: arrayOfText(source.iconicPhrases),
    repeatedWords: arrayOfText(source.repeatedWords),
    punctuationHabits: textOr(source.punctuationHabits, languageFeatures.emojiAndPunctuation || ""),
    internetSlangLevel: textOr(source.internetSlangLevel, "unknown"),
    formalityLevel: textOr(source.formalityLevel, "unknown")
  };
}

function normalizeThinkingPattern(value, result) {
  const argumentStyle = result.argumentStyle && typeof result.argumentStyle === "object" ? result.argumentStyle : {};
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    howTheyFrameProblems: textOr(source.howTheyFrameProblems, argumentStyle.logicPattern || ""),
    howTheyJustifyThemselves: textOr(source.howTheyJustifyThemselves, argumentStyle.explanationPattern || ""),
    howTheyReadOthers: textOr(source.howTheyReadOthers, argumentStyle.counterattackPattern || ""),
    howTheyEscalateConflict: textOr(source.howTheyEscalateConflict, argumentStyle.conflictEscalationPattern || ""),
    howTheyDeEscalateConflict: textOr(source.howTheyDeEscalateConflict, argumentStyle.closingPattern || ""),
    coreBeliefsInConflict: arrayOfText(source.coreBeliefsInConflict)
  };
}

function normalizeConflictHeuristics(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    whenAccused: textOr(source.whenAccused, ""),
    whenIgnored: textOr(source.whenIgnored, ""),
    whenMocked: textOr(source.whenMocked, ""),
    whenGaslighted: textOr(source.whenGaslighted, ""),
    whenOpponentAvoidsResponsibility: textOr(source.whenOpponentAvoidsResponsibility, ""),
    whenSettingBoundary: textOr(source.whenSettingBoundary, ""),
    whenEndingConversation: textOr(source.whenEndingConversation, "")
  };
}

function normalizeAntiPatterns(value, result) {
  const safetyBoundary = result.safetyBoundary && typeof result.safetyBoundary === "object" ? result.safetyBoundary : {};
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    neverUseTone: arrayOfText(source.neverUseTone),
    neverUseWords: arrayOfText(source.neverUseWords || safetyBoundary.doNotImitate),
    neverUseStructures: arrayOfText(source.neverUseStructures),
    avoidPersonaDrift: arrayOfText(source.avoidPersonaDrift),
    examplesOfBadImitation: arrayOfText(source.examplesOfBadImitation)
  };
}

function normalizeHonestBoundaries(value, input) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    sampleSize: textOr(source.sampleSize, `${input.analyzedTextLength} analyzed characters`),
    confidence: textOr(source.confidence, input.rawTextLength > 600 ? "medium" : "low"),
    limitations: arrayOfText(source.limitations),
    sourceStage: textOr(source.sourceStage, input.analyzedPartOnly ? "partial_upload" : "full_upload"),
    whatCanBeImitated: arrayOfText(source.whatCanBeImitated),
    whatShouldNotBeClaimed: arrayOfText(source.whatShouldNotBeClaimed)
  };
}

function normalizeQualityChecklist(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    doesItSoundLikeTarget: textOr(source.doesItSoundLikeTarget, ""),
    avoidsGenericAIStyle: booleanOr(source.avoidsGenericAIStyle, true),
    avoidsOverPolishing: booleanOr(source.avoidsOverPolishing, true),
    avoidsCopyingSourceText: booleanOr(source.avoidsCopyingSourceText, true),
    keepsOriginalEmotionalLogic: booleanOr(source.keepsOriginalEmotionalLogic, true),
    respectsAntiPatterns: booleanOr(source.respectsAntiPatterns, true),
    safetyPassed: booleanOr(source.safetyPassed, true)
  };
}

function normalizeStyleReproductionGuide(value, result) {
  const imitationGuide = result.imitationGuide && typeof result.imitationGuide === "object" ? result.imitationGuide : {};
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    primaryGoal: textOr(source.primaryGoal, "优先像目标人物本人，而不是追求通用爽感。"),
    stylePriority: arrayOfText(source.stylePriority),
    sentenceRules: arrayOfText(source.sentenceRules),
    vocabularyRules: arrayOfText(source.vocabularyRules),
    emotionRules: arrayOfText(source.emotionRules),
    logicRules: arrayOfText(source.logicRules || imitationGuide.dos),
    forbiddenDrifts: arrayOfText(source.forbiddenDrifts || imitationGuide.donts)
  };
}

function arrayOfText(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) : [];
}

function textOr(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function booleanOr(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function shouldUseMockPersona(error) {
  return (
    error?.code === "MISSING_AI_API_KEY" ||
    error?.code === "MISSING_OPENAI_API_KEY" ||
    error?.code === "AI_REQUEST_FAILED" ||
    error?.message === "AI 返回格式解析失败" ||
    error?.message === "AI returned invalid persona extraction JSON" ||
    error?.message?.startsWith("AI persona extraction JSON missing fields:")
  );
}
