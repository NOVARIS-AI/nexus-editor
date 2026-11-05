import { supabase } from "../lib/supabase";

export type CommunityPost = {
  id: string;
  authorId: string;
  creator: string;
  handle: string;
  initials: string;
  caption: string;
  likes: number;
  comments: number;
  topics: string[];
  creatorTopics: string[];
  visibility: "public" | "followers" | "private";
  createdAt: string;
};

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export async function loadCommunityFeed(mode: "public" | "following" = "public"): Promise<CommunityPost[]> {
  if (!supabase) return [];
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  let authorIds: string[] | null = null;

  if (mode === "following") {
    if (!userId) return [];
    const { data: follows, error } = await supabase.from("follows")
      .select("followed_id").eq("follower_id", userId).eq("status", "accepted");
    fail(error);
    authorIds = (follows || []).map(row => row.followed_id);
    if (!authorIds.length) return [];
  }

  let query = supabase.from("posts")
    .select("id,author_id,caption,topics,visibility,created_at")
    .eq("status", "ready");
  if (!authorIds) query = query.eq("visibility", "public");
  if (authorIds) query = query.in("author_id", authorIds);
  query = query.order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false }).limit(100);

  const { data: posts, error: postsError } = await query;
  fail(postsError);
  if (!posts?.length) return [];

  const ids = posts.map(post => post.id);
  const creators = [...new Set(posts.map(post => post.author_id))];
  const [profilesResult, likesResult, commentsResult] = await Promise.all([
    supabase.from("profiles").select("id,username,display_name,creator_topics").in("id", creators),
    supabase.from("post_likes").select("post_id,user_id").in("post_id", ids),
    supabase.from("comments").select("id,post_id").in("post_id", ids).eq("status", "visible")
  ]);
  fail(profilesResult.error); fail(likesResult.error); fail(commentsResult.error);
  const profiles = new Map((profilesResult.data || []).map(profile => [profile.id, profile]));
  const likeCounts = new Map<string, number>();
  const commentCounts = new Map<string, number>();
  for (const row of likesResult.data || []) likeCounts.set(row.post_id, (likeCounts.get(row.post_id) || 0) + 1);
  for (const row of commentsResult.data || []) commentCounts.set(row.post_id, (commentCounts.get(row.post_id) || 0) + 1);

  return posts.map(post => {
    const profile = profiles.get(post.author_id);
    const display = profile?.display_name || "NEXUS Creator";
    const handle = profile?.username || "creator";
    return {
      id: post.id, authorId: post.author_id, creator: display, handle,
      initials: display.split(/\\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase() || "N",
      caption: post.caption || "", topics: post.topics || [], creatorTopics: profile?.creator_topics || [],
      likes: likeCounts.get(post.id) || 0,
      comments: commentCounts.get(post.id) || 0,
      visibility: post.visibility as CommunityPost["visibility"],
      createdAt: post.created_at
    };
  });
}

export type CreatorProfile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  isPrivate: boolean;
  creatorTopics: string[];
  postCount: number;
  followerCount: number;
};

export async function loadCreatorProfile(handle: string): Promise<CreatorProfile | null> {
  if (!supabase) return null;
  const { data: profile, error } = await supabase.from("profiles")
    .select("id,username,display_name,avatar_url,bio,is_private,creator_topics")
    .eq("username", handle).maybeSingle();
  fail(error);
  if (!profile) return null;

  const [posts, followers] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true })
      .eq("author_id", profile.id).eq("status", "ready").eq("visibility", "public"),
    supabase.from("follows").select("follower_id", { count: "exact", head: true })
      .eq("followed_id", profile.id).eq("status", "accepted")
  ]);
  fail(posts.error); fail(followers.error);
  return {
    id: profile.id,
    username: profile.username || handle,
    displayName: profile.display_name || "NEXUS Creator",
    avatarUrl: profile.avatar_url || null,
    bio: profile.bio || "",
    isPrivate: Boolean(profile.is_private),
    creatorTopics: profile.creator_topics || [],
    postCount: posts.count || 0,
    followerCount: followers.count || 0
  };
}

