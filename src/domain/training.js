import { trainingDifficultyOptions, trainingGoalOptions } from "../data/mockData.js";
import { normalizeTrainingRoleName } from "./trainingNicknames.js";

export function maxRoundsForDifficulty(difficulty) {
  const text = String(difficulty || "");
  if (/青铜|easy|温和|简单|低/.test(text)) return 4;
  if (/黄金|王者|hard|hell|强势|地狱|困难|高/.test(text)) return 6;
  return 5;
}

export function normalizeTrainingGameConfig(config = {}) {
  const playerRoleKey = config.playerRoleKey === "B" ? "B" : "A";
  const sceneSeed = config.scene || config.contextSummary || config.userMainline || config.debateTopic || "";
  const trainingGoals = Array.isArray(config.trainingGoals)
    ? config.trainingGoals.filter(Boolean)
    : String(config.trainingGoals || config.goals || "")
        .split(/[、,，/]/)
        .map((item) => item.trim())
        .filter(Boolean);
  return {
    scene: String(config.scene || summarizeTrainingStory(config.contextSummary) || "").trim(),
    roleA: normalizeRoleConfig(config.roleA, {
      name: normalizeTrainingRoleName("A", config.roleA?.name, sceneSeed),
      description: "有理方 / 提出要求的一方",
      goal: "说清事实、影响和要求，守住主线"
    }, "A", sceneSeed),
    roleB: normalizeRoleConfig(config.roleB, {
      name: normalizeTrainingRoleName("B", config.roleB?.name, sceneSeed),
      description: "理亏方 / 辩解转移的一方",
      goal: "嘴硬、辩解、转移和拖延，尽量顶住有理方追问"
    }, "B", sceneSeed),
    playerRoleKey,
    aiRoleKey: oppositeRoleKey(playerRoleKey),
    trainingGoals: trainingGoals.length ? trainingGoals : ["抓住核心问题", "不被嘲讽带偏"],
    difficulty: normalizeConfigDifficulty(config.difficulty),
    toneStrength: normalizeToneStrength(config.toneStrength),
    contextSummary: String(config.contextSummary || "").trim(),
    userMainline: String(config.userMainline || "").trim(),
    sessionControl: normalizeSessionControl(config.sessionControl)
  };
}

export function normalizeRoleConfig(role, fallback, roleKey = "A", seed = "") {
  return {
    name: normalizeTrainingRoleName(roleKey, role?.name || fallback.name, seed),
    description: String(role?.description || fallback.description || "").trim(),
    goal: String(role?.goal || fallback.goal || "").trim()
  };
}

export function oppositeRoleKey(roleKey) {
  return roleKey === "B" ? "A" : "B";
}

export function getRoleFromConfig(config, roleKey) {
  return roleKey === "B" ? config.roleB : config.roleA;
}

export function getPlayerRoleFromConfig(config) {
  return getRoleFromConfig(config, config.playerRoleKey);
}

export function getAiRoleFromConfig(config) {
  return getRoleFromConfig(config, config.aiRoleKey);
}

export function normalizeConfigDifficulty(value) {
  if (["easy", "normal", "hard", "hell"].includes(value)) return value;
  if (/温和|热身|青铜|easy/i.test(String(value || ""))) return "easy";
  if (/强势|嘴硬|黄金|hard/i.test(String(value || ""))) return "hard";
  if (/地狱|阴阳|王者|hell/i.test(String(value || ""))) return "hell";
  return "normal";
}

export function normalizeToneStrength(value) {
  if (["低", "中", "高"].includes(value)) return value;
  if (/低|soft|轻/i.test(String(value || ""))) return "低";
  if (/高|strong|锋利|攻击/i.test(String(value || ""))) return "高";
  return "中";
}

export function normalizeSessionControl(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    replyLength: ["短", "中", "长"].includes(source.replyLength) ? source.replyLength : "中",
    remindMainline: source.remindMainline === "关闭" ? "关闭" : "开启",
    allowEscalation: source.allowEscalation === "禁止" ? "禁止" : "允许"
  };
}

export function difficultyLabelForConfig(value) {
  return trainingDifficultyOptions.find((item) => item.value === normalizeConfigDifficulty(value))?.label || "正常";
}

