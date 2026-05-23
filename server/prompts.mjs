import { argumentTechniques } from "./argumentTechniques.mjs";

const baseStyleRules = `
你是“滴滴代吵”的实时接话助手。
只输出 JSON，不要 markdown，不要代码块，不要额外解释。
短句优先，不要长篇说教，不要客服腔。
不要频繁使用“我理解你的感受”“希望我们好好沟通”。
不要让用户自证清白。
先识别对方话术，再锁定 FIRB 主线，再生成回复。
FIRB = Fact 事实，Impact 影响，Request 诉求，Boundary 边界。
回复可以有气势，但不要鼓励辱骂、人身攻击、威胁或现实伤害。
`;

export function selectTechniques(input = {}) {
  const text = [
    input.opponent,
    input.latestOpponentMessage,
    input.opponentMessage,
    input.userReply,
    input.scene,
    input.scenario
  ]
    .filter(Boolean)
    .join(" ");

  const selected = [];
  const add = (name) => {
    const item = argumentTechniques.find((technique) => technique.name === name);
    if (item && !selected.some((current) => current.id === item.id)) selected.push(item);
  };

  if (/靠关系|走后门|凭什么|你配吗|资格|没资格|蹭资源|装/.test(text)) {
    add("指控成本抬高");
    add("资格反审");
  }

  if (/敏感|脾气差|事多|难沟通|想太多|上纲上线|小题大做/.test(text)) {
    add("标签反扣");
  }

  if (/受着|忍忍|别计较|大度|算了吧|多大点事/.test(text)) {
    add("原话奉还");
    add("荒谬延展");
  }

  if (/呵呵|行吧|随你|你开心就好|懂的都懂|某些人|不会吧|至于吗|阴阳|内涵|暗示/.test(text)) {
    add("逼迫显形法");
  }

  if (/挑衅|然后呢|关你|套话|故意问/.test(text)) {
    add("顺承反杀");
  }

  add("边界收口");
  return selected;
}

export function buildTempArguePrompt(input) {
  const techniques = selectTechniques(input);
  return {
    system: baseStyleRules,
    user: `
任务：生成临时代吵实时回应。
输入：
${JSON.stringify(input, null, 2)}

可用技巧：
${formatTechniques(techniques)}

必须返回这个 JSON 结构：
{
  "mainline": {
    "fact": "",
    "impact": "",
    "request": "",
    "boundary": ""
  },
  "opponentTactic": "",
  "usedTechniques": [],
  "strategy": "",
  "recommendedReply": "",
  "strongerReply": "",
  "sarcasticReply": "",
  "politeFinalReply": "",
  "offTopicWarning": ""
}
`
  };
}

export function buildAnalyzeChatPrompt(input) {
  return {
    system: baseStyleRules,
    user: `
任务：根据用户粘贴的聊天记录，分析用户说话风格，生成嘴替人格档案。
输入：
${JSON.stringify(input, null, 2)}

必须返回这个 JSON 结构：
{
  "personaProfile": {
    "name": "",
    "tone": "",
    "emotionLevel": 0,
    "logicStyle": "",
    "commonPhrases": [],
    "avoidWords": [],
    "replyStrategy": "",
    "profileSummary": ""
  }
}
`
  };
}

export function buildTestResultPrompt(input) {
  return {
    system: baseStyleRules,
    user: `
任务：根据测试题答案生成嘴替人格档案。
输入：
${JSON.stringify(input, null, 2)}

必须返回这个 JSON 结构：
{
  "personaProfile": {
    "name": "",
    "tone": "",
    "emotionLevel": 0,
    "logicStyle": "",
    "commonPhrases": [],
    "avoidWords": [],
    "replyStrategy": "",
    "profileSummary": ""
  }
}
`
  };
}

export function buildPersonaReplyPrompt(input) {
  const techniques = selectTechniques({ latestOpponentMessage: input.latestOpponentMessage });
  return {
    system: baseStyleRules,
    user: `
任务：根据嘴替档案、聊天记录和对方最新一句话，生成像用户本人风格的回应。
输入：
${JSON.stringify(input, null, 2)}

优先技巧：
${formatTechniques(techniques)}

必须返回这个 JSON 结构：
{
  "styleAnalysis": "",
  "mainline": {
    "fact": "",
    "impact": "",
    "request": "",
    "boundary": ""
  },
  "usedTechniques": [],
  "myStyleReply": "",
  "softerReply": "",
  "strongerReply": "",
  "pauseReply": ""
}
`
  };
}

export function buildTrainingScorePrompt(input) {
  const techniques = selectTechniques({ opponentMessage: input.opponentMessage, userReply: input.userReply });
  return {
    system: baseStyleRules,
    user: `
任务：给用户在吵架训练场中的回复评分，并生成下一轮对方发言。
输入：
${JSON.stringify(input, null, 2)}

评分范围 0-100。risk 越高代表越容易失控或跑题。
参考技巧：
${formatTechniques(techniques)}

必须返回这个 JSON 结构：
{
  "scores": {
    "logic": 0,
    "power": 0,
    "boundary": 0,
    "mainline": 0,
    "risk": 0,
    "winRate": 0
  },
  "usedTechniques": [],
  "isOffTopic": false,
  "analysis": "",
  "suggestion": "",
  "betterReply": "",
  "nextOpponentMessage": ""
}
`
  };
}

function formatTechniques(techniques) {
  return JSON.stringify(
    techniques.map((item) => ({
      name: item.name,
      useWhen: item.useWhen,
      coreLogic: item.coreLogic,
      templates: item.templates,
      risk: item.risk
    })),
    null,
    2
  );
}
