import { personaTestQuestions } from "../data/njutiQuizData.js";

export default function PersonaTestPage(state) {
  const answered = Object.values(state.testAnswers || {}).filter(Boolean).length;
  return `
    <div class="page persona-test-page">
      <section class="temp-intro persona-intro">
        <strong>专属嘴替人格测试</strong>
        <p>22 道题测出你的回怼人格。提交后会自动设为当前嘴替，用来生成你的专属回怼话术。</p>
      </section>

      <section class="input-panel setup-panel">
        <div class="card-title-row">
          <h2>做个测试题</h2>
          <span class="stamp">${answered}/${personaTestQuestions.length}</span>
        </div>
        ${personaTestQuestions.map((question) => Question(question, state.testAnswers[question.id])).join("")}
        <div class="button-row">
          <button class="secondary-button warm" data-page="persona">返回</button>
          <button class="primary-button" data-action="submit-persona-test">提交并生成嘴替人格</button>
        </div>
      </section>
    </div>
  `;
}

function Question(question, answer) {
  return `
    <div class="test-question" data-test-question="${question.id}">
      <strong>${question.id}. ${escapeHtml(question.title)}</strong>
      <div class="answer-grid">
        ${question.options
          .map(
            (option) => `
              <button class="answer-chip ${answer === option.value ? "active" : ""}" data-question-id="${question.id}" data-test-answer="${option.value}">
                <b>${option.value}</b> ${escapeHtml(option.label)}
              </button>
            `
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
