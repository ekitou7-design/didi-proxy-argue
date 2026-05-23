import { personaTestQuestions } from "../data/njutiQuizData.js";

export default function PersonaTestPage(state) {
  return `
    <div class="page persona-test-page">
      <section class="temp-intro persona-intro">
        <strong>嘴替人格测试</strong>
        <p>选最像你真实反应的答案。提交后会回到专属嘴替页，结果会显示在测试卡片下面。</p>
      </section>

      <section class="input-panel setup-panel">
        <div class="card-title-row">
          <h2>做个测试题</h2>
          <span class="stamp">${personaTestQuestions.length} 题</span>
        </div>
        ${personaTestQuestions.map((question) => Question(question, state.testAnswers[question.id])).join("")}
        <div class="button-row">
          <button class="secondary-button warm" data-page="persona">返回</button>
          <button class="primary-button" data-action="submit-persona-test">提交并生成档案</button>
        </div>
      </section>
    </div>
  `;
}

function Question(question, answer) {
  return `
    <div class="test-question" data-test-question="${question.id}">
      <strong>${question.title}</strong>
      <div class="answer-grid">
        ${question.options
          .map(
            (option) => `
              <button class="answer-chip ${answer === option.value ? "active" : ""}" data-question-id="${question.id}" data-test-answer="${option.value}">
                ${option.label}
              </button>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}
