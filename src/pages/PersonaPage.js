import { proxyReplyModes, proxyReplyStrengths } from "../data/mockData.js";
import { ChatBubble as SharedChatBubble } from "../components/ChatBubble.js";
import { AiSourceBadge } from "../utils/aiSource.js";
import { escapeAttr, escapeHtml } from "../utils/html.js";
import { getMessageContent } from "../utils/messageModel.js";

export default function PersonaPage(state) {
  const activeProfile = getActiveProfile(state);
  const hasProfile = Boolean(activeProfile);

  return `
    <div class="page persona-chat-page">
      ${PersonaHeader(activeProfile)}
      ${hasProfile ? PersonaChatPanel(state, activeProfile) : EmptyPersonaState()}
      ${hasProfile ? PersonaInputBar(state) : EmptyCreateActions()}
      ${hasProfile ? FloatingFeishuButton() : ""}
      ${state.personaInfoOpen && activeProfile ? PersonaInfoSheet(activeProfile) : ""}
      ${state.createSheetOpen ? PersonaCreateSheet(state, activeProfile) : ""}
      ${state.replySettingsOpen ? ReplySettingsSheet(state) : ""}
    </div>
  `;
}

function PersonaHeader(profile) {
  if (!profile) {
    return `
      <section class="persona-header-card empty-profile-card">
        <div>
          <span class="persona-kicker">当前嘴替</span>
          <h2>你还没有专属嘴替</h2>
          <p>先创建一个嘴替人格，再让它帮你说话。</p>
        </div>
        <div class="persona-header-actions">
          <button class="secondary-button compact-action" data-action="open-persona-create" data-tour="persona-create">创建嘴替</button>
          <button class="tiny-button" data-page="personaDistill" data-tour="persona-distill">上传蒸馏</button>
          <button class="tiny-button" data-page="personaTest" data-tour="persona-test">人格测试</button>
          <button class="tiny-button" data-action="open-feishu-settings" data-tour="persona-feishu">飞书设置</button>
        </div>
      </section>
    `;
  }

  return `
    <section class="persona-header-card">
      <div class="persona-header-main">
        <span class="persona-kicker">当前嘴替</span>
        <h2>${escapeHtml(getProfileName(profile))}</h2>
      </div>
      <div class="persona-header-actions">
        <button class="tiny-button" data-action="open-persona-info">查看档案</button>
        <button class="secondary-button compact-action" data-action="open-persona-create" data-tour="persona-create">创建 / 切换</button>
        <button class="tiny-button" data-action="open-feishu-settings" data-tour="persona-feishu">飞书设置</button>
      </div>
    </section>
  `;
}

function PersonaInfoSheet(profile) {
  const summary = getProfileSummary(profile);
  const tags = getProfileTags(profile);
  const style = profile.styleProfile || profile.personaProfile || profile;
  const source = profile.sourceType === "test" ? "人格测试生成" : "txt 蒸馏生成";
  return `
    <section class="persona-sheet-backdrop persona-info-backdrop">
      <div class="persona-info-sheet" role="dialog" aria-label="当前嘴替档案">
        <div class="card-title-row">
          <div>
            <span class="persona-kicker">当前嘴替档案</span>
            <h2>${escapeHtml(getProfileName(profile))}</h2>
          </div>
          <button class="tiny-button" data-action="close-persona-info">关闭</button>
        </div>

        <div class="persona-info-block">
          <strong>一句话概括</strong>
          <p>${escapeHtml(summary)}</p>
        </div>

        <div class="persona-info-block">
          <strong>风格标签</strong>
          <div class="tag-row compact-tags">
            ${tags.slice(0, 6).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
        </div>

        <div class="persona-info-grid">
          <div>
            <strong>来源</strong>
            <p>${escapeHtml(source)}</p>
          </div>
          <div>
            <strong>语气</strong>
            <p>${escapeHtml(style.tone || "按你的风格接话")}</p>
          </div>
          <div>
            <strong>策略</strong>
            <p>${escapeHtml(style.replyStrategy || style.logicStyle || "拉回主线，守住边界。")}</p>
          </div>
        </div>

        <div class="persona-info-actions">
          <button class="tiny-button" data-page="personaDistill" data-tour="persona-distill">上传蒸馏</button>
          <button class="tiny-button" data-page="personaTest" data-tour="persona-test">人格测试</button>
          <button class="tiny-button" data-action="open-feishu-settings" data-tour="persona-feishu">飞书设置</button>
        </div>
      </div>
    </section>
  `;
}

