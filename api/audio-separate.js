export const config = { api: { bodyParser: false } };

const workerBase = (value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString().replace(/\/$/, "");
  } catch { return null; }
};

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = typeof chunk === "string" ? new TextEncoder().encode(chunk) : new Uint8Array(chunk);
    size += bytes.byteLength;
    if (size > limit) throw new Error("Audio upload exceeds the 100 MB limit.");
    chunks.push(bytes);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST to upload an audio file for stem separation." });
  const base = workerBase(process.env.NEXUS_AUDIO_ENGINE_URL || "");
  const token = process.env.NEXUS_AUDIO_ENGINE_TOKEN;
  if (!base || !token) return res.status(503).json({ error: "The dedicated NEXUS audio worker is not configured." });
  const contentType = String(req.headers["content-type"] || "");
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) return res.status(400).json({ error: "Upload audio using multipart form data." });
  try {
    const body = await readBody(req, 100 * 1024 * 1024 + 1024 * 1024);
    const upstream = await fetch(base + "/separations", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": contentType, Accept: "application/json" },
      body,
      signal: AbortSignal.timeout(60000)
    });
    const payload = await upstream.json().catch(() => ({}));
    return res.status(upstream.status).json(payload);
  } catch (error) {
    return res.status(error instanceof Error && error.message.includes("100 MB") ? 413 : 502)
      .json({ error: error instanceof Error ? error.message : "Audio separation could not be started." });
  }
}
