import { difficultyOptions } from "../data/mockData.js";

const randomCategories = ["随机", "宿舍卫生", "情侣冷战", "朋友借钱不还", "小组作业", "商家扯皮", "职场甩锅", "家庭催婚", "网友阴阳怪气"];
const randomDifficulties = ["随机", "青铜", "白银", "黄金", "王者"];
const opponentTypes = ["随机", "讲道理型", "嘴硬型", "阴阳怪气型", "偷换概念型", "情绪勒索型"];

export default function TrainingPage(session) {
  if (session.gameState === "finished") return TrainingFinishedPage(session);
  if (session.gameState === "playing") return TrainingPlayingPage(session);
  return TrainingIdlePage(session);
}

function TrainingIdlePage(session) {
  const scenario = session.generatedScenario;
  return `
    <div class="page training-game-page training-idle-page">
      <section class="realtime-settings-card training-settings-card training-setup-card">
        <div class="settings-title-row training-random-head">
          <div>
            <span class="persona-kicker">一局吵架训练</span>
            <h2>${escapeHtml(scenario?.title || session.scene || "随机场景挑战")}</h2>
            <p>${escapeHtml(scenario?.background || "选场景、难度和目标，然后开始一局 5 回合训练。")}</p>
          </div>
          <button class="primary-button random-scenario-button" data-action="generate-random-training-scenario" ${session.scenarioStatus === "loading" ? "disabled" : ""}>
            ${session.scenarioStatus === "loading" ? "生成中..." : scenario ? "换一个场景" : "AI 随机生成"}
          </button>
        </div>
        ${session.scenarioMessage ? `<p class="section-note compact-status-note">${escapeHtml(session.scenarioMessage)}</p>` : ""}
        <div class="settings-grid training-setup-grid">
          ${SelectField("场景类型", "training.randomScenarioForm.category", randomCategories, session.randomScenarioForm?.category)}
          ${SelectField("难度", "training.randomScenarioForm.difficulty", randomDifficulties, session.randomScenarioForm?.difficulty)}
          ${SelectField("对手人设", "training.randomScenarioForm.opponentType", opponentTypes, session.randomScenarioForm?.opponentType)}
          ${SelectField("训练强度", "training.difficulty", difficultyOptions, session.difficulty)}
          ${SmallField("前情提要", "training.scene", session.scene, "也可以自己输入想练的场景。", "wide")}
          ${SmallField("训练目标", "training.goal", scenario?.userGoal || session.goal, "例如：不被带偏、强硬拒绝、表达边界", "wide")}
        </div>
        <button class="secondary-button warm compact-full-button" data-action="confirm-training-scenario" ${session.scenarioStatus === "loading" ? "disabled" : ""}>
          ${session.scenarioStatus === "loading" ? "确认中..." : "确认场景"}
        </button>
      </section>
      <section class="training-start-panel">
        <p>${escapeHtml(scenario?.suggestedFirstReplyHint || "调整场景后先点确认场景，再开始训练。")}</p>
        <button class="primary-button" data-action="start-training-game" ${scenario ? "" : "disabled"}>开始训练</button>
      </section>
    </div>
  `;
}

function TrainingPlayingPage(session) {
  return `
    <div class="page realtime-chat-page training-chat-page">
      ${TrainingGameHud(session)}
      ${TrainingChatPanel(session)}
      ${TrainingInputBar(session)}
    </div>
  `;
}

function TrainingGameHud(session) {
  const scenario = session.generatedScenario;
  const score = clampScore(session.persuasionScore);
  return `
    <section class="realtime-settings-card training-settings-card training-hud">
      <div class="training-hud-head">
        <div>
          <span class="persona-kicker">训练中</span>
          <h2>${escapeHtml(scenario?.title || session.scene || "吵架训练")}</h2>
          <p>${escapeHtml(scenario?.userGoal || session.goal || "守住主线，不被带偏")}</p>
        </div>
        <button class="tiny-button" data-action="finish-training-game" ${session.isSubmitting ? "disabled" : ""}>结束本轮</button>
      </div>
      <div class="training-progress-meta">
        <span>第 ${escapeHtml(session.round || 1)} / ${escapeHtml(session.maxRounds || 5)} 回合</span>
        <b>对方松动值：${score}%</b>
      </div>
      <div class="training-persuasion-track"><i style="width:${score}%"></i></div>
      ${session.scenarioMessage ? `<p class="section-note compact-status-note">${escapeHtml(session.scenarioMessage)}</p>` : ""}
    </section>
  `;
}

