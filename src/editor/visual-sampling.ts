export type VisualSample = { assetId: string; assetName: string; role: string; timestamp?: number; dataUrl: string };
type VisualAsset = { id: string; name: string; kind: string; duration?: number; file?: File };
function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not encode visual sample."));
    reader.onerror = () => reject(new Error("Could not read visual sample."));
    reader.readAsDataURL(blob);
  });
}
async function canvasSample(source: CanvasImageSource, width: number, height: number): Promise<string> {
  const scale = Math.min(1, 640 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas visual sampling is unavailable.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Could not encode visual sample.")), "image/jpeg", 0.72));
  return toDataUrl(blob);
}
function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error("Timed out sampling a video frame.")); }, 12000);
    const cleanup = () => { window.clearTimeout(timeout); video.removeEventListener("seeked", done); video.removeEventListener("error", failed); };
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("Could not decode a reference video frame.")); };
    video.addEventListener("seeked", done, { once: true });
    video.addEventListener("error", failed, { once: true });
    video.currentTime = Math.max(0, time);
  });
}
export async function captureVisualSamples(assets: VisualAsset[], maxSamples = 8): Promise<VisualSample[]> {
  const output: VisualSample[] = [];
  for (const asset of assets.slice(0, 12)) {
    if (!asset.file || output.length >= maxSamples) continue;
    const url = URL.createObjectURL(asset.file);
    try {
      if (asset.kind === "image") {
        const image = new Image();
        image.src = url;
        await image.decode();
        output.push({ assetId: asset.id, assetName: asset.name, role: "image reference", dataUrl: await canvasSample(image, image.naturalWidth, image.naturalHeight) });
      } else if (asset.kind === "video") {
        const video = document.createElement("video");
        video.muted = true;
        video.preload = "metadata";
        video.src = url;
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error("Could not read video metadata for " + asset.name));
        });
        const duration = Number.isFinite(video.duration) ? video.duration : asset.duration || 0;
        const count = Math.min(4, maxSamples - output.length);
        for (let index = 0; index < count; index++) {
          const timestamp = duration > 0 ? duration * ((index + 0.5) / count) : 0;
          if (duration > 0) await seek(video, Math.min(timestamp, Math.max(0, duration - 0.05)));
          output.push({ assetId: asset.id, assetName: asset.name, role: "video frame sample", timestamp, dataUrl: await canvasSample(video, video.videoWidth, video.videoHeight) });
        }
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return output;
}
