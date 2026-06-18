import { buildRandomTrainingScenarioPrompt } from "../prompts.mjs";
import { isDemoMode, requestJsonFromAI } from "../openaiClient.mjs";

const randomValues = new Set(["", "随机"]);
const categories = ["宿舍卫生", "情侣冷战", "朋友借钱不还", "小组作业", "商家扯皮", "职场甩锅", "家庭催婚", "网友阴阳怪气"];
const difficulties = ["青铜", "白银", "黄金", "王者"];
const opponentTypes = ["讲道理型", "嘴硬型", "阴阳怪气型", "偷换概念型", "情绪勒索型"];

export async function generateRandomTrainingScenario(input = {}) {
  const normalizedInput = normalizeScenarioInput(input);

  try {
    const result = await requestJsonFromAI({
      ...buildRandomTrainingScenarioPrompt(normalizedInput),
      temperature: 0.75,
      maxCompletionTokens: 1800
    });

    return { source: "ai", scenario: normalizeScenario(result?.scenario || result, normalizedInput) };
  } catch (error) {
    console.error("[training/scenario/random] AI client failed:", error);
    if (isDemoMode()) return { source: "fallback", scenario: mockGenerateRandomTrainingScenario(normalizedInput) };
    throw error;
  }
}

export async function generatePresetTrainingScenario(input = {}) {
  const normalizedInput = normalizeScenarioInput(input);

  try {
    const result = await requestJsonFromAI({
      ...buildRandomTrainingScenarioPrompt(normalizedInput),
      temperature: 0.45,
      maxCompletionTokens: 1800
    });

    return { source: "ai", scenario: normalizeScenario(result?.scenario || result, normalizedInput) };
  } catch (error) {
    console.error("[training/scenario/preset] AI client failed:", error);
    if (isDemoMode()) return { source: "fallback", scenario: mockGenerateRandomTrainingScenario(normalizedInput) };
    throw error;
  }
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
    const customDraft = buildConcreteCustomScenario(normalizedInput, scenario);
    scenario.title = customDraft.title;
    scenario.scene = customDraft.scene;
    scenario.background = customDraft.background;
    scenario.roleA = normalizedInput.roleA;
    scenario.roleB = normalizedInput.roleB;
    scenario.playerRoleKey = normalizedInput.playerRoleKey;
    scenario.aiRoleKey = normalizedInput.aiRoleKey;
    scenario.openingMessage = buildCustomOpeningMessage(normalizedInput, customDraft);
    scenario.relationship = "自定义训练对象";
    scenario.realMainline = `${customDraft.playerName}不要被${customDraft.aiName}带去解释情绪，持续围绕“${customDraft.fact}”和下一步要求。`;
    scenario.mainline = buildCustomMainline(normalizedInput, customDraft);
    scenario.traps = buildCustomTraps(normalizedInput, customDraft);
    scenario.trainingFocus = ["先抓具体行为", "点出影响", "提出下一步要求", "拒绝被贴情绪标签"];
    scenario.scoreFocus = {
      logic: "是否围绕自定义场景里的具体行为说话。",
      power: "角色A是否短句有力，不被角色B压住。",
      boundary: "是否明确说出不接受什么。",
      mainline: "是否持续围绕行为、影响和要求。",
      risk: "是否避免辱骂、威胁或扩大攻击面。"
    };
    scenario.suggestedFirstReplyHint = "角色A先别解释角色A是不是敏感，直接把问题拉回具体行为和要求。";
  }
  if (normalizedInput.userGoal) scenario.userGoal = normalizedInput.userGoal;
  return normalizeScenario(scenario, normalizedInput);
}

