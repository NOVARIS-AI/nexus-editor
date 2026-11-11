import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type Props = { file?: File; onApply: (file: File) => void; disabled?: boolean };

async function generativeFill(file: File, maskCanvas: HTMLCanvasElement, prompt: string): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(256, Math.round(bitmap.width * scale));
    const height = Math.max(256, Math.round(bitmap.height * scale));
    const source = document.createElement("canvas");
    source.width = width; source.height = height;
    const sourceContext = source.getContext("2d");
    if (!sourceContext) throw new Error("This browser cannot prepare the photo for AI reconstruction.");
    sourceContext.drawImage(bitmap, 0, 0, width, height);
    const mask = document.createElement("canvas");
    mask.width = width; mask.height = height;
    const maskContext = mask.getContext("2d", { willReadFrequently: true });
    if (!maskContext) throw new Error("This browser cannot prepare the object selection.");
    maskContext.drawImage(maskCanvas, 0, 0, width, height);
    const pixels = maskContext.getImageData(0, 0, width, height);
    let selected = 0;
    for (let i = 0; i < pixels.data.length; i += 4) {
      const active = pixels.data[i + 3] > 20;
      pixels.data[i] = active ? 255 : 0;
      pixels.data[i + 1] = active ? 255 : 0;
      pixels.data[i + 2] = active ? 255 : 0;
      pixels.data[i + 3] = 255;
      if (active) selected++;
    }
    if (selected < 8) throw new Error("Brush over the object you want to remove first.");
    if (selected > width * height * .55) throw new Error("The selection is too large for one reconstruction. Reduce the marked area.");
    maskContext.putImageData(pixels, 0, 0);
    const imageData = source.toDataURL("image/png").split(",")[1];
    const maskData = mask.toDataURL("image/png").split(",")[1];
    const response = await fetch("/api/object-inpaint", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageData, mask: maskData, width, height, prompt })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || typeof payload?.image !== "string") throw new Error(payload?.error || "Generative reconstruction could not complete. Try Local Smart Fill.");
    const generated = await createImageBitmap(await (await fetch(payload.image)).blob());
    try {
      const output = document.createElement("canvas");
      output.width = bitmap.width; output.height = bitmap.height;
      const outputContext = output.getContext("2d");
      if (!outputContext) throw new Error("Could not prepare the reconstructed photo.");
      outputContext.drawImage(generated, 0, 0, output.width, output.height);
      const blob = await new Promise<Blob>((resolve, reject) => output.toBlob(value => value ? resolve(value) : reject(new Error("Could not export the reconstructed photo.")), "image/png"));
      return new File([blob], file.name.replace(/\\.[^.]+$/, "") + "-ai-object-removed.png", { type: "image/png" });
    } finally { generated.close(); }
  } finally { bitmap.close(); }
}

