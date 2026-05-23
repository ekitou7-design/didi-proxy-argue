import { goalOptions, makeContextSummary, toneOptions, whoOptions } from "../data/mockData.js";
import { ChatRound } from "./TempArguePage.js";

export default function PersonaPage(session, profiles) {
  if (session.step === "chat") return ChatPage(session);

  return `
    <div class="page persona-page">
      <section class="temp-intro persona-intro">
        <strong>熟人关系，保存成嘴替档案</strong>
        <p>下次可以直接选已有关系开吵，不必每次重新输入全部背景。也可以继续补充对方的新话术。</p>
      </section>

      <section class="profile-section profile-picker">
        <h2>已有关系档案</h2>
        ${profiles.map((profile) => ProfileCard(profile, session.profileId)).join("")}
      </section>

      <section class="input-panel setup-panel">
        ${Field("关系对象", "persona.who", session.who, "比如：谈了 3 个月的男友、经常阴阳怪气的室友")}
        ${ChipGroup("persona", "who", whoOptions, session.who)}
        ${Field("你们的关系", "persona.relation", session.relation, "比如：刚在一起 3 个月，还在磨合边界。")}
        ${Field("常见矛盾", "persona.commonConflict", session.commonConflict, "比如：他经常不回消息，临时改约后又说我太敏感。")}
        ${Field("对方常用话术", "persona.tactics", session.tactics, "比如：你又开始了、这点小事、我都这么累了。")}
        ${Field("我的说话风格", "persona.style", session.style, "比如：我平时不爱说狠话，会先解释原因，但容易解释太多。")}
        ${Field("我的表达底线", "persona.boundary", session.boundary, "比如：不要骂脏话、不要提分手、不要牵扯家人。")}
        ${Field("我希望 App 帮我做到什么", "persona.expectation", session.expectation, "比如：帮我说得像本人，但更短、更稳、更有压迫感。")}

        ${Field("前情提要", "persona.context", session.context, "比如：昨天约好一起吃饭，他临时说要和朋友出去，我表达不满后他说我太敏感。", "long-field", "写得越具体，App 越能帮你抓住主线。")}
        ${Field("对方刚刚说了什么？", "persona.latest", session.latest, "把对方最新一句话复制或转述到这里。")}
        ${Field("你想达到什么目的？", "persona.goal", session.goal, "比如：我想让他知道我不是无理取闹，而是希望他尊重约定。")}
        ${ChipGroup("persona", "goal", goalOptions, session.goal)}
        ${Field("你希望用什么语气？", "persona.tone", session.tone, "比如：像我平时说话一样，不要太官方，但要有压迫感。")}
        ${ChipGroup("persona", "tone", toneOptions, session.tone)}

        <div class="button-row">
          <button class="secondary-button warm" data-action="save-persona-profile">保存关系档案</button>
          <button class="primary-button" data-action="start-persona-chat">开始实时接话</button>
        </div>
      </section>
    </div>
  `;
}

function ChatPage(session) {
  const summary = makeContextSummary(session);
  return `
    <div class="page chat-page">
      <section class="chat-status persona-status">
        <div class="status-head">
          <strong>专属嘴替接管中</strong>
          <button class="tiny-button" data-action="edit-persona-setup">修改背景</button>
        </div>
        <p>对象：${escapeHtml(summary.object)}</p>
        <p>目标：${escapeHtml(summary.goal)}</p>
        <p>语气：${escapeHtml(summary.tone)}</p>
      </section>

      <section class="chat-log">
        ${session.rounds.length ? session.rounds.map(ChatRound).join("") : EmptyChat("贴对方最新一句，我按你的关系档案和说话风格接。")}
      </section>

      <section class="chat-composer">
        <textarea data-session-input="persona" placeholder="对方又说了什么？">${escapeHtml(session.input)}</textarea>
        <button class="primary-button" data-action="persona-reply">帮我接一句</button>
      </section>
    </div>
  `;
}

function ProfileCard(profile, activeId) {
  return `
    <button class="persona-card ${activeId === profile.id ? "selected" : ""}" data-load-profile="${profile.id}">
      <span class="persona-avatar">档</span>
      <div>
        <h2>${escapeHtml(profile.name)}</h2>
        <p>${escapeHtml(profile.commonConflict)}</p>
        <div class="tag-row">
          <span>${escapeHtml(profile.relation || "长期关系")}</span>
          <span>${escapeHtml(profile.expectation || "实时接话")}</span>
        </div>
      </div>
    </button>
  `;
}

function Field(label, path, value, placeholder, className = "", hint = "") {
  return `
    <label class="${className}">
      <span>${label}</span>
      <textarea data-setup-input="${path}" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value)}</textarea>
      ${hint ? `<small>${hint}</small>` : ""}
    </label>
  `;
}

function ChipGroup(sessionKey, field, options, active) {
  return `
    <div class="chip-group">
      ${options
        .map(
          (item) =>
            `<button class="chip ${active === item ? "active" : ""}" data-chip-session="${sessionKey}" data-chip-field="${field}" data-chip-value="${escapeAttr(item)}">${item}</button>`
        )
        .join("")}
    </div>
  `;
}

function EmptyChat(text) {
  return `<div class="empty-chat">${text}</div>`;
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
