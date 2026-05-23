import { difficultyOptions } from "../data/mockData.js";

const randomCategories = ["随机", "宿舍卫生", "情侣冷战", "朋友借钱不还", "小组作业", "商家扯皮", "职场甩锅", "家庭催婚", "网友阴阳怪气"];
const randomDifficulties = ["随机", "青铜", "白银", "黄金", "王者"];
const opponentTypes = ["随机", "讲道理型", "嘴硬型", "阴阳怪气型", "偷换概念型", "情绪勒索型"];

export default function TrainingPage(session) {
  return `
    <div class="page realtime-chat-page training-chat-page">
      ${TrainingSettings(session)}
      ${TrainingChatPanel(session)}
      ${TrainingInputBar(session)}
    </div>
  `;
}

function TrainingSettings(session) {
  const scenario = session.generatedScenario;
  return `
    <section class="realtime-settings-card training-settings-card">
      <div class="settings-title-row training-random-head">
        <div>
          <span class="persona-kicker">AI 随机场景</span>
          <h2>${escapeHtml(scenario?.title || session.scene || "随机场景挑战")}</h2>
          <p>${escapeHtml(scenario?.background || "选择一个场景和对手类型，开始练习不被带偏。")}</p>
        </div>
        <button class="primary-button random-scenario-button" data-action="generate-random-training-scenario" ${session.scenarioStatus === "loading" ? "disabled" : ""}>
          ${session.scenarioStatus === "loading" ? "生成中..." : session.generatedScenario ? "换一个场景" : "AI 随机生成"}
        </button>
      </div>
      ${session.scenarioMessage ? `<p class="section-note compact-status-note">${escapeHtml(session.scenarioMessage)}</p>` : ""}
      <details class="top-settings-detail compact-training-options">
        <summary>细调场景和对手</summary>
        <div class="settings-grid">
          ${SelectField("场景类型", "training.randomScenarioForm.category", randomCategories, session.randomScenarioForm?.category)}
          ${SelectField("难度", "training.randomScenarioForm.difficulty", randomDifficulties, session.randomScenarioForm?.difficulty)}
          ${SelectField("对手人设", "training.randomScenarioForm.opponentType", opponentTypes, session.randomScenarioForm?.opponentType)}
          ${SelectField("训练强度", "training.difficulty", difficultyOptions, session.difficulty)}
          ${SmallField("前情提要", "training.scene", session.scene, "也可以自己输入想练的场景。", "wide")}
          ${SmallField("我想练什么效果", "training.randomScenarioForm.userGoal", session.randomScenarioForm?.userGoal, "例如：不被带偏、强硬拒绝、表达边界", "wide")}
        </div>
      </details>
    </section>
  `;
}

function TrainingChatPanel(session) {
  const visibleFeedbacks = [...session.feedbacks];
  const opponent = session.opponent || session.generatedScenario?.openingMessage || "选好场景后，系统会扮演对方开第一句。";
  return `
    <section class="realtime-chat-panel training-dialog-panel" aria-label="吵架训练对话">
      <div class="persona-chat-scroll realtime-chat-scroll">
        <article class="persona-bubble from-user">
          <span>系统扮演对方</span>
          <p>${escapeHtml(opponent)}</p>
        </article>
        ${visibleFeedbacks.map(FeedbackRound).join("")}
      </div>
    </section>
  `;
}

function TrainingInputBar(session) {
  if (session.step !== "chat") {
    return `
      <section class="realtime-input-bar training-start-bar">
        <p>${escapeHtml(session.generatedScenario?.suggestedFirstReplyHint || "准备好后开始这一局，对方会先出招。")}</p>
        <button class="primary-button" data-action="start-training-chat">${session.generatedScenario ? "开始这一局" : "开始挑战"}</button>
      </section>
    `;
  }

  return `
    <section class="realtime-input-bar">
      <textarea data-session-input="training" placeholder="输入你的本轮回复">${escapeHtml(session.input)}</textarea>
      <button class="primary-button" data-action="training-submit" ${session.isSubmitting ? "disabled" : ""}>
        ${session.isSubmitting ? "正在评分..." : "提交回复"}
      </button>
    </section>
  `;
}

function FeedbackRound(item) {
  return `
    <article class="realtime-round">
      <div class="persona-bubble from-proxy">
        <span>你</span>
        <p>${escapeHtml(item.userReply)}</p>
      </div>
      <details class="round-more">
        <summary>看评分和优化</summary>
        <div class="score-row">
          <span>胜率</span>
          <div class="score-track"><i style="width:${Number(item.score || 0)}%"></i></div>
          <b>${Number(item.score || 0)}</b>
        </div>
        ${Block("做得好的地方", item.strengths)}
        ${Block("容易被带偏的点", item.problems)}
        ${Block("更稳的说法", item.optimized)}
      </details>
      <div class="persona-bubble from-user">
        <span>系统扮演对方</span>
        <p>${escapeHtml(item.nextOpponent)}</p>
      </div>
    </article>
  `;
}

function Block(title, text) {
  return `
    <div class="temp-result-block">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
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
