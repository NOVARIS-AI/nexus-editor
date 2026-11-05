import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const windows = process.platform === "win32";
const run = (command, args, cwd = process.cwd()) => {
  console.log("\n> " + command + " " + args.join(" "));
  const result = spawnSync(command, args, {
    cwd, stdio: "inherit", shell: windows
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

if (!existsSync(resolve("node_modules"))) {
  console.error("Dependencies are missing. Run npm install first.");
  process.exit(1);
}
if (!process.env.ANDROID_HOME && !process.env.ANDROID_SDK_ROOT) {
  console.error("Android SDK not found. Set ANDROID_HOME or ANDROID_SDK_ROOT before building.");
  process.exit(1);
}
run("npm", ["run", "build"]);
run("npm", ["run", "android:prepare"]);
run("npm", ["run", "android:sync"]);
run("node", ["scripts/generate-android-branding.mjs"]);
const gradle = windows ? "gradlew.bat" : "./gradlew";
run(gradle, ["assembleDebug", "--no-daemon"], resolve("android"));
const apk = resolve("android/app/build/outputs/apk/debug/app-debug.apk");
if (!existsSync(apk)) {
  console.error("Gradle completed but the expected APK was not found: " + apk);
  process.exit(1);
}
console.log("\nAPK created: " + apk);
