import { authenticate, cleanError, cloudflareRequest, getConfig, methodOnly, sendJson, supabaseRest } from "./_shared";

export default async function handler(req: any, res: any) {
  if (!methodOnly(req, res, "POST")) return;
  const config = getConfig();
  if (!config.supabaseUrl || !config.anonKey || !config.serviceKey || !config.cloudflareAccountId || !config.cloudflareToken) {
    return sendJson(res, 503, { error: "Secure video upload is not configured on the server." });
  }
  try {
    const user = await authenticate(req);
    if (!user) return sendJson(res, 401, { error: "Sign in before uploading a community video." });
    const body = typeof req.body === "object" && req.body ? req.body : {};
    const fileName = typeof body.fileName === "string" ? body.fileName.slice(0, 180) : "nexus-video.mp4";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
    const sizeBytes = Number(body.sizeBytes);
    const durationSeconds = Number(body.durationSeconds);
    const caption = typeof body.caption === "string" ? body.caption.trim().slice(0, 2200) : "";
    const visibility = body.visibility === "followers" || body.visibility === "private" ? body.visibility : "public";
    const commentsEnabled = body.commentsEnabled !== false;
    const remixEnabled = body.remixEnabled === true;
    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];

    if (!allowedTypes.includes(mimeType)) return sendJson(res, 400, { error: "Choose an MP4, WebM or MOV video." });
    if (!Number.isFinite(sizeBytes) || sizeBytes < 1 || sizeBytes > 200 * 1024 * 1024)
      return sendJson(res, 400, { error: "This upload supports videos up to 200 MB." });
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 600)
      return sendJson(res, 400, { error: "Video duration must be between 1 second and 10 minutes." });

    const recent = await supabaseRest("media_assets?select=id&owner_id=eq." + encodeURIComponent(user.id) +
      "&created_at=gte." + encodeURIComponent(new Date(Date.now() - 3600000).toISOString()));
    if (Array.isArray(recent) && recent.length >= 5)
      return sendJson(res, 429, { error: "You have reached the current upload limit. Please try again later." });

    const direct = await cloudflareRequest("/stream/direct_upload", {
      method: "POST",
      body: JSON.stringify({
        maxDurationSeconds: 600,
        expiry: new Date(Date.now() + 3600000).toISOString(),
        creator: user.id.slice(0, 64),
        requireSignedURLs: true,
        meta: { app: "nexus-studio", ownerId: user.id, fileName }
      })
    });
    if (!direct?.uid || !direct?.uploadURL) return sendJson(res, 502, { error: "Cloudflare could not prepare this upload." });

    const assets = await supabaseRest("media_assets", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        owner_id: user.id, provider: "cloudflare_stream", provider_asset_id: direct.uid,
        upload_state: "uploading", mime_type: mimeType, size_bytes: sizeBytes,
        duration_ms: Math.round(durationSeconds * 1000)
      }])
    });
    const asset = assets?.[0];
    if (!asset?.id) throw new Error("Could not create the private media record.");

    const posts = await supabaseRest("posts", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        author_id: user.id, caption, visibility, status: "uploading",
        moderation_state: "pending", media_asset_id: asset.id,
        comments_enabled: commentsEnabled, remix_enabled: remixEnabled,
        duration_ms: Math.round(durationSeconds * 1000)
      }])
    });
    const post = posts?.[0];
    if (!post?.id) throw new Error("Could not create the private post record.");

    return sendJson(res, 200, {
      uploadUrl: direct.uploadURL, assetId: asset.id, postId: post.id,
      maxFileBytes: 200 * 1024 * 1024, expiresInSeconds: 3600
    });
  } catch (error) {
    return sendJson(res, 500, { error: cleanError(error) });
  }
}
