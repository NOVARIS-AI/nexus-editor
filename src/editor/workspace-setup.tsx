import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, HardDrive, LoaderCircle, RefreshCw, Sparkles, Wifi, XCircle } from "lucide-react";
import { pipeline } from "@huggingface/transformers";

const MODEL_ID = "onnx-community/whisper-tiny.en";
type SetupState = "preparing" | "downloading" | "ready" | "failed";
type Props = { onComplete: () => void; onSkip: () => void };

export function WorkspaceSetup({ onComplete, onSkip }: Props) {
  const [state, setState] = useState<SetupState>("preparing");
  const [progress, setProgress] = useState(0);
  const [detail, setDetail] = useState("Checking this device and preparing the offline speech engine…");
  const [error, setError] = useState("");
  const [storage, setStorage] = useState<string>("Checking available storage…");
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(estimate => {
        if (!mounted.current) return;
        const free = Math.max(0, (estimate.quota || 0) - (estimate.usage || 0));
        setStorage(free ? "Browser storage available · " + (free / 1024 / 1024 / 1024).toFixed(1) + " GB estimated" : "Storage estimate unavailable");
      }).catch(() => setStorage("Storage estimate unavailable"));
    } else setStorage("Storage estimate unavailable");
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setState("preparing"); setProgress(0); setError("");
      setDetail("Preparing NEXUS offline speech intelligence…");
      try {
        setState("downloading");
        setDetail("Downloading and caching Whisper Tiny · English · offline speech recognition");
        await pipeline("automatic-speech-recognition", MODEL_ID, {
          device: "wasm",
          dtype: "q8",
          progress_callback: (event: { status?: string; file?: string; progress?: number; loaded?: number; total?: number }) => {
            if (!active) return;
            const percent = typeof event.progress === "number" ? Math.max(0, Math.min(100, event.progress)) : undefined;
            if (percent !== undefined) setProgress(Math.round(percent));
            if (event.status === "progress" && event.file) setDetail("Preparing " + event.file.split("/").pop());
            else if (event.status === "done") setDetail("A model file is ready · preparing the local runtime…");
            else if (event.status === "ready") setDetail("Offline speech engine is ready.");
          }
        });
        if (!active) return;
        setProgress(100); setState("ready"); setDetail("Your offline speech engine is installed and cached on this device.");
        localStorage.setItem("nexus-workspace-models", JSON.stringify({ whisperTiny: "ready", updatedAt: Date.now() }));
      } catch (cause) {
        if (!active) return;
        const message = cause instanceof Error ? cause.message : "The model download could not be completed.";
        setError(message); setState("failed");
        setDetail("NEXUS can still open. The offline speech engine will use its fallback until setup succeeds.");
        localStorage.setItem("nexus-workspace-models", JSON.stringify({ whisperTiny: "failed", error: message, updatedAt: Date.now() }));
      }
    };
    void run();
    return () => { active = false; };
  }, [attempt]);

  const retry = () => setAttempt(value => value + 1);
  return <div className="nexus-setup-backdrop" role="dialog" aria-modal="true" aria-labelledby="nexus-setup-title">
    <section className="nexus-setup-card">
      <div className="nexus-setup-brand"><span className="nexus-setup-logo">N</span><span><b>NEXUS</b><small>CREATIVE WORKSPACE</small></span><span className="nexus-setup-tag">FIRST-TIME SETUP</span></div>
      <div className="nexus-setup-orbit"><div/><div/><Sparkles size={28}/></div>
      <p className="nexus-setup-eyebrow">LET'S PREPARE YOUR CREATIVE SPACE</p>
      <h1 id="nexus-setup-title">Setting up your workspace<span>…</span></h1>
      <p className="nexus-setup-copy">NEXUS is preparing the tools it needs and installing its offline AI resources. This happens automatically, so you don't have to find models yourself.</p>
      <div className="nexus-setup-progress-head"><span>{state==="ready"?"Setup resource ready":state==="failed"?"Resource needs attention":state==="preparing"?"Preparing workspace":"Downloading AI resources"}</span><b>{state==="failed"?"—":progress+"%"}</b></div>
      <div className="nexus-setup-progress"><i style={{width:progress+"%"}}/></div>
      <div className={"nexus-setup-resource "+(state==="ready"?"is-ready":state==="failed"?"is-failed":"")}>
        <span className="nexus-setup-resource-icon">{state==="ready"?<CheckCircle2/>:state==="failed"?<XCircle/>:state==="downloading"?<Download/>:<LoaderCircle className="nexus-spin"/>}</span>
        <span><b>Offline speech intelligence</b><small>Whisper Tiny · quantised · browser cached</small><small>{detail}</small></span>
        {state==="ready"&&<CheckCircle2 className="nexus-setup-check"/>}
      </div>
      {error&&<div className="nexus-setup-error"><b>Download didn't finish</b><span>{error}</span><small>You can skip setup and continue testing. NEXUS will keep the rest of the editor available.</small></div>}
      <div className="nexus-setup-storage"><HardDrive size={15}/><span>{storage}</span><Wifi size={15}/><span>Internet needed for first download</span></div>
      <div className="nexus-setup-actions">
        {state==="ready"?<button className="nexus-setup-primary" onClick={onComplete}>Enter NEXUS workspace <Sparkles size={16}/></button>:state==="failed"?<><button className="nexus-setup-primary" onClick={retry}><RefreshCw size={16}/> Retry download</button><button className="nexus-setup-skip" onClick={onSkip}>Skip setup and continue testing</button></>:<button className="nexus-setup-skip" onClick={onSkip}>Skip for now</button>}
      </div>
      <p className="nexus-setup-footnote">If setup is skipped or interrupted, you can retry it later in Settings. Your projects and editing tools remain accessible.</p>
    </section>
  </div>;
}
