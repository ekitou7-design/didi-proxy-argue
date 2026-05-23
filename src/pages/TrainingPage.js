import { difficultyOptions } from "../data/mockData.js";

export default function TrainingPage(session) {
  if (session.step === "chat") return ChatPage(session);

  return `
    <div class="page training-page">
      <section class="temp-intro training-intro">
        <strong>不背题，直接练你的真实场景</strong>
        <p>输入你想训练的冲突，系统会扮演对方。你回一句，系统评分并继续下一轮。</p>
      </section>

      <section class="game-setup">
        <label class="long-field">
          <span>你想训练什么吵架场景？</span>
          <textarea data-setup-input="training.scene" placeholder="比如：男朋友临时改约还说我太敏感；组员不干活还说我要求太高；室友不打扫卫生还倒打一耙。">${escapeHtml(session.scene)}</textarea>
        </label>

        <div class="field-title">训练强度</div>
        <div class="difficulty-grid">
          ${difficultyOptions.map((item) => Difficulty(item, session.difficulty)).join("")}
        </div>

        <button class="primary-button" data-action="start-training-chat">开始训练</button>
      </section>
    </div>
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
        <button class="primary-button" data-action="training-submit">提交回复</button>
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
