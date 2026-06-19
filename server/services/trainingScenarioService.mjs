import { buildRandomTrainingScenarioPrompt } from "../prompts.mjs";
import { isDemoMode, requestJsonFromAI } from "../openaiClient.mjs";

const randomValues = new Set(["", "随机"]);
const categories = ["宿舍卫生", "情侣冷战", "朋友借钱不还", "小组作业", "商家扯皮", "职场甩锅", "家庭催婚", "网友阴阳怪气"];
const difficulties = ["青铜", "白银", "黄金", "王者"];
const opponentTypes = ["讲道理型", "嘴硬型", "阴阳怪气型", "偷换概念型", "情绪勒索型"];
const unclearBFaultPattern =
  /可能|怀疑|似乎|也许|双方说法不一|责任不明|无法确认|不知道是不是|各执一词|责任不清|无法判断|不能确定|说不清|不确定|也可能|运输|误会|使用不当|发货前正常|测试正常|声称.*没问题|声称.*正常/;
const explicitBFaultPattern =
  /明知|故意|隐瞒|没(?:有)?按|没(?:有)?(?:提前|完成|告知|说明|提交|处理|兑现|履行|正面|回应|发送|归还)|未(?:按|提前|完成|告知|说明|提交|处理|兑现|履行|发送|归还)|擅自|甩锅|拖延|拒不|借了.*不还|收了.*没|迟到|放鸽子|漏发|弄丢|损坏|占用|欺骗|少发|错发|反复|连续|未经同意|承诺.*(?:没|未|不)|答应.*(?:忘|没|未|不)|忘了|忘记|推给|反怪|嘲讽|小题大做|弄坏|不说|写.*全正常|功能全正常|攻击动机|扣帽子|暗讽|起哄/;
const unresolvedResponsibilityPattern =
  /发货前.*正常|测试.*正常|提前.*发.*消息.*没看到|发过.*消息.*没看到|A\/B.*都没按|都没按.*排班|双方.*没按|双方.*都有责任|B.*完成了.*A.*不满意|只是.*A.*不满意|责任不明|无法确认|双方说法不一|各执一词/;
const serviceProviderPattern = /寄养店|宠物店|寄养|托管|代管|保管方|保管|寄存|修理店|维修店|修理|维修|洗护|护理|服务方|服务提供方|代养/;
const custodyDamagePattern =
  /在(?:角色A|A|店里|寄养店|宠物店|修理店|维修店|保管|代管|服务|寄养|托管|维修|修理|洗护|护理)(?:期间|时|后|里).*?(?:损坏|坏了|抓伤|受伤|跳蚤|生病|故障|破损|丢失|弄坏)|(?:寄养|托管|保管|维修|修理|服务|店里).*?(?:期间|后).*?(?:损坏|坏了|抓伤|受伤|跳蚤|生病|故障|破损|丢失|弄坏)|送来时好好的|交付时好好的|送修前正常|维修前正常|在A.*期间.*(?:坏|伤|跳蚤|丢)/;
const serviceDamageClaimPattern =
  /要求.*(?:角色B|B).*?(?:赔|支付|承担|医疗费|维修费|赔偿|费用|处理费)|(?:角色B|B).*?(?:支付|承担|赔偿).*?(?:医疗费|维修费|损害|损失|费用|处理费)/;
const priorHiddenFaultPattern =
  /(?:明知|事前|交付前|送来前|寄养前|送修前|提前|已有|原本|本来).*?(?:隐瞒|未告知|没告知|没有告知|抓伤|跳蚤|故障|损坏|坏了|病况|病情|瑕疵)|(?:隐瞒|未告知|没告知|没有告知).*?(?:事前|交付前|送来前|寄养前|送修前|已有|原本|本来|病况|瑕疵)/;
const invalidScenarioErrorCode = "INVALID_TRAINING_SCENARIO_FAULT";

