import { useMemo, useState } from "react";
import { Activity, ArrowRight, Check, GitBranch, Lightbulb, Sparkles, WandSparkles, X } from "lucide-react";
import type { MediaAsset, TimelineClip, TimelineImageLayer, TimelineTextLayer } from "../types";
import { captureVisualSamples, type VisualSample } from "./visual-sampling";
import { analyzeMediaAsset, type MediaAnalysis } from "./engines";

export type FabricOperation = { kind: "add-title"; text: string } | { kind: "apply-look"; filter: string; clipId?: string } | { kind: "apply-transition"; transition: "fade" | "zoom" | "wipe" | "slide" | "blur"; clipId?: string };
type Props = {
  projectName: string; aspectRatio: string; assets: MediaAsset[];
  clips: TimelineClip[]; textLayers: TimelineTextLayer[]; imageLayers: TimelineImageLayer[];
  selectedClipId?: string | null;
  onApplyPlan: (operations: FabricOperation[]) => void;
  onSeekTo: (time: number) => void;
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
  const edges: {from:string;to:string;label:string}[] = [];
  for (const clip of clips) { if (assets.some(a=>a.id===clip.assetId)) edges.push({from:clip.assetId,to:clip.id,label:"uses media"}); }
  for (const layer of images) { if (assets.some(a=>a.id===layer.assetId)) edges.push({from:layer.assetId,to:layer.id,label:"overlay source"}); }
  for (const clip of clips) {
    const end=clip.start+(clip.sourceOut-clip.sourceIn)/(clip.speed||1);
    for (const layer of texts) if (layer.start < end && layer.start+layer.duration>clip.start) edges.push({from:clip.id,to:layer.id,label:"overlaps in time"});
    for (const layer of images) if (layer.start < end && layer.start+layer.duration>clip.start) edges.push({from:clip.id,to:layer.id,label:"shares scene window"});
  }
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
  for (const layer of texts) { const words=layer.text.trim().split(/\s+/).filter(Boolean).length; const readingSeconds=words/2.7; if(words>=7 && layer.duration<readingSeconds) { issues.push("“"+layer.text.slice(0,28)+"” may disappear before viewers can comfortably read it."); break; } }
  if(clips.length>0){const total=clips.reduce((sum,clip)=>sum+Math.max(0,(clip.sourceOut-clip.sourceIn)/(clip.speed||1)),0);if(total>0&&total<8)issues.push("The current cut is under 8 seconds. Check whether the story has enough time to land.");}

  if (!issues.length) issues.push("No obvious structural issues found by the local checks. Review the actual preview and audio before export.");
  return { nodes, edges, issues };
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
  if(dna.purpose.trim()) steps.push("Project purpose: "+dna.purpose.trim()+". Keep every scene serving this purpose.");
  if(dna.audience.trim()) steps.push("Audience: "+dna.audience.trim()+". Match pacing and language to this audience.");
  if(dna.rules.trim()) steps.push("Preserve these project rules: "+dna.rules.trim()+".");
  if (!steps.length) steps.push("Break the request into an opening, a central message and a closing beat. Keep each proposed change reversible.");
  steps.push("Review "+graph.nodes.length+" connected project elements before applying changes. Nothing is changed automatically.");
  return steps;
}

