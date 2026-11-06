export const config = { api: { bodyParser: false, responseLimit: "25mb" } };
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const ALLOWED_AUDIO_MIME = /^(audio\/(mpeg|mp3|mp4|wav|x-wav|wave|ogg|webm|flac|aac|x-m4a)|video\/(mp4|webm|quicktime)|application\/octet-stream)$/i;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(503).json({ error: "Connected speech engine is not configured." });
  try {
    const type = String(req.headers["content-type"] || "application/octet-stream").split(";")[0].trim();
    if (!ALLOWED_AUDIO_MIME.test(type)) return res.status(415).json({ error: "Unsupported media format. Use MP3, WAV, M4A, OGG, WebM or MP4." });
    const declaredLength = Number(req.headers["content-length"] || 0);
    if (declaredLength > MAX_AUDIO_BYTES) return res.status(413).json({ error: "Media exceeds the connected speech service's 25 MB limit." });
    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of req) {
      const bytes = typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk;
      total += bytes.byteLength;
      if (total > MAX_AUDIO_BYTES) return res.status(413).json({ error: "Media exceeds the connected speech service's 25 MB limit." });
      chunks.push(bytes);
    }
    if (!total) return res.status(400).json({ error: "The uploaded media file is empty." });
    let filename = "media-audio";
    try { filename = decodeURIComponent(String(req.headers["x-audio-filename"] || filename)); } catch { /* use safe default */ }
    filename = filename.replace(/[\\/\0-\x1f]/g, "_").slice(0, 180) || "media-audio";
    const form = new FormData();
    form.append("file", new Blob([Buffer.concat(chunks)], { type }), filename);
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "verbose_json");
    const upstream = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key },
      body: form,
      signal: AbortSignal.timeout(85000)
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const status = upstream.status === 429 ? 429 : upstream.status >= 500 ? 503 : upstream.status;
      return res.status(status).json({ error: String(payload.error?.message || "Connected speech provider could not process this media.") });
    }
    const segments = Array.isArray(payload.segments) ? payload.segments.map((item: any) => ({
      start: Number(item.start) || 0,
      end: Number(item.end) || 0,
      text: String(item.text || "").trim()
    })).filter((item: any) => item.text) : [];
    return res.status(200).json({ text: String(payload.text || "").trim(), segments, language: payload.language || null, duration: Number(payload.duration) || null });
  } catch (error: any) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return res.status(timedOut ? 504 : 502).json({ error: timedOut ? "Connected speech provider timed out. The internal local fallback will be tried." : "Connected speech provider could not be reached. The internal local fallback will be tried." });
  }
}
