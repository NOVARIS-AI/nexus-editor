import { authenticate, cleanError, cloudflareRequest, getConfig, methodOnly, sendJson, supabaseRest } from "./_shared";

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export default async function handler(req: any, res: any) {
  if (!methodOnly(req, res, "POST")) return;
  const config = getConfig();
  if (!config.supabaseUrl || !config.anonKey || !config.serviceKey || !config.cloudflareAccountId || !config.cloudflareToken) {
    return sendJson(res, 503, { error: "Secure video uploads are not configured yet. The editor and local projects remain available." });
  }
  try {
    const user = await authenticate(req);
    if (!user) return sendJson(res, 401, { error: "Sign in again before uploading." });
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const filename = String(body.filename || "nexus-video").replace(/[\\/\\r\\n]/g, "_").slice(0, 120);
    const mimeType = String(body.mimeType || "").toLowerCase();
    const sizeBytes = Number(body.sizeBytes);
    if (!ALLOWED_TYPES.has(mimeType)) return sendJson(res, 400, { error: "Choose an MP4, WebM or QuickTime video." });
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_UPLOAD_BYTES) {
      return sendJson(res, 413, { error: "Videos must be between 1 byte and 200 MB for this upload route." });
    }
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = await supabaseRest("posts?select=id&author_id=eq." + encodeURIComponent(user.id) + "&created_at=gte." + encodeURIComponent(since));
    if (Array.isArray(recent) && recent.length >= 10) return sendJson(res, 429, { error: "Upload limit reached for now. Try again later." });

    const visibility = ["public", "followers", "private"].includes(body.visibility) ? body.visibility : "public";
    const caption = String(body.caption || "").slice(0, 2200);
    const topics = Array.isArray(body.topics) ? body.topics.map((v: unknown) => String(v).trim().slice(0, 40)).filter(Boolean).slice(0, 12) : [];
    const mediaRows = await supabaseRest("media_assets?select=id", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify([{ owner_id: user.id, provider: "cloudflare_stream", upload_state: "uploading", mime_type: mimeType, size_bytes: sizeBytes }])
    });
    const mediaAssetId = mediaRows?.[0]?.id;
    if (!mediaAssetId) throw new Error("Could not create the private media record.");
    let postId = "";
    try {
      const postRows = await supabaseRest("posts?select=id", {
        method: "POST", headers: { Prefer: "return=representation" },
        body: JSON.stringify([{
          author_id: user.id, caption, topics, visibility, status: "draft",
          moderation_state: "pending", media_asset_id: mediaAssetId,
          comments_enabled: body.commentsEnabled !== false, remix_enabled: body.remixEnabled === true,
          source_project_id: String(body.projectName || "").slice(0, 120)
        }])
      });
      postId = postRows?.[0]?.id || "";
      if (!postId) throw new Error("Could not create the private post draft.");
      const upload = await cloudflareRequest("/stream/direct_upload", {
        method: "POST",
        body: JSON.stringify({
          maxDurationSeconds: 600, expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          requireSignedURLs: true, creator: user.id, meta: { name: filename, nexusPostId: postId }
        })
      });
      if (!upload?.uid || !upload?.uploadURL) throw new Error("The video provider did not return a secure upload URL.");
      await supabaseRest("media_assets?id=eq." + encodeURIComponent(mediaAssetId), {
        method: "PATCH", body: JSON.stringify({ provider_asset_id: upload.uid })
      });
      return sendJson(res, 201, {
        postId, mediaAssetId, uploadUrl: upload.uploadURL, maxBytes: MAX_UPLOAD_BYTES,
        expiresInSeconds: 3600, state: "uploading",
        message: "A private draft has been created. It will not appear in the feed until moderation and publishing are complete."
      });
    } catch (error) {
      if (postId) await supabaseRest("posts?id=eq." + encodeURIComponent(postId), { method: "DELETE" }).catch(() => null);
      await supabaseRest("media_assets?id=eq." + encodeURIComponent(mediaAssetId), { method: "DELETE" }).catch(() => null);
      throw error;
    }
  } catch (error) {
    return sendJson(res, 500, { error: cleanError(error) });
  }
}
