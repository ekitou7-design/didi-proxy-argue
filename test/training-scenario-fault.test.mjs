import assert from "node:assert/strict";
import { normalizeScenario } from "../server/services/trainingScenarioService.mjs";

const baseInput = {
  gameConfig: {
    playerRoleKey: "A",
    roleA: {
      name: "角色A",
      description: "有理方 / 提出要求的一方",
      goal: "要求角色B正面回应明确过错"
    },
    roleB: {
      name: "角色B",
      description: "理亏方 / 辩解转移的一方",
      goal: "嘴硬、辩解、转移和拖延"
    }
  }
};

function scenarioFrom({ title, scene, bFault }) {
  return {
    id: title,
    title,
    scene,
    background: scene,
    roleA: baseInput.gameConfig.roleA,
    roleB: {
      ...baseInput.gameConfig.roleB,
      description: `理亏方 / 辩解转移的一方。${bFault}`,
      goal: "嘴硬辩解，试图转移重点，但核心过错已经发生。"
    },
    playerRoleKey: "A",
    aiRoleKey: "B",
    openingMessage: "这事不能全怪我吧，你别这么上纲上线。",
    userGoal: "让角色B回应核心过错。",
    realMainline: "角色A要抓住角色B的明确过错和补救动作。",
    mainline: {
      fact: bFault,
      impact: "角色A的权益或安排受到影响。",
      request: "角色B承认问题并给出补救方案。",
      boundary: "角色B不要把问题转成角色A太计较。"
    },
    stanceJudgment: {
      aJustification: `角色A有事实基础提出要求：${bFault}`,
      bFault,
      disputeFocus: "真正争议焦点是角色B如何补救已经发生的过错。",
      bExcuseSpace: "角色B可以嘴硬说不是故意或不影响大局，但这些借口不能推翻核心过错。",
      aPressurePoint: "角色A应该追问角色B是否承认具体过错以及如何补救。"
    },
    traps: ["转移重点", "说角色A太计较", "要求角色A体谅"],
    trainingFocus: ["抓住事实", "追问补救", "不被带偏"],
    scoreFocus: {
      logic: "是否围绕事实。",
      power: "是否稳住。",
      boundary: "是否守住边界。",
      mainline: "是否围绕主线。",
      risk: "是否避免攻击。"
    }
  };
}

const invalidCases = [
  {
    title: "二手商品坏了但责任不明",
    scene: "角色A从角色B那里买二手相机，收货后发现闪光灯不亮。角色B说发货前测试正常，怀疑角色A使用不当。",
    bFault: "角色B可能没有检查清楚，但发货前测试正常，责任不明。"
  },
  {
    title: "朋友迟到但提前发过消息",
    scene: "朋友迟到四十分钟，但角色B说自己提前发过消息，角色A没看到。",
    bFault: "角色B迟到了，但角色B说提前发过消息，角色A没看到。"
  },
  {
    title: "合租卫生双方都没按排班",
    scene: "合租排班表执行混乱，A/B都没按排班表执行，双方都有责任。",
    bFault: "A/B都没按排班表执行，双方说法不一。"
  },
  {
    title: "项目分工只是A不满意",
    scene: "项目分工纠纷里，角色B说自己完成了，只是角色A不满意。",
    bFault: "角色B说自己完成了，只是角色A不满意，无法确认过错。"
  },
  {
    title: "宠物寄养期间猫受伤责任不明",
    scene:
      "角色A经营宠物寄养店，角色B把猫送来寄养并延期未接。后来角色A发现猫有抓伤和跳蚤，要求角色B支付延期费和医疗费。角色B反过来说猫送来时好好的，是角色A没照顾好。",
    bFault: "角色B延期未接猫，但猫是在角色A寄养店期间出现抓伤和跳蚤，医疗费责任无法确认。"
  }
];

for (const item of invalidCases) {
  assert.throws(
    () => normalizeScenario(scenarioFrom(item), baseInput),
    (error) => error?.code === "INVALID_TRAINING_SCENARIO_FAULT",
    `${item.title} should be invalid`
  );
}

const validCases = [
  {
    title: "隐瞒二手相机瑕疵",
    scene: "角色B明知道二手相机闪光灯间歇失灵，却在出售时写功能全正常，角色A收货后要求处理。",
    bFault: "角色B明知道二手相机闪光灯间歇失灵，却在出售时写功能全正常。"
  },
  {
    title: "连续三次没倒垃圾",
    scene: "角色B连续三次没按合租排班倒垃圾，还把角色A的提醒说成小题大做。",
    bFault: "角色B连续三次没按合租排班倒垃圾，还把角色A的提醒说成小题大做。"
  },
  {
    title: "忘记提交材料",
    scene: "角色B答应帮角色A提交材料却忘了，导致角色A错过截止时间，还反怪角色A没提醒。",
    bFault: "角色B答应帮角色A提交材料却忘了，导致角色A错过截止时间，还反怪角色A没提醒。"
  },
  {
    title: "弄坏东西迟迟不说",
    scene: "角色B借了角色A的东西弄坏了，迟迟不说，还说本来就快坏了。",
    bFault: "角色B借了角色A的东西弄坏了，迟迟不说，还说本来就快坏了。"
  },
  {
    title: "寄养前隐瞒猫已有跳蚤抓伤",
    scene:
      "角色B送猫来寄养前，明知道猫身上已有跳蚤和抓伤却没有告知角色A。角色B延期5天不接猫，角色A多次联系角色B，角色B已读不回，还拒付延期寄养费和额外处理费。",
    bFault: "角色B送猫来寄养前明知道猫身上已有跳蚤和抓伤却没有告知角色A，并延期5天不接猫、已读不回、拒付延期寄养费和额外处理费。"
  }
];

for (const item of validCases) {
  const scenario = normalizeScenario(scenarioFrom(item), baseInput);
  assert.equal(scenario.stanceJudgment.bFault, item.bFault);
  assert.equal(scenario.aiRoleKey, "B");
}

console.log("training scenario fault validation test passed");