export async function loadMyPostInteractions(postIds: string[]) {
  if (!supabase || !postIds.length) return { liked: [] as string[], saved: [] as string[] };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { liked: [], saved: [] };
  const [likes, saves] = await Promise.all([
    supabase.from("post_likes").select("post_id").eq("user_id", auth.user.id).in("post_id", postIds),
    supabase.from("post_saves").select("post_id").eq("user_id", auth.user.id).in("post_id", postIds)
  ]);
  fail(likes.error); fail(saves.error);
  return { liked: (likes.data || []).map(row => row.post_id), saved: (saves.data || []).map(row => row.post_id) };
}

export async function togglePostLike(postId: string, liked: boolean) {
  if (!supabase) throw new Error("Supabase is not configured in this build.");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to like posts.");
  const result = liked
    ? await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", auth.user.id)
    : await supabase.from("post_likes").insert({ post_id: postId, user_id: auth.user.id });
  fail(result.error);
}

export async function togglePostSave(postId: string, saved: boolean) {
  if (!supabase) throw new Error("Supabase is not configured in this build.");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to save posts.");
  const result = saved
    ? await supabase.from("post_saves").delete().eq("post_id", postId).eq("user_id", auth.user.id)
    : await supabase.from("post_saves").insert({ post_id: postId, user_id: auth.user.id });
  fail(result.error);
}

export async function toggleCreatorFollow(creatorId: string, following: boolean) {
  if (!supabase) throw new Error("Supabase is not configured in this build.");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to follow creators.");
  if (following) {
    const { error } = await supabase.from("follows").delete()
      .eq("follower_id", auth.user.id).eq("followed_id", creatorId);
    fail(error);
  } else {
    const { error } = await supabase.from("follows").insert({
      follower_id: auth.user.id, followed_id: creatorId
    });
    fail(error);
  }
}

export async function loadPostComments(postId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("comments")
    .select("id,body,author_id,created_at")
    .eq("post_id", postId).eq("status", "visible")
    .order("created_at", { ascending: true }).limit(100);
  fail(error);
  const authorIds = [...new Set((data || []).map(row => row.author_id))];
  const { data: profiles, error: profileError } = authorIds.length
    ? await supabase.from("profiles").select("id,username,display_name").in("id", authorIds)
    : { data: [], error: null };
  fail(profileError);
  const byId = new Map((profiles || []).map(profile => [profile.id, profile]));
  return (data || []).map(row => ({
    id: row.id, body: row.body,
    author: byId.get(row.author_id)?.display_name || "NEXUS Creator",
    handle: byId.get(row.author_id)?.username || "creator",
    createdAt: row.created_at
  }));
}

export async function createPostComment(postId: string, body: string) {
  if (!supabase) throw new Error("Supabase is not configured in this build.");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to comment.");
  const { error } = await supabase.from("comments").insert({
    post_id: postId, author_id: auth.user.id, body: body.trim()
  });
  fail(error);
}

export async function reportCommunityPost(postId: string, reason: "spam" | "harassment" | "hate" | "sexual_content" | "violence" | "self_harm" | "copyright" | "misinformation" | "other") {
  if (!supabase) throw new Error("Supabase is not configured in this build.");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to report content.");
  const { error } = await supabase.from("reports").insert({
    reporter_id: auth.user.id, target_type: "post", target_id: postId, reason
  });
  fail(error);
}

export async function loadMyFollowedCreators(creatorIds: string[]) {
  if (!supabase || !creatorIds.length) return [] as string[];
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [] as string[];
  const { data, error } = await supabase.from("follows")
    .select("followed_id").eq("follower_id", auth.user.id)
    .eq("status", "accepted").in("followed_id", creatorIds);
  fail(error);
  return (data || []).map(row => row.followed_id);
}

