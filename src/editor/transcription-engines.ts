import { pipeline } from "@huggingface/transformers";

export type TranscriptSegment = { start: number; end: number; text: string };
export type TranscriptResult = { text: string; engine: "whisper" | "groq"; segments: TranscriptSegment[] };
type Progress = (message: string) => void;
type SpeechProfile = { tier: "compact" | "balanced" | "power"; maxLocalBytes: number; maxLocalSeconds: number; localEnabled: boolean };

let localPipeline: Promise<any> | null = null;
let localRun: Promise<TranscriptResult> | null = null;
const ONLINE_LIMIT = 25 * 1024 * 1024;
const ALLOWED_AUDIO_MIME = /^(audio\/(mpeg|mp3|mp4|wav|x-wav|wave|ogg|webm|flac|aac|x-m4a)|video\/(mp4|webm|quicktime)|application\/octet-stream)$/i;

export function getSpeechPerformanceProfile(device?: { deviceMemory?: number; hardwareConcurrency?: number }): SpeechProfile {
  const memory = device?.deviceMemory ?? (typeof navigator !== "undefined" ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory : undefined);
  const cores = device?.hardwareConcurrency ?? (typeof navigator !== "undefined" ? navigator.hardwareConcurrency : 2);
  const compact = (memory !== undefined && memory <= 4) || cores <= 4;
  const power = memory !== undefined && memory >= 8 && cores >= 8;
  return compact
    ? { tier: "compact", maxLocalBytes: 12 * 1024 * 1024, maxLocalSeconds: 120, localEnabled: true }
    : power
      ? { tier: "power", maxLocalBytes: 48 * 1024 * 1024, maxLocalSeconds: 600, localEnabled: true }
      : { tier: "balanced", maxLocalBytes: 24 * 1024 * 1024, maxLocalSeconds: 300, localEnabled: true };
}

export function validateSpeechMedia(file: File, online = false): string | null {
  if (!file || !file.size) return "The selected media file is empty.";
  if (file.size > (online ? ONLINE_LIMIT : 100 * 1024 * 1024)) return online ? "Media exceeds the connected speech service's 25 MB limit." : "Media is too large for safe local speech analysis.";
  if (file.type && !ALLOWED_AUDIO_MIME.test(file.type)) return "This media format is not supported by the speech engines. Use MP3, WAV, M4A, OGG, WebM or MP4.";
  return null;
}

async function decodeAudio(file: File): Promise<AudioBuffer> {
  const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) throw new Error("This browser does not support local audio decoding.");
  const context = new Context();
  try { return await context.decodeAudioData(await file.arrayBuffer()); }
  finally { try { await context.close(); } catch { /* already closed */ } }
}
function mono16k(buffer: AudioBuffer): Float32Array {
  const length = Math.ceil(buffer.duration * 16000), output = new Float32Array(length);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  for (let i = 0; i < length; i++) {
    const sourceIndex = Math.min(buffer.length - 1, Math.floor(i * buffer.sampleRate / 16000));
    let value = 0; for (const channel of channels) value += channel[sourceIndex] || 0;
    output[i] = value / channels.length;
  }
  return output;
}
async function getLocalPipeline() {
  if (!localPipeline) localPipeline = pipeline("automatic-speech-recognition", "onnx-community/whisper-tiny.en", { device: "wasm", dtype: "q8" });
  try { return await localPipeline; }
  catch (error) { localPipeline = null; throw error; }
}
export async function transcribeWhisper(file: File, onProgress: Progress = () => {}): Promise<TranscriptResult> {
  const invalid = validateSpeechMedia(file);
  if (invalid) throw new Error(invalid);
  const profile = getSpeechPerformanceProfile();
  if (!profile.localEnabled || file.size > profile.maxLocalBytes) throw new Error("This device is keeping local speech analysis within its memory budget. The connected engine is unavailable, so try a shorter or smaller media file.");
  if (localRun) throw new Error("Local speech analysis is already running. The current media will continue first.");
  const run = (async () => {
    onProgress("Preparing the local speech engine…");
    const audioBuffer = await decodeAudio(file);
    if (audioBuffer.duration > profile.maxLocalSeconds) throw new Error("This device's local speech limit is about " + profile.maxLocalSeconds + " seconds. Use a shorter section or the connected engine.");
    onProgress("Running private on-device speech analysis…");
    const transcriber = await getLocalPipeline();
    const audio = mono16k(audioBuffer);
    const result: any = await transcriber(audio, { chunk_length_s: 20, stride_length_s: 3, return_timestamps: true });
    const chunks = Array.isArray(result?.chunks) ? result.chunks : [];
    const segments = chunks.map((chunk: any) => ({ start: Number(chunk.timestamp?.[0]) || 0, end: Number(chunk.timestamp?.[1]) || 0, text: String(chunk.text || "").trim() })).filter((item: TranscriptSegment) => item.text);
    const text = String(result?.text || "").trim();
    if (!text && !segments.length) throw new Error("The local speech engine did not detect usable speech.");
    return { engine: "whisper" as const, text, segments };
  })();
  localRun = run;
  try { return await run; } finally { localRun = null; }
}
export async function transcribeOnline(file: File): Promise<TranscriptResult> {
  const invalid = validateSpeechMedia(file, true);
  if (invalid) throw new Error(invalid);
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch("/api/transcribe", { method: "POST", signal: controller.signal, headers: { "Content-Type": file.type || "application/octet-stream", "X-Audio-Filename": encodeURIComponent(file.name.slice(0, 180)) }, body: file });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = String(data.error || "Connected speech engine unavailable.");
        if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) throw new Error(message);
        throw new Error(message + " (HTTP " + response.status + ")");
      }
      const segments = Array.isArray(data.segments) ? data.segments.map((item: any) => ({ start: Number(item.start) || 0, end: Number(item.end) || 0, text: String(item.text || "").trim() })).filter((item: TranscriptSegment) => item.text) : [];
      const text = String(data.text || "").trim();
      if (!text && !segments.length) throw new Error("The connected speech engine returned no speech results.");
      return { engine: "groq", text, segments };
    } catch (error) {
      lastError = error instanceof Error && error.name === "AbortError" ? new Error("Connected speech analysis timed out.") : error instanceof Error ? error : new Error("Connected speech analysis failed.");
      if (attempt === 0 && !/HTTP 4\d\d/.test(lastError.message)) await new Promise(resolve => window.setTimeout(resolve, 700));
    } finally { window.clearTimeout(timeout); }
  }
  throw lastError || new Error("Connected speech analysis failed.");
}

/** Internal cascade: online first, then a device-aware local fallback. No user-facing transcription mode is exposed. */
export async function transcribeMediaInternally(file: File, onProgress: Progress = () => {}): Promise<TranscriptResult> {
  const invalid = validateSpeechMedia(file);
  if (invalid) throw new Error(invalid);
  const failures: string[] = [];
  try {
    const result = await transcribeOnline(file);
    onProgress("Internal speech insights ready.");
    return result;
  } catch (error) { failures.push("Connected engine: " + (error instanceof Error ? error.message : "unavailable")); }
  onProgress("Connected engine unavailable; checking the safe local fallback…");
  try {
    const result = await transcribeWhisper(file, onProgress);
    onProgress("Local speech insights ready.");
    return result;
  } catch (error) { failures.push("Local fallback: " + (error instanceof Error ? error.message : "unavailable")); }
  throw new Error(failures.join(" · "));
}
