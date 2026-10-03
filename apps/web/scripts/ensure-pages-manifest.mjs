import fs from "node:fs";
import path from "node:path";

const nextDir = path.resolve(".next");
const targets = [path.join(nextDir, "server")];

// Standalone output can sit at .next/standalone/.next or nested (e.g. apps/web/.next)
const standalone = path.join(nextDir, "standalone");
const walk = (dir, depth) => {
  if (depth > 3 || !fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === "node_modules") continue;
    const p = path.join(dir, e.name);
    if (e.name === ".next") targets.push(path.join(p, "server"));
    else walk(p, depth + 1);
  }
};
walk(standalone, 0);

for (const dir of targets) {
  if (!fs.existsSync(dir)) continue;
  const file = path.join(dir, "pages-manifest.json");
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "{}");
    console.log(`[ensure-pages-manifest] wrote ${file}`);
  }
}