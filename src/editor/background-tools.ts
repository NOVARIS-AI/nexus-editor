export type BackgroundProgress = { status: string; progress?: number };

/** Locally segments a still image with MODNet and returns a transparent PNG.
 * The model is downloaded/cached by Transformers.js on first use; no image is uploaded to NEXUS. */
export async function removeImageBackground(file: File, onProgress?: (progress: BackgroundProgress) => void): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("AI background removal currently supports still images. Use Chroma Key for video clips.");
  const { pipeline, env } = await import("@huggingface/transformers");
  env.allowLocalModels = false;
  env.useBrowserCache = true;
  const segmenter = await pipeline("image-segmentation", "Xenova/modnet", {
    progress_callback: (event: BackgroundProgress) => onProgress?.(event)
  });
  const result = await segmenter(file);
  const first = Array.isArray(result) ? result[0] : result;
  const mask = first && typeof first === "object" ? (first as { mask?: { data?: ArrayLike<number>; width?: number; height?: number } }).mask : undefined;
  if (!mask?.data || !mask.width || !mask.height) throw new Error("The segmentation model returned no usable subject mask.");
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("This browser cannot create an image mask.");
    ctx.drawImage(image, 0, 0);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const values = mask.data;
    const mw = mask.width, mh = mask.height;
    for (let y = 0; y < canvas.height; y++) {
      const my = Math.min(mh - 1, Math.floor(y / canvas.height * mh));
      for (let x = 0; x < canvas.width; x++) {
        const mx = Math.min(mw - 1, Math.floor(x / canvas.width * mw));
        const sourceIndex = my * mw + mx;
        const value = Number(values[sourceIndex] ?? 0);
        const alpha = value <= 1 ? value * 255 : value;
        frame.data[(y * canvas.width + x) * 4 + 3] = Math.max(0, Math.min(255, Math.round(alpha)));
      }
    }
    ctx.putImageData(frame, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Could not encode the transparent image.")), "image/png"));
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "-background-removed.png", { type: "image/png" });
  } finally {
    image.close();
  }
}

/** Removes a sampled/selected colour from a still image with a soft alpha edge. */
export async function eraseImageColour(file: File, colour: string, tolerance: number, softness: number): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Colour Eraser currently supports still images. Use Chroma Key for video.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("This browser cannot edit image pixels.");
    ctx.drawImage(bitmap, 0, 0);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hex = /^#?[0-9a-f]{6}$/i.test(colour) ? colour.replace("#", "") : "00ff00";
    const key = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
    const threshold = Math.max(0, Math.min(442, tolerance)) * 1.732;
    const feather = Math.max(1, Math.min(160, softness) * 1.732);
    for (let i = 0; i < frame.data.length; i += 4) {
      const distance = Math.hypot(frame.data[i] - key[0], frame.data[i + 1] - key[1], frame.data[i + 2] - key[2]);
      const coverage = Math.max(0, Math.min(1, (distance - threshold) / feather));
      frame.data[i + 3] = Math.round(frame.data[i + 3] * coverage);
    }
    ctx.putImageData(frame, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Could not encode the erased image.")), "image/png"));
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "-colour-erased.png", { type: "image/png" });
  } finally { bitmap.close(); }
}

export async function createBackgroundFile(name: string, css: string): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot create a background.");
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  const stops = css.match(/#[0-9a-f]{6}/gi) || ["#24112d", "#713b79", "#c17ccb"];
  gradient.addColorStop(0, stops[0]);
  gradient.addColorStop(.55, stops[1] || stops[0]);
  gradient.addColorStop(1, stops[2] || stops[1] || stops[0]);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const glow = ctx.createRadialGradient(760, 460, 30, 760, 460, 780);
  glow.addColorStop(0, "rgba(255,255,255,.18)"); glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Could not create the background.")), "image/png"));
  return new File([blob], name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".png", { type: "image/png" });
}
