import { difficultyOptions } from "../data/mockData.js";

const trainingCards = [
  { title: "今日训练卡片", desc: "今日目标：不解释自己配不配生气，只抓事实和诉求。" },
  { title: "随机场景挑战", desc: "系统随机扮演难缠对手，训练临场反应。" },
  { title: "主线锁定训练", desc: "对方跑题一次，你就把他拖回案发现场一次。" },
  { title: "气势稳定训练", desc: "有压迫感，但不失控、不脏嘴。" },
  { title: "阴阳怪气训练", desc: "练习轻刺反击，点到为止但很难忘。" }
];

export default function TrainingPage(session) {
  if (session.step === "chat") return ChatPage(session);

  return `
    <div class="page training-page">
      <section class="temp-intro training-intro">
        <strong>吵架训练</strong>
        <p>把吵架变成反应力训练。</p>
      </section>

      <section class="training-card-list">
        ${trainingCards.map(TrainingCard).join("")}
      </section>

      <section class="game-setup">
        <label class="long-field">
          <span>随机场景挑战</span>
          <textarea data-setup-input="training.scene" placeholder="也可以自己输入想练的场景。">${escapeHtml(session.scene)}</textarea>
        </label>

        <div class="field-title">训练强度</div>
        <div class="difficulty-grid">
          ${difficultyOptions.map((item) => Difficulty(item, session.difficulty)).join("")}
        </div>

        <button class="primary-button" data-action="start-training-chat">开始挑战</button>
      </section>
    </div>
  `;
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
          ${session.isSubmitting ? "正在评分..." : "提交回复"}
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
