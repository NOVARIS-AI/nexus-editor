import { pipeline } from "@huggingface/transformers";
export type TranscriptSegment = { start: number; end: number; text: string };
export type TranscriptResult = { text: string; engine: "whisper" | "groq"; segments: TranscriptSegment[] };
type Progress = (message: string) => void;
async function decodeAudio(file: File): Promise<AudioBuffer> {
  const context = new AudioContext();
  try { return await context.decodeAudioData(await file.arrayBuffer()); }
  finally { await context.close(); }
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
export async function transcribeWhisper(file: File, onProgress: Progress = () => {}): Promise<TranscriptResult> {
  onProgress("Preparing local speech analysis…");
  const transcriber = await pipeline("automatic-speech-recognition", "onnx-community/whisper-tiny.en", { device: "wasm", dtype: "q8" });
  const audio = mono16k(await decodeAudio(file));
  const result: any = await transcriber(audio, { chunk_length_s: 30, stride_length_s: 5, return_timestamps: true });
  const chunks = Array.isArray(result?.chunks) ? result.chunks : [];
  return { engine: "whisper", text: result.text || "", segments: chunks.map((chunk: any) => ({ start: chunk.timestamp?.[0] || 0, end: chunk.timestamp?.[1] || 0, text: chunk.text || "" })) };
}
export async function transcribeOnline(file: File): Promise<TranscriptResult> {
  if (file.size > 25 * 1024 * 1024) throw new Error("Media exceeds the online speech limit.");
  const response = await fetch("/api/transcribe", { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "X-Audio-Filename": encodeURIComponent(file.name) }, body: file });
  if (!response.ok) throw new Error("Connected speech engine unavailable.");
  const data = await response.json();
  const segments = Array.isArray(data.segments) ? data.segments.map((item: any) => ({ start: Number(item.start) || 0, end: Number(item.end) || 0, text: String(item.text || "") })) : [];
  return { engine: "groq", text: String(data.text || ""), segments };
}
/** Internal engine cascade; deliberately exposes no user-facing transcription mode. */
export async function transcribeMediaInternally(file: File, onProgress: Progress = () => {}): Promise<TranscriptResult> {
  try { const result = await transcribeOnline(file); if (result.text.trim()) return result; } catch { /* fall through to local engine */ }
  return transcribeWhisper(file, onProgress);
}
