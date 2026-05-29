export function normalizeTempScenario(scenario, temp) {
  const mainline = scenario?.mainline && typeof scenario.mainline === "object" ? scenario.mainline : {};
  const fallback = buildLocalTempScenario(temp);
  return {
    title: String(scenario?.title || fallback.title || "").trim(),
    background: String(scenario?.background || fallback.background || "").trim(),
    opponentPersona: String(scenario?.opponentPersona || fallback.opponentPersona || "").trim(),
    openingMessage: String(scenario?.openingMessage || fallback.openingMessage || "").trim(),
    mainline: {
      fact: String(mainline.fact || fallback.mainline.fact || "").trim(),
      impact: String(mainline.impact || fallback.mainline.impact || "").trim(),
      request: String(mainline.request || fallback.mainline.request || "").trim(),
      boundary: String(mainline.boundary || fallback.mainline.boundary || "").trim()
    },
    userGoal: String(scenario?.userGoal || fallback.userGoal || "").trim(),
    tone: String(scenario?.tone || temp.tone || "").trim()
  };
}

export function buildLocalTempScenario(temp) {
  const refreshCount = Number(temp.scenarioRefreshCount || 0);
  const picked = pickLocalScenario(temp, refreshCount);
  const who = temp.who || picked.who;
  const context = temp.context || picked.context;
  const goal = temp.goal || picked.goal;
  const suppliedLatest = temp.latest && temp.latest !== temp.generatedScenario?.openingMessage ? temp.latest : "";
  return {
    title: picked.title || `${who}临时冲突`,
    background: context,
    opponentPersona: who,
    openingMessage: suppliedLatest || picked.openingMessage || makeTempOpening(who, context),
    mainline: {
      fact: context,
      impact: picked.impact || "对方的说法正在把具体问题转成你的态度或情绪。",
      request: `你的目标是：${goal}`,
      boundary: picked.boundary || "不要接受辱骂、人身攻击或继续转移重点。"
    },
    userGoal: goal,
    tone: temp.tone || "中"
  };
}

function pickLocalScenario(temp, refreshCount) {
  const filledText = `${temp.who || ""} ${temp.context || ""} ${temp.latest || ""} ${temp.goal || ""}`;
  const matched = localScenarioPool.filter((scenario) => scenario.keywords.some((keyword) => filledText.includes(keyword)));
  const hasUserLatest = temp.latest && temp.latest !== temp.generatedScenario?.openingMessage;
  const pool = hasUserLatest && matched.length ? matched : localScenarioPool;
  const index = Math.max(0, Math.abs(refreshCount) - 1);
  return pool[index % pool.length];
}

const localScenarioPool = [
  {
    keywords: ["客服", "商家", "退款", "售后", "订单"],
    title: "客服用规则拒绝处理售后",
    who: "客服",
    context: "商品或服务出了问题，客服一直强调规则，不给明确处理方案。",
    goal: "让对方给出处理依据和可执行方案",
    openingMessage: "这个不符合我们的处理规则，你自己下单前也应该看清楚。",
    impact: "对方把处理责任推回给用户，避开了具体损失和方案。",
    boundary: "要求对方说清依据、责任和下一步处理，不接受空泛甩锅。"
  },
  {
    keywords: ["对象", "男朋友", "女朋友", "恋爱", "约", "冷战"],
    title: "对象临时改约还说你太敏感",
    who: "对象",
    context: "原本约好的安排被临时改变，你表达不满后，对方把重点转成你太敏感。",
    goal: "让对方承认改约造成影响，并给出解释和补救",
    openingMessage: "你怎么又开始了？这点小事也要说这么严重吗？",
    impact: "对方把约定被打破的问题偷换成你的情绪问题。",
    boundary: "不接受用情绪标签盖过约定和尊重问题。"
  },
  {
    keywords: ["室友", "宿舍", "卫生", "噪音", "合租"],
    title: "室友破坏公共规则还倒打一耙",
    who: "室友",
    context: "公共空间规则没有被执行，你提醒后，对方说你管太多、事太多。",
    goal: "让对方回到公共规则，承担自己该做的部分",
    openingMessage: "你别说得好像自己多守规矩一样，宿舍又不是你一个人的。",
    impact: "对方在翻旧账和相互抵消责任，试图逃开本次具体问题。",
    boundary: "只谈这一次具体行为，不接受互相翻旧账。"
  },
  {
    keywords: ["同事", "工作", "项目", "老板", "组员"],
    title: "同事甩锅还反说你要求高",
    who: "同事",
    context: "工作分工或交付出了问题，对方没有承担责任，反过来说你要求太高。",
    goal: "讲清分工责任，要求对方补上缺口",
    openingMessage: "这也不能全怪我吧，你要求这么高，那你来做不是更快吗？",
    impact: "对方把交付问题转成你的标准问题，避开了自己的责任。",
    boundary: "不替对方承担责任，也不接受把问题推给你的标准。"
  },
  {
    keywords: ["网友", "评论", "群", "阴阳", "帖子"],
    title: "网友阴阳怪气转移讨论重点",
    who: "网友",
    context: "你认真表达观点后，对方不回应内容，只用阴阳怪气和标签攻击带偏话题。",
    goal: "逼对方回到具体观点，不接人身标签",
    openingMessage: "不会吧，这么认真啊？小作文写得还挺努力。",
    impact: "对方没有回应内容，而是试图用嘲讽让你自证或退让。",
    boundary: "只接具体观点，不接嘲讽和人身标签。"
  }
];

export function makeTempOpening(who, context) {
  if (/客服|商家|售后|退款/.test(`${who} ${context}`)) return "这个不是我们的问题，你自己下单前也应该看清楚规则。";
  if (/对象|男朋友|女朋友|恋爱|约/.test(`${who} ${context}`)) return "你怎么又开始了？这点小事也要说这么严重吗？";
  if (/室友|宿舍|卫生/.test(`${who} ${context}`)) return "你别说得好像自己多守规矩一样，宿舍又不是你一个人的。";
  if (/同事|工作|项目/.test(`${who} ${context}`)) return "这也不能全怪我吧，你要求这么高，那你来做不是更快吗？";
  return "你现在这样说就很没必要，本来没多大的事。";
}

export function uniqueReplyOptions(replies) {
  const seen = new Set();
  return replies.filter((reply) => {
    const text = String(reply.text || "").trim();
    if (!text || seen.has(text)) return false;
    seen.add(text);
    return true;
  });
}
