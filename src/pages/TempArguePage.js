import ResultCard from "../components/ResultCard.js";
import { tempStyles } from "../data/mockData.js";

export const initialTempForm = {
  scene: "朋友临时取消约定，还说我太计较。",
  opponent: "不就是改个时间吗？你怎么这么事多？",
  goal: "表达不满，但不想彻底闹翻。"
};

export default function TempArguePage({ form, style, reply, copied }) {
  return `
    <div class="page form-page">
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

        <div class="chip-group" aria-label="风格选择">
          ${tempStyles
            .map(
              (item) => `
                <button class="chip ${style === item ? "active" : ""}" data-style="${item}">
                  ${item}
                </button>
              `
            )
            .join("")}
        </div>

        <button class="primary-button" data-action="generate">生成嘴替</button>
      </section>

      ${ResultCard({
        content: `<p>${escapeHtml(reply)}</p>`,
        footer: `
          <button class="secondary-button" data-action="copy">${copied ? "已复制" : "复制"}</button>
          <button class="secondary-button warm" data-action="remix">再来一版</button>
        `
      })}
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