export async function generateRandomTrainingScenario(input = {}) {
  const normalizedInput = normalizeScenarioInput(input);

  try {
    let lastScenario = null;
    let lastValidationError = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const attemptInput = {
        ...normalizedInput,
        creativitySeed: [normalizedInput.creativitySeed, `attempt_${attempt}_${Date.now()}`].filter(Boolean).join("_")
      };
      try {
        const result = await requestJsonFromAI({
          ...buildRandomTrainingScenarioPrompt(attemptInput),
          temperature: 0.98,
          maxCompletionTokens: 2000
        });
        const scenario = normalizeScenario(result?.scenario || result, attemptInput);
        lastScenario = scenario;
        if (!isScenarioTooSimilar(scenario, normalizedInput.previousScenario)) {
          return { source: "ai", scenario };
        }
        console.warn("[training/scenario/random] generated scenario too similar to previous, retrying", {
          attempt,
          previousTitle: normalizedInput.previousScenario?.title,
          newTitle: scenario.title
        });
      } catch (error) {
        if (!isInvalidScenarioFaultError(error)) throw error;
        lastValidationError = error;
        console.warn("[training/scenario/random] generated scenario has unclear roleB fault, retrying", {
          attempt,
          reason: error.message
        });
      }
    }
    if (lastValidationError) throw lastValidationError;
    const error = new Error(
      `AI 生成的新场景和上一局过于相似，请再点一次随机生成。上一局：${normalizedInput.previousScenario?.title || "未知"}；新局：${lastScenario?.title || "未知"}`
    );
    error.status = 502;
    throw error;
  } catch (error) {
    console.error("[training/scenario/random] AI client failed:", error);
    if (isDemoMode()) return { source: "fallback", scenario: mockGenerateRandomTrainingScenario(normalizedInput) };
    throw error;
  }
}

export async function generatePresetTrainingScenario(input = {}) {
  const normalizedInput = normalizeScenarioInput(input);

  try {
    let lastValidationError = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const result = await requestJsonFromAI({
          ...buildRandomTrainingScenarioPrompt({
            ...normalizedInput,
            creativitySeed: [normalizedInput.creativitySeed, `preset_attempt_${attempt}_${Date.now()}`].filter(Boolean).join("_")
          }),
          temperature: 0.45,
          maxCompletionTokens: 2000
        });

        return { source: "ai", scenario: normalizeScenario(result?.scenario || result, normalizedInput) };
      } catch (error) {
        if (!isInvalidScenarioFaultError(error)) throw error;
        lastValidationError = error;
        console.warn("[training/scenario/preset] generated scenario has unclear roleB fault, retrying", {
          attempt,
          reason: error.message
        });
      }
    }
    throw lastValidationError;
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
    scenario.realMainline = buildCustomRealMainline(normalizedInput, customDraft);
    scenario.mainline = buildCustomMainline(normalizedInput, customDraft);
    scenario.stanceJudgment = buildCustomStanceJudgment(normalizedInput, customDraft);
    scenario.traps = buildCustomTraps(normalizedInput, customDraft);
    scenario.trainingFocus =
      normalizedInput.playerRoleKey === "B"
        ? ["嘴硬顶住追问", "转移核心问题", "拖延承认和让步", "避免辱骂和恶意攻击"]
        : ["先抓具体行为", "点出影响", "提出下一步要求", "拒绝被贴情绪标签"];
    scenario.scoreFocus = {
      logic: "是否围绕自定义场景里的具体行为说话。",
      power:
        normalizedInput.playerRoleKey === "B"
          ? "理亏方是否能嘴硬抗压、拖住承认，而不是被有理方说服。"
          : "有理方是否短句有力，不被理亏方压住。",
      boundary: "是否明确说出不接受什么。",
      mainline: "是否持续围绕行为、影响和要求。",
      risk: "是否避免辱骂、威胁或扩大攻击面。"
    };
    scenario.suggestedFirstReplyHint =
      normalizedInput.playerRoleKey === "B"
        ? "理亏方先别承认核心问题，用理由、反问或转移话题顶住追问。"
        : "有理方先别解释自己是不是敏感，直接把问题拉回具体行为和要求。";
  }
  if (normalizedInput.userGoal) scenario.userGoal = normalizedInput.userGoal;
  if (!scenario.stanceJudgment) scenario.stanceJudgment = buildMockStanceJudgment(scenario);
  return normalizeScenario(scenario, normalizedInput);
}

