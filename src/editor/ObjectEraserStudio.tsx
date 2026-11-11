import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type Props = { file?: File; onApply: (file: File) => void; disabled?: boolean };

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
  async function apply(){
    if(!file||!maskRef.current||busy)return;
    setBusy(true);setMessage("Reconstructing the selected area…");
    try{const result=await smartFill(file,maskRef.current,feather);onApply(result);setMessage("Object removed. The repaired image has replaced the selected still.");}
    catch(error){setMessage(error instanceof Error?error.message:"The selected area could not be reconstructed.");}
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
    <button type="button" className="nexus-object-apply" disabled={!ready||busy||disabled} onClick={()=>void apply()}>{busy?"Reconstructing…":"✦ Remove object & Smart Fill"}</button>
    <small className="nexus-object-note">Runs locally on this device. This is patch-based reconstruction, not generative AI: it blends nearby pixels for simple textures, but cannot know what was hidden behind a large object or perfectly recreate a covered face.</small>
    {message&&<small role="status">{message}</small>}
  </section>;
}