export function formatTrainingGoals(goals = []) {
  return goals.length ? goals.join("、") : "抓住核心问题、不被嘲讽带偏";
}

export function summarizeTrainingStory(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const firstSentence = text.split(/[。！？!?]/).find(Boolean) || text;
  return firstSentence.length > 80 ? `${firstSentence.slice(0, 80)}...` : firstSentence;
}

export function scenarioToGameConfig(scenario = {}, previousConfig = {}) {
  const inferred = inferScenarioRoles(scenario, previousConfig);
  const difficulty = normalizeConfigDifficulty(scenario.aiDifficulty || scenario.difficulty || previousConfig.difficulty);
  const goals = scenario.userGoal
    ? matchTrainingGoals(scenario.userGoal)
    : previousConfig.trainingGoals;
  return normalizeTrainingGameConfig({
    scene: scenario.scene || scenario.background || scenario.title || previousConfig.scene || summarizeTrainingStory(previousConfig.contextSummary) || "",
    roleA: scenario.roleA || inferred.roleA,
    roleB: scenario.roleB || inferred.roleB,
    playerRoleKey: ["A", "B"].includes(previousConfig.playerRoleKey)
      ? previousConfig.playerRoleKey
      : scenario.playerRoleKey === "B"
      ? "B"
      : "A",
    trainingGoals: goals?.length ? goals : ["抓住核心问题"],
    difficulty,
    toneStrength: previousConfig.toneStrength,
    contextSummary: scenario.background || scenario.scene || previousConfig.contextSummary,
    userMainline: scenario.realMainline || scenario.userGoal || previousConfig.userMainline,
    sessionControl: previousConfig.sessionControl
  });
}

export function matchTrainingGoals(text) {
  const value = String(text || "");
  const matched = trainingGoalOptions.filter((goal) => value.includes(goal));
  if (matched.length) return matched;
  if (/嘲讽|阴阳/.test(value)) matched.push("练习反击阴阳怪气");
  if (/核心|主线|责任/.test(value)) matched.push("抓住核心问题");
  if (/冷静|稳定|失控/.test(value)) matched.push("不情绪失控");
  if (/明确|要求|诉求/.test(value)) matched.push("坚持提出明确要求");
  if (/带偏|转移/.test(value)) matched.push("不被嘲讽带偏");
  return matched.length ? [...new Set(matched)] : ["抓住核心问题"];
}

export function inferScenarioRoles(scenario = {}, previousConfig = {}) {
  const text = `${scenario.title || ""} ${scenario.background || ""} ${scenario.relationship || ""} ${scenario.category || ""}`;
  if (/男朋友|女朋友|情侣|恋爱|冷战|对象/.test(text)) {
    return {
      roleA: { name: normalizeTrainingRoleName("A", "", text), description: "有理方 / 被临时改约影响的人", goal: "说清感受和要求，不被太敏感带偏" },
      roleB: { name: "男朋友", description: "理亏方 / 临时改约后试图辩解的人", goal: "嘴硬解释临时改约，转移到对方太敏感，尽量顶住追问" }
    };
  }
  if (/室友|宿舍|合租|垃圾/.test(text)) {
    return {
      roleA: { name: normalizeTrainingRoleName("A", "", text), description: "有理方 / 被室友不倒垃圾影响的人", goal: "让室友承担责任，不要再嘲讽和转移话题" },
      roleB: { name: "室友", description: "理亏方 / 不想倒垃圾并试图转移重点的人", goal: "嘴硬拖延，强调自己也有理由，尽量不承认核心问题" }
    };
  }
  if (/同事|职场|工作|项目|客户/.test(text)) {
    return {
      roleA: { name: normalizeTrainingRoleName("A", "", text), description: "有理方 / 被同事甩锅影响的人", goal: "澄清责任，要求同事正面处理问题" },
      roleB: { name: "同事", description: "理亏方 / 把工作压力和责任推给另一方的人", goal: "嘴硬甩锅，模糊责任边界，顶住对方追问" }
    };
  }
  return {
    roleA: previousConfig.roleA || { name: normalizeTrainingRoleName("A", "", text), description: "有理方 / 提出要求的一方", goal: "说清事实、影响和要求，守住主线" },
    roleB: previousConfig.roleB || { name: normalizeTrainingRoleName("B", "", text), description: "理亏方 / 辩解转移的一方", goal: "嘴硬、辩解、转移和拖延，尽量顶住有理方追问" }
  };
}