export function normalizeScenarioInput(input = {}) {
  const scenarioMode = input.scenarioMode === "expand" ? "expand" : "random";
  const config = input.gameConfig && typeof input.gameConfig === "object" ? input.gameConfig : {};
  const sanitizedInput =
    scenarioMode === "random"
      ? {
          ...input,
          customScene: "",
          contextSummary: "",
          userMainline: "",
          userGoal: ""
        }
      : input;
  const sanitizedConfig =
    scenarioMode === "random"
      ? {
          ...config,
          scene: "",
          topic: "",
          contextSummary: "",
          userMainline: ""
        }
      : config;
  const gameConfig = normalizeGameConfig(sanitizedConfig, sanitizedInput);
  return {
    scenarioMode,
    category: normalizeOption(input.category, categories),
    difficulty: normalizeScenarioDifficulty(input.difficulty || sanitizedConfig.difficulty),
    opponentType: normalizeOption(input.opponentType, opponentTypes),
    customScene:
      scenarioMode === "expand" ? textOf(sanitizedInput.customScene) || textOf(sanitizedConfig.scene) || textOf(sanitizedConfig.topic) : "",
    userGoal:
      scenarioMode === "expand"
        ? textOf(sanitizedInput.userMainline) ||
          textOf(sanitizedConfig.userMainline) ||
          textOf(sanitizedInput.userGoal) ||
          gameConfig.trainingGoals.join("、")
        : gameConfig.trainingGoals.join("、"),
    gameConfig,
    scene: gameConfig.scene,
    roleA: gameConfig.roleA,
    roleB: gameConfig.roleB,
    playerRoleKey: gameConfig.playerRoleKey,
    aiRoleKey: gameConfig.aiRoleKey,
    playerRole: roleFromConfig(gameConfig, gameConfig.playerRoleKey),
    aiRole: roleFromConfig(gameConfig, gameConfig.aiRoleKey),
    aiDifficulty: textOf(input.aiDifficulty),
    toneStrength: textOf(input.toneStrength) || textOf(sanitizedConfig.toneStrength),
    contextSummary: scenarioMode === "expand" ? textOf(sanitizedInput.contextSummary) || textOf(sanitizedConfig.contextSummary) : "",
    userMainline: scenarioMode === "expand" ? textOf(sanitizedInput.userMainline) || textOf(sanitizedConfig.userMainline) : "",
    creativitySeed: textOf(input.creativitySeed),
    previousScenario: input.previousScenario && typeof input.previousScenario === "object" ? input.previousScenario : null,
    previousScenarioSummary: textOf(input.previousScenarioSummary)
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
  const stanceJudgment = normalizeStanceJudgment(scenario.stanceJudgment);
  const category = textOf(scenario.category) || pickRequested(input.category, categories);
  const difficulty = textOf(scenario.difficulty) || pickRequested(input.difficulty, difficulties);
  const opponentType = textOf(opponentProfile.type) || pickRequested(input.opponentType, opponentTypes);
  const traps = arrayOfText(scenario.traps);
  const trainingFocus = arrayOfText(scenario.trainingFocus);
  const baseConfig = normalizeGameConfig(input.gameConfig || scenario, input);
  const roleA = normalizeRole(scenario.roleA, baseConfig.roleA);
  const roleB = normalizeRole(scenario.roleB, baseConfig.roleB);
  const playerRoleKey = normalizeRoleKey(input.playerRoleKey || baseConfig.playerRoleKey || scenario.playerRoleKey);
  const aiRoleKey = oppositeRoleKey(playerRoleKey);
  const playerRole = roleFromParts(roleA, roleB, playerRoleKey);
  const aiRole = roleFromParts(roleA, roleB, aiRoleKey);
  const useScenarioRoleSpecificText = playerRoleKey !== "B";
  const rawOpeningSpeaker = normalizeRoleKey(scenario.openingMessageSpeaker || aiRoleKey);
  const openingMessageSpeaker = rawOpeningSpeaker === aiRoleKey ? aiRoleKey : rawOpeningSpeaker;
  const scene = textOf(scenario.scene) || textOf(scenario.background) || input.scene || baseConfig.scene;
  const trainingGoals = arrayOfText(scenario.trainingGoals).length
    ? arrayOfText(scenario.trainingGoals)
    : input.gameConfig?.trainingGoals?.length
      ? input.gameConfig.trainingGoals
      : trainingFocus.length
        ? trainingFocus
        : arrayOfText(input.trainingGoals);

  const normalized = {
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
      textOf(scenario.background) || scene || "一次具体冲突已经发生，角色A提出要求，角色B试图辩解或转移重点。",
    opponentProfile: {
      type: opponentType,
      personality: textOf(opponentProfile.personality) || "会为自己辩解，也会试图转移重点。",
      tactics: arrayOfText(opponentProfile.tactics)
    },
    openingMessage:
      useScenarioRoleSpecificText && openingMessageSpeaker === aiRoleKey && textOf(scenario.openingMessage)
        ? textOf(scenario.openingMessage)
        : fallbackOpeningForPlayerRole(playerRoleKey, playerRole, aiRole),
    openingMessageSpeaker: aiRoleKey,
    userGoal: textOf(scenario.userGoal) || input.userGoal || playerRole.goal || "守住主线，清楚表达诉求和边界。",
    realMainline:
      textOf(scenario.realMainline) ||
      (playerRoleKey === "B"
        ? `${playerRole.name}要进入反派抗压模式：嘴硬、辩解、转移和拖延，尽量顶住${aiRole.name}的追问与说服。`
        : `${playerRole.name}不要证明自己有没有资格不舒服，要让${aiRole.name}正面回应具体问题。`),
    mainline: {
      fact: textOf(mainline.fact),
      impact: textOf(mainline.impact),
      request: textOf(mainline.request),
      boundary: textOf(mainline.boundary)
    },
    stanceJudgment,
    traps: useScenarioRoleSpecificText && traps.length ? traps : fallbackTrapsForPlayerRole(playerRoleKey, playerRole, aiRole, opponentType),
    trainingFocus:
      useScenarioRoleSpecificText && trainingFocus.length ? trainingFocus : fallbackTrainingFocusForPlayerRole(playerRoleKey, category, difficulty),
    scoreFocus: {
      logic:
        (useScenarioRoleSpecificText ? textOf(scoreFocus.logic) : "") ||
        (playerRoleKey === "B"
          ? `${playerRole.name}是否能拖住核心承认，并把问题转向别处。`
          : `${playerRole.name}是否围绕事实和责任说话，而不是被${aiRole.name}带去解释情绪。`),
      power:
        (useScenarioRoleSpecificText ? textOf(scoreFocus.power) : "") ||
        (playerRoleKey === "B"
          ? `${playerRole.name}是否能顶住${aiRole.name}的追问和劝说。`
          : `${playerRole.name}是否短句清楚、有压迫感，但不升级成人身攻击。`),
      boundary:
        (useScenarioRoleSpecificText ? textOf(scoreFocus.boundary) : "") ||
        (playerRoleKey === "B"
          ? `${playerRole.name}是否避免辱骂、威胁和人身攻击，同时继续嘴硬抗压。`
          : `${playerRole.name}是否明确说出不接受什么，以及下一步要求。`),
      mainline: (useScenarioRoleSpecificText ? textOf(scoreFocus.mainline) : "") || `${playerRole.name}是否持续围绕当前角色目标推进。`,
      risk: (useScenarioRoleSpecificText ? textOf(scoreFocus.risk) : "") || `${playerRole.name}是否避免辱骂、威胁、现实报复或过度扩大冲突。`
    },
    suggestedFirstReplyHint:
      (useScenarioRoleSpecificText ? textOf(scenario.suggestedFirstReplyHint) : "") ||
      (playerRoleKey === "B"
        ? `${playerRole.name}先别承认核心问题，用理由、反问或转移话题顶住${aiRole.name}。`
        : `${playerRole.name}先复述事实，再指出${aiRole.name}正在转移重点。`),
    createdAt: now
  };

  validateRoleBFault(normalized);
  return normalized;
}

function normalizeStanceJudgment(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    aJustification: textOf(source.aJustification),
    bFault: textOf(source.bFault),
    disputeFocus: textOf(source.disputeFocus),
    bExcuseSpace: textOf(source.bExcuseSpace),
    aPressurePoint: textOf(source.aPressurePoint)
  };
}

