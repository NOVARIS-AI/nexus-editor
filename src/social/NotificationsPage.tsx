import { useCallback,useEffect,useState } from "react";
import { ArrowLeft,Bell,Check,CheckCheck,Heart,MessageCircle,UserPlus,Users,RefreshCw,Inbox,Lock } from "lucide-react";
import { useNexusAuth } from "../lib/AuthGate";
import { isSupabaseConfigured } from "../lib/supabase";
import { loadNexusNotifications,markNexusNotificationRead,type NexusNotification } from "./social-service";
import "./notifications.css";
type Props={onBack:()=>void;onOpenProfile:()=>void;onRequireSignIn:()=>void};
const message=(n:NexusNotification)=>{
 const name=n.actorName;
 if(n.eventType==="follow_request")return name+" requested to follow you.";
 if(n.eventType==="new_follower")return name+" started following you.";
 if(n.eventType==="follow_accepted")return name+" accepted your follow request.";
 if(n.eventType==="post_like")return name+" liked your post.";
 return name+" commented on your post.";
};
const timeAgo=(value:string)=>{
 const seconds=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/1000));
 if(seconds<60)return "Just now";if(seconds<3600)return Math.floor(seconds/60)+"m ago";
 if(seconds<86400)return Math.floor(seconds/3600)+"h ago";if(seconds<604800)return Math.floor(seconds/86400)+"d ago";
 return new Date(value).toLocaleDateString();
};
export function NotificationsPage({onBack,onOpenProfile,onRequireSignIn}:Props){
 const {signedIn}=useNexusAuth();const [items,setItems]=useState<NexusNotification[]>([]);const [unread,setUnread]=useState(0);
 const [filter,setFilter]=useState<"all"|"unread">("all");const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const refresh=useCallback(async()=>{if(!signedIn||!isSupabaseConfigured){setLoading(false);return;}setLoading(true);setError("");try{const result=await loadNexusNotifications();setItems(result.items);setUnread(result.unreadCount);}catch(e){setError(e instanceof Error?e.message:"Notifications could not load.");}finally{setLoading(false);}},[signedIn]);
 useEffect(()=>{void refresh();},[refresh]);
 const markOne=async(id:string)=>{setBusy(true);try{await markNexusNotificationRead(id);setItems(old=>old.map(n=>n.id===id?{...n,readAt:new Date().toISOString()}:n));setUnread(n=>Math.max(0,n-1));}catch(e){setError(e instanceof Error?e.message:"Could not update notification.");}finally{setBusy(false);}};
 const markAll=async()=>{setBusy(true);try{await markNexusNotificationRead();setItems(old=>old.map(n=>({...n,readAt:n.readAt||new Date().toISOString()})));setUnread(0);}catch(e){setError(e instanceof Error?e.message:"Could not mark notifications as read.");}finally{setBusy(false);}};
 const visible=filter==="unread"?items.filter(n=>!n.readAt):items;
 const icon=(type:NexusNotification["eventType"])=>type==="post_like"?<Heart size={17}/>:type==="post_comment"?<MessageCircle size={17}/>:type==="follow_accepted"?<Check size={17}/>:type==="follow_request"?<UserPlus size={17}/>:<Users size={17}/>;
 return <main className="nexus-notifications"><header className="nn-header"><button onClick={onBack}><ArrowLeft size={17}/> Back to community</button><div><small>YOUR CREATOR SPACE</small><h1>Notifications {unread>0&&<span>{unread>99?"99+":unread}</span>}</h1></div><button className="nn-refresh" onClick={()=>void refresh()} aria-label="Refresh notifications"><RefreshCw size={17}/></button></header>
 {!signedIn?<section className="nn-empty"><Lock size={28}/><h2>Your notifications are private</h2><p>Sign in to see follow requests, new followers, likes and comments.</p><button onClick={onRequireSignIn}>Sign in to continue</button></section>:<>
 <section className="nn-panel"><div className="nn-toolbar"><div className="nn-filters"><button className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>All</button><button className={filter==="unread"?"active":""} onClick={()=>setFilter("unread")}>Unread {unread>0&&"· "+unread}</button></div><button className="nn-mark-all" disabled={!unread||busy} onClick={()=>void markAll()}><CheckCheck size={15}/> Mark all read</button></div>
 {error&&<div className="nn-error" role="alert">{error}</div>}
 {loading?<div className="nn-loading">Loading your activity…</div>:visible.length?<div className="nn-list">{visible.map(n=><article className={"nn-item "+(!n.readAt?"unread":"")} key={n.id}><div className={"nn-type-icon "+n.eventType}>{icon(n.eventType)}</div><div className="nn-copy"><div className="nn-main-copy">{n.actorAvatar?<img className="nn-avatar" src={n.actorAvatar} alt=""/>:<span className="nn-avatar nn-avatar-fallback">{n.actorName.slice(0,1).toUpperCase()}</span>}<p>{message(n)}</p></div><small>{timeAgo(n.createdAt)} · @{n.actorHandle}</small><div className="nn-actions">{n.eventType==="follow_request"&&<button onClick={onOpenProfile}>Review request</button>}{!n.readAt&&<button disabled={busy} onClick={()=>void markOne(n.id)}>Mark read</button>}</div></div>{!n.readAt&&<i className="nn-unread-dot"/>}</article>)}</div>:<div className="nn-empty-inline"><Inbox size={30}/><b>{filter==="unread"?"You're all caught up":"No notifications yet"}</b><p>{filter==="unread"?"There are no unread updates.":"When someone follows you, likes your work or comments, you'll see it here."}</p></div>}
 </section></>}
 </main>;
}
