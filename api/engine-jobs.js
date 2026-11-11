const engines = {
  image: { url: "NEXUS_IMAGE_ENGINE_URL", token: "NEXUS_IMAGE_ENGINE_TOKEN" },
  video: { url: "NEXUS_VIDEO_ENGINE_URL", token: "NEXUS_VIDEO_ENGINE_TOKEN" },
  audio: { url: "NEXUS_AUDIO_ENGINE_URL", token: "NEXUS_AUDIO_ENGINE_TOKEN" },
  render: { url: "NEXUS_RENDER_ENGINE_URL", token: "NEXUS_RENDER_ENGINE_TOKEN" },
  remotion: { url: "NEXUS_REMOTION_ENGINE_URL", token: "NEXUS_REMOTION_ENGINE_TOKEN" },
  hyperframes: { url: "NEXUS_HYPERFRAMES_ENGINE_URL", token: "NEXUS_HYPERFRAMES_ENGINE_TOKEN" },
  ffmpeg: { url: "NEXUS_FFMPEG_ENGINE_URL", token: "NEXUS_FFMPEG_ENGINE_TOKEN" },
  ytdlp: { url: "NEXUS_YTDLP_ENGINE_URL", token: "NEXUS_YTDLP_ENGINE_TOKEN" }
};
const states = new Set(["queued", "running", "succeeded", "failed", "cancelled"]);
const json = (res, status, body) => res.status(status).json(body);
const workerBase = (value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString().replace(/\/$/, "");
  } catch { return null; }
};
const safeJob = (body, requestedId) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const id = typeof body.id === "string" ? body.id : requestedId;
  const state = String(body.state || body.status || "").toLowerCase();
  if (!id || id.length > 180 || !states.has(state)) return null;
  const rawOutput = body.output && typeof body.output === "object" ? body.output : {};
  let output;
  if (typeof rawOutput.url === "string") {
    try {
      const parsed = new URL(rawOutput.url);
      if (parsed.protocol === "https:" && !parsed.username && !parsed.password) {
        output = { url: parsed.toString(), mimeType: typeof rawOutput.mimeType === "string" ? rawOutput.mimeType.slice(0, 120) : undefined, assetId: typeof rawOutput.assetId === "string" ? rawOutput.assetId.slice(0, 180) : undefined };
      }
    } catch { /* Ignore invalid worker output URLs. */ }
  }
  return {
    id, state,
    progress: Number.isFinite(Number(body.progress)) ? Math.max(0, Math.min(100, Number(body.progress))) : state === "succeeded" ? 100 : 0,
    message: String(body.message || state).slice(0, 500),
    ...(output ? { output } : {}),
    ...(body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) && JSON.stringify(body.metadata).length <= 4000 ? { metadata: body.metadata } : {}),
    ...(typeof body.error === "string" ? { error: body.error.slice(0, 1000) } : {})
  };
};
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const id = typeof req.query?.id === "string" ? req.query.id.trim() : "";
  const engine = typeof req.query?.engine === "string" ? req.query.engine : "";
  if (req.method === "GET") {
    if (!id || id.length > 180 || !Object.prototype.hasOwnProperty.call(engines, engine)) return json(res, 400, { error: "A valid engine and job id are required." });
    const config = engines[engine], base = workerBase(process.env[config.url] || process.env.NEXUS_ENGINE_WORKER_URL || ""), token = process.env[config.token] || process.env.NEXUS_ENGINE_WORKER_TOKEN;
    if (!base || !token) return json(res, 503, { error: "This NEXUS worker is not configured with a secure HTTPS endpoint and token." });
    try {
      const upstream = await fetch(base + "/jobs/" + encodeURIComponent(id), { headers: { Authorization: "Bearer " + token, Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
      const body = await upstream.json().catch(() => null);
      if (!upstream.ok) return json(res, upstream.status >= 500 ? 502 : upstream.status, { error: String(body?.error || "The NEXUS worker could not return this job.").slice(0, 500) });
      const job = safeJob(body, id);
      if (!job) return json(res, 502, { error: "The worker returned an invalid job status. Expected id, state, progress and optional HTTPS output." });
      return json(res, 200, job);
    } catch { return json(res, 502, { error: "The NEXUS worker timed out or could not be reached." }); }
  }
  if (req.method !== "POST") return json(res, 405, { error: "Use POST to submit a job or GET with engine and id to check it." });
  const { engine: requestedEngine, prompt, options = {} } = req.body || {};
  if (!Object.prototype.hasOwnProperty.call(engines, requestedEngine)) return json(res, 400, { error: "Unsupported NEXUS engine." });
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 12000) return json(res, 400, { error: "Provide a prompt of up to 12,000 characters." });
  if (!options || typeof options !== "object" || Array.isArray(options)) return json(res, 400, { error: "Options must be a JSON object." });
  if (JSON.stringify(options).length > 8000) return json(res, 400, { error: "Generation options are too large." });
  const config = engines[requestedEngine], base = workerBase(process.env[config.url] || process.env.NEXUS_ENGINE_WORKER_URL || ""), token = process.env[config.token] || process.env.NEXUS_ENGINE_WORKER_TOKEN;
  if (!base || !token) return json(res, 503, { error: "The NEXUS " + requestedEngine + " worker is not configured yet. Use the listed editor fallback; no generation has been started." });
  try {
    const upstream = await fetch(base + "/jobs", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token, Accept: "application/json" },
      body: JSON.stringify({ engine: requestedEngine, prompt: prompt.trim(), options }), signal: AbortSignal.timeout(30000)
    });
    const body = await upstream.json().catch(() => null);
    if (!upstream.ok) return json(res, upstream.status >= 500 ? 502 : upstream.status, { error: String(body?.error || "The NEXUS worker rejected this job.").slice(0, 500) });
    const job = safeJob(body);
    if (!job) return json(res, 502, { error: "The worker accepted the request but returned an invalid job record. Expected id, state, progress and optional HTTPS output." });
    return json(res, 202, job);
  } catch { return json(res, 502, { error: "The NEXUS worker timed out or could not be reached. The project is unchanged; use the configured fallback." }); }
}
