import { toneOptions, trainingDifficultyOptions, trainingGoalOptions } from "../data/mockData.js";
import { ChatBubble } from "../components/ChatBubble.js";
import { AiSourceBadge } from "../utils/aiSource.js";
import { escapeAttr, escapeHtml } from "../utils/html.js";
import { getMessageContent } from "../utils/messageModel.js";

ensureImportMetaEnv();

export default function TrainingPage(session) {
  if (session.gameState === "finished") return TrainingFinishedPage(session);
  if (session.gameState === "playing") return TrainingPlayingPage(session);
  return TrainingIdlePage(session);
}

function TrainingIdlePage(session) {
  const config = getGameConfig(session);
  return `
    <div class="page training-game-page training-idle-page">
      ${TrainingStartSettings(session, config)}
      ${TrainingDevDebugPanel(session, config)}
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
            ${session.scenarioStatus === "loading" ? "生成中..." : "AI随机生成一局"}
          </button>
          <button class="secondary-button compact-action" data-action="generate-preset-training-scenario" ${session.scenarioStatus === "loading" ? "disabled" : ""}>基于当前设定扩写</button>
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

      <div class="training-setting-group">
        <h3>前情提要</h3>
        ${TrainingTextArea("冲突背景", "training.gameConfig.contextSummary", config.contextSummary, "补充这件事之前发生了什么、谁做了什么、为什么现在爆发。")}
      </div>

      <div class="training-setting-group">
        <h3>我想守住的主线</h3>
        ${TrainingTextArea("主线", "training.gameConfig.userMainline", config.userMainline, "例如：我不是在争态度，我要对方承认失约并给出补救方案。")}
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
        <h3>练习视角</h3>
        <div class="training-side-options">
          ${RoleChoice("A", config)}
          ${RoleChoice("B", config)}
        </div>
        <p class="training-setting-note">你选择其中一个角色练习发言，AI 对手自动扮演另一方。</p>
      </div>

      ${AdvancedTrainingSettings(session, config)}

      <div class="training-main-actions">
        <button class="primary-button compact-full-button" data-action="start-training-game" data-tour="training-start" ${session.scenarioStatus === "loading" ? "disabled" : ""}>开始训练</button>
        <button class="secondary-button warm compact-full-button" data-action="generate-random-training-scenario" data-tour="training-generate" ${session.scenarioStatus === "loading" ? "disabled" : ""}>
          ${session.scenarioStatus === "loading" ? "生成中..." : "AI 随机生成一局"}
        </button>
        <button class="secondary-button compact-full-button" data-action="generate-preset-training-scenario" ${session.scenarioStatus === "loading" ? "disabled" : ""}>
          基于当前设定扩写
        </button>
      </div>
      ${session.scenarioMessage ? `<p class="section-note compact-status-note">${escapeHtml(session.scenarioMessage)}</p>` : ""}
    </section>
  `;
}

function AdvancedTrainingSettings(session, config) {
  return `
    <details class="training-advanced-settings">
      <summary>更多训练偏好</summary>
      <div class="training-advanced-settings-body">
        <div class="training-setting-group">
          <h3>语气强度</h3>
          <div class="training-choice-grid">
            ${toneOptions
            .map(
                (item) => `
                  <button
                    class="chip tiny-chip ${config.toneStrength === item ? "active" : ""}"
                    data-chip-session="training.gameConfig"
                    data-chip-field="toneStrength"
                    data-chip-value="${escapeAttr(item)}"
                  >
                    ${escapeHtml(item)}
                  </button>
                `
              )
              .join("")}
          </div>
        </div>

        <div class="training-setting-group">
          <h3>会话控制</h3>
          <div class="training-choice-grid">
            ${SessionControlChoice("每轮回复", "replyLength", ["短", "中", "长"], config.sessionControl.replyLength)}
            ${SessionControlChoice("主线提醒", "remindMainline", ["开启", "关闭"], config.sessionControl.remindMainline)}
            ${SessionControlChoice("升级语气", "allowEscalation", ["允许", "禁止"], config.sessionControl.allowEscalation)}
          </div>
        </div>

        ${TrainingPreviewContent(session, config)}
      </div>
    </details>
  `;
}

