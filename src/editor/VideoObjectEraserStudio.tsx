import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type Props = { file?: File; onApply: (file: File) => void; disabled?: boolean };
type Patch = { time: number; image: HTMLImageElement; mask: HTMLCanvasElement };
type TrackBounds = { x: number; y: number; width: number; height: number };
function getMaskBounds(mask: HTMLCanvasElement): TrackBounds | null {
 const ctx=mask.getContext("2d",{willReadFrequently:true}); if(!ctx)return null;
 const {data,width,height}=ctx.getImageData(0,0,mask.width,mask.height); let l=width,t=height,r=-1,b=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>20){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);}
 return r<l||b<t?null:{x:l,y:t,width:r-l+1,height:b-t+1};
}
function trackMarkedObject(frame:HTMLCanvasElement,template:HTMLCanvasElement,bounds:TrackBounds,previous:{x:number;y:number}) {
 const cur=frame.getContext("2d",{willReadFrequently:true})?.getImageData(0,0,frame.width,frame.height), ref=template.getContext("2d",{willReadFrequently:true})?.getImageData(0,0,template.width,template.height);
 if(!cur||!ref)return {...previous,confidence:0};
 const samples:{x:number;y:number;v:number}[]=[];
 for(let gy=0;gy<12;gy++)for(let gx=0;gx<12;gx++){const x=Math.min(frame.width-1,Math.round(bounds.x+(gx+.5)*bounds.width/12)),y=Math.min(frame.height-1,Math.round(bounds.y+(gy+.5)*bounds.height/12)),i=(y*frame.width+x)*4;samples.push({x:Math.round((gx+.5)*bounds.width/12),y:Math.round((gy+.5)*bounds.height/12),v:ref.data[i]*.299+ref.data[i+1]*.587+ref.data[i+2]*.114});}
 const radius=Math.min(72,Math.max(24,Math.round(Math.max(frame.width,frame.height)*.07))),step=Math.max(2,Math.round(radius/12)); let best={x:previous.x,y:previous.y,score:Infinity};
 for(let dy=previous.y-radius;dy<=previous.y+radius;dy+=step)for(let dx=previous.x-radius;dx<=previous.x+radius;dx+=step){let err=0,n=0;for(const p of samples){const x=bounds.x+dx+p.x,y=bounds.y+dy+p.y;if(x<0||y<0||x>=frame.width||y>=frame.height)continue;const i=(y*frame.width+x)*4,v=cur.data[i]*.299+cur.data[i+1]*.587+cur.data[i+2]*.114;err+=Math.abs(v-p.v);n++;}if(n>=48&&err/n<best.score)best={x:dx,y:dy,score:err/n};}
 return {x:best.x,y:best.y,confidence:Math.max(0,Math.min(1,1-best.score/90))};
}
function makeTrackedMask(source:HTMLCanvasElement,dx:number,dy:number){const c=document.createElement("canvas");c.width=source.width;c.height=source.height;c.getContext("2d")?.drawImage(source,dx,dy);return c;}


async function requestVideoInpaint(frame: HTMLCanvasElement, maskSource: HTMLCanvasElement, prompt: string): Promise<HTMLImageElement> {
  const width = frame.width, height = frame.height;
  const mask = document.createElement("canvas"); mask.width = width; mask.height = height;
  const context = mask.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Could not prepare the video selection.");
  context.drawImage(maskSource, 0, 0, width, height);
  const data = context.getImageData(0, 0, width, height);
  let count = 0;
  for (let i = 0; i < data.data.length; i += 4) {
    const active = data.data[i + 3] > 20;
    data.data[i] = data.data[i + 1] = data.data[i + 2] = active ? 255 : 0;
    data.data[i + 3] = 255;
    if (active) count++;
  }
  if (count < 8) throw new Error("Paint over the object before processing the video.");
  if (count > width * height * .5) throw new Error("The selection is too large. Reduce the marked area.");
  context.putImageData(data, 0, 0);
  const response = await fetch("/api/object-inpaint", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: frame.toDataURL("image/png").split(",")[1], mask: mask.toDataURL("image/png").split(",")[1], width, height, prompt })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || typeof payload?.image !== "string") throw new Error(payload?.error || "A video frame could not be reconstructed.");
  const image = new Image();
  image.src = payload.image;
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("The reconstructed frame could not be decoded.")); });
  return image;
}

