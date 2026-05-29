import { trainingDifficultyOptions, trainingGoalOptions } from "../data/mockData.js";

export function maxRoundsForDifficulty(difficulty) {
  const text = String(difficulty || "");
  if (/青铜|easy|温和|简单|低/.test(text)) return 4;
  if (/黄金|王者|hard|hell|强势|地狱|困难|高/.test(text)) return 6;
  return 5;
}

export function normalizeTrainingGameConfig(config = {}) {
  const playerRoleKey = config.playerRoleKey === "B" ? "B" : "A";
  const trainingGoals = Array.isArray(config.trainingGoals)
    ? config.trainingGoals.filter(Boolean)
    : String(config.trainingGoals || config.goals || "")
        .split(/[、,，/]/)
        .map((item) => item.trim())
        .filter(Boolean);
  return {
    scene: String(config.scene || "").trim(),
    roleA: normalizeRoleConfig(config.roleA, {
      name: "角色A",
      description: "场景中的主动表达者",
      goal: "说清问题，守住主线"
    }),
    roleB: normalizeRoleConfig(config.roleB, {
      name: "角色B",
      description: "场景中的冲突对象",
      goal: "反驳另一方，制造压力"
    }),
    playerRoleKey,
    aiRoleKey: oppositeRoleKey(playerRoleKey),
    trainingGoals: trainingGoals.length ? trainingGoals : ["抓住核心问题"],
    difficulty: normalizeConfigDifficulty(config.difficulty)
  };
}