export function validateRoleBFault(scenario = {}) {
  const stance = scenario.stanceJudgment || {};
  const bFault = textOf(stance.bFault);
  const combinedFaultText = [
    scenario.scene,
    scenario.background,
    scenario.roleA?.name,
    scenario.roleA?.description,
    scenario.roleA?.goal,
    scenario.roleB?.description,
    scenario.roleB?.goal,
    bFault,
    scenario.mainline?.fact,
    scenario.mainline?.request,
    scenario.realMainline
  ]
    .map(textOf)
    .filter(Boolean)
    .join(" ");
  const problems = [];

  if (!textOf(stance.aJustification)) problems.push("缺少 stanceJudgment.aJustification");
  if (!bFault) problems.push("缺少 stanceJudgment.bFault");
  if (!textOf(stance.disputeFocus)) problems.push("缺少 stanceJudgment.disputeFocus");
  if (!textOf(stance.bExcuseSpace)) problems.push("缺少 stanceJudgment.bExcuseSpace");
  if (!textOf(stance.aPressurePoint)) problems.push("缺少 stanceJudgment.aPressurePoint");
  if (bFault && unclearBFaultPattern.test(bFault)) problems.push("stanceJudgment.bFault 包含责任不明或猜测表述");
  if (bFault && !explicitBFaultPattern.test(bFault)) problems.push("stanceJudgment.bFault 没有写出角色B的明确过错");
  if (!explicitBFaultPattern.test(combinedFaultText)) problems.push("场景文本没有体现角色B已发生且明确的过错");
  if (unresolvedResponsibilityPattern.test(combinedFaultText)) problems.push("场景含有责任不明或双方都有责任的设定");
  if (looksLikeInvalidServiceCustodyDispute(combinedFaultText, bFault)) {
    problems.push("服务/保管期间发生的损害责任不明确，不能直接固定角色B理亏");
  }
  if (looksLikeUnclearDispute(combinedFaultText) && !hasStrongFaultAnchor(bFault)) {
    problems.push("场景像责任不明的普通纠纷，不适合固定角色B为理亏方");
  }

  if (!problems.length) return true;
  const error = new Error(`生成场景不合格：${problems.join("；")}`);
  error.status = 502;
  error.code = invalidScenarioErrorCode;
  throw error;
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
      trainingFocus: ["有理方不自证是不是洁癖", "把话题拉回轮值事实", "提出清楚可执行的要求"],
      scoreFocus: {
        logic: "有理方是否抓住轮值事实，而不是争谁更爱干净。",
        power: "有理方是否能稳住气势，不被反讽压回去。",
        boundary: "有理方是否明确拒绝被贴上洁癖、针对人的标签。",
        mainline: "有理方是否持续围绕共同规则被破坏。",
        risk: "有理方是否避免羞辱室友生活习惯或升级成宿舍对立。"
      },
      suggestedFirstReplyHint: "有理方先接住室友的阴阳怪气，再把问题拉回“三次轮值没做”。"
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
      realMainline: "队友已确认承担任务，现在临近截止失约，需要补救方案，而不是追究有理方是否完美管理。",
      mainline: {
        fact: "队友上周确认负责数据整理，截止前一晚仍未完成。",
        impact: "展示材料缺关键部分，其他成员要承担额外风险和时间成本。",
        request: "队友今晚先交出能完成的基础整理，并同步不会的部分。",
        boundary: "不能把已确认任务的失约转成组长一个人的责任。"
      },
      traps: ["要求角色A自证是不是合格组长", "把不会做当作免责任理由", "用小组分数逼角色A兜底"],
      trainingFocus: ["拒绝管理责任偷换", "要求具体补救动作", "保留分工证据"],
      scoreFocus: {
        logic: "有理方是否区分组长协调和成员承诺的责任。",
        power: "有理方是否能提出立即行动要求。",
        boundary: "有理方是否拒绝无条件熬夜兜底。",
        mainline: "有理方是否围绕已承诺任务未完成。",
        risk: "有理方是否避免直接羞辱能力，导致协作彻底破裂。"
      },
      suggestedFirstReplyHint: "有理方不要先解释有没有提醒，先锁定队友确认过任务这个事实。"
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
        logic: "有理方是否用时间线证明责任归属。",
        power: "有理方是否能在职场语境里清楚但不失控。",
        boundary: "有理方是否拒绝背锅。",
        mainline: "有理方是否围绕数据已交付和邮件未发送。",
        risk: "有理方是否避免情绪化指责影响职业形象。"
      },
      suggestedFirstReplyHint: "有理方先报时间点和交付位置，再要求补充澄清。"
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
        boundary: "朋友不要再把正常还钱要求说成有理方不重视朋友。"
      },
      traps: ["用友情压有理方闭嘴", "让有理方同情朋友的压力", "把催款说成有理方人品现实"],
      trainingFocus: ["有理方不为合理催款道歉", "要求具体时间", "区分共情和放弃边界"],
      scoreFocus: {
        logic: "有理方是否区分朋友关系和借款承诺。",
        power: "有理方是否能坚定要求还款计划。",
        boundary: "有理方是否拒绝被友情绑架。",
        mainline: "有理方是否围绕承诺到期未还。",
        risk: "有理方是否避免羞辱经济状况或公开威胁。"
      },
      suggestedFirstReplyHint: "有理方可以承认朋友压力大，但不要让压力替代还款计划。"
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
        boundary: "如果网友只做人身化暗讽，有理方不会继续陪聊。"
      },
      traps: ["让有理方证明自己不优越", "把内容讨论变成表达方式审判", "诱导有理方情绪化回骂"],
      trainingFocus: ["短句压住阴阳怪气", "要求网友回到观点", "及时设置停止对话边界"],
      scoreFocus: {
        logic: "有理方是否区分观点和人格动机。",
        power: "有理方是否能短促有力地反击。",
        boundary: "有理方是否说明不接受暗讽式讨论。",
        mainline: "有理方是否持续要求回应具体内容。",
        risk: "有理方是否避免互喷和扩大攻击面。"
      },
      suggestedFirstReplyHint: "有理方不要解释为什么写长，直接要求网友回应哪一句观点。"
    }
  ];
}

