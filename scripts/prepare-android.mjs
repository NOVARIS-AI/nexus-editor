import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const androidDir = resolve("android");
if (existsSync(resolve(androidDir, "app/build.gradle"))) {
  console.log("Capacitor Android project already exists; keeping it.");
  process.exit(0);
}
console.log("Creating the Capacitor Android project…");
const result = spawnSync("npx", ["cap", "add", "android"], {
  stdio: "inherit",
  shell: process.platform === "win32"
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
