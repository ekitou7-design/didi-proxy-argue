import { difficultyOptions } from "../data/mockData.js";

const trainingCards = [
  { title: "今日训练卡片", desc: "今日目标：不解释自己配不配生气，只抓事实和诉求。" },
  { title: "随机场景挑战", desc: "系统随机扮演难缠对手，训练临场反应。" },
  { title: "主线锁定训练", desc: "对方跑题一次，你就把他拖回案发现场一次。" },
  { title: "气势稳定训练", desc: "有压迫感，但不失控、不脏嘴。" },
  { title: "阴阳怪气训练", desc: "练习轻刺反击，点到为止但很难忘。" }
];

const randomCategories = ["随机", "宿舍卫生", "情侣冷战", "朋友借钱不还", "小组作业", "商家扯皮", "职场甩锅", "家庭催婚", "网友阴阳怪气"];
const randomDifficulties = ["随机", "青铜", "白银", "黄金", "王者"];
const opponentTypes = ["随机", "讲道理型", "嘴硬型", "阴阳怪气型", "偷换概念型", "情绪勒索型"];

export default function TrainingPage(session) {
  if (session.step === "chat") return ChatPage(session);

  return `
    <div class="page training-page">
      <section class="temp-intro training-intro">
        <strong>吵架训练</strong>
        <p>把吵架变成反应力训练。</p>
      </section>

      <section class="input-panel setup-panel">
        <div class="card-title-row">
          <div>
            <h2>AI 随机场景</h2>
            <p class="section-note">不知道练什么？让 AI 生成一个真实冲突场景。</p>
          </div>
        </div>

        <label>
          <span>场景类型选择</span>
          <select class="select-field" data-setup-input="training.randomScenarioForm.category">
            ${randomCategories.map((item) => Option(item, session.randomScenarioForm?.category)).join("")}
          </select>
        </label>

        <label>
          <span>难度选择</span>
          <select class="select-field" data-setup-input="training.randomScenarioForm.difficulty">
            ${randomDifficulties.map((item) => Option(item, session.randomScenarioForm?.difficulty)).join("")}
          </select>
        </label>

        <label>
          <span>对手类型选择</span>
          <select class="select-field" data-setup-input="training.randomScenarioForm.opponentType">
            ${opponentTypes.map((item) => Option(item, session.randomScenarioForm?.opponentType)).join("")}
          </select>
        </label>

        <label class="long-field">
          <span>我想训练的目标</span>
          <textarea data-setup-input="training.randomScenarioForm.userGoal" placeholder="例如：练习不被对方带偏、练习强硬拒绝、练习表达边界">${escapeHtml(session.randomScenarioForm?.userGoal)}</textarea>
        </label>

        <button class="primary-button" data-action="generate-random-training-scenario" ${session.scenarioStatus === "loading" ? "disabled" : ""}>
          ${session.scenarioStatus === "loading" ? "正在生成真实吵架现场..." : session.generatedScenario ? "换一个场景" : "AI 随机生成场景"}
        </button>
        ${session.scenarioMessage ? `<p class="section-note">${escapeHtml(session.scenarioMessage)}</p>` : ""}
      </section>

      ${session.generatedScenario ? ScenarioCard(session.generatedScenario) : ""}

      <section class="game-setup">
        <label class="long-field">
          <span>随机场景挑战</span>
          <textarea data-setup-input="training.scene" placeholder="也可以自己输入想练的场景。">${escapeHtml(session.scene)}</textarea>
        </label>

        <div class="field-title">训练强度</div>
        <div class="difficulty-grid">
          ${difficultyOptions.map((item) => Difficulty(item, session.difficulty)).join("")}
        </div>

        <button class="primary-button" data-action="start-training-chat">${session.generatedScenario ? "开始这一局" : "开始挑战"}</button>
      </section>

      <section class="training-card-list">
        ${trainingCards.map(TrainingCard).join("")}
      </section>
    </div>
  `;
}