export function VideoObjectEraserStudio({ file, onApply, disabled = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [brush, setBrush] = useState(34);
  const [interval, setIntervalValue] = useState(1);
  const [prompt, setPrompt] = useState("Remove the marked object and naturally reconstruct the scene behind it. Preserve the original lighting, perspective, background texture and details. Do not add new objects.");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState("");
  const [duration, setDuration] = useState(0);
  const lastPoint = useRef<{x:number;y:number}|null>(null);
  const objectUrl = useRef<string|null>(null);

  useEffect(() => {
    setReady(false); setMessage(""); setProgress("");
    if (!file || !videoRef.current) return;
    const url = URL.createObjectURL(file);
    objectUrl.current = url;
    videoRef.current.src = url;
    return () => { URL.revokeObjectURL(url); objectUrl.current = null; };
  }, [file]);

  function drawPreview() {
    const video = videoRef.current, canvas = previewRef.current, mask = maskRef.current;
    if (!video || !canvas || !mask || !video.videoWidth || video.readyState < 2) return;
    const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale)), height = Math.max(1, Math.round(video.videoHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width; canvas.height = height; mask.width = width; mask.height = height;
    }
    canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
    setReady(true);
  }

  function getPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = maskRef.current!, rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  }
  function paint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = maskRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const p = getPoint(event), previous = lastPoint.current;
    ctx.fillStyle = "rgba(255,45,115,.72)"; ctx.strokeStyle = "rgba(255,45,115,.72)";
    ctx.lineWidth = brush; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (previous) { ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(p.x, p.y, brush / 2, 0, Math.PI * 2); ctx.fill(); }
    lastPoint.current = p;
  }
  function clearMask() {
    const canvas = maskRef.current, ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setMessage("Selection cleared.");
  }

  async function processVideo() {
    const video = videoRef.current, mask = maskRef.current;
    if (!file || !video || !mask || busy || !ready) return;
    if (duration > 20) { setMessage("For this first video pass, trim the source to 20 seconds or less and try again."); return; }
    if (video.videoWidth > 1920 || video.videoHeight > 1920) { setMessage("This source is too large for reliable on-device frame processing. Try a smaller export."); return; }
    const frame = document.createElement("canvas");
    const scale = Math.min(1, 768 / Math.max(video.videoWidth, video.videoHeight));
    frame.width = Math.max(256, Math.round(video.videoWidth * scale));
    frame.height = Math.max(256, Math.round(video.videoHeight * scale));
    const frameContext = frame.getContext("2d");
    if (!frameContext) { setMessage("Canvas processing is not available in this browser."); return; }
    const maskSnapshot = document.createElement("canvas");
    maskSnapshot.width = frame.width; maskSnapshot.height = frame.height;
    maskSnapshot.getContext("2d")?.drawImage(mask, 0, 0, frame.width, frame.height);
    if (video.currentTime > .5) { setMessage("Move the playhead to 0 seconds before marking the object so tracking can follow it through the full clip."); return; }
    const patches: Patch[] = [];
    const step = Math.max(.5, interval);
    const times: number[] = [];
    for (let t = 0; t < duration; t += step) times.push(t);
    if (!times.length || times.length > 40) { setMessage("Choose a longer frame interval for this clip."); return; }
    const bounds = getMaskBounds(maskSnapshot);
    if (!bounds) { setMessage("Paint over the object before processing the video."); return; }
    const template = document.createElement("canvas"); template.width=frame.width; template.height=frame.height;
    const previousOffset = {x:0,y:0};
    setBusy(true); setMessage(""); setProgress("Preparing object tracker…");
    try {
      video.pause();
      for (let i = 0; i < times.length; i++) {
        if (Math.abs(video.currentTime - times[i]) >= 0.04) {
          video.currentTime = times[i];
          await new Promise<void>((resolve, reject) => {
            const done = () => { cleanup(); resolve(); };
            const fail = () => { cleanup(); reject(new Error("Could not seek to a video frame.")); };
            const cleanup = () => { video.removeEventListener("seeked", done); video.removeEventListener("error", fail); };
            video.addEventListener("seeked", done, { once: true }); video.addEventListener("error", fail, { once: true });
          });
        } else if (video.readyState < 2) {
          await new Promise<void>(resolve => video.addEventListener("loadeddata", () => resolve(), { once: true }));
        }
        frameContext.drawImage(video, 0, 0, frame.width, frame.height);
        let frameMask=maskSnapshot;
        if(i===0) template.getContext("2d")?.drawImage(frame,0,0);
        else { const tracked=trackMarkedObject(frame,template,bounds,previousOffset); previousOffset.x=tracked.x; previousOffset.y=tracked.y; frameMask=makeTrackedMask(maskSnapshot,tracked.x,tracked.y); setProgress("Tracking object · "+Math.round(tracked.confidence*100)+"% confidence · frame "+(i+1)+" of "+times.length); }
        if(i===0)setProgress("AI reconstruction · frame 1 of "+times.length);
        const image=await requestVideoInpaint(frame,frameMask,prompt);
        patches.push({time:times[i],image,mask:frameMask});
      }
      setProgress("Compositing the repaired video…");
      const output = document.createElement("canvas");
      const outputScale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
      output.width = Math.max(1, Math.round(video.videoWidth * outputScale));
      output.height = Math.max(1, Math.round(video.videoHeight * outputScale));
      const outputContext = output.getContext("2d");
      if (!outputContext || !("MediaRecorder" in window) || !output.captureStream) throw new Error("This browser cannot create the repaired video.");
      const patchCanvas = document.createElement("canvas"); patchCanvas.width = output.width; patchCanvas.height = output.height;
      const patchContext = patchCanvas.getContext("2d");
      if (!patchContext) throw new Error("Could not prepare the repaired frames.");
      const stream = output.captureStream(30);
      const audioStream = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
      audioStream?.getAudioTracks().forEach(track => stream.addTrack(track));
      const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(type => MediaRecorder.isTypeSupported(type)) || "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: BlobPart[] = [];
      const stopped = new Promise<void>((resolve, reject) => {
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        recorder.onerror = () => reject(new Error("The video recorder failed."));
        recorder.onstop = () => resolve();
      });
      let raf = 0;
      let active = true;
      const render = () => {
        if (!active) return;
        outputContext.drawImage(video, 0, 0, output.width, output.height);
        const t = video.currentTime;
        let index = patches.findIndex((patch, i) => t >= patch.time && (i === patches.length - 1 || t < patches[i + 1].time));
        if (index < 0) index = patches.length - 1;
        const patch = patches[index];
        patchContext.clearRect(0, 0, patchCanvas.width, patchCanvas.height);
        patchContext.drawImage(patch.image, 0, 0, patchCanvas.width, patchCanvas.height);
        patchContext.globalCompositeOperation = "destination-in";
        patchContext.filter = "blur(5px)";
        patchContext.drawImage(patch.mask, 0, 0, patchCanvas.width, patchCanvas.height);
        patchContext.filter = "none";
        patchContext.globalCompositeOperation = "source-over";
        outputContext.drawImage(patchCanvas, 0, 0);
        raf = requestAnimationFrame(render);
      };
      video.currentTime = 0;
      await new Promise<void>(resolve => { const done=()=>resolve(); video.addEventListener("seeked",done,{once:true}); });
      recorder.start(250); render();
      await video.play();
      await new Promise<void>(resolve => video.addEventListener("ended", () => resolve(), { once: true }));
      active = false; cancelAnimationFrame(raf);
      recorder.stop();
      await stopped;
      stream.getTracks().forEach(track => track.stop());
      audioStream?.getTracks().forEach(track => track.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      if (!blob.size) throw new Error("The repaired video export is empty.");
      const result = new File([blob], file.name.replace(/\.[^.]+$/, "") + "-object-removed.webm", { type: blob.type });
      onApply(result);
      setMessage("Video object removal finished. Review the new timeline clip before exporting your project.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Video object removal could not finish.");
    } finally {
      video.pause(); video.currentTime = 0; setBusy(false); setProgress("");
    }
  }

  if (!file) return <section className="nexus-video-object-eraser"><b>Video Object Removal</b><p>Select a video clip on the timeline to remove a stationary object from its footage.</p></section>;
  return <section className="nexus-video-object-eraser">
    <div className="nexus-effect-library-head"><div><b>Video Object Removal</b><small>AI frame reconstruction with automatic object tracking</small></div><span>VIDEO</span></div>
    <video ref={videoRef} playsInline preload="metadata" onLoadedMetadata={event => { setDuration(event.currentTarget.duration); event.currentTarget.currentTime = 0; }} onLoadedData={drawPreview} onSeeked={drawPreview} onTimeUpdate={drawPreview} style={{display:"none"}}/>
    <div className="nexus-video-object-preview"><canvas ref={previewRef}/><canvas ref={maskRef} onPointerDown={event=>{if(busy||disabled)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);lastPoint.current=null;paint(event);}} onPointerMove={event=>{if(event.buttons===1){event.preventDefault();paint(event);}}} onPointerUp={()=>{lastPoint.current=null;}} onPointerCancel={()=>{lastPoint.current=null;}}/><span>Start at 0s, then mark the object</span></div>
    <div className="nexus-object-controls"><button type="button" onClick={()=>{const v=videoRef.current;if(v){v.pause();v.currentTime=0;}}}>Go to start</button><button type="button" onClick={()=>{const v=videoRef.current;if(v){v.pause();v.currentTime=Math.max(0,v.currentTime-.5);}}}>−0.5s</button><button type="button" onClick={()=>{const v=videoRef.current;if(v){v.pause();v.currentTime=Math.min(duration,v.currentTime+.5);}}}>＋0.5s</button><button type="button" onClick={clearMask}>Clear mask</button></div>
    <label className="nexus-object-brush">Brush size <b>{brush}px</b><input type="range" min="8" max="100" value={brush} onChange={event=>setBrush(Number(event.target.value))}/></label>
    <label className="nexus-object-brush">AI frame interval <b>{interval}s</b><input type="range" min=".5" max="2" step=".5" value={interval} onChange={event=>setIntervalValue(Number(event.target.value))}/></label>
    <label className="nexus-object-prompt">Reconstruction guidance <textarea rows={2} maxLength={500} value={prompt} onChange={event=>setPrompt(event.target.value)}/></label>
    <button type="button" className="nexus-object-apply" disabled={!ready||busy||disabled} onClick={()=>void processVideo()}>{busy?"Processing video…":"✦ Remove object from video"}</button>
    {progress&&<small role="status">{progress}</small>}
    <small className="nexus-object-note">Automatic tracking follows the marked region between sampled frames using visual patch matching. Keep the object visible at the start and avoid abrupt cuts or heavy occlusion; tracking confidence is approximate and complex motion may need a new pass. Keep clips to 20 seconds or less for this pass. AI processing requires internet and the configured service.</small>
    {message&&<small role="status">{message}</small>}
  </section>;
}
