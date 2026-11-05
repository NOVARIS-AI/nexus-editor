import { adminClient, authenticatedUser, getBody, json, onlyMethod, serverConfig } from "../../server/social";

export default async function handler(req: any, res: any) {
  if (!onlyMethod(req, res, "POST")) return;
  try {
    const user = await authenticatedUser(req);
    const body = getBody(req);
    const fileName = typeof body.fileName === "string" ? body.fileName.slice(0, 180) : "nexus-video.mp4";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
    const sizeBytes = Number(body.sizeBytes);
    const durationSeconds = Number(body.durationSeconds);
    const caption = typeof body.caption === "string" ? body.caption.trim().slice(0, 2200) : "";
    const visibility = body.visibility === "followers" || body.visibility === "private" ? body.visibility : "public";
    const commentsEnabled = body.commentsEnabled !== false;
    const remixEnabled = body.remixEnabled === true;

    const allowedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
    if (!allowedTypes.includes(mimeType)) return json(res, 400, { error: "Choose an MP4, WebM or MOV video." });
    if (!Number.isFinite(sizeBytes) || sizeBytes < 1 || sizeBytes > 200 * 1024 * 1024)
      return json(res, 400, { error: "This upload supports videos up to 200 MB. Larger resumable uploads will be added separately." });
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 600)
      return json(res, 400, { error: "Video duration must be between 1 second and 10 minutes." });

    const { account, streamToken } = serverConfig();
    if (!account || !streamToken) return json(res, 503, { error: "Cloudflare Stream is not connected on the server yet." });

    const cloudflare = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/stream/direct_upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${streamToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        maxDurationSeconds: 600,
        expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        creator: user.id.slice(0, 64),
        requireSignedURLs: true,
        meta: { app: "nexus-studio", ownerId: user.id, fileName }
      })
    });
    const streamResult = await cloudflare.json() as any;
    if (!cloudflare.ok || !streamResult.success || !streamResult.result?.uid || !streamResult.result?.uploadURL)
      return json(res, 502, { error: "Cloudflare could not prepare this upload. Please try again later." });

    const db = adminClient();
    const { data: asset, error: assetError } = await db.from("media_assets").insert({
      owner_id: user.id, provider: "cloudflare", provider_asset_id: streamResult.result.uid,
      upload_state: "uploading", mime_type: mimeType, size_bytes: sizeBytes,
      duration_ms: Math.round(durationSeconds * 1000)
    }).select("id").single();
    if (assetError || !asset) throw new Error(assetError?.message || "Could not create the media record.");

    const { data: post, error: postError } = await db.from("posts").insert({
      author_id: user.id, caption, visibility, status: "uploading",
      moderation_state: "pending", media_asset_id: asset.id,
      comments_enabled: commentsEnabled, remix_enabled: remixEnabled,
      duration_ms: Math.round(durationSeconds * 1000)
    }).select("id").single();
    if (postError || !post) {
      await db.from("media_assets").delete().eq("id", asset.id);
      throw new Error(postError?.message || "Could not create the post draft.");
    }

    return json(res, 200, {
      uploadUrl: streamResult.result.uploadURL, assetId: asset.id, postId: post.id,
      maxFileBytes: 200 * 1024 * 1024, expiresInSeconds: 3600
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start the upload.";
    const status = /sign in|session is invalid/i.test(message) ? 401 : 500;
    return json(res, status, { error: status === 500 ? "The upload could not be prepared. Check server configuration and try again." : message });
  }
}