function normalizeOption(value, allowed) {
  const text = textOf(value);
  if (!text || text === "随机") return "随机";
  return allowed.includes(text) ? text : "随机";
}

function isInvalidScenarioFaultError(error) {
  return error?.code === invalidScenarioErrorCode;
}

function looksLikeUnclearDispute(text) {
  return /责任不明|无法确认|双方说法不一|各执一词|发货前.*正常|测试.*正常|A.*没看到|没看到.*消息|A.*不满意|只是.*不满意|都没按|双方.*没按|运输|误会|使用不当|送来时好好的|交付时好好的|服务期间|保管期间|寄养期间|维修期间/.test(
    String(text || "")
  );
}

function looksLikeInvalidServiceCustodyDispute(text, bFault = "") {
  const value = String(text || "");
  if (!serviceProviderPattern.test(value)) return false;
  if (!custodyDamagePattern.test(value)) return false;
  if (!serviceDamageClaimPattern.test(value)) return false;
  return !priorHiddenFaultPattern.test(`${value} ${bFault}`);
}

function hasStrongFaultAnchor(text) {
  const value = String(text || "");
  return explicitBFaultPattern.test(value) && !unclearBFaultPattern.test(value);
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
    description: "有理方 / 提出要求的一方",
    goal: textOf(input.userGoal) || textOf(source.userGoal) || "让理亏方正面回应问题，并给出具体做法"
  });
  const roleB = normalizeRole(source.roleB, {
    name: textOf(source.aiIdentity) || textOf(input.aiIdentity) || inferOpponentName(source, input),
    description: "理亏方 / 辩解转移的一方",
    goal: "嘴硬、辩解、转移和拖延，尽量顶住有理方追问"
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
      "一次真实生活冲突已经发生，角色A提出要求，角色B正在辩解或转移重点。",
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
  if (input.aiRoleKey === "A") {
    const aiName = customDraft?.aiName || input.aiRole?.name || "角色A";
    const playerName = customDraft?.playerName || input.playerRole?.name || "角色B";
    return `${aiName}先开口：${playerName}，现在说的是${scene}这件事，你先正面回应，不要再把重点转开。`;
  }
  if (/阴阳/.test(type)) return `行，就你最有道理，${lead}${scene}都能被你说得这么严重。`;
  if (/偷换/.test(type)) return `你现在怪我也没用吧，${lead}${scene}难道你自己就一点问题没有？`;
  if (/情绪勒索/.test(type)) return `我都已经这样了，你还要拿${lead}${scene}一直逼我吗？`;
  if (/讲道理/.test(type)) return `${lead}${scene}这件事我不是不认，但你也不能只看你自己的角度。`;
  return `${lead}${scene}不能全怪我吧，你现在说得好像都是我的问题。`;
}

function buildCustomRealMainline(input, customDraft = null) {
  const concrete = customDraft || buildConcreteCustomScenario(input, {});
  if (input.playerRoleKey === "B") {
    return `${concrete.playerName}要进入反派抗压模式：嘴硬、辩解、转移和拖延，尽量顶住${concrete.aiName}的追问；不要辱骂、威胁或人身攻击。`;
  }
  return `${concrete.playerName}不要被${concrete.aiName}带去解释情绪，持续围绕“${concrete.fact}”和下一步要求。`;
}

function buildCustomMainline(input, customDraft = null) {
  const goal =
    input.userGoal ||
    (input.playerRoleKey === "B" ? "嘴硬、辩解、转移和拖延，尽量顶住有理方追问" : "让理亏方正面回应并给出具体做法");
  const concrete = customDraft || buildConcreteCustomScenario(input, {});
  return {
    fact: concrete.fact,
    impact: concrete.impact,
    request: goal,
    boundary:
      input.playerRoleKey === "B"
        ? `${concrete.playerName}不要用辱骂、威胁或人身攻击来代替嘴硬抗压。`
        : `${concrete.aiName}不要再用“${concrete.playerName}太敏感”“${concrete.playerName}想太多”来代替正面回应。`
  };
}

function buildCustomStanceJudgment(input, customDraft = null) {
  const concrete = customDraft || buildConcreteCustomScenario(input, {});
  return {
    aJustification: `${concrete.roleAName}有事实基础提出要求：${concrete.fact}`,
    bFault: `${concrete.detailFault || concrete.fact}，这是已发生且明确的过错。`,
    disputeFocus: `真正焦点是${concrete.roleBName}如何处理已经发生的过错，而不是${concrete.roleAName}的态度。`,
    bExcuseSpace: `${concrete.roleBName}可以辩称压力大、没注意或不是故意，但这些借口不能推翻核心过错。`,
    aPressurePoint: `${concrete.roleAName}应持续追问${concrete.roleBName}是否承认具体过错，以及准备怎么补救。`
  };
}

function buildMockStanceJudgment(scenario = {}) {
  const roleAName = scenario.roleA?.name || "角色A";
  const roleBName = scenario.roleB?.name || "角色B";
  const fact = [scenario.mainline?.fact, scenario.realMainline, scenario.background].map(textOf).filter(Boolean).join("，");
  return {
    aJustification: `${roleAName}的要求有事实基础：${fact}`,
    bFault: `${roleBName}${fact}，并在被指出后继续辩解或转移重点。`,
    disputeFocus: `真正焦点是${roleBName}已经发生的过错如何补救，而不是${roleAName}的态度。`,
    bExcuseSpace: `${roleBName}可以用没注意、压力大、不是故意等理由嘴硬，但这些理由不能推翻已发生的过错。`,
    aPressurePoint: `${roleAName}应抓住具体过错和补救动作追问。`
  };
}

function buildCustomTraps(input, customDraft = null) {
  const playerName = customDraft?.playerName || "角色A";
  const aiName = customDraft?.aiName || "角色B";
  if (input.playerRoleKey === "B") {
    return [
      `${aiName}追问${playerName}的具体责任，${playerName}不要用攻击或继续转移逃避`,
      `${aiName}要求立刻承认问题，${playerName}需要继续嘴硬并拆散责任`,
      `${aiName}指出${playerName}在转移重点，${playerName}要用反问、拖延或装委屈顶住`
    ];
  }
  const traps = [
    `${aiName}把具体行为说成${playerName}的情绪问题`,
    `${aiName}要求${playerName}自证是不是太计较`
  ];
  if (/阴阳/.test(input.opponentType)) traps.push("用反讽让有理方失控");
  if (/偷换/.test(input.opponentType)) traps.push("把责任偷换成有理方也有问题");
  if (/情绪勒索/.test(input.opponentType)) traps.push("用委屈压有理方放弃要求");
  return traps;
}

function isScenarioTooSimilar(scenario, previousScenario) {
  if (!scenario || !previousScenario) return false;
  const currentText = scenarioComparableText(scenario);
  const previousText = scenarioComparableText(previousScenario);
  if (!currentText || !previousText) return false;
  if (currentText.includes(previousText.slice(0, 80)) || previousText.includes(currentText.slice(0, 80))) return true;
  const bigramScore = jaccardSimilarity(charBigrams(currentText), charBigrams(previousText));
  const keywordScore = keywordOverlap(currentText, previousText);
  const domainScore = domainKeywordOverlap(currentText, previousText);
  return bigramScore >= 0.34 || keywordScore >= 0.42 || (domainScore >= 2 && bigramScore >= 0.18);
}

function scenarioComparableText(scenario) {
  return [scenario.title, scenario.scene, scenario.background, scenario.openingMessage]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, "")
    .slice(0, 900);
}

