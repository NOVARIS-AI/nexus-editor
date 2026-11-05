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
  mediaAssetId: string | null;
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
    .select("id,author_id,caption,topics,visibility,created_at,media_asset_id")
    .eq("status", "ready").eq("moderation_state", "approved").not("media_asset_id", "is", null);
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
      createdAt: post.created_at,
      mediaAssetId: post.media_asset_id || null
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

export type NexusReportReason = "spam" | "harassment" | "hate" | "sexual_content" | "violence" | "self_harm" | "copyright" | "misinformation" | "other";

export async function reportCommunityPost(postId: string, reason: NexusReportReason, details = "") {
  if (!supabase) throw new Error("Supabase is not configured in this build.");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to report content.");
  const { error } = await supabase.from("reports").insert({
    reporter_id: auth.user.id, target_type: "post", target_id: postId, reason,
    details: details.trim().slice(0, 2000)
  });
  fail(error);
}

export async function blockCommunityCreator(creatorId: string) {
  if (!supabase) throw new Error("Supabase is not configured in this build.");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to block a creator.");
  if (auth.user.id === creatorId) throw new Error("You cannot block your own account.");
  const { error } = await supabase.from("blocks").upsert(
    { blocker_id: auth.user.id, blocked_id: creatorId },
    { onConflict: "blocker_id,blocked_id" }
  );
  fail(error);
  // Remove an existing follow in either direction so the block takes effect cleanly.
  const { error: followError } = await supabase.from("follows").delete()
    .or(`and(follower_id.eq.${auth.user.id},followed_id.eq.${creatorId}),and(follower_id.eq.${creatorId},followed_id.eq.${auth.user.id})`);
  fail(followError);
}

export async function unblockCommunityCreator(creatorId: string) {
  if (!supabase) throw new Error("Supabase is not configured in this build.");
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to unblock a creator.");
  const { error } = await supabase.from("blocks").delete()
    .eq("blocker_id", auth.user.id).eq("blocked_id", creatorId);
  fail(error);
}

export async function loadMyBlockedCreators() {
  if (!supabase) return [] as string[];
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [] as string[];
  const { data, error } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", auth.user.id);
  fail(error);
  return (data || []).map(row => row.blocked_id);
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

export async function loadCommunityPlaybackUrl(postId: string): Promise<string> {
  const headers: Record<string, string> = {};
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) headers.Authorization = "Bearer " + data.session.access_token;
  }
  const response = await fetch("/api/social/playback-token?postId=" + encodeURIComponent(postId), {
    method: "GET", headers, cache: "no-store"
  });
  const result = await response.json().catch(() => ({})) as { playerUrl?: string; error?: string };
  if (!response.ok || !result.playerUrl) throw new Error(result.error || "This community video could not be opened.");
  return result.playerUrl;
}

export async function checkMyModerationAccess(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return false;
  try {
    const response = await fetch("/api/moderation/queue?status=open", {
      method: "GET", headers: { Authorization: "Bearer " + token }, cache: "no-store"
    });
    if (!response.ok) return false;
    const result = await response.json() as { role?: string };
    return result.role === "admin" || result.role === "moderator";
  } catch { return false; }
}

