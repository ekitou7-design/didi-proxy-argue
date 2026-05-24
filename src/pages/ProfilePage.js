const toneOptions = ["冷静反击", "阴阳怪气", "强硬拒绝", "体面收场", "发疯文学"];
const strengthOptions = ["温和", "中等", "强硬", "发疯"];
const lengthOptions = ["短句", "中等", "详细"];
const mainlineOptions = ["开启", "关闭"];

export default function ProfilePage({ preferences, feishu = {} }) {
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
        <h2>飞书接入</h2>
        <button class="list-strip integration-strip" data-action="open-feishu-settings">
          <strong>飞书接入设置</strong>
          <span>${feishu.savedWebhookUrl ? "已配置推送 Webhook" : "配置推送和自动回复说明"}</span>
        </button>
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

      ${feishu.settingsOpen ? FeishuSettingsSheet(feishu) : ""}
    </div>
  `;
}

function FeishuSettingsSheet(feishu) {
  return `
    <section class="persona-sheet-backdrop feishu-settings-backdrop">
      <div class="feishu-settings-sheet" role="dialog" aria-label="飞书接入设置">
        <div class="card-title-row">
          <h2>飞书接入设置</h2>
          <button class="tiny-button" data-action="close-feishu-settings">关闭</button>
        </div>
        <p class="settings-copy">把 AI 生成的嘴替回复发送到飞书群，或配置飞书机器人自动回复。</p>

        <div class="feishu-settings-block">
          <h3>发送到飞书群</h3>
          <p>推送模式：把 App 里生成的回怼发到飞书群。</p>
          <label class="field">
            <span>飞书群 Webhook URL</span>
            <input
              type="url"
              data-feishu-input="webhookUrl"
              placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
              value="${escapeAttr(feishu.webhookUrl || "")}"
            />
          </label>
          <div class="button-row compact-button-row">
            <button class="secondary-button compact-action" data-action="save-feishu-settings">保存</button>
            <button class="primary-button compact-action" data-action="test-feishu-webhook" ${feishu.testStatus === "sending" ? "disabled" : ""}>
              ${feishu.testStatus === "sending" ? "发送中" : "测试发送"}
            </button>
          </div>
        </div>

        <div class="feishu-settings-block">
          <h3>飞书自动回复机器人</h3>
          <p>自动回复模式：群里 @机器人，机器人自动调用 AI 回复。需要飞书企业自建应用权限。</p>
          <ul class="feishu-check-list">
            <li>企业自建应用</li>
            <li>机器人能力</li>
            <li>事件订阅地址</li>
            <li>消息权限</li>
          </ul>
          <code>/api/feishu/events</code>
        </div>

        ${feishu.status ? `<p class="persona-chat-note">${escapeHtml(feishu.status)}</p>` : ""}
      </div>
    </section>
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
