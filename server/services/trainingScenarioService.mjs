import { buildRandomTrainingScenarioPrompt } from "../prompts.mjs";
import { requestJsonFromAI } from "../openaiClient.mjs";

const randomValues = new Set(["", "随机"]);
const categories = ["宿舍卫生", "情侣冷战", "朋友借钱不还", "小组作业", "商家扯皮", "职场甩锅", "家庭催婚", "网友阴阳怪气"];
const difficulties = ["青铜", "白银", "黄金", "王者"];
const opponentTypes = ["讲道理型", "嘴硬型", "阴阳怪气型", "偷换概念型", "情绪勒索型"];

export async function generateRandomTrainingScenario(input = {}) {
  const normalizedInput = normalizeScenarioInput(input);

  if (!process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY) {
    return { scenario: mockGenerateRandomTrainingScenario(normalizedInput) };
  }

  const result = await requestJsonFromAI({
    ...buildRandomTrainingScenarioPrompt(normalizedInput),
    temperature: 0.75,
    maxCompletionTokens: 1800
  });

  return { scenario: normalizeScenario(result?.scenario || result, normalizedInput) };
}

export async function generatePresetTrainingScenario(input = {}) {
  const normalizedInput = normalizeScenarioInput(input);

  if (!process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY) {
    return { scenario: mockGenerateRandomTrainingScenario(normalizedInput) };
  }

  const result = await requestJsonFromAI({
    ...buildRandomTrainingScenarioPrompt(normalizedInput),
    temperature: 0.45,
    maxCompletionTokens: 1800
  });

  return { scenario: normalizeScenario(result?.scenario || result, normalizedInput) };
}

export function mockGenerateRandomTrainingScenario(input = {}) {
  const normalizedInput = normalizeScenarioInput(input);
  const pool = mockScenarios();
  const filtered = pool.filter((scenario) => {
    const categoryMatched = randomValues.has(normalizedInput.category) || scenario.category === normalizedInput.category;
    const difficultyMatched = randomValues.has(normalizedInput.difficulty) || scenario.difficulty === normalizedInput.difficulty;
    const opponentMatched =
      randomValues.has(normalizedInput.opponentType) || scenario.opponentProfile.type === normalizedInput.opponentType;
    return categoryMatched && difficultyMatched && opponentMatched;
  });

  const categoryPool = pool.filter((scenario) => randomValues.has(normalizedInput.category) || scenario.category === normalizedInput.category);
  const opponentPool = categoryPool.filter(
    (scenario) => randomValues.has(normalizedInput.opponentType) || scenario.opponentProfile.type === normalizedInput.opponentType
  );
  const sourcePool = filtered.length ? filtered : opponentPool.length ? opponentPool : categoryPool.length ? categoryPool : pool;
  const scenario = structuredClone(sourcePool[Math.floor(Math.random() * sourcePool.length)]);
  if (!randomValues.has(normalizedInput.category)) scenario.category = normalizedInput.category;
  if (!randomValues.has(normalizedInput.difficulty)) scenario.difficulty = normalizedInput.difficulty;
  if (!randomValues.has(normalizedInput.opponentType)) scenario.opponentProfile.type = normalizedInput.opponentType;
  if (normalizedInput.customScene) {
    scenario.title = normalizedInput.customScene;
    scenario.background = buildCustomSceneBackground(normalizedInput, scenario);
    scenario.openingMessage = buildCustomOpeningMessage(normalizedInput);
    scenario.relationship = "自定义训练对象";
    scenario.realMainline = "不要被对方带去解释情绪，持续围绕具体行为、影响和下一步要求。";
    scenario.mainline = buildCustomMainline(normalizedInput);
    scenario.traps = buildCustomTraps(normalizedInput);
    scenario.trainingFocus = ["先抓具体行为", "点出影响", "提出下一步要求", "拒绝被贴情绪标签"];
    scenario.scoreFocus = {
      logic: "是否围绕自定义场景里的具体行为说话。",
      power: "是否短句有力，不被对方压住。",
      boundary: "是否明确说出不接受什么。",
      mainline: "是否持续围绕行为、影响和要求。",
      risk: "是否避免辱骂、威胁或扩大攻击面。"
    };
    scenario.suggestedFirstReplyHint = "先别解释自己是不是敏感，直接把问题拉回具体行为和要求。";
  }
  if (normalizedInput.userGoal) scenario.userGoal = normalizedInput.userGoal;
  return normalizeScenario(scenario, normalizedInput);
}

