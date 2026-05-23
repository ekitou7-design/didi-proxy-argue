import ResultCard from "../components/ResultCard.js";

export default function PersonaPage({ form, result, copied }) {
  return `
    <div class="page persona-page">
      <section class="temp-intro persona-intro">
        <strong>面向长期关系</strong>
        <p>男朋友、朋友、室友、家人、熟人合作都适合。粘贴聊天记录后，模拟学习你的说话风格，再生成更像你本人、也更有分寸的回复。</p>
      </section>

      <section class="compare-panel">
        <div>
          <strong>临时代吵</strong>
          <p>陌生人、不熟的人。不需要聊天记录，重点是快速输出、有攻击力，解决这一架。</p>
        </div>
        <div>
          <strong>专属嘴替</strong>
          <p>熟人、亲密关系。需要聊天记录，重点是像本人、有分寸，延续这段关系中的对话。</p>
        </div>
      </section>

      <section class="input-panel">
        <label>
          <span>粘贴聊天记录</span>
          <textarea class="chat-log-input" data-persona-field="chatLog">${escapeHtml(form.chatLog)}</textarea>
        </label>
        <label>
          <span>对方最新一句话</span>
          <textarea data-persona-field="latest">${escapeHtml(form.latest)}</textarea>
        </label>
        <label>
          <span>我现在的状态</span>
          <textarea data-persona-field="state">${escapeHtml(form.state)}</textarea>
        </label>
        <label>
          <span>我真实想表达什么</span>
          <textarea data-persona-field="realMessage">${escapeHtml(form.realMessage)}</textarea>
        </label>
        <label>
          <span>我希望达到什么效果</span>
          <textarea data-persona-field="goal">${escapeHtml(form.goal)}</textarea>
        </label>

        <button class="primary-button" data-action="generate-persona">生成专属嘴替</button>
      </section>

      ${ResultCard({
        title: "专属嘴替结果",
        content: `
          ${ResultBlock("你的语言风格分析", result.styleAnalysis)}
          ${ResultBlock("当前吵架主线", result.mainLine)}
          ${ResultBlock("像你本人版回复", result.myVersion, "sendable")}
          ${ResultBlock("更温和版", result.softer)}
          ${ResultBlock("更强硬版", result.harder)}
          ${ResultBlock("暂停对话版", result.pause, "warning")}
        `,
        footer: `
          <button class="secondary-button" data-action="copy-persona">${copied ? "已复制" : "复制本人版"}</button>
          <button class="secondary-button warm" data-action="gentle-persona">先温和一点</button>
        `
      })}
    </div>
  `;
}

function ResultBlock(title, text, type = "") {
  return `
    <article class="temp-result-block ${type}">
      <h3>${title}</h3>
      <p>${escapeHtml(text)}</p>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