async function smartFill(file: File, maskCanvas: HTMLCanvasElement, feather: number): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const source = document.createElement("canvas");
    source.width = width; source.height = height;
    const ctx = source.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Image editing is not supported in this browser.");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height);
    const mask = document.createElement("canvas");
    mask.width = width; mask.height = height;
    const maskCtx = mask.getContext("2d", { willReadFrequently: true });
    if (!maskCtx) throw new Error("Could not read the object selection.");
    maskCtx.drawImage(maskCanvas, 0, 0, width, height);
    if (feather > 0) {
      const softened = document.createElement("canvas");
      softened.width = width; softened.height = height;
      const softCtx = softened.getContext("2d");
      if (softCtx) {
        softCtx.filter = "blur(" + Math.max(0, Math.min(24, feather * scale)) + "px)";
        softCtx.drawImage(mask, 0, 0);
        maskCtx.clearRect(0, 0, width, height);
        maskCtx.filter = "none";
        maskCtx.drawImage(softened, 0, 0);
      }
    }
    const maskPixels = maskCtx.getImageData(0, 0, width, height).data;
    const total = width * height;
    const marked = new Uint8Array(total);
    const filled = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0, tail = 0, markedCount = 0;
    for (let i = 0; i < total; i++) if (maskPixels[i * 4 + 3] > 24) { marked[i] = 1; markedCount++; }
    if (markedCount < 8) throw new Error("Brush over the object you want to remove first.");
    if (markedCount > total * .62) throw new Error("That selection is too large. Use a smaller brush area for a cleaner reconstruction.");
    const isInside = (x:number,y:number) => x >= 0 && x < width && y >= 0 && y < height;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!marked[i]) continue;
      let boundary = false;
      for (let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
        if(!dx&&!dy)continue;
        const nx=x+dx,ny=y+dy;
        if(isInside(nx,ny)&&!marked[ny*width+nx])boundary=true;
      }
      if (boundary) { filled[i] = 1; queue[tail++] = i; }
    }
    let headEnd = 0;
    while (head < tail) {
      const currentEnd = tail;
      for (; head < currentEnd; head++) {
        const i = queue[head], x = i % width, y = Math.floor(i / width);
        let r=0,g=0,b=0,w=0;
        for (let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
          if(!dx&&!dy)continue;
          const nx=x+dx,ny=y+dy;
          if(!isInside(nx,ny))continue;
          const ni=ny*width+nx;
          if(marked[ni]&&!filled[ni])continue;
          const weight = dx !== 0 && dy !== 0 ? 0.7 : 1;
          r+=pixels.data[ni*4]*weight;g+=pixels.data[ni*4+1]*weight;b+=pixels.data[ni*4+2]*weight;w+=weight;
        }
        if(w){pixels.data[i*4]=r/w;pixels.data[i*4+1]=g/w;pixels.data[i*4+2]=b/w;pixels.data[i*4+3]=255;}
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          if(!dx&&!dy)continue;
          const nx=x+dx,ny=y+dy;
          if(!isInside(nx,ny))continue;
          const ni=ny*width+nx;
          if(marked[ni]&&!filled[ni]){filled[ni]=1;queue[tail++]=ni;}
        }
      }
      if(tail===currentEnd)break;
      if(++headEnd>Math.max(width,height)+2)break;
    }
    const output = document.createElement("canvas");
    output.width=width; output.height=height;
    const out=output.getContext("2d");
    if (!out) throw new Error("Could not prepare the reconstructed image.");
    out.putImageData(pixels,0,0);
    const blob=await new Promise<Blob>((resolve,reject)=>output.toBlob(v=>v?resolve(v):reject(new Error("Could not export the repaired image.")),"image/png"));
    return new File([blob],file.name.replace(/\.[^.]+$/,"")+"-object-erased.png",{type:"image/png"});
  } finally { bitmap.close(); }
}