export function normalizeScenarioInput(input = {}) {
  return {
    category: normalizeOption(input.category, categories),
    difficulty: normalizeOption(input.difficulty, difficulties),
    opponentType: normalizeOption(input.opponentType, opponentTypes),
    customScene: textOf(input.customScene),
    userGoal: textOf(input.userGoal)
  };
}

export function normalizeScenario(scenario, input = {}) {
  if (!scenario || typeof scenario !== "object" || Array.isArray(scenario)) {
    const error = new Error("AI returned empty training scenario");
    error.status = 502;
    throw error;
  }

  const now = new Date().toISOString();
  const opponentProfile = scenario.opponentProfile && typeof scenario.opponentProfile === "object" ? scenario.opponentProfile : {};
  const mainline = scenario.mainline && typeof scenario.mainline === "object" ? scenario.mainline : {};
  const scoreFocus = scenario.scoreFocus && typeof scenario.scoreFocus === "object" ? scenario.scoreFocus : {};
  const category = textOf(scenario.category) || pickRequested(input.category, categories);
  const difficulty = textOf(scenario.difficulty) || pickRequested(input.difficulty, difficulties);
  const opponentType = textOf(opponentProfile.type) || pickRequested(input.opponentType, opponentTypes);
  const traps = arrayOfText(scenario.traps);
  const trainingFocus = arrayOfText(scenario.trainingFocus);

  return {
    id: textOf(scenario.id) || `scenario_${Date.now()}`,
    title: textOf(scenario.title) || "随机吵架训练场景",
    category,
    difficulty,
    relationship: textOf(scenario.relationship) || "日常关系",
    background: textOf(scenario.background) || "一次具体冲突已经发生，对方试图把重点从事情本身转移到你的态度。",
    opponentProfile: {
      type: opponentType,
      personality: textOf(opponentProfile.personality) || "会为自己辩解，也会试图转移重点。",
      tactics: arrayOfText(opponentProfile.tactics)
    },
    openingMessage: textOf(scenario.openingMessage) || "你现在这样说就很没必要，本来不是多大的事。",
    userGoal: textOf(scenario.userGoal) || input.userGoal || "守住主线，清楚表达诉求和边界。",
    realMainline: textOf(scenario.realMainline) || "不要证明自己有没有资格不舒服，要让对方正面回应具体问题。",
    mainline: {
      fact: textOf(mainline.fact),
      impact: textOf(mainline.impact),
      request: textOf(mainline.request),
      boundary: textOf(mainline.boundary)
    },
    traps: traps.length ? traps : fallbackTraps(opponentType),
    trainingFocus: trainingFocus.length ? trainingFocus : fallbackTrainingFocus(category, difficulty),
    scoreFocus: {
      logic: textOf(scoreFocus.logic) || "是否围绕事实和责任说话，而不是被对方带去解释情绪。",
      power: textOf(scoreFocus.power) || "是否短句清楚、有压迫感，但不升级成人身攻击。",
      boundary: textOf(scoreFocus.boundary) || "是否明确说出不接受什么，以及下一步要求。",
      mainline: textOf(scoreFocus.mainline) || "是否持续守住本局真正要解决的问题。",
      risk: textOf(scoreFocus.risk) || "是否避免辱骂、威胁、现实报复或过度扩大冲突。"
    },
    suggestedFirstReplyHint: textOf(scenario.suggestedFirstReplyHint) || "先复述事实，再指出对方正在转移重点。",
    createdAt: now
  };
}

