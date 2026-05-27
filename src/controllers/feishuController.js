import { FEISHU_WEBHOOK_KEY } from "../constants/storageKeys.js";
import { sendToFeishu } from "../services/api.js";

export function openFeishuSettings(app, status = "") {
  const hash = "#/profile";
  if (window.location.hash !== hash) window.location.hash = hash;
  app.setState({
    page: "profile",
    feishu: {
      ...app.state.feishu,
      settingsOpen: true,
      status
    }
  });
}

export function saveFeishuSettings(app) {
  const webhookUrl = app.state.feishu.webhookUrl.trim();
  localStorage.setItem(FEISHU_WEBHOOK_KEY, webhookUrl);
  app.updateFeishu({
    webhookUrl,
    savedWebhookUrl: webhookUrl,
    status: webhookUrl ? "已保存飞书 Webhook。" : "已清空飞书 Webhook。"
  });
}

export async function testFeishuWebhook(app) {
  const webhookUrl = app.state.feishu.webhookUrl.trim();
  if (!webhookUrl) {
    app.updateFeishu({ status: "请先填写飞书群 Webhook URL。" });
    return;
  }

  app.updateFeishu({ testStatus: "sending", status: "正在测试发送..." });
  try {
    await sendToFeishu({ webhookUrl, text: "飞书接入测试：App 已经可以把 AI 回怼推送到群里。" });
    localStorage.setItem(FEISHU_WEBHOOK_KEY, webhookUrl);
    app.updateFeishu({
      savedWebhookUrl: webhookUrl,
      testStatus: "sent",
      status: "测试发送成功。"
    });
  } catch (error) {
    app.updateFeishu({
      testStatus: "error",
      status: `测试发送失败：${error.message}`
    });
  }
}

export async function sendReplyToFeishu(app, turnId) {
  const turn = app.state.proxyPersona.chatTurns.find((item) => String(item.id) === String(turnId));
  if (!turn?.text) return;

  const webhookUrl = app.state.feishu.webhookUrl.trim() || localStorage.getItem(FEISHU_WEBHOOK_KEY) || "";
  if (!webhookUrl) {
    app.updateProxyPersona({ message: "请先配置飞书 Webhook" });
    openFeishuSettings(app, "请先配置飞书 Webhook");
    return;
  }

  updateFeishuStatusForTurn(app, turnId, "sending");
  try {
    await sendToFeishu({ webhookUrl, text: turn.text });
    updateFeishuStatusForTurn(app, turnId, "sent", "已发送到飞书。");
  } catch (error) {
    updateFeishuStatusForTurn(app, turnId, "error", `发送失败：${error.message}`);
  }
}

export function updateFeishuStatusForTurn(app, turnId, status, message = "") {
  app.setState({
    feishu: {
      ...app.state.feishu,
      sendingByTurnId: {
        ...app.state.feishu.sendingByTurnId,
        [turnId]: status
      }
    },
    proxyPersona: {
      ...app.state.proxyPersona,
      message: message || app.state.proxyPersona.message
    }
  });
}