export function buildScenarioFromGameConfig(config) {
  const playerRole = getPlayerRoleFromConfig(config);
  const aiRole = getAiRoleFromConfig(config);
  const goal = formatTrainingGoals(config.trainingGoals);
  const playerName = playerRole.name || normalizeTrainingRoleName(config.playerRoleKey, "", config.scene);
  const aiName = aiRole.name || normalizeTrainingRoleName(config.aiRoleKey, "", config.scene);
  const concreteScene = buildConcreteSceneDraft(config.scene, {
    playerName,
    aiName,
    aiGoal: aiRole.goal,
    userGoal: goal,
    difficulty: difficultyLabelForConfig(config.difficulty)
  });
  const mainline = {
    fact: concreteScene.fact,
    impact: concreteScene.impact,
    request: goal || concreteScene.request,
    boundary: `${playerName}要求${aiName}正面回应具体行为，不接受被扣成“太敏感”“太计较”或态度问题。`
  };
  return {
    id: `config_scenario_${Date.now()}`,
    title: concreteScene.title,
    scene: concreteScene.scene,
    background: concreteScene.background,
    roleA: config.roleA,
    roleB: config.roleB,
    playerRoleKey: config.playerRoleKey,
    aiRoleKey: config.aiRoleKey,
    playerIdentity: playerRole.name,
    aiIdentity: aiRole.name,
    aiDifficulty: difficultyLabelForConfig(config.difficulty),
    difficulty: difficultyLabelForConfig(config.difficulty),
    relationship: `${playerRole.name} vs ${aiRole.name}`,
    openingMessage: buildOpeningForGameConfig(config, concreteScene),
    openingMessageSpeaker: config.aiRoleKey,
    userGoal: goal,
    realMainline: buildPlayerMainlineText(config, { playerName, aiName, fact: concreteScene.fact }),
    mainline,
    stanceJudgment: buildStanceJudgmentFromConfig(config, {
      fact: concreteScene.fact,
      roleAName: config.roleA.name || normalizeTrainingRoleName("A", "", config.scene),
      roleBName: config.roleB.name || normalizeTrainingRoleName("B", "", config.scene)
    }),
    traps: buildRoleAwareTraps(config, { playerName, aiName }),
    trainingFocus: config.trainingGoals.length
      ? config.trainingGoals
      : ["抓住具体事实", "点出实际影响", "提出下一步要求"],
    scoreFocus: {
      logic: "是否围绕具体触发事件和责任说话。",
      power: `是否能站稳${roleSideLabel(config.playerRoleKey)}的表达方式，不被 AI 对手压住。`,
      boundary: `是否守住${playerName}的角色目标和安全边界。`,
      mainline: "是否持续围绕训练目标。",
      risk: "是否避免辱骂、威胁或人身攻击。"
    },
    suggestedFirstReplyHint: buildRoleAwareFirstReplyHint(config, { playerName, aiName, fact: concreteScene.fact }),
    createdAt: new Date().toISOString()
  };
}

function buildStanceJudgmentFromConfig(config, { fact, roleAName, roleBName }) {
  return {
    aJustification: `${roleAName}有事实基础提出要求：${fact}`,
    bFault: `${fact.includes(roleBName) ? fact : `${roleBName}已经${fact}`}，这是已发生且明确的过错。`,
    disputeFocus: `真正争议焦点是${roleBName}如何正面处理过错，而不是${roleAName}的态度。`,
    bExcuseSpace: `${roleBName}可以嘴硬、辩解、转移或拖延，但不能推翻已经发生的核心过错。`,
    aPressurePoint: `${roleAName}应抓住具体行为、影响和补救动作追问。`
  };
}

