import { goalOptions, tempScenarioPresets, toneOptions } from "../data/mockData.js";
import { escapeAttr, escapeHtml } from "../utils/html.js";
import { splitReplyMessages } from "../utils/message.js";

export default function TempArguePage(session) {
  return `
    <div class="page realtime-chat-page temp-chat-page">
      ${TempSettings(session)}
      ${TempChatPanel(session)}
      ${TempInputBar(session)}
      ${session.settingsOpen ? TempSettingsSheet(session) : ""}
    </div>
  `;
}

function TempSettings(session) {
  const scenario = session.generatedScenario;
  return `
    <section class="realtime-settings-card temp-settings-card">
      <div class="settings-title-row">
        <div>
          <span class="persona-kicker">当前临时场景</span>
          <h2>${escapeHtml(scenario?.title || session.who || "临时对手")}</h2>
          <p>${escapeHtml(scenario?.background || session.context || "先补一下前情，嘴替才好接话。")}</p>
        </div>
        <button class="primary-button random-scenario-button" data-action="open-temp-settings">场景设置</button>
      </div>
      ${session.scenarioMessage ? `<p class="section-note compact-status-note">${escapeHtml(session.scenarioMessage)}</p>` : ""}
    </section>
  `;
}

function TempSettingsSheet(session) {
  return `
    <section class="persona-sheet-backdrop">
      <div class="persona-create-sheet compact-settings-sheet" role="dialog" aria-label="临时吵设置">
        <div class="card-title-row">
          <h2>场景设置</h2>
          <button class="tiny-button" data-action="close-temp-settings">完成</button>
        </div>
        <button class="primary-button compact-full-button" data-action="generate-temp-scenario" ${session.scenarioStatus === "loading" ? "disabled" : ""}>
          ${session.scenarioStatus === "loading" ? "生成中..." : "生成临时吵架场景"}
        </button>
        ${session.generatedScenario ? TempScenarioSummary(session.generatedScenario) : ""}
        <div class="preset-row">
          ${tempScenarioPresets
            .map(
              (item, index) => `
                <button class="chip tiny-chip" data-action="use-temp-scenario" data-scenario-index="${index}">
                  ${escapeHtml(item.label)}
                </button>
              `
            )
            .join("")}
        </div>
        <div class="settings-grid">
          ${SmallField("目前对方是谁？", "temp.who", session.who, "比如：客服、同学、对象、室友")}
          ${SmallField("对方第一句话 / 最新一句", "temp.latest", session.latest, "把对方刚刚说的话放这里")}
          ${SmallField("前情提要", "temp.context", session.context, "简单说一下为什么吵起来", "wide")}
        </div>
        <div class="settings-inline-groups">
          <div>
            <span class="mini-field-title">我想要的效果</span>
            ${ChipGroup("goal", goalOptions, session.goal)}
          </div>
          <div>
            <span class="mini-field-title">攻击力</span>
            ${ChipGroup("tone", toneOptions, session.tone, "intensity")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function TempScenarioSummary(scenario) {
  const mainline = scenario.mainline || {};
  return `
    <div class="temp-scenario-summary">
      <div class="temp-result-block">
        <h3>对方人设</h3>
        <p>${escapeHtml(scenario.opponentPersona)}</p>
      </div>
      <div class="temp-result-block">
        <h3>推荐主线</h3>
        <p>${escapeHtml([mainline.fact, mainline.impact, mainline.request, mainline.boundary].filter(Boolean).join(" "))}</p>
      </div>
    </div>
  `;
}

function TempChatPanel(session) {
  const visibleRounds = [...session.rounds];
  return `
    <section class="realtime-chat-panel temp-dialog-panel" aria-label="临时吵实时对话">
      <div class="persona-chat-scroll realtime-chat-scroll">
        ${
          visibleRounds.length
            ? visibleRounds.map(ChatRound).join("")
            : `
              <article class="persona-bubble from-user">
                <span>对方</span>
                <p>${escapeHtml(session.generatedScenario?.openingMessage || session.latest || "先生成场景，或把对方刚说的话发给我。")}</p>
              </article>
              <article class="persona-bubble from-proxy">
                <span>代吵助手</span>
                <p>我会根据上面的场景、人设、目标和攻击力，帮你实时接下一句。</p>
              </article>
            `
        }
      </div>
    </section>
  `;
}

function ChatRound(round) {
  const bestReply = round.replies?.[0]?.text || "";
  const otherReplies = (round.replies || []).slice(1);
  return `
    <article class="realtime-round">
      <div class="persona-bubble from-user">
        <span>对方</span>
        <p>${escapeHtml(round.opponent)}</p>
      </div>
      ${ReplyBubbles(bestReply)}
      <details class="round-more">
        <summary>看分析和备选</summary>
        <div class="temp-result-block">
          <h3>对方话术</h3>
          <p>${escapeHtml(round.analysis)}</p>
        </div>
        <div class="temp-result-block">
          <h3>主线提醒</h3>
          <p>${escapeHtml(round.mainline)}</p>
        </div>
        <div class="reply-list compact-replies">
          ${otherReplies.map(ReplyOption).join("")}
        </div>
      </details>
    </article>
  `;
}

function ReplyBubbles(text) {
  return splitReplyMessages(text)
    .map(
      (piece) => `
        <div class="persona-bubble from-proxy">
          <span>代吵助手</span>
          <p>${escapeHtml(piece)}</p>
          <button class="mini-copy inline-copy" data-copy-reply="${escapeAttr(piece)}">复制</button>
        </div>
      `
    )
    .join("");
}

function TempInputBar(session) {
  return `
    <section class="realtime-input-bar">
      <textarea data-session-input="temp" placeholder="可输入对方新一句，也可以输入你想表达的意思；留空则按对方上一句帮你回。">${escapeHtml(session.input)}</textarea>
      <div class="temp-input-actions">
        <button class="secondary-button warm" data-action="temp-reply-intent" ${session.isSubmitting ? "disabled" : ""}>
          按我的意思回
        </button>
        <button class="primary-button" data-action="temp-reply" ${session.isSubmitting ? "disabled" : ""}>
          ${session.isSubmitting ? "正在接话..." : "帮我回"}
        </button>
      </div>
    </section>
  `;
}

function ReplyOption(reply) {
  return `
    <div class="reply-option">
      <strong>${escapeHtml(reply.label)}</strong>
      <p>${escapeHtml(reply.text)}</p>
      <button class="mini-copy" data-copy-reply="${escapeAttr(reply.text)}">复制发送</button>
    </div>
  `;
}

function SmallField(label, path, value, placeholder, className = "") {
  return `
    <label class="compact-field ${className}">
      <span>${label}</span>
      <textarea data-setup-input="${path}" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value)}</textarea>
    </label>
  `;
}

function ChipGroup(field, options, active, extraClass = "") {
  return `
    <div class="chip-group compact">
      ${options
        .map(
          (item) =>
            `<button class="chip tiny-chip ${extraClass} ${active === item ? "active" : ""}" data-chip-session="temp" data-chip-field="${field}" data-chip-value="${escapeAttr(item)}">${item}</button>`
        )
        .join("")}
    </div>
  `;
}