function mockScenarios() {
  return [
    {
      id: "scenario_dorm_trash",
      title: "室友连续三次不倒垃圾，还说你太计较",
      category: "宿舍卫生",
      difficulty: "黄金",
      relationship: "同寝室室友",
      background:
        "宿舍约定垃圾桶满了就轮流倒。过去一周轮到对方三次，对方都说下课回来再倒，最后都是你看不下去拿走。今天垃圾又堆到门口，你提醒后，对方觉得你当着其他室友面让他没面子。",
      opponentProfile: {
        type: "阴阳怪气型",
        personality: "平时不爱正面承认问题，被提醒后会用玩笑和反讽把自己包装成被针对的人。",
        tactics: ["说你洁癖", "暗示你爱管人", "把公共规则说成个人情绪"]
      },
      openingMessage: "行行行，就你最讲卫生，我们这种普通人住你旁边真是委屈你了。",
      userGoal: "让对方承认轮值责任，并从今天开始按约定倒垃圾。",
      realMainline: "问题不是谁更爱干净，而是共同生活规则被反复破坏。",
      mainline: {
        fact: "轮到对方倒垃圾的三次都没有按约定完成。",
        impact: "公共区域有异味，你被迫多次替他处理，宿舍规则也失效了。",
        request: "今天这袋垃圾由对方处理，后续按轮值表执行。",
        boundary: "不要再把公共规则说成你个人洁癖或针对他。"
      },
      traps: ["攻击你太计较", "把提醒说成不给面子", "用玩笑稀释责任"],
      trainingFocus: ["不解释自己是不是洁癖", "把话题拉回轮值事实", "提出清楚可执行的要求"],
      scoreFocus: {
        logic: "是否抓住轮值事实，而不是争谁更爱干净。",
        power: "是否能稳住气势，不被反讽压回去。",
        boundary: "是否明确拒绝被贴上洁癖、针对人的标签。",
        mainline: "是否持续围绕共同规则被破坏。",
        risk: "是否避免羞辱对方生活习惯或升级成宿舍对立。"
      },
      suggestedFirstReplyHint: "先接住他的阴阳怪气，再把问题拉回“三次轮值没做”。"
    },
    {
      id: "scenario_group_deadline",
      title: "小组作业截止前队友才说自己不会做",
      category: "小组作业",
      difficulty: "王者",
      relationship: "课程小组队友",
      background:
        "小组展示明天上午截止，对方负责数据整理，上周在群里确认过没问题。今晚你催进度，对方才说自己不会做，还说你作为组长应该早点发现。他希望你熬夜补上，并暗示如果分数低大家都有责任。",
      opponentProfile: {
        type: "偷换概念型",
        personality: "遇到责任会把问题转成别人管理不到位，擅长让人自证自己是不是好组长。",
        tactics: ["甩锅给组长", "把失约说成能力问题", "用集体成绩压你兜底"]
      },
      openingMessage: "你现在怪我也没用啊，你是组长，你早点问清楚不就不会这样了吗？",
      userGoal: "让摆烂队友承认责任并今晚补上可交付部分。",
      realMainline: "对方已确认承担任务，现在临近截止失约，需要补救方案，而不是追究你是否完美管理。",
      mainline: {
        fact: "对方上周确认负责数据整理，截止前一晚仍未完成。",
        impact: "展示材料缺关键部分，其他成员要承担额外风险和时间成本。",
        request: "对方今晚先交出能完成的基础整理，并同步不会的部分。",
        boundary: "不能把已确认任务的失约转成组长一个人的责任。"
      },
      traps: ["要求你自证是不是合格组长", "把不会做当作免责任理由", "用小组分数逼你兜底"],
      trainingFocus: ["拒绝管理责任偷换", "要求具体补救动作", "保留分工证据"],
      scoreFocus: {
        logic: "是否区分组长协调和成员承诺的责任。",
        power: "是否能提出立即行动要求。",
        boundary: "是否拒绝无条件熬夜兜底。",
        mainline: "是否围绕已承诺任务未完成。",
        risk: "是否避免直接羞辱能力，导致协作彻底破裂。"
      },
      suggestedFirstReplyHint: "不要先解释你有没有提醒，先锁定他确认过任务这个事实。"
    },
    {
      id: "scenario_work_blame",
      title: "同事把漏发客户邮件的锅甩给你",
      category: "职场甩锅",
      difficulty: "白银",
      relationship: "同项目同事",
      background:
        "客户昨天催一份报价更新，对方负责发最终版邮件，你负责给他数据。你下午三点已在工作群发了数据，对方没确认也没发。今天客户追问，他在会上说是你数据给晚了，导致邮件没法发。",
      opponentProfile: {
        type: "嘴硬型",
        personality: "怕承担工作失误，会抓住流程里的模糊点为自己找理由。",
        tactics: ["模糊时间线", "说自己没看到", "强调团队都有责任"]
      },
      openingMessage: "我昨天确实没收到你明确说可以发的版本啊，这事不能只算我一个人的吧。",
      userGoal: "澄清时间线，让对方承认邮件未发送是他的执行遗漏。",
      realMainline: "你已按时给出数据，对方未确认和未发送邮件才是客户延误原因。",
      mainline: {
        fact: "你昨天下午三点在群里发了最终数据，对方负责发送邮件。",
        impact: "客户没有及时收到报价，会议上责任被错误归到你身上。",
        request: "请对方当场澄清时间线，并补发邮件。",
        boundary: "不能用“没看到”抹掉已经公开同步的交付记录。"
      },
      traps: ["把明确交付说成没确认", "把个人遗漏说成团队责任", "让你陷入解释流程细节"],
      trainingFocus: ["按时间线说话", "不被团队责任稀释事实", "要求公开澄清"],
      scoreFocus: {
        logic: "是否用时间线证明责任归属。",
        power: "是否能在职场语境里清楚但不失控。",
        boundary: "是否拒绝背锅。",
        mainline: "是否围绕数据已交付和邮件未发送。",
        risk: "是否避免情绪化指责影响职业形象。"
      },
      suggestedFirstReplyHint: "先报时间点和交付位置，再要求补充澄清。"
    },
    {
      id: "scenario_friend_money",
      title: "朋友借钱两个月不还，还说你催得太现实",
      category: "朋友借钱不还",
      difficulty: "王者",
      relationship: "关系不错的朋友",
      background:
        "两个月前朋友说临时周转，借了你 1200 元，承诺月底还。到期后他先说工资晚发，后来开始不回消息。今天你再次提醒，他发语音说最近压力很大，觉得你一直催让他很寒心。",
      opponentProfile: {
        type: "情绪勒索型",
        personality: "不想还钱时会把债务问题包装成友情和信任问题。",
        tactics: ["说你现实", "强调自己压力大", "把还钱诉求说成不够朋友"]
      },
      openingMessage: "我都说了最近真的很难，你一直催这个钱，咱俩这么多年朋友就只剩钱了吗？",
      userGoal: "要求对方给明确还款时间，不再用友情回避债务。",
      realMainline: "借款承诺已经到期，友情不能取消还款责任。",
      mainline: {
        fact: "对方借了 1200 元并承诺月底归还，现在已拖延两个月。",
        impact: "你的预算被影响，也承担了反复提醒的情绪成本。",
        request: "请对方给出明确还款日期和分期安排。",
        boundary: "不要再把正常还钱要求说成你不重视朋友。"
      },
      traps: ["用友情压你闭嘴", "让你同情他的压力", "把催款说成你人品现实"],
      trainingFocus: ["不为合理催款道歉", "要求具体时间", "区分共情和放弃边界"],
      scoreFocus: {
        logic: "是否区分朋友关系和借款承诺。",
        power: "是否能坚定要求还款计划。",
        boundary: "是否拒绝被友情绑架。",
        mainline: "是否围绕承诺到期未还。",
        risk: "是否避免羞辱经济状况或公开威胁。"
      },
      suggestedFirstReplyHint: "可以承认他压力大，但不要让压力替代还款计划。"
    },
    {
      id: "scenario_online_sarcasm",
      title: "网友在评论区阴阳怪气你认真讨论",
      category: "网友阴阳怪气",
      difficulty: "黄金",
      relationship: "同一评论区网友",
      background:
        "你在一个帖子下认真回复了自己的经历和观点，对方没有回应内容本身，而是连续评论你“太有优越感”“小作文写得真努力”。其他人开始跟着起哄，讨论重点从原话题偏到你本人。",
      opponentProfile: {
        type: "阴阳怪气型",
        personality: "喜欢用轻飘飘的嘲讽制造围观感，不承担正面论证责任。",
        tactics: ["嘲笑表达方式", "攻击动机", "带动围观起哄"]
      },
      openingMessage: "哇，写这么长，看来你真的很需要证明自己比别人懂哦。",
      userGoal: "不被带偏到自证，要求对方回应具体观点或停止扣帽子。",
      realMainline: "争议点是观点内容，不是你写得长不长或是否有优越感。",
      mainline: {
        fact: "你提出了具体观点，对方没有回应内容，只评价你的表达动机。",
        impact: "讨论被带偏，其他人也开始围绕你本人起哄。",
        request: "请对方回应具体观点，不要继续扣动机帽子。",
        boundary: "如果只做人身化暗讽，你不会继续陪聊。"
      },
      traps: ["让你证明自己不优越", "把内容讨论变成表达方式审判", "诱导你情绪化回骂"],
      trainingFocus: ["短句压住阴阳怪气", "要求对方回到观点", "及时设置停止对话边界"],
      scoreFocus: {
        logic: "是否区分观点和人格动机。",
        power: "是否能短促有力地反击。",
        boundary: "是否说明不接受暗讽式讨论。",
        mainline: "是否持续要求回应具体内容。",
        risk: "是否避免互喷和扩大攻击面。"
      },
      suggestedFirstReplyHint: "不要解释你为什么写长，直接要求他回应哪一句观点。"
    }
  ];
}

