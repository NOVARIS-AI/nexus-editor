import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Bookmark, Check, ChevronDown, Compass, Flag, Heart, MessageCircle,
  MoreHorizontal, Play, Plus, Search, Send, Share2, Sparkles, Volume2, VolumeX,
  X, UserPlus, Clapperboard
} from "lucide-react";
import "./for-you.css";
import { useNexusAuth } from "../lib/AuthGate";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { createPostComment, loadCommunityFeed, loadCommunityPlaybackUrl, loadMyFollowedCreators, loadMyPostInteractions, loadPostComments, loadMyCreatorTopics, loadCreatorProfile, loadPulseInterestWeights, loadPulsePreferences, reportCommunityPost, blockCommunityCreator, saveMyCreatorTopics, savePulsePreferences, toggleCreatorFollow, togglePostLike, togglePostSave, type CommunityPost, type CreatorProfile } from "./social-service";
import { inferPostCategory, rankNexusFeed } from "./nexus-pulse-algorithm";

type FeedPost = {
  id: string; creator: string; handle: string; initials: string; caption: string;
  tags: string[]; creatorTopics?: string[]; category: string; title: string; subtitle: string; palette: string;
  likes: number; comments: number; sound: string; authorId?: string; isLive?: boolean; createdAt?: string; mediaAssetId?: string | null;
};

const DEMO_POSTS: FeedPost[] = [
  { id:"p1",creator:"NEXUS Demo Creator",handle:"nexus.creator",initials:"NC",caption:"A little visual storytelling experiment. Built around light, movement and a strong opening frame.",tags:["visualstory","cinematic","nexusedit"],category:"Creative",title:"MAKE THE MOMENT",subtitle:"A story in every frame",palette:"sunset",likes:1280,comments:42,sound:"Original audio · NEXUS demo" },
  { id:"p2",creator:"NEXUS Demo Studio",handle:"nexus.studio",initials:"NS",caption:"Product storytelling concept — clean details, deliberate pacing, and a satisfying reveal.",tags:["productvideo","brandstory"],category:"Design",title:"DETAILS MATTER",subtitle:"Show what makes it different",palette:"mint",likes:864,comments:28,sound:"Minimal pulse · NEXUS demo" },
  { id:"p3",creator:"NEXUS Learning Lab",handle:"nexus.learn",initials:"NL",caption:"Turn one useful idea into a short, clear lesson. Hook, explain, recap.",tags:["learnontiktok","microlearning"],category:"Learning",title:"ONE IDEA. CLEARLY.",subtitle:"Make learning memorable",palette:"violet",likes:2310,comments:76,sound:"Soft keys · NEXUS demo" },
  { id:"p4",creator:"NEXUS Demo Creator",handle:"nexus.moments",initials:"NM",caption:"A recap format for the little moments that deserve a proper edit.",tags:["dailyrecap","storytime"],category:"Lifestyle",title:"KEEP THE MOMENT",subtitle:"Little things, big memories",palette:"ocean",likes:945,comments:31,sound:"Warm ambience · NEXUS demo" }
];

const streamEmbedUrl = (value:string, muted:boolean) => {
  try {
    const url = new URL(value);
    url.searchParams.set("autoplay","true");
    url.searchParams.set("muted",muted?"true":"false");
    url.searchParams.set("controls","true");
    url.searchParams.set("preload","true");
    return url.toString();
  } catch { return value; }
};

const formatCount = (n:number) => n >= 1_000_000 ? (n/1_000_000).toFixed(1).replace(/\\.0$/,"")+"M" : n >= 1000 ? (n/1000).toFixed(1).replace(/\\.0$/,"")+"K" : String(n);

type Props = { onOpenStudio: () => void; onOpenTemplates: () => void; onOpenSaved: () => void; onRequireSignIn: () => void };

