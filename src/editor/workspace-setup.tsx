import { useEffect, useState } from "react";
import { CheckCircle2, HardDrive, LoaderCircle, RefreshCw, Sparkles, Wifi, XCircle, AudioLines, Image, Film, Layers, Palette, AudioWaveform } from "lucide-react";
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
 {id:"director",title:"NEXUS AI Director",detail:"Checking the NEXUS intelligence connection",state:"pending"},
 {id:"image",title:"Image creation & graphics",detail:"Checking the NEXUS image engine and local graphics fallback",state:"pending"},
 {id:"video",title:"Video creation",detail:"Checking the NEXUS video engine and editable-scene fallback",state:"pending"},
 {id:"editing",title:"Editing, effects & motion",detail:"Preparing browser timeline, graphics and compositing engines",state:"pending"},
 {id:"audio",title:"Audio intelligence & processing",detail:"Preparing local audio processing and analysis",state:"pending"},
 {id:"export",title:"Rendering & export",detail:"Checking browser encoding and export capabilities",state:"pending"},
 {id:"speech",title:"Offline speech intelligence",detail:"Whisper Tiny · English · quantised browser model",state:"pending"}
];
const stateLabel=(state:ResourceState)=>({pending:"Waiting",working:"Preparing",ready:"Ready",fallback:"Fallback ready",failed:"Needs attention"}[state]);
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
    setDetail("Detecting device capabilities and activating local creative engines…");
    const browserHealth=getBrowserEngineHealth();
    const stack=detectEngineStack();
    const editing=browserHealth.find(item=>item.id==="editing");
    const graphics=browserHealth.find(item=>item.id==="graphics");
    const audio=browserHealth.find(item=>item.id==="audio");
    const exporting=browserHealth.find(item=>item.id==="export");
    mark("editing",{state:editing?.ready?"ready":"fallback",detail:stack.editing.active+" · "+stack.graphics.active});
    mark("audio",{state:audio?.ready?"ready":"fallback",detail:stack.audio.active});
    mark("export",{state:exporting?.ready?"ready":"fallback",detail:exporting?.note||"Browser export fallback available"});
    mark("image",{state:graphics?.ready?"ready":"fallback",detail:"Local image/poster editing: "+(graphics?.active||"SVG/Canvas fallback")+". AI generation uses the NEXUS worker when configured."});
    mark("video",{state:"fallback",detail:"Editable timeline scenes and image-to-motion fallback are available; model-generated video requires the NEXUS worker."});
    setProgress(12);

    setDetail("Checking the NEXUS AI Director and managed generation engines…");
    mark("director",{state:"working",detail:"Checking AI Director and model-worker configuration…"});
    try{
     const [health,status]=await Promise.all([checkNexusWorker(),getEngineStatus()]);
     if(!active)return;
     const brainReady=!!status.brain?.configured;
     mark("director",{state:brainReady?"ready":"fallback",detail:brainReady?"AI Director connected · "+(status.brain.model||"configured model"):"AI Director is not configured; local intent planning remains available."});
     for(const engineId of ["image","video","audio"] as const){
      const item=status.engines?.[engineId];
      if(item?.configured)mark(engineId,{state:"ready",detail:"NEXUS managed engine connected · "+item.provider});
      else if(engineId==="image")mark(engineId,{state:"fallback",detail:"NEXUS image worker not configured; local SVG/Canvas image editing is ready."});
      else if(engineId==="video")mark(engineId,{state:"fallback",detail:"NEXUS video worker not configured; editable native timeline scenes remain available."});
      else mark(engineId,{state:"fallback",detail:"NEXUS audio worker not configured; local Web Audio processing remains available."});
     }
     if(!health.ok){mark("director",{state:brainReady?"ready":"fallback",detail:(brainReady?"AI Director configured. ":"")+ "Generation worker unreachable; using local/browser fallbacks. "+health.message});}
    }catch(cause){
     const message=cause instanceof Error?cause.message:"Engine status check failed.";
     mark("director",{state:"fallback",detail:"Remote intelligence status unavailable; local creative planning remains available. "+message});
     mark("image",{state:"fallback",detail:"Worker status unavailable; local graphics fallback remains ready."});
     mark("video",{state:"fallback",detail:"Worker status unavailable; editable scene fallback remains ready."});
    }
    if(!active)return;
    setProgress(28);

    setDetail("Downloading and caching the offline speech model…");
    mark("speech",{state:"working",detail:"Downloading Whisper Tiny · English · browser cache",progress:0});
    setState("downloading");
    await pipeline("automatic-speech-recognition",MODEL_ID,{
     device:"wasm",dtype:"q8",
     progress_callback:(event:{status?:string;file?:string;progress?:number})=>{
      if(!active)return;
      if(typeof event.progress==="number"){const p=Math.max(0,Math.min(100,event.progress));mark("speech",{progress:Math.round(p)});setProgress(28+Math.round(p*.72));}
      if(event.status==="progress"&&event.file)mark("speech",{detail:"Downloading "+event.file.split("/").pop()});
      if(event.status==="ready")mark("speech",{detail:"Offline speech model loaded and cached."});
     }
    });
    if(!active)return;
    mark("speech",{state:"ready",progress:100,detail:"Whisper Tiny cached for offline English speech recognition."});
    setProgress(100);setState("ready");
    setDetail("Offline speech model cached. NEXUS creative engines are ready or have a working fallback.");
    localStorage.setItem("nexus-workspace-models",JSON.stringify({whisperTiny:"ready",updatedAt:Date.now()}));
   }catch(cause){
    if(!active)return;
    const message=cause instanceof Error?cause.message:"A required offline resource could not be prepared.";
    setError(message);setState("failed");
    setDetail("The editor can still open. Failed resources will use their available fallbacks.");
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
   <p className="nexus-setup-eyebrow">NEXUS CREATIVE ENGINE SYSTEM</p>
   <h1 id="nexus-setup-title">Setting up your workspace<span>…</span></h1>
   <p className="nexus-setup-copy">NEXUS is preparing its AI Director, creative engines, local editing tools and required offline models. Remote engines are checked automatically; local fallbacks keep the editor usable if a service is unavailable.</p>
   <div className="nexus-setup-progress-head"><span>{done?"Workspace setup complete":failed?"A resource needs attention":state==="preparing"?"Preparing creative engines":"Downloading offline AI resources"}</span><b>{failed?"—":progress+"%"}</b></div>
   <div className="nexus-setup-progress"><i style={{width:progress+"%"}}/></div>
   <div className="nexus-engine-resource-list">{resources.map(item=><div className={"nexus-setup-resource nexus-engine-resource "+(item.state==="ready"?"is-ready":item.state==="failed"?"is-failed":item.state==="fallback"?"is-fallback":"")} key={item.id}>
    <span className="nexus-setup-resource-icon">{item.state==="ready"?<CheckCircle2/>:item.state==="failed"?<XCircle/>:item.state==="working"?<LoaderCircle className="nexus-spin"/>:iconFor(item.id)}</span>
    <span><b>{item.title}</b><small>{stateLabel(item.state)} · {item.detail}</small>{item.id==="speech"&&item.progress!==undefined&&<i className="nexus-engine-mini-progress"><i style={{width:item.progress+"%"}}/></i>}</span>
    {item.state==="ready"&&<CheckCircle2 className="nexus-setup-check"/>}
   </div>)}</div>
   {error&&<div className="nexus-setup-error"><b>Offline model download didn't finish</b><span>{error}</span><small>You can skip setup and continue testing. Other engines will use their available fallbacks.</small></div>}
   <div className="nexus-setup-storage"><HardDrive size={15}/><span>{storage}</span><Wifi size={15}/><span>Internet needed for first model download</span></div>
   <div className="nexus-setup-actions">
    {done?<button className="nexus-setup-primary" onClick={onComplete}>Enter NEXUS workspace <Sparkles size={16}/></button>:failed?<><button className="nexus-setup-primary" onClick={retry}><RefreshCw size={16}/> Retry setup</button><button className="nexus-setup-skip" onClick={onSkip}>Skip setup and continue testing</button></>:<button className="nexus-setup-skip" onClick={onSkip}>Skip for now</button>}
   </div>
   <p className="nexus-setup-footnote">{fallbackCount?fallbackCount+" engine(s) are using fallbacks. ":""}If setup is skipped or interrupted, projects and editing tools remain accessible. Retry later from Settings.</p>
  </section>
 </div>;
}
