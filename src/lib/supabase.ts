import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const env = import.meta.env as Record<string, string | undefined>;
const projectUrl = env.VITE_SUPABASE_URL?.trim();
const publishableKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY)?.trim();

export const isSupabaseConfigured = Boolean(projectUrl && publishableKey);
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(projectUrl!, publishableKey!, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, flowType: "pkce" }
    })
  : null;
