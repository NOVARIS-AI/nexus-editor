import { authenticate, cleanError, cloudflareRequest, getConfig, methodOnly, sendJson, supabaseRest } from "./_shared";

export default async function handler(req: any, res: any) {
  if (!methodOnly(req, res, "GET")) return;
  const config = getConfig();
  if (!config.supabaseUrl || !config.anonKey || !config.serviceKey || !config.cloudflareAccountId || !config.cloudflareToken) {
    return sendJson(res, 503, { error: "Video processing status is not configured on the server." });
  }
  try {
    const user = await authenticate(req);
    if (!user) return sendJson(res, 401, { error: "Sign in again to check this upload." });
    const mediaAssetId = String(req.query?.mediaAssetId || "");
    if (!/^[0-9a-f-]{36}$/i.test(mediaAssetId)) return sendJson(res, 400, { error: "A valid media asset ID is required." });

    const rows = await supabaseRest(
      "media_assets?select=id,owner_id,provider,provider_asset_id,upload_state& id=eq.".replace(" ", "") + encodeURIComponent(mediaAssetId) + "&owner_id=eq." + encodeURIComponent(user.id)
    );
    const asset = rows?.[0];
    if (!asset) return sendJson(res, 404, { error: "This upload was not found for your account." });
    if (asset.provider !== "cloudflare_stream" || !asset.provider_asset_id) {
      return sendJson(res, 409, { error: "This media item does not have a configured video upload." });
    }

    const video = await cloudflareRequest("/stream/" + encodeURIComponent(asset.provider_asset_id), { method: "GET", headers: { "Content-Type": "application/json" } });
    const ready = video?.readyToStream === true;
    const failed = video?.status?.state === "error";
    const state = failed ? "failed" : ready ? "ready" : "processing";
    const patch: Record<string, unknown> = { upload_state: state };
    if (ready) patch.provider_ready_at = new Date().toISOString();
    if (typeof video?.duration === "number") patch.duration_ms = Math.round(video.duration * 1000);
    if (Number.isInteger(video?.input?.width) && video.input.width > 0) patch.width = video.input.width;
    if (Number.isInteger(video?.input?.height) && video.input.height > 0) patch.height = video.input.height;
    if (typeof video?.thumbnail === "string") patch.thumbnail_url = video.thumbnail;
    if (typeof video?.uid === "string") patch.playback_id = video.uid;

    await supabaseRest("media_assets?id=eq." + encodeURIComponent(mediaAssetId) + "&owner_id=eq." + encodeURIComponent(user.id), {
      method: "PATCH", body: JSON.stringify(patch)
    });
    return sendJson(res, 200, {
      mediaAssetId, state, readyToStream: ready,
      durationMs: patch.duration_ms || null, width: patch.width || null, height: patch.height || null,
      message: ready
        ? "Video processing is complete. Your post remains a private draft until moderation and publishing are approved."
        : failed ? "The video provider reported a processing error." : "Your video is still processing."
    });
  } catch (error) {
    return sendJson(res, 500, { error: cleanError(error) });
  }
}
