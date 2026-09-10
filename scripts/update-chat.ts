import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const websiteRoot = fileURLToPath(new URL("../", import.meta.url));
const whiskerRoot = resolve(websiteRoot, process.argv[2] ?? "../whisker");
const appManifest = resolve(whiskerRoot, "examples/chat/Cargo.toml");
const result = spawnSync(
  "cargo",
  [
    "run",
    "--manifest-path",
    resolve(whiskerRoot, "Cargo.toml"),
    "-p",
    "whisker-cli",
    "--bin",
    "whisker",
    "--",
    "build",
    "web",
    "--manifest-path",
    appManifest,
    "--no-tui",
  ],
  { cwd: whiskerRoot, stdio: "inherit" },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const source = resolve(whiskerRoot, "examples/chat/gen/web/dist");
const destination = resolve(websiteRoot, "public/examples/chat");
const html = await readFile(resolve(source, "index.html"), "utf8");
if (!html.includes('content="/examples/chat/"') || html.includes("new WebSocket")) {
  throw new Error("Expected a production Web build for /examples/chat/.");
}
await mkdir(destination, { recursive: true });
let bytes = 0;
for (const name of ["index.html", "whisker_app.js", "whisker_app_bg.wasm"]) {
  const path = resolve(source, name);
  bytes += (await stat(path)).size;
  await copyFile(path, resolve(destination, name));
}
console.log(`Updated public/examples/chat (${(bytes / 1_000_000).toFixed(2)} MB).`);
