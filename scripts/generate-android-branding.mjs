import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const root = "android/app/src/main/res";
const put = async (path, content) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
};
const foreground = '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="512" android:viewportHeight="512"><path android:pathData="M128,356 L128,156 L384,356 L384,156" android:strokeColor="#35E4F2" android:strokeWidth="46" android:strokeLineCap="round" android:strokeLineJoin="round" android:fillColor="@android:color/transparent"/></vector>';
const adaptive = '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/nexus_icon_background"/><foreground android:drawable="@drawable/nexus_launcher_foreground"/></adaptive-icon>';
await put(root + "/drawable/nexus_launcher_foreground.xml", foreground);
await put(root + "/values/nexus_brand.xml", '<resources><color name="nexus_icon_background">#080C16</color></resources>');
await put(root + "/mipmap-anydpi/ic_launcher.xml", foreground);
await put(root + "/mipmap-anydpi/ic_launcher_round.xml", foreground);
await put(root + "/mipmap-anydpi-v26/ic_launcher.xml", adaptive);
await put(root + "/mipmap-anydpi-v26/ic_launcher_round.xml", adaptive);
const manifestPath = "android/app/src/main/AndroidManifest.xml";
let manifest = await readFile(manifestPath, "utf8");
if (/android:icon="[^"]+"/.test(manifest)) manifest = manifest.replace(/android:icon="[^"]+"/, 'android:icon="@mipmap/ic_launcher"');
else manifest = manifest.replace(/<application\b/, '<application android:icon="@mipmap/ic_launcher"');
if (/android:roundIcon="[^"]+"/.test(manifest)) manifest = manifest.replace(/android:roundIcon="[^"]+"/, 'android:roundIcon="@mipmap/ic_launcher_round"');
else manifest = manifest.replace(/<application\b/, '<application android:roundIcon="@mipmap/ic_launcher_round"');
await writeFile(manifestPath, manifest);
console.log("NEXUS launcher and adaptive icon resources applied.");
