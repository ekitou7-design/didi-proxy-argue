const personaTestQuestions = [
  {
    id: 1,
    title: "对方说“你又开始了”，你第一反应是？",
    options: [
      { value: "A", label: "直接指出他在转移重点" },
      { value: "B", label: "先解释自己不是故意吵" },
      { value: "C", label: "阴阳回去让他别装" },
      { value: "D", label: "先暂停，等冷静再说" }
    ]
  },
  {
    id: 2,
    title: "你最怕吵架时变成什么？",
    options: [
      { value: "A", label: "被对方压着走" },
      { value: "B", label: "说重话伤关系" },
      { value: "C", label: "明明有理却没气势" },
      { value: "D", label: "吵到失控收不了场" }
    ]
  },
  {
    id: 3,
    title: "你希望嘴替最像你的哪一点？",
    options: [
      { value: "A", label: "逻辑清楚" },
      { value: "B", label: "有礼貌但有边界" },
      { value: "C", label: "会反讽但不低级" },
      { value: "D", label: "能体面结束对话" }
    ]
  },
  {
    id: 4,
    title: "对方开始甩锅时，你想怎么接？",
    options: [
      { value: "A", label: "要求他明确责任" },
      { value: "B", label: "把事实重新说一遍" },
      { value: "C", label: "点破他这套话术" },
      { value: "D", label: "只谈解决方案" }
    ]
  },
  {
    id: 5,
    title: "你的默认强度更接近？",
    options: [
      { value: "A", label: "强硬反击" },
      { value: "B", label: "温柔但有边界" },
      { value: "C", label: "嘴毒但不脏" },
      { value: "D", label: "体面收场" }
    ]
  }
];

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
          <span class="stamp">5 题</span>
        </div>
        ${personaTestQuestions.map((question) => Question(question, state.testAnswers[question.id])).join("")}
        <div class="button-row">
          <button class="secondary-button warm" data-page="persona">返回</button>
          <button class="primary-button" data-action="submit-persona-test">提交并生成档案</button>
        </div>
        ${state.message ? `<p class="section-note">${escapeHtml(state.message)}</p>` : ""}
      </section>
    </div>
  `;
}

function Question(question, answer) {
  return `
    <div class="test-question">
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
