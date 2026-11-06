import {useCallback,useEffect,useState} from "react";
import {ShieldCheck,RefreshCw,ArrowLeft,Flag,CheckCircle2,Archive,Undo2,EyeOff,Play,Video} from "lucide-react";
import {supabase} from "../lib/supabase";
import {useNexusAuth} from "../lib/AuthGate";
import "./moderation-centre.css";
type Report={id:string;reporter_id:string;target_type:"post"|"comment"|"profile";target_id:string;reason:string;details:string;status:"open"|"reviewing"|"actioned"|"dismissed";created_at:string};
type Appeal={id:string;appellant_id:string;target_type:"post"|"comment";target_id:string;explanation:string;status:"open"|"reviewing"|"upheld"|"reversed";created_at:string};
type PendingPost={id:string;author_id:string;caption:string;topics:string[];visibility:"public"|"followers"|"private";created_at:string;source_project_id:string|null;creator:{username:string|null;display_name:string|null}|null;media:{upload_state:string;duration_ms:number|null;width:number|null;height:number|null;thumbnail_url:string|null}|null};
type Props={onBack:()=>void;onRequireSignIn:()=>void};
export function ModerationCentre({onBack,onRequireSignIn}:Props){
 const {signedIn}=useNexusAuth();
 const [kind,setKind]=useState<"posts"|"reports"|"appeals">("posts");
 const [items,setItems]=useState<Report[]>([]);
 const [appeals,setAppeals]=useState<Appeal[]>([]);
 const [pending,setPending]=useState<PendingPost[]>([]);
 const [previews,setPreviews]=useState<Record<string,string>>({});
 const [previewBusy,setPreviewBusy]=useState("");
 const [filter,setFilter]=useState("open");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [note,setNote]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState("");
 const refresh=useCallback(async()=>{
  if(!signedIn||!supabase){setLoading(false);return;}
  setLoading(true);setError("");
  try{
   const {data}=await supabase.auth.getSession();const token=data.session?.access_token;if(!token)throw new Error("Please sign in again.");
   const url=kind==="posts"?"/api/moderation/pending-posts":kind==="reports"?"/api/moderation/queue?status="+filter:"/api/moderation/appeals?status="+filter;
   const response=await fetch(url,{headers:{Authorization:"Bearer "+token},cache:"no-store"});
   const payload=await response.json();if(!response.ok)throw new Error(payload.error||"The secure queue could not load.");
   if(kind==="posts")setPending(payload.posts||[]);else if(kind==="reports")setItems(payload.reports||[]);else setAppeals(payload.appeals||[]);
  }catch(e){setError(e instanceof Error?e.message:"Moderation queue unavailable.");}
  finally{setLoading(false);}
 },[signedIn,kind,filter]);
 useEffect(()=>{void refresh();},[refresh]);
 const send=async(path:string,body:unknown)=>{
  if(!supabase)throw new Error("Sign-in service unavailable.");
  const {data}=await supabase.auth.getSession();
  const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+(data.session?.access_token||"")},body:JSON.stringify(body)});
  const payload=await response.json();if(!response.ok)throw new Error(payload.error||"Could not save this review.");return payload;
 };
 const reportAction=async(report:Report,decision:"remove_content"|"dismiss")=>{setBusy(report.id);setError("");try{await send("/api/moderation/enforce",{reportId:report.id,decision,note:note[report.id]||""});setItems(old=>old.map(item=>item.id===report.id?{...item,status:decision==="dismiss"?"dismissed":"actioned"}:item));}catch(e){setError(e instanceof Error?e.message:"Moderation action failed.");}finally{setBusy("");}};
 const appealAction=async(appeal:Appeal,decision:"upheld"|"reversed")=>{setBusy(appeal.id);setError("");try{await send("/api/moderation/appeal-action",{appealId:appeal.id,decision,note:note[appeal.id]||""});setAppeals(old=>old.map(item=>item.id===appeal.id?{...item,status:decision}:item));}catch(e){setError(e instanceof Error?e.message:"Appeal decision failed.");}finally{setBusy("");}};
 const preview=async(post:PendingPost)=>{
  if(previews[post.id]){setPreviews(old=>{const next={...old};delete next[post.id];return next;});return;}
  setPreviewBusy(post.id);setError("");
  try{
   if(!supabase)throw new Error("Sign-in service unavailable.");
   const {data}=await supabase.auth.getSession();
   const response=await fetch("/api/moderation/preview-token?postId="+encodeURIComponent(post.id),{headers:{Authorization:"Bearer "+(data.session?.access_token||"")}});
   const payload=await response.json();if(!response.ok)throw new Error(payload.error||"Secure preview could not load.");
   setPreviews(old=>({...old,[post.id]:payload.playerUrl}));
  }catch(e){setError(e instanceof Error?e.message:"Preview unavailable.");}
  finally{setPreviewBusy("");}
 };
 const publishReview=async(post:PendingPost,decision:"approve"|"reject")=>{
  setBusy(post.id);setError("");
  try{await send("/api/moderation/publish-review",{postId:post.id,decision,note:note[post.id]||""});setPending(old=>old.filter(item=>item.id!==post.id));setPreviews(old=>{const next={...old};delete next[post.id];return next;});}
  catch(e){setError(e instanceof Error?e.message:"Publishing review failed.");}
  finally{setBusy("");}
 };
 if(!signedIn)return <main className="nmc-page"><button className="nmc-back" onClick={onBack}><ArrowLeft size={16}/> Back</button><section className="nmc-empty"><ShieldCheck/><h1>Moderation Centre</h1><p>Sign in with an approved moderator account to continue.</p><button onClick={onRequireSignIn}>Sign in</button></section></main>;
 return <main className="nmc-page">
  <header className="nmc-header"><div><button className="nmc-back" onClick={onBack}><ArrowLeft size={16}/> Workspace</button><small>COMMUNITY TRUST & SAFETY</small><h1><ShieldCheck/> Moderation Centre</h1><p>Review videos before publishing, handle reports and decide creator appeals.</p></div><button className="nmc-refresh" onClick={()=>void refresh()} disabled={loading}><RefreshCw size={16}/> Refresh</button></header>
  <div className="nmc-warning"><ShieldCheck size={17}/> Restricted staff area. Only verified moderators can review or publish submitted videos.</div>
  <nav className="nmc-filters"><button className={kind==="posts"?"active":""} onClick={()=>setKind("posts")}>Video review</button><button className={kind==="reports"?"active":""} onClick={()=>{setKind("reports");setFilter("open");}}>Reports</button><button className={kind==="appeals"?"active":""} onClick={()=>{setKind("appeals");setFilter("open");}}>Creator appeals</button></nav>
  {kind!=="posts"&&<nav className="nmc-filters">{(kind==="reports"?["open","reviewing","actioned","dismissed","all"]:["open","reviewing","upheld","reversed","all"]).map(value=><button key={value} className={filter===value?"active":""} onClick={()=>setFilter(value)}>{value==="all"?"All":value[0].toUpperCase()+value.slice(1)}</button>)}</nav>}
  {error&&<div className="nmc-error" role="alert">{error}</div>}
  {loading?<div className="nmc-empty">Loading secure queue…</div>:kind==="posts"?(pending.length?<section className="nmc-list">{pending.map(post=><article className="nmc-card nmc-pending-card" key={post.id}>
   <div className="nmc-card-top"><span><Video size={15}/> Video awaiting approval</span><b>{post.visibility==="public"?"Public request":post.visibility==="followers"?"Followers":"Private"}</b></div>
   <p>{post.caption||"No caption supplied."}</p>
   <small>Creator: {post.creator?.display_name||"NEXUS Creator"} · @{post.creator?.username||"creator"} · {new Date(post.created_at).toLocaleString()}</small>
   <small>Project: {post.source_project_id||"Studio project"}{post.media?.duration_ms? " · "+Math.round(post.media.duration_ms/1000)+" sec":""}{post.media?.width&&post.media?.height?" · "+post.media.width+"×"+post.media.height:""}</small>
   {post.topics?.length>0&&<small>Topics: {post.topics.join(", ")}</small>}
   {previews[post.id]?<div className="nmc-video-preview"><iframe src={previews[post.id]} title="Private moderator video preview" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowFullScreen/></div>:<button className="nmc-preview-button" disabled={!!previewBusy} onClick={()=>void preview(post)}><Play size={14}/>{previewBusy===post.id?"Preparing secure preview…":"Watch secure preview"}</button>}
   <textarea value={note[post.id]||""} onChange={e=>setNote(old=>({...old,[post.id]:e.target.value}))} maxLength={1000} placeholder="Private review note (optional)"/>
   <div className="nmc-actions"><button disabled={!!busy} onClick={()=>void publishReview(post,"approve")}><CheckCircle2 size={14}/> Approve & publish</button><button disabled={!!busy} onClick={()=>void publishReview(post,"reject")}><EyeOff size={14}/> Reject video</button></div>
   <small>Approval makes the post visible only to its selected audience. Rejection blocks playback and leaves the creator able to appeal.</small>
  </article>)}</section>:<section className="nmc-empty"><CheckCircle2/><h2>No videos awaiting review</h2><p>New uploads appear here after video processing finishes.</p></section>)
  :kind==="reports"?(items.length?<section className="nmc-list">{items.map(report=><article className="nmc-card" key={report.id}><div className="nmc-card-top"><span><Flag size={15}/> {report.target_type} report · {report.reason.replaceAll("_"," ")}</span><b>{report.status}</b></div><p>{report.details||"No additional details supplied."}</p><small>Received {new Date(report.created_at).toLocaleString()} · Target {report.target_id.slice(0,8)}…</small>{report.status!=="actioned"&&report.status!=="dismissed"&&<><textarea value={note[report.id]||""} onChange={e=>setNote(old=>({...old,[report.id]:e.target.value}))} maxLength={1000} placeholder="Private reviewer note (optional)"/><div className="nmc-actions"><button disabled={!!busy} onClick={()=>void reportAction(report,"remove_content")}><EyeOff size={14}/> Restrict content</button><button disabled={!!busy} onClick={()=>void reportAction(report,"dismiss")}><Archive size={14}/> Dismiss report</button></div></>}</article>)}</section>:<section className="nmc-empty"><CheckCircle2/><h2>No reports in this view</h2><p>The queue is clear for this filter.</p></section>)
  :(appeals.length?<section className="nmc-list">{appeals.map(appeal=><article className="nmc-card" key={appeal.id}><div className="nmc-card-top"><span><Undo2 size={15}/> {appeal.target_type} appeal</span><b>{appeal.status}</b></div><p>{appeal.explanation}</p><small>Received {new Date(appeal.created_at).toLocaleString()} · Target {appeal.target_id.slice(0,8)}…</small>{(appeal.status==="open"||appeal.status==="reviewing")&&<><textarea value={note[appeal.id]||""} onChange={e=>setNote(old=>({...old,[appeal.id]:e.target.value}))} maxLength={1000} placeholder="Private decision note (optional)"/><div className="nmc-actions"><button disabled={!!busy} onClick={()=>void appealAction(appeal,"reversed")}><CheckCircle2 size={14}/> Reverse restriction</button><button disabled={!!busy} onClick={()=>void appealAction(appeal,"upheld")}><Archive size={14}/> Uphold restriction</button></div></>}</article>)}</section>:<section className="nmc-empty"><CheckCircle2/><h2>No appeals in this view</h2><p>There are no creator appeals waiting here.</p></section>)}
 </main>;
}
