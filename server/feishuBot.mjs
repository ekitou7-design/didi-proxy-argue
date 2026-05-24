import crypto from "node:crypto";
import { generatePersonaReply } from "./personaReplySkill.mjs";

const FEISHU_API_BASE = "https://open.feishu.cn/open-apis";
const FALLBACK_REPLY = "这句我先帮你压住：别急着解释，先抓住对方的问题。";
const processedMessageIds = new Set();

let cachedTenantToken = "";
let cachedTenantTokenExpiresAt = 0;

const defaultFeishuPersonaProfile = {
  profileName: "飞书默认嘴替",
  languageFingerprint: {
    sentenceLength: "短句",
    internetSlangLevel: "中"
  },
  sentencePatterns: ["别把……说成……", "问题不是……是……"],
  replyStructure: ["接住对方一句话", "点破问题", "收口"],
  generationRules: {
    mustKeep: ["简短", "犀利", "一针见血"],
    mustAvoid: ["鸡汤", "咨询腔", "公文腔", "长篇大论"]
  }
};

export async function handleFeishuEvent(request, response) {
  let body;
  try {
    body = normalizeFeishuEventBody(request.body || {});
  } catch (error) {
    console.error("[feishu/events] failed to decrypt event:", error);
    response.status(400).json({ code: 400, msg: "invalid encrypted event" });
    return;
  }

  if (body.challenge) {
    response.json({ challenge: body.challenge });
    return;
  }

  if (!isValidVerificationToken(body)) {
    response.status(403).json({ code: 403, msg: "invalid verification token" });
    return;
  }

  const event = body.event || {};
  const eventType = body.header?.event_type || event.type || body.type;
  if (eventType && eventType !== "im.message.receive_v1") {
    response.json({ code: 0, msg: "success" });
    return;
  }

  const message = event.message || {};
  const parsedMessage = parseFeishuMessage(message, event.sender);

  if (!parsedMessage.messageId || processedMessageIds.has(parsedMessage.messageId)) {
    response.json({ code: 0, msg: "success" });
    return;
  }
  processedMessageIds.add(parsedMessage.messageId);
  trimProcessedMessageIds();

  if (isSelfMessage(event.sender) || parsedMessage.messageType !== "text" || !parsedMessage.text) {
    response.json({ code: 0, msg: "success" });
    return;
  }

  response.json({ code: 0, msg: "success" });

  try {
    const reply = await generateFeishuPersonaReply(parsedMessage.text);
    await sendReplyMessages(parsedMessage.chatId, reply);
  } catch (error) {
    console.error("[feishu/events] failed to generate or send reply:", error);
    await sendReplyMessages(parsedMessage.chatId, FALLBACK_REPLY).catch((sendError) => {
      console.error("[feishu/events] failed to send fallback reply:", sendError);
    });
  }
}

function normalizeFeishuEventBody(body) {
  if (!body.encrypt) return body;

  const encryptKey = process.env.FEISHU_ENCRYPT_KEY;
  if (!encryptKey) {
    throw new Error("FEISHU_ENCRYPT_KEY is required for encrypted Feishu events");
  }

  const decrypted = decryptFeishuEvent(body.encrypt, encryptKey);
  return JSON.parse(decrypted);
}

function decryptFeishuEvent(encryptedText, encryptKey) {
  const key = crypto.createHash("sha256").update(encryptKey).digest();
  const encryptedBuffer = Buffer.from(encryptedText, "base64");
  const iv = encryptedBuffer.subarray(0, 16);
  const encryptedEvent = encryptedBuffer.subarray(16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(encryptedEvent), decipher.final()]).toString("utf8");
}

export async function getFeishuTenantAccessToken() {
  if (cachedTenantToken && Date.now() < cachedTenantTokenExpiresAt) {
    return cachedTenantToken;
  }

  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (!appId || !appSecret) {
    console.warn("[feishu] FEISHU_APP_ID or FEISHU_APP_SECRET is missing; skip sending message.");
    return "";
  }

  const tokenResponse = await fetch(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret
    })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || tokenData.code !== 0 || !tokenData.tenant_access_token) {
    throw new Error(`Feishu tenant_access_token failed: ${tokenData.msg || tokenResponse.status}`);
  }

  cachedTenantToken = tokenData.tenant_access_token;
  cachedTenantTokenExpiresAt = Date.now() + Math.max(60, Number(tokenData.expire || 7200) - 300) * 1000;
  return cachedTenantToken;
}

