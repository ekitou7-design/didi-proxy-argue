import { features, navItems, proxyReplyModes, proxyReplyStrengths, toneOptions } from "../data/mockData.js";
import { FeatureIcon } from "../components/FeatureIcon.js";
import { getCurrentProxyProfile, getProfileName, getProfileTagsForLayout } from "../domain/persona.js";
import { getGameConfig, TrainingPreviewContent } from "../pages/TrainingPage.js";
import { escapeAttr, escapeHtml } from "../utils/html.js";

export function TopNav(activePage) {
  return `
    <nav class="web-top-nav" aria-label="顶部导航">
      <button class="web-brand" data-page="temp">
        <img src="/public/app-logo.svg" alt="" />
        <span>滴滴代吵</span>
      </button>
      <div class="web-nav-links">
        ${navItems
          .map(
            (item) => `
              <button class="web-nav-link ${activePage === item.key ? "active" : ""}" data-page="${item.key}">
                ${item.label}
              </button>
            `
          )
          .join("")}
      </div>
    </nav>
  `;
}

export function DesktopSidebar(state) {
  const activePage = state.page;
  const profile = getCurrentProxyProfile(state.proxyPersona);
  const isTempPage = activePage === "temp";
  return `
    <section class="desktop-panel">
      <h2>功能入口</h2>
      <div class="desktop-mode-list">
        ${features
          .map(
            (feature) => `
              <button class="desktop-mode-card ${activePage === feature.key ? "active" : ""}" data-page="${feature.key}">
                <b class="feature-icon">${FeatureIcon(feature.key)}</b>
                <span>${feature.title}</span>
              </button>
            `
          )
          .join("")}
      </div>
    </section>
    <section class="desktop-panel">
      <h2>最近状态</h2>
      <p>临时吵：${state.temp.rounds.length} 轮</p>
      <p>专属嘴替：${state.proxyPersona.chatTurns.length} 条消息</p>
      <p>训练场：第 ${state.training.round || 1} 轮</p>
    </section>
    ${
      isTempPage
        ? ""
        : `
          <section class="desktop-panel">
            <h2>当前人格</h2>
            <p>${profile ? escapeHtml(getProfileName(profile)) : "还没创建嘴替人格"}</p>
            <div class="desktop-tag-row">
              ${getProfileTagsForLayout(profile).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
            </div>
          </section>
        `
    }
  `;
}

export function DesktopContextPanel(state) {
  if (state.page === "persona") return PersonaDesktopContext(state.proxyPersona);
  if (state.page === "training") return TrainingDesktopContext(state.training);
  if (state.page === "records") return SimpleDesktopContext("记录", "这里会沉淀你的临时吵、专属嘴替和训练结果。");
  if (state.page === "profile") return SimpleDesktopContext("我的", "管理偏好、飞书同步和后续账号设置。");
  return TempDesktopContext(state.temp);
}

export function TempDesktopContext(temp) {
  return `
    <section class="desktop-panel context-panel">
      <h2>主线锁定</h2>
      ${DesktopField("和谁吵", "temp.who", temp.who, "客服、室友、对象、同事")}
      ${DesktopField("对方说了什么", "temp.latest", temp.latest, "对方刚刚那句话")}
      ${DesktopField("前情提要", "temp.context", temp.context, "为什么吵起来")}
      ${DesktopField("我的诉求", "temp.goal", temp.goal, "想达成什么结果")}
      <h3>语气强度</h3>
      ${DesktopChipGroup("temp", "tone", toneOptions, temp.tone)}
    </section>
  `;
}

export function PersonaDesktopContext(proxyPersona) {
  const profile = getCurrentProxyProfile(proxyPersona);
  return `
    <section class="desktop-panel context-panel">
      <h2>嘴替人格</h2>
      <p>${profile ? escapeHtml(getProfileName(profile)) : "还没有专属嘴替"}</p>
      <div class="desktop-tag-row">
        ${getProfileTagsForLayout(profile).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      </div>
      <button class="secondary-button warm compact-full-button" data-action="open-persona-create">创建 / 切换人格</button>
      <button class="secondary-button compact-full-button" data-page="personaDistill">上传 txt 蒸馏</button>
      <button class="secondary-button compact-full-button" data-page="personaTest">做人格测试</button>
      <h3>生成策略</h3>
      ${DesktopChipGroup("proxyPersona.replyForm", "mode", proxyReplyModes, proxyPersona.replyForm.mode)}
      ${DesktopChipGroup("proxyPersona.replyForm", "strength", proxyReplyStrengths, proxyPersona.replyForm.strength)}
      ${DesktopField("前情提要", "proxyPersona.replyForm.background", proxyPersona.replyForm.background, "这次冲突的背景")}
      ${DesktopField("我想表达", "proxyPersona.replyForm.goal", proxyPersona.replyForm.goal, "想守住的主线")}
    </section>
  `;
}

export function TrainingDesktopContext(training) {
  const config = getGameConfig(training);
  return `
    <section class="desktop-panel context-panel">
      ${TrainingPreviewContent(training, config)}
    </section>
  `;
}

export function SimpleDesktopContext(title, text) {
  return `<section class="desktop-panel context-panel"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></section>`;
}

export function DesktopField(label, path, value, placeholder) {
  return `
    <label class="desktop-field">
      <span>${escapeHtml(label)}</span>
      <textarea data-setup-input="${path}" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value)}</textarea>
    </label>
  `;
}

export function DesktopChipGroup(sessionKey, field, options, active, labelFormatter = (item) => item) {
  return `
    <div class="desktop-chip-group">
      ${options
        .map(
          (item) => `<button class="chip tiny-chip ${active === item ? "active" : ""}" data-chip-session="${sessionKey}" data-chip-field="${field}" data-chip-value="${escapeAttr(item)}">${escapeHtml(labelFormatter(item))}</button>`
        )
        .join("")}
    </div>
  `;
}
