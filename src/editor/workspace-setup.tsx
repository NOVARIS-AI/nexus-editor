import { useEffect, useState } from "react";
import { CheckCircle2, HardDrive, LoaderCircle, RefreshCw, Sparkles, Wifi, XCircle, AudioLines, Image, Film, Layers, Palette, AudioWaveform, Download } from "lucide-react";
import { pipeline } from "@huggingface/transformers";
import { checkNexusWorker, getEngineStatus } from "./engine-jobs";
import { getBrowserEngineHealth } from "./engine-registry";
import { detectEngineStack } from "./engine-runtime";

const MODEL_ID = "onnx-community/whisper-tiny.en";
type SetupState = "preparing" | "downloading" | "ready" | "failed";
type ResourceState = "pending" | "working" | "ready" | "fallback" | "failed";
type Resource = { id:string; title:string; detail:string; state:ResourceState; progress?:number };
type Props = { onComplete: () => void; onSkip: () => void };
const initialResources:Resource[] = [
 {id:"director",title:"NEXUS AI Director",detail:"Checking AI Director availability",state:"pending"},
 {id:"image",title:"Image creation & graphics",detail:"Checking image and design features",state:"pending"},
 {id:"video",title:"Video creation",detail:"Checking video creation and editing features",state:"pending"},
 {id:"editing",title:"Editing, effects & motion",detail:"Preparing the editing workspace",state:"pending"},
 {id:"audio",title:"Audio intelligence & processing",detail:"Preparing audio and sound tools",state:"pending"},
 {id:"export",title:"Rendering & export",detail:"Checking video export support",state:"pending"},
 {id:"speech",title:"Offline speech recognition",detail:"Preparing speech recognition for offline use",state:"pending"}
];
const stateLabel=(state:ResourceState)=>({pending:"Waiting",working:"Preparing",ready:"Ready",fallback:"Available",failed:"Needs attention"}[state]);
const iconFor=(id:string)=>id==="speech"?<AudioLines/>:id==="director"?<Sparkles/>:id==="image"?<Image/>:id==="video"?<Film/>:id==="editing"?<Layers/>:id==="audio"?<AudioWaveform/>:id==="export"?<Download/>:<Palette/>;