export function buildOpeningForGameConfig(config, concreteScene = null) {
  const aiRole = getAiRoleFromConfig(config);
  const playerRole = getPlayerRoleFromConfig(config);
  if (config.aiRoleKey === "B" && concreteScene?.openingMessage) return concreteScene.openingMessage;
  if (config.aiRoleKey === "A") {
    return buildRoleAOpeningFromConfig(config, { playerRole, aiRole, concreteScene });
  }
  return `${aiRole.name}先开口：${aiRole.goal || `这事也不能只听${playerRole.name || "另一方"}一边说法。`}。`;
}

function buildRoleAOpeningFromConfig(config, { playerRole, aiRole, concreteScene = null }) {
  const text = [config.contextSummary, config.scene, config.userMainline, concreteScene?.fact, concreteScene?.request].filter(Boolean).join(" ");
  if (/黑色|白色|颜色随机|外套|商品详情|退货|退款|运费|卖家|买家/.test(text)) {
    return `${aiRole.name}先开口：我买的是黑色外套，你发来的是白色。商品详情没有清楚写明可以随便发色，现在请你处理退货、退款和运费。`;
  }
  if (/寄养|猫|跳蚤|抓伤|延期|寄养费|医疗费/.test(text)) {
    return `${aiRole.name}先开口：别把问题绕开。现在说的是延期和额外费用，你要给出明确处理方式。`;
  }
  const fact = String(concreteScene?.fact || config.userMainline || config.scene || "这件事").replace(/\s+/g, "");
  const shortFact = fact.length > 42 ? `${fact.slice(0, 42)}...` : fact;
  return `${aiRole.name}先开口：${playerRole.name}，别把责任往我身上推。${shortFact}，你现在给个明确说法。`;
}

function roleSideLabel(roleKey) {
  return roleKey === "B" ? "理亏方 / 辩解转移的一方" : "有理方 / 提出要求的一方";
}

function buildPlayerMainlineText(config, { playerName, aiName, fact }) {
  if (config.playerRoleKey === "B") {
    return `${playerName}要进入反派抗压模式：在理亏处境中嘴硬、辩解、转移和拖延，尽量顶住${aiName}的追问；不要辱骂、威胁或人身攻击。`;
  }
  return `${playerName}要守住的主线是：${fact}。不要被${aiName}带去解释态度、情绪或人品。`;
}

function buildRoleAwareTraps(config, { playerName, aiName }) {
  if (config.playerRoleKey === "B") {
    return [
      `${aiName}追问${playerName}的具体责任，${playerName}不要用辱骂或恶意攻击逃避`,
      `${aiName}要求立刻承认问题，${playerName}需要继续嘴硬并把责任拆散`,
      `${aiName}指出${playerName}在转移重点，${playerName}要用反问、拖延或装委屈顶住`
    ];
  }
  return [
    `${aiName}把具体行为说成${playerName}太敏感或太计较`,
    `${aiName}用“之前也这样”淡化这次影响`,
    `${aiName}反问${playerName}为什么当时不处理，逼${playerName}自证`
  ];
}

function buildRoleAwareFirstReplyHint(config, { playerName, aiName, fact }) {
  if (config.playerRoleKey === "B") {
    return `${playerName}先别承认核心问题，用理由、反问或转移话题顶住${aiName}的追问。`;
  }
  return `先点出${fact}，再要求${aiName}给出具体处理方式。`;
}

