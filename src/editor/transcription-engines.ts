import { pipeline } from "@huggingface/transformers";

export type TranscriptResult = { text: string; engine: "whisper" | "vosk" | "groq"; segments?: { start: number; end: number; text: string }[] };
type Progress = (message: string) => void;

async function decodeAudio(file: File): Promise<AudioBuffer> {
  const context = new AudioContext();
  try { return await context.decodeAudioData(await file.arrayBuffer()); }
  finally { await context.close(); }
}
function mono16k(buffer: AudioBuffer): Float32Array {
  const length = Math.ceil(buffer.duration * 16000);
  const output = new Float32Array(length);
  const channels = Array.from({length: buffer.numberOfChannels}, (_, i) => buffer.getChannelData(i));
  for (let i=0;i<length;i++) {
    const sourceIndex = Math.min(buffer.length-1, Math.floor(i * buffer.sampleRate / 16000));
    let value = 0; for (const channel of channels) value += channel[sourceIndex] || 0;
    output[i] = value / channels.length;
  }
  return output;
}

export async function transcribeWhisper(file: File, onProgress: Progress = () => {}): Promise<TranscriptResult> {
  onProgress("Loading Whisper Tiny model (first download may take a while)…");
  const transcriber = await pipeline("automatic-speech-recognition", "onnx-community/whisper-tiny.en", {
    device: "wasm",
    dtype: "q8"
  });
  onProgress("Decoding audio locally…");
  const audio = mono16k(await decodeAudio(file));
  const result: any = await transcriber(audio, { chunk_length_s: 30, stride_length_s: 5, return_timestamps: true });
  const chunks = Array.isArray(result?.chunks) ? result.chunks : [];
  return { engine: "whisper", text: result.text || "", segments: chunks.map((c: any) => ({ start: c.timestamp?.[0] || 0, end: c.timestamp?.[1] || 0, text: c.text || "" })) };
}

export async function transcribeVosk(file: File, onProgress: Progress = () => {}): Promise<TranscriptResult> {
  onProgress("Loading Vosk browser runtime and English model…");
  const Vosk = await import("vosk-browser");
  const modelUrl = (import.meta as ImportMeta & { env: { VITE_VOSK_MODEL_URL?: string } }).env.VITE_VOSK_MODEL_URL;
  if (!modelUrl) throw new Error("Vosk needs VITE_VOSK_MODEL_URL set to a compatible Vosk browser model archive. This is a model URL, not an API key.");
  const model = await Vosk.createModel(modelUrl);
  try {
    const recognizer = new model.KaldiRecognizer(16000);
    recognizer.setWords(true);
    const segments: {start:number;end:number;text:string}[] = [];
    recognizer.on("result", (message: any) => {
      const words = message.result?.result || [];
      if (words.length) segments.push({ start: words[0].start, end: words[words.length-1].end, text: message.result.text || "" });
      else if (message.result?.text) segments.push({ start: 0, end: 0, text: message.result.text });
    });
    onProgress("Preparing audio for local Vosk recognition…");
    const buffer = await decodeAudio(file);
    const context = new AudioContext({ sampleRate: 16000 });
    try {
      const samples = mono16k(buffer);
      const chunkSize = 16000 * 8;
      for (let offset=0; offset<samples.length; offset+=chunkSize) {
        const part = samples.subarray(offset, Math.min(samples.length, offset+chunkSize));
        const audioBuffer = context.createBuffer(1, part.length, 16000);
        audioBuffer.copyToChannel(part, 0);
        recognizer.acceptWaveform(audioBuffer);
        onProgress("Vosk processed " + Math.min(100, Math.round((offset+part.length)/samples.length*100)) + "%…");
      }
      await new Promise(resolve => setTimeout(resolve, 700));
    } finally { await context.close(); recognizer.remove(); }
    return { engine: "vosk", text: segments.map(s=>s.text).join(" ").trim(), segments };
  } finally { model.terminate(); }
}

export async function transcribeOnline(file: File): Promise<TranscriptResult> {
  const response = await fetch("/api/transcribe", { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "X-Audio-Filename": encodeURIComponent(file.name) }, body: file });
  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try { message = JSON.parse(body).error || body; } catch { /* retain provider text */ }
    throw new Error(message || "Online transcription is not configured yet. Add GROQ_API_KEY in Vercel settings.");
  }
  const data = await response.json();
  return { engine: "groq", text: data.text || "", segments: data.segments || [] };
}