function PersonaChatPanel(state, profile) {
  const turns = state.chatTurns || [];

  const latestAssistant = getLatestAssistantTurn({ chatTurns: turns });
  return `
    <section class="persona-chat-panel" aria-label="专属嘴替聊天记录">
      <div class="persona-chat-scroll">
        ${
          turns.length
            ? turns.map((turn) => PersonaMessageBubble(turn, profile, state, latestAssistant?.id)).join("")
            : EmptyConversationState("当前还没有对话。", "在底部输入对方刚说的话，右侧配置只会作为生成上下文。")
        }
      </div>
      ${state.message ? `<p class="persona-chat-note">${escapeHtml(state.message)}</p>` : ""}
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

function PersonaMessageBubble(turn, profile, state, latestAssistantId) {
  const isOpponent = turn.role === "opponent" || turn.role === "user";
  const profileName = getProfileName(profile);
  const isLatestAssistant = !isOpponent && String(turn.id) === String(latestAssistantId);
  return SharedChatBubble({
    side: isOpponent ? "left" : "right",
    label: isOpponent ? "对方" : profileName,
    avatar: isOpponent ? "对" : "替",
    content: getMessageContent(turn),
    meta: !isOpponent && turn.source ? AiSourceBadge(turn.source, "真实 AI") : "",
    actions: isLatestAssistant ? FeishuBubbleAction(turn, state.feishu?.sendingByTurnId?.[turn.id] || "") : ""
  });
}

function FeishuBubbleAction(turn, status) {
  const label =
    status === "sending"
      ? "发送中"
      : status === "sent"
        ? "已发送"
        : status === "error"
          ? "发送失败"
          : "发送飞书";
  return `
    <button
      class="feishu-send-button ${status ? `is-${status}` : ""}"
      data-action="send-reply-to-feishu"
      data-turn-id="${escapeAttr(turn.id)}"
      ${status === "sending" || status === "sent" ? "disabled" : ""}
    >
      ${label}
    </button>
  `;
}

function FloatingFeishuButton() {
  return `
    <button class="floating-feishu-button" data-action="open-feishu-settings" data-tour="persona-feishu" aria-label="飞书设置" title="飞书设置">
      飞
    </button>
  `;
}

function getLatestAssistantTurn(state) {
  return [...(state.chatTurns || [])].reverse().find((turn) => turn.role === "assistant" && getMessageContent(turn));
}

function PersonaInputBar(state) {
  const form = state.replyForm;
  return `
    <section class="persona-input-bar">
      <textarea
        data-setup-input="proxyPersona.replyForm.opponentMessage"
        data-enter-action="generate-proxy-reply"
        placeholder="输入对方刚说的话……"
      >${escapeHtml(form.opponentMessage)}</textarea>
      <div class="persona-send-row">
        <button class="settings-icon-button" data-action="open-reply-settings" data-tour="persona-reply-settings" aria-label="打开回复设置">
          <span aria-hidden="true">⚙</span>
          <b>${escapeHtml(form.mode)} · ${escapeHtml(form.strength)}</b>
        </button>
        <button class="primary-button" data-action="generate-proxy-reply" data-tour="persona-generate-reply" ${state.isReplyGenerating ? "disabled" : ""}>
          ${state.isReplyGenerating ? "嘴替正在憋大招..." : "生成回怼"}
        </button>
      </div>
    </section>
  `;
}

function ReplySettingsSheet(state) {
  const form = state.replyForm;
  return `
    <section class="persona-sheet-backdrop reply-settings-backdrop">
      <div class="reply-settings-sheet" role="dialog" aria-label="回复设置">
        <div class="card-title-row">
          <h2>回复设置</h2>
          <button class="tiny-button" data-action="close-reply-settings">完成</button>
        </div>

        <div class="reply-setting-group">
          <strong>表达方式</strong>
          <div class="settings-chip-grid">
            ${proxyReplyModes
              .map(
                (item) => `
                  <button class="chip tiny-chip ${form.mode === item ? "active" : ""}" data-chip-session="proxyPersona.replyForm" data-chip-field="mode" data-chip-value="${escapeAttr(item)}">
                    ${escapeHtml(item)}
                  </button>
                `
              )
              .join("")}
          </div>
        </div>

        <div class="reply-setting-group">
          <strong>强度</strong>
          <div class="settings-chip-grid strength-row">
            ${proxyReplyStrengths
              .map(
                (item) => `
                  <button class="chip tiny-chip intensity ${form.strength === item ? "active" : ""}" data-chip-session="proxyPersona.replyForm" data-chip-field="strength" data-chip-value="${escapeAttr(item)}">
                    ${escapeHtml(item)}
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function EmptyPersonaState() {
  return `
    <section class="persona-empty-chat">
      <h2>先创建一个嘴替人格，再让它帮你说话。</h2>
      <p>你可以上传 txt 蒸馏自己的聊天方式，也可以做一套测试题快速生成。</p>
    </section>
  `;
}

function EmptyCreateActions() {
  return `
    <section class="persona-empty-actions">
      <button class="primary-button" data-page="personaDistill" data-tour="persona-distill">上传 txt 蒸馏</button>
      <button class="secondary-button warm" data-page="personaTest" data-tour="persona-test">做测试题生成</button>
    </section>
  `;
}

function PersonaCreateSheet(state, activeProfile) {
  return `
    <section class="persona-sheet-backdrop">
      <div class="persona-create-sheet" role="dialog" aria-label="创建或切换嘴替人格">
        <div class="card-title-row">
          <h2>创建 / 切换嘴替</h2>
          <button class="tiny-button" data-action="close-persona-create">关闭</button>
        </div>

        <div class="create-choice-grid">
          <button class="feature-card pink upload-entry" data-page="personaDistill" data-tour="persona-distill">
            <span class="feature-tone">TXT</span>
            <div>
              <h3>上传 txt，蒸馏我的说话方式</h3>
              <p>适合已有聊天记录、剧本、对话文本的用户。</p>
              <b class="enter-pill">开始上传</b>
            </div>
            <span class="feature-arrow">›</span>
          </button>
          <button class="feature-card blue upload-entry" data-page="personaTest" data-tour="persona-test">
            <span class="feature-tone">测</span>
            <div>
              <h3>做一套测试题，生成嘴替人格</h3>
              <p>适合没有聊天记录，或者想快速生成的人。</p>
              <b class="enter-pill">开始测试</b>
            </div>
            <span class="feature-arrow">›</span>
          </button>
        </div>

        ${PersonaList(state, activeProfile)}
      </div>
    </section>
  `;
}

function PersonaList(state, activeProfile) {
  if (!state.personas?.length) {
    return `<p class="section-note">还没有可切换的人格。先创建一个，之后会保存在本机。</p>`;
  }

  return `
    <div class="persona-switch-list">
      <h3>已保存的人格</h3>
      ${state.personas
        .map((profile) => {
          const selected = String(profile.id) === String(activeProfile?.id);
          return `
            <article class="persona-switch-card ${selected ? "selected" : ""}">
              <div>
                <strong>${escapeHtml(getProfileName(profile))}</strong>
                <p>${escapeHtml(getProfileSummary(profile))}</p>
                <div class="tag-row compact-tags">
                  ${getProfileTags(profile)
                    .slice(0, 3)
                    .map((tag) => `<span>${escapeHtml(tag)}</span>`)
                    .join("")}
                  <span>${profile.sourceType === "test" ? "测试题生成" : "txt 蒸馏"}</span>
                  ${profile.source ? AiSourceBadge(profile.source, "真实 AI") : ""}
                </div>
              </div>
              <button class="tiny-button" data-action="set-current-profile" data-profile-id="${escapeAttr(profile.id)}">
                ${selected ? "使用中" : "使用"}
              </button>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function getActiveProfile(state) {
  return (
    state.personas.find((persona) => String(persona.id) === String(state.selectedPersonaId)) ||
    state.currentProfile
  );
}

function getProfileName(profile) {
  return profile.profileName || profile.typeName || profile.name || "我的嘴替";
}

function getProfileSummary(profile) {
  const personaProfile = profile.personaProfile || profile;
  return (
    personaProfile.oneLineSummary ||
    profile.styleProfile?.profileSummary ||
    personaProfile.sourceSummary ||
    profile.subtitle ||
    "已准备按你的风格接话。"
  );
}

function getProfileTags(profile) {
  const personaProfile = profile.personaProfile || profile;
  return (
    personaProfile.personalityTags ||
    profile.tags ||
    profile.dimensions ||
    profile.styleProfile?.commonPhrases ||
    ["专属", "有边界", "会接话"]
  );
}
