import { trainingDifficulties, trainingScenes } from "../data/mockData.js";

export default function TrainingPage(session) {
  if (session.step === "chat") return ChatPage(session);

  return `
    <div class="page training-page">
      <section class="game-setup">
        <div class="field-title">选择场景</div>
        <div class="chip-group compact">
          ${trainingScenes
            .filter((scene) => ["宿舍卫生大战", "情侣冷战", "商家扯皮", "职场甩锅", "家庭催婚", "网友阴阳怪气"].includes(scene))
            .map((scene) => Chip(scene, session.scene, "training-scene"))
            .join("")}
        </div>

        <div class="field-title">选择难度</div>
        <div class="difficulty-grid">
          ${trainingDifficulties
            .map(
              (item) => `
                <button class="difficulty-card ${session.difficulty === item.name ? "active" : ""}" data-training-difficulty="${item.name}">
                  <strong>${item.name}</strong>
                  <span>${item.desc}</span>
                </button>
              `
            )
            .join("")}
        </div>

        <button class="primary-button" data-action="start-training-chat">开始训练</button>
      </section>
    </div>
  `;
}

function ChatPage(session) {
  return `
    <div class="page chat-page">
      <section class="chat-status training-status">
        <strong>ROUND ${String(session.round).padStart(2, "0")}</strong>
        <p>${escapeHtml(session.scene)} / ${escapeHtml(session.difficulty)}</p>
      </section>

      <section class="chat-log">
        <div class="bubble-card opponent"><span>系统对手</span><p>${escapeHtml(session.opponent)}</p></div>
        ${session.feedbacks.map(FeedbackRound).join("")}
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
        <h3>用户回复的优点</h3>
        <p>${escapeHtml(item.strengths)}</p>
        <h3>用户回复的问题</h3>
        <p>${escapeHtml(item.problems)}</p>
        <h3>优化版回复</h3>
        <p>${escapeHtml(item.optimized)}</p>
        <h3>下一轮对方继续发言</h3>
        <p>${escapeHtml(item.nextOpponent)}</p>
      </div>
    </article>
  `;
}

function Chip(item, active, key) {
  return `<button class="chip ${active === item ? "active" : ""}" data-${key}="${item}">${item}</button>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