export function ForYouPage({ onOpenStudio, onOpenTemplates, onOpenSaved, onRequireSignIn }: Props) {
  const { signedIn } = useNexusAuth();
  const [activeTab,setActiveTab] = useState("For You");
  const [livePosts,setLivePosts] = useState<FeedPost[]>([]);
  const [feedLoading,setFeedLoading] = useState(false);
  const [serviceError,setServiceError] = useState("");
  const [liveComments,setLiveComments] = useState<Array<{id:string;body:string;author:string;handle:string;createdAt:string}>>([]);
  const [commentLoading,setCommentLoading] = useState(false);
  const [category,setCategory] = useState("All");
  const [query,setQuery] = useState("");
  const [activeIndex,setActiveIndex] = useState(0);
  const [liked,setLiked] = useState<string[]>([]);
  const [saved,setSaved] = useState<string[]>([]);
  const [followed,setFollowed] = useState<string[]>([]);
  const [muted,setMuted] = useState(true);
  const [commentsFor,setCommentsFor] = useState<string|null>(null);
  const [commentText,setCommentText] = useState("");
  const [localComments,setLocalComments] = useState<Record<string,string[]>>({});
  const [profileFor,setProfileFor] = useState<string|null>(null);
  const [reportFor,setReportFor] = useState<string|null>(null);
  const [reportReason,setReportReason] = useState<"spam"|"harassment"|"hate"|"sexual_content"|"violence"|"self_harm"|"copyright"|"misinformation"|"other">("spam");
  const [reportDetails,setReportDetails] = useState("");
  const [reportSubmitting,setReportSubmitting] = useState(false);
  const [blockSubmitting,setBlockSubmitting] = useState(false);
  const [notice,setNotice] = useState("Preview mode · sample posts only");
  const [menuFor,setMenuFor] = useState<string|null>(null);
  const [notInterested,setNotInterested] = useState<string[]>([]);
  const [mutedCreators,setMutedCreators] = useState<string[]>([]);
  const [preferredCategories,setPreferredCategories] = useState<string[]>([]);
  const [categoryWeights,setCategoryWeights] = useState<Record<string,number>>({});
  const [currentUserId,setCurrentUserId] = useState<string|null>(null);
  const [creatorTopicsDraft,setCreatorTopicsDraft] = useState("");
  const [creatorTopicsSaving,setCreatorTopicsSaving] = useState(false);
  const [creatorTopicsOpen,setCreatorTopicsOpen] = useState(false);
  const [creatorProfile,setCreatorProfile] = useState<CreatorProfile|null>(null);
  const [profileLoading,setProfileLoading] = useState(false);
  const [playbackUrl,setPlaybackUrl] = useState("");
  const [playbackLoading,setPlaybackLoading] = useState(false);
  const [playbackError,setPlaybackError] = useState("");
  const [playbackAttempt,setPlaybackAttempt] = useState(0);
  const [pulsePreferencesReady,setPulsePreferencesReady] = useState(false);
  const feedScrollRef = useRef<HTMLDivElement|null>(null);

  useEffect(() => {
    let active = true;
    if (supabase) void supabase.auth.getUser().then(({data})=>{if(active)setCurrentUserId(data.user?.id || null);});
    setPulsePreferencesReady(false);
    if (!signedIn || !isSupabaseConfigured) {
      setPreferredCategories([]); setNotInterested([]); setMutedCreators([]); setCategoryWeights({});
      setPulsePreferencesReady(true); return;
    }
    Promise.all([loadPulsePreferences(), loadPulseInterestWeights()])
      .then(([preferences, weights]) => {
        if (!active) return;
        setPreferredCategories(preferences.preferredCategories);
        setNotInterested(preferences.hiddenPostIds);
        setMutedCreators(preferences.hiddenCreatorIds);
        setCategoryWeights(weights);
      })
      .catch(error => { if (active) setServiceError(error instanceof Error ? error.message : "NEXUS Pulse preferences could not load."); })
      .finally(() => { if (active) setPulsePreferencesReady(true); });
    return () => { active = false; };
  }, [signedIn]);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) { setLivePosts([]); return; }
    setFeedLoading(true); setServiceError("");
    loadCommunityFeed(activeTab === "Following" ? "following" : "public")
      .then(async (posts: CommunityPost[]) => {
        if (!active) return;
        const mapped: FeedPost[] = posts.map((post, index) => ({
          id: post.id, authorId: post.authorId, isLive: true, createdAt: post.createdAt, mediaAssetId: post.mediaAssetId,
          creator: post.creator, handle: post.handle, initials: post.initials,
          caption: post.caption, tags: post.topics, creatorTopics: post.creatorTopics, category: "Creative",
          title: post.caption.trim().split(/\\s+/).slice(0, 5).join(" ").toUpperCase() || "A NEXUS CREATION",
          subtitle: "Shared by the NEXUS community", palette: ["sunset","mint","violet","ocean"][index % 4],
          likes: post.likes, comments: post.comments, sound: "Community post"
        }));
        setLivePosts(mapped);
        if (mapped.length) {
          const [interactions, followedIds] = await Promise.all([loadMyPostInteractions(mapped.map(post => post.id)), loadMyFollowedCreators([...new Set(mapped.map(post => post.authorId).filter((id): id is string => Boolean(id)))])]);
          if (active) { setLiked(interactions.liked); setSaved(interactions.saved); setFollowed(mapped.filter(post => post.authorId && followedIds.includes(post.authorId)).map(post => post.handle)); }
          setNotice("Live community feed · Supabase connected");
        } else {
          setNotice(activeTab === "Following" ? "No posts from followed creators yet." : "No published community posts yet · sample previews below");
        }
      })
      .catch(error => { if (active) setServiceError(error instanceof Error ? error.message : "Community feed could not load."); })
      .finally(() => { if (active) setFeedLoading(false); });
    return () => { active = false; };
  }, [activeTab, signedIn]);

  useEffect(() => {
    if (!commentsFor || !livePosts.some(post => post.id === commentsFor)) { setLiveComments([]); return; }
    let active = true; setCommentLoading(true);
    loadPostComments(commentsFor).then(rows => { if (active) setLiveComments(rows); })
      .catch(error => { if (active) setServiceError(error instanceof Error ? error.message : "Comments could not load."); })
      .finally(() => { if (active) setCommentLoading(false); });
    return () => { active = false; };
  }, [commentsFor, livePosts]);

  const sourcePosts = livePosts.length ? livePosts : activeTab === "Following" ? [] : DEMO_POSTS;
  const filtered = useMemo(() => {
    const candidates = sourcePosts.filter(post =>
      (category === "All" || inferPostCategory(post) === category) &&
      (activeTab !== "Following" || followed.includes(post.handle)) &&
      (post.caption+" "+post.title+" "+post.tags.join(" ")+" "+post.creator).toLowerCase().includes(query.toLowerCase())
    );
    return rankNexusFeed(candidates, { likedPostIds: liked, savedPostIds: saved, followedHandles: followed, hiddenPostIds: notInterested, hiddenAuthorIds: mutedCreators, preferredCategories, categoryWeights }, activeTab === "Following" ? "following" : "for-you");
  },[sourcePosts,category,activeTab,followed,query,liked,saved,notInterested,mutedCreators,preferredCategories,categoryWeights]);

  const persistPulse = (next: { preferredCategories?: string[]; hiddenPostIds?: string[]; hiddenCreatorIds?: string[] }) => {
    if (!signedIn || !pulsePreferencesReady) return;
    void savePulsePreferences({
      preferredCategories: next.preferredCategories ?? preferredCategories,
      hiddenPostIds: next.hiddenPostIds ?? notInterested,
      hiddenCreatorIds: next.hiddenCreatorIds ?? mutedCreators
    }).catch(error => setServiceError(error instanceof Error ? error.message : "Could not save NEXUS Pulse preferences."));
  };

  const requireAction = (label:string) => {
    setNotice(label+" is a preview interaction. Live community actions are only available on published posts.");
  };
  const toggleLocal = (items:string[], setter:(next:string[])=>void, id:string, label:string) => {
    if (!signedIn) { onRequireSignIn(); return; }
    const post = sourcePosts.find(item => item.id === id || item.handle === id);
    if (post?.isLive) {
      const wasActive = items.includes(id);
      const action = label === "Like" ? togglePostLike(post.id, wasActive) : label === "Save" ? togglePostSave(post.id, wasActive) : post.authorId ? toggleCreatorFollow(post.authorId, wasActive) : Promise.reject(new Error("Creator profile is unavailable."));
      void action.then(() => {
        setter(wasActive ? items.filter(x=>x!==id) : [...items,id]);
        setNotice(label + (wasActive ? " removed." : " saved to your account."));
        if (label === "Like") setLivePosts(old => old.map(item => item.id === post.id ? {...item,likes:item.likes+(wasActive?-1:1)} : item));
        if (label === "Like" || label === "Save") { const key = inferPostCategory(post); const delta = label === "Save" ? 2 : 1; setCategoryWeights(old => ({...old,[key]:Math.max(0,(old[key]||0)+(wasActive?-delta:delta))})); }
      }).catch(error => setServiceError(error instanceof Error ? error.message : label + " failed."));
      return;
    }
    setter(items.includes(id) ? items.filter(x=>x!==id) : [...items,id]);
    requireAction(label);
  };
  useEffect(() => {
    setActiveIndex(index => Math.min(index, Math.max(0, filtered.length - 1)));
    if(feedScrollRef.current)feedScrollRef.current.scrollTop=0;
  }, [filtered.length]);

  useEffect(() => { if(feedScrollRef.current)feedScrollRef.current.scrollTop=0; }, [activeTab,category,query]);

  const current = filtered[Math.min(activeIndex,Math.max(0,filtered.length-1))];
  const profilePost = sourcePosts.find(post=>post.handle===profileFor) || DEMO_POSTS.find(post=>post.handle===profileFor);
  const commentPost = sourcePosts.find(post=>post.id===commentsFor) || DEMO_POSTS.find(post=>post.id===commentsFor);

  useEffect(() => {
    let active = true;
    setPlaybackUrl("");
    setPlaybackError("");
    if (!current?.isLive || !current.mediaAssetId) {
      setPlaybackLoading(false);
      return;
    }
    setPlaybackLoading(true);
    loadCommunityPlaybackUrl(current.id)
      .then(url => { if (active) setPlaybackUrl(url); })
      .catch(error => { if (active) setPlaybackError(error instanceof Error ? error.message : "This video could not be loaded."); })
      .finally(() => { if (active) setPlaybackLoading(false); });
    return () => { active = false; };
  }, [current?.id, current?.isLive, current?.mediaAssetId, playbackAttempt]);

  useEffect(() => {
    if (!profileFor || !profilePost?.isLive) { setCreatorProfile(null); return; }
    let active = true;
    setProfileLoading(true);
    loadCreatorProfile(profileFor)
      .then(profile => { if (active) setCreatorProfile(profile); })
      .catch(error => { if (active) setServiceError(error instanceof Error ? error.message : "Creator profile could not load."); })
      .finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [profileFor, profilePost?.isLive]);

  useEffect(() => {
    if (!currentUserId) { setCreatorTopicsDraft(""); return; }
    let active = true;
    loadMyCreatorTopics().then(topics=>{if(active)setCreatorTopicsDraft(topics.join(", "));})
      .catch(error=>{if(active)setServiceError(error instanceof Error?error.message:"Creator topics could not load.");});
    return ()=>{active=false;};
  }, [currentUserId]);

  useEffect(() => {
    if (!profilePost?.isLive || profilePost.authorId !== currentUserId) return;
    setCreatorTopicsDraft((profilePost.creatorTopics || []).join(", "));
  }, [profilePost?.authorId, currentUserId]);

  const saveCreatorTopics = async () => {
    setCreatorTopicsSaving(true);
    try {
      const topics = await saveMyCreatorTopics(creatorTopicsDraft.split(","));
      setLivePosts(old => old.map(post => post.authorId === currentUserId ? {...post, creatorTopics: topics} : post));
      setNotice("Your creator topics have been updated. NEXUS Pulse can now match your work with interested viewers.");
      return true;
    } catch (error) { setServiceError(error instanceof Error ? error.message : "Creator topics could not be saved."); return false; }
    finally { setCreatorTopicsSaving(false); }
  };

  const nextPost = (direction:number) => { const target=Math.min(Math.max(0,activeIndex+direction),Math.max(0,filtered.length-1)); setActiveIndex(target); const container=feedScrollRef.current; const item=container?.querySelectorAll<HTMLElement>(".nfy-post")[target]; if(container&&item)container.scrollTo({top:item.offsetTop-container.offsetTop,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}); };
  const submitComment = () => {
    if (!commentText.trim() || !commentsFor) return;
    if (!signedIn) { onRequireSignIn(); return; }
    const post = sourcePosts.find(item => item.id === commentsFor);
    const body = commentText.trim();
    if (post?.isLive) {
      void createPostComment(commentsFor, body).then(async () => {
        const rows = await loadPostComments(commentsFor);
        setLiveComments(rows);
        setLivePosts(old => old.map(item => item.id === commentsFor ? {...item,comments:item.comments+1} : item));
        setCommentText(""); setNotice("Comment posted.");
      }).catch(error => setServiceError(error instanceof Error ? error.message : "Comment failed."));
      return;
    }
    setLocalComments(old=>({...old,[commentsFor]:[...(old[commentsFor]||[]),body]}));
    setCommentText(""); requireAction("Comment");
  };

  return <section className="nexus-foryou">
    <header className="nfy-header">
      <div className="nfy-heading"><span className="nfy-mark">N</span><div><b>NEXUS <i>COMMUNITY</i></b><small>Discover what creators are making</small></div></div>
      <div className="nfy-head-actions">
        <label className="nfy-search"><Search size={16}/><input value={query} onChange={e=>{setQuery(e.target.value);setActiveIndex(0);}} placeholder="Search creators, ideas, tags"/></label>
        <button className="nfy-create nfy-template-link" onClick={onOpenSaved}><Bookmark size={15}/> Saved</button><button className="nfy-create nfy-template-link" onClick={onOpenTemplates}><Clapperboard size={15}/> Templates</button><button className="nfy-create" onClick={onOpenStudio}><Plus size={16}/> Create</button>
      </div>
    </header>

    <div className="nfy-tabs" role="tablist" aria-label="Feed type">
      {["For You","Following","Discover"].map(tab=><button key={tab} className={activeTab===tab?"active":""} onClick={()=>{setActiveTab(tab);setActiveIndex(0);}}>{tab}</button>)}
      <span className="nfy-preview-tag"><Sparkles size={12}/> {livePosts.length ? "NEXUS PULSE" : "PULSE PREVIEW"}</span>
    </div>

    {activeTab==="Discover" && <div className="nfy-discover">
      <div><span className="nfy-kicker">FIND YOUR NEXT IDEA</span><h2>Explore the creative universe.</h2><p>Search by topic or browse a category to find inspiration.</p>{signedIn && <button className="nfy-create" onClick={()=>setCreatorTopicsOpen(true)}>Set my creator topics</button>}</div>
      <div className="nfy-categories">{["All","Creative","Design","Learning","Lifestyle","Gaming","Music","Business"].map(item=><button key={item} className={category===item?"selected":""} onClick={()=>{setCategory(item);setActiveIndex(0);if(item!=="All"){const next=preferredCategories.includes(item)?preferredCategories.filter(value=>value!==item):[...preferredCategories,item];setPreferredCategories(next);persistPulse({preferredCategories:next});}}}>{item}</button>)}</div>
    </div>}

    <div className="nfy-stage" ref={feedScrollRef} role="region" aria-label="Creator feed. Scroll vertically to browse posts. Use the up and down arrow keys to change posts." tabIndex={0} onScroll={event=>{const el=event.currentTarget;const bounds=el.getBoundingClientRect();const cards=Array.from(el.querySelectorAll<HTMLElement>(".nfy-post"));if(cards.length){let nearest=0;let distance=Number.POSITIVE_INFINITY;cards.forEach((card,index)=>{const next=Math.abs(card.getBoundingClientRect().top-bounds.top);if(next<distance){distance=next;nearest=index;}});setActiveIndex(old=>old===nearest?old:nearest);}}} onKeyDown={event=>{if(event.key==="ArrowDown"||event.key==="PageDown"){event.preventDefault();nextPost(1);}else if(event.key==="ArrowUp"||event.key==="PageUp"){event.preventDefault();nextPost(-1);}}}>
      {filtered.length ? filtered.map((post,index)=>(
        <article className={"nfy-post"+(index===activeIndex?" is-active":"")} key={post.id}>
        <div className={"nfy-art nfy-"+post.palette+(post.isLive?" nfy-live-video":"")}>
          {post.isLive && post.mediaAssetId ? (
            post.id===current?.id && playbackUrl
              ? <iframe key={post.id+":"+playbackUrl+":"+muted} className="nfy-stream-player" src={streamEmbedUrl(playbackUrl,muted)} title={"Video by "+post.creator} allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="eager" referrerPolicy="strict-origin-when-cross-origin"/>
              : <div className="nfy-video-state"><Clapperboard size={26}/><b>{post.id!==current?.id?"Scroll to this post to load its video":playbackLoading?"Preparing secure playback…":playbackError?"Video could not be loaded":"Video unavailable"}</b><small>{post.id===current?.id ? playbackError || "The video may still be processing or playback is not configured." : "Playback loads when this post becomes active."}</small>{post.id===current?.id && !playbackLoading && <button className="nfy-video-retry" onClick={()=>setPlaybackAttempt(value=>value+1)}>Retry playback</button>}</div>
          ) : <>
            <div className="nfy-art-grain"/>
            <div className="nfy-art-orbit orbit-a"/><div className="nfy-art-orbit orbit-b"/>
            <div className="nfy-art-copy"><span>VELTRONIX NEXUS · CREATOR PREVIEW</span><strong>{post.title}</strong><em>{post.subtitle}</em><small>EDITED IN NEXUS STUDIO</small></div>
            <div className="nfy-demo-watermark">SAMPLE PREVIEW</div>
            <button className="nfy-sound" onClick={()=>setMuted(v=>!v)} aria-label={muted?"Unmute preview":"Mute preview"}>{muted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button>
            <div className="nfy-play-indicator"><Play size={20} fill="currentColor"/></div>
          </>}
        </div>
        <div className="nfy-post-info">
          <div className="nfy-creator-row">
            <button className="nfy-avatar" onClick={()=>setProfileFor(post.handle)}>{post.initials}</button>
            <button className="nfy-creator-name" onClick={()=>setProfileFor(post.handle)}><b>{post.creator}</b><small>@{post.handle}</small></button>
            <button className={"nfy-follow "+(followed.includes(post.handle)?"following":"")} onClick={()=>toggleLocal(followed,setFollowed,post.handle,"Follow")}>{followed.includes(post.handle)?<><Check size={14}/> Following</>:<><UserPlus size={14}/> Follow</>}</button>
          </div>
          <p className="nfy-caption">{post.caption}</p>
          <div className="nfy-tags">{post.tags.map(tag=><button key={tag} onClick={()=>{setQuery(tag);setActiveTab("Discover");}}># {tag}</button>)}</div>
          <div className="nfy-soundline"><Volume2 size={13}/><span>{post.sound}{post.createdAt ? " · "+new Date(post.createdAt).toLocaleDateString() : ""}</span></div>
        </div>
        <aside className="nfy-actions">
          <button aria-label={liked.includes(post.id)?"Unlike post":"Like post"} onClick={()=>toggleLocal(liked,setLiked,post.id,"Like")} className={liked.includes(post.id)?"is-liked":""}><span><Heart size={22} fill={liked.includes(post.id)?"currentColor":"none"}/></span><small>{formatCount(post.likes+(liked.includes(post.id)?1:0))}</small></button>
          <button aria-label="Open comments" onClick={()=>setCommentsFor(post.id)}><span><MessageCircle size={22}/></span><small>{formatCount(post.comments+(localComments[post.id]?.length||0))}</small></button>
          <button aria-label={saved.includes(post.id)?"Remove saved post":"Save post"} onClick={()=>toggleLocal(saved,setSaved,post.id,"Save")} className={saved.includes(post.id)?"is-saved":""}><span><Bookmark size={21} fill={saved.includes(post.id)?"currentColor":"none"}/></span><small>{saved.includes(post.id)?"Saved":"Save"}</small></button>
          <button aria-label="More post actions" onClick={()=>{setMenuFor(menuFor===post.id?null:post.id);}}><span><MoreHorizontal size={22}/></span><small>More</small></button>
          {menuFor===post.id&&<div className="nfy-more-menu"><button onClick={()=>{const nextHiddenPosts=notInterested.includes(post.id)?notInterested:[...notInterested,post.id];setNotInterested(nextHiddenPosts);persistPulse({hiddenPostIds:nextHiddenPosts});setMenuFor(null);setActiveIndex(0);setNotice("NEXUS Pulse will show you less like this post.");}}><Sparkles size={14}/> Not interested</button><button onClick={()=>{const nextHiddenCreators=post.authorId?(mutedCreators.includes(post.authorId)?mutedCreators:[...mutedCreators,post.authorId]):mutedCreators;setMutedCreators(nextHiddenCreators);persistPulse({hiddenCreatorIds:nextHiddenCreators});setMenuFor(null);setActiveIndex(0);setNotice("This creator is hidden from your feed.");}}><X size={14}/> Hide creator</button>{post.isLive && post.authorId && post.authorId!==currentUserId && <button onClick={()=>{void (async()=>{if(!signedIn){onRequireSignIn();return;}if(!window.confirm("Block this creator? Their posts will no longer appear for you, and existing follows between both accounts will be removed."))return;setBlockSubmitting(true);try{await blockCommunityCreator(post.authorId!);const next=[...new Set([...mutedCreators,post.authorId!])];setMutedCreators(next);persistPulse({hiddenCreatorIds:next});setFollowed(old=>old.filter(handle=>handle!==post.handle));setMenuFor(null);setActiveIndex(0);setNotice("Creator blocked. Their content will be hidden from your account.");}catch(error){setServiceError(error instanceof Error?error.message:"Could not block this creator.");}finally{setBlockSubmitting(false);}})();}} disabled={blockSubmitting}><X size={14}/> {blockSubmitting?"Blocking…":"Block creator"}</button>}
          <button onClick={()=>{setReportFor(post.id);setReportReason("spam");setReportDetails("");setMenuFor(null);}}><Flag size={14}/> Report post</button><button onClick={()=>{navigator.clipboard?.writeText(window.location.href);setNotice("Page link copied where clipboard access is available.");setMenuFor(null);}}><Share2 size={14}/> Copy page link</button></div>}
        </aside>
      </article>
      )) : <div className="nfy-empty"><Compass size={28}/><h3>No matching previews</h3><p>Try another search or category.</p><button onClick={()=>{setQuery("");setCategory("All");setActiveTab("For You");}}>Clear filters</button></div>}
    </div>
    <div className="nfy-feed-controls"><button onClick={()=>nextPost(-1)} disabled={activeIndex===0}><ArrowLeft size={15}/> Previous</button><span aria-live="polite">{filtered.length?Math.min(activeIndex+1,filtered.length):0} / {filtered.length}</span><button onClick={()=>nextPost(1)} disabled={activeIndex>=filtered.length-1}>Next <ChevronDown size={15}/></button></div>

    <div className="nfy-notice"><Sparkles size={14}/><span>{feedLoading ? "Loading community posts…" : serviceError ? serviceError : notice}</span><button onClick={()=>setNotice("Preview mode · sample posts only")} aria-label="Dismiss notice"><X size={14}/></button></div>

    <footer className="nfy-bottom">
      <button className="active"><Compass size={18}/><span>For You</span></button>
      <button onClick={()=>setActiveTab("Discover")}><Search size={18}/><span>Discover</span></button>
      <button className="nfy-add" onClick={onOpenStudio}><span><Plus size={22}/></span></button>
      <button onClick={()=>setNotice("Inbox and activity will be connected with the live community backend.")}><MessageCircle size={18}/><span>Inbox</span></button>
      <button onClick={()=>setProfileFor(DEMO_POSTS[0].handle)}><span className="nfy-mini-avatar">N</span><span>Profile</span></button>
    </footer>

    {commentsFor && commentPost && <div className="nfy-overlay" onClick={()=>setCommentsFor(null)}><section className="nfy-sheet" onClick={e=>e.stopPropagation()}>
      <header><div><b>Comments</b><small>{commentPost.comments+(commentPost.isLive ? 0 : localComments[commentsFor]?.length||0)} {commentPost.isLive ? "comments" : "in this preview"}</small></div><button onClick={()=>setCommentsFor(null)}><X size={19}/></button></header>
      <div className="nfy-comment-list">{commentLoading && <p>Loading comments…</p>}{commentPost.isLive ? liveComments.map(comment=><div className="nfy-comment" key={comment.id}><span className="nfy-avatar">{comment.author.slice(0,2).toUpperCase()}</span><p><b>{comment.author} · @{comment.handle}</b><br/>{comment.body}<small>{new Date(comment.createdAt).toLocaleString()}</small></p></div>) : <div className="nfy-comment"><span className="nfy-avatar">NC</span><p><b>NEXUS Demo Creator</b><br/>Thanks for watching this sample edit!<small>Preview comment</small></p></div>}{!commentPost.isLive && (localComments[commentsFor]||[]).map((comment,i)=><div className="nfy-comment" key={i}><span className="nfy-avatar">Y</span><p><b>Your preview comment</b><br/>{comment}<small>Only stored in this open preview</small></p></div>)}</div>
      <form className="nfy-comment-compose" onSubmit={e=>{e.preventDefault();submitComment();}}><input value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder={commentPost.isLive ? "Write a comment…" : "Write a preview comment…"}/><button disabled={!commentText.trim()}><Send size={17}/></button></form>
    </section></div>}

    {profileFor && profilePost && <div className="nfy-overlay" onClick={()=>setProfileFor(null)}><section className="nfy-profile-sheet" onClick={e=>e.stopPropagation()}><button className="nfy-sheet-close" onClick={()=>setProfileFor(null)}><X size={19}/></button>{creatorProfile?.avatarUrl ? <img className="nfy-profile-avatar nfy-profile-photo" src={creatorProfile.avatarUrl} alt="" /> : <div className="nfy-profile-avatar">{profilePost.initials}</div>}<h3>{creatorProfile?.displayName || profilePost.creator}</h3><p>@{creatorProfile?.username || profilePost.handle}</p>{profileLoading && <p className="nfy-profile-loading">Loading creator profile…</p>}<div className="nfy-profile-stats"><span><b>{creatorProfile ? formatCount(creatorProfile.postCount) : profilePost.isLive ? "—" : "1"}</b> posts</span><span><b>{creatorProfile ? formatCount(creatorProfile.followerCount) : "—"}</b> followers</span><span><b>{creatorProfile ? "Creator" : "Preview"}</b> profile</span></div><p className="nfy-profile-bio">{creatorProfile?.bio || (profilePost.isLive ? "This creator has not added a bio yet." : "A sample creator profile showing how NEXUS community pages will look.")}</p>{creatorProfile?.creatorTopics?.length ? <div className="nfy-profile-topics">{creatorProfile.creatorTopics.map(topic=><span key={topic}>#{topic}</span>)}</div> : null}{profilePost.isLive && profilePost.authorId === currentUserId && <div className="nfy-creator-topics"><label htmlFor="nfy-creator-topics">Your creator topics</label><input id="nfy-creator-topics" value={creatorTopicsDraft} onChange={event=>setCreatorTopicsDraft(event.target.value)} placeholder="design, education, video editing"/><small>Separate up to 12 topics with commas. These help NEXUS recommend your work to interested people.</small><button onClick={()=>void saveCreatorTopics()} disabled={creatorTopicsSaving}>{creatorTopicsSaving?"Saving…":"Save creator topics"}</button></div>}<button className="nfy-follow" onClick={()=>toggleLocal(followed,setFollowed,profilePost.handle,"Follow")}>{followed.includes(profilePost.handle)?"Following":"Follow creator"}</button></section></div>}

    {creatorTopicsOpen && <div className="nfy-overlay" onClick={()=>setCreatorTopicsOpen(false)}><section className="nfy-profile-sheet" onClick={event=>event.stopPropagation()}><button className="nfy-sheet-close" onClick={()=>setCreatorTopicsOpen(false)}><X size={19}/></button><span className="nfy-kicker">NEXUS PULSE PERSONALISATION</span><h3>Your creator topics</h3><p>Choose up to 12 subjects you create around. NEXUS can use them to match your work with viewers interested in those topics.</p><div className="nfy-creator-topics"><label htmlFor="nfy-creator-topics-settings">Topics</label><input id="nfy-creator-topics-settings" value={creatorTopicsDraft} onChange={event=>setCreatorTopicsDraft(event.target.value)} placeholder="design, education, video editing"/><small>Separate topics with commas. Examples: graphic design, tutorials, music, gaming.</small><button onClick={()=>void saveCreatorTopics().then(saved=>{if(saved)setCreatorTopicsOpen(false);})} disabled={creatorTopicsSaving}>{creatorTopicsSaving?"Saving…":"Save my topics"}</button></div></section></div>}

    {reportFor && <div className="nfy-overlay" onClick={()=>{if(!reportSubmitting)setReportFor(null);}}><section className="nfy-sheet nfy-report-sheet" onClick={e=>e.stopPropagation()}><header><b>Report {sourcePosts.find(post=>post.id===reportFor)?.isLive?"community post":"sample preview"}</b><button onClick={()=>setReportFor(null)} disabled={reportSubmitting}><X size={19}/></button></header><p>Choose the reason that best describes the concern. Reports are private and are sent to the moderation review queue.</p><label className="nfy-report-label" htmlFor="nfy-report-reason">Reason</label><select id="nfy-report-reason" value={reportReason} onChange={event=>setReportReason(event.target.value as typeof reportReason)}><option value="spam">Spam or misleading promotion</option><option value="harassment">Harassment or bullying</option><option value="hate">Hateful or discriminatory content</option><option value="sexual_content">Sexual or inappropriate content</option><option value="violence">Violence or dangerous activity</option><option value="self_harm">Self-harm content</option><option value="copyright">Copyright or impersonation</option><option value="misinformation">False or harmful information</option><option value="other">Something else</option></select><label className="nfy-report-label" htmlFor="nfy-report-details">Additional details (optional)</label><textarea id="nfy-report-details" maxLength={2000} value={reportDetails} onChange={event=>setReportDetails(event.target.value)} placeholder="Share context that may help reviewers…"/><small>Your report does not automatically remove the post. A moderator reviews it.</small><button className="nfy-report-confirm" disabled={reportSubmitting} onClick={()=>{const post=sourcePosts.find(item=>item.id===reportFor);if(post?.isLive){if(!signedIn){onRequireSignIn();return;}setReportSubmitting(true);void reportCommunityPost(reportFor,reportReason,reportDetails).then(()=>setNotice("Report submitted privately for moderation review.")).catch(error=>setServiceError(error instanceof Error?error.message:"Report could not be submitted.")).finally(()=>{setReportSubmitting(false);setReportFor(null);});}else{setNotice("Sample preview report flow tested; no report was sent because this is demo content.");setReportFor(null);}}}>{reportSubmitting?"Submitting…":"Submit report"}</button></section></div>}
  </section>;
}
