import ResultCard from "../components/ResultCard.js";
import { personas, tempIntensities } from "../data/mockData.js";

export const initialTempForm = {
  scene: "朋友临时取消约定，还说我太计较。",
  opponent: "不就是改个时间吗？你怎么这么事多？",
  goal: "表达不满，但不想彻底闹翻。"
};

export default function TempArguePage({ form, personaId, intensity, result, copied }) {
  return `
    <div class="page form-page">
      <section class="temp-intro">
        <strong>面向一次性冲突</strong>
        <p>陌生人、网友、商家、同学、队友、路人都能用。不读取聊天记录，只根据当前场景快速出话术。</p>
      </section>

      <section class="input-panel">
        <label>
          <span>发生了什么？</span>
          <textarea data-field="scene">${escapeHtml(form.scene)}</textarea>
        </label>
        <label>
          <span>对方说了什么？</span>
          <textarea data-field="opponent">${escapeHtml(form.opponent)}</textarea>
        </label>
        <label>
          <span>你想达到什么目的？</span>
          <textarea data-field="goal">${escapeHtml(form.goal)}</textarea>
        </label>

        <div class="field-title">我想用什么人格？</div>
        <div class="chip-group" aria-label="代吵人格选择">
          ${personas
            .map(
              (persona) => `
                <button class="chip ${personaId === persona.id ? "active" : ""}" data-temp-persona="${persona.id}">
                  ${persona.name}
                </button>
              `
            )
            .join("")}
        </div>

        <div class="field-title">输出强度</div>
        <div class="chip-group intensity-group" aria-label="输出强度选择">
          ${tempIntensities
            .map(
              (item) => `
                <button class="chip intensity ${intensity === item ? "active" : ""}" data-intensity="${item}">
                  ${item}
                </button>
              `
            )
            .join("")}
        </div>

        <button class="primary-button" data-action="generate">生成嘴替</button>
      </section>

      ${ResultCard({
        title: "临时代吵结果",
        content: `
          ${ResultBlock("吵架主线", result.mainLine)}
          ${ResultBlock("推荐回复", result.recommended, "sendable")}
          ${ResultBlock("更强硬版", result.harder)}
          ${ResultBlock("更体面版", result.decent)}
          ${ResultBlock("跑题提醒", result.offTopic, "warning")}
        `,
        footer: `
          <button class="secondary-button" data-action="copy">${copied ? "已复制" : "复制"}</button>
          <button class="secondary-button warm" data-action="remix">再来一版</button>
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