function charBigrams(text) {
  const clean = String(text || "").replace(/[，。！？、；：,.!?;:\s]/g, "");
  const grams = new Set();
  for (let index = 0; index < clean.length - 1; index += 1) {
    grams.add(clean.slice(index, index + 2));
  }
  return grams;
}

function jaccardSimilarity(a, b) {
  if (!a?.size || !b?.size) return 0;
  let intersection = 0;
  a.forEach((item) => {
    if (b.has(item)) intersection += 1;
  });
  return intersection / (a.size + b.size - intersection);
}

function keywordOverlap(a, b) {
  const ignored = new Set(["角色A", "角色B", "问题", "对方", "自己", "要求", "影响", "事情", "场景"]);
  const wordsA = meaningfulChunks(a).filter((item) => !ignored.has(item));
  const wordsB = new Set(meaningfulChunks(b).filter((item) => !ignored.has(item)));
  if (!wordsA.length || !wordsB.size) return 0;
  const hits = wordsA.filter((item) => wordsB.has(item)).length;
  return hits / Math.max(wordsA.length, wordsB.size);
}

function domainKeywordOverlap(a, b) {
  const domainKeywords = [
    "合租",
    "室友",
    "客厅",
    "快递",
    "纸箱",
    "垃圾",
    "宿舍",
    "噪音",
    "游戏",
    "剧本杀",
    "拼车",
    "迟到",
    "宠物",
    "寄养",
    "猫咪",
    "狗",
    "小组",
    "作业",
    "同事",
    "项目",
    "客服",
    "退款",
    "亲戚",
    "催婚",
    "社团",
    "婚礼"
  ];
  return domainKeywords.filter((keyword) => a.includes(keyword) && b.includes(keyword)).length;
}

