const workerBase = (value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString().replace(/\/$/, "");
  } catch { return null; }
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET to retrieve a generated audio asset." });
  const id = typeof req.query?.id === "string" ? req.query.id.trim() : "";
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(id)) return res.status(400).json({ error: "A valid audio asset ID is required." });
  const base = workerBase(process.env.NEXUS_AUDIO_ENGINE_URL || process.env.NEXUS_ENGINE_WORKER_URL || "");
  const token = process.env.NEXUS_AUDIO_ENGINE_TOKEN || process.env.NEXUS_ENGINE_WORKER_TOKEN;
  if (!base || !token) return res.status(503).json({ error: "The NEXUS audio worker is not configured." });
  try {
    const upstream = await fetch(base + "/assets/" + encodeURIComponent(id), {
      headers: { Authorization: "Bearer " + token, Accept: "audio/*" },
      signal: AbortSignal.timeout(30000)
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: detail.slice(0, 400) || "The generated audio asset could not be retrieved." });
    }
    const mime = (upstream.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
    if (!mime.startsWith("audio/")) return res.status(502).json({ error: "The audio worker returned an unsupported media type." });
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Length", String(bytes.byteLength));
    res.setHeader("Content-Disposition", 'inline; filename="nexus-audio-' + id + '"');
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(bytes);
  } catch {
    return res.status(502).json({ error: "The audio worker timed out or could not be reached." });
  }
}
