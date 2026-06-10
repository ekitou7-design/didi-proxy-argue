import { trainingDifficultyOptions, trainingGoalOptions } from "../data/mockData.js";
import { ChatBubble } from "../components/ChatBubble.js";
import { escapeAttr, escapeHtml } from "../utils/html.js";
import { getMessageContent } from "../utils/messageModel.js";

export default function TrainingPage(session) {
  if (session.gameState === "finished") return TrainingFinishedPage(session);
  if (session.gameState === "playing") return TrainingPlayingPage(session);
  return TrainingIdlePage(session);
}

function TrainingIdlePage(session) {
  const config = getGameConfig(session);
  return `
    <div class="page training-game-page training-idle-page">
      ${TrainingSetupStatus(session, config)}
      ${TrainingStartSettings(session, config)}
      ${TrainingMobilePreview(session, config)}
    </div>
  `;
}

function TrainingSetupStatus(session, config) {
  return `
    <section class="realtime-settings-card training-settings-card training-setup-card">
      <div class="training-setup-status">
        <div>
          <span class="persona-kicker">本局训练预览</span>
          <h2>${escapeHtml(config.scene || "还没有本局场景")}</h2>
          <p>${escapeHtml(formatGoals(config.trainingGoals))} · ${escapeHtml(difficultyLabel(config.difficulty))}</p>
        </div>
        <div class="training-status-actions">
          <button class="secondary-button warm compact-action" data-action="generate-random-training-scenario" data-tour="training-generate" ${session.scenarioStatus === "loading" ? "disabled" : ""}>
            ${session.scenarioStatus === "loading" ? "生成中..." : "AI生成一局训练"}
          </button>
          <button class="primary-button compact-action" data-action="start-training-game" data-tour="training-start" ${session.scenarioStatus === "loading" ? "disabled" : ""}>开始训练</button>
        </div>
      </div>
      ${session.scenarioMessage ? `<p class="section-note compact-status-note">${escapeHtml(session.scenarioMessage)}</p>` : ""}
    </section>
  `;
}

function TrainingStartSettings(session, config) {
  return `
    <section class="training-start-settings">
      <div class="card-title-row">
        <div>
          <span class="persona-kicker">本局配置</span>
          <h2>创建一局训练</h2>
        </div>
      </div>

      ${TrainingTextArea("本局场景", "training.gameConfig.scene", config.scene, "例如：宿舍里，角色B一直不倒垃圾。角色A提醒后，角色B还嘲讽角色A小题大做。")}

      <div class="training-setting-group">
        <h3>本局角色</h3>
        <p class="training-setting-note">角色 A / B 是冲突里的两方，不等于玩家；你会在下方选择本局练习视角。</p>
        <div class="training-role-edit-grid">
          ${RoleEditor("角色A", "roleA", config.roleA)}
          ${RoleEditor("角色B", "roleB", config.roleB)}
        </div>
      </div>

      <div class="training-setting-group">
        <h3>选择本局练习视角</h3>
        <div class="training-side-options">
          ${RoleChoice("A", config)}
          ${RoleChoice("B", config)}
        </div>
        <p class="training-setting-note">你选择其中一个角色练习发言，AI 对手自动扮演另一方。</p>
      </div>

      <div class="training-setting-group">
        <h3>训练目标</h3>
        <div class="training-choice-grid" data-tour="training-goals">
          ${trainingGoalOptions
            .map(
              (goal) => `
                <button class="chip tiny-chip ${config.trainingGoals.includes(goal) ? "active" : ""}" data-action="toggle-training-goal" data-goal="${escapeAttr(goal)}">
                  ${escapeHtml(goal)}
                </button>
              `
            )
            .join("")}
        </div>
      </div>

      <div class="training-setting-group">
        <h3>难度</h3>
        <div class="training-choice-grid difficulty-choice-grid">
          ${trainingDifficultyOptions
            .map(
              (item) => `
                <button
                  class="chip tiny-chip ${config.difficulty === item.value ? "active" : ""}"
                  data-chip-session="training.gameConfig"
                  data-chip-field="difficulty"
                  data-chip-value="${escapeAttr(item.value)}"
                >
                  ${escapeHtml(item.label)}
                </button>
              `
            )
            .join("")}
        </div>
      </div>

      <button class="primary-button compact-full-button" data-action="start-training-game" data-tour="training-start" ${session.scenarioStatus === "loading" ? "disabled" : ""}>开始训练</button>
    </section>
  `;
}

function RoleEditor(title, key, role) {
  return `
    <article class="training-role-editor">
      <h4>${escapeHtml(title)}</h4>
      ${InlineField("名称", `training.gameConfig.${key}.name`, role.name, "例如：角色A、室友")}
      ${TrainingTextArea("角色描述", `training.gameConfig.${key}.description`, role.description, "这个角色在场景里是什么状态？")}
      ${TrainingTextArea("角色目标", `training.gameConfig.${key}.goal`, role.goal, "这个角色想达到什么？")}
    </article>
  `;
}

