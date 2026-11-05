import { useMemo, useState } from "react";
import {
  ArrowLeft, Bookmark, Check, ChevronDown, Compass, Flag, Heart, MessageCircle,
  MoreHorizontal, Play, Plus, Search, Send, Share2, Sparkles, Volume2, VolumeX,
  X, UserPlus
} from "lucide-react";
import "./for-you.css";

type FeedPost = {
  id: string; creator: string; handle: string; initials: string; caption: string;
  tags: string[]; category: string; title: string; subtitle: string; palette: string;
  likes: number; comments: number; sound: string;
};

const DEMO_POSTS: FeedPost[] = [
  { id:"p1",creator:"NEXUS Demo Creator",handle:"nexus.creator",initials:"NC",caption:"A little visual storytelling experiment. Built around light, movement and a strong opening frame.",tags:["visualstory","cinematic","nexusedit"],category:"Creative",title:"MAKE THE MOMENT",subtitle:"A story in every frame",palette:"sunset",likes:1280,comments:42,sound:"Original audio · NEXUS demo" },
  { id:"p2",creator:"NEXUS Demo Studio",handle:"nexus.studio",initials:"NS",caption:"Product storytelling concept — clean details, deliberate pacing, and a satisfying reveal.",tags:["productvideo","brandstory"],category:"Design",title:"DETAILS MATTER",subtitle:"Show what makes it different",palette:"mint",likes:864,comments:28,sound:"Minimal pulse · NEXUS demo" },
  { id:"p3",creator:"NEXUS Learning Lab",handle:"nexus.learn",initials:"NL",caption:"Turn one useful idea into a short, clear lesson. Hook, explain, recap.",tags:["learnontiktok","microlearning"],category:"Learning",title:"ONE IDEA. CLEARLY.",subtitle:"Make learning memorable",palette:"violet",likes:2310,comments:76,sound:"Soft keys · NEXUS demo" },
  { id:"p4",creator:"NEXUS Demo Creator",handle:"nexus.moments",initials:"NM",caption:"A recap format for the little moments that deserve a proper edit.",tags:["dailyrecap","storytime"],category:"Lifestyle",title:"KEEP THE MOMENT",subtitle:"Little things, big memories",palette:"ocean",likes:945,comments:31,sound:"Warm ambience · NEXUS demo" }
];

const formatCount = (n:number) => n >= 1_000_000 ? (n/1_000_000).toFixed(1).replace(/\\.0$/,"")+"M" : n >= 1000 ? (n/1000).toFixed(1).replace(/\\.0$/,"")+"K" : String(n);

type Props = { onOpenStudio: () => void; onRequireSignIn: () => void };

