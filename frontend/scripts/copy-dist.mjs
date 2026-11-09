import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendDir, "..");
const built = join(frontendDir, "dist", "smart-timer-card.js");

const targets = [
  join(repoRoot, "www", "community", "smart-timer-card", "smart-timer-card.js"),
  join(repoRoot, "custom_components", "smart_timer", "www", "smart-timer-card.js"),
];

for (const target of targets) {
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(built, target);
  console.log("copied", target);
}
