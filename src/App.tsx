import { useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowLeft, Bell, Check, ChevronDown, Clapperboard,
  Cloud, Command, Compass, Film, Folder, FolderOpen, Grid2X2, HelpCircle,
  Home, Image as ImageIcon, Layers, Music2, Play, Plus, Search, Settings,
  SlidersHorizontal, Sparkles, Scissors, Trash2, Upload, WandSparkles, X
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
  const [search, setSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState("All");
  const [darkMode, setDarkMode] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("nexus-editor-theme") || "violet");
  function changeTheme(id: string) { setTheme(id); localStorage.setItem("nexus-editor-theme", id); }
  const input = useRef<HTMLInputElement>(null);
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
    { id: "ai" as Page, label: "AI Studio", icon: Sparkles },
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
      <nav>{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={page === item.id ? "nav-item active" : "nav-item"} onClick={() => setPage(item.id)}><Icon size={18}/><span>{item.label}</span>{item.id === "ai" && <i>NEW</i>}</button>; })}</nav>
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
          <button className="quick-card" onClick={() => setPage("ai")}><span className="quick-icon violet"><WandSparkles/></span><b>AI Studio</b><small>Creative assistance</small></button>
          <button className="quick-card" onClick={() => setPage("projects")}><span className="quick-icon amber"><Folder/></span><b>My projects</b><small>Your creations</small></button>
        </div>
        <div className="section-heading"><div><h2>Recent projects</h2><p>Pick up where you left off</p></div><button className="text-link" onClick={() => setPage("projects")}>View all <span>→</span></button></div>
        <div className="recent-grid">{recent.map((name, i) => <button className="recent-card" key={name} onClick={() => { setProjectName(name); setPage("editor"); }}><div className={"recent-art art-" + i}><span>{i === 0 ? "VLOG / 01" : i === 1 ? "TECH / 02" : "MOMENTS / 03"}</span><b>{i === 0 ? "Make it a story." : i === 1 ? "Ideas in motion." : "Keep the moment."}</b></div><div className="recent-info"><span><b>{name}</b><small>{i === 0 ? "Edited recently" : i === 1 ? "Yesterday" : "2 days ago"}</small></span><span className="more-dots">•••</span></div></button>)}</div>
      </section>}

      {page === "editor" && <section className="page-content editor-page editor-v2">
        <div className="editor-heading editor-v2-heading">
          <div><div className="eyebrow">NEXUS STUDIO / EDITOR</div><h1>{projectName}</h1><p>Build your story, one layer at a time.</p></div>
          <div className="editor-actions">
            <button className="outline-button" onClick={() => projectInput.current?.click()}><FolderOpen size={15}/> Open</button>
            <button className="outline-button" onClick={() => downloadProject(project, assets)}><Check size={15}/> Save</button>
            <button className="gradient-button" onClick={() => setStatus("Export rendering is not available yet. Your project can be saved as .nexusproj.")}><ArrowDownToLine size={15}/> Export</button>
          </div>
        </div>
        <div className="editor-v2-main">
          <section className="editor-v2-preview">
            <div className="editor-v2-preview-top"><span>PREVIEW</span><span>9:16 <ChevronDown size={13}/></span></div>
            <div className="editor-v2-stage">
              {asset?.kind === "video" && asset.objectUrl ? <video ref={video} src={asset.objectUrl} controls playsInline/> : asset?.kind === "image" && asset.objectUrl ? <img src={asset.objectUrl} alt="Selected media preview"/> : <div className="preview-empty"><div className="preview-n">N</div><b>Your story starts here</b><small>Import media and add it to your timeline</small></div>}
            </div>
            <div className="editor-v2-transport">
              <button onClick={() => { if(video.current){video.current.currentTime=Math.max(0,video.current.currentTime-1);setPlayhead(Math.max(0,playhead-1));}}}>−1s</button>
              <button className="round-play" onClick={() => { if(video.current){if(video.current.paused) void video.current.play(); else video.current.pause();}}}><Play size={16} fill="currentColor"/></button>
              <button onClick={() => {if(video.current){video.current.currentTime+=1;setPlayhead(video.current.currentTime);}}}>+1s</button>
              <span>{clock(playhead)} <i>/</i> {clock(duration)}</span>
            </div>
          </section>
          <section className="editor-v2-timeline">
            <div className="editor-v2-timeline-head"><div><b>Timeline</b><small>{clips.length} clips · {clock(duration)}</small></div><div className="timeline-quick-actions">
              <button onClick={split} title="Split selected clip"><Scissors size={15}/></button>
              <button disabled={!selectedClip} onClick={() => {setClips(old=>old.filter(c=>c.id!==selected));setSelected(null);setStatus("Clip deleted");}} title="Delete selected clip"><Trash2 size={15}/></button>
              <button onClick={() => setStatus("Undo history will be added with the editing-engine phase.")} title="Undo"><ArrowLeft size={15}/></button>
              <button onClick={() => setStatus("Redo history will be added with the editing-engine phase.")} title="Redo"><Command size={15}/></button>
            </div></div>
            <div className="editor-v2-ruler"><span>00:00</span><span>00:05</span><span>00:10</span><span>00:15</span><span>00:20</span></div>
            <div className="editor-v2-track-area">
              <div className="editor-v2-track-labels"><div>V1 <small>Video</small></div><div>V2 <small>Overlay</small></div><div>T1 <small>Text</small></div><div>A1 <small>Audio</small></div></div>
              <div className="editor-v2-track-scroll"><div className="editor-v2-track-content">
                {["video-1","overlay-1","text-1","audio-1"].map((trackId,i)=><div className="editor-v2-track-row" key={trackId}>
                  {clips.filter(c=>c.trackId===trackId).map(c=><button key={c.id} className={selected===c.id?"editor-v2-clip selected":"editor-v2-clip"} style={{left:c.start*54,width:Math.max(68,clipDuration(c)*54)}} onClick={()=>{setSelected(c.id);setPlayhead(c.start);const a=assets.find(x=>x.id===c.assetId);if(a?.kind==="video"&&video.current)video.current.src=a.objectUrl||"";}}>{c.label}</button>)}
                  {i===2&&<span className="track-placeholder">Text layers will appear here</span>}
                  {i===3&&clips.some(c=>c.trackId===trackId)&&<span className="waveform-placeholder" aria-label="Audio clip lane">{Array.from({length:42},(_,n)=><i key={n} style={{height:(7+(n*17%23))+"px"}}/>)}</span>}
                </div>)}
                <div className="editor-v2-playhead" style={{left:playhead*54}}/>
                <input aria-label="Timeline playhead" className="editor-v2-seek" type="range" min="0" max={Math.max(duration,1)} step=".1" value={Math.min(playhead,Math.max(duration,1))} onChange={e=>setPlayhead(Number(e.target.value))}/>
              </div></div>
            </div>
            <div className="editor-v2-timeline-foot"><span>Drag the playhead to choose an edit point</span><span>{clock(playhead)}</span></div>
          </section>
          <section className="editor-v2-tools">
            <div className="editor-v2-tool-tabs">{[{id:"Media",icon:Film},{id:"Audio",icon:Music2},{id:"Text",icon:Command},{id:"Stickers",icon:Sparkles},{id:"Effects",icon:WandSparkles},{id:"Filters",icon:SlidersHorizontal}].map(item=>{const Icon=item.icon;return <button key={item.id} className={editorTool===item.id?"active":""} onClick={()=>{setEditorTool(item.id);if(item.id==="Media"||item.id==="Audio")input.current?.click();else setStatus(item.id+" tools are planned for the next editor phase.");}}><Icon size={17}/><span>{item.id}</span></button>;})}</div>
            <div className="editor-v2-library">
              <div className="editor-v2-library-head"><b>{editorTool} library</b><button className="mini-icon" onClick={()=>input.current?.click()}><Plus size={16}/></button></div>
              <input ref={input} hidden type="file" multiple accept="video/*,audio/*,image/*" onChange={e=>importMedia(e.target.files)}/>
              {assets.length? <div className="editor-v2-assets">{assets.filter(a=>editorTool==="Audio"?a.kind==="audio":editorTool==="Media"?true:false).map(a=><button key={a.id} className="editor-v2-asset" onClick={()=>add(a)}><span>{a.kind==="audio"?<Music2 size={18}/>:a.kind==="image"?<ImageIcon size={18}/>:<Film size={18}/>}</span><b>{a.name}</b><small>{a.kind.toUpperCase()} · {a.duration?clock(a.duration):"Reading…"}</small><Plus size={15}/></button>)}{!assets.some(a=>editorTool==="Audio"?a.kind==="audio":editorTool==="Media")&&<small className="editor-v2-hint">No {editorTool.toLowerCase()} imported yet. Use + to import files.</small>}</div>:<button className="editor-v2-import" onClick={()=>input.current?.click()}><Upload size={18}/><b>Import media</b><small>Video, audio and images from your device</small></button>}
            </div>
          </section>
          <aside className="editor-v2-properties"><div className="panel-heading"><span>CLIP PROPERTIES</span><SlidersHorizontal size={15}/></div>{selectedClip?<><div className="selected-property"><small>SELECTED CLIP</small><b>{selectedClip.label}</b><span>{asset?.kind.toUpperCase()||"MEDIA"} · {clock(clipDuration(selectedClip))}</span></div><label>Position <b>{clock(selectedClip.start)}</b></label><input type="range" min="0" max={Math.max(duration,1)} step=".1" value={selectedClip.start} onChange={e=>setClips(old=>old.map(c=>c.id===selected?{...c,start:Number(e.target.value)}:c))}/><label>Trim start <b>{clock(selectedClip.sourceIn)}</b></label><input type="range" min="0" max={Math.max(asset?.duration||1,1)} step=".1" value={selectedClip.sourceIn} onChange={e=>setClips(old=>old.map(c=>c.id===selected?{...c,sourceIn:Number(e.target.value)}:c))}/><label>Trim end <b>{clock(selectedClip.sourceOut)}</b></label><input type="range" min={selectedClip.sourceIn} max={Math.max(asset?.duration||1,1)} step=".1" value={Math.min(selectedClip.sourceOut,asset?.duration||selectedClip.sourceOut)} onChange={e=>setClips(old=>old.map(c=>c.id===selected?{...c,sourceOut:Number(e.target.value)}:c))}/></>:<div className="empty-state">Select a timeline clip to adjust its position and trim points.</div>}<div className="project-spec"><small>PROJECT</small><p>Vertical 9:16 preview · 30 FPS</p><p>Saved as .nexusproj</p></div></aside>
        </div>
        <div className="editor-status"><span className="status-dot"/>{status}</div>
        <input ref={projectInput} hidden type="file" accept=".nexusproj,.json" onChange={e=>openProject(e.target.files?.[0])}/>
      </section>}

      {page === "projects" && <section className="page-content"><div className="page-title-row"><div><div className="eyebrow">YOUR CREATIONS</div><h1>My projects</h1><p>All your creative work, in one place.</p></div><button className="gradient-button" onClick={() => { setProjectName("Untitled Project"); setClips([]); setAssets([]); setPage("editor"); }}><Plus size={16}/> New project</button></div><div className="project-filter"><button className="filter-active">All projects</button><button>Videos</button><button>Drafts</button><span>{recent.length} projects</span></div><div className="project-grid">{recent.filter(n => n.toLowerCase().includes(search.toLowerCase())).map((name, i) => <button className="project-tile" key={name} onClick={() => { setProjectName(name); setPage("editor"); }}><div className={"recent-art art-" + i}><span>PROJECT / 0{i + 1}</span></div><div><b>{name}</b><small>Local project · {i === 0 ? "Today" : i === 1 ? "Yesterday" : "2 days ago"}</small></div></button>)}</div></section>}

      {page === "templates" && <section className="page-content"><div className="page-title-row"><div><div className="eyebrow">A LITTLE CREATIVE INSPIRATION</div><h1>Explore templates</h1><p>Choose a starting point for your next story.</p></div></div><div className="category-tabs">{["All", "Lifestyle", "Gaming", "Business"].map(c => <button key={c} className={templateCategory === c ? "tab-active" : ""} onClick={() => setTemplateCategory(c)}>{c}</button>)}</div><div className="template-grid">{filteredTemplates.map(t => <button className="template-card" key={t.name} onClick={() => { setProjectName(t.name); setPage("editor"); setStatus("Template selected — add your own media to begin"); }}><div className={"template-art " + t.color}><span className="template-play"><Play size={18} fill="currentColor"/></span><small>{t.length}</small></div><div><b>{t.name}</b><small>{t.type} · Template preview</small></div></button>)}</div></section>}

      {page === "ai" && <section className="page-content"><div className="ai-hero"><span className="ai-symbol"><Sparkles size={26}/></span><div className="eyebrow">CREATIVE INTELLIGENCE</div><h1>Meet your <em>AI Studio.</em></h1><p>Creative tools to help you plan, refine and find your next big idea.</p></div><div className="ai-tool-grid">{[{icon:WandSparkles,title:"Creative assistant",desc:"Get ideas and direction for your next edit."},{icon:Activity,title:"Edit insights",desc:"Explore ways to improve your video story."},{icon:Layers,title:"Scene planner",desc:"Organise your ideas into a clear sequence."},{icon:Compass,title:"Style explorer",desc:"Discover visual directions and moods."}].map(item => {const Icon=item.icon;return <button className="ai-tool-card" key={item.title} onClick={() => setStatus(item.title + " — this tool will be connected in a later feature phase")}><span><Icon size={21}/></span><b>{item.title}</b><small>{item.desc}</small><i>Explore <span>→</span></i></button>;})}</div></section>}

      {page === "settings" && <section className="page-content"><div className="page-title-row"><div><div className="eyebrow">MAKE IT YOURS</div><h1>Settings</h1><p>Manage your workspace preferences.</p></div></div><div className="settings-layout"><div className="settings-nav"><b>Preferences</b><span>Appearance</span><span>Workspace</span><span>About</span></div><div className="settings-content"><h2>Appearance</h2><p>Choose how NEXUS EDITOR looks on your device.</p><div className="setting-row"><span><b>Dark appearance</b><small>Use the dark creative workspace theme.</small></span><button className={darkMode ? "toggle on" : "toggle"} onClick={() => setDarkMode(!darkMode)}><i/></button></div><div className="theme-picker-block">
            <div className="theme-picker-heading"><b>Colour theme</b><small>Pick the colour style for your entire workspace.</small></div>
            <div className="theme-options">{themes.map(t => <button key={t.id} className={theme === t.id ? "theme-option selected" : "theme-option"} onClick={() => changeTheme(t.id)} aria-pressed={theme === t.id}><span className="theme-swatches">{t.colors.map((color, i) => <i key={i} style={{ background: color }} />)}</span><span className="theme-option-name">{t.name}</span>{theme === t.id && <Check size={15} className="theme-check" />}</button>)}</div>
          </div>
          <div className="setting-row"><span><b>Workspace storage</b><small>Projects and media remain on this device.</small></span><span className="setting-value">Local</span></div><div className="setting-row"><span><b>Project format</b><small>Portable NEXUS project metadata.</small></span><span className="setting-value">.nexusproj</span></div><div className="about-card"><span className="brand-mark">N</span><div><b>NEXUS EDITOR</b><small>VELTRONIX NEXUS · Creative workspace</small></div></div></div></div></section>}
      <footer className="app-footer"><span>© VELTRONIX NEXUS</span><span>CREATE · EDIT · INSPIRE</span></footer>
    </main>
  </div>;
}
