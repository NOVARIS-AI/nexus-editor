const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
const MAX_BODY = 18_000;
const validPrompt = (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 12000;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: {
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "authorization, content-type",
        "access-control-max-age": "86400",
        "vary": "Origin"
      }});
    }
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return reply({ ok: true, service: "nexus-workers-ai", protocol: "nexus-ai-v1" });
    }
    if (request.method !== "POST" || url.pathname !== "/v1/generate") return reply({ error: "Not found." }, 404);
    if (!env.NEXUS_WORKER_TOKEN || request.headers.get("authorization") !== `Bearer ${env.NEXUS_WORKER_TOKEN}`) {
      return reply({ error: "Unauthorized." }, 401);
    }
    const origin = request.headers.get("origin");
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim()).filter(Boolean);
    if (origin && allowed.length && !allowed.includes(origin)) return reply({ error: "Origin not allowed." }, 403);
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_BODY) return reply({ error: "Request is too large." }, 413);
    let body;
    try {
      const raw = await request.text();
      if (raw.length > MAX_BODY) return reply({ error: "Request is too large." }, 413);
      body = JSON.parse(raw);
    } catch {
      return reply({ error: "Send a valid JSON body." }, 400);
    }
    const task = body?.task || "text";
    if (task !== "text" && task !== "image") return reply({ error: "Task must be text or image." }, 400);
    const prompt = body?.prompt;
    if (!validPrompt(prompt)) return reply({ error: "Provide a prompt of up to 12,000 characters." }, 400);
    const model = task === "image"
      ? (env.NEXUS_CF_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell")
      : (env.NEXUS_CF_TEXT_MODEL || "@cf/meta/llama-3.1-8b-instruct");
    try {
      let result;
      if (task === "image") {
        result = await env.AI.run(model, { prompt: prompt.trim() });
        const image = typeof result?.image === "string" ? result.image : Array.isArray(result?.data) && typeof result.data[0] === "string" ? result.data[0] : null;
        if (!image) return reply({ error: "The image model returned no image data.", provider: "cloudflare-workers-ai", model }, 502);
        return reply({ task, provider: "cloudflare-workers-ai", model, mimeType: "image/png", image: image.startsWith("data:") ? image : `data:image/png;base64,${image}` });
      }
      result = await env.AI.run(model, { messages: [{ role: "user", content: prompt.trim() }] });
      const response = typeof result?.response === "string" ? result.response : typeof result?.output_text === "string" ? result.output_text : null;
      if (!response) return reply({ error: "The text model returned no response.", provider: "cloudflare-workers-ai", model }, 502);
      return reply({ task, provider: "cloudflare-workers-ai", model, response });
    } catch (error) {
      return reply({ error: String(error?.message || "Workers AI request failed.").slice(0, 400), provider: "cloudflare-workers-ai", model }, 502);
    }
  }
};
