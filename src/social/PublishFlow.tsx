import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Image, Lock, Globe2, Users, X, UploadCloud, ShieldCheck, Video, FileVideo, LoaderCircle } from "lucide-react";
import "./publish-flow.css";
import { uploadVideoDraft, type VideoUploadDraftResult } from "./video-upload";

type Props = { projectName:string; onClose:()=>void };
type Visibility = "public"|"followers"|"private";

export function PublishFlow({projectName,onClose}:Props) {
  const [step,setStep]=useState(0);
  useEffect(()=>{const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();};window.addEventListener("keydown",onKeyDown);return()=>window.removeEventListener("keydown",onKeyDown);},[onClose]);
  const [caption,setCaption]=useState("");
  const [visibility,setVisibility]=useState<Visibility>("public");
  const [allowComments,setAllowComments]=useState(true);
  const [allowRemix,setAllowRemix]=useState(false);
  const [videoFile,setVideoFile]=useState<File|null>(null);
  const [uploadBusy,setUploadBusy]=useState(false);
  const [uploadProgress,setUploadProgress]=useState(0);
  const [uploadStage,setUploadStage]=useState("");
  const [uploadResult,setUploadResult]=useState<VideoUploadDraftResult|null>(null);
  const [saved,setSaved]=useState(false);
  const [message,setMessage]=useState("");
  const fileInput=useRef<HTMLInputElement>(null);

  const saveDraft=()=>{
    const draft={projectName,caption,visibility,allowComments,allowRemix,videoName:videoFile?.name||"",updatedAt:new Date().toISOString(),status:"local-draft"};
    try {
      const existing=JSON.parse(localStorage.getItem("nexus-publish-drafts")||"[]");
      const safe=Array.isArray(existing)?existing:[];
      localStorage.setItem("nexus-publish-drafts",JSON.stringify([draft,...safe.filter((item:any)=>item.projectName!==projectName)].slice(0,20)));
      setSaved(true);setMessage("Publish details saved on this device. The selected video itself is not stored in this local draft.");
    } catch { setMessage("This device could not save the draft. Your editor project remains unchanged."); }
  };
  const selectVideo=(file:File|null)=>{
    setUploadResult(null);setUploadProgress(0);setMessage("");
    if(!file){setVideoFile(null);return;}
    if(!["video/mp4","video/webm","video/quicktime"].includes(file.type.toLowerCase())){setVideoFile(null);setMessage("Choose an MP4, WebM or QuickTime video.");return;}
    if(file.size>200*1024*1024){setVideoFile(null);setMessage("This upload route currently accepts videos up to 200 MB.");return;}
    setVideoFile(file);
  };
  const upload=async()=>{
    if(!videoFile||uploadBusy)return;
    setUploadBusy(true);setMessage("");setUploadProgress(0);
    try {
      const result=await uploadVideoDraft(videoFile,{projectName,caption,visibility,commentsEnabled:allowComments,remixEnabled:allowRemix},setUploadProgress,setUploadStage);
      setUploadResult(result);setMessage(result.message);
    } catch(error) { setMessage(error instanceof Error?error.message:"Video upload failed. Your local project remains safe."); }
    finally { setUploadBusy(false); }
  };

  return <div className="nexus-publish-overlay" role="dialog" aria-modal="true" aria-label="Publish to NEXUS" onClick={uploadBusy?undefined:onClose}>
    <section className="nexus-publish-modal" onClick={event=>event.stopPropagation()}>
      <header className="nexus-publish-head"><button onClick={onClose} aria-label="Close publish flow" disabled={uploadBusy}><X size={19}/></button><div><span>STUDIO → COMMUNITY</span><h2>Publish your creation</h2><small>{projectName}</small></div><span className="nexus-publish-draft">DRAFT</span></header>
      <div className="nexus-publish-steps">{["Video & details","Audience","Review"].map((name,index)=><div className={step===index?"active":step>index?"done":""} key={name}><i>{step>index?<Check size={12}/>:index+1}</i><span>{name}</span></div>)}</div>
      {step===0&&<div className="nexus-publish-body">
        <div className="nexus-publish-cover"><div><Image size={26}/><b>Video for your post</b><small>Choose an exported MP4, WebM or QuickTime video. Maximum 200 MB for this upload route.</small></div></div>
        <input ref={fileInput} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={event=>selectVideo(event.target.files?.[0]||null)}/>
        <button className="nexus-publish-file" type="button" onClick={()=>fileInput.current?.click()} disabled={uploadBusy}><FileVideo size={17}/>{videoFile?"Choose a different video":"Choose video from device"}</button>
        {videoFile&&<div className="nexus-publish-source"><Video size={17}/><span><b>{videoFile.name}</b><small>{(videoFile.size/1024/1024).toFixed(1)} MB · {videoFile.type}</small></span><button onClick={()=>selectVideo(null)} aria-label="Remove selected video"><X size={15}/></button></div>}
        <label className="nexus-publish-label" htmlFor="nexus-publish-caption">Caption</label><textarea id="nexus-publish-caption" maxLength={2200} value={caption} onChange={event=>setCaption(event.target.value)} placeholder="Tell the community what your video is about…"/><div className="nexus-publish-count">{caption.length}/2200</div>
        <label className="nexus-publish-label">Project source</label><div className="nexus-publish-source"><Check size={16}/><span><b>{projectName}</b><small>Your editable Studio project stays private and unchanged.</small></span></div>
      </div>}
      {step===1&&<div className="nexus-publish-body"><h3>Who can watch this?</h3><p className="nexus-publish-muted">Your selected audience is saved with the private draft. Public distribution still requires moderation approval.</p><div className="nexus-publish-options">
        <button className={visibility==="public"?"selected":""} onClick={()=>setVisibility("public")}><Globe2/><span><b>Public</b><small>Request public distribution after review.</small></span>{visibility==="public"&&<Check/>}</button>
        <button className={visibility==="followers"?"selected":""} onClick={()=>setVisibility("followers")}><Users/><span><b>Followers</b><small>Request follower-only visibility after review.</small></span>{visibility==="followers"&&<Check/>}</button>
        <button className={visibility==="private"?"selected":""} onClick={()=>setVisibility("private")}><Lock/><span><b>Only me</b><small>Keep this post private.</small></span>{visibility==="private"&&<Check/>}</button>
      </div><label className="nexus-publish-toggle"><input type="checkbox" checked={allowComments} onChange={event=>setAllowComments(event.target.checked)}/><span><b>Allow comments</b><small>Viewers can respond after the post is approved.</small></span></label><label className="nexus-publish-toggle"><input type="checkbox" checked={allowRemix} onChange={event=>setAllowRemix(event.target.checked)}/><span><b>Allow remix / reuse</b><small>Let other creators build on this work when supported.</small></span></label></div>}
      {step===2&&<div className="nexus-publish-body">
        <div className="nexus-publish-review"><ShieldCheck size={25}/><div><b>{uploadResult?"Video saved as a private draft":"Ready to upload for review"}</b><small>Confirm the details before sending your video to secure storage.</small></div></div>
        <dl><div><dt>Video</dt><dd>{videoFile?.name||"No video selected"}</dd></div><div><dt>Audience</dt><dd>{visibility==="public"?"Public after approval":visibility==="followers"?"Followers after approval":"Only me"}</dd></div><div><dt>Comments</dt><dd>{allowComments?"Allowed":"Off"}</dd></div><div><dt>Remix</dt><dd>{allowRemix?"Allowed":"Off"}</dd></div><div><dt>Caption</dt><dd>{caption.trim()||"No caption added"}</dd></div></dl>
        {!uploadResult&&<div className="nexus-publish-blocked"><UploadCloud size={19}/><div><b>Private upload · moderation required</b><small>The upload API creates a private draft and stores the video with signed playback protection. It does not publish the post or expose it in For You.</small></div></div>}
        {uploadBusy&&<div className="nexus-upload-progress"><div><LoaderCircle size={16}/><span>{uploadStage||"Uploading…"}</span><b>{uploadProgress}%</b></div><progress max="100" value={uploadProgress}/></div>}
        {uploadResult&&<div className="nexus-publish-review nexus-publish-uploaded"><Check size={20}/><div><b>Private draft uploaded</b><small>Draft ID: {uploadResult.postId}</small></div></div>}
      </div>}
      {message&&<p className="nexus-publish-message" role="status">{message}</p>}
      <footer className="nexus-publish-foot"><button className="nexus-publish-secondary" onClick={saveDraft} disabled={uploadBusy}>{saved?"Saved on device":"Save details"}</button><div>{step>0&&<button className="nexus-publish-secondary" onClick={()=>setStep(v=>v-1)} disabled={uploadBusy}><ArrowLeft size={15}/> Back</button>}{step<2?<button className="nexus-publish-primary" onClick={()=>setStep(v=>v+1)} disabled={step===0&&!videoFile}>Continue <ArrowRight size={15}/></button>:<button className="nexus-publish-primary" onClick={()=>void upload()} disabled={!videoFile||uploadBusy||Boolean(uploadResult)}>{uploadBusy?<><LoaderCircle size={15}/> Uploading…</>:uploadResult?<><Check size={15}/> Draft uploaded</>:<><UploadCloud size={15}/> Upload private draft</>}</button>}</div></footer>
    </section>
  </div>;
}