export function normalizeScenarioInput(input = {}) {
  const config = input.gameConfig && typeof input.gameConfig === "object" ? input.gameConfig : {};
  const gameConfig = normalizeGameConfig(config, input);
  return {
    category: normalizeOption(input.category, categories),
    difficulty: normalizeScenarioDifficulty(input.difficulty || config.difficulty),
    opponentType: normalizeOption(input.opponentType, opponentTypes),
    customScene: textOf(input.contextSummary) || textOf(config.contextSummary) || textOf(input.customScene) || textOf(config.scene) || textOf(config.topic),
    userGoal: textOf(input.userMainline) || textOf(config.userMainline) || textOf(input.userGoal) || gameConfig.trainingGoals.join("、"),
    gameConfig,
    scene: gameConfig.scene,
    roleA: gameConfig.roleA,
    roleB: gameConfig.roleB,
    playerRoleKey: gameConfig.playerRoleKey,
    aiRoleKey: gameConfig.aiRoleKey,
    playerRole: roleFromConfig(gameConfig, gameConfig.playerRoleKey),
    aiRole: roleFromConfig(gameConfig, gameConfig.aiRoleKey),
    aiDifficulty: textOf(input.aiDifficulty),
    toneStrength: textOf(input.toneStrength) || textOf(config.toneStrength),
    contextSummary: textOf(input.contextSummary) || textOf(config.contextSummary),
    userMainline: textOf(input.userMainline) || textOf(config.userMainline)
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
  const baseConfig = normalizeGameConfig(input.gameConfig || scenario, input);
  const roleA = normalizeRole(scenario.roleA, baseConfig.roleA);
  const roleB = normalizeRole(scenario.roleB, baseConfig.roleB);
  const playerRoleKey = normalizeRoleKey(scenario.playerRoleKey || input.playerRoleKey || baseConfig.playerRoleKey);
  const aiRoleKey = oppositeRoleKey(playerRoleKey);
  const playerRole = roleFromParts(roleA, roleB, playerRoleKey);
  const aiRole = roleFromParts(roleA, roleB, aiRoleKey);
  const scene = textOf(scenario.scene) || textOf(scenario.background) || input.scene || baseConfig.scene;
  const trainingGoals = arrayOfText(scenario.trainingGoals).length
    ? arrayOfText(scenario.trainingGoals)
    : input.gameConfig?.trainingGoals?.length
      ? input.gameConfig.trainingGoals
      : trainingFocus.length
        ? trainingFocus
        : arrayOfText(input.trainingGoals);

  return {
    id: textOf(scenario.id) || `scenario_${Date.now()}`,
    title: textOf(scenario.title) || "随机吵架训练场景",
    scene,
    roleA,
    roleB,
    playerRoleKey,
    aiRoleKey,
    trainingGoals,
    playerIdentity: playerRole.name,
    aiIdentity: aiRole.name,
    aiDifficulty: textOf(scenario.aiDifficulty) || input.aiDifficulty || difficulty,
    category,
    difficulty,
    relationship: textOf(scenario.relationship) || "日常关系",
    background:
      textOf(scenario.background) || scene || "一次具体冲突已经发生，角色B试图把重点从事情本身转移到角色A的态度。",
    opponentProfile: {
      type: opponentType,
      personality: textOf(opponentProfile.personality) || "会为自己辩解，也会试图转移重点。",
      tactics: arrayOfText(opponentProfile.tactics)
    },
    openingMessage: textOf(scenario.openingMessage) || "你现在这样说就很没必要，本来不是多大的事。",
    userGoal: textOf(scenario.userGoal) || input.userGoal || playerRole.goal || "守住主线，清楚表达诉求和边界。",
    realMainline: textOf(scenario.realMainline) || "角色A不要证明角色A有没有资格不舒服，要让角色B正面回应具体问题。",
    mainline: {
      fact: textOf(mainline.fact),
      impact: textOf(mainline.impact),
      request: textOf(mainline.request),
      boundary: textOf(mainline.boundary)
    },
    traps: traps.length ? traps : fallbackTraps(opponentType),
    trainingFocus: trainingFocus.length ? trainingFocus : fallbackTrainingFocus(category, difficulty),
    scoreFocus: {
      logic: textOf(scoreFocus.logic) || "角色A是否围绕事实和责任说话，而不是被角色B带去解释情绪。",
      power: textOf(scoreFocus.power) || "角色A是否短句清楚、有压迫感，但不升级成人身攻击。",
      boundary: textOf(scoreFocus.boundary) || "角色A是否明确说出不接受什么，以及下一步要求。",
      mainline: textOf(scoreFocus.mainline) || "角色A是否持续守住本局真正要解决的问题。",
      risk: textOf(scoreFocus.risk) || "角色A是否避免辱骂、威胁、现实报复或过度扩大冲突。"
    },
    suggestedFirstReplyHint: textOf(scenario.suggestedFirstReplyHint) || "角色A先复述事实，再指出角色B正在转移重点。",
    createdAt: now
  };
}

function mockScenarios() {
  return [
    {
      id: "scenario_dorm_trash",
      title: "室友连续三次不倒垃圾，还说角色A太计较",
      category: "宿舍卫生",
      difficulty: "黄金",
      relationship: "同寝室室友",
      background:
        "宿舍约定垃圾桶满了就轮流倒。过去一周轮到室友三次，室友都说下课回来再倒，最后都是角色A看不下去拿走。今天垃圾又堆到门口，角色A提醒后，室友觉得角色A当着其他室友面让室友没面子。",
      opponentProfile: {
        type: "阴阳怪气型",
        personality: "平时不爱正面承认问题，被提醒后会用玩笑和反讽把自己包装成被针对的人。",
        tactics: ["说你洁癖", "暗示你爱管人", "把公共规则说成个人情绪"]
      },
      openingMessage: "行行行，就你最讲卫生，我们这种普通人住你旁边真是委屈你了。",
      userGoal: "让室友承认轮值责任，并从今天开始按约定倒垃圾。",
      realMainline: "问题不是谁更爱干净，而是共同生活规则被反复破坏。",
      mainline: {
        fact: "轮到室友倒垃圾的三次都没有按约定完成。",
        impact: "公共区域有异味，角色A被迫多次替室友处理，宿舍规则也失效了。",
        request: "今天这袋垃圾由室友处理，后续按轮值表执行。",
        boundary: "室友不要再把公共规则说成角色A个人洁癖或针对室友。"
      },
      traps: ["攻击角色A太计较", "把角色A的提醒说成不给面子", "用玩笑稀释责任"],
      trainingFocus: ["角色A不解释角色A是不是洁癖", "把话题拉回轮值事实", "提出清楚可执行的要求"],
      scoreFocus: {
        logic: "角色A是否抓住轮值事实，而不是争谁更爱干净。",
        power: "角色A是否能稳住气势，不被反讽压回去。",
        boundary: "角色A是否明确拒绝被贴上洁癖、针对人的标签。",
        mainline: "角色A是否持续围绕共同规则被破坏。",
        risk: "角色A是否避免羞辱室友生活习惯或升级成宿舍对立。"
      },
      suggestedFirstReplyHint: "角色A先接住室友的阴阳怪气，再把问题拉回“三次轮值没做”。"
    },
    {
      id: "scenario_group_deadline",
      title: "小组作业截止前队友才说自己不会做",
      category: "小组作业",
      difficulty: "王者",
      relationship: "课程小组队友",
      background:
        "小组展示明天上午截止，队友负责数据整理，上周在群里确认过没问题。今晚角色A催进度，队友才说自己不会做，还说角色A作为组长应该早点发现。队友希望角色A熬夜补上，并暗示如果分数低大家都有责任。",
      opponentProfile: {
        type: "偷换概念型",
        personality: "遇到责任会把问题转成角色A管理不到位，擅长让角色A自证是不是好组长。",
        tactics: ["甩锅给组长", "把失约说成能力问题", "用集体成绩压你兜底"]
      },
      openingMessage: "你现在怪我也没用啊，你是组长，你早点问清楚不就不会这样了吗？",
      userGoal: "让摆烂队友承认责任并今晚补上可交付部分。",
      realMainline: "队友已确认承担任务，现在临近截止失约，需要补救方案，而不是追究角色A是否完美管理。",
      mainline: {
        fact: "队友上周确认负责数据整理，截止前一晚仍未完成。",
        impact: "展示材料缺关键部分，其他成员要承担额外风险和时间成本。",
        request: "队友今晚先交出能完成的基础整理，并同步不会的部分。",
        boundary: "不能把已确认任务的失约转成组长一个人的责任。"
      },
      traps: ["要求角色A自证是不是合格组长", "把不会做当作免责任理由", "用小组分数逼角色A兜底"],
      trainingFocus: ["拒绝管理责任偷换", "要求具体补救动作", "保留分工证据"],
      scoreFocus: {
        logic: "角色A是否区分组长协调和成员承诺的责任。",
        power: "角色A是否能提出立即行动要求。",
        boundary: "角色A是否拒绝无条件熬夜兜底。",
        mainline: "角色A是否围绕已承诺任务未完成。",
        risk: "角色A是否避免直接羞辱能力，导致协作彻底破裂。"
      },
      suggestedFirstReplyHint: "角色A不要先解释角色A有没有提醒，先锁定队友确认过任务这个事实。"
    },
    {
      id: "scenario_work_blame",
      title: "同事把漏发客户邮件的锅甩给角色A",
      category: "职场甩锅",
      difficulty: "白银",
      relationship: "同项目同事",
      background:
        "客户昨天催一份报价更新，同事负责发最终版邮件，角色A负责给同事数据。角色A下午三点已在工作群发了数据，同事没确认也没发。今天客户追问，同事在会上说是角色A数据给晚了，导致邮件没法发。",
      opponentProfile: {
        type: "嘴硬型",
        personality: "怕承担工作失误，会抓住流程里的模糊点为自己找理由。",
        tactics: ["模糊时间线", "说自己没看到", "强调团队都有责任"]
      },
      openingMessage: "我昨天确实没收到你明确说可以发的版本啊，这事不能只算我一个人的吧。",
      userGoal: "澄清时间线，让同事承认邮件未发送是同事的执行遗漏。",
      realMainline: "角色A已按时给出数据，同事未确认和未发送邮件才是客户延误原因。",
      mainline: {
        fact: "角色A昨天下午三点在群里发了最终数据，同事负责发送邮件。",
        impact: "客户没有及时收到报价，会议上责任被错误归到角色A身上。",
        request: "请同事当场澄清时间线，并补发邮件。",
        boundary: "不能用“没看到”抹掉已经公开同步的交付记录。"
      },
      traps: ["把明确交付说成没确认", "把个人遗漏说成团队责任", "让角色A陷入解释流程细节"],
      trainingFocus: ["按时间线说话", "不被团队责任稀释事实", "要求公开澄清"],
      scoreFocus: {
        logic: "角色A是否用时间线证明责任归属。",
        power: "角色A是否能在职场语境里清楚但不失控。",
        boundary: "角色A是否拒绝背锅。",
        mainline: "角色A是否围绕数据已交付和邮件未发送。",
        risk: "角色A是否避免情绪化指责影响职业形象。"
      },
      suggestedFirstReplyHint: "角色A先报时间点和交付位置，再要求补充澄清。"
    },
    {
      id: "scenario_friend_money",
      title: "朋友借钱两个月不还，还说角色A催得太现实",
      category: "朋友借钱不还",
      difficulty: "王者",
      relationship: "关系不错的朋友",
      background:
        "两个月前朋友说临时周转，借了角色A 1200 元，承诺月底还。到期后朋友先说工资晚发，后来开始不回消息。今天角色A再次提醒，朋友发语音说最近压力很大，觉得角色A一直催让朋友很寒心。",
      opponentProfile: {
        type: "情绪勒索型",
        personality: "不想还钱时会把债务问题包装成友情和信任问题。",
        tactics: ["说你现实", "强调自己压力大", "把还钱诉求说成不够朋友"]
      },
      openingMessage: "我都说了最近真的很难，你一直催这个钱，咱俩这么多年朋友就只剩钱了吗？",
      userGoal: "要求朋友给明确还款时间，不再用友情回避债务。",
      realMainline: "借款承诺已经到期，友情不能取消还款责任。",
      mainline: {
        fact: "朋友借了 1200 元并承诺月底归还，现在已拖延两个月。",
        impact: "角色A的预算被影响，也承担了反复提醒的情绪成本。",
        request: "请朋友给出明确还款日期和分期安排。",
        boundary: "朋友不要再把正常还钱要求说成角色A不重视朋友。"
      },
      traps: ["用友情压角色A闭嘴", "让角色A同情朋友的压力", "把催款说成角色A人品现实"],
      trainingFocus: ["角色A不为合理催款道歉", "要求具体时间", "区分共情和放弃边界"],
      scoreFocus: {
        logic: "角色A是否区分朋友关系和借款承诺。",
        power: "角色A是否能坚定要求还款计划。",
        boundary: "角色A是否拒绝被友情绑架。",
        mainline: "角色A是否围绕承诺到期未还。",
        risk: "角色A是否避免羞辱经济状况或公开威胁。"
      },
      suggestedFirstReplyHint: "角色A可以承认朋友压力大，但不要让压力替代还款计划。"
    },
    {
      id: "scenario_online_sarcasm",
      title: "网友在评论区阴阳怪气角色A认真讨论",
      category: "网友阴阳怪气",
      difficulty: "黄金",
      relationship: "同一评论区网友",
      background:
        "角色A在一个帖子下认真回复了自己的经历和观点，网友没有回应内容本身，而是连续评论角色A“太有优越感”“小作文写得真努力”。其他人开始跟着起哄，讨论重点从原话题偏到角色A本人。",
      opponentProfile: {
        type: "阴阳怪气型",
        personality: "喜欢用轻飘飘的嘲讽制造围观感，不承担正面论证责任。",
        tactics: ["嘲笑表达方式", "攻击动机", "带动围观起哄"]
      },
      openingMessage: "哇，写这么长，看来你真的很需要证明自己比别人懂哦。",
      userGoal: "不被带偏到自证，要求网友回应具体观点或停止扣帽子。",
      realMainline: "争议点是观点内容，不是角色A写得长不长或是否有优越感。",
      mainline: {
        fact: "角色A提出了具体观点，网友没有回应内容，只评价角色A的表达动机。",
        impact: "讨论被带偏，其他人也开始围绕角色A本人起哄。",
        request: "请网友回应具体观点，不要继续扣动机帽子。",
        boundary: "如果网友只做人身化暗讽，角色A不会继续陪聊。"
      },
      traps: ["让角色A证明自己不优越", "把内容讨论变成表达方式审判", "诱导角色A情绪化回骂"],
      trainingFocus: ["短句压住阴阳怪气", "要求网友回到观点", "及时设置停止对话边界"],
      scoreFocus: {
        logic: "角色A是否区分观点和人格动机。",
        power: "角色A是否能短促有力地反击。",
        boundary: "角色A是否说明不接受暗讽式讨论。",
        mainline: "角色A是否持续要求回应具体内容。",
        risk: "角色A是否避免互喷和扩大攻击面。"
      },
      suggestedFirstReplyHint: "角色A不要解释角色A为什么写长，直接要求网友回应哪一句观点。"
    }
  ];
}

function normalizeOption(value, allowed) {
  const text = textOf(value);
  if (!text || text === "随机") return "随机";
  return allowed.includes(text) ? text : "随机";
}

function normalizeScenarioDifficulty(value) {
  const text = textOf(value);
  if (/easy|温和|青铜/i.test(text)) return "青铜";
  if (/hard|强势|黄金/i.test(text)) return "黄金";
  if (/hell|地狱|王者|阴阳大师/i.test(text)) return "王者";
  if (/normal|正常|普通|白银/i.test(text)) return "白银";
  return normalizeOption(text, difficulties);
}

function normalizeGameConfig(config = {}, input = {}) {
  const source = config && typeof config === "object" && !Array.isArray(config) ? config : {};
  const playerRoleKey = normalizeRoleKey(source.playerRoleKey || input.playerRoleKey || "A");
  const roleA = normalizeRole(source.roleA, {
    name: textOf(source.playerIdentity) || textOf(input.playerIdentity) || "角色A",
    description: "冲突中需要表达诉求、守住边界的一方",
    goal: textOf(input.userGoal) || textOf(source.userGoal) || "让角色B正面回应问题，并给出具体做法"
  });
  const roleB = normalizeRole(source.roleB, {
    name: textOf(source.aiIdentity) || textOf(input.aiIdentity) || inferOpponentName(source, input),
    description: "冲突中会辩解、回避或反击的一方",
    goal: "为自己的行为找理由，反驳角色A，并试图转移重点"
  });
  const trainingGoals = Array.isArray(source.trainingGoals)
    ? source.trainingGoals.map(textOf).filter(Boolean)
    : Array.isArray(source.goals)
      ? source.goals.map(textOf).filter(Boolean)
      : arrayOfText(input.trainingGoals);

  return {
    scene:
      textOf(source.scene) ||
      textOf(source.background) ||
      textOf(input.scene) ||
      textOf(input.customScene) ||
      textOf(source.topic) ||
      "一次真实生活冲突已经发生，角色B正在回避具体问题。",
    roleA,
    roleB,
    playerRoleKey,
    aiRoleKey: oppositeRoleKey(playerRoleKey),
    trainingGoals,
    difficulty: textOf(source.difficulty) || textOf(input.difficulty) || "normal",
    toneStrength: textOf(source.toneStrength) || textOf(input.toneStrength),
    contextSummary: textOf(source.contextSummary) || textOf(input.contextSummary),
    userMainline: textOf(source.userMainline) || textOf(input.userMainline)
  };
}

function normalizeRole(role, fallback) {
  const source = role && typeof role === "object" && !Array.isArray(role) ? role : {};
  return {
    name: textOf(source.name) || fallback.name,
    description: textOf(source.description) || fallback.description,
    goal: textOf(source.goal) || fallback.goal
  };
}

function normalizeRoleKey(value) {
  return value === "B" ? "B" : "A";
}

function oppositeRoleKey(value) {
  return normalizeRoleKey(value) === "A" ? "B" : "A";
}

function roleFromConfig(config, key) {
  return normalizeRoleKey(key) === "A" ? config.roleA : config.roleB;
}

function roleFromParts(roleA, roleB, key) {
  return normalizeRoleKey(key) === "A" ? roleA : roleB;
}

function inferOpponentName(source = {}, input = {}) {
  const text = `${textOf(source.relationship)} ${textOf(input.category)} ${textOf(source.title)} ${textOf(source.background)}`;
  if (/室友|宿舍/.test(text)) return "室友";
  if (/男朋友|女朋友|情侣|对象|恋爱/.test(text)) return /女朋友/.test(text) ? "女朋友" : "男朋友";
  if (/同事|职场|客户|项目/.test(text)) return "同事";
  if (/朋友|借钱|迟到/.test(text)) return "朋友";
  if (/亲戚|家庭|催婚|聚餐/.test(text)) return "亲戚";
  if (/商家|客服|退款/.test(text)) return "商家";
  if (/网友|评论/.test(text)) return "网友";
  if (/队友|小组作业|同学/.test(text)) return "队友";
  return "角色B";
}

function buildCustomSceneBackground(input, scenario, customDraft = null) {
  const category = randomValues.has(input.category) ? scenario.category : input.category;
  const difficulty = randomValues.has(input.difficulty) ? scenario.difficulty : input.difficulty;
  const opponentType = randomValues.has(input.opponentType) ? scenario.opponentProfile?.type : input.opponentType;
  const concrete = customDraft || buildConcreteCustomScenario(input, scenario);
  return `${concrete.background} 训练类型：${category}，难度：${difficulty}，对手倾向：${opponentType}。`;
}

function buildCustomOpeningMessage(input, customDraft = null) {
  const scene = customDraft?.shortEvent || input.customScene;
  const lead = customDraft?.openingLead || "";
  const type = input.opponentType;
  if (/阴阳/.test(type)) return `行，就你最有道理，${lead}${scene}都能被你说得这么严重。`;
  if (/偷换/.test(type)) return `你现在怪我也没用吧，${lead}${scene}难道你自己就一点问题没有？`;
  if (/情绪勒索/.test(type)) return `我都已经这样了，你还要拿${lead}${scene}一直逼我吗？`;
  if (/讲道理/.test(type)) return `${lead}${scene}这件事我不是不认，但你也不能只看你自己的角度。`;
  return `${lead}${scene}不能全怪我吧，你现在说得好像都是我的问题。`;
}

function buildCustomMainline(input, customDraft = null) {
  const goal = input.userGoal || "让角色B正面回应并给出具体做法";
  const concrete = customDraft || buildConcreteCustomScenario(input, {});
  return {
    fact: concrete.fact,
    impact: concrete.impact,
    request: goal,
    boundary: `${concrete.aiName}不要再用“${concrete.playerName}太敏感”“${concrete.playerName}想太多”来代替正面回应。`
  };
}

function buildCustomTraps(input, customDraft = null) {
  const playerName = customDraft?.playerName || "角色A";
  const aiName = customDraft?.aiName || "角色B";
  const traps = [
    `${aiName}把具体行为说成${playerName}的情绪问题`,
    `${aiName}要求${playerName}自证是不是太计较`
  ];
  if (/阴阳/.test(input.opponentType)) traps.push("用反讽让角色A失控");
  if (/偷换/.test(input.opponentType)) traps.push("把责任偷换成角色A也有问题");
  if (/情绪勒索/.test(input.opponentType)) traps.push("用委屈压角色A放弃要求");
  return traps;
}

function buildConcreteCustomScenario(input, scenario = {}) {
  const playerName = input.playerRole?.name || input.roleA?.name || "角色A";
  const aiName = input.aiRole?.name || input.roleB?.name || inferOpponentName(scenario, input);
  const shortEvent = input.customScene.replace(/[。！？!?，,；;：:]+$/g, "");
  const detail = inferConcreteCustomDetail(shortEvent, { playerName, aiName });
  const goal = input.userGoal || `${playerName}要求${aiName}正面回应并给出具体做法`;

  return {
    title: `${detail.titlePrefix}${shortEvent}`,
    shortEvent,
    playerName,
    aiName,
    openingLead: detail.openingLead,
    scene: `${detail.place}，${playerName}因为“${shortEvent}”和${aiName}起了冲突。${detail.trigger}`,
    background: `${detail.time}，${detail.place}，${detail.trigger}${detail.history}${playerName}刚把问题摊开，${aiName}没有正面处理，反而准备把重点转成${playerName}的态度。${playerName}的目标是：${goal}。`,
    fact: `${aiName}${detail.factAction || `涉及“${shortEvent}”的行为`}，${playerName}已经明确指出这件事需要处理。`,
    impact: `${detail.impact}${playerName}如果顺着解释情绪，问题会继续被拖过去。`
  };
}

function inferConcreteCustomDetail(scene, { playerName, aiName }) {
  if (/室友|宿舍|合租|垃圾|卫生|厨房|水电|公共区/.test(scene)) {
    return {
      titlePrefix: "合租公共区里",
      time: "周日晚 10 点半",
      place: "合租房厨房门口",
      trigger: `${aiName}第三次把公共区收尾留给${playerName}，还在群里说“谁看不惯谁收”。`,
      history: `${playerName}之前提醒过两次，这次已经影响到第二天使用公共空间。`,
      factAction: "连续没有处理约定好的公共区责任",
      impact: "公共空间被占用，原本说好的分工被打破。",
      openingLead: "不就一点公共区的事吗，"
    };
  }
  if (/男朋友|女朋友|对象|情侣|恋爱|约会|冷战|消息/.test(scene)) {
    return {
      titlePrefix: "约定被临时改掉后",
      time: "周五晚上出门前半小时",
      place: "两人的微信聊天里",
      trigger: `${aiName}临时改掉早就约好的安排，被${playerName}追问时只回“你别这么敏感”。`,
      history: `这已经是本月第二次，${playerName}提前空出了时间。`,
      factAction: "临时改变约定又没有提前商量",
      impact: `${playerName}的时间安排被打乱，感受也被一句话否定。`,
      openingLead: "我又不是故意的，"
    };
  }
  if (/同事|职场|工作|项目|客户|老板|汇报|需求|任务|甩锅/.test(scene)) {
    return {
      titlePrefix: "项目出问题后",
      time: "周一上午例会前十分钟",
      place: "项目群和会议室之间",
      trigger: `${aiName}把没有同步的材料问题推到${playerName}身上，说是${playerName}没有提醒到位。`,
      history: `${playerName}上周已经在群里确认过截止时间和负责人。`,
      factAction: "把自己负责的交付问题转成别人没提醒",
      impact: `${playerName}可能在团队里背锅，后续协作边界也会被模糊。`,
      openingLead: "你现在怪我也没用吧，"
    };
  }
  if (/朋友|借钱|还钱|转账|迟到|放鸽子|约饭/.test(scene)) {
    return {
      titlePrefix: "朋友约定反复落空后",
      time: "周六下午约定时间过后四十分钟",
      place: "商场门口的聊天窗口",
      trigger: `${aiName}又一次没有按约定处理，${playerName}催了以后被说“你怎么这么计较”。`,
      history: `类似情况已经出现三次，${playerName}每次都在迁就。`,
      factAction: "反复没有兑现已经说好的约定",
      impact: `${playerName}的时间和信任被消耗，关系里的责任被单方面推开。`,
      openingLead: "朋友之间有必要算这么清楚吗，"
    };
  }
  return {
    titlePrefix: "一次具体冲突中",
    time: "当天晚上消息发出后十分钟",
    place: "双方正在对话的聊天窗口",
    trigger: `${aiName}在“${scene}”这件事上没有正面回应具体行为，而是先评价${playerName}说话方式。`,
    history: `${playerName}之前已经说明过这件事造成的影响。`,
    factAction: `没有正面处理“${scene}”`,
    impact: `事情本身没有被解决，${playerName}还被迫解释自己的态度。`,
    openingLead: ""
  };
}

function fallbackTraps(opponentType) {
  const traps = ["把具体行为说成角色A的情绪问题", "要求角色A自证是不是太计较", "用一句反问把责任推回角色A身上"];
  if (/阴阳/.test(opponentType)) traps.push("用反讽激角色A失控");
  if (/嘴硬/.test(opponentType)) traps.push("明明有记录也继续否认");
  if (/偷换/.test(opponentType)) traps.push("把原问题偷换成角色A的态度问题");
  if (/情绪勒索/.test(opponentType)) traps.push("用委屈让角色A放弃要求");
  return traps;
}

function fallbackTrainingFocus(category, difficulty) {
  return [
    `围绕${category || "当前场景"}里的具体事实发言`,
    "识别角色B转移重点的话术",
    "提出清楚、可执行的下一步要求",
    difficulty === "王者" ? "在高压话术下保持主线不散" : "角色A不为了缓和气氛放弃边界"
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