function RoleChoice(key, config) {
  const role = getRole(config, key);
  const aiKey = oppositeRoleKey(key);
  const aiRole = getRole(config, aiKey);
  return `
    <button
      class="training-side-option ${config.playerRoleKey === key ? "active" : ""}"
      data-chip-session="training.gameConfig"
      data-chip-field="playerRoleKey"
      data-chip-value="${key}"
    >
      <strong>练习角色${key}：${escapeHtml(role.name || `角色${key}`)}</strong>
      <span>${escapeHtml(role.description || "待填写角色描述")}</span>
      <small>AI 对手将扮演角色${aiKey}：${escapeHtml(aiRole.name || `角色${aiKey}`)}</small>
    </button>
  `;
}

function TrainingMobilePreview(session, config) {
  return `
    <details class="training-mobile-preview">
      <summary>本局预览</summary>
      ${TrainingPreviewContent(session, config)}
    </details>
  `;
}

export function TrainingPreviewContent(session, config = getGameConfig(session), options = {}) {
  const playerRole = getPlayerRole(config);
  const aiRole = getAiRole(config);
  const goalTourAttr = options.includeTourTargets ? ` data-tour="training-goals" data-tour-priority="1"` : "";
  return `
    <div class="training-preview-content">
      <h2>本局预览</h2>
      <p><b>场景：</b>${escapeHtml(config.scene || "未填写")}</p>
      <p><b>你的练习视角：</b>角色${escapeHtml(config.playerRoleKey)} · ${escapeHtml(playerRole.name || "未选择")}</p>
      <p><b>练习视角目标：</b>${escapeHtml(playerRole.goal || "未填写")}</p>
      <p><b>AI 对手：</b>角色${escapeHtml(config.aiRoleKey)} · ${escapeHtml(aiRole.name || "未选择")}</p>
      <p><b>AI 对手目标：</b>${escapeHtml(aiRole.goal || "未填写")}</p>
      <p${goalTourAttr}><b>训练目标：</b>${escapeHtml(formatGoals(config.trainingGoals))}</p>
      <p><b>难度：</b>${escapeHtml(difficultyLabel(config.difficulty))}</p>
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
  const config = getGameConfig(session);
  const playerRole = getPlayerRole(config);
  const aiRole = getAiRole(config);
  const score = clampScore(session.persuasionScore);
  return `
    <section class="realtime-settings-card training-settings-card training-hud">
      <div class="training-hud-head">
        <div>
          <span class="persona-kicker">训练中</span>
          <h2>${escapeHtml(config.scene || "吵架训练")}</h2>
          <p>你：${escapeHtml(playerRole.name)} / AI 对手：${escapeHtml(aiRole.name)}</p>
        </div>
        <button class="tiny-button" data-action="finish-training-game" data-tour="training-finish" ${session.isSubmitting ? "disabled" : ""}>结束本轮</button>
      </div>
      <div class="training-role-summary compact">
        <span>目标：<b>${escapeHtml(formatGoals(config.trainingGoals))}</b></span>
        <span>难度：<b>${escapeHtml(difficultyLabel(config.difficulty))}</b></span>
      </div>
      <div class="training-progress-meta">
        <span>第 ${escapeHtml(session.round || 1)} / ${escapeHtml(session.maxRounds || 5)} 回合</span>
        <b>AI 对手松动值：${score}%</b>
      </div>
      <div class="training-persuasion-track"><i style="width:${score}%"></i></div>
      ${session.scenarioMessage ? `<p class="section-note compact-status-note">${escapeHtml(session.scenarioMessage)}</p>` : ""}
    </section>
  `;
}

function TrainingChatPanel(session) {
  const config = getGameConfig(session);
  const messages = session.messages?.length
    ? session.messages
    : [{ role: "assistant", content: session.opponent || session.generatedScenario?.openingMessage || "开始后，AI 对手会先出招。" }];
  return `
    <section class="realtime-chat-panel training-dialog-panel" aria-label="吵架训练对话">
      <div class="persona-chat-scroll realtime-chat-scroll training-chat-scroll">
        ${messages.map((message, index) => MessageBubble(message, session.feedbacks, index, config)).join("")}
      </div>
    </section>
  `;
}

function MessageBubble(message, feedbacks, index, config) {
  const isUser = message.role === "user";
  const assistantIndex = Math.floor(index / 2) - 1;
  const feedback = !isUser && assistantIndex >= 0 ? feedbacks[assistantIndex] : null;
  const role = isUser ? getPlayerRole(config) : getAiRole(config);
  return ChatBubble({
    side: isUser ? "right" : "left",
    label: isUser ? `你：${role.name}` : `AI 对手：${role.name}`,
    avatar: isUser ? "我" : "AI",
    content: getMessageContent(message),
    meta: feedback ? RoundFeedback(feedback) : "",
    className: "training-message-bubble"
  });
}

function RoundFeedback(item) {
  const delta = Number(item.persuasionDelta || 0);
  const roundScore = item.roundScore || {};
  const scores = roundScore.scores || {};
  return `
    <details class="training-round-feedback">
      <summary>本轮反馈 ${delta >= 0 ? `+${delta}` : delta}</summary>
      <p>${escapeHtml(item.feedback || "本轮已记录。")}</p>
      ${roundScore.overallScore != null ? `<strong>综合评分：${clampScore(roundScore.overallScore)}</strong>` : ""}
      ${ScoreRow("逻辑", scores.logic)}
      ${ScoreRow("气势", scores.power)}
      ${ScoreRow("边界", scores.boundary)}
      ${ScoreRow("主线", scores.mainline)}
      ${ScoreRow("风险", scores.risk, "danger-score")}
      ${FeedbackText("优点", roundScore.advantages)}
      ${FeedbackText("建议", roundScore.suggestion || roundScore.weaknesses)}
      ${FeedbackText("优化版", roundScore.betterReply)}
    </details>
  `;
}

function ScoreRow(label, value, className = "") {
  if (value == null || value === "") return "";
  const score = clampScore(value);
  return `
    <div class="score-row ${className}">
      <span>${escapeHtml(label)}</span>
      <div class="score-track"><i style="width:${score}%"></i></div>
      <b>${score}</b>
    </div>
  `;
}

function FeedbackText(title, text) {
  if (!text) return "";
  return `
    <p class="training-feedback-line"><b>${escapeHtml(title)}</b>${escapeHtml(text)}</p>
  `;
}

function TrainingInputBar(session) {
  return `
    <section class="realtime-input-bar training-input-boundary">
      <textarea data-session-input="training" data-enter-action="training-submit" placeholder="以当前练习视角发言">${escapeHtml(session.input)}</textarea>
      <button class="primary-button" data-action="training-submit" data-tour="training-submit" ${session.isSubmitting ? "disabled" : ""}>
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

      <section class="training-finished-transcript">
        <h3>本局对话</h3>
        ${TrainingChatPanel(session)}
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

function TrainingTextArea(label, path, value, placeholder) {
  return `
    <label class="compact-field training-full-field">
      <span>${escapeHtml(label)}</span>
      <textarea data-setup-input="${path}" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value)}</textarea>
    </label>
  `;
}

function InlineField(label, path, value, placeholder) {
  return `
    <label class="compact-field training-inline-field">
      <span>${escapeHtml(label)}</span>
      <input data-setup-input="${path}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}" />
    </label>
  `;
}

function resultTitle(result) {
  if (result === "win") return "你吵赢了";
  if (result === "lose") return "被带偏了";
  return "打平";
}

export function getGameConfig(session) {
  const source = session.gameConfig || {};
  const playerRoleKey = normalizeRoleKey(source.playerRoleKey);
  const config = {
    scene: source.scene || session.scene || session.generatedScenario?.background || session.generatedScenario?.title || "",
    roleA: normalizeRole(source.roleA, { name: "角色A", description: "场景中的主动表达者", goal: "说清问题，守住主线" }),
    roleB: normalizeRole(source.roleB, { name: "角色B", description: "场景中的冲突对象", goal: "反驳另一方，制造压力" }),
    playerRoleKey,
    aiRoleKey: oppositeRoleKey(playerRoleKey),
    trainingGoals: normalizeGoals(source.trainingGoals || source.goals || session.goal || session.generatedScenario?.userGoal),
    difficulty: normalizeDifficulty(source.difficulty || session.aiDifficulty || session.difficulty)
  };
  return config;
}

function normalizeRole(role, fallback) {
  return {
    name: String(role?.name || fallback.name || "").trim(),
    description: String(role?.description || fallback.description || "").trim(),
    goal: String(role?.goal || fallback.goal || "").trim()
  };
}

function normalizeGoals(value) {
  const goals = Array.isArray(value)
    ? value.filter(Boolean)
    : String(value || "")
        .split(/[、,，/]/)
        .map((item) => item.trim())
        .filter(Boolean);
  return goals.length ? goals : ["抓住核心问题"];
}

function getRole(config, key) {
  return key === "B" ? config.roleB : config.roleA;
}

function getPlayerRole(config) {
  return getRole(config, config.playerRoleKey);
}

function getAiRole(config) {
  return getRole(config, config.aiRoleKey);
}

function normalizeRoleKey(value) {
  return value === "B" ? "B" : "A";
}

function oppositeRoleKey(value) {
  return normalizeRoleKey(value) === "A" ? "B" : "A";
}

function normalizeDifficulty(value) {
  if (["easy", "normal", "hard", "hell"].includes(value)) return value;
  if (/温和|热身|青铜|easy/i.test(String(value || ""))) return "easy";
  if (/强势|嘴硬|黄金|hard/i.test(String(value || ""))) return "hard";
  if (/地狱|阴阳|王者|hell/i.test(String(value || ""))) return "hell";
  return "normal";
}

function difficultyLabel(value) {
  return trainingDifficultyOptions.find((item) => item.value === normalizeDifficulty(value))?.label || "正常";
}

function formatGoals(goals = []) {
  return goals.length ? goals.join("、") : "抓住核心问题";
}

function clampScore(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}