function normalizeOption(value, allowed) {
  const text = textOf(value);
  if (!text || text === "随机") return "随机";
  return allowed.includes(text) ? text : "随机";
}

function buildCustomSceneBackground(input, scenario) {
  const category = randomValues.has(input.category) ? scenario.category : input.category;
  const difficulty = randomValues.has(input.difficulty) ? scenario.difficulty : input.difficulty;
  const opponentType = randomValues.has(input.opponentType) ? scenario.opponentProfile?.type : input.opponentType;
  return `自定义场景：${input.customScene}。训练类型：${category}，难度：${difficulty}，对手倾向：${opponentType}。`;
}

function buildCustomOpeningMessage(input) {
  const scene = input.customScene;
  const type = input.opponentType;
  if (/阴阳/.test(type)) return `行，就你最有道理，${scene}这事你非要这么理解我也没办法。`;
  if (/偷换/.test(type)) return `你现在怪我也没用吧，${scene}这事难道你自己就一点问题没有？`;
  if (/情绪勒索/.test(type)) return `我都已经这样了，你还要拿${scene}这事一直逼我吗？`;
  if (/讲道理/.test(type)) return `${scene}这件事我不是不认，但你也不能只看你自己的角度。`;
  return `${scene}这事不能全怪我吧，你现在说得好像都是我的问题。`;
}

