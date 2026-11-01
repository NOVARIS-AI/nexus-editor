import { useMemo, useRef, useState } from "react";
import { Download, Film, FolderOpen, Music2, Play, Plus, Scissors, Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import type { MediaAsset, TimelineClip } from "./types";
import { clipDuration, defaultTracks, downloadProject, makeProject, parseProject, timelineDuration } from "./project";

const id = () => crypto.randomUUID();
const time = (n: number) => {
  const m = Math.floor(n / 60), s = Math.floor(n % 60);
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
};

export default function App() {
  const [projectName, setProjectName] = useState("Untitled Project");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [status, setStatus] = useState("Ready — import media to begin");
  const input = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const selectedClip = clips.find(c => c.id === selected);
  const asset = assets.find(a => a.id === selectedClip?.assetId);
  const duration = useMemo(() => timelineDuration(clips), [clips]);
  const project = { ...makeProject(projectName), clips, assets: assets.map(({file,objectUrl,...a}) => a) };

  function importMedia(files: FileList | null) {
    if (!files) return;
    const added: MediaAsset[] = Array.from(files).filter(f => /^(video|audio|image)\//.test(f.type)).map(file => ({
      id:id(), name:file.name, kind:file.type.startsWith("video/")?"video":file.type.startsWith("audio/")?"audio":"image",
      duration:file.type.startsWith("image/")?5:0, mimeType:file.type, file, objectUrl:URL.createObjectURL(file)
    }));
    setAssets(old => [...old,...added]);
    added.forEach(a => {
      if (a.kind !== "image") {
        const probe = document.createElement(a.kind);
        probe.preload = "metadata"; probe.src = a.objectUrl!;
        probe.onloadedmetadata = () => setAssets(old => old.map(x => x.id===a.id ? {...x,duration:Number.isFinite(probe.duration)?probe.duration:5} : x));
      }
    });
    setStatus(`${added.length} media file(s) imported`);
  }
  function add(a: MediaAsset) {
    const c: TimelineClip = {id:id(),assetId:a.id,trackId:a.kind==="audio"?"audio-1":"video-1",start:timelineDuration(clips),sourceIn:0,sourceOut:a.duration||5,label:a.name};
    setClips(old=>[...old,c]); setSelected(c.id); setPlayhead(c.start); setStatus("Added to timeline");
    if (a.kind==="video" && video.current) video.current.src=a.objectUrl!;
  }
  function split() {
    if (!selectedClip) return;
    const at = selectedClip.sourceIn + playhead - selectedClip.start;
    if (at <= selectedClip.sourceIn+.04 || at >= selectedClip.sourceOut-.04) {setStatus("Place playhead inside the clip to split");return;}
    const right = {...selectedClip,id:id(),start:playhead,sourceIn:at,label:selectedClip.label+" (split)"};
    setClips(old=>[...old.map(c=>c.id===selected?{...c,sourceOut:at}:c),right]);setSelected(right.id);setStatus("Clip split");
  }
  async function openProject(file?: File) {
    if (!file) return;
    try { const p=parseProject(await file.text());setProjectName(p.name);setClips(p.clips);setStatus("Project opened — re-import source media to relink assets"); }
    catch {setStatus("Could not open this project file");}
  }
  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="brand-icon">N</div><div><b>NEXUS <span>EDITOR</span></b><small>VELTRONIX NEXUS · FOUNDATION PREVIEW</small></div></div>
      <input className="project-name" value={projectName} onChange={e=>setProjectName(e.target.value)} aria-label="Project name"/>
      <div className="actions">
        <button onClick={()=>projectInput.current?.click()}><FolderOpen size={16}/> Open</button>
        <button onClick={()=>downloadProject(project,assets)}><Download size={16}/> Save project</button>
        <button className="primary" onClick={()=>setStatus("Full multi-track export is coming in a later build")}><Download size={16}/> Export</button>
      </div>
      <input ref={projectInput} hidden type="file" accept=".nexusproj,.json" onChange={e=>openProject(e.target.files?.[0])}/>
    </header>
    <main className="workspace">
      <aside className="panel library">
        <div className="section-title"><small>01 / PROJECT</small><h2>Media library</h2></div>
        <button className="import" onClick={()=>input.current?.click()}><Upload/><b>Import media</b><span>Video, audio and images</span></button>
        <input ref={input} hidden type="file" multiple accept="video/*,audio/*,image/*" onChange={e=>importMedia(e.target.files)}/>
        <div className="asset-list">{assets.map(a=><div className="asset" key={a.id}>
          <span className="asset-icon">{a.kind==="audio"?<Music2/>:a.kind==="image"?<ImageIcon/>:<Film/>}</span>
          <div className="asset-name"><b>{a.name}</b><small>{a.kind.toUpperCase()} · {a.duration?time(a.duration):"Reading…"}</small></div>
          <button className="small" onClick={()=>add(a)} aria-label="Add to timeline"><Plus size={17}/></button>
        </div>)}{!assets.length&&<p className="empty">Your imported files will appear here.</p>}</div>
      </aside>
      <section className="panel monitor">
        <div className="section-title"><small>02 / CANVAS</small><h2>Preview monitor</h2></div>
        <div className="preview">
          {asset?.kind==="video"&&asset.objectUrl?<video ref={video} src={asset.objectUrl} controls playsInline/>:
           asset?.kind==="image"&&asset.objectUrl?<img src={asset.objectUrl} alt="Media preview"/>:
           <div className="placeholder"><div className="orb">N</div><b>Your creative space</b><span>Import media and add it to the timeline to begin</span></div>}
        </div>
        <div className="transport"><button onClick={()=>{if(video.current){video.current.currentTime=Math.max(0,video.current.currentTime-1);setPlayhead(Math.max(0,playhead-1));}}}>−1s</button><button className="play" onClick={()=>video.current?.play()}><Play size={17}/></button><button onClick={()=>{if(video.current){video.current.currentTime+=1;setPlayhead(playhead+1);}}}>+1s</button><b>{time(playhead)} / {time(duration)}</b></div>
        <div className="tools"><button onClick={split}><Scissors/> Split clip</button><button onClick={()=>{setClips(old=>old.filter(c=>c.id!==selected));setSelected(null);setStatus("Clip removed");}}><Trash2/> Delete clip</button></div>
      </section>
      <aside className="panel inspector">
        <div className="section-title"><small>03 / CONTROLS</small><h2>Inspector</h2></div>
        {selectedClip?<><div className="selected-card"><small>SELECTED CLIP</small><b>{selectedClip.label}</b><span>{asset?.kind.toUpperCase()} · {time(clipDuration(selectedClip))}</span></div>
          <label>Clip start · {time(selectedClip.start)}</label><input type="range" min="0" max={Math.max(duration,1)} step=".1" value={selectedClip.start} onChange={e=>setClips(old=>old.map(c=>c.id===selected?{...c,start:Number(e.target.value)}:c))}/>
          <label>Source in · {time(selectedClip.sourceIn)}</label><input type="range" min="0" max={Math.max(asset?.duration||1,1)} step=".1" value={selectedClip.sourceIn} onChange={e=>setClips(old=>old.map(c=>c.id===selected?{...c,sourceIn:Number(e.target.value)}:c))}/>
          <label>Source out · {time(selectedClip.sourceOut)}</label><input type="range" min={selectedClip.sourceIn} max={Math.max(asset?.duration||1,1)} step=".1" value={Math.min(selectedClip.sourceOut,asset?.duration||selectedClip.sourceOut)} onChange={e=>setClips(old=>old.map(c=>c.id===selected?{...c,sourceOut:Number(e.target.value)}:c))}/>
          <p className="note">Non-destructive editing keeps your original media unchanged.</p></>:<p className="empty">Select a timeline clip to inspect its properties.</p>}
        <div className="settings"><small>PROJECT SETTINGS</small><p>1920 × 1080 · 30 FPS</p><p>Project format · .nexusproj</p></div>
      </aside>
    </main>
    <section className="panel timeline">
      <div className="timeline-head"><div><small>04 / EDITING</small><h2>Timeline</h2></div><button onClick={()=>{setClips([]);setSelected(null);}}>Clear timeline</button></div>
      <div className="tracks">
        <div className="track-labels">{defaultTracks.map(t=><div key={t.id}>{t.name}</div>)}</div>
        <div className="track-content">{defaultTracks.map(t=><div className="track-row" key={t.id}>{clips.filter(c=>c.trackId===t.id).map(c=><button key={c.id} className={selected===c.id?"clip selected":"clip"} style={{left:c.start*65,width:Math.max(70,clipDuration(c)*65)}} onClick={()=>{setSelected(c.id);setPlayhead(c.start);const a=assets.find(x=>x.id===c.assetId);if(a?.kind==="video"&&video.current)video.current.src=a.objectUrl||"";}}>{c.label}</button>)}</div>)}
          <div className="playhead" style={{left:playhead*65}}/>
          <input aria-label="Timeline playhead" className="seek" type="range" min="0" max={Math.max(duration,1)} step=".1" value={Math.min(playhead,Math.max(duration,1))} onChange={e=>setPlayhead(Number(e.target.value))}/>
        </div>
      </div>
      <div className="status">{status}</div>
    </section>
    <footer>© VELTRONIX NEXUS <span>NEXUS EDITOR · FOUNDATION BUILD</span></footer>
  </div>;
}