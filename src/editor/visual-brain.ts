export const VISUAL_MODEL = {
  id: "HuggingFaceTB/SmolVLM2-256M-Video-Instruct",
  name: "SmolVLM2 · Visual Scene Brain",
  size: "Compact 256M vision-language model · quantised ONNX",
  runtime: "Transformers.js · WebGPU",
  licence: "Apache-2.0",
  description: "Reads sampled video frames and images, describes visible subjects, objects, settings and actions, and compares scene moments. Runs in the browser; frames are not uploaded.",
} as const;

export type VisualFrameInput = {
  assetId: string;
  assetName: string;
  role: string;
  timestamp?: number;
  dataUrl: string;
};

export type VisualUnderstanding = VisualFrameInput & {
  description: string;
  analysedAt: string;
};

type ModelRuntime = {
  processor: any;
  model: any;
  RawImage: any;
};
type Progress = { status?: string; file?: string; progress?: number; loaded?: number; total?: number };
let runtime: ModelRuntime | null = null;
let loading: Promise<ModelRuntime> | null = null;

export function isVisualModelLoaded() { return !!runtime; }

export function getVisualModelDeviceInfo() {
  const nav = navigator as Navigator & { deviceMemory?: number; gpu?: { requestAdapter?: () => Promise<unknown> } };
  return {
    webGPU: !!nav.gpu,
    deviceMemory: nav.deviceMemory,
    compatible: !!nav.gpu && (nav.deviceMemory === undefined || nav.deviceMemory >= 3),
    note: !nav.gpu
      ? "This browser does not expose WebGPU. The visual model needs a supported WebGPU browser/device; frame measurements remain available."
      : nav.deviceMemory !== undefined && nav.deviceMemory < 3
        ? "This device reports less than 3 GB memory. Loading the vision model may cause the browser to close; use frame analysis without the model on this device."
        : "WebGPU is available. The compact vision model can be downloaded and run locally; first load needs free storage and memory.",
  };
}

export async function loadVisualModel(onProgress?: (event: Progress) => void): Promise<void> {
  if (runtime) return;
  if (loading) { await loading; return; }
  loading = (async () => {
    const device = getVisualModelDeviceInfo();
    if (!device.compatible) throw new Error(device.note);
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter?: () => Promise<unknown> } }).gpu;
    if (!gpu?.requestAdapter || !(await gpu.requestAdapter())) throw new Error("WebGPU adapter is unavailable on this device. Frame measurements remain available without the model.");
    const { AutoProcessor, AutoModelForImageTextToText, RawImage } = await import("@huggingface/transformers") as any;
    const [processor, model] = await Promise.all([
      AutoProcessor.from_pretrained(VISUAL_MODEL.id, {
        progress_callback: (event: Progress) => onProgress?.(event),
      }),
      AutoModelForImageTextToText.from_pretrained(VISUAL_MODEL.id, {
        device: "webgpu",
        dtype: "q4f16",
        progress_callback: (event: Progress) => onProgress?.(event),
      }),
    ]);
    runtime = { processor, model, RawImage };
    return runtime;
  })();
  try { await loading; } finally { loading = null; }
}

export async function describeVisualFrame(frame: VisualFrameInput, question?: string): Promise<VisualUnderstanding> {
  if (!runtime) throw new Error("Download and activate the Visual Scene Brain in Model Centre first.");
  const image = await runtime.RawImage.fromURL(frame.dataUrl);
  const messages = [{
    role: "user",
    content: [
      { type: "image" },
      { type: "text", text: question || "Describe this video frame for a professional video editor. Identify only visible people, objects, setting, activity, camera framing, lighting, and any readable on-screen text. Be concise and do not guess identities or hidden context." },
    ],
  }];
  const prompt = runtime.processor.apply_chat_template(messages, { add_generation_prompt: true });
  const inputs = await runtime.processor(prompt, [image], { do_image_splitting: false });
  const output = await runtime.model.generate({ ...inputs, max_new_tokens: 104, do_sample: false });
  const decoded = await runtime.processor.batch_decode(output, { skip_special_tokens: true });
  let description = String(decoded?.[0] || "").trim();
  const assistantMarker = description.lastIndexOf("assistant");
  if (assistantMarker >= 0) description = description.slice(assistantMarker + "assistant".length).trim();
  description = description.replace(/^[:\s]+/, "").slice(0, 900);
  if (!description) throw new Error("The vision model returned an empty description.");
  return { ...frame, description, analysedAt: new Date().toISOString() };
}

export async function understandVisualSamples(
  frames: VisualFrameInput[],
  onProgress?: (done: number, total: number, current: string) => void,
): Promise<VisualUnderstanding[]> {
  const output: VisualUnderstanding[] = [];
  const selected = frames.slice(0, 8);
  for (let index = 0; index < selected.length; index++) {
    const frame = selected[index];
    onProgress?.(index, selected.length, frame.assetName);
    output.push(await describeVisualFrame(frame));
    onProgress?.(index + 1, selected.length, frame.assetName);
  }
  return output;
}