export function normalizeRoleConfig(role, fallback) {
  return {
    name: String(role?.name || fallback.name || "").trim(),
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

export function difficultyLabelForConfig(value) {
  return trainingDifficultyOptions.find((item) => item.value === normalizeConfigDifficulty(value))?.label || "正常";
}

export function formatTrainingGoals(goals = []) {
  return goals.length ? goals.join("、") : "抓住核心问题";
}

export function scenarioToGameConfig(scenario = {}, previousConfig = {}) {
  const inferred = inferScenarioRoles(scenario, previousConfig);
  const difficulty = normalizeConfigDifficulty(scenario.aiDifficulty || scenario.difficulty || previousConfig.difficulty);
  const goals = scenario.userGoal
    ? matchTrainingGoals(scenario.userGoal)
    : previousConfig.trainingGoals;
  return normalizeTrainingGameConfig({
    scene: scenario.scene || scenario.background || scenario.title || previousConfig.scene || "",
    roleA: scenario.roleA || inferred.roleA,
    roleB: scenario.roleB || inferred.roleB,
    playerRoleKey: scenario.playerRoleKey === "B" ? "B" : previousConfig.playerRoleKey || "A",
    trainingGoals: goals?.length ? goals : ["抓住核心问题"],
    difficulty
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
      roleA: { name: "角色A", description: "被临时改约影响的人", goal: "说清感受和要求，不被太敏感带偏" },
      roleB: { name: "男朋友", description: "临时改约后觉得角色A反应太大", goal: "为临时改约找理由，反驳角色A太敏感" }
    };
  }
  if (/室友|宿舍|合租|垃圾/.test(text)) {
    return {
      roleA: { name: "角色A", description: "被室友不倒垃圾影响的人", goal: "让室友承担责任，不要再嘲讽和转移话题" },
      roleB: { name: "室友", description: "不想倒垃圾，还觉得角色A管太多", goal: "为自己辩解，反驳角色A，说角色A小题大做" }
    };
  }
  if (/同事|职场|工作|项目|客户/.test(text)) {
    return {
      roleA: { name: "角色A", description: "被同事甩锅影响的人", goal: "澄清责任，要求同事正面处理问题" },
      roleB: { name: "同事", description: "把工作压力和责任推给角色A", goal: "为自己推脱，强调角色A也有责任" }
    };
  }
  return {
    roleA: previousConfig.roleA || { name: "角色A", description: "场景中的主动表达者", goal: "说清问题，守住主线" },
    roleB: previousConfig.roleB || { name: "角色B", description: "场景中的冲突对象", goal: "反驳另一方，制造压力" }
  };
}

export function buildScenarioFromGameConfig(config) {
  const playerRole = getPlayerRoleFromConfig(config);
  const aiRole = getAiRoleFromConfig(config);
  const goal = formatTrainingGoals(config.trainingGoals);
  const playerName = playerRole.name || `角色${config.playerRoleKey}`;
  const aiName = aiRole.name || `角色${config.aiRoleKey}`;
  const mainline = {
    fact: config.scene,
    impact: `${playerName}需要在压力下稳定表达，不被${aiName}带偏。`,
    request: `围绕“${goal}”推进对话。`,
    boundary: `AI 对手只能扮演${aiName}，不能替${playerName}说话，也不能跳出场景。`
  };
  return {
    id: `config_scenario_${Date.now()}`,
    title: config.scene,
    background: config.scene,
    roleA: config.roleA,
    roleB: config.roleB,
    playerRoleKey: config.playerRoleKey,
    aiRoleKey: config.aiRoleKey,
    playerIdentity: playerRole.name,
    aiIdentity: aiRole.name,
    aiDifficulty: difficultyLabelForConfig(config.difficulty),
    difficulty: difficultyLabelForConfig(config.difficulty),
    relationship: `${playerRole.name} vs ${aiRole.name}`,
    openingMessage: buildOpeningForGameConfig(config),
    userGoal: goal,
    realMainline: `${playerName}要完成训练目标：${goal}。`,
    mainline,
    traps: [`${aiName}转移重点`, `${aiName}反问施压`, `${aiName}要求${playerName}自证`],
    trainingFocus: config.trainingGoals,
    scoreFocus: {
      logic: "是否围绕场景和身份关系说话。",
      power: "是否能稳定推进，不被 AI 对手压住。",
      boundary: `是否守住${playerName}的角色目标和表达边界。`,
      mainline: "是否持续围绕训练目标。",
      risk: "是否避免辱骂、威胁或人身攻击。"
    },
    suggestedFirstReplyHint: "先抓住场景里的核心问题，再回应 AI 对手的施压点。",
    createdAt: new Date().toISOString()
  };
}

export function buildOpeningForGameConfig(config) {
  const aiRole = getAiRoleFromConfig(config);
  const playerRole = getPlayerRoleFromConfig(config);
  return `${aiRole.name}先开口：${aiRole.goal || `这事也不能只听${playerRole.name || "另一方"}一边说法。`}。`;
}

export function buildPresetScenarioDraft(input = {}) {
  if (input.gameConfig) return buildScenarioFromGameConfig(normalizeTrainingGameConfig(input.gameConfig));
  const category = pickSetupValue(input.category, "自定义场景");
  const difficulty = pickSetupValue(input.difficulty, "普通");
  const opponentType = pickSetupValue(input.opponentType, "嘴硬型");
  const customScene = String(input.customScene || "").trim();
  const userGoal = String(input.userGoal || "").trim() || "守住主线，让角色B正面回应并给出具体做法。";
  const title = customScene || `${category}里的${opponentType}训练`;
  const mainline = buildPresetMainline({ category, customScene, userGoal });
  const inferred = inferScenarioRoles({ title, category, background: customScene }, {});

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
    realMainline: `这局要守住的是：${mainline.fact}。不要被角色B带去解释态度、情绪或人品。`,
    mainline,
    traps: trapsForOpponentType(opponentType),
    trainingFocus: [
      "角色A先说事实，不急着解释角色A自己",
      "点出角色B正在转移重点",
      "提出明确、可执行的下一步要求",
      difficulty === "王者" ? "在角色B高压反问下继续守住主线" : "角色A不为了缓和气氛放弃边界"
    ],
    scoreFocus: {
      logic: "是否围绕事实和责任说话。",
      power: "是否短句清楚、有压迫感。",
      boundary: "是否说清不接受什么。",
      mainline: "是否持续守住本局核心问题。",
      risk: "是否避免辱骂、人身攻击或现实威胁。"
    },
    suggestedFirstReplyHint: "先别解释角色A是不是太计较，直接把话拉回具体事实和要求。",
    createdAt: new Date().toISOString()
  };
}

export function pickSetupValue(value, fallback) {
  const text = String(value || "").trim();
  return !text || text === "随机" ? fallback : text;
}

export function buildPresetMainline({ category, customScene, userGoal }) {
  const scene = customScene || category || "这件事";
  return {
    fact: `当前冲突是：${scene}`,
    impact: "角色B正在把具体问题转成角色A的态度或情绪，导致事情本身没有被处理。",
    request: userGoal || "让角色B正面回应，并给出具体处理方式。",
    boundary: "角色B不要再用“角色A太敏感”“角色A想太多”或反问来代替正面回应。"
  };
}

export function buildPresetBackground({ category, difficulty, opponentType, customScene, userGoal }) {
  const scene = customScene || `一场${category}冲突`;
  return `${scene}。本局难度：${difficulty}；角色B人设：${opponentType}。角色A的训练目标是：${userGoal}。角色B会尝试把问题从事实和责任转成角色A的态度、情绪或沟通方式。`;
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
  if (/偷换/.test(opponentType)) return "会把原本的问题偷换成角色A的态度、能力或情绪问题。";
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
  return tacticsForOpponentType(opponentType).map((tactic) => `角色B可能会${tactic}，角色A不要顺着解释，拉回事实和要求。`);
}

export function openingForOpponentType({ opponentType, customScene, category }) {
  const scene = customScene || category || "这件事";
  if (/阴阳/.test(opponentType)) return `行，就你最有道理，${scene}都能被你说得这么严重。`;
  if (/偷换/.test(opponentType)) return `你现在一直说${scene}，那你自己就一点问题都没有吗？`;
  if (/情绪勒索/.test(opponentType)) return `我都已经这样了，你还要拿${scene}一直逼我吗？`;
  if (/讲道理/.test(opponentType)) return `${scene}我不是不认，但你也不能只站在你自己的角度看。`;
  return `${scene}不能全怪我吧，你现在说得好像都是我的问题。`;
}
