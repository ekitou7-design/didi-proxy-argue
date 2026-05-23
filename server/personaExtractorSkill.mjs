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

Your job is to infer personality, communication habits, and style-transfer guidance from the provided chat log or script.
Do not generate insults, threats, discriminatory phrases, sexual content, private data, doxxing details, or instructions for harm.
When the source contains unsafe or private content, summarize it abstractly and put the constraint in safetyBoundary.
sampleLines must be original, newly written examples that demonstrate style. Do not copy any sentence from the source text.
Keep all generated examples safe, non-abusive, non-threatening, and non-discriminatory.
If evidence is insufficient, say so instead of inventing exact facts.
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
    "sampleLines": []
  },
  "argumentStyle": {
    "logicPattern": "",
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
- personalityTags: 4-8 short tags.
- sampleLines: 3-5 original safe lines, not copied from source.
- systemPromptFragment: concise Chinese instruction fragment that future reply generation can reuse.
`
  };
}

export async function extractPersonaProfile(body) {
  const input = preparePersonaExtractionInput(body);
  const prompt = buildPersonaExtractionPrompt(input);
  const result = await requestJsonFromAI({
    ...prompt,
    temperature: 0.2,
    maxCompletionTokens: 1800
  });

  return normalizePersonaExtractionResult(result, input);
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