function meaningfulChunks(text) {
  return Array.from(String(text || "").matchAll(/[\u4e00-\u9fa5]{2,6}|[a-zA-Z0-9]{3,}/g)).map((match) => match[0]);
}

function buildConcreteCustomScenario(input, scenario = {}) {
  const playerName = input.playerRole?.name || input.roleA?.name || "角色A";
  const aiName = input.aiRole?.name || input.roleB?.name || inferOpponentName(scenario, input);
  const roleAName = input.roleA?.name || "角色A";
  const roleBName = input.roleB?.name || inferOpponentName(scenario, input);
  const shortEvent = input.customScene.replace(/[。！？!?，,；;：:]+$/g, "");
  const detail = inferConcreteCustomDetail(shortEvent, { playerName: roleAName, aiName: roleBName });
  const goal =
    input.userGoal ||
    (input.playerRoleKey === "B"
      ? `${playerName}嘴硬、辩解、转移和拖延，尽量顶住追问`
      : `${playerName}要求${aiName}正面回应并给出具体做法`);

  return {
    title: `${detail.titlePrefix}${shortEvent}`,
    shortEvent,
    playerName,
    aiName,
    roleAName,
    roleBName,
    openingLead: detail.openingLead,
    scene: `${detail.place}，${roleAName}因为“${shortEvent}”和${roleBName}起了冲突。${detail.trigger}`,
    background: `${detail.time}，${detail.place}，${detail.trigger}${detail.history}${roleAName}刚把问题摊开，${roleBName}没有正面处理，反而准备把重点转成${roleAName}的态度。${playerName}的训练目标是：${goal}。`,
    fact: `${roleBName}${detail.factAction || `涉及“${shortEvent}”的行为`}，${roleAName}已经明确指出这件事需要处理。`,
    impact: `${detail.impact}${roleAName}如果顺着解释情绪，问题会继续被拖过去。`
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

function fallbackOpeningForPlayerRole(playerRoleKey, playerRole, aiRole) {
  if (playerRoleKey === "B") {
    return `${aiRole.name}先开口：${playerRole.name}，现在说的是具体问题，你先正面回应，不要再把责任推开。`;
  }
  return "你现在这样说就很没必要，本来不是多大的事。";
}

function fallbackTrapsForPlayerRole(playerRoleKey, playerRole, aiRole, opponentType) {
  if (playerRoleKey === "B") {
    return [
      `${aiRole.name}追问${playerRole.name}的具体责任，${playerRole.name}不要用攻击或继续转移逃避`,
      `${aiRole.name}要求立刻承认问题，${playerRole.name}需要继续嘴硬并拆散责任`,
      `${aiRole.name}指出${playerRole.name}在转移重点，${playerRole.name}要用反问、拖延或装委屈顶住`
    ];
  }
  return fallbackTraps(opponentType);
}

function fallbackTrainingFocus(category, difficulty) {
  return [
    `围绕${category || "当前场景"}里的具体事实发言`,
    "识别角色B转移重点的话术",
    "提出清楚、可执行的下一步要求",
    difficulty === "王者" ? "在高压话术下保持主线不散" : "有理方不为了缓和气氛放弃边界"
  ];
}

function fallbackTrainingFocusForPlayerRole(playerRoleKey, category, difficulty) {
  if (playerRoleKey === "B") {
    return [
      `围绕${category || "当前场景"}嘴硬辩解，不直接承认核心问题`,
      "转移重点，把责任拆成双方都有",
      "拖延表态，顶住有理方追问",
      difficulty === "王者" ? "压力测试模式：在有理方追问下保持克制" : "不靠辱骂或恶意攻击争取空间"
    ];
  }
  return fallbackTrainingFocus(category, difficulty);
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
