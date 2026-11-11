const json = (res, status, body) => res.status(status).json(body);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MODEL = () => process.env.NEXUS_CF_INPAINT_MODEL || "@cf/runwayml/stable-diffusion-v1-5-inpainting";
const configured = () => Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN);
function decodeBase64(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  try {
    const binary = atob(value);
    if (binary.length > MAX_IMAGE_BYTES) return null;
    return Array.from(binary, character => character.charCodeAt(0));
  } catch { return null; }
}
function toBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return json(res, 405, { error: "Use POST." });
  if (!configured()) return json(res, 503, { error: "Generative Object Removal is not connected yet. Configure the Cloudflare AI server credentials first." });
  const body = req.body || {};
  const image = decodeBase64(body.image);
  const mask = decodeBase64(body.mask);
  if (!image || !mask) return json(res, 400, { error: "A valid image and selection mask are required. Each must be under 5 MB." });
  const prompt = typeof body.prompt === "string" && body.prompt.trim() ? body.prompt.trim().slice(0, 1200) : "Seamlessly reconstruct the background where the masked object was removed. Preserve the original scene, lighting, perspective, textures and surrounding details. Do not add a new object.";
  const width = Math.round(Number(body.width)), height = Math.round(Number(body.height));
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 256 || height < 256 || width > 1024 || height > 1024) return json(res, 400, { error: "Image dimensions must be between 256 and 1024 pixels." });
  const account = process.env.CLOUDFLARE_ACCOUNT_ID.trim(), token = process.env.CLOUDFLARE_API_TOKEN.trim(), model = MODEL();
  if (!/^[a-zA-Z0-9_-]{5,80}$/.test(account) || token.length > 500) return json(res, 503, { error: "Cloudflare AI server configuration is invalid." });
  const input = { prompt, image, mask, width, height, num_steps: 20, strength: 1, guidance: 7.5, negative_prompt: "blurry, distorted, duplicated objects, text, watermark" };
  try {
    const upstream = await fetch("https://api.cloudflare.com/client/v4/accounts/" + encodeURIComponent(account) + "/ai/run/" + encodeURIComponent(model), {
      method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(120000)
    });
    const type = upstream.headers.get("content-type") || "";
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return json(res, upstream.status >= 500 ? 502 : upstream.status, { error: (detail || "The image reconstruction service rejected this request.").slice(0, 500), model });
    }
    if (type.includes("image/")) {
      const bytes = new Uint8Array(await upstream.arrayBuffer());
      return json(res, 200, { image: "data:" + type.split(";")[0] + ";base64," + toBase64(bytes), mimeType: type.split(";")[0], model });
    }
    const payload = await upstream.json().catch(() => null);
    const result = payload?.result || payload;
    const encoded = typeof result?.image === "string" ? result.image : typeof result?.data?.[0] === "string" ? result.data[0] : typeof result === "string" ? result : null;
    if (!encoded) return json(res, 502, { error: "The inpainting model returned no image. Try a smaller selection or use Local Smart Fill.", model });
    return json(res, 200, { image: encoded.startsWith("data:") ? encoded : "data:image/png;base64," + encoded, mimeType: "image/png", model });
  } catch (error) {
    return json(res, 502, { error: String(error?.message || "Image reconstruction timed out.").slice(0, 300), model });
  }
}
