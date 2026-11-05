import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Image, Lock, Globe2, Users, X, UploadCloud, ShieldCheck } from "lucide-react";
import "./publish-flow.css";
import { getVideoUploadStatus, uploadVideoForReview } from "./video-upload-service";

type Props = { projectName:string; onClose:()=>void };
type Visibility = "public"|"followers"|"private";

export function PublishFlow({projectName,onClose}:Props) {
  const [step,setStep]=useState(0);
  useEffect(()=>{const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose();};window.addEventListener("keydown",onKeyDown);return()=>window.removeEventListener("keydown",onKeyDown);},[onClose]);
  const [caption,setCaption]=useState("");
  const [visibility,setVisibility]=useState<Visibility>("public");
  const [allowComments,setAllowComments]=useState(true);
  const [allowRemix,setAllowRemix]=useState(false);
  const cover="Auto cover";
  const [saved,setSaved]=useState(false);
  const [message,setMessage]=useState("");
  const [videoFile,setVideoFile]=useState<File|null>(null);
  const [videoDuration,setVideoDuration]=useState(0);
  const [uploadBusy,setUploadBusy]=useState(false);
  const [uploadProgress,setUploadProgress]=useState(0);
  const [uploadComplete,setUploadComplete]=useState(false);
  const [uploadPostId,setUploadPostId]=useState("");
  const videoInput=useRef<HTMLInputElement>(null);

  const chooseVideo=(file?:File)=>{
    setMessage("");setUploadComplete(false);setUploadProgress(0);setVideoDuration(0);
    if(!file){setVideoFile(null);return;}
    const allowed=["video/mp4","video/webm","video/quicktime","video/x-m4v"];
    if(!allowed.includes(file.type)){setVideoFile(null);setMessage("Choose an MP4, WebM or MOV video.");return;}
    if(file.size>200*1024*1024){setVideoFile(null);setMessage("This upload supports videos up to 200 MB.");return;}
    setVideoFile(file);
    const url=URL.createObjectURL(file);
    const probe=document.createElement("video");
    probe.preload="metadata";
    probe.onloadedmetadata=()=>{
      URL.revokeObjectURL(url);
      const duration=probe.duration;
      if(!Number.isFinite(duration)||duration<=0){setVideoFile(null);setMessage("NEXUS could not read this video's duration.");return;}
      if(duration>600){setVideoFile(null);setMessage("Videos must be 10 minutes or shorter for this upload version.");return;}
      setVideoDuration(duration);
    };
    probe.onerror=()=>{URL.revokeObjectURL(url);setVideoFile(null);setMessage("This video file could not be opened. Try exporting it again as MP4.");};
    probe.src=url;
  };

  const uploadForReview=async()=>{
    if(!videoFile||!videoDuration||uploadBusy||uploadComplete)return;
    setUploadBusy(true);setMessage("Preparing a secure upload…");
    try{
      const result=await uploadVideoForReview(videoFile,{caption,visibility,commentsEnabled:allowComments,remixEnabled:allowRemix,durationSeconds:videoDuration},setUploadProgress);
      setUploadPostId(result.postId);setUploadComplete(true);
      setMessage("Upload received. Cloudflare is processing the video; it will remain private until processing and moderation are complete.");
    }catch(error){
      setMessage(error instanceof Error?error.message:"Upload failed. Your Studio project remains unchanged.");
    }finally{setUploadBusy(false);}
  };
  useEffect(()=>{
    if(!uploadComplete||!uploadPostId)return;
    let stopped=false;
    let timer:number|undefined;
    let attempts=0;
    const check=async()=>{
      attempts++;
      try{
        const status=await getVideoUploadStatus(uploadPostId);
        if(stopped)return;
        if(status.uploadState==="failed"||status.postStatus==="failed"){
          setMessage("The video could not be processed. Your Studio project and local draft are still safe.");
          return;
        }
        if(status.moderationState==="approved"&&status.postStatus==="ready"){
          setMessage("Your video has passed review and is now published.");
          return;
        }
        if(status.uploadState==="ready"){
          setMessage("Video processing is complete. Your post is waiting for moderation approval and is not public yet.");
        }
      }catch(error){
        if(attempts>=4&&!stopped)setMessage(error instanceof Error?error.message:"Upload status could not be refreshed.");
      }
      if(!stopped&&attempts<24)timer=window.setTimeout(check, statusDelay());
    };
    const statusDelay=()=>attempts>1?15000:7000;
    void check();
    return ()=>{stopped=true;if(timer)window.clearTimeout(timer);};
  },[uploadComplete,uploadPostId]);

  const saveDraft=()=>{
    const draft={projectName,caption,visibility,allowComments,allowRemix,cover,updatedAt:new Date().toISOString(),status:"local-draft"};
    try {
      const existing=JSON.parse(localStorage.getItem("nexus-publish-drafts")||"[]");
      const safe=Array.isArray(existing)?existing:[];
      localStorage.setItem("nexus-publish-drafts",JSON.stringify([draft,...safe.filter((item:any)=>item.projectName!==projectName)].slice(0,20)));
      setSaved(true);setMessage("Publish draft saved on this device. It has not been uploaded or published.");
    } catch { setMessage("This device could not save the draft. Your editor project remains unchanged."); }
  };
  return <div className="nexus-publish-overlay" role="dialog" aria-modal="true" aria-label="Publish to NEXUS" onClick={onClose}>
    <section className="nexus-publish-modal" onClick={event=>event.stopPropagation()}>
      <header className="nexus-publish-head"><button onClick={onClose} aria-label="Close publish flow"><X size={19}/></button><div><span>STUDIO → COMMUNITY</span><h2>Publish your creation</h2><small>{projectName}</small></div><span className="nexus-publish-draft">DRAFT</span></header>
      <div className="nexus-publish-steps">{["Details","Audience","Review"].map((name,index)=><div className={step===index?"active":step>index?"done":""} key={name}><i>{step>index?<Check size={12}/>:index+1}</i><span>{name}</span></div>)}</div>
      {step===0&&<div className="nexus-publish-body"><div className="nexus-publish-cover"><div><Image size={26}/><b>{videoFile?videoFile.name:cover}</b><small>{videoFile?(`${(videoFile.size/1024/1024).toFixed(1)} MB · ${videoDuration?Math.round(videoDuration)+" sec":"Reading video details…"}`):"Export your finished video from Studio, then attach it here."}</small><button type="button" className="nexus-publish-pick" onClick={()=>videoInput.current?.click()}>{videoFile?"Change video":"Choose exported video"}</button><input ref={videoInput} hidden type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" onChange={event=>chooseVideo(event.target.files?.[0])}/></div></div><label className="nexus-publish-label" htmlFor="nexus-publish-caption">Caption</label><textarea id="nexus-publish-caption" maxLength={2200} value={caption} onChange={event=>setCaption(event.target.value)} placeholder="Tell the community what your video is about…"/><div className="nexus-publish-count">{caption.length}/2200</div><label className="nexus-publish-label">Project source</label><div className="nexus-publish-source"><Check size={16}/><span><b>{projectName}</b><small>Your editable Studio project stays private and unchanged.</small></span></div></div>}
      {step===1&&<div className="nexus-publish-body"><h3>Who can watch this?</h3><p className="nexus-publish-muted">Choose the audience for this post. Privacy must also be enforced by the publishing service.</p><div className="nexus-publish-options">
        <button className={visibility==="public"?"selected":""} onClick={()=>setVisibility("public")}><Globe2/><span><b>Public</b><small>Anyone can discover and watch.</small></span>{visibility==="public"&&<Check/>}</button>
        <button className={visibility==="followers"?"selected":""} onClick={()=>setVisibility("followers")}><Users/><span><b>Followers</b><small>Only approved followers can watch.</small></span>{visibility==="followers"&&<Check/>}</button>
        <button className={visibility==="private"?"selected":""} onClick={()=>setVisibility("private")}><Lock/><span><b>Only me</b><small>Keep this post private.</small></span>{visibility==="private"&&<Check/>}</button>
      </div><label className="nexus-publish-toggle"><input type="checkbox" checked={allowComments} onChange={event=>setAllowComments(event.target.checked)}/><span><b>Allow comments</b><small>Viewers can respond to this post.</small></span></label><label className="nexus-publish-toggle"><input type="checkbox" checked={allowRemix} onChange={event=>setAllowRemix(event.target.checked)}/><span><b>Allow remix / reuse</b><small>Let other creators build on this work (when supported).</small></span></label></div>}
      {step===2&&<div className="nexus-publish-body"><div className="nexus-publish-review"><ShieldCheck size={25}/><div><b>Ready for review</b><small>Confirm the details before sending your video to the community.</small></div></div><dl><div><dt>Project</dt><dd>{projectName}</dd></div><div><dt>Audience</dt><dd>{visibility==="public"?"Public":visibility==="followers"?"Followers only":"Only me"}</dd></div><div><dt>Comments</dt><dd>{allowComments?"Allowed":"Off"}</dd></div><div><dt>Remix</dt><dd>{allowRemix?"Allowed":"Off"}</dd></div><div><dt>Caption</dt><dd>{caption.trim()||"No caption added"}</dd></div></dl><div className="nexus-publish-upload-state"><UploadCloud size={19}/><div><b>{uploadComplete?"Video uploaded — processing and review pending":uploadBusy?"Uploading your video…":"Secure video upload"}</b><small>{uploadComplete?"Your post is saved privately. It cannot appear in public feeds until processing and moderation approval are complete.": "Uploads go directly to the video host using a one-time URL. The app never exposes its provider API token."}</small>{uploadBusy&&<div className="nexus-publish-progress"><i style={{width:uploadProgress+"%"}}/></div>}{uploadComplete&&<small>Post reference: {uploadPostId.slice(0,8)}…</small>}</div></div></div>}
      {message&&<p className="nexus-publish-message">{message}</p>}
      <footer className="nexus-publish-foot"><button className="nexus-publish-secondary" onClick={saveDraft}>{saved?"Saved on device":"Save draft"}</button><div>{step>0&&<button className="nexus-publish-secondary" onClick={()=>setStep(v=>v-1)}><ArrowLeft size={15}/> Back</button>}{step<2?<button className="nexus-publish-primary" onClick={()=>setStep(v=>v+1)}>Continue <ArrowRight size={15}/></button>:<button className="nexus-publish-primary" onClick={()=>void uploadForReview()} disabled={!videoFile||!videoDuration||uploadBusy||uploadComplete}><UploadCloud size={15}/>{uploadBusy?"Uploading…":uploadComplete?"Upload received":"Upload for review"}</button>}</div></footer>
    </section>
  </div>;
}
