import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

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
