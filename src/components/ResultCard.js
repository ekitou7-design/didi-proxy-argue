export default function ResultCard({ title = "生成结果", content, footer = "" }) {
  return `
    <section class="result-card">
      <div class="card-title-row">
        <h2>${title}</h2>
        <span class="stamp">可发送</span>
      </div>
      <div class="speech-paper">${content}</div>
      ${footer ? `<div class="result-actions">${footer}</div>` : ""}
    </section>
  `;
}
