import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import {
  mockGeneratePersonaFromChat,
  mockGeneratePersonaFromTest,
  mockGenerateReply
} from "./server/proxyPersonaAi.mjs";
import {
  createArguePersona,
  findArguePersona,
  listArguePersonas
} from "./server/proxyPersonaStore.mjs";

const root = process.cwd();
const port = Number(process.env.PORT || 3000);
const isCheck = process.argv.includes("--check");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

async function resolvePath(url) {
  const pathname = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname);
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, safePath === "/" ? "index.html" : safePath);
  const fileStat = await stat(filePath);
  return fileStat.isDirectory() ? join(filePath, "index.html") : filePath;
}

if (isCheck) {
  await Promise.all([
    readFile(join(root, "index.html"), "utf8"),
    readFile(join(root, "src", "main.js"), "utf8"),
    readFile(join(root, "src", "styles.css"), "utf8")
  ]);
  console.log("Static app files are present.");
  process.exit(0);
}

createServer(async (request, response) => {
  try {
    if ((request.url || "").startsWith("/api/")) {
      await handleApi(request, response);
      return;
    }

    const filePath = await resolvePath(request.url || "/");
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": types[extname(filePath)] || "application/octet-stream"
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, () => {
  console.log(`滴滴代吵 Demo running at http://localhost:${port}`);
});

async function handleApi(request, response) {
  const url = new URL(request.url || "/", `http://localhost:${port}`);

  if (request.method === "POST" && url.pathname === "/api/proxy-persona/upload-chat") {
    const body = await readJson(request);
    if (!body.userId || !body.chatText) {
      return sendJson(response, 400, { error: "userId and chatText are required" });
    }
    const persona = createArguePersona(mockGeneratePersonaFromChat(body));
    return sendJson(response, 200, { persona });
  }

  if (request.method === "POST" && url.pathname === "/api/proxy-persona/test-result") {
    const body = await readJson(request);
    if (!body.userId || !Array.isArray(body.answers)) {
      return sendJson(response, 400, { error: "userId and answers are required" });
    }
    const persona = createArguePersona(mockGeneratePersonaFromTest(body));
    return sendJson(response, 200, { persona });
  }

  if (request.method === "GET" && url.pathname === "/api/proxy-persona/list") {
    const userId = url.searchParams.get("userId");
    if (!userId) return sendJson(response, 400, { error: "userId is required" });
    return sendJson(response, 200, { personas: listArguePersonas(userId) });
  }

  if (request.method === "POST" && url.pathname === "/api/proxy-reply/generate") {
    const body = await readJson(request);
    const persona = findArguePersona({ userId: body.userId, personaId: body.personaId });
    if (!persona) return sendJson(response, 404, { error: "persona not found" });
    return sendJson(response, 200, mockGenerateReply({ persona, ...body }));
  }

  return sendJson(response, 404, { error: "api not found" });
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        request.destroy();
        reject(new Error("request body too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}
