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
nextOpponentMessage 要根据 history 延续当前对话，禁止复读 history 里已经出现过的对方发言，禁止每轮都用同一种“没多大的事/你想让我怎么做”的模板。
下一轮对方发言要像真实对话：承接用户刚才的话，换一种防御、甩锅、追问或软化方式推进冲突。
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

export function buildRandomTrainingScenarioPrompt(input = {}) {
  return {
    system: `
你是“滴滴代吵”的吵架训练场景设计器。
只输出一个合法 JSON 对象，不要 markdown，不要代码块，不要额外解释。

你的任务是生成一个贴近真实生活、前因后果清楚、冲突逻辑成立的中文吵架训练环境。
场景可以有冲突张力，但禁止生成违法威胁、歧视、人肉、骚扰、现实报复、人身安全风险或鼓励伤害的内容。
不要写成模板作文。不要只写“你们发生了矛盾”。必须有具体触发事件、对方动机、用户要守住的主线和话术陷阱。
openingMessage 要像真实人会说的一句话，不要像 AI 总结。
`,
    user: `
输入偏好：
${JSON.stringify(input, null, 2)}

可参考场景池：
- 宿舍卫生大战
- 情侣冷战
- 朋友借钱不还
- 小组作业队友摆烂
- 商家扯皮
- 职场甩锅
- 家庭催婚
- 网友阴阳怪气
- 社团分工不均
- 合租水电费争议
- 约饭临时放鸽子
- 同学借东西不还

难度解释：
- 青铜：对方基本讲道理，但会为自己辩解。
- 白银：对方嘴硬，会推卸责任。
- 黄金：对方阴阳怪气，会攻击用户情绪。
- 王者：对方会偷换概念、情绪勒索、要求用户自证或大度。

对手类型解释：
- 讲道理型：表面理性，但会选择性忽略自己的责任。
- 嘴硬型：不承认问题，喜欢找借口。
- 阴阳怪气型：不正面说，喜欢暗讽和内涵。
- 偷换概念型：把原本的问题转成用户态度不好、太敏感、太计较。
- 情绪勒索型：用“你要是这样想我也没办法”“我都这样了你还想怎样”来压用户。

如果 category/difficulty/opponentType 为空或“随机”，请自行选择一个真实生活冲突设定。
如果 userGoal 有内容，场景要围绕这个训练目标设计。

必须返回这个 JSON 结构：
{
  "scenario": {
    "id": "scenario_xxx",
    "title": "",
    "category": "",
    "difficulty": "",
    "relationship": "",
    "background": "",
    "opponentProfile": {
      "type": "",
      "personality": "",
      "tactics": []
    },
    "openingMessage": "",
    "userGoal": "",
    "realMainline": "",
    "mainline": {
      "fact": "",
      "impact": "",
      "request": "",
      "boundary": ""
    },
    "traps": [],
    "trainingFocus": [],
    "scoreFocus": {
      "logic": "",
      "power": "",
      "boundary": "",
      "mainline": "",
      "risk": ""
    },
    "suggestedFirstReplyHint": "",
    "createdAt": ""
  }
}

字段要求：
- title 要具体，例如“室友连续三次不倒垃圾，还说你太计较”。
- background 必须有完整前情，包含触发事件和对方为什么会这样说。
- realMainline 是本局真正要守住的争吵主线。
- mainline 必须是 FIRB：Fact 事实、Impact 影响、Request 诉求、Boundary 边界。
- traps 至少 3 条，必须是对方可能把用户带偏的话术陷阱。
- trainingFocus 至少 3 条。
- scoreFocus 五项都要有清楚观察点。
- suggestedFirstReplyHint 只给轻提示，不要直接替用户吵完。
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
