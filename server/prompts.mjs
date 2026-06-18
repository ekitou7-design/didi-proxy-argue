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

export function buildTempScenarioPrompt(input) {
  return {
    system: baseStyleRules,
    user: `
任务：根据用户填写的信息，生成一个临时代吵冲突场景。
输入：
${JSON.stringify(input, null, 2)}

要求：
- 场景必须贴合“和谁吵 / 发生了什么 / 目标 / 语气强度”。
- 如果输入里有 refreshCount，必须生成一个和上一轮明显不同的 openingMessage 或冲突角度，避免刷新后还是同一场景。
- openingMessage 要像真实对方会说的一句话，不要像总结。
- mainline 使用 FIRB：fact、impact、request、boundary。
- 不要生成辱骂、威胁、现实报复或违法内容。

必须返回这个 JSON 结构：
{
  "scenario": {
    "title": "",
    "background": "",
    "opponentPersona": "",
    "openingMessage": "",
    "mainline": {
      "fact": "",
      "impact": "",
      "request": "",
      "boundary": ""
    },
    "userGoal": "",
    "tone": ""
  }
}
`
  };
}

export function buildTempChatPrompt(input) {
  const techniques = selectTechniques({
    scene: input.scenario?.background || input.scene,
    opponent: input.latestOpponentMessage || input.opponent,
    userReply: input.userIntent
  });
  return {
    system: baseStyleRules,
    user: `
任务：在“临时代吵”连续对话中，根据当前场景、历史和最新输入，生成下一句可直接发送的代吵回复。
输入：
${JSON.stringify(input, null, 2)}

最新输入可能是：
- 对方刚说的话 latestOpponentMessage；
- 或用户想表达的意思 userIntent。
如果 userIntent 有内容，要把它转成更有攻击力但安全的表达。
如果 latestOpponentMessage 有内容，要先识别对方话术，再接话。

可用技巧：
${formatTechniques(techniques)}

要求：
- recommendedReply 必须是一句最推荐直接发送的话。
- recommendedReply 必须回应 latestOpponentMessage 或 userIntent 的具体内容，不准只套“回到主线/正面回应”的万能模板。
- 回复里至少要保留一个来自输入的具体信息：对方话术、事件、诉求、责任、规则、时间、对象或损失。
- strongerReply 更强硬，但不能辱骂、人身攻击、威胁。
- sarcasticReply 可以有轻微阴阳，但不要越界。
- politeFinalReply 用于体面收束。
- 参考历史，不要每轮都重复同一句结构。
- 如果 userIntent 有内容，先满足用户想表达的意思；如果 latestOpponentMessage 有内容，先接住对方刚说的话。

必须返回这个 JSON 结构：
{
  "opponentTactic": "",
  "mainline": {
    "fact": "",
    "impact": "",
    "request": "",
    "boundary": ""
  },
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
除 openingMessage 外，title、scene、background、userGoal、realMainline、mainline、traps、trainingFocus、scoreFocus、suggestedFirstReplyHint 不要用“我、别人、对方、玩家”指代冲突方。必须使用明确角色名、roleA.name、roleB.name，或“角色A”“角色B”。
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
如果 customScene 有内容，customScene 只能当作用户给出的粗略素材，不能原样当 title、scene 或 background。必须把它扩写成一个具体训练现场：包含发生时间/地点、双方关系、刚刚发生的触发事件、此前是否提醒过、角色B为什么要辩解或转移重点、角色A现在要守住的具体诉求。
不要生成抽象观点题，不要写成支持/反对某观点，不要使用“正方”“反方”“立场A”“立场B”“辩论主题”。
要生成真实生活吵架场景，例如：
- 宿舍里角色B不倒垃圾，还嘲讽角色A小题大做
- 角色A的男朋友临时改约，并说角色A太敏感
- 同事把工作甩给角色A，出问题后还怪角色A没提醒
- 家庭聚餐上亲戚催婚，还拿表妹二胎来压角色A
- 朋友总是迟到，被指出后反说角色A太计较

如果 gameConfig 有内容，必须沿用里面的角色设定：
- gameConfig.scene 是本局场景。
- gameConfig.roleA / roleB 是两个生活场景角色，各自有 name、description、goal。
- gameConfig.playerRoleKey 是玩家选择的角色，aiRoleKey 必须自动取另一个角色。
- gameConfig.trainingGoals 是玩家训练目标。
- gameConfig.difficulty 是训练难度。
- gameConfig.toneStrength 是玩家练习的语气强度：低=克制礼貌，中=直接有边界，高=锋利有压迫感；它要影响 openingMessage 的压迫强度和 suggestedFirstReplyHint 的建议风格。
- gameConfig.contextSummary / contextSummary 是用户补充的前情提要，必须影响 background、scene、mainline，不得丢弃。
- gameConfig.userMainline / userMainline 是用户想表达或想守住的主线，必须影响 userGoal、realMainline、mainline.request、scoreFocus.mainline。
- gameConfig.sessionControl 是会话控制，必须在 suggestedFirstReplyHint 中体现回复长度、是否提醒回主线、是否允许升级语气。
- title/background/userGoal/realMainline/mainline/traps/trainingFocus/scoreFocus/suggestedFirstReplyHint 里描述冲突双方时，用 roleA.name / roleB.name 或“角色A / 角色B”，不要用“我、别人、对方、玩家”。
- openingMessage 必须由 AI 角色发出，站在 AI 角色目标上说话，不得替玩家说话。

必须返回这个 JSON 结构：
{
  "scenario": {
    "id": "scenario_xxx",
    "title": "",
    "scene": "",
    "roleA": {
      "name": "",
      "description": "",
      "goal": ""
    },
    "roleB": {
      "name": "",
      "description": "",
      "goal": ""
    },
    "playerRoleKey": "A | B",
    "aiRoleKey": "A | B",
    "trainingGoals": [],
    "aiDifficulty": "",
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
- title 要具体，例如“室友连续三次不倒垃圾，还说角色A太计较”。
- scene 是完整生活场景，不是观点题。
- roleA 和 roleB 必须是场景里的具体人物，例如“角色A / 室友”“女朋友 / 男朋友”“员工 / 同事”。
- 每个 role.goal 都要像真实吵架里的角色目标，不要写成抽象观点。
- playerRoleKey 默认可以是 "A"，aiRoleKey 必须是另一个角色。
- background 必须有完整前情，包含触发事件和角色B为什么会这样说。
- background 这类说明性字段必须让玩家在设置页一眼看出谁做了什么：使用“角色A”“角色B”或具体角色名，不要写“我提醒后”“别人说”“对方觉得”“玩家被说”。
- realMainline 是本局真正要守住的争吵主线。
- mainline 必须是 FIRB：Fact 事实、Impact 影响、Request 诉求、Boundary 边界。
- traps 至少 3 条，必须是角色B可能把角色A带偏的话术陷阱。
- trainingFocus 至少 3 条。
- scoreFocus 五项都要有清楚观察点。
- suggestedFirstReplyHint 只给轻提示，不要直接替用户吵完。
- openingMessage 是唯一允许出现“我 / 你”的字段，因为它是 AI 对手说出口的话。
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
