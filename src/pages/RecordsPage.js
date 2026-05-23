import { realtimeRecords } from "../data/mockData.js";

export default function RecordsPage({ temp, persona, training } = {}) {
  const liveRecords = [
    temp?.rounds?.length
      ? {
          type: "临时代吵记录",
          object: temp.who,
          context: temp.context,
          goal: temp.goal,
          rounds: temp.rounds.length,
          time: "刚刚"
        }
      : null,
    persona?.rounds?.length
      ? {
          type: "专属嘴替记录",
          object: persona.who,
          context: persona.context,
          goal: persona.goal,
          rounds: persona.rounds.length,
          time: "刚刚"
        }
      : null,
    training?.feedbacks?.length
      ? {
          type: "吵架训练记录",
          object: training.scene,
          context: "多轮训练对话",
          goal: "练习守住主线",
          rounds: training.feedbacks.length,
          time: "刚刚"
        }
      : null
  ].filter(Boolean);

  return `
    <div class="page records-page">
      <section class="profile-section">
        <h2>全部历史记录</h2>
        <p class="section-note">临时代吵、专属嘴替和训练场记录都会放在这里，方便回看。</p>
      </section>

      ${[...liveRecords, ...realtimeRecords].map(RecordCard).join("")}
    </div>
  `;
}

function RecordCard(record) {
  return `
    <section class="record-card">
      <div class="card-title-row">
        <h2>${escapeHtml(record.type)}</h2>
        <span class="stamp">${record.rounds} 轮</span>
      </div>
      <p><strong>关系对象：</strong>${escapeHtml(record.object)}</p>
      <p><strong>前情摘要：</strong>${escapeHtml(record.context)}</p>
      <p><strong>目标：</strong>${escapeHtml(record.goal)}</p>
      <p><strong>最近一次：</strong>${escapeHtml(record.time)}</p>
    </section>
  `;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
