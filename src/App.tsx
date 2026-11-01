import { useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Bell, Check, ChevronDown, Clapperboard,
  Cloud, Command, Compass, Film, Folder, FolderOpen, Grid2X2, HelpCircle,
  Home, Image as ImageIcon, Layers, Music2, Play, Plus, Search, Settings,
  SlidersHorizontal, Sparkles, Scissors, Trash2, Upload, WandSparkles, X,
  Volume2, Crop, Type, Captions, Sticker, ImagePlus, Gauge, Share2, CheckCircle2, RotateCcw, Palette, AudioLines
} from "lucide-react";
import type { MediaAsset, TimelineClip } from "./types";
import { clipDuration, defaultTracks, downloadProject, makeProject, parseProject, timelineDuration } from "./project";

type Page = "home" | "editor" | "projects" | "templates" | "ai" | "settings";
const uid = () => crypto.randomUUID();
const themes = [
  { id: "violet", name: "Midnight Violet", colors: ["#a923ed", "#5d42ff", "#00bfe9"] },
  { id: "ocean", name: "Ocean Blue", colors: ["#168cff", "#2855e8", "#20d5e8"] },
  { id: "emerald", name: "Emerald Green", colors: ["#10b981", "#087f69", "#7ee6b7"] },
  { id: "sunset", name: "Sunset Orange", colors: ["#ff8a32", "#e34b38", "#ffc15c"] },
  { id: "rose", name: "Rose Pink", colors: ["#f04486", "#bd347d", "#ff9ab8"] },
  { id: "crimson", name: "Crimson Red", colors: ["#ef4444", "#b91c3c", "#ff8b73"] }
] as const;
const clock = (n: number) => {
  const m = Math.floor(n / 60), s = Math.floor(n % 60);
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
};

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [projectName, setProjectName] = useState("Untitled Project");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [clips, setClips] = useState<TimelineClip[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [status, setStatus] = useState("Your creative space is ready");
  const [editorTool, setEditorTool] = useState("Media");
  const [editorView, setEditorView] = useState("workspace");
  const [activeTool, setActiveTool] = useState("edit");
  const [activeSubtool, setActiveSubtool] = useState("select");
  const [overlayText, setOverlayText] = useState("Your text");
  const [textSize, setTextSize] = useState(32);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textFont, setTextFont] = useState("Arial");
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [muteClip, setMuteClip] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [exportQuality, setExportQuality] = useState("1080p");
  const [exportFps, setExportFps] = useState("30 FPS");
  const [search, setSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState("All");
  const [aiBrief, setAiBrief] = useState("");
  const [aiFiles, setAiFiles] = useState<File[]>([]);
  const [aiStyle, setAiStyle] = useState("Cinematic");
  const [aiFormat, setAiFormat] = useState("9:16");
  const [aiMode, setAiMode] = useState("create");
  const [aiWorkspaceOpen, setAiWorkspaceOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("nexus-editor-theme") || "violet");
  function changeTheme(id: string) { setTheme(id); localStorage.setItem("nexus-editor-theme", id); }
  const mediaInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const filesInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const selectedClip = clips.find(c => c.id === selected);
  const asset = assets.find(a => a.id === selectedClip?.assetId);
  const duration = useMemo(() => timelineDuration(clips), [clips]);
  const project = { ...makeProject(projectName), clips, assets: assets.map(({ file, objectUrl, ...a }) => a) };

  function importMedia(files: FileList | null) {
    if (!files) return;
    const added: MediaAsset[] = Array.from(files).filter(f => /^(video|audio|image)\//.test(f.type)).map(file => ({
      id: uid(), name: file.name,
      kind: file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image",
      duration: file.type.startsWith("image/") ? 5 : 0, mimeType: file.type,
      file, objectUrl: URL.createObjectURL(file)
    }));
    setAssets(old => [...old, ...added]);
    added.forEach(a => {
      if (a.kind !== "image") {
        const probe = document.createElement(a.kind);
        probe.preload = "metadata"; probe.src = a.objectUrl!;
        probe.onloadedmetadata = () => setAssets(old => old.map(x => x.id === a.id ? { ...x, duration: Number.isFinite(probe.duration) ? probe.duration : 5 } : x));
      }
    });
    setStatus(added.length + " media file(s) imported");
  }
  function add(a: MediaAsset) {
    const c: TimelineClip = { id: uid(), assetId: a.id, trackId: a.kind === "audio" ? "audio-1" : "video-1", start: timelineDuration(clips), sourceIn: 0, sourceOut: a.duration || 5, label: a.name };
    setClips(old => [...old, c]); setSelected(c.id); setPlayhead(c.start); setStatus("Added to timeline");
    if (a.kind === "video" && video.current) video.current.src = a.objectUrl!;
    setPage("editor");
  }
  function split() {
    if (!selectedClip) return;
    const at = selectedClip.sourceIn + playhead - selectedClip.start;
    if (at <= selectedClip.sourceIn + .04 || at >= selectedClip.sourceOut - .04) { setStatus("Place the playhead inside the clip to split"); return; }
    const right = { ...selectedClip, id: uid(), start: playhead, sourceIn: at, label: selectedClip.label + " (split)" };
    setClips(old => [...old.map(c => c.id === selected ? { ...c, sourceOut: at } : c), right]);
    setSelected(right.id); setStatus("Clip split successfully");
  }
  async function openProject(file?: File) {
    if (!file) return;
    try {
      const p = parseProject(await file.text());
      setProjectName(p.name); setClips(p.clips); setStatus("Project opened — re-import source media to relink assets"); setPage("editor");
    } catch { setStatus("Could not open this project file"); }
  }
  const nav = [
    { id: "home" as Page, label: "Home", icon: Home },
    { id: "editor" as Page, label: "Editor", icon: Clapperboard },
    { id: "projects" as Page, label: "Projects", icon: Folder },
    { id: "templates" as Page, label: "Templates", icon: Grid2X2 },
    { id: "settings" as Page, label: "Settings", icon: Settings }
  ];
  const pageTitle = nav.find(n => n.id === page)?.label || "Home";
  const recent = ["My Vlog Edit", "Tech Review", "Birthday Bash"];
  const templates = [
    { name: "Travel Stories", type: "Lifestyle", color: "travel", length: "00:30" },
    { name: "Gaming Zone", type: "Gaming", color: "gaming", length: "00:20" },
    { name: "Business Pro", type: "Business", color: "business", length: "00:15" },
    { name: "Birthday Moments", type: "Lifestyle", color: "birthday", length: "00:25" },
    { name: "Neon Nights", type: "Gaming", color: "neon", length: "00:18" },
    { name: "Product Story", type: "Business", color: "product", length: "00:30" }
  ];
  const filteredTemplates = templates.filter(t => (templateCategory === "All" || t.type === templateCategory) && t.name.toLowerCase().includes(search.toLowerCase()));

  return <div className={darkMode ? "nexus-shell" : "nexus-shell light"} data-theme={theme}>
    <aside className="sidebar">
      <button className="brand-lockup" onClick={() => setPage("home")}><span className="brand-mark">N</span><span className="brand-words">NEXUS<strong>EDITOR</strong></span></button>
      <div className="side-caption">WORKSPACE</div>
      <nav>{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={page === item.id ? "nav-item active" : "nav-item"} onClick={() => { if(item.id === "ai"){setPage("editor");setAiWorkspaceOpen(true);}else{setPage(item.id);setAiWorkspaceOpen(false);} }}><Icon size={18}/><span>{item.label}</span>{item.id === "ai" && <i>NEW</i>}</button>; })}</nav>
      <div className="sidebar-bottom">
        <div className="cloud-card"><Cloud size={19}/><b>Your workspace</b><span>Projects saved on this device</span><div className="cloud-meter"><i/></div><small>Local storage · Ready</small></div>
        <button className="profile-row" onClick={() => setPage("settings")}><span className="avatar">N</span><span><b>Creator workspace</b><small>Personal account</small></span><ChevronDown size={15}/></button>
      </div>
    </aside>

    <main className="main-area">
      <header className="top-header">
        <div className="mobile-brand"><span className="brand-mark">N</span><b>NEXUS EDITOR</b></div>
        <div className="crumb"><span>Workspace</span><b>/</b><strong>{pageTitle}</strong></div>
        <label className="global-search"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects, templates..."/><kbd>⌘ K</kbd></label>
        <button className="icon-button" aria-label="Notifications" onClick={() => setStatus("You're all caught up")}><Bell size={18}/><i/></button>
        <button className="avatar top-avatar" onClick={() => setPage("settings")}>N</button>
      </header>

      {page === "home" && <section className="page-content">
        <div className="welcome-line"><div><div className="eyebrow">YOUR CREATIVE WORKSPACE</div><h1>Welcome back, Creator <span>✦</span></h1><p>Ready to turn your next idea into something incredible?</p></div><button className="outline-button" onClick={() => projectInput.current?.click()}><FolderOpen size={16}/> Open project</button></div>
        <div className="hero-banner"><div className="hero-copy"><span className="hero-tag"><Sparkles size={13}/> THE CREATIVE PLAYGROUND</span><h2>Edit smarter.<br/>Create <em>bigger.</em></h2><p>Everything you need to bring your vision to life, in one place.</p><button className="gradient-button" onClick={() => setPage("editor")}>Start creating <ArrowDownToLine size={16}/></button></div><div className="hero-art"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-clapper"><div/><span>▶</span></div><div className="hero-glow"/></div></div>
        <div className="quick-grid">
          <button className="quick-card" onClick={() => { setProjectName("Untitled Project"); setClips([]); setAssets([]); setPage("editor"); }}><span className="quick-icon purple"><Plus/></span><b>New project</b><small>Start from scratch</small></button>
          <button className="quick-card" onClick={() => setPage("templates")}><span className="quick-icon cyan"><Grid2X2/></span><b>Explore templates</b><small>Find your style</small></button>
          <button className="quick-card" onClick={() => {setPage("editor");setAiWorkspaceOpen(true);}}><span className="quick-icon violet"><WandSparkles/></span><b>AI Studio</b><small>Creative assistance</small></button>
          <button className="quick-card" onClick={() => setPage("projects")}><span className="quick-icon amber"><Folder/></span><b>My projects</b><small>Your creations</small></button>
        </div>
        <div className="section-heading"><div><h2>Recent projects</h2><p>Pick up where you left off</p></div><button className="text-link" onClick={() => setPage("projects")}>View all <span>→</span></button></div>
        <div className="recent-grid">{recent.map((name, i) => <button className="recent-card" key={name} onClick={() => { setProjectName(name); setPage("editor"); }}><div className={"recent-art art-" + i}><span>{i === 0 ? "VLOG / 01" : i === 1 ? "TECH / 02" : "MOMENTS / 03"}</span><b>{i === 0 ? "Make it a story." : i === 1 ? "Ideas in motion." : "Keep the moment."}</b></div><div className="recent-info"><span><b>{name}</b><small>{i === 0 ? "Edited recently" : i === 1 ? "Yesterday" : "2 days ago"}</small></span><span className="more-dots">•••</span></div></button>)}</div>
      </section>}

      {page === "editor" && <section className="editor-fullscreen">
        <header className="editor-topbar">
          <button className="editor-back" onClick={()=>{setPage("home");setEditorView("workspace");}}><ArrowLeft size={18}/><span>NEXUS</span></button>
          <div className="editor-project-title"><b>{projectName}</b><small>{editorView==="workspace"?"Editing workspace":editorView==="import"?"Media library":"Export project"}</small></div>
          <button className="editor-top-icon ai-editor-trigger" onClick={()=>setAiWorkspaceOpen(v=>!v)} title="Open NEXUS AI"><Sparkles size={18}/><span>AI</span></button><button className="editor-top-icon" onClick={()=>downloadProject(project,assets)} title="Save project"><Check size={18}/></button>
          <button className="editor-export-entry" onClick={()=>setEditorView("export")}><ArrowDownToLine size={16}/><span>Export</span></button>
        </header>
        <input ref={mediaInput} hidden type="file" accept="image/*,video/*" multiple onChange={e=>{importMedia(e.target.files);setEditorView("workspace");setShowAttachmentPicker(false);e.currentTarget.value="";}}/>
        <input ref={audioInput} hidden type="file" accept="audio/*" multiple onChange={e=>{importMedia(e.target.files);setEditorView("workspace");setShowAttachmentPicker(false);e.currentTarget.value="";}}/>
        <input ref={filesInput} hidden type="file" multiple onChange={e=>{importMedia(e.target.files);setEditorView("workspace");setShowAttachmentPicker(false);e.currentTarget.value="";}}/>
        {showAttachmentPicker && <div className="attachment-backdrop" onClick={()=>setShowAttachmentPicker(false)}>
          <section className="attachment-sheet" role="dialog" aria-modal="true" aria-label="Add media" onClick={e=>e.stopPropagation()}>
            <div className="attachment-sheet-handle"/>
            <div className="attachment-sheet-heading"><div><b>Add to your project</b><small>Choose media from your device</small></div><button onClick={()=>setShowAttachmentPicker(false)} aria-label="Close"><X size={19}/></button></div>
            <div className="attachment-options">
              <button onClick={()=>mediaInput.current?.click()}><span className="attachment-option-icon photos"><ImageIcon size={23}/></span><b>Photos & Videos</b><small>Open your gallery</small></button>
              <button onClick={()=>audioInput.current?.click()}><span className="attachment-option-icon audio"><Music2 size={23}/></span><b>Audio</b><small>Choose music or sound</small></button>
              <button onClick={()=>filesInput.current?.click()}><span className="attachment-option-icon files"><FolderOpen size={23}/></span><b>Browse files</b><small>Choose from device storage</small></button>
            </div>
          </section>
        </div>}
        {editorView==="workspace" && <div className="editor-screen">
          <div className="editor-preview-zone">
            <div className="editor-preview-meta"><span>PREVIEW</span><div className="preview-meta-actions"><button onClick={()=>setShowAttachmentPicker(true)} className="preview-add-media"><Plus size={14}/> Add media</button><button onClick={()=>{setActiveTool("adjust");setActiveSubtool("Position");}}><SlidersHorizontal size={14}/> Adjust</button></div></div>
            <div className={"editor-preview-frame ratio-frame ratio-"+aspectRatio.replace(":","-")}>
              {asset?.kind==="video"&&asset.objectUrl?<video ref={video} src={asset.objectUrl} controls playsInline muted={muteClip}/>:asset?.kind==="image"&&asset.objectUrl?<img src={asset.objectUrl} alt="Selected media preview"/>:<div className="editor-preview-empty"><div className="preview-n">N</div><b>Your story starts here</b><small>Import media to begin editing</small><button onClick={()=>setShowAttachmentPicker(true)}><Plus size={16}/> Import media</button></div>}
              {activeTool==="text" && <div className="nexus-text-overlay" style={{fontSize:textSize,color:textColor,fontFamily:textFont}}>{overlayText || "Type your text"}</div>}
            </div>
            <div className="editor-transport"><button onClick={()=>{if(video.current){video.current.currentTime=Math.max(0,video.current.currentTime-1);setPlayhead(Math.max(0,playhead-1));}}}>−1s</button><button className="editor-play" onClick={()=>{if(video.current){if(video.current.paused)void video.current.play();else video.current.pause();}}}><Play size={17} fill="currentColor"/></button><button onClick={()=>{if(video.current){video.current.currentTime+=1;setPlayhead(video.current.currentTime);}}}>+1s</button><span>{clock(playhead)} / {clock(duration)}</span></div>
          </div>
          <div className="editor-timeline-zone">
            <div className="editor-timeline-head"><div><b>Timeline</b><small>{clips.length} clips · {clock(duration)}</small></div><div className="editor-timeline-actions"><button onClick={split} title="Split"><Scissors size={16}/></button><button disabled={!selectedClip} onClick={()=>{setClips(old=>old.filter(c=>c.id!==selected));setSelected(null);setStatus("Clip deleted");}} title="Delete"><Trash2 size={16}/></button><button onClick={()=>setStatus("Undo history is planned for the editing-engine phase.")} title="Undo"><ArrowLeft size={16}/></button><button onClick={()=>setStatus("Redo history is planned for the editing-engine phase.")} title="Redo"><Command size={16}/></button></div></div>
            <div className="editor-timeline-scroll"><div className="editor-timeline-ruler"><span>00:00</span><span>00:05</span><span>00:10</span><span>00:15</span><span>00:20</span></div>
              <div className="editor-timeline-rows"><div className="editor-lane-labels"><span>V1 <small>Video</small></span><span>V2 <small>Overlay</small></span><span>T1 <small>Text</small></span><span className="audio-lane-label">A1 <small>Audio</small><button onClick={()=>audioInput.current?.click()} aria-label="Add audio"><Plus size={13}/></button></span></div><div className="editor-lanes"><div className="editor-lanes-inner">
                {["video-1","overlay-1","text-1","audio-1"].map((id,i)=><div className="editor-lane" key={id}>{clips.filter(c=>c.trackId===id).map(c=><button key={c.id} className={selected===c.id?"editor-clip active":"editor-clip"} style={{left:c.start*50,width:Math.max(70,clipDuration(c)*50)}} onClick={()=>{setSelected(c.id);setPlayhead(c.start);const a=assets.find(x=>x.id===c.assetId);if(a?.kind==="video"&&video.current)video.current.src=a.objectUrl||"";}}>{c.label}</button>)}{i===2&&<small className="empty-lane-note">Text layers</small>}</div>)}
                <div className="editor-playhead" style={{left:playhead*50}}/><input aria-label="Timeline playhead" className="editor-timeline-scrub" type="range" min="0" max={Math.max(duration,1)} step=".1" value={Math.min(playhead,Math.max(duration,1))} onChange={e=>setPlayhead(Number(e.target.value))}/>
              </div></div></div>
            </div>
          </div>
          <div className="editor-bottom-tools nexus-tool-stack">
            <div className="nexus-subtool-ribbon">
              {activeTool==="edit" && <>{[["select","Select"],["split","Split"],["volume","Mute clip"],["speed","Speed"],["animation","Animation"],["cover","Cover"],["delete","Delete"]].map(([id,label])=><button key={id} className={activeSubtool===id?"active":""} onClick={()=>{setActiveSubtool(id);if(id==="split")split();if(id==="volume")setMuteClip(v=>!v);if(id==="delete"&&selectedClip){setClips(old=>old.filter(c=>c.id!==selected));setSelected(null);}if(["speed","animation","cover"].includes(id))setStatus(label+" controls are not connected to the render engine yet.");}}>{label}</button>)}</>}
              {activeTool==="audio" && <>{[["sounds","Sounds"],["extract","Extract"],["voiceover","Voiceover"],["effects","Effects"],["fade","Fade"],["volume","Volume"]].map(([id,label])=><button key={id} onClick={()=>{setActiveSubtool(id);if(id==="sounds"||id==="extract")audioInput.current?.click();else setStatus(label+" controls selected.");}}>{label}</button>)}</>}
              {activeTool==="text" && <>{[["add","Add text"],["font","Fonts"],["style","Style"],["animation","Animation"],["align","Align"],["captions","Auto captions"]].map(([id,label])=><button key={id} className={activeSubtool===id?"active":""} onClick={()=>{setActiveSubtool(id);if(id==="add"){setOverlayText("Your text");setStatus("Text added to preview.");}else if(id==="captions")setStatus("Auto captions need speech recognition and caption-layer support.");}}>{label}</button>)}</>}
              {activeTool==="overlay" && <>{["Add overlay","Mask","Blend","Position","Opacity"].map(x=><button key={x} onClick={()=>{setActiveSubtool(x);if(x==="Add overlay")setShowAttachmentPicker(true);else setStatus(x+" controls selected.");}}>{x}</button>)}</>}
              {activeTool==="effects" && <>{["Video effects","Body effects","Transitions","Keyframes"].map(x=><button key={x} onClick={()=>{setActiveSubtool(x);setStatus(x+" selected; effect rendering is not connected yet.");}}>{x}</button>)}</>}
              {activeTool==="captions" && <>{["Auto captions","Manual captions","Caption style","Language"].map(x=><button key={x} onClick={()=>{setActiveSubtool(x);setStatus(x+" selected.");}}>{x}</button>)}</>}
              {activeTool==="filters" && <>{["Original","Cinematic","Vintage","Warm","Cool","B&W"].map(x=><button key={x} onClick={()=>{setActiveSubtool(x);setStatus(x+" filter selected; live filter rendering is pending.");}}>{x}</button>)}</>}
              {activeTool==="adjust" && <>{["Brightness","Contrast","Saturation","Exposure","Temperature","HSL"].map(x=><button key={x} onClick={()=>{setActiveSubtool(x);setStatus(x+" adjustment selected.");}}>{x}</button>)}</>}
              {activeTool==="media" && <><button onClick={()=>setShowAttachmentPicker(true)}>＋ Add media</button><button onClick={()=>setEditorView("import")}>Media library</button></>}
              {activeTool==="stickers" && <>{["Emoji","Stickers","Shapes","Import"].map(x=><button key={x} onClick={()=>{setActiveSubtool(x);if(x==="Import")setShowAttachmentPicker(true);else setStatus(x+" browser selected.");}}>{x}</button>)}</>}
              {activeTool==="background" && <>{["Color","Blur","Canvas"].map(x=><button key={x} onClick={()=>{setActiveSubtool(x);setStatus(x+" background controls selected.");}}>{x}</button>)}</>}
              {activeTool==="ratio" && <>{["9:16","16:9","1:1","4:5","3:4"].map(x=><button key={x} className={aspectRatio===x?"active":""} onClick={()=>setAspectRatio(x)}>{x}</button>)}</>}
            </div>
            {activeTool==="text" && <div className="nexus-context-controls"><input aria-label="Edit preview text" value={overlayText} onChange={e=>setOverlayText(e.target.value)} placeholder="Type text"/><select aria-label="Font" value={textFont} onChange={e=>setTextFont(e.target.value)}><option>Arial</option><option>Georgia</option><option>Impact</option><option>Courier New</option></select><label>Size <input type="range" min="12" max="72" value={textSize} onChange={e=>setTextSize(Number(e.target.value))}/></label><input aria-label="Text colour" type="color" value={textColor} onChange={e=>setTextColor(e.target.value)}/></div>}
            {activeTool==="adjust" && <div className="nexus-context-controls"><label>{activeSubtool}<input type="range" min="0" max="200" defaultValue="100"/></label></div>}
            {activeTool==="edit" && selectedClip && <div className="nexus-context-controls"><button onClick={split}><Scissors size={15}/> Split at playhead</button><button className={muteClip?"active":""} onClick={()=>setMuteClip(v=>!v)}><Volume2 size={15}/> {muteClip?"Unmute":"Mute clip"}</button><button onClick={()=>setStatus("Clip trim handles are not yet connected.")}>Trim</button></div>}
            <nav className="editor-tool-dock" aria-label="Editing tools">{[{id:"edit",label:"Edit",icon:Scissors},{id:"audio",label:"Audio",icon:Music2},{id:"text",label:"Text",icon:Type},{id:"overlay",label:"Overlay",icon:Layers},{id:"effects",label:"Effects",icon:WandSparkles},{id:"captions",label:"Captions",icon:Captions},{id:"filters",label:"Filters",icon:SlidersHorizontal},{id:"adjust",label:"Adjust",icon:Palette},{id:"media",label:"Media",icon:Film},{id:"stickers",label:"Stickers",icon:Sticker},{id:"background",label:"Background",icon:ImageIcon},{id:"ratio",label:"Ratio",icon:Crop}].map(item=>{const Icon=item.icon;return <button key={item.id} className={activeTool===item.id?"active":""} onClick={()=>{setActiveTool(item.id);setActiveSubtool(item.id==="edit"?"select":"");if(item.id==="media")setShowAttachmentPicker(true);}}><Icon size={19}/><span>{item.label}</span></button>;})}</nav>
          </div>
          <div className="editor-status-line"><i/>{status}</div>
        </div>}
        {editorView==="import" && <div className="editor-subpage"><div className="editor-subpage-title"><button onClick={()=>setEditorView("workspace")}><ArrowLeft size={18}/></button><div><h2>Import media</h2><p>Add videos, photos and audio to this project.</p></div></div><button className="huge-import-zone" onClick={()=>setShowAttachmentPicker(true)}><Plus size={38}/><b>Choose from gallery</b><span>Open your phone gallery to select photos and videos</span><small>Photos · Videos · Audio · Files</small></button><div className="imported-media-list"><h3>Imported media ({assets.length})</h3>{assets.map(a=><div key={a.id}><span>{a.kind==="audio"?<Music2/>:a.kind==="image"?<ImageIcon/>:<Film/>}</span><b>{a.name}</b><small>{a.kind.toUpperCase()} · {a.duration?clock(a.duration):"Reading…"}</small><button onClick={()=>{add(a);setEditorView("workspace");}}><Plus size={16}/> Add</button></div>)}</div></div>}
        {editorView==="export" && <div className="editor-subpage export-subpage"><div className="editor-subpage-title"><button onClick={()=>setEditorView("workspace")}><ArrowLeft size={18}/></button><div><h2>Export video</h2><p>Choose the quality and format for your finished video.</p></div></div><div className="export-center-layout"><div className="export-completion-card"><div className="export-big-icon"><Film size={32}/></div><h3>Ready to export</h3><p>{projectName} · {clock(duration)} · {clips.length} clips</p><div className="export-summary-row"><span>Resolution</span><b>{exportQuality}</b></div><div className="export-summary-row"><span>Frame rate</span><b>{exportFps}</b></div><div className="export-summary-row"><span>Aspect ratio</span><b>{aspectRatio}</b></div><button className="export-render-button" onClick={()=>setStatus("Video rendering is not implemented yet. No video has been saved or exported.")}><ArrowDownToLine size={18}/> Export video</button><small>Rendering is still being built. Export and sharing will activate when the video engine is ready.</small></div><div className="export-options-panel"><h3>Export options</h3><label>Video quality<select value={exportQuality} onChange={e=>setExportQuality(e.target.value)}><option>720p</option><option>1080p</option><option>2K</option><option>4K Ultra HD</option></select></label><label>Frame rate<select value={exportFps} onChange={e=>setExportFps(e.target.value)}><option>24 FPS</option><option>30 FPS</option><option>60 FPS</option></select></label><button className="export-quick-action" onClick={()=>setStatus("Speed controls are available from the clip editing tools in a later phase.")}><Gauge size={18}/> Adjust speed</button><h3>Share destinations</h3><div className="export-share-grid">{["TikTok","YouTube","WhatsApp","Instagram","Facebook","Other"].map((name,i)=><button key={name} disabled><Share2 size={17}/><span>{name}</span></button>)}</div><small>Share options appear after a video has been rendered and saved to your device.</small></div></div></div>}
      {page === "editor" && aiWorkspaceOpen && <section className="ai-editor-drawer ai-workspace-page">
        <div className="ai-drawer-top"><span>AI CREATIVE WORKSPACE · INSIDE EDITOR</span><button onClick={()=>setAiWorkspaceOpen(false)} aria-label="Close AI workspace"><X size={18}/></button></div><div className="ai-workspace-heading">
          <div><div className="eyebrow"><Sparkles size={13}/> NEXUS CREATIVE INTELLIGENCE</div><h1>Your AI editing <em>workspace.</em></h1><p>Bring your idea and your own media. NEXUS will help you plan, organise and learn every step of the edit.</p></div>
          <span className="ai-status-pill"><i/> AI workspace preview</span>
        </div>
        <div className="ai-mode-switch">
          <button className={aiMode==="create"?"selected":""} onClick={()=>setAiMode("create")}><WandSparkles size={17}/> Create a project</button>
          <button className={aiMode==="guide"?"selected":""} onClick={()=>setAiMode("guide")}><HelpCircle size={17}/> Teach me to edit</button>
          <button className={aiMode==="ask"?"selected":""} onClick={()=>setAiMode("ask")}><Compass size={17}/> Ask editing AI</button>
        </div>
        <div className="ai-workspace-grid">
          <div className="ai-setup-column">
            {aiMode==="create" ? <>
              <div className="ai-panel-card">
                <div className="ai-panel-title"><span className="ai-step-number">01</span><div><b>Describe the video you imagine</b><small>Write naturally. You don't need editing terms.</small></div></div>
                <textarea className="ai-brief-input" value={aiBrief} onChange={e=>setAiBrief(e.target.value)} placeholder="Example: Make a warm birthday video from my photos and clips. Start with the best moments, add gentle music, smooth transitions and a beautiful title..."/>
                <div className="ai-prompt-suggestions"><span>Try an idea:</span>{["Birthday memories","Product promotion","Travel recap","Short social video"].map(x=><button key={x} onClick={()=>setAiBrief(x==="Birthday memories"?"Create an emotional birthday memories video using my photos and clips, with gentle music and elegant titles.":x==="Product promotion"?"Create a clean product promotion video that introduces the product, highlights its key features and ends with a clear call to action.":x==="Travel recap"?"Create an exciting travel recap from my clips and photos, with energetic pacing, location titles and music.":"Create a short vertical social video with an engaging opening, captions and a strong ending.")}>{x}</button>)}</div>
              </div>
              <div className="ai-panel-card">
                <div className="ai-panel-title"><span className="ai-step-number">02</span><div><b>Add your own media</b><small>Photos, video clips and audio you want to use.</small></div></div>
                <label className="ai-media-drop"><input type="file" accept="image/*,video/*,audio/*" multiple onChange={e=>setAiFiles(old=>[...old,...Array.from(e.target.files||[])])}/><span><Upload size={22}/></span><b>Add photos, videos or audio</b><small>Choose files from your device · Multiple files supported</small></label>
                {aiFiles.length>0 && <div className="ai-selected-files">{aiFiles.map((f,i)=><div key={i}><span>{f.type.startsWith("audio/")?<Music2 size={15}/>:f.type.startsWith("image/")?<ImageIcon size={15}/>:<Film size={15}/>}</span><b>{f.name}</b><small>{(f.size/1048576).toFixed(1)} MB</small><button onClick={()=>setAiFiles(old=>old.filter((_,n)=>n!==i))} aria-label={"Remove "+f.name}><X size={14}/></button></div>)}</div>}
              </div>
              <div className="ai-panel-card">
                <div className="ai-panel-title"><span className="ai-step-number">03</span><div><b>Choose your creative direction</b><small>These are starting preferences. You can change them later.</small></div></div>
                <div className="ai-preference-row"><label>Visual mood</label><div className="ai-choice-chips">{["Cinematic","Energetic","Clean","Soft & emotional","Documentary"].map(x=><button className={aiStyle===x?"chosen":""} key={x} onClick={()=>setAiStyle(x)}>{x}</button>)}</div></div>
                <div className="ai-preference-row"><label>Video format</label><div className="ai-choice-chips">{["9:16","16:9","1:1","4:5"].map(x=><button className={aiFormat===x?"chosen":""} key={x} onClick={()=>setAiFormat(x)}>{x}</button>)}</div></div>
              </div>
              <button className="ai-create-project-button" onClick={()=>{
                const usable=aiFiles.filter(f=>/^(video|audio|image)\//.test(f.type));
                if(!usable.length){setStatus("Add at least one photo, video or audio file to start your project.");return;}
                const nextAssets:MediaAsset[]=usable.map(file=>({id:uid(),name:file.name,kind:(file.type.startsWith("video/")?"video":file.type.startsWith("audio/")?"audio":"image") as MediaAsset["kind"],duration:file.type.startsWith("image/")?5:0,mimeType:file.type,file,objectUrl:URL.createObjectURL(file)}));
                let cursor=0;
                const nextClips:TimelineClip[]=nextAssets.map(a=>{const d=a.kind==="image"?5:0;const c:TimelineClip={id:uid(),assetId:a.id,trackId:a.kind==="audio"?"audio-1":"video-1",start:cursor,sourceIn:0,sourceOut:d||5,label:a.name};cursor+=d||5;return c;});
                setProjectName("AI Draft — "+(aiBrief.trim().slice(0,30)||"New video"));
                setAssets(nextAssets);setClips(nextClips);setSelected(nextClips[0]?.id||null);setPlayhead(0);setAspectRatio(aiFormat);setActiveTool("edit");setEditorView("workspace");setPage("editor");
                setStatus("Starter project created from your selected media. AI analysis and automatic arrangement will connect in the engine phase.");
              }}><WandSparkles size={19}/> Prepare my editing project <span>→</span></button>
              <p className="ai-engine-note"><CheckCircle2 size={14}/> Your files stay in your project. This UI creates a starter timeline; AI media analysis and automatic editing are the next engine phase.</p>
            </> : aiMode==="guide" ? <div className="ai-panel-card ai-coming-panel"><span><HelpCircle size={28}/></span><h2>Learn while you edit</h2><p>Choose a tool in the editor and NEXUS AI will guide you through it one step at a time, highlight the right control and explain what each action does.</p><div className="ai-guide-examples"><span>Keyframes</span><span>Text & captions</span><span>Audio mixing</span><span>Transitions</span><span>Colour grading</span></div><button onClick={()=>setPage("editor")}>Open editing workspace <ArrowDownToLine size={16}/></button><small>Guided actions and live workspace awareness will be connected to the editing engine.</small></div> : <div className="ai-panel-card ai-coming-panel"><span><Compass size={28}/></span><h2>Ask NEXUS about editing</h2><p>Ask how to achieve an effect, improve a scene, choose a transition or fix an editing problem.</p><textarea className="ai-brief-input" value={aiBrief} onChange={e=>setAiBrief(e.target.value)} placeholder="How do I make this clip slowly zoom in?"/><button onClick={()=>setStatus("AI question interface is designed. The AI assistant connection comes in the next engine phase.")}>Prepare question <ArrowRight size={16}/></button><small>The assistant will use your active project context once the AI engine is connected.</small></div>}
          </div>
          <aside className="ai-plan-column">
            <div className="ai-plan-card"><div className="ai-plan-top"><span><Sparkles size={17}/></span><b>How NEXUS will help</b></div><ol><li><i>1</i><div><b>Understand your idea</b><small>Read your brief and identify the type of video you want.</small></div></li><li><i>2</i><div><b>Review your media</b><small>Inspect supported clips, images, audio and their details.</small></div></li><li><i>3</i><div><b>Prepare an editable plan</b><small>Suggest scene order, tracks, titles, music and transitions.</small></div></li><li><i>4</i><div><b>Guide you in the editor</b><small>Highlight controls and help you make each change yourself.</small></div></li></ol><div className="ai-plan-foot"><CheckCircle2 size={15}/> You stay in control. Nothing is flattened into a finished video.</div></div>
            <div className="ai-capability-card"><div><Activity size={17}/><b>Designed for beginners and pros</b></div><p>Start with guided help, then take full manual control whenever you're ready.</p><div className="ai-capability-tags"><span>Editable timeline</span><span>Step-by-step help</span><span>Undo-friendly actions</span></div></div>
          </aside>
        </div>
      </section>}
      </section>}

      {page === "projects" && <section className="page-content"><div className="page-title-row"><div><div className="eyebrow">YOUR CREATIONS</div><h1>My projects</h1><p>All your creative work, in one place.</p></div><button className="gradient-button" onClick={() => { setProjectName("Untitled Project"); setClips([]); setAssets([]); setPage("editor"); }}><Plus size={16}/> New project</button></div><div className="project-filter"><button className="filter-active">All projects</button><button>Videos</button><button>Drafts</button><span>{recent.length} projects</span></div><div className="project-grid">{recent.filter(n => n.toLowerCase().includes(search.toLowerCase())).map((name, i) => <button className="project-tile" key={name} onClick={() => { setProjectName(name); setPage("editor"); }}><div className={"recent-art art-" + i}><span>PROJECT / 0{i + 1}</span></div><div><b>{name}</b><small>Local project · {i === 0 ? "Today" : i === 1 ? "Yesterday" : "2 days ago"}</small></div></button>)}</div></section>}

      {page === "templates" && <section className="page-content"><div className="page-title-row"><div><div className="eyebrow">A LITTLE CREATIVE INSPIRATION</div><h1>Explore templates</h1><p>Choose a starting point for your next story.</p></div></div><div className="category-tabs">{["All", "Lifestyle", "Gaming", "Business"].map(c => <button key={c} className={templateCategory === c ? "tab-active" : ""} onClick={() => setTemplateCategory(c)}>{c}</button>)}</div><div className="template-grid">{filteredTemplates.map(t => <button className="template-card" key={t.name} onClick={() => { setProjectName(t.name); setPage("editor"); setStatus("Template selected — add your own media to begin"); }}><div className={"template-art " + t.color}><span className="template-play"><Play size={18} fill="currentColor"/></span><small>{t.length}</small></div><div><b>{t.name}</b><small>{t.type} · Template preview</small></div></button>)}</div></section>}



      {page === "settings" && <section className="page-content"><div className="page-title-row"><div><div className="eyebrow">MAKE IT YOURS</div><h1>Settings</h1><p>Manage your workspace preferences.</p></div></div><div className="settings-layout"><div className="settings-nav"><b>Preferences</b><span>Appearance</span><span>Workspace</span><span>About</span></div><div className="settings-content"><h2>Appearance</h2><p>Choose how NEXUS EDITOR looks on your device.</p><div className="setting-row"><span><b>Dark appearance</b><small>Use the dark creative workspace theme.</small></span><button className={darkMode ? "toggle on" : "toggle"} onClick={() => setDarkMode(!darkMode)}><i/></button></div><div className="theme-picker-block">
            <div className="theme-picker-heading"><b>Colour theme</b><small>Pick the colour style for your entire workspace.</small></div>
            <div className="theme-options">{themes.map(t => <button key={t.id} className={theme === t.id ? "theme-option selected" : "theme-option"} onClick={() => changeTheme(t.id)} aria-pressed={theme === t.id}><span className="theme-swatches">{t.colors.map((color, i) => <i key={i} style={{ background: color }} />)}</span><span className="theme-option-name">{t.name}</span>{theme === t.id && <Check size={15} className="theme-check" />}</button>)}</div>
          </div>
          <div className="setting-row"><span><b>Workspace storage</b><small>Projects and media remain on this device.</small></span><span className="setting-value">Local</span></div><div className="setting-row"><span><b>Project format</b><small>Portable NEXUS project metadata.</small></span><span className="setting-value">.nexusproj</span></div><div className="about-card"><span className="brand-mark">N</span><div><b>NEXUS EDITOR</b><small>VELTRONIX NEXUS · Creative workspace</small></div></div></div></div></section>}
      <footer className="app-footer"><span>© VELTRONIX NEXUS</span><span>CREATE · EDIT · INSPIRE</span></footer>
    </main>
  </div>;
}
