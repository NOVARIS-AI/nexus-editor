import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Image, Lock, Globe2, Users, X, UploadCloud, ShieldCheck } from "lucide-react";
import "./publish-flow.css";

type Props = { projectName:string; onClose:()=>void };
type Visibility = "public"|"followers"|"private";

export function PublishFlow({projectName,onClose}:Props) {
  const [step,setStep]=useState(0);
  const [caption,setCaption]=useState("");
  const [visibility,setVisibility]=useState<Visibility>("public");
  const [allowComments,setAllowComments]=useState(true);
  const [allowRemix,setAllowRemix]=useState(false);
  const cover="Auto cover";
  const [saved,setSaved]=useState(false);
  const [message,setMessage]=useState("");
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
      {step===0&&<div className="nexus-publish-body"><div className="nexus-publish-cover"><div><Image size={26}/><b>{cover}</b><small>Cover frame selection will be available after video rendering is connected.</small></div></div><label className="nexus-publish-label">Caption</label><textarea maxLength={2200} value={caption} onChange={event=>setCaption(event.target.value)} placeholder="Tell the community what your video is about…"/><div className="nexus-publish-count">{caption.length}/2200</div><label className="nexus-publish-label">Project source</label><div className="nexus-publish-source"><Check size={16}/><span><b>{projectName}</b><small>Your editable Studio project stays private and unchanged.</small></span></div></div>}
      {step===1&&<div className="nexus-publish-body"><h3>Who can watch this?</h3><p className="nexus-publish-muted">Choose the audience for this post. Privacy must also be enforced by the publishing service.</p><div className="nexus-publish-options">
        <button className={visibility==="public"?"selected":""} onClick={()=>setVisibility("public")}><Globe2/><span><b>Public</b><small>Anyone can discover and watch.</small></span>{visibility==="public"&&<Check/>}</button>
        <button className={visibility==="followers"?"selected":""} onClick={()=>setVisibility("followers")}><Users/><span><b>Followers</b><small>Only approved followers can watch.</small></span>{visibility==="followers"&&<Check/>}</button>
        <button className={visibility==="private"?"selected":""} onClick={()=>setVisibility("private")}><Lock/><span><b>Only me</b><small>Keep this post private.</small></span>{visibility==="private"&&<Check/>}</button>
      </div><label className="nexus-publish-toggle"><input type="checkbox" checked={allowComments} onChange={event=>setAllowComments(event.target.checked)}/><span><b>Allow comments</b><small>Viewers can respond to this post.</small></span></label><label className="nexus-publish-toggle"><input type="checkbox" checked={allowRemix} onChange={event=>setAllowRemix(event.target.checked)}/><span><b>Allow remix / reuse</b><small>Let other creators build on this work (when supported).</small></span></label></div>}
      {step===2&&<div className="nexus-publish-body"><div className="nexus-publish-review"><ShieldCheck size={25}/><div><b>Ready for review</b><small>Confirm the details before sending your video to the community.</small></div></div><dl><div><dt>Project</dt><dd>{projectName}</dd></div><div><dt>Audience</dt><dd>{visibility==="public"?"Public":visibility==="followers"?"Followers only":"Only me"}</dd></div><div><dt>Comments</dt><dd>{allowComments?"Allowed":"Off"}</dd></div><div><dt>Remix</dt><dd>{allowRemix?"Allowed":"Off"}</dd></div><div><dt>Caption</dt><dd>{caption.trim()||"No caption added"}</dd></div></dl><div className="nexus-publish-blocked"><UploadCloud size={19}/><div><b>Publishing service not connected</b><small>This workflow is ready for integration, but video rendering handoff, secure upload, moderation checks and live post creation are not configured yet. Nothing will be uploaded or published from this preview.</small></div></div></div>}
      {message&&<p className="nexus-publish-message">{message}</p>}
      <footer className="nexus-publish-foot"><button className="nexus-publish-secondary" onClick={saveDraft}>{saved?"Saved on device":"Save draft"}</button><div>{step>0&&<button className="nexus-publish-secondary" onClick={()=>setStep(v=>v-1)}><ArrowLeft size={15}/> Back</button>}{step<2?<button className="nexus-publish-primary" onClick={()=>setStep(v=>v+1)}>Continue <ArrowRight size={15}/></button>:<button className="nexus-publish-primary" onClick={()=>setMessage("Publishing is not available yet. Your project and local draft are safe.")} disabled><UploadCloud size={15}/> Publish unavailable</button>}</div></footer>
    </section>
  </div>;
}