export function ForYouPage({ onOpenStudio, onRequireSignIn }: Props) {
  const [activeTab,setActiveTab] = useState("For You");
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
  const [notice,setNotice] = useState("Preview mode · sample posts only");
  const [menuFor,setMenuFor] = useState<string|null>(null);

  const filtered = useMemo(() => DEMO_POSTS.filter(post =>
    (category === "All" || post.category === category) &&
    (activeTab !== "Following" || followed.includes(post.handle)) &&
    (post.caption+" "+post.title+" "+post.tags.join(" ")+" "+post.creator).toLowerCase().includes(query.toLowerCase())
  ),[category,activeTab,followed,query]);

  const requireAction = (label:string) => {
    setNotice(label+" is a preview interaction. Connect the live NEXUS community service before it can be saved or shared publicly.");
  };
  const toggleLocal = (items:string[], setter:(next:string[])=>void, id:string, label:string) => {
    setter(items.includes(id) ? items.filter(x=>x!==id) : [...items,id]);
    requireAction(label);
  };
  const current = filtered[Math.min(activeIndex,Math.max(0,filtered.length-1))];
  const profilePost = DEMO_POSTS.find(post=>post.handle===profileFor);
  const commentPost = DEMO_POSTS.find(post=>post.id===commentsFor);

  const nextPost = (direction:number) => setActiveIndex(index=>Math.min(Math.max(0,index+direction),Math.max(0,filtered.length-1)));
  const submitComment = () => {
    if (!commentText.trim() || !commentsFor) return;
    setLocalComments(old=>({...old,[commentsFor]:[...(old[commentsFor]||[]),commentText.trim()]}));
    setCommentText("");
    requireAction("Comment");
  };

  return <section className="nexus-foryou">
    <header className="nfy-header">
      <div className="nfy-heading"><span className="nfy-mark">N</span><div><b>NEXUS <i>COMMUNITY</i></b><small>Discover what creators are making</small></div></div>
      <div className="nfy-head-actions">
        <label className="nfy-search"><Search size={16}/><input value={query} onChange={e=>{setQuery(e.target.value);setActiveIndex(0);}} placeholder="Search creators, ideas, tags"/></label>
        <button className="nfy-create" onClick={onOpenStudio}><Plus size={16}/> Create</button>
      </div>
    </header>

    <div className="nfy-tabs" role="tablist" aria-label="Feed type">
      {["For You","Following","Discover"].map(tab=><button key={tab} className={activeTab===tab?"active":""} onClick={()=>{setActiveTab(tab);setActiveIndex(0);}}>{tab}</button>)}
      <span className="nfy-preview-tag"><Sparkles size={12}/> PREVIEW</span>
    </div>

    {activeTab==="Discover" && <div className="nfy-discover">
      <div><span className="nfy-kicker">FIND YOUR NEXT IDEA</span><h2>Explore the creative universe.</h2><p>Search by topic or browse a category to find inspiration.</p></div>
      <div className="nfy-categories">{["All","Creative","Design","Learning","Lifestyle","Gaming","Music","Business"].map(item=><button key={item} className={category===item?"selected":""} onClick={()=>{setCategory(item);setActiveIndex(0);}}>{item}</button>)}</div>
    </div>}

    <div className="nfy-stage">
      {current ? <article className="nfy-post" key={current.id}>
        <div className={"nfy-art nfy-"+current.palette}>
          <div className="nfy-art-grain"/>
          <div className="nfy-art-orbit orbit-a"/><div className="nfy-art-orbit orbit-b"/>
          <div className="nfy-art-copy"><span>VELTRONIX NEXUS · CREATOR PREVIEW</span><strong>{current.title}</strong><em>{current.subtitle}</em><small>EDITED IN NEXUS STUDIO</small></div>
          <div className="nfy-demo-watermark">SAMPLE PREVIEW</div>
          <button className="nfy-sound" onClick={()=>setMuted(v=>!v)} aria-label={muted?"Unmute preview":"Mute preview"}>{muted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button>
          <div className="nfy-play-indicator"><Play size={20} fill="currentColor"/></div>
        </div>
        <div className="nfy-post-info">
          <div className="nfy-creator-row">
            <button className="nfy-avatar" onClick={()=>setProfileFor(current.handle)}>{current.initials}</button>
            <button className="nfy-creator-name" onClick={()=>setProfileFor(current.handle)}><b>{current.creator}</b><small>@{current.handle}</small></button>
            <button className={"nfy-follow "+(followed.includes(current.handle)?"following":"")} onClick={()=>toggleLocal(followed,setFollowed,current.handle,"Follow")}>{followed.includes(current.handle)?<><Check size={14}/> Following</>:<><UserPlus size={14}/> Follow</>}</button>
          </div>
          <p className="nfy-caption">{current.caption}</p>
          <div className="nfy-tags">{current.tags.map(tag=><button key={tag} onClick={()=>{setQuery(tag);setActiveTab("Discover");}}># {tag}</button>)}</div>
          <div className="nfy-soundline"><Volume2 size={13}/><span>{current.sound}</span></div>
        </div>
        <aside className="nfy-actions">
          <button onClick={()=>toggleLocal(liked,setLiked,current.id,"Like")} className={liked.includes(current.id)?"is-liked":""}><span><Heart size={22} fill={liked.includes(current.id)?"currentColor":"none"}/></span><small>{formatCount(current.likes+(liked.includes(current.id)?1:0))}</small></button>
          <button onClick={()=>setCommentsFor(current.id)}><span><MessageCircle size={22}/></span><small>{formatCount(current.comments+(localComments[current.id]?.length||0))}</small></button>
          <button onClick={()=>toggleLocal(saved,setSaved,current.id,"Save")} className={saved.includes(current.id)?"is-saved":""}><span><Bookmark size={21} fill={saved.includes(current.id)?"currentColor":"none"}/></span><small>{saved.includes(current.id)?"Saved":"Save"}</small></button>
          <button onClick={()=>{setMenuFor(menuFor===current.id?null:current.id);}}><span><MoreHorizontal size={22}/></span><small>More</small></button>
          {menuFor===current.id&&<div className="nfy-more-menu"><button onClick={()=>{setReportFor(current.id);setMenuFor(null);}}><Flag size={14}/> Report preview</button><button onClick={()=>{navigator.clipboard?.writeText(window.location.href);setNotice("Page link copied where clipboard access is available.");setMenuFor(null);}}><Share2 size={14}/> Copy page link</button></div>}
        </aside>
      </article> : <div className="nfy-empty"><Compass size={28}/><h3>No matching previews</h3><p>Try another search or category.</p><button onClick={()=>{setQuery("");setCategory("All");setActiveTab("For You");}}>Clear filters</button></div>}
      <div className="nfy-feed-controls"><button onClick={()=>nextPost(-1)} disabled={activeIndex===0}><ArrowLeft size={15}/> Previous</button><span>{filtered.length?Math.min(activeIndex+1,filtered.length):0} / {filtered.length}</span><button onClick={()=>nextPost(1)} disabled={activeIndex>=filtered.length-1}>Next <ChevronDown size={15}/></button></div>
    </div>

    <div className="nfy-notice"><Sparkles size={14}/><span>{notice}</span><button onClick={()=>setNotice("Preview mode · sample posts only")} aria-label="Dismiss notice"><X size={14}/></button></div>

    <footer className="nfy-bottom">
      <button className="active"><Compass size={18}/><span>For You</span></button>
      <button onClick={()=>setActiveTab("Discover")}><Search size={18}/><span>Discover</span></button>
      <button className="nfy-add" onClick={onOpenStudio}><span><Plus size={22}/></span></button>
      <button onClick={()=>setNotice("Inbox and activity will be connected with the live community backend.")}><MessageCircle size={18}/><span>Inbox</span></button>
      <button onClick={()=>onRequireSignIn()}><span className="nfy-mini-avatar">N</span><span>Profile</span></button>
    </footer>

    {commentsFor && commentPost && <div className="nfy-overlay" onClick={()=>setCommentsFor(null)}><section className="nfy-sheet" onClick={e=>e.stopPropagation()}>
      <header><div><b>Comments</b><small>{commentPost.comments+(localComments[commentsFor]?.length||0)} in this preview</small></div><button onClick={()=>setCommentsFor(null)}><X size={19}/></button></header>
      <div className="nfy-comment-list"><div className="nfy-comment"><span className="nfy-avatar">NC</span><p><b>NEXUS Demo Creator</b><br/>Thanks for watching this sample edit!<small>Preview comment</small></p></div>{(localComments[commentsFor]||[]).map((comment,i)=><div className="nfy-comment" key={i}><span className="nfy-avatar">Y</span><p><b>Your preview comment</b><br/>{comment}<small>Only stored in this open preview</small></p></div>)}</div>
      <form className="nfy-comment-compose" onSubmit={e=>{e.preventDefault();submitComment();}}><input value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Write a preview comment…"/><button disabled={!commentText.trim()}><Send size={17}/></button></form>
    </section></div>}

    {profileFor && profilePost && <div className="nfy-overlay" onClick={()=>setProfileFor(null)}><section className="nfy-profile-sheet" onClick={e=>e.stopPropagation()}><button className="nfy-sheet-close" onClick={()=>setProfileFor(null)}><X size={19}/></button><div className="nfy-profile-avatar">{profilePost.initials}</div><h3>{profilePost.creator}</h3><p>@{profilePost.handle}</p><div className="nfy-profile-stats"><span><b>1</b> sample post</span><span><b>Preview</b> followers</span><span><b>Creator</b> account</span></div><p className="nfy-profile-bio">A sample creator profile showing how NEXUS community pages will look.</p><button className="nfy-follow" onClick={()=>toggleLocal(followed,setFollowed,profilePost.handle,"Follow")}>{followed.includes(profilePost.handle)?"Following":"Follow creator"}</button></section></div>}

    {reportFor && <div className="nfy-overlay" onClick={()=>setReportFor(null)}><section className="nfy-sheet nfy-report-sheet" onClick={e=>e.stopPropagation()}><header><b>Report preview content</b><button onClick={()=>setReportFor(null)}><X size={19}/></button></header><p>This is sample content, not a live public post. In the live platform, reports will be sent to the moderation queue.</p><button className="nfy-report-confirm" onClick={()=>{setNotice("Report flow previewed. Live moderation is not connected.");setReportFor(null);}}>Got it</button></section></div>}
  </section>;
}
