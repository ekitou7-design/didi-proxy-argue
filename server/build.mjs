import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

await Promise.all([
  readFile(join(root, "index.html"), "utf8"),
  readFile(join(root, "src", "main.js"), "utf8"),
  readFile(join(root, "src", "styles.css"), "utf8"),
  readFile(join(root, "public", "app-logo.svg"), "utf8")
]);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await Promise.all([
  cp(join(root, "index.html"), join(dist, "index.html")),
  cp(join(root, "src"), join(dist, "src"), { recursive: true }),
  cp(join(root, "public"), join(dist, "public"), { recursive: true })
]);

console.log("Frontend files built into dist/.");
