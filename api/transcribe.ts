export const config = { api: { bodyParser: false, responseLimit: "25mb" } };

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(503).send("Online transcription is not configured yet. Add GROQ_API_KEY in Vercel settings.");
  try {
    const chunks: Uint8Array[] = [];
    for await (const chunk of req) chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
    const audio = Buffer.concat(chunks);
    const filename = decodeURIComponent(String(req.headers["x-audio-filename"] || "audio-upload"));
    const type = String(req.headers["content-type"] || "application/octet-stream");
    const form = new FormData();
    form.append("file", new Blob([audio], { type }), filename);
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "verbose_json");
    const upstream = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: "Bearer " + key }, body: form });
    const payload = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: payload.error?.message || "Transcription provider request failed" });
    return res.status(200).json(payload);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Transcription failed" });
  }
}
