import { useMemo, useState } from "react";
import { Activity, ArrowRight, Check, GitBranch, Lightbulb, Sparkles, WandSparkles, X } from "lucide-react";
import type { MediaAsset, TimelineClip, TimelineImageLayer, TimelineTextLayer } from "../types";

type Props = {
  projectName: string; aspectRatio: string; assets: MediaAsset[];
  clips: TimelineClip[]; textLayers: TimelineTextLayer[]; imageLayers: TimelineImageLayer[];
  onClose: () => void;
};
type DNA = { purpose: string; audience: string; style: string; palette: string; rules: string };
const blankDNA: DNA = { purpose: "", audience: "", style: "Cinematic", palette: "Project colours", rules: "" };

function inspectFabric(assets: MediaAsset[], clips: TimelineClip[], texts: TimelineTextLayer[], images: TimelineImageLayer[]) {
  const nodes = [
    ...assets.map(a => ({ id: a.id, name: a.name, kind: a.kind, role: a.kind === "audio" ? "Sound source" : a.kind === "image" ? "Visual source" : "Motion source" })),
    ...clips.map(c => ({ id: c.id, name: c.label, kind: "timeline clip", role: "Story beat" })),
    ...texts.map(t => ({ id: t.id, name: t.text.slice(0, 42), kind: "text", role: /quote|wisdom|inspire|motivat/i.test(t.text) ? "Message anchor" : "Typography layer" })),
    ...images.map(i => ({ id: i.id, name: "Image overlay", kind: "image layer", role: "Visual overlay" }))
  ];
  const issues: string[] = [];
  if (!assets.length) issues.push("No source media yet. Add a visual or audio asset to give the project a starting point.");
  if (assets.length && !clips.length) issues.push("Media is imported but no story beats are on the timeline.");
  if (clips.length && !texts.length) issues.push("There are no timed text layers. Add a title, caption or quote where the message needs support.");
  if (clips.length > 1) {
    const ordered = [...clips].sort((a,b)=>a.start-b.start);
    for (let i=1;i<ordered.length;i++) if (ordered[i].start > ordered[i-1].start + (ordered[i-1].sourceOut-ordered[i-1].sourceIn)/(ordered[i-1].speed||1) + .2) { issues.push("Possible visual gap between “"+ordered[i-1].label+"” and “"+ordered[i].label+"”."); break; }
  }
  if (assets.some(a=>a.kind==="audio") && !clips.some(c=>assets.find(a=>a.id===c.assetId)?.kind==="audio")) issues.push("Audio is in the media library but not yet connected to a timeline clip.");
  if (texts.some(t=>t.text.length>110)) issues.push("At least one text layer is long. Check its reading time on a phone-sized preview.");
  if (!issues.length) issues.push("No obvious structural issues found by the local checks. Review the actual preview and audio before export.");
  return { nodes, issues };
}

function planIntent(prompt: string, dna: DNA, graph: ReturnType<typeof inspectFabric>) {
  const q = prompt.toLowerCase();
  const steps: string[] = [];
  if (/cinematic|movie|film|trailer/.test(q)) steps.push("Create a clear opening beat, build visual contrast, then reserve the strongest shot for the payoff.");
  if (/quote|wisdom|motiv|inspir|message|apostle/.test(q)) steps.push("Treat the key sentence as the message anchor: give it readable space, deliberate timing and a supporting visual rather than crowding it.");
  if (/music|beat|rhythm|afrobeats|amapiano/.test(q)) steps.push("Use the existing audio tools to mark strong musical moments, then align cuts and transitions to selected beats.");
  if (/short|reel|tiktok|shorts|status/.test(q)) steps.push("Prioritise the first two seconds, keep the main subject inside the safe centre and check text legibility at 9:16.");
  if (/clean|professional|business|product/.test(q)) steps.push("Reduce competing effects, keep typography consistent and make the product or central message the visual priority.");
  if (/colour|color|style|look|brand/.test(q)) steps.push("Use Project DNA as the visual contract: "+(dna.palette||"choose one restrained palette")+", with "+(dna.style||"a consistent visual treatment")+".");
  if (!steps.length) steps.push("Break the request into an opening, a central message and a closing beat. Keep each proposed change reversible.");
  steps.push("Review "+graph.nodes.length+" connected project elements before applying changes. Nothing is changed automatically.");
  return steps;
}

