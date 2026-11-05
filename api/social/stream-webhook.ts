import { adminClient, json, onlyMethod, readRawBody, serverConfig } from "../../server/social";

export const config = { api: { bodyParser: false } };

async function verifySignature(rawBody: string, header: string, secret: string) {
  const values = Object.fromEntries(header.split(",").map(part => {
    const index = part.indexOf("=");
    return index < 0 ? [part, ""] : [part.slice(0, index), part.slice(index + 1)];
  }));
  const timestamp = Number(values.time);
  const supplied = values.sig1 || "";
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300 || !/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${values.time}.${rawBody}`));
  const expected = [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  let mismatch = expected.length ^ supplied.length;
  for (let i = 0; i < Math.max(expected.length, supplied.length); i++) mismatch |= (expected.charCodeAt(i) || 0) ^ (supplied.toLowerCase().charCodeAt(i) || 0);
  return mismatch === 0;
}

export default async function handler(req: any, res: any) {
  if (!onlyMethod(req, res, "POST")) return;
  try {
    const { webhookSecret } = serverConfig();
    if (!webhookSecret) return json(res, 503, { error: "Stream webhook secret is not configured." });
    const signature = req.headers["webhook-signature"];
    if (typeof signature !== "string") return json(res, 401, { error: "Missing webhook signature." });
    const rawBody = await readRawBody(req);
    if (!await verifySignature(rawBody, signature, webhookSecret)) return json(res, 401, { error: "Invalid webhook signature." });
    const event = JSON.parse(rawBody) as any;
    if (typeof event.uid !== "string") return json(res, 400, { error: "Invalid Stream event." });

    const db = adminClient();
    const { data: asset, error: lookupError } = await db.from("media_assets")
      .select("id").eq("provider", "cloudflare").eq("provider_asset_id", event.uid).maybeSingle();
    if (lookupError) throw lookupError;
    if (!asset) return json(res, 200, { received: true });

    const state = event.status?.state;
    const ready = state === "ready" && event.readyToStream === true && Number(event.status?.pctComplete) >= 100;
    const failed = state === "error";
    if (!ready && !failed) return json(res, 200, { received: true, state: state || "processing" });

    const { error: assetUpdateError } = await db.from("media_assets")
      .update({
        upload_state: ready ? "ready" : "failed",
        duration_ms: Number.isFinite(Number(event.duration)) && Number(event.duration) > 0 ? Math.round(Number(event.duration) * 1000) : undefined,
        width: Number.isInteger(event.input?.width) && event.input.width > 0 ? event.input.width : undefined,
        height: Number.isInteger(event.input?.height) && event.input.height > 0 ? event.input.height : undefined
      }).eq("id", asset.id);
    if (assetUpdateError) throw assetUpdateError;

    const { error: postUpdateError } = await db.from("posts")
      .update({ status: ready ? "processing" : "failed", moderation_state: "pending" })
      .eq("media_asset_id", asset.id);
    if (postUpdateError) throw postUpdateError;

    return json(res, 200, { received: true, state: ready ? "ready_for_moderation" : "failed" });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : "Webhook processing failed." });
  }
}
