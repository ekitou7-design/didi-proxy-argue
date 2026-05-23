import ResultCard from "../components/ResultCard.js";
import { trainingDifficulties, trainingOpponents, trainingScenes } from "../data/mockData.js";

export default function TrainingPage(training) {
  const opening = training.currentAttack || training.result?.nextAttack || getOpening(training.scene);

  return `
    <div class="page training-page">
      <section class="temp-intro training-intro">
        <strong>回合制吵架小游戏</strong>
        <p>训练不被带偏、守住主线、清楚表达。选场景和对手后，对方先发起攻击，你输入回复，系统打分并推进下一回合。</p>
      </section>

      <section class="game-setup">
        <div class="field-title">选择场景</div>
        <div class="chip-group compact">
          ${trainingScenes
            .map(
              (scene) => `
                <button class="chip ${training.scene === scene ? "active" : ""}" data-training-scene="${scene}">
                  ${scene}
                </button>
              `
            )
            .join("")}
        </div>

        <div class="field-title">选择难度</div>
        <div class="difficulty-grid">
          ${trainingDifficulties
            .map(
              (item) => `
                <button class="difficulty-card ${training.difficulty === item.id ? "active" : ""}" data-training-difficulty="${item.id}">
                  <strong>${item.name}</strong>
                  <span>${item.desc}</span>
                </button>
              `
            )
            .join("")}
        </div>

        <div class="field-title">选择对手类型</div>
        <div class="chip-group compact">
          ${trainingOpponents
            .map(
              (opponent) => `
                <button class="chip ${training.opponentType === opponent ? "active" : ""}" data-training-opponent="${opponent}">
                  ${opponent}
                </button>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="game-board">
        <div class="versus-line">
          <span>ROUND ${String(training.round).padStart(2, "0")}</span>
          <strong>${training.scene}</strong>
        </div>
        <p class="opponent-bubble">${escapeHtml(opening)}</p>
      </section>

      <section class="input-panel">
        <label>
          <span>你的回复</span>
          <textarea class="training-reply-input" data-training-field="reply">${escapeHtml(training.reply)}</textarea>
        </label>
        <button class="primary-button" data-action="score-training">提交本轮回复</button>
      </section>

      ${
        training.result
          ? ResultCard({
              title: "本轮评分",
              content: `
                ${Score("逻辑值", training.result.scores.logic)}
                ${Score("气势值", training.result.scores.power)}
                ${Score("边界感", training.result.scores.boundary)}
                ${Score("主线守护值", training.result.scores.mainline)}
                ${Score("失控风险", training.result.scores.risk, true)}
                ${Score("胜率", training.result.scores.winRate)}
                <div class="risk-box">
                  <strong>你是否被带偏</strong>
                  <p>${training.result.drifted ? "有一点。对方成功把你拖进解释情绪和争输赢里了。" : "没有明显带偏。你基本守住了事实、责任和诉求。"}</p>
                </div>
                <div class="better-reply">
                  <strong>回复优化建议</strong>
                  <p>${training.result.suggestion}</p>
                  <p>${training.result.optimized}</p>
                </div>
                <div class="next-attack">
                  <strong>下一轮对方反击</strong>
                  <p>${training.result.nextAttack}</p>
                </div>
              `,
              footer: `
                <button class="secondary-button" data-action="next-round">进入下一回合</button>
                <button class="secondary-button warm" data-action="finish-training">生成战斗报告</button>
              `
            })
          : ""
      }

      ${
        training.report
          ? ResultCard({
              title: "最终战斗报告",
              content: `
                <div class="battle-report">
                  <h3>${training.report.title}</h3>
                  <p>${training.report.summary}</p>
                  <div class="tag-row">
                    ${training.report.badges.map((badge) => `<span>${badge}</span>`).join("")}
                  </div>
                  <p>${training.report.finalAdvice}</p>
                </div>
              `
            })
          : ""
      }
    </div>
  `;
}

function Score(label, value, danger = false) {
  return `
    <div class="score-row ${danger ? "danger-score" : ""}">
      <span>${label}</span>
      <div class="score-track">
        <i style="width: ${value}%"></i>
      </div>
      <strong>${value}</strong>
    </div>
  `;
}

function getOpening(scene) {
  const openings = {
    宿舍卫生大战: "你也太较真了吧？宿舍又不是你一个人的，凭什么都按你的标准来？",
    情侣冷战: "我都不想说话了，你还非要逼我表态，是不是一定要吵起来你才满意？",
    朋友借钱不还: "不就这点钱吗？你催成这样，搞得我像故意赖账一样。",
    小组作业队友摆烂: "你这么能干你就多做点呗，反正最后大家分数都一样。",
    商家扯皮: "这个不是我们的问题，你自己也没看清楚规则，现在找我们也没用。",
    职场甩锅: "这个需求当时你也在群里，怎么现在出问题就全算我头上？",
    家庭催婚: "我们都是为你好，你现在不听，以后后悔了别怪家里没提醒你。",
    网友阴阳怪气: "哇，你好认真哦，网上说两句也能破防，建议少上网。"
  };
  return openings[scene] || openings.宿舍卫生大战;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