export function CreativeFabricPanel({ projectName, aspectRatio, assets, clips, textLayers, imageLayers, selectedClipId, onApplyPlan, onSeekTo, onClose }: Props) {
  const [tab, setTab] = useState<"map"|"scenes"|"dna"|"intent"|"whatif">("map");
  const [intent, setIntent] = useState("");
  const [dna, setDna] = useState<DNA>(() => {
    try { return { ...blankDNA, ...JSON.parse(localStorage.getItem("nexus-fabric-dna:"+projectName)||"{}") }; } catch { return blankDNA; }
  });
  const [saved, setSaved] = useState(false);
  const [universe, setUniverse] = useState("Cinematic");
  const [approved, setApproved] = useState(false);
  const [visualSamples, setVisualSamples] = useState<VisualSample[]>([]);
  const [visualAnalyses, setVisualAnalyses] = useState<MediaAnalysis[]>([]);
  const [visualScanBusy, setVisualScanBusy] = useState(false);
  const [visualScanMessage, setVisualScanMessage] = useState("");
  const scanProjectVisuals = async () => {
    if (visualScanBusy) return;
    setVisualScanBusy(true); setVisualScanMessage("Reading local image and video frames…");
    try {
      const samples = await captureVisualSamples(assets, 12);
      setVisualSamples(samples);
      const visualAssets = assets.filter(asset => asset.kind === "image" || asset.kind === "video").slice(0, 6);
      const analyses: MediaAnalysis[] = [];
      for (const asset of visualAssets) { try { analyses.push(await analyzeMediaAsset(asset)); } catch { /* keep the contact sheet if one source fails */ } }
      setVisualAnalyses(analyses);
      const changes = analyses.reduce((sum, item) => sum + (item.visual?.sceneChanges.length || 0), 0);
      setVisualScanMessage(samples.length ? "Captured " + samples.length + " frame(s) and measured " + analyses.length + " source(s) locally. " + changes + " possible visual-change point(s) detected. No upload or API key used." : "No readable image/video files found. Re-import the original media if needed.");
    }
    catch (error) { setVisualScanMessage(error instanceof Error ? error.message : "Visual scan could not complete."); }
    finally { setVisualScanBusy(false); }
  };
  const graph = useMemo(()=>inspectFabric(assets,clips,textLayers,imageLayers),[assets,clips,textLayers,imageLayers]);
  const plan = useMemo(()=>intent.trim()?planIntent(intent,dna,graph):[],[intent,dna,graph]);
  const operations = useMemo<FabricOperation[]>(()=>{
    if(!intent.trim()) return [];
    const q=intent.toLowerCase(); const result:FabricOperation[]=[];
    if(/title|headline|quote|caption|text|opening|intro/.test(q)) { const explicit=intent.match(/(?:title|quote|caption)\s*:\s*["“]?([^"”\n]{3,90})/i)?.[1]?.trim(); result.push({kind:"add-title",text:explicit||"Your title"}); }
    if(/cinematic|film|movie|dramatic/.test(q)) result.push({kind:"apply-look",filter:"Cinematic"});
    else if(/warm|golden|sunset/.test(q)) result.push({kind:"apply-look",filter:"Warm"});
    else if(/black.?and.?white|monochrome|noir/.test(q)) result.push({kind:"apply-look",filter:"B&W"});
    if(/transition|smooth|fade/.test(q)) result.push({kind:"apply-transition",transition:"fade"});
    return result;
  },[intent,dna.purpose,projectName]);
  const saveDNA = () => { try { localStorage.setItem("nexus-fabric-dna:"+projectName,JSON.stringify(dna)); setSaved(true); } catch { setSaved(false); } };
  return <aside className="nexus-fabric-panel" role="dialog" aria-label="NEXUS Creative Fabric">
    <header className="nexus-fabric-head"><div className="nexus-fabric-mark"><GitBranch size={19}/></div><div><b>NEXUS CREATIVE FABRIC</b><small>PROJECT INTELLIGENCE LAYER · LOCAL FIRST</small></div><button onClick={onClose} aria-label="Close Creative Fabric"><X size={19}/></button></header>
    <div className="nexus-fabric-intro"><span><Sparkles size={14}/> CREATIVE WORLD MAP</span><h2>Your project, connected.</h2><p>Creative Fabric links your media, timeline beats and message layers so editing decisions can consider the whole project.</p></div>
    <nav className="nexus-fabric-tabs">{(["map","scenes","dna","intent","whatif"] as const).map(k=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{({map:"World map",scenes:"Scenes",dna:"Project DNA",intent:"Intent",whatif:"What-if"})[k]}</button>)}</nav>
    {tab==="map" && <div className="nexus-fabric-body">
      <div className="nexus-fabric-stats"><div><b>{graph.nodes.length}</b><small>Connected elements</small></div><div><b>{clips.length}</b><small>Story beats</small></div><div><b>{aspectRatio}</b><small>Canvas</small></div></div>
      <div className="nexus-fabric-section-title"><b>Creative graph</b><small>Live project structure</small></div>
      <div className="nexus-fabric-node-list">{graph.nodes.slice(0,18).map((n,i)=><div className="nexus-fabric-node" key={n.id}><span className="nexus-fabric-node-dot">{n.kind==="text"?"T":n.kind==="audio"?"♫":n.kind==="image"||n.kind==="image layer"?"▧":"▶"}</span><span><b>{n.name||"Untitled element"}</b><small>{n.role} · {n.kind}</small></span><small>#{String(i+1).padStart(2,"0")}</small></div>)}{graph.nodes.length>18&&<small>+ {graph.nodes.length-18} more connected elements</small>}{!graph.nodes.length&&<div className="nexus-fabric-empty">Import media to begin building your creative world.</div>}</div>
      <div className="nexus-fabric-section-title"><b>Relationship links</b><small>{graph.edges.length} detected connections</small></div><div className="nexus-fabric-edges">{graph.edges.slice(0,12).map((edge,i)=><div key={i}><b>{graph.nodes.find(n=>n.id===edge.from)?.name||"Media"}</b><span>→ {edge.label} →</span><b>{graph.nodes.find(n=>n.id===edge.to)?.name||"Timeline element"}</b></div>)}{!graph.edges.length&&<small>Links appear when clips reference imported media or text overlaps a clip on the same track.</small>}</div>
      <div className="nexus-fabric-section-title"><b>Continuity Guardian</b><small><Activity size={12}/> Local structural checks</small></div>
      <div className="nexus-fabric-issues">{graph.issues.map((issue,i)=><div key={i}><Lightbulb size={15}/><span>{issue}</span></div>)}</div>
    </div>}
    {tab==="scenes" && <div className="nexus-fabric-body">
      <p className="nexus-fabric-copy">Scene Intelligence reads your timeline structure, clip labels, generated-scene notes and timed text. It does not claim to visually understand footage; all analysis runs locally.</p>
      {!clips.length && <div className="nexus-fabric-empty">Add clips to the timeline and Scene Intelligence will map the story beats here.</div>}
      <div className="nexus-fabric-visual-scan">
        <div><b>Visual contact sheet</b><small>Sample real frames locally — no upload or API key. Composition is contrast-based, not subject recognition.</small></div>
        <button onClick={()=>void scanProjectVisuals()} disabled={visualScanBusy}>{visualScanBusy?"Scanning…":"Scan project frames"}</button>
        {visualScanMessage && <p>{visualScanMessage}</p>}
        {visualSamples.length>0 && <div className="nexus-fabric-sample-grid">{visualSamples.map((sample,index)=><article key={sample.assetId+"-"+index}>
          <img src={sample.dataUrl} alt={sample.assetName+" visual sample"} loading="lazy"/>
          <b>{sample.assetName}</b><small>{sample.role}{typeof sample.timestamp==="number"?" · "+sample.timestamp.toFixed(1)+"s":""}</small>
          <button onClick={()=>{const clip=clips.find(item=>item.assetId===sample.assetId);if(clip)onSeekTo(clip.start+Math.max(0,(sample.timestamp||0)-clip.sourceIn)/(clip.speed||1));}}>Go to frame</button>
        </article>)}</div>}
      </div>
      {[...clips].sort((a,b)=>a.start-b.start).map((clip,index)=>{
        const end=clip.start+(clip.sourceOut-clip.sourceIn)/(clip.speed||1);
        const attachedText=textLayers.filter(layer=>layer.start<end&&layer.start+layer.duration>clip.start);
        const note=[clip.aiScene?.title,clip.aiScene?.visual,clip.aiScene?.narration,clip.label,...attachedText.map(layer=>layer.text)].filter(Boolean).join(" ");
        const words=note.toLowerCase();
        const role=/hook|intro|opening|welcome|attention|stop scrolling/.test(words)||index===0?"Hook":/conclusion|closing|thank|follow|subscribe|call to action|cta/.test(words)||index===clips.length-1?"Closing":/proof|evidence|example|result|demonstrat/.test(words)?"Evidence":/context|background|problem|why|story/.test(words)?"Context":/quote|wisdom|message|lesson|teach|main point/.test(words)?"Core message":"Development";
        const seconds=Math.max(0,end-clip.start);
        const suggested=role==="Hook"?"Bold social":role==="Closing"?"Warm":role==="Core message"?"Cinematic":"Documentary";
        const sceneSamples=visualSamples.filter(sample=>sample.assetId===clip.assetId);
        const orderedClips=[...clips].sort((a,b)=>a.start-b.start);
        const previousClip=index>0?orderedClips[index-1]:null;
        const currentVisual=visualAnalyses.find(item=>item.assetId===clip.assetId)?.visual;
        const previousVisual=previousClip?visualAnalyses.find(item=>item.assetId===previousClip.assetId)?.visual:undefined;
        const luminanceDelta=currentVisual&&previousVisual?Math.abs(currentVisual.averageLuminance-previousVisual.averageLuminance):0;
        return <article className="nexus-fabric-scene" key={clip.id}>
          <div className="nexus-fabric-scene-top"><span>SCENE {String(index+1).padStart(2,"0")}</span><b>{role}</b><small>{seconds.toFixed(1)}s</small></div>
          <strong>{clip.aiScene?.title||clip.label||"Untitled scene"}</strong>
          {sceneSamples.length>0&&<div className="nexus-fabric-scene-frames">{sceneSamples.map((sample,index)=><button key={sample.assetId+"-scene-"+index} onClick={()=>onSeekTo(clip.start+Math.max(0,(sample.timestamp||0)-clip.sourceIn)/(clip.speed||1))} title="Jump to sampled frame"><img src={sample.dataUrl} alt={"Frame from "+sample.assetName}/><small>{typeof sample.timestamp==="number"?sample.timestamp.toFixed(1)+"s":"Image"}</small></button>)}</div>}
          <p>{clip.aiScene?.visual||attachedText.map(layer=>layer.text).join(" · ")||"No scene description or overlapping text yet. Add a caption or scene note to improve the story map."}</p>
          {visualAnalyses.filter(item=>item.assetId===clip.assetId&&item.visual).map(item=><div className="nexus-fabric-scene-analysis" key={item.assetId}>
            <span>{item.visual!.averageLuminance<0.28?"Low-light source":item.visual!.averageLuminance>0.76?"Bright source":"Balanced average brightness"}</span>
            <span>{item.visual!.sampledFrames} frame samples</span>
            {item.visual!.composition&&<div className="nexus-fabric-composition">
              <b>Composition Coach · contrast estimate</b>
              <span>Visual-weight centre: {Math.round(item.visual!.composition.focusX)}% across · {Math.round(item.visual!.composition.focusY)}% down</span>
              <span>Left/right balance: {Math.round(item.visual!.composition.leftRightBalance*100)}% · top/bottom balance: {Math.round(item.visual!.composition.topBottomBalance*100)}%</span>
              <small>{Math.abs(item.visual!.composition.focusX-33)<12||Math.abs(item.visual!.composition.focusX-67)<12||Math.abs(item.visual!.composition.focusY-33)<12||Math.abs(item.visual!.composition.focusY-67)<12?"The contrast centre is near a rule-of-thirds guide. Check whether that placement supports the subject.":"The contrast centre sits away from the main thirds guides. Consider reframing only if it improves the story."} {Math.min(item.visual!.composition.leftRightBalance,item.visual!.composition.topBottomBalance)<.58?"The frame has noticeably uneven contrast weight; check whether the imbalance is intentional.":"Contrast weight is reasonably distributed across the frame."}</small>
            </div>}
            {item.visual!.sceneChanges.length>0&&<span>{item.visual!.sceneChanges.length} possible visual change(s)</span>}
            {item.visual!.sceneChanges.slice(0,4).map((point,index)=><button key={index} onClick={()=>onSeekTo(clip.start+Math.max(0,point-clip.sourceIn)/(clip.speed||1))}>Review change {index+1} · {point.toFixed(1)}s</button>)}
          </div>)}
          {currentVisual&&previousVisual&&<div className={"nexus-fabric-continuity "+(luminanceDelta>=0.22?"notice":"steady")}>
            <b>{luminanceDelta>=0.22?"Brightness jump to review":"Brightness continuity"}</b>
            <span>{Math.round(previousVisual.averageLuminance*100)}% → {Math.round(currentVisual.averageLuminance*100)}% average luminance · {Math.round(luminanceDelta*100)} point difference</span>
            <small>{luminanceDelta>=0.22?"The adjacent source frames differ noticeably in average brightness. Check the preview and adjust exposure if the cut feels abrupt.":"The measured average brightness is relatively close to the previous analysed scene."}</small>
          </div>}
          <div className="nexus-fabric-scene-meta"><span>{attachedText.length} text layer(s)</span><span>{clip.aiScene?"Generated scene notes":"Timeline-based inference"}</span></div>
          <div className="nexus-fabric-scene-actions">
            <button onClick={()=>onApplyPlan([{kind:"apply-look",filter:suggested==="Warm"?"Warm":suggested==="Documentary"?"Matte":suggested==="Bold social"?"Vivid":"Cinematic",clipId:clip.id}])}>Apply {suggested} look</button>
            <button onClick={()=>onApplyPlan([{kind:"apply-transition",transition:role==="Hook"?"zoom":role==="Closing"?"fade":"slide",clipId:clip.id}])}>Apply scene transition</button>
          </div>
        </article>;
      })}
      <small className="nexus-fabric-scene-note">Scene roles are heuristic suggestions based on order and available text metadata. Review each scene before applying a treatment.</small>
    </div>}
    {tab==="dna" && <div className="nexus-fabric-body"><p className="nexus-fabric-copy">Project DNA is the creative contract for this project. It stays on this device and guides suggestions; it does not silently alter clips.</p>
      <label>What is this project about?<textarea value={dna.purpose} onChange={e=>setDna({...dna,purpose:e.target.value})} placeholder="A short film, product story, quote poster, tutorial…"/></label>
      <label>Who should it speak to?<input value={dna.audience} onChange={e=>setDna({...dna,audience:e.target.value})} placeholder="Audience or community"/></label>
      <label>Visual identity<select value={dna.style} onChange={e=>setDna({...dna,style:e.target.value})}>{["Cinematic","Minimal","Documentary","Bold social","Editorial","Afrofuturist","Warm and human","Luxury","Playful"].map(v=><option key={v}>{v}</option>)}</select></label>
      <label>Colour / brand direction<input value={dna.palette} onChange={e=>setDna({...dna,palette:e.target.value})} placeholder="e.g. midnight blue, gold and cream"/></label>
      <label>Rules to preserve<textarea value={dna.rules} onChange={e=>setDna({...dna,rules:e.target.value})} placeholder="Keep quote wording exact; avoid fast cuts; use the same title style…"/></label>
      <button className="nexus-fabric-primary" onClick={saveDNA}><Check size={15}/> {saved?"DNA saved on this device":"Save project DNA"}</button>
    </div>}
    {tab==="intent" && <div className="nexus-fabric-body"><p className="nexus-fabric-copy">Describe the result you want. Fabric turns it into a transparent, reviewable plan using the tools already in NEXUS.</p><textarea className="nexus-fabric-intent" value={intent} onChange={e=>setIntent(e.target.value)} placeholder="Make this a powerful 30-second wisdom quote video with a cinematic opening, readable message and calm ending…"/>{plan.length>0&&<div className="nexus-fabric-plan"><b>Proposed creative direction</b>{plan.map((s,i)=><div key={i}><span>{i+1}</span>{s}</div>)}<small>Target: {selectedClipId?"selected clip":"all eligible clips"} · Nothing changes until you approve.</small>{operations.length>0?<><div className="nexus-fabric-operation-list"><b>Ready-to-apply operations</b>{operations.map((op,i)=><span key={i}>{op.kind==="add-title"?"Add editable title: "+op.text:op.kind==="apply-look"?"Apply "+op.filter+" look":"Apply "+op.transition+" transitions"}</span>)}</div><button className="nexus-fabric-primary" onClick={()=>{onApplyPlan(operations);setApproved(true);}}><Check size={15}/> {approved?"Apply again":"Approve & apply to timeline"}</button></>:<small>This request currently produces guidance only. Ask for a title, cinematic look or transition to create supported actions.</small>}</div>}</div>}
    {tab==="whatif" && <div className="nexus-fabric-body"><p className="nexus-fabric-copy">Explore different creative directions without replacing your current edit.</p><div className="nexus-fabric-universes">{["Cinematic","Documentary","Bold social","Minimal"].map(v=><button key={v} className={universe===v?"active":""} onClick={()=>setUniverse(v)}>{v}</button>)}</div><div className="nexus-fabric-universe-card"><WandSparkles size={22}/><b>{universe} universe</b><p>{({Cinematic:"Use contrast, deliberate pacing and a strong visual payoff. Preserve the core story and quote wording.",Documentary:"Prioritise natural footage, clear context, restrained transitions and an honest visual tone.","Bold social":"Prioritise an immediate hook, strong type hierarchy, short beats and high mobile readability.",Minimal:"Reduce effects and competing layers; let one image and one clear message carry the scene."})[universe]}</p><small>This is a direction preview, not a generated duplicate or a change to your timeline.</small></div></div>}
    <footer className="nexus-fabric-footer"><span>Existing tools remain in control</span><button onClick={onClose}>Return to editor <ArrowRight size={14}/></button></footer>
  </aside>;
}
