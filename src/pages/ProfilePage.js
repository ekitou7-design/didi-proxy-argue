import { historyItems } from "../data/mockData.js";

export default function ProfilePage({ activePersona }) {
  return `
    <div class="page profile-page">
      <section class="profile-hero">
        <div class="profile-face">嘴</div>
        <div>
          <p>我的嘴替人格</p>
          <h2>${activePersona}</h2>
        </div>
      </section>

      <section class="profile-section">
        <h2>历史代吵记录</h2>
        ${historyItems.map((item) => `<button class="list-strip">${item}</button>`).join("")}
      </section>

      <section class="profile-section">
        <h2>偏好设置</h2>
        <button class="list-strip">默认语气：稳定但有气势</button>
        <button class="list-strip">攻击性风险：自动提醒</button>
      </section>

      <section class="privacy-note">
        <h2>隐私说明</h2>
        <p>当前 Demo 使用本地 mock 数据，不上传聊天记录，不连接真实 AI 服务。</p>
      </section>
    </div>
  `;
}