export type NexusPulsePreferences = {
  preferredCategories: string[];
  hiddenPostIds: string[];
  hiddenCreatorIds: string[];
};

const emptyPulsePreferences: NexusPulsePreferences = {
  preferredCategories: [], hiddenPostIds: [], hiddenCreatorIds: []
};

export async function loadPulsePreferences(): Promise<NexusPulsePreferences> {
  if (!supabase) return emptyPulsePreferences;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return emptyPulsePreferences;
  const { data, error } = await supabase.from("feed_preferences")
    .select("preferred_categories,hidden_post_ids,hidden_creator_ids")
    .eq("user_id", auth.user.id).maybeSingle();
  fail(error);
  return data ? {
    preferredCategories: data.preferred_categories || [],
    hiddenPostIds: data.hidden_post_ids || [],
    hiddenCreatorIds: data.hidden_creator_ids || []
  } : emptyPulsePreferences;
}

export async function savePulsePreferences(preferences: NexusPulsePreferences) {
  if (!supabase) throw new Error("Supabase is not configured in this build.");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to save feed preferences.");
  const { error } = await supabase.from("feed_preferences").upsert({
    user_id: auth.user.id,
    preferred_categories: [...new Set(preferences.preferredCategories)].slice(0, 20),
    hidden_post_ids: [...new Set(preferences.hiddenPostIds)].slice(-500),
    hidden_creator_ids: [...new Set(preferences.hiddenCreatorIds)].slice(-500)
  }, { onConflict: "user_id" });
  fail(error);
}

export async function loadPulseInterestWeights() {
  if (!supabase) return {} as Record<string, number>;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return {} as Record<string, number>;
  const [likes, saves] = await Promise.all([
    supabase.from("post_likes").select("post_id,posts!inner(caption,topics)").eq("user_id", auth.user.id).limit(200),
    supabase.from("post_saves").select("post_id,posts!inner(caption,topics)").eq("user_id", auth.user.id).limit(200)
  ]);
  fail(likes.error); fail(saves.error);
  const weights: Record<string, number> = {};
  const add = (rows: any[] | null, weight: number) => {
    for (const row of rows || []) {
      const post = Array.isArray(row.posts) ? row.posts[0] : row.posts;
      const text = [post?.caption || "", ...(post?.topics || [])].join(" ").toLowerCase();
      const terms: Record<string, string[]> = {
        Creative: ["edit","editing","cinematic","visual","story","motion","film","creator","design"],
        Design: ["design","logo","brand","poster","graphic","typography","colour","color","product"],
        Learning: ["learn","lesson","tutorial","explain","study","education","how to","tips","knowledge"],
        Lifestyle: ["daily","routine","travel","food","fashion","life","vlog","moment","recap"],
        Gaming: ["game","gaming","gamer","gameplay","level","stream"],
        Music: ["music","song","beat","audio","dance","sing","sound"],
        Business: ["business","brand","marketing","sales","startup","entrepreneur","productivity"]
      };
      let best = "Creative", score = 0;
      for (const [category, words] of Object.entries(terms)) {
        const count = words.reduce((total, word) => total + (text.includes(word) ? 1 : 0), 0);
        if (count > score) { best = category; score = count; }
      }
      weights[best] = (weights[best] || 0) + weight;
    }
  };
  add(likes.data, 1); add(saves.data, 2);
  return weights;
}

export async function saveMyCreatorTopics(topics: string[]) {
  if (!supabase) throw new Error("Supabase is not configured in this build.");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to edit creator topics.");
  const normalized = [...new Set(topics.map(topic => topic.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
  const { error } = await supabase.from("profiles")
    .update({ creator_topics: normalized }).eq("id", auth.user.id);
  fail(error);
  return normalized;
}

export async function loadMyCreatorTopics() {
  if (!supabase) return [] as string[];
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [] as string[];
  const { data, error } = await supabase.from("profiles")
    .select("creator_topics").eq("id", auth.user.id).maybeSingle();
  fail(error);
  return data?.creator_topics || [];
}