export function CreativeFabricPanel({ projectName, aspectRatio, assets, clips, textLayers, imageLayers, onClose }: Props) {
  const [tab, setTab] = useState<"map"|"dna"|"intent"|"whatif">("map");
  const [intent, setIntent] = useState("");
  const [dna, setDna] = useState<DNA>(() => {
    try { return { ...blankDNA, ...JSON.parse(localStorage.getItem("nexus-fabric-dna:"+projectName)||"{}") }; } catch { return blankDNA; }
  });
  const [saved, setSaved] = useState(false);
  const [universe, setUniverse] = useState("Cinematic");
  const graph = useMemo(()=>inspectFabric(assets,clips,textLayers,imageLayers),[assets,clips,textLayers,imageLayers]);
  const plan = useMemo(()=>intent.trim()?planIntent(intent,dna,graph):[],[intent,dna,graph]);
  const saveDNA = () => { try { localStorage.setItem("nexus-fabric-dna:"+projectName,JSON.stringify(dna)); setSaved(true); } catch { setSaved(false); } };
  return <aside className="nexus-fabric-panel" role="dialog" aria-label="NEXUS Creative Fabric">
    <header className="nexus-fabric-head"><div className="nexus-fabric-mark"><GitBranch size={19}/></div><div><b>NEXUS CREATIVE FABRIC</b><small>PROJECT INTELLIGENCE LAYER · LOCAL FIRST</small></div><button onClick={onClose} aria-label="Close Creative Fabric"><X size={19}/></button></header>
    <div className="nexus-fabric-intro"><span><Sparkles size={14}/> CREATIVE WORLD MAP</span><h2>Your project, connected.</h2><p>Creative Fabric links your media, timeline beats and message layers so editing decisions can consider the whole project.</p></div>
    <nav className="nexus-fabric-tabs">{(["map","dna","intent","whatif"] as const).map(k=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{({map:"World map",dna:"Project DNA",intent:"Intent",whatif:"What-if"})[k]}</button>)}</nav>
    {tab==="map" && <div className="nexus-fabric-body">
      <div className="nexus-fabric-stats"><div><b>{graph.nodes.length}</b><small>Connected elements</small></div><div><b>{clips.length}</b><small>Story beats</small></div><div><b>{aspectRatio}</b><small>Canvas</small></div></div>
      <div className="nexus-fabric-section-title"><b>Creative graph</b><small>Live project structure</small></div>
      <div className="nexus-fabric-node-list">{graph.nodes.slice(0,18).map((n,i)=><div className="nexus-fabric-node" key={n.id}><span className="nexus-fabric-node-dot">{n.kind==="text"?"T":n.kind==="audio"?"♫":n.kind==="image"||n.kind==="image layer"?"▧":"▶"}</span><span><b>{n.name||"Untitled element"}</b><small>{n.role} · {n.kind}</small></span><small>#{String(i+1).padStart(2,"0")}</small></div>)}{graph.nodes.length>18&&<small>+ {graph.nodes.length-18} more connected elements</small>}{!graph.nodes.length&&<div className="nexus-fabric-empty">Import media to begin building your creative world.</div>}</div>
      <div className="nexus-fabric-section-title"><b>Continuity Guardian</b><small><Activity size={12}/> Local structural checks</small></div>
      <div className="nexus-fabric-issues">{graph.issues.map((issue,i)=><div key={i}><Lightbulb size={15}/><span>{issue}</span></div>)}</div>
    </div>}
    {tab==="dna" && <div className="nexus-fabric-body"><p className="nexus-fabric-copy">Project DNA is the creative contract for this project. It stays on this device and guides suggestions; it does not silently alter clips.</p>
      <label>What is this project about?<textarea value={dna.purpose} onChange={e=>setDna({...dna,purpose:e.target.value})} placeholder="A short film, product story, quote poster, tutorial…"/></label>
      <label>Who should it speak to?<input value={dna.audience} onChange={e=>setDna({...dna,audience:e.target.value})} placeholder="Audience or community"/></label>
      <label>Visual identity<select value={dna.style} onChange={e=>setDna({...dna,style:e.target.value})}>{["Cinematic","Minimal","Documentary","Bold social","Editorial","Afrofuturist","Warm and human","Luxury","Playful"].map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Colour / brand direction<input value={dna.palette} onChange={e=>setDna({...dna,palette:e.target.value})} placeholder="e.g. midnight blue, gold and cream"/></label>
      <label>Rules to preserve<textarea value={dna.rules} onChange={e=>setDna({...dna,rules:e.target.value})} placeholder="Keep quote wording exact; avoid fast cuts; use the same title style…"/></label>
      <button className="nexus-fabric-primary" onClick={saveDNA}><Check size={15}/> {saved?"DNA saved on this device":"Save project DNA"}</button>
    </div>}
    {tab==="intent" && <div className="nexus-fabric-body"><p className="nexus-fabric-copy">Describe the result you want. Fabric turns it into a transparent, reviewable plan using the tools already in NEXUS.</p><textarea className="nexus-fabric-intent" value={intent} onChange={e=>setIntent(e.target.value)} placeholder="Make this a powerful 30-second wisdom quote video with a cinematic opening, readable message and calm ending…"/>{plan.length>0&&<div className="nexus-fabric-plan"><b>Proposed creative direction</b>{plan.map((s,i)=><div key={i}><span>{i+1}</span>{s}</div>)}<small>Plan only — no timeline changes have been applied.</small></div>}</div>}
    {tab==="whatif" && <div className="nexus-fabric-body"><p className="nexus-fabric-copy">Explore different creative directions without replacing your current edit.</p><div className="nexus-fabric-universes">{["Cinematic","Documentary","Bold social","Minimal"].map(v=><button key={v} className={universe===v?"active":""} onClick={()=>setUniverse(v)}>{v}</button>)}</div><div className="nexus-fabric-universe-card"><WandSparkles size={22}/><b>{universe} universe</b><p>{({Cinematic:"Use contrast, deliberate pacing and a strong visual payoff. Preserve the core story and quote wording.",Documentary:"Prioritise natural footage, clear context, restrained transitions and an honest visual tone.","Bold social":"Prioritise an immediate hook, strong type hierarchy, short beats and high mobile readability.",Minimal:"Reduce effects and competing layers; let one image and one clear message carry the scene."})[universe]}</p><small>This is a direction preview, not a generated duplicate or a change to your timeline.</small></div></div>}
    <footer className="nexus-fabric-footer"><span>Existing tools remain in control</span><button onClick={onClose}>Return to editor <ArrowRight size={14}/></button></footer>
  </aside>;
}
