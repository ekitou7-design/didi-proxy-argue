import { realtimeRecords } from "../data/mockData.js";

export default function RecordsPage() {
  return `
    <div class="page records-page">
      <section class="profile-section">
        <h2>全部历史记录</h2>
        <p class="section-note">临时代吵、专属嘴替和训练场记录都放在这里，方便回看。</p>
      </section>

      ${realtimeRecords
        .map(
          (record) => `
            <section class="record-card">
              <div class="card-title-row">
                <h2>${record.type}</h2>
                <span class="stamp">${record.rounds} 轮</span>
              </div>
              <p><strong>场景：</strong>${record.scene}</p>
              <p><strong>时间：</strong>${record.time}</p>
              <p><strong>目标：</strong>${record.goal}</p>
              <p><strong>摘要：</strong>${record.summary}</p>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}
