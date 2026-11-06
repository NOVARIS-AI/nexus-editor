import { authenticate, cleanError, cloudflareRequest, getConfig, methodOnly, sendJson, supabaseRest } from "../../server/social-api.js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req: any, res: any) {
  if (!methodOnly(req, res, "GET")) return;
  const config = getConfig();
  const env = (globalThis as any).process?.env || {};
  const customerCode = String(env.CLOUDFLARE_STREAM_CUSTOMER_CODE || "").trim();
  if (!config.supabaseUrl || !config.anonKey || !config.serviceKey || !config.cloudflareAccountId || !config.cloudflareToken || !customerCode) {
    return sendJson(res, 503, { error: "Secure video playback is not configured on the server yet." });
  }

  try {
    const postId = String(req.query?.postId || "");
    if (!uuid.test(postId)) return sendJson(res, 400, { error: "A valid post reference is required." });
    const viewer = await authenticate(req);
    const posts = await supabaseRest(
      "posts?select=id,author_id,visibility,status,moderation_state,media_asset_id&id=eq." + encodeURIComponent(postId)
    );
    const post = posts?.[0];
    if (!post || post.status !== "ready" || post.moderation_state !== "approved" || !post.media_asset_id) {
      return sendJson(res, 404, { error: "This video is not available for playback." });
    }

    const profiles = await supabaseRest("profiles?select=id,is_private&id=eq." + encodeURIComponent(post.author_id));
    const creator = profiles?.[0];
    if (!creator) return sendJson(res, 404, { error: "Creator profile is unavailable." });

    const isOwner = Boolean(viewer && viewer.id === post.author_id);
    if (viewer && !isOwner) {
      const blocks = await supabaseRest(
        "blocks?select=blocker_id&or=(and(blocker_id.eq." + encodeURIComponent(viewer.id) +
        ",blocked_id.eq." + encodeURIComponent(post.author_id) + "),and(blocker_id.eq." +
        encodeURIComponent(post.author_id) + ",blocked_id.eq." + encodeURIComponent(viewer.id) + "))"
      );
      if (Array.isArray(blocks) && blocks.length) return sendJson(res, 403, { error: "This video is unavailable." });
    }

    if (!isOwner) {
      if (post.visibility === "public") {
        if (creator.is_private) return sendJson(res, 403, { error: "This video is not available to this viewer." });
      } else if (post.visibility === "followers" && viewer) {
        const follows = await supabaseRest(
          "follows?select=follower_id&follower_id=eq." + encodeURIComponent(viewer.id) +
          "&followed_id=eq." + encodeURIComponent(post.author_id) + "&status=eq.accepted"
        );
        if (!Array.isArray(follows) || !follows.length) return sendJson(res, 403, { error: "Follow this creator to watch this video." });
      } else {
        return sendJson(res, 403, { error: "This video is private." });
      }
    }

    const assets = await supabaseRest(
      "media_assets?select=provider,provider_asset_id,upload_state,owner_id&id=eq." +
      encodeURIComponent(post.media_asset_id) + "&owner_id=eq." + encodeURIComponent(post.author_id)
    );
    const asset = assets?.[0];
    if (!asset || asset.provider !== "cloudflare_stream" || asset.upload_state !== "ready" || !asset.provider_asset_id) {
      return sendJson(res, 409, { error: "This video is still processing." });
    }

    const tokenResult = await cloudflareRequest("/stream/" + encodeURIComponent(asset.provider_asset_id) + "/token", {
      method: "POST", body: JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 1800 })
    });
    if (!tokenResult?.token) throw new Error("The video provider did not issue a playback token.");
    return sendJson(res, 200, {
      playerUrl: "https://customer-" + customerCode + ".cloudflarestream.com/" + tokenResult.token + "/iframe",
      expiresInSeconds: 1800
    });
  } catch (error) {
    return sendJson(res, 500, { error: cleanError(error) });
  }
}
