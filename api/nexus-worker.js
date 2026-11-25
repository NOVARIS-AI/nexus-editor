const json = (res, status, body) => res.status(status).json(body);
const workerBase = (value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.endsWith(".workers.dev")) return null;
    return url.toString().replace(/\/$/, "");
  } catch { return null; }
};
const cleanPrompt = (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 12000;
const buckets = new Map();
const allowRequest = (key, task, now = Date.now()) => {
  const windowMs = 10 * 60_000;
  const limit = task === "image" ? 3 : 12;
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    buckets.set(key, { startedAt: now, count: 1 });
    if (buckets.size > 2000) for (const [id, value] of buckets) if (now - value.startedAt >= windowMs) buckets.delete(id);
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
};
export default async function handler(req, res, workerEnv = {}) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Origin");
  const base = workerBase(process.env.NEXUS_WORKER_URL || "");
  const token = process.env.NEXUS_WORKER_TOKEN || "";
  if (req.method === "GET") {
    if (workerEnv?.AI?.run) return json(res, 200, { ok: true, provider: "cloudflare-workers-ai", service: "nexus-studio-app", mode: "native-workers-ai-binding", capabilities: ["text", "image"] });
    if (!base || !token) return json(res, 503, { ok: false, error: "The NEXUS Cloudflare Workers AI binding is unavailable and no secured fallback worker is configured." });
    try {
      const health = await fetch(base + "/health", { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
      const data = await health.json().catch(() => ({}));
      return json(res, health.ok && data.ok ? 200 : 502, { ok: Boolean(health.ok && data.ok), provider: "cloudflare-workers-ai", service: data.service || "nexus-worker" });
    } catch { return json(res, 502, { ok: false, error: "The NEXUS Worker health check failed." }); }
  }
  if (req.method !== "POST") return json(res, 405, { error: "Use GET for health or POST for generation." });
  if (!workerEnv?.AI?.run && (!base || !token)) return json(res, 503, { error: "The NEXUS Cloudflare Workers AI binding is unavailable and no secured fallback worker is configured." });
  const origin = req.headers.origin;
  const allowedOrigin = process.env.NEXUS_APP_ORIGIN;
  let requestOrigin = "";
  try { requestOrigin = new URL(req.url).origin; } catch { /* The route still validates the task and provider below. */ }
  if (origin && origin !== requestOrigin && (!allowedOrigin || origin !== allowedOrigin)) return json(res, 403, { error: "This app origin is not allowed." });

  // Validate the task before applying task-specific rate limits.
  // The previous order referenced task before declaration and threw a ReferenceError.
  const { task = "text", prompt } = req.body || {};
  if (!["text", "image"].includes(task)) return json(res, 400, { error: "Task must be text or image." });
  if (!cleanPrompt(prompt)) return json(res, 400, { error: "Provide a prompt of up to 12,000 characters." });

  const forwarded = String(req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const clientKey = forwarded || String(req.headers["x-real-ip"] || "unknown");
  if (!allowRequest(clientKey, task)) return json(res, 429, { error: task === "image" ? "Image generation is limited to 3 requests per 10 minutes for this network." : "Text generation is limited to 12 requests per 10 minutes for this network." });

  try {
    let payload;
    if (workerEnv?.AI?.run) {
      const model = task === "image"
        ? (process.env.NEXUS_CF_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell")
        : (process.env.NEXUS_CF_TEXT_MODEL || "@cf/meta/llama-3.2-1b-instruct");
      const input = task === "image"
        ? { prompt: prompt.trim() }
        : { messages: [{ role: "user", content: prompt.trim() }] };
      const result = await workerEnv.AI.run(model, input);
      if (task === "image") {
        const image = typeof result?.image === "string" ? result.image : typeof result?.data?.[0] === "string" ? result.data[0] : "";
        if (!image || image.length > 12_000_000) return json(res, 502, { error: "Cloudflare Workers AI returned an invalid or oversized image. Nothing was imported." });
        payload = { task, provider: "cloudflare-workers-ai", model, mimeType: "image/png", image: image.startsWith("data:") ? image : "data:image/png;base64," + image };
      } else {
        const response = typeof result?.response === "string" ? result.response : typeof result?.output_text === "string" ? result.output_text : "";
        if (!response.trim()) return json(res, 502, { error: "Cloudflare Workers AI returned no usable text response." });
        payload = { task, provider: "cloudflare-workers-ai", model, response };
      }
    } else {
      const upstream = await fetch(base + "/v1/generate", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ task, prompt: prompt.trim() }),
        signal: AbortSignal.timeout(task === "image" ? 90_000 : 60_000)
      });
      payload = await upstream.json().catch(() => null);
      if (!upstream.ok) return json(res, upstream.status >= 500 ? 502 : upstream.status, { error: String(payload?.error || "The Cloudflare Worker rejected this request.").slice(0, 500), provider: "cloudflare-workers-ai" });
    }
    if (task === "image") {
      const image = typeof payload?.image === "string" ? payload.image : "";
      if (!/^data:image\\/(png|jpeg|webp);base64,/i.test(image) || image.length > 12_000_000) return json(res, 502, { error: "The Worker returned an invalid or oversized image. Nothing was imported." });
      return json(res, 200, { task, provider: payload.provider || "cloudflare-workers-ai", model: payload.model, mimeType: payload.mimeType || "image/png", image });
    }
    if (typeof payload?.response !== "string" || !payload.response.trim()) return json(res, 502, { error: "The Worker returned no usable text response." });
    return json(res, 200, { task, provider: payload.provider || "cloudflare-workers-ai", model: payload.model, response: payload.response });
  } catch (error) {
    return json(res, 502, { error: String(error?.message || "The Cloudflare Worker timed out or could not be reached.").slice(0, 500) + " No project changes were made." });
  }
}