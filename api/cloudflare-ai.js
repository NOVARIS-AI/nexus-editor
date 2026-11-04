const json = (res, status, body) => res.status(status).json(body);
const models = { text: () => process.env.NEXUS_CF_TEXT_MODEL || "@cf/meta/llama-3.2-1b-instruct", image: () => process.env.NEXUS_CF_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell" };
const configured = () => Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
const cleanPrompt = (value) => typeof value === "string" && value.trim() && value.length <= 12000;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return json(res, 405, { error: "Use POST." });
  if (!configured()) return json(res, 503, { error: "Cloudflare Workers AI is not configured. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to the server environment." });
  const { task = "text", prompt, messages, options = {} } = req.body || {};
  if (!["text", "image"].includes(task)) return json(res, 400, { error: "Task must be text or image." });
  if (!cleanPrompt(prompt) && !(task === "text" && Array.isArray(messages) && messages.length)) return json(res, 400, { error: "Provide a prompt of up to 12,000 characters." });
  if (!options || typeof options !== "object" || Array.isArray(options) || JSON.stringify(options).length > 4000) return json(res, 400, { error: "Options must be a JSON object under 4,000 characters." });
  const account = process.env.CLOUDFLARE_ACCOUNT_ID.trim(), token = process.env.CLOUDFLARE_API_TOKEN.trim();
  const model = task === "image" ? models.image() : models.text();
  if (!/^[a-zA-Z0-9_-]{5,80}$/.test(account) || !token || token.length > 500) return json(res, 503, { error: "Cloudflare account configuration is invalid." });
  const input = task === "image" ? { prompt: prompt.trim(), ...options } : { messages: Array.isArray(messages) ? messages.slice(0, 12) : [{ role: "user", content: prompt.trim() }], ...options };
  try {
    const upstream = await fetch("https://api.cloudflare.com/client/v4/accounts/" + encodeURIComponent(account) + "/ai/run/" + encodeURIComponent(model), { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(60000) });
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok || payload?.success === false) { const detail = payload?.errors?.[0]?.message || payload?.error || "Cloudflare Workers AI rejected the request."; return json(res, upstream.status >= 500 ? 502 : upstream.status || 502, { error: String(detail).slice(0, 500), provider: "cloudflare-workers-ai", model }); }
    const result = payload?.result || {};
    if (task === "image") { const image = typeof result.image === "string" ? result.image : typeof result.data?.[0] === "string" ? result.data[0] : null; if (!image) return json(res, 502, { error: "The selected Cloudflare image model returned no image data.", provider: "cloudflare-workers-ai", model }); return json(res, 200, { task, model, provider: "cloudflare-workers-ai", mimeType: "image/png", image: image.startsWith("data:") ? image : "data:image/png;base64," + image }); }
    const response = typeof result.response === "string" ? result.response : typeof result.output_text === "string" ? result.output_text : null;
    if (!response) return json(res, 502, { error: "The selected Cloudflare text model returned no text response.", provider: "cloudflare-workers-ai", model });
    return json(res, 200, { task, model, provider: "cloudflare-workers-ai", response });
  } catch { return json(res, 502, { error: "Cloudflare Workers AI timed out or could not be reached. No project changes were made." }); }
}
