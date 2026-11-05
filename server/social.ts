import { createClient } from "@supabase/supabase-js";

type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  on?: (event: string, callback: (chunk?: unknown) => void) => void;
};
type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
};

const env = ((globalThis as any).process?.env || {}) as Record<string, string | undefined>;

export function serverConfig() {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anon = env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  const streamToken = env.CLOUDFLARE_STREAM_API_TOKEN;
  const webhookSecret = env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
  return { url, anon, service, account, streamToken, webhookSecret };
}

export function json(res: ApiResponse, status: number, body: unknown) {
  res.status(status).json(body);
}

export function adminClient() {
  const { url, service } = serverConfig();
  if (!url || !service) throw new Error("Server database credentials are not configured.");
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function authenticatedUser(req: ApiRequest) {
  const { url, anon } = serverConfig();
  if (!url || !anon) throw new Error("Supabase server authentication is not configured.");
  const header = req.headers.authorization || req.headers.Authorization;
  const token = Array.isArray(header) ? header[0] : header;
  if (!token?.startsWith("Bearer ")) throw new Error("Sign in to continue.");
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token.slice(7));
  if (error || !data.user) throw new Error("Your session is invalid or has expired. Sign in again.");
  return data.user;
}

export function onlyMethod(req: ApiRequest, res: ApiResponse, method: string) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", method + ", OPTIONS");
    res.status(204).end();
    return false;
  }
  if (req.method !== method) {
    res.setHeader("Allow", method);
    json(res, 405, { error: "Method not allowed." });
    return false;
  }
  return true;
}

export function getBody(req: ApiRequest): Record<string, unknown> {
  if (req.body && typeof req.body === "object") return req.body as Record<string, unknown>;
  return {};
}

export async function readRawBody(req: ApiRequest): Promise<string> {
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object") return JSON.stringify(req.body);
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on?.("data", chunk => { raw += typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk as ArrayBuffer); });
    req.on?.("end", () => resolve(raw));
    req.on?.("error", reject);
  });
}
