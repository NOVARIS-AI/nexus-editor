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
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Origin");
  const base = workerBase(process.env.NEXUS_WORKER_URL || "");
  const token = process.env.NEXUS_WORKER_TOKEN || "";
  if (req.method === "GET") {
    if (!base || !token) return json(res, 503, { ok: false, error: "The NEXUS Cloudflare Worker connection is not configured on the server yet." });
    try {
      const health = await fetch(base + "/health", { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
      const data = await health.json().catch(() => ({}));
      return json(res, health.ok && data.ok ? 200 : 502, { ok: Boolean(health.ok && data.ok), provider: "cloudflare-workers-ai", service: data.service || "nexus-worker" });
    } catch { return json(res, 502, { ok: false, error: "The NEXUS Worker health check failed." }); }
  }
  if (req.method !== "POST") return json(res, 405, { error: "Use GET for health or POST for generation." });
  if (!base || !token) return json(res, 503, { error: "The NEXUS Cloudflare Worker connection is not configured on the server yet. Add NEXUS_WORKER_URL and NEXUS_WORKER_TOKEN to the app's server environment." });
  const origin = req.headers.origin;
  const allowedOrigin = process.env.NEXUS_APP_ORIGIN;
  if (origin && allowedOrigin && origin !== allowedOrigin) return json(res, 403, { error: "This app origin is not allowed." });

  // Validate the task before applying task-specific rate limits.
  // The previous order referenced task before declaration and threw a ReferenceError.
  const { task = "text", prompt } = req.body || {};
  if (!["text", "image"].includes(task)) return json(res, 400, { error: "Task must be text or image." });
  if (!cleanPrompt(prompt)) return json(res, 400, { error: "Provide a prompt of up to 12,000 characters." });

  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const clientKey = forwarded || String(req.headers["x-real-ip"] || "unknown");
  if (!allowRequest(clientKey, task)) return json(res, 429, { error: task === "image" ? "Image generation is limited to 3 requests per 10 minutes for this network." : "Text generation is limited to 12 requests per 10 minutes for this network." });

  try {
    const upstream = await fetch(base + "/v1/generate", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ task, prompt: prompt.trim() }),
      signal: AbortSignal.timeout(task === "image" ? 90_000 : 60_000)
    });
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok) return json(res, upstream.status >= 500 ? 502 : upstream.status, { error: String(payload?.error || "The Cloudflare Worker rejected this request.").slice(0, 500), provider: "cloudflare-workers-ai" });
    if (task === "image") {
      const image = typeof payload?.image === "string" ? payload.image : "";
      if (!/^data:image\/(png|jpeg|webp);base64,/i.test(image) || image.length > 12_000_000) return json(res, 502, { error: "The Worker returned an invalid or oversized image. Nothing was imported." });
      return json(res, 200, { task, provider: payload.provider || "cloudflare-workers-ai", model: payload.model, mimeType: payload.mimeType || "image/png", image });
    }
    if (typeof payload?.response !== "string" || !payload.response.trim()) return json(res, 502, { error: "The Worker returned no usable text response." });
    return json(res, 200, { task, provider: payload.provider || "cloudflare-workers-ai", model: payload.model, response: payload.response });
  } catch {
    return json(res, 502, { error: "The Cloudflare Worker timed out or could not be reached. No project changes were made." });
  }
}
