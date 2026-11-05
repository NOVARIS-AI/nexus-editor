const env = (globalThis as any).process?.env || {};

export type ApiUser = { id: string; email?: string };

export function sendJson(res: any, status: number, payload: unknown) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

export function methodOnly(req: any, res: any, method: string) {
  if (req.method === method) return true;
  res.setHeader("Allow", method);
  sendJson(res, 405, { error: "Method not allowed." });
  return false;
}

export function getConfig() {
  return {
    supabaseUrl: String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
    anonKey: String(env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || ""),
    serviceKey: String(env.SUPABASE_SERVICE_ROLE_KEY || ""),
    cloudflareAccountId: String(env.CLOUDFLARE_ACCOUNT_ID || ""),
    cloudflareToken: String(env.CLOUDFLARE_STREAM_TOKEN || "")
  };
}

export async function authenticate(req: any): Promise<ApiUser | null> {
  const config = getConfig();
  const header = String(req.headers?.authorization || "");
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !config.supabaseUrl || !config.anonKey) return null;
  const response = await fetch(config.supabaseUrl + "/auth/v1/user", {
    headers: { apikey: config.anonKey, Authorization: "Bearer " + token }
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user?.id ? { id: String(user.id), email: user.email ? String(user.email) : undefined } : null;
}

export async function supabaseRest(path: string, init: RequestInit = {}) {
  const config = getConfig();
  if (!config.supabaseUrl || !config.serviceKey) throw new Error("The trusted Supabase server configuration is incomplete.");
  const response = await fetch(config.supabaseUrl + "/rest/v1/" + path, {
    ...init,
    headers: {
      apikey: config.serviceKey,
      Authorization: "Bearer " + config.serviceKey,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  const raw = await response.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) throw new Error(typeof data?.message === "string" ? data.message : "Supabase request failed.");
  return data;
}

export async function cloudflareRequest(path: string, init: RequestInit = {}) {
  const config = getConfig();
  if (!config.cloudflareAccountId || !config.cloudflareToken) throw new Error("Cloudflare Stream is not configured on the server.");
  const response = await fetch("https://api.cloudflare.com/client/v4/accounts/" + config.cloudflareAccountId + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + config.cloudflareToken,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  const payload: any = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    const message = payload?.errors?.[0]?.message;
    throw new Error(typeof message === "string" ? message : "Cloudflare Stream request failed.");
  }
  return payload?.result;
}

export function getBearer(req: any) {
  return String(req.headers?.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1] || "";
}

export function cleanError(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed.";
}