export function buildPresetScenarioDraft(input = {}) {
  if (input.gameConfig) return buildScenarioFromGameConfig(normalizeTrainingGameConfig(input.gameConfig));
  const category = pickSetupValue(input.category, "自定义场景");
  const difficulty = pickSetupValue(input.difficulty, "普通");
  const opponentType = pickSetupValue(input.opponentType, "嘴硬型");
  const customScene = String(input.customScene || "").trim();
  const userGoal = String(input.userGoal || "").trim() || "守住主线，让理亏方正面回应并给出具体做法。";
  const title = customScene || `${category}里的${opponentType}训练`;
  const mainline = buildPresetMainline({ category, customScene, userGoal });
  const inferred = inferScenarioRoles({ title, category, background: customScene }, {});
  const roleAName = inferred.roleA.name;
  const roleBName = inferred.roleB.name;

  return {
    id: `preset_draft_${Date.now()}`,
    title,
    roleA: inferred.roleA,
    roleB: inferred.roleB,
    playerRoleKey: "A",
    aiRoleKey: "B",
    aiDifficulty: input.aiDifficulty || difficulty,
    category,
    difficulty,
    relationship: relationshipForCategory(category),
    background: buildPresetBackground({ category, difficulty, opponentType, customScene, userGoal }),
    opponentProfile: {
      type: opponentType,
      personality: personalityForOpponentType(opponentType),
      tactics: tacticsForOpponentType(opponentType)
    },
    openingMessage: openingForOpponentType({ opponentType, customScene, category }),
    userGoal,
    realMainline: `这局要守住的是：${mainline.fact}。${roleAName}是有理方 / 提出要求的一方，${roleBName}是理亏方 / 辩解转移的一方；玩家可以选择其中一方练习。`,
    mainline,
    traps: trapsForOpponentType(opponentType),
    trainingFocus: [
      "有理方先说事实，不急着自证情绪",
      "点出理亏方正在辩解或转移重点",
      "提出明确、可执行的下一步要求",
      difficulty === "王者" ? "在压力测试模式下继续守住主线" : "不为了缓和气氛放弃边界"
    ],
    scoreFocus: {
      logic: "是否围绕事实和责任说话。",
      power: "是否短句清楚、有压迫感。",
      boundary: "是否说清不接受什么。",
      mainline: "是否持续守住本局核心问题。",
      risk: "是否避免辱骂、人身攻击或现实威胁。"
    },
    suggestedFirstReplyHint: "先别解释有理方是不是太计较，直接把话拉回具体事实和要求。",
    createdAt: new Date().toISOString()
  };
}

export function pickSetupValue(value, fallback) {
  const text = String(value || "").trim();
  return !text || text === "随机" ? fallback : text;
}

export function buildPresetMainline({ category, customScene, userGoal }) {
  const seed = customScene || category || "这件事";
  const playerName = normalizeTrainingRoleName("A", "", seed);
  const aiName = normalizeTrainingRoleName("B", "", seed);
  const concreteScene = buildConcreteSceneDraft(customScene || category || "这件事", {
    playerName,
    aiName,
    userGoal
  });
  return {
    fact: concreteScene.fact,
    impact: concreteScene.impact,
    request: userGoal || "让理亏方正面回应，并给出具体处理方式。",
    boundary: "理亏方不要再用“太敏感”“想太多”或反问来代替正面回应。"
  };
}

export function buildPresetBackground({ category, difficulty, opponentType, customScene, userGoal }) {
  const seed = customScene || category || "一场冲突";
  const playerName = normalizeTrainingRoleName("A", "", seed);
  const aiName = normalizeTrainingRoleName("B", "", seed);
  const concreteScene = buildConcreteSceneDraft(customScene || `一场${category}冲突`, {
    playerName,
    aiName,
    userGoal,
    difficulty
  });
  return `${concreteScene.background} 本局难度：${difficulty}；${playerName}是有理方 / 提出要求的一方，${aiName}是理亏方 / 辩解转移的一方；训练目标是：${userGoal}。`;
}

export function relationshipForCategory(category) {
  if (/职场|工作|同事/.test(category)) return "同事";
  if (/情侣|冷战|恋爱/.test(category)) return "亲密关系对象";
  if (/宿舍|室友/.test(category)) return "室友";
  if (/朋友|借钱/.test(category)) return "朋友";
  if (/商家|客服/.test(category)) return "商家或客服";
  if (/家庭|催婚/.test(category)) return "家人";
  if (/网友/.test(category)) return "网友";
  return "日常关系";
}

export function personalityForOpponentType(opponentType) {
  if (/阴阳/.test(opponentType)) return "喜欢用反讽和轻飘飘的评价让你失控。";
  if (/偷换/.test(opponentType)) return "会把原本的问题偷换成有理方的态度、能力或情绪问题。";
  if (/情绪勒索/.test(opponentType)) return "会用委屈和关系压力让你放弃合理要求。";
  if (/讲道理/.test(opponentType)) return "表面讲逻辑，但会选择性忽略自己的责任。";
  return "嘴硬、不愿承认问题，会不断找借口推开责任。";
}

