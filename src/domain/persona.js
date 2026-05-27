import {
  dedicatedPersonaPersonalities,
  dedicatedPersonaPersonalityWeights
} from "../data/njutiQuizData.js";

export function getCurrentProxyProfile(proxyPersona) {
  return (
    proxyPersona.personas.find((persona) => String(persona.id) === String(proxyPersona.selectedPersonaId)) ||
    proxyPersona.currentProfile
  );
}

export function getProfileTagsForLayout(profile) {
  if (!profile) return ["先创建", "再开吵"];
  return (profile.personaProfile?.personalityTags || profile.tags || profile.styleProfile?.commonPhrases || ["专属", "边界"]).slice(0, 4);
}

export function makeDistillResult(personaProfile, upload) {
  const profile = personaProfile.styleProfile || personaProfile;
  return {
    id: `distill-${Date.now()}`,
    createdAt: new Date().toISOString(),
    sourceType: "chat_upload",
    profileName: personaProfile.profileName || personaProfile.name || "我的蒸馏嘴替",
    targetSpeaker: personaProfile.targetSpeaker || upload.targetSpeaker || "",
    relationship: upload.relationship || "",
    background: upload.background || "",
    personaProfile,
    styleProfile: {
      tone: profile.tone || personaProfile.languageFeatures?.tone || "冷静但有压迫感",
      emotionLevel: Number(profile.emotionLevel || 3),
      logicStyle: profile.logicStyle || personaProfile.argumentStyle?.logicPattern || "先指出问题，再反问对方逻辑漏洞，最后给出边界",
      commonPhrases:
        profile.commonPhrases ||
        personaProfile.languageFeatures?.sampleLines ||
        personaProfile.languageFeatures?.vocabulary ||
        ["你先别转移话题", "我现在说的是这件事本身", "这不是我敏感，是你的处理方式有问题"],
      avoidWords: profile.avoidWords || personaProfile.safetyBoundary?.doNotImitate || ["脏话", "人身攻击", "过度服软"],
      replyStrategy: profile.replyStrategy || personaProfile.imitationGuide?.replyFormula || "不跟随对方转移话题，持续围绕核心问题推进",
      profileSummary: profile.profileSummary || personaProfile.sourceSummary || personaProfile.corePersonality?.summary || "适合生成冷静、清楚、有边界感的个性化回应。"
    }
  };
}

export function makeMockDistillProfile() {
  return {
    personaProfile: {
      profileName: "我的蒸馏嘴替",
      tone: "冷静但有压迫感",
      emotionLevel: 3,
      logicStyle: "先指出问题，再反问对方逻辑漏洞，最后给出边界",
      commonPhrases: ["你先别转移话题", "我现在说的是这件事本身", "这不是我敏感，是你的处理方式有问题"],
      avoidWords: ["脏话", "人身攻击", "过度服软"],
      replyStrategy: "不跟随对方转移话题，持续围绕核心问题推进",
      profileSummary: "适合生成冷静、清楚、有边界感的个性化回应。"
    }
  };
}

export function makeTestResult(testAnswers) {
  const scores = Object.fromEntries(Object.keys(dedicatedPersonaPersonalities).map((key) => [key, 0]));

  Object.entries(testAnswers).forEach(([questionId, answer]) => {
    const weights = dedicatedPersonaPersonalityWeights[questionId]?.[answer];
    if (!weights) return;
    Object.entries(weights).forEach(([key, value]) => {
      scores[key] = (scores[key] || 0) + value;
    });
  });

  let resultKey = "RESTRAINED";
  Object.entries(scores).forEach(([key, value]) => {
    if (value > scores[resultKey]) resultKey = key;
  });

  const base = dedicatedPersonaPersonalities[resultKey] || dedicatedPersonaPersonalities.RESTRAINED;
  return normalizeTestResult({
    id: `test-${Date.now()}`,
    createdAt: new Date().toISOString(),
    sourceType: "test",
    resultKey,
    scores,
    ...base
  });
}

export function normalizeDistillResult(result) {
  const profile = result.styleProfile || result;
  return {
    id: String(result.id || `distill-${Date.now()}`),
    createdAt: result.createdAt || new Date().toISOString(),
    sourceType: "chat_upload",
    profileName: result.profileName || result.name || "我的蒸馏嘴替",
    targetSpeaker: result.targetSpeaker || "",
    relationship: result.relationship || "",
    background: result.background || "",
    personaProfile: result.personaProfile || result,
    styleProfile: {
      tone: profile.tone || "冷静但有压迫感",
      emotionLevel: Number(profile.emotionLevel || 3),
      logicStyle: profile.logicStyle || "",
      commonPhrases: profile.commonPhrases || [],
      avoidWords: profile.avoidWords || [],
      replyStrategy: profile.replyStrategy || "",
      profileSummary: profile.profileSummary || ""
    }
  };
}

export function normalizeTestResult(result) {
  const fallback = dedicatedPersonaPersonalities.RESTRAINED;
  const typeName = result.typeName || result.name || fallback.typeName;
  const nickname = result.nickname || fallback.nickname;
  const subtitle = result.subtitle || fallback.subtitle;
  const tags = result.tags || result.dimensions || fallback.tags;
  const styleProfile = result.styleProfile || fallback.styleProfile;
  return {
    id: String(result.id || `test-${Date.now()}`),
    createdAt: result.createdAt || new Date().toISOString(),
    sourceType: "test",
    resultKey: result.resultKey || "",
    emoji: result.emoji || fallback.emoji,
    category: result.category || fallback.category,
    scores: result.scores || {},
    typeName,
    nickname,
    subtitle,
    tags,
    styleProfile: {
      tone: styleProfile.tone || typeName,
      emotionLevel: Number(styleProfile.emotionLevel || 3),
      logicStyle: styleProfile.logicStyle || nickname,
      commonPhrases: styleProfile.commonPhrases || tags,
      avoidWords: styleProfile.avoidWords || ["脏话", "人身攻击"],
      replyStrategy: styleProfile.replyStrategy || subtitle,
      profileSummary: styleProfile.profileSummary || subtitle
    }
  };
}

export function mergePersonas(distillResults, testResults) {
  return [...distillResults, ...testResults];
}

export function normalizeProfile(profile) {
  if (profile.sourceType === "chat_upload" || profile.profileName) return normalizeDistillResult(profile);
  return normalizeTestResult(profile);
}

export function getProfileName(profile) {
  return profile.profileName || profile.typeName || profile.name || "我的嘴替";
}

export function getProfileTone(profile) {
  return profile.styleProfile?.tone || profile.tone || profile.typeName || "";
}

export function makeLocalReply(replyForm, styleProfile) {
  const profile = styleProfile.styleProfile || styleProfile;
  const phrase = profile.commonPhrases?.[0] || "你先别转移话题";
  const strategy = profile.replyStrategy || "拉回主线，压住对方的偷换概念。";
  return {
    reply: `${phrase}。你刚才这句话是在把问题转成我的情绪。现在要谈的是${replyForm.goal || "这件事怎么处理"}，不是我有没有资格不舒服。请你正面回应。`,
    strategy: `本地预览：按「${getProfileName(styleProfile)}」人格生成。${strategy}`,
    tone: getProfileTone(styleProfile) || "温柔但有边界"
  };
}

export function mapReplyMode(mode) {
  if (mode === "说得更清楚") return "clearer";
  if (mode === "攻击力加强") return "stronger";
  return "close_to_user";
}