function RoleEditor(title, key, role) {
  return `
    <article class="training-role-editor">
      <div class="training-role-card-head">
        <span>${escapeHtml(title)}</span>
        <input data-setup-input="training.gameConfig.${key}.name" value="${escapeAttr(role.name)}" placeholder="例如：角色A、室友" />
      </div>
      <label class="training-role-card-field">
        <b>角色描述</b>
        <textarea data-setup-input="training.gameConfig.${key}.description" placeholder="这个角色在场景里是什么状态？">${escapeHtml(role.description)}</textarea>
      </label>
      <label class="training-role-card-field">
        <b>角色目标</b>
        <textarea data-setup-input="training.gameConfig.${key}.goal" placeholder="这个角色想达到什么？">${escapeHtml(role.goal)}</textarea>
      </label>
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
      <p><b>语气强度：</b>${escapeHtml(config.toneStrength)}</p>
      <p><b>前情：</b>${escapeHtml(config.contextSummary || "未填写")}</p>
      <p><b>主线：</b>${escapeHtml(config.userMainline || "未填写")}</p>
      <p><b>会话控制：</b>${escapeHtml(formatSessionControl(config.sessionControl))}</p>
    </div>
  `;
}

function TrainingPlayingPage(session) {
  const config = getGameConfig(session);
  return `
    <div class="page realtime-chat-page training-chat-page">
      ${TrainingGameHud(session)}
      ${TrainingChatPanel(session)}
      ${TrainingInputBar(session)}
      ${TrainingDevDebugPanel(session, config)}
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
      </div>
      <div class="training-role-summary compact">
        <span>目标：<b>${escapeHtml(formatGoals(config.trainingGoals))}</b></span>
        <span>难度：<b>${escapeHtml(difficultyLabel(config.difficulty))}</b></span>
        <span>强度：<b>${escapeHtml(config.toneStrength)}</b></span>
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
  const messages = session.messages || [];
  return `
    <section class="realtime-chat-panel training-dialog-panel" aria-label="吵架训练对话">
      <div class="persona-chat-scroll realtime-chat-scroll training-chat-scroll">
        ${
          messages.length
            ? messages.map((message, index) => MessageBubble(message, session.feedbacks, index, config)).join("")
            : EmptyConversationState("当前还没有对话。", "开始训练或发送回复后，这里只显示本轮真实训练对话。")
        }
      </div>
    </section>
  `;
}

function EmptyConversationState(title, text) {
  return `
    <div class="conversation-empty-state">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(text)}</p>
    </div>
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
    meta: !isUser ? (feedback ? RoundFeedback(feedback) : AiSourceBadge(message.source, "真实 AI")) : "",
    className: "training-message-bubble"
  });
}