export type EditableCreatorProfile = { id:string; username:string; displayName:string; avatarUrl:string; bio:string; isPrivate:boolean; creatorTopics:string[] };
export async function loadMyCreatorProfile(): Promise<EditableCreatorProfile|null> {
  if (!supabase) return null;
  const {data:auth}=await supabase.auth.getUser(); if(!auth.user)return null;
  const {data,error}=await supabase.from("profiles").select("id,username,display_name,avatar_url,bio,is_private,creator_topics").eq("id",auth.user.id).maybeSingle(); fail(error);
  return data?{id:data.id,username:data.username||"",displayName:data.display_name||"",avatarUrl:data.avatar_url||"",bio:data.bio||"",isPrivate:Boolean(data.is_private),creatorTopics:data.creator_topics||[]}:null;
}
export async function updateMyCreatorProfile(p:Omit<EditableCreatorProfile,"id">) {
  if(!supabase)throw new Error("Supabase is not configured in this build.");
  const {data:auth}=await supabase.auth.getUser();if(!auth.user)throw new Error("Sign in to edit your creator profile.");
  const username=p.username.trim().toLowerCase();
  if(!/^[a-zA-Z0-9_]{3,24}$/.test(username))throw new Error("Username must be 3–24 letters, numbers or underscores.");
  if(!p.displayName.trim()||p.displayName.trim().length>60)throw new Error("Display name must be 1–60 characters.");
  if(p.bio.length>160)throw new Error("Bio must be 160 characters or fewer.");
  const topics=[...new Set(p.creatorTopics.map(x=>x.trim().toLowerCase()).filter(Boolean))].slice(0,12);
  const {error}=await supabase.from("profiles").update({username,display_name:p.displayName.trim(),avatar_url:p.avatarUrl.trim()||null,bio:p.bio.trim(),is_private:p.isPrivate,creator_topics:topics}).eq("id",auth.user.id);fail(error);
  return {...p,id:auth.user.id,username,displayName:p.displayName.trim(),bio:p.bio.trim(),creatorTopics:topics};
}
export type CreatorConnection={id:string;username:string;displayName:string;avatarUrl:string|null;bio:string;createdAt:string};
export type CreatorConnections={followers:CreatorConnection[];following:CreatorConnection[];requests:CreatorConnection[]};
export async function loadMyCreatorConnections():Promise<CreatorConnections>{
  if(!supabase)return{followers:[],following:[],requests:[]};
  const {data:auth}=await supabase.auth.getUser();if(!auth.user)return{followers:[],following:[],requests:[]};
  const [a,b,c]=await Promise.all([
    supabase.from("follows").select("follower_id,created_at").eq("followed_id",auth.user.id).eq("status","accepted").order("created_at",{ascending:false}),
    supabase.from("follows").select("followed_id,created_at").eq("follower_id",auth.user.id).eq("status","accepted").order("created_at",{ascending:false}),
    supabase.from("follows").select("follower_id,created_at").eq("followed_id",auth.user.id).eq("status","pending").order("created_at",{ascending:false})
  ]);fail(a.error);fail(b.error);fail(c.error);
  const followers=a.data||[],following=b.data||[],requests=c.data||[];
  const ids=[...new Set([...followers.map(x=>x.follower_id),...following.map(x=>x.followed_id),...requests.map(x=>x.follower_id)])];
  if(!ids.length)return{followers:[],following:[],requests:[]};
  const {data:profiles,error}=await supabase.from("profiles").select("id,username,display_name,avatar_url,bio").in("id",ids);fail(error);
  const map=new Map((profiles||[]).map(p=>[p.id,p]));
  const make=(id:string,createdAt:string):CreatorConnection|null=>{const p=map.get(id);return p?{id,username:p.username||"creator",displayName:p.display_name||"NEXUS Creator",avatarUrl:p.avatar_url,bio:p.bio||"",createdAt}:null;};
  return{followers:followers.map(x=>make(x.follower_id,x.created_at)).filter((x):x is CreatorConnection=>!!x),following:following.map(x=>make(x.followed_id,x.created_at)).filter((x):x is CreatorConnection=>!!x),requests:requests.map(x=>make(x.follower_id,x.created_at)).filter((x):x is CreatorConnection=>!!x)};
}
export async function respondToFollowRequest(followerId:string,accept:boolean){
  if(!supabase)throw new Error("Supabase is not configured in this build.");
  const {data:auth}=await supabase.auth.getUser();if(!auth.user)throw new Error("Sign in to manage follow requests.");
  const result=accept?await supabase.from("follows").update({status:"accepted"}).eq("follower_id",followerId).eq("followed_id",auth.user.id).eq("status","pending"):await supabase.from("follows").delete().eq("follower_id",followerId).eq("followed_id",auth.user.id).eq("status","pending");fail(result.error);
}