function ScenarioCard(scenario) {
  return `
    <section class="result-card">
      <div class="card-title-row">
        <h2>${escapeHtml(scenario.title)}</h2>
        <span class="stamp">${escapeHtml(scenario.difficulty)}</span>
      </div>
      <div class="tag-row">
        <span>${escapeHtml(scenario.category)}</span>
        <span>${escapeHtml(scenario.opponentProfile?.type)}</span>
        <span>${escapeHtml(scenario.relationship)}</span>
      </div>
      ${Block("冲突前情", scenario.background)}
      ${Block("对方开场话术", scenario.openingMessage)}
      ${Block("本局目标", scenario.userGoal)}
      ${Block("本局主线", scenario.realMainline)}
      <div class="temp-result-block">
        <h3>FIRB 主线</h3>
        <p><strong>事实：</strong>${escapeHtml(scenario.mainline?.fact)}</p>
        <p><strong>影响：</strong>${escapeHtml(scenario.mainline?.impact)}</p>
        <p><strong>诉求：</strong>${escapeHtml(scenario.mainline?.request)}</p>
        <p><strong>边界：</strong>${escapeHtml(scenario.mainline?.boundary)}</p>
      </div>
      ${ListBlock("对方话术陷阱", scenario.traps)}
      ${ListBlock("训练重点", scenario.trainingFocus)}
      ${Block("第一句提示", scenario.suggestedFirstReplyHint)}
    </section>
  `;
}

function Block(title, text) {
  return `
    <div class="temp-result-block">
      <h3>${title}</h3>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
}

function ListBlock(title, items = []) {
  return `
    <div class="temp-result-block">
      <h3>${title}</h3>
      <p>${items.map(escapeHtml).join(" / ")}</p>
    </div>
  `;
}

function Option(item, active) {
  return `<option value="${escapeAttr(item)}" ${item === active ? "selected" : ""}>${escapeHtml(item)}</option>`;
}

function TrainingCard(card) {
  return `
    <article class="training-mini-card">
      <h3>${card.title}</h3>
      <p>${card.desc}</p>
    </article>
  `;
}

function ChatPage(session) {
  const visibleFeedbacks = [...session.feedbacks].reverse();
  return `
    <div class="page chat-page">
      <section class="chat-status training-status">
        <div class="status-head">
          <strong>ROUND ${String(session.round).padStart(2, "0")}</strong>
          <button class="tiny-button" data-action="edit-training-setup">修改场景</button>
        </div>
        <p>场景：${escapeHtml(session.scene)}</p>
        <p>强度：${escapeHtml(session.difficulty)}</p>
      </section>

      <section class="chat-log">
        <div class="bubble-card opponent"><span>系统扮演对方</span><p>${escapeHtml(session.opponent)}</p></div>
        ${visibleFeedbacks.map(FeedbackRound).join("")}
      </section>

      <section class="chat-composer">
        <textarea data-session-input="training" placeholder="输入你的本轮回复">${escapeHtml(session.input)}</textarea>
        <button class="primary-button" data-action="training-submit" ${session.isSubmitting ? "disabled" : ""}>
          ${session.isSubmitting ? "正在评分..." : "提交我的回复"}
        </button>
      </section>
    </div>
  `;
}

function FeedbackRound(item) {
  return `
    <article class="chat-round">
      <div class="bubble-card user"><span>你</span><p>${escapeHtml(item.userReply)}</p></div>
      <div class="ai-panel">
        <h3>本轮评分</h3>
        <div class="score-row"><span>综合</span><div class="score-track"><i style="width:${item.score}%"></i></div><strong>${item.score}</strong></div>
        <h3>你回复的优点</h3>
        <p>${escapeHtml(item.strengths)}</p>
        <h3>还能更狠一点的地方</h3>
        <p>${escapeHtml(item.problems)}</p>
        <h3>优化版回复</h3>
        <p>${escapeHtml(item.optimized)}</p>
        <h3>下一轮对方继续发言</h3>
        <p>${escapeHtml(item.nextOpponent)}</p>
      </div>
    </article>
  `;
}

function Difficulty(item, active) {
  return `
    <button class="difficulty-card ${active === item ? "active" : ""}" data-chip-session="training" data-chip-field="difficulty" data-chip-value="${item}">
      <strong>${item}</strong>
      <span>${getDifficultyDesc(item)}</span>
    </button>
  `;
}

function getDifficultyDesc(item) {
  const map = {
    热身: "对方讲点道理",
    普通: "有点嘴硬",
    嘴硬: "甩锅和反问变多",
    阴阳大师: "阴阳怪气加情绪压迫"
  };
  return map[item] || "自由练习";
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
