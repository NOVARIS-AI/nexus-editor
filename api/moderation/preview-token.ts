import { requireModerator, cleanError, sendJson } from "../../server/moderation-api.js";
import { cloudflareRequest, supabaseRest } from "../../server/social-api.js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return sendJson(res, 405, { error: "Method not allowed." }); }
  try {
    const access = await requireModerator(req, res);
    if (!access) return;
    const postId = String(req.query?.postId || "");
    if (!uuid.test(postId)) return sendJson(res, 400, { error: "A valid post reference is required." });
    const env = (globalThis as any).process?.env || {};
    const customerCode = String(env.CLOUDFLARE_STREAM_CUSTOMER_CODE || "").trim();
    if (!customerCode) return sendJson(res, 503, { error: "Secure preview is not configured on the server." });
    const posts = await supabaseRest("posts?select=id,status,moderation_state,media_asset_id&id=eq." + encodeURIComponent(postId));
    const post = posts?.[0];
    if (!post || post.status !== "processing" || post.moderation_state !== "pending" || !post.media_asset_id)
      return sendJson(res, 404, { error: "This video is no longer waiting for review." });
    const assets = await supabaseRest("media_assets?select=provider,provider_asset_id,upload_state&id=eq." + encodeURIComponent(post.media_asset_id));
    const asset = assets?.[0];
    if (!asset || asset.provider !== "cloudflare_stream" || asset.upload_state !== "ready" || !asset.provider_asset_id)
      return sendJson(res, 409, { error: "The video is not ready for review." });
    const token = await cloudflareRequest("/stream/" + encodeURIComponent(asset.provider_asset_id) + "/token", {
      method: "POST", body: JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900 })
    });
    if (!token?.token) throw new Error("The video provider did not issue a review token.");
    return sendJson(res, 200, {
      playerUrl: "https://customer-" + customerCode + ".cloudflarestream.com/" + token.token + "/iframe",
      expiresInSeconds: 900
    });
  } catch (error) { return sendJson(res, 500, { error: cleanError(error) }); }
}