export function tacticsForOpponentType(opponentType) {
  if (/阴阳/.test(opponentType)) return ["暗讽你太较真", "嘲笑你的表达方式", "引你情绪化"];
  if (/偷换/.test(opponentType)) return ["把事实偷换成态度", "要求你自证没问题", "模糊责任边界"];
  if (/情绪勒索/.test(opponentType)) return ["表现委屈", "用关系压你", "让你为合理诉求内疚"];
  if (/讲道理/.test(opponentType)) return ["选择性讲规则", "淡化影响", "把责任平均摊开"];
  return ["否认问题", "找借口", "反问你为什么没做更多"];
}

export function trapsForOpponentType(opponentType) {
  return tacticsForOpponentType(opponentType).map((tactic) => `理亏方可能会${tactic}，有理方不要顺着解释，拉回事实和要求。`);
}

export function openingForOpponentType({ opponentType, customScene, category }) {
  const seed = customScene || category || "这件事";
  const concreteScene = buildConcreteSceneDraft(customScene || category || "这件事", {
    playerName: normalizeTrainingRoleName("A", "", seed),
    aiName: normalizeTrainingRoleName("B", "", seed)
  });
  const scene = concreteScene.shortEvent;
  if (/阴阳/.test(opponentType)) return `行，就你最有道理，${scene}都能被你说得这么严重。`;
  if (/偷换/.test(opponentType)) return `你现在一直说${scene}，那你自己就一点问题都没有吗？`;
  if (/情绪勒索/.test(opponentType)) return `我都已经这样了，你还要拿${scene}一直逼我吗？`;
  if (/讲道理/.test(opponentType)) return `${scene}我不是不认，但你也不能只站在你自己的角度看。`;
  return `${scene}不能全怪我吧，你现在说得好像都是我的问题。`;
}

export function buildConcreteSceneDraft(rawScene, options = {}) {
  const scene = String(rawScene || "").trim() || "一件被拖着没有解决的具体冲突";
  const playerName = options.playerName || normalizeTrainingRoleName("A", "", scene);
  const aiName = options.aiName || normalizeTrainingRoleName("B", "", scene);
  const userGoal = String(options.userGoal || "").trim() || `让${aiName}正面回应并给出具体做法`;
  const shortEvent = scene.replace(/[。！？!?，,；;：:]+$/g, "");
  const detail = inferConcreteSceneDetail(shortEvent, { playerName, aiName });

  return {
    title: `${detail.titlePrefix}${shortEvent}`,
    shortEvent,
    scene: `${detail.place}，${playerName}因为“${shortEvent}”和${aiName}起了冲突。${detail.trigger}`,
    background: `${detail.time}，${detail.place}，${detail.trigger}${detail.history}${playerName}刚把问题摊开，${aiName}没有正面处理，反而准备把重点转成${playerName}的态度。${playerName}的目标是：${userGoal}。`,
    fact: `${aiName}${detail.factAction || `涉及“${shortEvent}”的行为`}，${playerName}已经明确指出这件事需要处理。`,
    impact: `${detail.impact}${playerName}如果顺着解释情绪，问题会继续被拖过去。`,
    request: userGoal,
    openingMessage: `${detail.openingLead}${detail.openingEvent || shortEvent}这事不能全怪我吧，你现在说得好像都是我的问题。`
  };
}

function inferConcreteSceneDetail(scene, { playerName, aiName }) {
  if (/室友|宿舍|合租|垃圾|卫生|厨房|水电|公共区/.test(scene)) {
    return {
      titlePrefix: "合租公共区里",
      time: "周日晚 10 点半",
      place: "合租房厨房门口",
      trigger: `${aiName}第三次把公共区收尾留给${playerName}，还在群里说“谁看不惯谁收”。`,
      history: `${playerName}之前提醒过两次，这次已经影响到第二天使用公共空间。`,
      factAction: "连续没有处理约定好的公共区责任",
      impact: "公共空间被占用，原本说好的分工被打破。",
      openingLead: "不就一点公共区的事吗，",
      openingEvent: "收拾"
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
      openingLead: "我又不是故意的，",
      openingEvent: "改约"
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
      openingLead: "你现在怪我也没用吧，",
      openingEvent: "材料"
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
      openingLead: "朋友之间有必要算这么清楚吗，",
      openingEvent: "这点事"
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
    openingLead: "",
    openingEvent: scene
  };
}