function buildCustomMainline(input) {
  const scene = input.customScene;
  const goal = input.userGoal || "让对方正面回应并给出具体做法";
  return {
    fact: `当前冲突是：${scene}`,
    impact: "对方正在把具体问题转成你的态度或情绪，导致事情本身没有被处理。",
    request: goal,
    boundary: "不要再用“你太敏感”“你想太多”来代替正面回应。"
  };
}

function buildCustomTraps(input) {
  const traps = ["把具体行为说成你的情绪问题", "要求你自证是不是太计较"];
  if (/阴阳/.test(input.opponentType)) traps.push("用反讽让你失控");
  if (/偷换/.test(input.opponentType)) traps.push("把责任偷换成你也有问题");
  if (/情绪勒索/.test(input.opponentType)) traps.push("用委屈压你放弃要求");
  return traps;
}

function fallbackTraps(opponentType) {
  const traps = ["把具体行为说成你的情绪问题", "要求你自证是不是太计较", "用一句反问把责任推回你身上"];
  if (/阴阳/.test(opponentType)) traps.push("用反讽激你失控");
  if (/嘴硬/.test(opponentType)) traps.push("明明有记录也继续否认");
  if (/偷换/.test(opponentType)) traps.push("把原问题偷换成你的态度问题");
  if (/情绪勒索/.test(opponentType)) traps.push("用委屈让你放弃要求");
  return traps;
}

function fallbackTrainingFocus(category, difficulty) {
  return [
    `围绕${category || "当前场景"}里的具体事实发言`,
    "识别对方转移重点的话术",
    "提出清楚、可执行的下一步要求",
    difficulty === "王者" ? "在高压话术下保持主线不散" : "不为了缓和气氛放弃边界"
  ];
}

function pickRequested(value, allowed) {
  return randomValues.has(value) ? allowed[Math.floor(Math.random() * allowed.length)] : value;
}

function arrayOfText(value) {
  return Array.isArray(value) ? value.map(textOf).filter(Boolean) : [];
}

function textOf(value) {
  return typeof value === "string" ? value.trim() : "";
}
