import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Bookmark, Check, FolderPlus, Library, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useNexusAuth } from "../lib/AuthGate";
import {
  addSavedPostToCollection, createSavedCollection, deleteSavedCollection,
  loadSavedCollections, loadSavedLibrary, removeSavedPostFromCollection,
  togglePostSave, loadCommunityPlaybackUrl, type SavedCollection, type SavedLibraryPost
} from "./social-service";
import "./saved-library.css";

type Props={onBack:()=>void;onRequireSignIn:()=>void};
export function SavedPage({onBack,onRequireSignIn}:Props){
  const {signedIn}=useNexusAuth();
  const [posts,setPosts]=useState<SavedLibraryPost[]>([]);
  const [collections,setCollections]=useState<SavedCollection[]>([]);
  const [activeCollection,setActiveCollection]=useState<string|null>(null);
  const [name,setName]=useState("");
  const [description,setDescription]=useState("");
  const [creating,setCreating]=useState(false);
  const [loading,setLoading]=useState(false);
  const [busyId,setBusyId]=useState("");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [previewPost,setPreviewPost]=useState<SavedLibraryPost|null>(null);
  const [previewUrl,setPreviewUrl]=useState("");
  const [previewLoading,setPreviewLoading]=useState(false);

  const refresh=useCallback(async()=>{
    if(!signedIn)return;
    setLoading(true);setError("");
    try{
      const [saved,groups]=await Promise.all([loadSavedLibrary(),loadSavedCollections()]);
      setPosts(saved);setCollections(groups);
      if(activeCollection&&!groups.some(group=>group.id===activeCollection))setActiveCollection(null);
    }catch(e){setError(e instanceof Error?e.message:"Your saved library could not load.");}
    finally{setLoading(false);}
  },[signedIn,activeCollection]);

  useEffect(()=>{void refresh();},[refresh]);
  const selected=collections.find(group=>group.id===activeCollection)||null;
  const visiblePosts=useMemo(()=>selected?posts.filter(post=>selected.postIds.includes(post.id)):posts,[posts,selected]);

  const create=async(event:FormEvent)=>{
    event.preventDefault();if(!name.trim())return;
    setCreating(true);setError("");
    try{
      const group=await createSavedCollection(name,description);
      setCollections(old=>[group,...old]);setActiveCollection(group.id);
      setName("");setDescription("");setNotice("Collection created.");
    }catch(e){setError(e instanceof Error?e.message:"Could not create that collection.");}
    finally{setCreating(false);}
  };
  const addToCollection=async(postId:string,collectionId:string)=>{
    if(!collectionId)return;
    setBusyId(postId);setError("");
    try{await addSavedPostToCollection(collectionId,postId);setCollections(old=>old.map(group=>group.id===collectionId?{...group,postIds:group.postIds.includes(postId)?group.postIds:[...group.postIds,postId]}:group));setNotice("Added to collection.");}
    catch(e){setError(e instanceof Error?e.message:"Could not add this saved post.");}
    finally{setBusyId("");}
  };
  const removeFromCollection=async(postId:string)=>{
    if(!selected)return;
    setBusyId(postId);setError("");
    try{await removeSavedPostFromCollection(selected.id,postId);setCollections(old=>old.map(group=>group.id===selected.id?{...group,postIds:group.postIds.filter(id=>id!==postId)}:group));setNotice("Removed from this collection. The post remains saved.");}
    catch(e){setError(e instanceof Error?e.message:"Could not remove this item.");}
    finally{setBusyId("");}
  };
  const unsave=async(postId:string)=>{
    setBusyId(postId);setError("");
    try{await togglePostSave(postId,true);setPosts(old=>old.filter(post=>post.id!==postId));setCollections(old=>old.map(group=>({...group,postIds:group.postIds.filter(id=>id!==postId)})));setNotice("Post removed from your saved library.");}
    catch(e){setError(e instanceof Error?e.message:"Could not unsave this post.");}
    finally{setBusyId("");}
  };
  const openPreview=async(post:SavedLibraryPost)=>{
    setPreviewPost(post);setPreviewUrl("");setPreviewLoading(true);setError("");
    try{setPreviewUrl(await loadCommunityPlaybackUrl(post.id));}
    catch(e){setError(e instanceof Error?e.message:"This saved video is not available to play right now.");}
    finally{setPreviewLoading(false);}
  };
  const removeCollection=async(group:SavedCollection)=>{
    if(!window.confirm("Delete “"+group.name+"”? Your saved posts will stay in your library."))return;
    setBusyId(group.id);setError("");
    try{await deleteSavedCollection(group.id);setCollections(old=>old.filter(item=>item.id!==group.id));setActiveCollection(null);setNotice("Collection deleted. Your saved posts are unchanged.");}
    catch(e){setError(e instanceof Error?e.message:"Could not delete this collection.");}
    finally{setBusyId("");}
  };

  if(!signedIn)return <section className="nsl-page"><button className="nsl-back" onClick={onBack}><ArrowLeft size={17}/> Back</button><div className="nsl-gate"><Library size={34}/><h1>Your saved library</h1><p>Sign in to keep videos and organise inspiration into private collections.</p><button onClick={onRequireSignIn}>Sign in to continue</button></div></section>;

  return <section className="nsl-page">
    <header className="nsl-header"><div><button className="nsl-back" onClick={onBack}><ArrowLeft size={17}/> Community</button><span className="nsl-kicker">YOUR PRIVATE CREATOR LIBRARY</span><h1>Saved videos</h1><p>Keep useful ideas close. Group saved posts into collections for your next project.</p></div><button className="nsl-refresh" onClick={()=>void refresh()} disabled={loading}><RefreshCw size={16}/> Refresh</button></header>
    {error&&<div className="nsl-alert">{error}</div>}{notice&&<div className="nsl-notice">{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss"><X size={14}/></button></div>}
    <div className="nsl-layout">
      <aside className="nsl-sidebar">
        <button className={!activeCollection?"active":""} onClick={()=>setActiveCollection(null)}><Library size={17}/><span>All saved</span><b>{posts.length}</b></button>
        <div className="nsl-side-title">COLLECTIONS <span>{collections.length}</span></div>
        {collections.map(group=><button key={group.id} className={activeCollection===group.id?"active":""} onClick={()=>setActiveCollection(group.id)}><span className="nsl-folder-icon"><Bookmark size={15}/></span><span className="nsl-collection-name">{group.name}</span><b>{group.postIds.length}</b></button>)}
        {!collections.length&&<p className="nsl-muted">Your collections will appear here.</p>}
        {selected&&<button className="nsl-delete-collection" onClick={()=>void removeCollection(selected)} disabled={busyId===selected.id}><Trash2 size={14}/> Delete collection</button>}
      </aside>
      <main className="nsl-main">
        <div className="nsl-section-head"><div><h2>{selected?selected.name:"All saved posts"}</h2><p>{selected?(selected.description||"A collection of your saved inspiration."):"Everything you have bookmarked from the NEXUS community."}</p></div><span>{visiblePosts.length} {visiblePosts.length===1?"post":"posts"}</span></div>
        <form className="nsl-create" onSubmit={create}><div className="nsl-create-icon"><FolderPlus size={20}/></div><div className="nsl-create-fields"><label htmlFor="nsl-name">Create a collection</label><input id="nsl-name" value={name} onChange={e=>setName(e.target.value)} maxLength={48} placeholder="e.g. Video ideas, Editing styles, Tutorials"/><input value={description} onChange={e=>setDescription(e.target.value)} maxLength={180} placeholder="Short description (optional)"/></div><button type="submit" disabled={creating||!name.trim()}><Plus size={16}/>{creating?"Creating…":"Create"}</button></form>
        {loading?<div className="nsl-empty">Loading your saved library…</div>:!visiblePosts.length?<div className="nsl-empty"><Bookmark size={30}/><h3>{selected?"This collection is empty":"Nothing saved yet"}</h3><p>{selected?"Add saved posts to this collection from your full library.":"When you save a community post, it will appear here. You can then organise it into collections."}</p></div>:<div className="nsl-grid">{visiblePosts.map(post=><article className="nsl-card" key={post.id}><button className="nsl-card-art" onClick={()=>void openPreview(post)} aria-label={"Play saved video by "+post.creator}><span><Bookmark size={19}/></span><small>{post.visibility==="private"?"PRIVATE":post.visibility==="followers"?"FOLLOWERS":"COMMUNITY"}</small><b>{post.creator}</b><i>▶ Play saved video</i></button><div className="nsl-card-body"><b>{post.creator}</b><small>@{post.handle} · Saved {new Date(post.savedAt).toLocaleDateString()}</small><p>{post.caption||"Saved community video"}</p>{selected?<button className="nsl-secondary" onClick={()=>void removeFromCollection(post.id)} disabled={busyId===post.id}><X size={14}/> Remove from collection</button>:<div className="nsl-card-actions"><select aria-label={"Add "+post.creator+" post to a collection"} defaultValue="" onChange={e=>{const value=e.target.value;e.currentTarget.value="";void addToCollection(post.id,value);}} disabled={!collections.length||busyId===post.id}><option value="">{collections.length?"Add to collection":"Create a collection first"}</option>{collections.filter(group=>!group.postIds.includes(post.id)).map(group=><option key={group.id} value={group.id}>{group.name}</option>)}</select><button onClick={()=>void unsave(post.id)} disabled={busyId===post.id} aria-label="Remove from saved"><Trash2 size={15}/></button></div>}</div></article>)}</div>}
      </main>
    </div>
    {previewPost&&<div className="nsl-player-overlay" onClick={()=>{setPreviewPost(null);setPreviewUrl("");}}><section className="nsl-player-sheet" onClick={event=>event.stopPropagation()}><header><div><b>{previewPost.creator}</b><small>@{previewPost.handle}</small></div><button onClick={()=>{setPreviewPost(null);setPreviewUrl("");}} aria-label="Close player"><X size={19}/></button></header>{previewUrl?<iframe src={previewUrl} title={"Saved video by "+previewPost.creator} allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen/>:<div className="nsl-player-state">{previewLoading?"Preparing secure playback…":"Video could not be opened"}<small>{previewLoading?"":error||"Playback may be unavailable or the post may no longer be visible."}</small></div>}<p>{previewPost.caption}</p></section></div>}
    <footer className="nsl-footnote"><Check size={14}/> Collections are private to your account. Removing a post from a collection does not unsave it.</footer>
  </section>;
}
