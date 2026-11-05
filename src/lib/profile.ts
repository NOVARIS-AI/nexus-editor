import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type CreatorProfile = {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
};

const PROFILE_FIELDS = "id, username, display_name, avatar_url, bio, is_private, created_at, updated_at";

export async function getMyProfile(user?: User | null): Promise<CreatorProfile | null> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const currentUser = user ?? (await supabase.auth.getUser()).data.user;
  if (!currentUser) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) throw error;
  return data as CreatorProfile | null;
}

export async function updateMyProfile(
  changes: Partial<Pick<CreatorProfile, "username" | "display_name" | "avatar_url" | "bio" | "is_private">>
): Promise<CreatorProfile> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sign in to update your creator profile.");

  const safeChanges = { ...changes };
  if (typeof safeChanges.display_name === "string") {
    safeChanges.display_name = safeChanges.display_name.trim().slice(0, 60) || "NEXUS Creator";
  }
  if (typeof safeChanges.username === "string") {
    const username = safeChanges.username.trim();
    if (username && !/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      throw new Error("Username must be 3–24 characters using letters, numbers or underscores.");
    }
    safeChanges.username = username || null;
  }
  if (typeof safeChanges.bio === "string") safeChanges.bio = safeChanges.bio.trim().slice(0, 160);

  const { data, error } = await supabase
    .from("profiles")
    .update(safeChanges)
    .eq("id", authData.user.id)
    .select(PROFILE_FIELDS)
    .single();

  if (error) throw error;
  return data as CreatorProfile;
}
