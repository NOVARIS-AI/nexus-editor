export const config = { runtime: "nodejs" };
const endpoints: Record<string,string|undefined> = { image: process.env.NEXUS_IMAGE_ENGINE_URL, video: process.env.NEXUS_VIDEO_ENGINE_URL, audio: process.env.NEXUS_AUDIO_ENGINE_URL };
const tokens: Record<string,string|undefined> = { image: process.env.NEXUS_IMAGE_ENGINE_TOKEN, video: process.env.NEXUS_VIDEO_ENGINE_TOKEN, audio: process.env.NEXUS_AUDIO_ENGINE_TOKEN };
export default async function handler(req: any, res: any) {
  const engine = String(req.method === "GET" ? req.query?.engine : req.body?.engine || "");
  if (!(engine in endpoints)) return res.status(400).json({ error: "Unsupported engine." });
  const base = endpoints[engine];
  if (!base) return res.status(503).json({ error: engine.toUpperCase() + " generation worker is not connected yet. Configure its NEXUS_" + engine.toUpperCase() + "_ENGINE_URL and token in Vercel." });
  try {
    const url = new URL(base);
    if (req.method === "GET") { url.searchParams.set("id", String(req.query?.id || "")); }
    else if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const upstream = await fetch(req.method === "GET" ? url : base, { method: req.method, headers: { "Content-Type": "application/json", ...(tokens[engine] ? { Authorization: "Bearer " + tokens[engine] } : {}) }, ...(req.method === "POST" ? { body: JSON.stringify({ prompt: req.body?.prompt, options: req.body?.options || {} }) } : {}) });
    const data = await upstream.json().catch(() => ({}));
    return res.status(upstream.status).json(data);
  } catch (error: any) { return res.status(502).json({ error: error?.message || "Generation worker request failed." }); }
}