function RoundFeedback(item) {
  const delta = Number(item.persuasionDelta || 0);
  const roundScore = item.roundScore || {};
  const scores = roundScore.scores || {};
  return `
    <details class="training-round-feedback">
      <summary>本轮反馈 ${delta >= 0 ? `+${delta}` : delta} ${AiSourceBadge(item.source, "真实 AI")}</summary>
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

function TrainingDevDebugPanel(session, config = getGameConfig(session)) {
  if (!isDevDebugEnabled()) return "";
  const debug = session.devDebug || {};
  const responseDebug = debug.lastReplyResponseDebug || {};
  const meta = debug.lastAiResponseMeta || {};
  const isOpen = Boolean(session.devDebugDrawerOpen);
  return `
    <button class="training-dev-fab" data-action="open-training-dev-debug" aria-label="打开训练 DEV 调试" ${isOpen ? "hidden" : ""}>DEV</button>
    ${
      isOpen
        ? `
          <aside class="training-dev-debug-drawer" aria-label="训练设置 DEV 调试 Drawer">
            <div class="training-dev-debug-head">
              <div>
                <span class="persona-kicker">DEV</span>
                <h3>训练设置调试</h3>
              </div>
              <button class="tiny-button" data-action="close-training-dev-debug">关闭</button>
            </div>
            <div class="training-dev-debug-meta">
              <span>source: <b>${escapeHtml(meta.source || "未请求")}</b></span>
              <span>model: <b>${escapeHtml(meta.model || "未返回")}</b></span>
              <span>difficulty: <b>${escapeHtml(meta.difficulty || config.difficulty || "")}</b></span>
              <span>toneStrength: <b>${escapeHtml(meta.toneStrength || config.toneStrength || "")}</b></span>
            </div>
            ${DebugJsonBlock("当前前端 gameConfig", config)}
            ${DebugJsonBlock("最近一次 /api/training/reply request body", debug.lastReplyRequestBody)}
            ${DebugJsonBlock("后端 debug.receivedSettings", responseDebug.receivedSettings)}
            ${DebugJsonBlock("后端 debug.promptSummary", responseDebug.promptSummary)}
          </aside>
        `
        : ""
    }
  `;
}

function DebugJsonBlock(title, value) {
  const content = value == null ? "暂无" : JSON.stringify(value, null, 2);
  return `
    <details class="training-dev-debug-block" open>
      <summary>${escapeHtml(title)}</summary>
      <pre>${escapeHtml(content)}</pre>
    </details>
  `;
}

function isDevDebugEnabled() {
  if (typeof window === "undefined") return false;
  const isDevDebug = import.meta.env.DEV && localStorage.getItem("didi_debug") === "1";
  return Boolean(isDevDebug);
}

function ensureImportMetaEnv() {
  if (import.meta.env) return;
  Object.defineProperty(import.meta, "env", {
    value: { DEV: isLocalDevelopmentRuntime() },
    configurable: true
  });
}

function isLocalDevelopmentRuntime() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return window.location.protocol === "file:" || host === "localhost" || host === "127.0.0.1" || host === "::1";
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
      ${TrainingDevDebugPanel(session)}
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

function SessionControlChoice(label, field, options, active) {
  return `
    <div class="training-control-choice">
      <span>${escapeHtml(label)}</span>
      <div class="training-control-options">
        ${options
          .map(
            (item) => `
              <button
                class="chip tiny-chip ${active === item ? "active" : ""}"
                data-chip-session="training.gameConfig"
                data-chip-field="sessionControl.${field}"
                data-chip-value="${escapeAttr(item)}"
              >
                ${escapeHtml(item)}
              </button>
            `
          )
          .join("")}
      </div>
    </div>
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
    difficulty: normalizeDifficulty(source.difficulty || session.aiDifficulty || session.difficulty),
    toneStrength: normalizeToneStrength(source.toneStrength || session.toneStrength),
    contextSummary: String(source.contextSummary || session.contextSummary || "").trim(),
    userMainline: String(source.userMainline || session.userMainline || "").trim(),
    sessionControl: normalizeSessionControl(source.sessionControl || session.sessionControl)
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

function normalizeToneStrength(value) {
  if (["低", "中", "高"].includes(value)) return value;
  if (/低|soft|轻/i.test(String(value || ""))) return "低";
  if (/高|strong|锋利|攻击/i.test(String(value || ""))) return "高";
  return "中";
}

function normalizeSessionControl(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    replyLength: ["短", "中", "长"].includes(source.replyLength) ? source.replyLength : "中",
    remindMainline: source.remindMainline === "关闭" ? "关闭" : "开启",
    allowEscalation: source.allowEscalation === "禁止" ? "禁止" : "允许"
  };
}

function difficultyLabel(value) {
  return trainingDifficultyOptions.find((item) => item.value === normalizeDifficulty(value))?.label || "正常";
}

function formatGoals(goals = []) {
  return goals.length ? goals.join("、") : "抓住核心问题";
}

function formatSessionControl(control = {}) {
  return `每轮${control.replyLength || "中"} / 主线提醒${control.remindMainline || "开启"} / 升级语气${control.allowEscalation || "允许"}`;
}

function clampScore(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}
