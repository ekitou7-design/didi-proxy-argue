import assert from "node:assert/strict";
import { normalizeTrainingGameConfig, scenarioToGameConfig } from "../src/domain/training.js";
import { normalizeScenarioForCurrentRoles, startTrainingGame } from "../src/controllers/trainingController.js";
import { buildTrainingGamePrompt, normalizeTrainingGameInput } from "../server/services/trainingGameService.mjs";

const previousConfig = normalizeTrainingGameConfig({
  scene: "宿舍里，角色B一直不倒垃圾。",
  playerRoleKey: "B",
  roleA: {
    name: "角色A",
    description: "有理方 / 提出要求的一方",
    goal: "要求角色B回应核心问题"
  },
  roleB: {
    name: "角色B",
    description: "理亏方 / 辩解转移的一方",
    goal: "嘴硬、辩解、转移和拖延"
  }
});

const aiScenario = {
  playerRoleKey: "A",
  aiRoleKey: "B",
  roleA: previousConfig.roleA,
  roleB: previousConfig.roleB,
  openingMessage: "哎呀，不就一点小事吗，你别这么上纲上线。"
};

const config = scenarioToGameConfig(aiScenario, previousConfig);
assert.equal(config.playerRoleKey, "B");
assert.equal(config.aiRoleKey, "A");

const normalizedScenario = normalizeScenarioForCurrentRoles(aiScenario, config);
assert.equal(normalizedScenario.openingMessageSpeaker, "A");
assert.match(normalizedScenario.openingMessage, /别把责任往我身上推|明确说法|正面回应|承认并解释/);
assert.doesNotMatch(normalizedScenario.openingMessage, /不就一点小事|上纲上线|不是故意/);

const input = normalizeTrainingGameInput({
  gameConfig: config,
  openingMessageSpeaker: normalizedScenario.openingMessageSpeaker,
  messages: [{ role: "assistant", content: normalizedScenario.openingMessage }]
});
const prompt = buildTrainingGamePrompt(input);
assert.match(prompt.system, /aiRoleKey=A/);
assert.match(prompt.system, /AI 当前扮演角色摘要：.*角色A\/有理方/s);
assert.match(prompt.system, /真实吵架中的有理方/);
assert.match(prompt.system, /不像法官、班主任、调解员/);
assert.match(prompt.system, /减少机械句式/);
assert.doesNotMatch(prompt.system, /AI 当前扮演角色摘要：.*角色B\/理亏方/s);

const coatConfig = normalizeTrainingGameConfig({
  scene:
    "角色A在二手平台买了一件标注黑色经典款的外套，角色B作为卖家发来了白色外套，还说详情里写了颜色随机。",
  contextSummary:
    "角色A买的是黑色外套，收到的是白色。商品详情没有清楚写明可以随便发色，角色B却说角色A自己没看清楚。",
  userMainline: "让角色B处理退货、退款和运费。",
  playerRoleKey: "B",
  roleA: {
    name: "买家",
    description: "有理方 / 提出要求的一方",
    goal: "要求卖家处理错发货并承担退货退款和运费"
  },
  roleB: {
    name: "卖家",
    description: "理亏方 / 辩解转移的一方",
    goal: "用颜色随机、买家没看清楚来拒绝退款"
  }
});

const coatScenario = {
  title: "卖家发错外套颜色还拿随机狡辩",
  scene: coatConfig.scene,
  background: coatConfig.contextSummary,
  roleA: coatConfig.roleA,
  roleB: coatConfig.roleB,
  playerRoleKey: "B",
  aiRoleKey: "A",
  openingMessageSpeaker: "B",
  openingMessage: "你怎么又来说这个事了？我商品详情里明明写了颜色随机，你自己不看清楚，怪我？",
  stanceJudgment: {
    aJustification: "买家下单目标是黑色外套，收到白色后要求处理有事实基础。",
    bFault: "卖家把买家购买的黑色外套错发成白色，并用不清楚的详情说明拒绝处理。",
    disputeFocus: "焦点是卖家错发货后是否承担退货、退款和运费。",
    bExcuseSpace: "卖家可以嘴硬说页面写过可随机发色，但这不能推翻错发货事实。",
    aPressurePoint: "买家应抓住黑色订单、白色实物和退货退款运费追问。"
  },
  mainline: {
    fact: "买家购买黑色外套，卖家发来白色外套。",
    request: "卖家处理退货、退款和运费。"
  }
};

const app = {
  state: {
    training: {
      gameState: "idle",
      input: "",
      gameConfig: coatConfig,
      generatedScenario: coatScenario,
      messages: [],
      feedbacks: [],
      persuasionScore: 0,
      round: 1
    }
  },
  setState(nextState) {
    this.state = { ...this.state, ...nextState };
  }
};

await startTrainingGame(app);
assert.equal(app.state.training.gameConfig.playerRoleKey, "B");
assert.equal(app.state.training.gameConfig.aiRoleKey, "A");
assert.equal(app.state.training.generatedScenario.openingMessageSpeaker, "A");
assert.equal(app.state.training.generatedScenario.openingMessageUsedFrom, "current_game_config");
assert.equal(app.state.training.generatedScenario.assistantMessageRoleKey, "A");
assert.equal(app.state.training.generatedScenario.assistantMessageRoleName, "买家");
const firstAssistantMessage = app.state.training.messages[0]?.content || "";
assert.match(firstAssistantMessage, /我买的是黑色|你发来的是白色|退货|退款|运费/);
assert.doesNotMatch(firstAssistantMessage, /我商品详情|颜色随机|你自己不看清楚|怪我|不退|凭什么退钱/);

const appWithoutScenario = {
  state: {
    training: {
      gameState: "idle",
      input: "",
      gameConfig: coatConfig,
      generatedScenario: null,
      messages: [],
      feedbacks: [],
      persuasionScore: 0,
      round: 1
    }
  },
  setState(nextState) {
    this.state = { ...this.state, ...nextState };
  }
};

await startTrainingGame(appWithoutScenario);
assert.equal(appWithoutScenario.state.training.gameState, "playing");
assert.equal(appWithoutScenario.state.training.generatedScenario.openingMessageUsedFrom, "current_game_config");
assert.match(appWithoutScenario.state.training.messages[0]?.content || "", /我买的是黑色|你发来的是白色|退货|退款|运费/);

console.log("training role mapping test passed");