export type NexusNotification = {
  id:string; actorId:string|null; actorName:string; actorHandle:string;
  actorAvatar:string|null; eventType:"follow_request"|"new_follower"|"follow_accepted"|"post_like"|"post_comment";
  entityType:string|null; entityId:string|null; createdAt:string; readAt:string|null;
};
export async function loadNexusNotifications():Promise<{items:NexusNotification[];unreadCount:number}> {
  if(!supabase)return{items:[],unreadCount:0};
  const {data:auth}=await supabase.auth.getUser();if(!auth.user)return{items:[],unreadCount:0};
  const [itemsResult,unreadResult]=await Promise.all([
    supabase.from("notifications").select("id,actor_id,event_type,entity_type,entity_id,created_at,read_at").eq("recipient_id",auth.user.id).order("created_at",{ascending:false}).limit(60),
    supabase.from("notifications").select("id",{count:"exact",head:true}).eq("recipient_id",auth.user.id).is("read_at",null)
  ]);
  fail(itemsResult.error);fail(unreadResult.error);
  const rows=itemsResult.data||[];
  const actorIds=[...new Set(rows.map(row=>row.actor_id).filter((id):id is string=>Boolean(id)))];
  let profiles:any[]=[];
  if(actorIds.length){const result=await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",actorIds);fail(result.error);profiles=result.data||[];}
  const byId=new Map(profiles.map(profile=>[profile.id,profile]));
  return {items:rows.map(row=>{const actor=row.actor_id?byId.get(row.actor_id):null;return{
    id:row.id,actorId:row.actor_id,actorName:actor?.display_name||"A NEXUS creator",
    actorHandle:actor?.username||"creator",actorAvatar:actor?.avatar_url||null,
    eventType:row.event_type,entityType:row.entity_type,entityId:row.entity_id,
    createdAt:row.created_at,readAt:row.read_at
  };}),unreadCount:unreadResult.count||0};
}
export async function markNexusNotificationRead(notificationId?:string) {
  if(!supabase)throw new Error("Supabase is not configured in this build.");
  const {data:auth}=await supabase.auth.getUser();if(!auth.user)throw new Error("Sign in to manage notifications.");
  const {error}=await supabase.rpc("mark_nexus_notification_read",{p_notification_id:notificationId||null});fail(error);
}


export type SavedLibraryPost = {
  id:string; authorId:string; creator:string; handle:string; caption:string;
  visibility:"public"|"followers"|"private"; savedAt:string; mediaAssetId:string|null;
};
export type SavedCollection = { id:string; name:string; description:string; createdAt:string; postIds:string[] };

async function requireSocialUser() {
  if (!supabase) throw new Error("Supabase is not configured in this build.");
  const {data,error}=await supabase.auth.getUser();
  fail(error);
  if(!data.user) throw new Error("Sign in to use your saved library.");
  return data.user;
}

export async function loadSavedLibrary():Promise<SavedLibraryPost[]> {
  const user=await requireSocialUser();
  const {data:saves,error}=await supabase!.from("post_saves").select("post_id,created_at")
    .eq("user_id",user.id).order("created_at",{ascending:false}).limit(300);
  fail(error);
  const rows=saves||[];
  if(!rows.length) return [];
  const ids=rows.map(row=>row.post_id);
  const {data:posts,error:postsError}=await supabase!.from("posts")
    .select("id,author_id,caption,visibility,media_asset_id").in("id",ids);
  fail(postsError);
  const visible=posts||[];
  if(!visible.length) return [];
  const authorIds=[...new Set(visible.map(post=>post.author_id))];
  const {data:profiles,error:profilesError}=await supabase!.from("profiles")
    .select("id,username,display_name").in("id",authorIds);
  fail(profilesError);
  const profileMap=new Map((profiles||[]).map(profile=>[profile.id,profile]));
  const postMap=new Map(visible.map(post=>[post.id,post]));
  return rows.flatMap(row=>{
    const post=postMap.get(row.post_id);
    if(!post) return [];
    const profile=profileMap.get(post.author_id);
    return [{
      id:post.id,authorId:post.author_id,creator:profile?.display_name||"NEXUS Creator",
      handle:profile?.username||"creator",caption:post.caption||"",
      visibility:post.visibility as SavedLibraryPost["visibility"],
      savedAt:row.created_at,mediaAssetId:post.media_asset_id||null
    }];
  });
}

export async function loadSavedCollections():Promise<SavedCollection[]> {
  const user=await requireSocialUser();
  const {data:collections,error}=await supabase!.from("saved_collections")
    .select("id,name,description,created_at").eq("owner_id",user.id).order("created_at",{ascending:false});
  fail(error);
  const rows=collections||[];
  if(!rows.length) return [];
  const {data:items,error:itemsError}=await supabase!.from("saved_collection_posts")
    .select("collection_id,post_id").in("collection_id",rows.map(row=>row.id));
  fail(itemsError);
  const grouped=new Map<string,string[]>();
  for(const item of items||[]) grouped.set(item.collection_id,[...(grouped.get(item.collection_id)||[]),item.post_id]);
  return rows.map(row=>({id:row.id,name:row.name,description:row.description||"",createdAt:row.created_at,postIds:grouped.get(row.id)||[]}));
}

export async function createSavedCollection(name:string,description="") {
  const user=await requireSocialUser();
  const cleanName=name.trim().slice(0,48);
  if(!cleanName) throw new Error("Give your collection a name.");
  const {data,error}=await supabase!.from("saved_collections")
    .insert({owner_id:user.id,name:cleanName,description:description.trim().slice(0,180)})
    .select("id,name,description,created_at").single();
  fail(error);
  return {id:data.id,name:data.name,description:data.description||"",createdAt:data.created_at,postIds:[]} as SavedCollection;
}

export async function deleteSavedCollection(collectionId:string) {
  const user=await requireSocialUser();
  const {error}=await supabase!.from("saved_collections").delete()
    .eq("id",collectionId).eq("owner_id",user.id);
  fail(error);
}

export async function addSavedPostToCollection(collectionId:string,postId:string) {
  await requireSocialUser();
  const {error}=await supabase!.from("saved_collection_posts")
    .insert({collection_id:collectionId,post_id:postId});
  fail(error);
}

export async function removeSavedPostFromCollection(collectionId:string,postId:string) {
  await requireSocialUser();
  const {error}=await supabase!.from("saved_collection_posts")
    .delete().eq("collection_id",collectionId).eq("post_id",postId);
  fail(error);
}