export async function sendFeishuTextMessage(receiveIdType, receiveId, text) {
  const token = await getFeishuTenantAccessToken();
  if (!token || !receiveId || !text) return null;

  const sendResponse = await fetch(
    `${FEISHU_API_BASE}/im/v1/messages?receive_id_type=${encodeURIComponent(receiveIdType)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        receive_id: receiveId,
        msg_type: "text",
        content: JSON.stringify({ text })
      })
    }
  );

  const sendData = await sendResponse.json();
  if (!sendResponse.ok || sendData.code !== 0) {
    throw new Error(`Feishu send message failed: ${sendData.msg || sendResponse.status}`);
  }

  return sendData;
}

export async function handleFeishuWebhookSend(request, response) {
  const { webhookUrl, text } = request.body || {};

  if (!webhookUrl) {
    response.status(400).json({ error: "webhookUrl is required" });
    return;
  }
  if (!text) {
    response.status(400).json({ error: "text is required" });
    return;
  }

  try {
    const result = await sendFeishuWebhookMessage(webhookUrl, text);
    response.json({ ok: true, result });
  } catch (error) {
    console.error("[feishu/send] failed:", error);
    response.status(502).json({ error: "Feishu webhook send failed", detail: error.message });
  }
}

async function sendFeishuWebhookMessage(webhookUrl, text) {
  const sendResponse = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      msg_type: "text",
      content: {
        text
      }
    })
  });

  const responseText = await sendResponse.text();
  let data = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { raw: responseText };
  }

  const failed =
    !sendResponse.ok ||
    (typeof data.code === "number" && data.code !== 0) ||
    (typeof data.StatusCode === "number" && data.StatusCode !== 0);
  if (failed) {
    throw new Error(data.msg || data.StatusMessage || data.message || responseText || `HTTP ${sendResponse.status}`);
  }

  return data;
}

function isValidVerificationToken(body) {
  const expectedToken = process.env.FEISHU_VERIFICATION_TOKEN;
  if (!expectedToken) return true;
  return body.token === expectedToken || body.header?.token === expectedToken;
}

function parseFeishuMessage(message = {}, sender = {}) {
  const messageType = message.message_type || "";
  const content = parseMessageContent(message.content);
  const rawText = messageType === "text" ? content.text || "" : "";

  return {
    chatId: message.chat_id || "",
    messageId: message.message_id || "",
    messageType,
    sender,
    text: stripBotMentions(rawText, message.mentions)
  };
}

function parseMessageContent(content) {
  if (!content) return {};
  if (typeof content === "object") return content;
  try {
    return JSON.parse(content);
  } catch {
    return { text: String(content) };
  }
}

function stripBotMentions(text, mentions = []) {
  let cleaned = String(text || "")
    .replace(/<at\b[^>]*>.*?<\/at>/gi, "")
    .replace(/@\S+/g, "");

  if (Array.isArray(mentions)) {
    mentions.forEach((mention) => {
      const name = mention.name || mention.key || mention.id?.open_id || "";
      if (name) cleaned = cleaned.replaceAll(`@${name}`, "");
    });
  }

  return cleaned.replace(/\s+/g, " ").trim();
}

function isSelfMessage(sender = {}) {
  if (sender.sender_type === "app" || sender.sender_type === "bot") return true;
  const senderId = sender.sender_id || {};
  return Boolean(process.env.FEISHU_APP_ID && senderId.app_id === process.env.FEISHU_APP_ID);
}

async function generateFeishuPersonaReply(text) {
  try {
    const result = await generatePersonaReply({
      personaProfile: defaultFeishuPersonaProfile,
      background: text,
      sceneContext: text,
      opponentMessage: text,
      goal: "生成简短犀利的回怼",
      mode: "stronger",
      strength: "中等强度"
    });
    return result.reply || result.myStyleReply || result.data?.reply || FALLBACK_REPLY;
  } catch (error) {
    console.error("[feishu/events] personaReplySkill failed:", error);
    return FALLBACK_REPLY;
  }
}

async function sendReplyMessages(chatId, reply) {
  if (!chatId) return;
  const parts = splitReplyMessages(reply);
  for (const part of parts) {
    await sendFeishuTextMessage("chat_id", chatId, part);
  }
}

function splitReplyMessages(reply) {
  const text = String(reply || "").trim();
  if (!text) return [];
  if (text.length <= 80) return [text];

  const parts = text
    .split(/(?<=。)/)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length ? parts : [text];
}

function trimProcessedMessageIds() {
  if (processedMessageIds.size <= 500) return;
  const overflow = processedMessageIds.size - 500;
  let index = 0;
  for (const messageId of processedMessageIds) {
    processedMessageIds.delete(messageId);
    index += 1;
    if (index >= overflow) break;
  }
}
