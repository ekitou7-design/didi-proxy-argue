import ResultCard from "../components/ResultCard.js";
import { trainingScenario } from "../data/mockData.js";

export default function TrainingPage(selected) {
  return `
    <div class="page training-page">
      <section class="game-board">
        <div class="versus-line">
          <span>ROUND 01</span>
          <strong>对方发言</strong>
        </div>
        <p class="opponent-bubble">${trainingScenario.opponent}</p>
      </section>

      <section class="answer-list">
        ${trainingScenario.options
          .map(
            (option, index) => `
              <button class="answer-card ${selected === index ? "selected" : ""}" data-answer="${index}">
                <span>${String(index + 1).padStart(2, "0")}</span>
                <p>${option.text}</p>
              </button>
            `
          )
          .join("")}
      </section>

      ${
        selected !== null
          ? ResultCard({
              title: "评分卡",
              content: `
                ${Score("逻辑清晰度", trainingScenario.options[selected].scores.logic)}
                ${Score("情绪稳定度", trainingScenario.options[selected].scores.calm)}
                ${Score("回击力度", trainingScenario.options[selected].scores.power)}
                <div class="risk-box">
                  <strong>风险提醒</strong>
                  <p>${trainingScenario.options[selected].scores.risk}</p>
                </div>
                <div class="better-reply">
                  <strong>优化回复</strong>
                  <p>${trainingScenario.better}</p>
                </div>
              `
            })
          : ""
      }
    </div>
  `;
}

function Score(label, value) {
  return `
    <div class="score-row">
      <span>${label}</span>
      <div class="score-track">
        <i style="width: ${value}%"></i>
      </div>
      <strong>${value}</strong>
    </div>
  `;
}