function TrainingChatPanel(session) {
  const messages = session.messages?.length
    ? session.messages
    : [{ role: "assistant", content: session.opponent || session.generatedScenario?.openingMessage || "开始后，对方会先出招。" }];
  return `
    <section class="realtime-chat-panel training-dialog-panel" aria-label="吵架训练对话">
      <div class="persona-chat-scroll realtime-chat-scroll training-chat-scroll">
        ${messages.map((message, index) => MessageBubble(message, session.feedbacks, index)).join("")}
      </div>
    </section>
  `;
}

function MessageBubble(message, feedbacks, index) {
  const isUser = message.role === "user";
  const assistantIndex = Math.floor(index / 2) - 1;
  const feedback = !isUser && assistantIndex >= 0 ? feedbacks[assistantIndex] : null;
  return `
    <article class="persona-bubble ${isUser ? "from-proxy" : "from-user"}">
      <span>${isUser ? "你" : "系统扮演对方"}</span>
      <p>${escapeHtml(message.content)}</p>
      ${feedback ? RoundFeedback(feedback) : ""}
    </article>
  `;
}

function RoundFeedback(item) {
  const delta = Number(item.persuasionDelta || 0);
  return `
    <div class="training-round-feedback">
      <b>本轮 ${delta >= 0 ? `+${delta}` : delta}</b>
      <span>${escapeHtml(item.feedback || "本轮已记录。")}</span>
    </div>
  `;
}

function TrainingInputBar(session) {
  return `
    <section class="realtime-input-bar training-input-boundary">
      <textarea data-session-input="training" placeholder="输入你的本轮回复">${escapeHtml(session.input)}</textarea>
      <button class="primary-button" data-action="training-submit" ${session.isSubmitting ? "disabled" : ""}>
        ${session.isSubmitting ? "判断中..." : "发送"}
      </button>
    </section>
  `;
}

function TrainingFinishedPage(session) {
  const review = session.review || {};
  const result = review.result || session.result || "draw";
  return `
    <div class="page training-game-page training-finished-page">
      <button class="tiny-button training-back-button" data-action="reset-training-game">返回训练设置</button>
      <section class="training-review-card result-${escapeAttr(result)}">
        <span class="persona-kicker">本轮结束</span>
        <h2>${escapeHtml(resultTitle(result))}</h2>
        <div class="training-progress-meta">
          <span>最终说服度</span>
          <b>${clampScore(review.persuasionScore ?? session.persuasionScore)} / 100</b>
        </div>
        <div class="training-persuasion-track"><i style="width:${clampScore(review.persuasionScore ?? session.persuasionScore)}%"></i></div>
        <p>${escapeHtml(review.summary || "这一局结束了。")}</p>
      </section>

      <section class="training-review-detail">
        ${ReviewBlock("关键胜负点", review.keyWinningPoint)}
        ${ReviewList("做得好的地方", review.goodPoints)}
        ${ReviewList("问题", review.problems)}
        ${ReviewBlock("更好的回复", review.betterReply)}
        ${ReviewBlock("下一轮建议", review.nextAdvice)}
      </section>

      <section class="training-review-actions">
        <button class="primary-button" data-action="restart-training-game">再来一局</button>
        <button class="secondary-button warm" data-action="reset-training-game">换个场景</button>
      </section>
    </div>
  `;
}

function ReviewBlock(title, text) {
  if (!text) return "";
  return `
    <div class="temp-result-block">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
}

function ReviewList(title, items = []) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return "";
  return `
    <div class="temp-result-block">
      <h3>${escapeHtml(title)}</h3>
      <p>${list.map(escapeHtml).join(" / ")}</p>
    </div>
  `;
}

function SelectField(label, path, options, active) {
  return `
    <label class="compact-field">
      <span>${escapeHtml(label)}</span>
      <select class="select-field compact-select" data-setup-input="${path}">
        ${options.map((item) => `<option value="${escapeAttr(item)}" ${item === active ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
      </select>
    </label>
  `;
}

function SmallField(label, path, value, placeholder, className = "") {
  return `
    <label class="compact-field ${className}">
      <span>${escapeHtml(label)}</span>
      <textarea data-setup-input="${path}" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value)}</textarea>
    </label>
  `;
}

function resultTitle(result) {
  if (result === "win") return "你吵赢了";
  if (result === "lose") return "被带偏了";
  return "打平";
}

function clampScore(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
