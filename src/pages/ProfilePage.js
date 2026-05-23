const toneOptions = ["冷静反击", "阴阳怪气", "强硬拒绝", "体面收场", "发疯文学"];
const strengthOptions = ["温和", "中等", "强硬", "发疯"];
const lengthOptions = ["短句", "中等", "详细"];
const mainlineOptions = ["开启", "关闭"];

export default function ProfilePage({ preferences }) {
  return `
    <div class="page profile-page">
      <section class="hero-panel compact-hero">
        <div class="brand-lockup">
          <p class="hero-kana">MY SETTINGS</p>
          <h2>我的</h2>
          <p>默认偏好、隐私数据和使用说明都放这里。</p>
        </div>
      </section>

      <section class="profile-section">
        <h2>我的吵架偏好</h2>
        ${PreferenceGroup("默认语气", "tone", toneOptions, preferences.tone)}
        ${PreferenceGroup("默认攻击强度", "strength", strengthOptions, preferences.strength)}
        ${PreferenceGroup("默认回复长度", "length", lengthOptions, preferences.length)}
        ${PreferenceGroup("主线锁定", "mainlineLock", mainlineOptions, preferences.mainlineLock)}
      </section>

      <section class="profile-section">
        <h2>隐私数据</h2>
        <button class="list-strip">聊天内容：仅用于当前 Demo 预览</button>
        <button class="list-strip">测试结果：保存在浏览器 localStorage</button>
        <button class="list-strip">敏感信息：粘贴前建议删掉姓名、电话、地址</button>
      </section>

      <section class="profile-section">
        <h2>使用说明</h2>
        <button class="list-strip">对方说一句，你输入一句，App 一轮一轮帮你接话</button>
        <button class="list-strip">先看话术分析，再选稳妥版、强硬版或嘴替版</button>
        <button class="list-strip">重点是守住主线，不是把冲突无限升级</button>
      </section>
    </div>
  `;
}

function PreferenceGroup(title, field, options, active) {
  return `
    <div class="preference-group">
      <div class="field-title">${title}</div>
      <div class="chip-group">
        ${options
          .map(
            (item) =>
              `<button class="chip ${active === item ? "active" : ""}" data-profile-pref="${field}" data-profile-value="${escapeAttr(item)}">${item}</button>`
          )
          .join("")}
      </div>
    </div>
  `;
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
