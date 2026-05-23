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
        <h2>偏好设置</h2>
        <button class="list-strip">默认语气：稳定但有气势</button>
        <button class="list-strip">攻击性风险：自动提醒</button>
      </section>

      <section class="profile-section">
        <h2>账号设置</h2>
        <button class="list-strip">昵称：吵架不跑题选手</button>
        <button class="list-strip">隐私：本地 Demo 数据</button>
      </section>

      <section class="profile-section">
        <h2>使用说明</h2>
        <button class="list-strip">对方说一句，你输入一句，App 一轮一轮帮你接话</button>
        <button class="list-strip">重点是守住主线，不是升级冲突</button>
      </section>
    </div>
  `;
}
