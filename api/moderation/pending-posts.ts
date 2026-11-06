import { requireModerator, cleanError, sendJson, supabaseRest } from "../../server/moderation-api.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return sendJson(res, 405, { error: "Method not allowed." }); }
  try {
    const access = await requireModerator(req, res);
    if (!access) return;
    const posts = await supabaseRest("posts?select=id,author_id,caption,topics,visibility,created_at,media_asset_id,source_project_id&status=eq.processing&moderation_state=eq.pending&order=created_at.asc&limit=100");
    const mediaIds = [...new Set((posts || []).map((post: any) => post.media_asset_id).filter(Boolean))];
    const media = mediaIds.length
      ? await supabaseRest("media_assets?select=id,upload_state,duration_ms,width,height,thumbnail_url&id=in.(" + mediaIds.join(",") + ")")
      : [];
    const mediaById = new Map((media || []).map((asset: any) => [asset.id, asset]));
    const authorIds = [...new Set((posts || []).map((post: any) => post.author_id))];
    const profiles = authorIds.length
      ? await supabaseRest("profiles?select=id,username,display_name&id=in.(" + authorIds.join(",") + ")")
      : [];
    const profileById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));
    const result = (posts || []).map((post: any) => ({
      ...post, media: mediaById.get(post.media_asset_id) || null,
      creator: profileById.get(post.author_id) || null
    })).filter((post: any) => post.media?.upload_state === "ready");
    return sendJson(res, 200, { posts: result, role: access.role });
  } catch (error) { return sendJson(res, 500, { error: cleanError(error) }); }
}
