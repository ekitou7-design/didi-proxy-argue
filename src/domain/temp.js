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
  const who = temp.who || "临时对手";
  const context = temp.context || "发生了一次具体冲突，对方正在回避责任。";
  const goal = temp.goal || "讲清楚";
  return {
    title: `${who}临时冲突`,
    background: context,
    opponentPersona: who,
    openingMessage: temp.latest || makeTempOpening(who, context),
    mainline: {
      fact: context,
      impact: "对方的说法正在把具体问题转成你的态度或情绪。",
      request: `你的目标是：${goal}`,
      boundary: "不要接受辱骂、人身攻击或继续转移重点。"
    },
    userGoal: goal,
    tone: temp.tone || "中"
  };
}

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
