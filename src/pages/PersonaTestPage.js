import { dedicatedPersonaQuizQuestions } from "../data/njutiQuizData.js";

export default function PersonaTestPage(state) {
  const answered = Object.values(state.testAnswers || {}).filter(Boolean).length;
  return `
    <div class="page persona-test-page">
      <section class="flow-hero persona-intro">
        <div>
          <strong>嘴替人格测试</strong>
          <p>不用上传聊天记录，答完 8 道题，也能先生成一个能用的专属嘴替。</p>
        </div>
        <button class="tiny-button" data-page="persona">返回</button>
      </section>

      <section class="input-panel setup-panel quiz-flow-panel">
        <div class="card-title-row">
          <h2>选最像你的反应</h2>
          <span class="stamp">${answered}/${dedicatedPersonaQuizQuestions.length}</span>
        </div>
        ${dedicatedPersonaQuizQuestions.map((question) => Question(question, state.testAnswers[question.id])).join("")}
        <div class="button-row">
          <button class="primary-button" data-action="submit-persona-test">生成嘴替人格</button>
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
