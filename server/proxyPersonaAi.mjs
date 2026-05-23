export function mockGeneratePersonaFromChat({ userId, chatText, relationship, background }) {
  const emotionLevel = /气死|无语|离谱|凭什么|真的/.test(chatText) ? 4 : 3;
  const isSoft = /我觉得|能不能|希望|可以/.test(chatText);

  return {
    userId,
    name: relationship ? `${relationship}嘴替` : "我的专属嘴替",
    sourceType: "chat_upload",
    tone: isSoft ? "温柔但有边界" : "冷静但有压迫感",
    emotionLevel,
    logicStyle: "先承认感受，再把话题拉回事实、影响和明确诉求。",
    commonPhrases: extractCommonPhrases(chatText),
    avoidWords: ["脏话", "人身攻击", "翻旧账", "牵扯家人"],
    replyStrategy: "少自证，多定主线；对方转移话题时，用事实和下一步要求压回去。",
    profileSummary: `基于聊天记录、关系「${relationship || "未填写"}」和前情「${background || "未填写"}」生成。这个嘴替会尽量保留你的表达习惯，但帮你减少解释过多和被带偏。`
  };
}

export function mockGeneratePersonaFromTest({ userId, answers }) {
  const answerText = answers.map((item) => item.answer).join("");
  const directCount = (answerText.match(/A/g) || []).length;
  const softCount = (answerText.match(/B/g) || []).length;
  const sarcasmCount = (answerText.match(/C/g) || []).length;

  const tone =
    sarcasmCount >= 2 ? "嘴毒但不脏" : directCount >= 2 ? "强硬反击" : softCount >= 2 ? "温柔但有边界" : "冷静有理";

  return {
    userId,
    name: "测试生成嘴替",
    sourceType: "test",
    tone,
    emotionLevel: directCount + sarcasmCount >= 3 ? 4 : 3,
    logicStyle: directCount >= 2 ? "直给结论，再补事实。" : "事实、感受、诉求三段推进。",
    commonPhrases: ["我想先把重点说清楚", "这不是情绪问题", "请正面回应这件事"],
    avoidWords: ["威胁", "绝对化评价", "低级辱骂"],
    replyStrategy: "先拦截对方的话术，再给出可执行要求，让对方没有继续绕开的空间。",
    profileSummary: `根据 ${answers.length} 道测试题生成，适合需要「${tone}」输出的人。`
  };
}

export function mockGenerateReply({ persona, opponentMessage, background, goal, strength }) {
  const strong = /强|高|开怼/.test(strength || "");
  const reply = strong
    ? `别把问题绕开。你刚才这句「${opponentMessage}」没有回应重点，只是在把责任推回给我。背景我已经说清楚了：${background || "这件事确实造成了影响"}。我的目标也很明确：${goal || "把问题处理掉"}。请你正面回答，不要继续转移话题。`
    : `我先把重点说清楚：你刚才这句「${opponentMessage}」让我感觉问题被带偏了。现在要讨论的不是我有没有资格不舒服，而是${goal || "这件事怎么处理"}。我们回到具体情况：${background || "这件事确实需要一个明确回应"}。`;

  return {
    reply,
    strategy: `${persona.replyStrategy} 本轮先识别对方转移重点，再把话题拉回「${goal || "明确诉求"}」。`,
    tone: persona.tone
  };
}

function extractCommonPhrases(chatText = "") {
  const candidates = ["我觉得", "你先别", "重点是", "我不是", "请你", "这件事"];
  const found = candidates.filter((item) => chatText.includes(item));
  return found.length ? found : ["我先把重点说清楚", "这件事需要正面回应"];
}
