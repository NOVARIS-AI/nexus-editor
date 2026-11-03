import { Capacitor } from "@capacitor/core";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function pickNativeMediaFiles(types: string[]): Promise<File[]> {
  if (!isNativeAndroid()) throw new Error("The native Android picker is only available inside the APK.");
  const result = await FilePicker.pickFiles({ types, multiple: true, readData: false });
  const picked: File[] = [];
  for (const item of result.files) {
    const source = item.webPath || item.path;
    if (!source) continue;
    const response = await fetch(source);
    if (!response.ok) throw new Error("Android could not open " + item.name + ". Try choosing it again.");
    const blob = await response.blob();
    const mimeType = item.mimeType || blob.type || "application/octet-stream";
    picked.push(new File([blob], item.name || "nexus-media", { type: mimeType, lastModified: Date.now() }));
  }
  if (!picked.length && result.files.length) throw new Error("Android selected the files but could not expose them to the editor. Please try another file location.");
  return picked;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The export could not be prepared for Android storage."));
    reader.onload = () => {
      const value = String(reader.result || "");
      const comma = value.indexOf(",");
      if (comma < 0) reject(new Error("The export data could not be encoded."));
      else resolve(value.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

export async function saveExportOnAndroid(blob: Blob, filename: string): Promise<string> {
  if (!isNativeAndroid()) throw new Error("Android export storage is unavailable outside the APK.");
  // Avoid a second huge in-memory copy on phones with limited RAM.
  if (blob.size > 180 * 1024 * 1024) throw new Error("This export is too large for the safe Android file-save path on this device. Export a shorter section or lower the resolution.");
  const safeName = filename.replace(/[^a-z0-9._-]/gi, "-").slice(0, 120) || "nexus-export.mp4";
  const data = await blobToBase64(blob);
  const saved = await Filesystem.writeFile({
    path: "NEXUS Exports/" + safeName,
    directory: Directory.Documents,
    recursive: true,
    data
  });
  try {
    await Share.share({ title: "NEXUS Studio export", text: "Your edited video is ready.", url: saved.uri, dialogTitle: "Share or save your NEXUS export" });
  } catch {
    // The file is already saved; sharing is optional and may be dismissed.
  }
  return saved.uri;
}