export function ObjectEraserStudio({ file, onApply, disabled=false }: Props) {
  const imageRef=useRef<HTMLImageElement>(null);
  const maskRef=useRef<HTMLCanvasElement>(null);
  const [brush,setBrush]=useState(26);
  const [feather,setFeather]=useState(6);
  const [prompt,setPrompt]=useState("Seamlessly reconstruct the original background where the selected object was removed. Preserve the scene, lighting, perspective, textures and surrounding details. Do not add a new object.");
  const [mode,setMode]=useState<"erase"|"restore">("erase");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [history,setHistory]=useState<ImageData[]>([]);
  const [ready,setReady]=useState(false);
  const lastPoint=useRef<{x:number;y:number}|null>(null);
  useEffect(()=>{
    setReady(false); setHistory([]); setMessage("");
    const image=imageRef.current, mask=maskRef.current;
    if (!file || !image || !mask) return;
    const url=URL.createObjectURL(file);
    image.src=url;
    image.onload=()=>{
      const ratio=image.naturalWidth/image.naturalHeight;
      const w=Math.max(1,Math.round(Math.min(720,mask.parentElement?.clientWidth||720)));
      const h=Math.max(1,Math.round(w/ratio));
      mask.width=w; mask.height=h;
      mask.getContext("2d")?.clearRect(0,0,w,h);
      setReady(true);
    };
    return ()=>URL.revokeObjectURL(url);
  },[file]);
  function snapshot(){
    const c=maskRef.current,ctx=c?.getContext("2d");
    if(c&&ctx)setHistory(old=>[...old.slice(-19),ctx.getImageData(0,0,c.width,c.height)]);
  }
  function point(event:ReactPointerEvent<HTMLCanvasElement>){
    const canvas=maskRef.current!,rect=canvas.getBoundingClientRect();
    return {x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};
  }
  function stroke(event:ReactPointerEvent<HTMLCanvasElement>){
    const canvas=maskRef.current,ctx=canvas?.getContext("2d");
    if(!canvas||!ctx)return;
    const p=point(event), previous=lastPoint.current;
    ctx.globalCompositeOperation=mode==="erase"?"source-over":"destination-out";
    ctx.fillStyle="rgba(255,50,120,.72)";
    ctx.strokeStyle="rgba(255,50,120,.72)";
    ctx.lineWidth=brush;ctx.lineCap="round";ctx.lineJoin="round";
    if(previous){ctx.beginPath();ctx.moveTo(previous.x,previous.y);ctx.lineTo(p.x,p.y);ctx.stroke();}
    else {ctx.beginPath();ctx.arc(p.x,p.y,brush/2,0,Math.PI*2);ctx.fill();}
    lastPoint.current=p;
  }
  function start(event:ReactPointerEvent<HTMLCanvasElement>){
    if(busy||disabled)return;
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);snapshot();lastPoint.current=null;stroke(event);
  }
  function move(event:ReactPointerEvent<HTMLCanvasElement>){if(event.buttons===1){event.preventDefault();stroke(event);}}
  async function applyGenerative(){
    if(!file||!maskRef.current||busy)return;
    setBusy(true);setMessage("AI is reconstructing the selected area. This may take a little while…");
    try{const result=await generativeFill(file,maskRef.current,prompt);onApply(result);setMessage("AI reconstruction complete. The generated photo has replaced the selected still.");}
    catch(error){setMessage(error instanceof Error?error.message:"AI reconstruction could not finish.");}
    finally{setBusy(false);}
  }
  async function applyLocal(){
    if(!file||!maskRef.current||busy)return;
    setBusy(true);setMessage("Running local Smart Fill…");
    try{const result=await smartFill(file,maskRef.current,feather);onApply(result);setMessage("Local Smart Fill complete. The repaired image has replaced the selected still.");}
    catch(error){setMessage(error instanceof Error?error.message:"Local reconstruction could not finish.");}
    finally{setBusy(false);}
  }
  const undo=()=>{const c=maskRef.current,ctx=c?.getContext("2d"),last=history[history.length-1];if(!c||!ctx||!last)return;ctx.putImageData(last,0,0);setHistory(old=>old.slice(0,-1));};
  const clear=()=>{const c=maskRef.current,ctx=c?.getContext("2d");if(!c||!ctx)return;snapshot();ctx.clearRect(0,0,c.width,c.height);setMessage("Selection cleared.");};
  if(!file)return <section className="nexus-object-eraser"><b>Object Eraser · Smart Fill</b><p>Select an imported photo or image layer on the timeline first. Video frames are not supported in this tool yet.</p></section>;
  return <section className="nexus-object-eraser">
    <div className="nexus-effect-library-head"><div><b>Object Eraser · Smart Fill</b><small>Paint over an unwanted object, then reconstruct the area</small></div><span>STILL IMAGE</span></div>
    <p>Brush over the object, including its shadow if needed. Use Restore to tidy the selection. Best for small areas and simple backgrounds; detailed scenes may need manual touch-up.</p>
    <div className="nexus-object-canvas" style={{aspectRatio:imageRef.current?.naturalWidth&&imageRef.current?.naturalHeight?String(imageRef.current.naturalWidth)+"/"+String(imageRef.current.naturalHeight):"4/3"}}>
      <img ref={imageRef} alt="Selected photo for object removal"/>
      <canvas ref={maskRef} onPointerDown={start} onPointerMove={move} onPointerUp={()=>{lastPoint.current=null;}} onPointerCancel={()=>{lastPoint.current=null;}}/>
      {!ready&&<span>Loading selected photo…</span>}
    </div>
    <div className="nexus-object-controls">
      <button type="button" className={mode==="erase"?"active":""} onClick={()=>setMode("erase")}>＋ Mark object</button>
      <button type="button" className={mode==="restore"?"active":""} onClick={()=>setMode("restore")}>− Restore</button>
      <button type="button" onClick={undo} disabled={!history.length}>Undo stroke</button>
      <button type="button" onClick={clear}>Clear</button>
    </div>
    <label className="nexus-object-brush">Brush size <b>{brush}px</b><input type="range" min="8" max="100" value={brush} onChange={e=>setBrush(Number(e.target.value))}/></label>
    <label className="nexus-object-brush">Edge feather <b>{feather}px</b><input type="range" min="0" max="24" value={feather} onChange={e=>setFeather(Number(e.target.value))}/></label>
    <label className="nexus-object-prompt">Reconstruction guidance <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={2} maxLength={500} placeholder="Describe what should naturally appear behind the removed object"/></label>
    <button type="button" className="nexus-object-apply" disabled={!ready||busy||disabled} onClick={()=>void applyGenerative()}>{busy?"Reconstructing…":"✦ AI Generative Object Removal"}</button>
    <button type="button" className="nexus-object-local" disabled={!ready||busy||disabled} onClick={()=>void applyLocal()}>Use local Smart Fill instead</button>
    <small className="nexus-object-note">AI reconstruction needs the configured Cloudflare AI service and an internet connection. Generative fill creates a plausible replacement; it cannot know exactly what was hidden behind an object. Large selections may alter nearby details.</small>
    {message&&<small role="status">{message}</small>}
  </section>;
}
