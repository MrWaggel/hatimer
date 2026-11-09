import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  join(rootDir, "..", "www", "community", "smart-timer-card", "smart-timer-card.js"),
];

for (const target of targets) {
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(rootDir, "dist", "smart-timer-card.js"), target);
  console.log("copied", target);
}