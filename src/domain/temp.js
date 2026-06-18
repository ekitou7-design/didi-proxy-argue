export function normalizeTempScenario(scenario, temp) {
  const mainline = scenario?.mainline && typeof scenario.mainline === "object" ? scenario.mainline : {};
  return {
    title: String(scenario?.title || "").trim(),
    background: String(scenario?.background || "").trim(),
    opponentPersona: String(scenario?.opponentPersona || temp.who || "").trim(),
    openingMessage: String(scenario?.openingMessage || "").trim(),
    mainline: {
      fact: String(mainline.fact || "").trim(),
      impact: String(mainline.impact || "").trim(),
      request: String(mainline.request || "").trim(),
      boundary: String(mainline.boundary || "").trim()
    },
    userGoal: String(scenario?.userGoal || temp.goal || "").trim(),
    tone: String(scenario?.tone || temp.tone || "").trim()
  };
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