export function WorkspaceSetup({ onComplete, onSkip }: Props) {
 const [state,setState]=useState<SetupState>("preparing");
 const [progress,setProgress]=useState(0);
 const [detail,setDetail]=useState("Checking this device and preparing the NEXUS creative engine system…");
 const [error,setError]=useState("");
 const [storage,setStorage]=useState("Checking available storage…");
 const [attempt,setAttempt]=useState(0);
 const [resources,setResources]=useState<Resource[]>(initialResources);
 const fallbackCount=resources.filter(item=>item.state==="fallback").length;

 useEffect(()=>{
  if(!navigator.storage?.estimate){setStorage("Storage estimate unavailable");return;}
  navigator.storage.estimate().then(estimate=>{
   const free=Math.max(0,(estimate.quota||0)-(estimate.usage||0));
   setStorage(free?"Browser storage available · "+(free/1024/1024/1024).toFixed(1)+" GB estimated":"Storage estimate unavailable");
  }).catch(()=>setStorage("Storage estimate unavailable"));
 },[]);

 useEffect(()=>{
  let active=true;
  const update=(id:string,patch:Partial<Resource>)=>setResources(current=>current.map(item=>item.id===id?{...item,...patch}:item));
  const run=async()=>{
   setState("preparing");setProgress(0);setError("");setResources(initialResources);
   const mark=(id:string,patch:Partial<Resource>)=>{if(active)update(id,patch);};
   try{
    setDetail("Preparing editing, design and audio features…");
    const browserHealth=getBrowserEngineHealth();
    const stack=detectEngineStack();
    const editing=browserHealth.find(item=>item.id==="editing");
    const graphics=browserHealth.find(item=>item.id==="graphics");
    const audio=browserHealth.find(item=>item.id==="audio");
    const exporting=browserHealth.find(item=>item.id==="export");
    mark("editing",{state:editing?.ready?"ready":"fallback",detail:"Editing tools are ready."});
    mark("audio",{state:audio?.ready?"ready":"fallback",detail:"Audio tools are ready."});
    mark("export",{state:exporting?.ready?"ready":"fallback",detail:"Export tools are available."});
    mark("image",{state:graphics?.ready?"ready":"fallback",detail:"Image and poster design tools are available."});
    mark("video",{state:"fallback",detail:"Timeline editing and scene creation tools are available."});
    setProgress(12);

    setDetail("Checking AI Director and creative features…");
    mark("director",{state:"working",detail:"Checking AI Director…"});
    try{
     const [health,status]=await Promise.all([checkNexusWorker(),getEngineStatus()]);
     if(!active)return;
     const brainReady=!!status.brain?.configured;
     mark("director",{state:brainReady?"ready":"fallback",detail:brainReady?"AI Director is ready.":"Creative planning tools are available in basic mode."});
     for(const engineId of ["image","video","audio"] as const){
      const item=status.engines?.[engineId];
      if(item?.configured)mark(engineId,{state:"ready",detail:"This creative feature is ready."});
      else if(engineId==="image")mark(engineId,{state:"fallback",detail:"Image and poster design tools are ready."});
      else if(engineId==="video")mark(engineId,{state:"fallback",detail:"Timeline editing and scene tools are ready."});
      else mark(engineId,{state:"fallback",detail:"Audio editing and sound tools are ready."});
     }
     if(!health.ok){mark("director",{state:brainReady?"ready":"fallback",detail:"Some online creative features are unavailable. Your editing tools remain ready."});}
    }catch(cause){
     const message="Creative feature status could not be checked.";
     mark("director",{state:"fallback",detail:"Creative planning remains available in basic mode."});
     mark("image",{state:"fallback",detail:"Image and poster design tools remain available."});
     mark("video",{state:"fallback",detail:"Timeline editing and scene tools remain available."});
    }
    if(!active)return;
    setProgress(28);

    setDetail("Preparing offline speech recognition…");
    mark("speech",{state:"working",detail:"Preparing offline speech recognition",progress:0});
    setState("downloading");
    await pipeline("automatic-speech-recognition",MODEL_ID,{
     device:"wasm",dtype:"q8",
     progress_callback:(event:{status?:string;file?:string;progress?:number})=>{
      if(!active)return;
      if(typeof event.progress==="number"){const p=Math.max(0,Math.min(100,event.progress));mark("speech",{progress:Math.round(p)});setProgress(28+Math.round(p*.72));}
      if(event.status==="progress")mark("speech",{detail:"Preparing offline speech recognition"});
      if(event.status==="ready")mark("speech",{detail:"Offline speech recognition is ready."});
     }
    });
    if(!active)return;
    mark("speech",{state:"ready",progress:100,detail:"Ready for offline speech recognition."});
    setProgress(100);setState("ready");
    setDetail("Your workspace is ready to use.");
    localStorage.setItem("nexus-workspace-models",JSON.stringify({whisperTiny:"ready",updatedAt:Date.now()}));
   }catch(cause){
    if(!active)return;
    const message="Speech recognition could not be prepared. You can still use the editor and try again later.";
    setError(message);setState("failed");
    setDetail("The editor is still available. You can retry setup later.");
    mark("speech",{state:"failed",detail:message});
    localStorage.setItem("nexus-workspace-models",JSON.stringify({whisperTiny:"failed",error:message,updatedAt:Date.now()}));
   }
  };
  void run();
  return()=>{active=false;};
 },[attempt]);

 const retry=()=>setAttempt(value=>value+1);
 const done=state==="ready";
 const failed=state==="failed";
 return <div className="nexus-setup-backdrop" role="dialog" aria-modal="true" aria-labelledby="nexus-setup-title">
  <section className="nexus-setup-card nexus-engine-setup-card">
   <div className="nexus-setup-brand"><span className="nexus-setup-logo">N</span><span><b>NEXUS</b><small>CREATIVE WORKSPACE</small></span><span className="nexus-setup-tag">FIRST-TIME SETUP</span></div>
   <div className="nexus-setup-orbit"><div/><div/><Sparkles size={28}/></div>
   <p className="nexus-setup-eyebrow">NEXUS WORKSPACE SETUP</p>
   <h1 id="nexus-setup-title">Setting up your workspace<span>…</span></h1>
   <p className="nexus-setup-copy">NEXUS is preparing AI Director, editing, design, audio and offline speech features. You can continue editing if an optional feature is unavailable.</p>
   <div className="nexus-setup-progress-head"><span>{done?"Workspace setup complete":failed?"A resource needs attention":state==="preparing"?"Preparing creative features":"Preparing offline features"}</span><b>{failed?"—":progress+"%"}</b></div>
   <div className="nexus-setup-progress"><i style={{width:progress+"%"}}/></div>
   <div className="nexus-engine-resource-list">{resources.map(item=><div className={"nexus-setup-resource nexus-engine-resource "+(item.state==="ready"?"is-ready":item.state==="failed"?"is-failed":item.state==="fallback"?"is-fallback":"")} key={item.id}>
    <span className="nexus-setup-resource-icon">{item.state==="ready"?<CheckCircle2/>:item.state==="failed"?<XCircle/>:item.state==="working"?<LoaderCircle className="nexus-spin"/>:iconFor(item.id)}</span>
    <span><b>{item.title}</b><small>{stateLabel(item.state)} · {item.detail}</small>{item.id==="speech"&&item.progress!==undefined&&<i className="nexus-engine-mini-progress"><i style={{width:item.progress+"%"}}/></i>}</span>
    {item.state==="ready"&&<CheckCircle2 className="nexus-setup-check"/>}
   </div>)}</div>
   {error&&<div className="nexus-setup-error"><b>Speech setup didn't finish</b><span>{error}</span><small>You can continue using the editor and retry setup later.</small></div>}
   <div className="nexus-setup-storage"><HardDrive size={15}/><span>{storage}</span><Wifi size={15}/><span>Internet connection needed during first setup</span></div>
   <div className="nexus-setup-actions">
    {done?<button className="nexus-setup-primary" onClick={onComplete}>Enter NEXUS workspace <Sparkles size={16}/></button>:failed?<><button className="nexus-setup-primary" onClick={retry}><RefreshCw size={16}/> Retry setup</button><button className="nexus-setup-skip" onClick={onSkip}>Skip setup and continue testing</button></>:<button className="nexus-setup-skip" onClick={onSkip}>Skip for now</button>}
   </div>
   <p className="nexus-setup-footnote">{fallbackCount?fallbackCount+" feature(s) are using basic mode. ":""}If setup is skipped or interrupted, projects and editing tools remain accessible. Retry later from Settings.</p>
  </section>
 </div>;
}
