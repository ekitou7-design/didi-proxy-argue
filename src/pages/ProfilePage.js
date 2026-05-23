export default function ProfilePage({ activePersona, profiles = [] }) {
  return `
    <div class="page profile-page">
      <section class="profile-hero">
        <div class="profile-face">嘴</div>
        <div>
          <p>当前嘴替人格</p>
          <h2>${escapeHtml(activePersona || "还没选择")}</h2>
        </div>
      </section>

      <section class="profile-section">
        <h2>关系档案</h2>
        <button class="list-strip">已保存 ${profiles.length} 个长期关系档案</button>
        <button class="list-strip">默认语气：稳定、有边界、不乱骂</button>
      </section>

      <section class="profile-section">
        <h2>隐私</h2>
        <button class="list-strip">本地 Demo 数据，刷新服务后内存档案会清空</button>
        <button class="list-strip">上传聊天记录前，建议删除姓名、手机号、地址</button>
      </section>

      <section class="profile-section">
        <h2>使用说明</h2>
        <button class="list-strip">重点是：对方说一句，你告诉我一句，App 帮你实时接话</button>
        <button class="list-strip">守住主线，不被偷换概念、甩锅和情绪压迫带跑</button>
      </section>
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
