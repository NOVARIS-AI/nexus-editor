import { useMemo, useState } from "react";
import { Activity, ArrowRight, Check, GitBranch, Lightbulb, Sparkles, WandSparkles, X } from "lucide-react";
import type { MediaAsset, TimelineClip, TimelineImageLayer, TimelineTextLayer } from "../types";
import { captureVisualSamples, type VisualSample } from "./visual-sampling";
import { analyzeMediaAsset, type MediaAnalysis } from "./engines";
import { SEMANTIC_MODEL, getSemanticDeviceInfo, isSemanticModelLoaded, loadSemanticModel, rankBySemanticSimilarity } from "./semantic-brain";

export type FabricOperation = { kind: "add-title"; text: string; fontSize?: number; fontFamily?: string; color?: string; backgroundColor?: string; align?: "left" | "center" | "right"; x?: number; y?: number; duration?: number; start?: number; shadow?: boolean; animation?: "none" | "fade" | "pop" } | { kind: "apply-look"; filter: string; clipId?: string } | { kind: "apply-transition"; transition: "fade" | "zoom" | "wipe" | "slide" | "blur"; clipId?: string };
type Props = {
  projectName: string; aspectRatio: string; assets: MediaAsset[];
  clips: TimelineClip[]; textLayers: TimelineTextLayer[]; imageLayers: TimelineImageLayer[];
  transcriptSegments?: TranscriptSegment[]; beatMarkers?: BeatMarker[];
  selectedClipId?: string | null;
  onApplyPlan: (operations: FabricOperation[]) => void;
  onSeekTo: (time: number) => void;
  onClose: () => void;
};
type DNA = { purpose: string; audience: string; style: string; palette: string; rules: string };
const blankDNA: DNA = { purpose: "", audience: "", style: "Cinematic", palette: "Project colours", rules: "" };

type SemanticHit = { id: string; title: string; kind: string; time: number; score: number; detail: string };
type TranscriptSegment = { start:number; end:number; text:string };
type BeatMarker = { assetId:string; time:number };
const semanticGroups: Record<string,string[]> = {
  explanation: ["explain","explaining","teach","teaching","lesson","tutorial","how","guide","demonstration","main point","core message","message"],
  hook: ["hook","opening","intro","attention","start","first","stop scrolling","headline"],
  conclusion: ["conclusion","closing","ending","finish","final","summary","takeaway","call to action","cta"],
  evidence: ["evidence","proof","example","result","demonstrate","show","case study","fact"],
  emotion: ["emotion","emotional","feeling","heart","inspiring","inspiration","motivation","encouragement","hope"],
  faith: ["faith","wisdom","prayer","scripture","spiritual","gospel","church","belief","god","apostle"],
  product: ["product","business","brand","feature","showcase","sell","offer","service","review"],
  music: ["music","song","audio","beat","rhythm","sound","voice","speech","narration"]
};
function semanticTerms(query: string) {
  const words=query.toLowerCase().match(/[a-z0-9']+/g)||[];
  const expanded=new Set(words);
  for(const [concept,terms] of Object.entries(semanticGroups)) if(terms.some(term=>query.toLowerCase().includes(term))) { expanded.add(concept); terms.forEach(term=>expanded.add(term)); }
  return [...expanded].filter(word=>word.length>2);
}
function searchProjectMeaning(query: string, assets: MediaAsset[], clips: TimelineClip[], texts: TimelineTextLayer[], transcript: TranscriptSegment[], includeAll=false) : SemanticHit[] {
  const terms=semanticTerms(query); if(!terms.length&&!includeAll)return [];
  const records:(Omit<SemanticHit,"score">)[]=[
    ...clips.map(clip=>({id:clip.id,title:clip.aiScene?.title||clip.label||"Untitled scene",kind:"Scene",time:clip.start,detail:[clip.label,clip.aiScene?.title,clip.aiScene?.visual,clip.aiScene?.narration].filter(Boolean).join(" ")})),
    ...texts.map(layer=>({id:layer.id,title:layer.text.slice(0,76),kind:"Text / message",time:layer.start,detail:layer.text})),
    ...transcript.map((segment,index)=>({id:"transcript-"+index,title:segment.text.slice(0,76),kind:"Spoken transcript",time:segment.start,detail:segment.text})),
    ...assets.map(asset=>({id:asset.id,title:asset.name,kind:asset.kind==="audio"?"Audio source":"Media source",time:clips.find(clip=>clip.assetId===asset.id)?.start||0,detail:asset.name+" "+asset.kind}))
  ];
  return records.map(record=>{const hay=(record.title+" "+record.detail+" "+record.kind).toLowerCase();const matched=terms.filter(term=>hay.includes(term));const exact=matched.filter(term=>query.toLowerCase().includes(term)).length;return {...record,score:matched.length+exact*1.5};}).filter(item=>includeAll||item.score>0).sort((a,b)=>b.score-a.score).slice(0,160);
}
function understandQuote(value: string) {
  const q=value.toLowerCase();
  if(/faith|god|prayer|christ|scripture|wisdom|apostle|spirit/.test(q)) return {message:"Faith & wisdom",tone:"Reverent, thoughtful and assured",font:"Georgia",size:58,color:"#fff4d6",background:"rgba(12,18,35,0.72)",look:"Warm",transition:"fade" as const,layout:"Centred editorial"};
  if(/never give up|keep going|rise|courage|strong|overcome|dream|believe|hope|success/.test(q)) return {message:"Encouragement",tone:"Confident and uplifting",font:"Arial",size:62,color:"#ffffff",background:"rgba(10,14,28,0.62)",look:"Cinematic",transition:"zoom" as const,layout:"Bold centre"};
  if(/love|heart|care|kind|family|friend/.test(q)) return {message:"Connection",tone:"Warm and human",font:"Georgia",size:54,color:"#fff5ed",background:"rgba(48,24,32,0.58)",look:"Warm",transition:"fade" as const,layout:"Soft editorial"};
  if(/time|think|life|truth|learn|knowledge|choice|change/.test(q)) return {message:"Reflection",tone:"Calm and contemplative",font:"Georgia",size:56,color:"#f4f0e8",background:"rgba(13,18,28,0.68)",look:"Matte",transition:"fade" as const,layout:"Quiet centre"};
  return {message:"Core message",tone:"Clear and deliberate",font:"Arial",size:58,color:"#ffffff",background:"rgba(10,14,28,0.64)",look:"Cinematic",transition:"fade" as const,layout:"Readable centre"};
}

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

export function CreativeFabricPanel({ projectName, aspectRatio, assets, clips, textLayers, imageLayers, transcriptSegments = [], beatMarkers = [], selectedClipId, onApplyPlan, onSeekTo, onClose }: Props) {
  const [tab, setTab] = useState<"map"|"scenes"|"dna"|"intent"|"semantic"|"models"|"quote"|"whatif">("map");
  const [intent, setIntent] = useState("");
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticModelReady,setSemanticModelReady]=useState(isSemanticModelLoaded());
  const [semanticModelBusy,setSemanticModelBusy]=useState(false);
  const [semanticModelProgress,setSemanticModelProgress]=useState(0);
  const [semanticModelMessage,setSemanticModelMessage]=useState("Not downloaded · optional local model");
  const [semanticSearchBusy,setSemanticSearchBusy]=useState(false);
  const [semanticResults,setSemanticResults]=useState<(SemanticHit & {semanticScore:number})[]>([]);
  const [semanticSearchMode,setSemanticSearchMode]=useState<"keyword"|"embedding">("keyword");
  const [quoteText, setQuoteText] = useState("");
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
  const semanticHits = useMemo(()=>searchProjectMeaning(semanticQuery,assets,clips,textLayers,transcriptSegments),[semanticQuery,assets,clips,textLayers,transcriptSegments]);
  const semanticCorpus = useMemo(()=>searchProjectMeaning("",assets,clips,textLayers,transcriptSegments,true),[assets,clips,textLayers,transcriptSegments]);
  const deviceInfo = useMemo(()=>getSemanticDeviceInfo(),[]);
  const prepareSemanticModel = async () => {
    if(semanticModelBusy||semanticModelReady)return;
    setSemanticModelBusy(true);setSemanticModelProgress(0);setSemanticModelMessage("Downloading quantised embedding model…");
    try {
      await loadSemanticModel(event=>{if(typeof event.progress==="number")setSemanticModelProgress(Math.round(event.progress));if(event.file)setSemanticModelMessage("Preparing "+event.file.split("/").pop());});
      setSemanticModelReady(true);setSemanticModelProgress(100);setSemanticModelMessage("Loaded in this session. Model files are cached by the browser when storage permits.");
    } catch(error) {setSemanticModelMessage(error instanceof Error?error.message:"Model could not be loaded. Keyword search remains available.");}
    finally {setSemanticModelBusy(false);}
  };
  const runSemanticSearch = async () => {
    if(!semanticQuery.trim())return;
    if(!semanticModelReady){setSemanticSearchMode("keyword");return;}
    setSemanticSearchBusy(true);setSemanticSearchMode("embedding");
    try {
      const ranked=await rankBySemanticSimilarity(semanticQuery,semanticCorpus.map(hit=>({ ...hit, text:[hit.title,hit.detail,hit.kind].filter(Boolean).join(". ") })));
      setSemanticResults(ranked.map(({text:_text,...hit})=>hit));
    } catch(error) {setSemanticSearchMode("keyword");setSemanticModelMessage(error instanceof Error?error.message:"Semantic search failed; using keyword fallback.");}
    finally {setSemanticSearchBusy(false);}
  };
  const beatMoments = useMemo(()=>beatMarkers.flatMap(marker=>clips.filter(clip=>clip.assetId===marker.assetId && marker.time>=clip.sourceIn && marker.time<=clip.sourceOut).map(clip=>({time:clip.start+(marker.time-clip.sourceIn)/(clip.speed||1),asset:assets.find(a=>a.id===marker.assetId)?.name||"Audio",sourceTime:marker.time}))).sort((a,b)=>a.time-b.time).slice(0,16),[beatMarkers,clips,assets]);
  const pauseMoments = useMemo(()=>transcriptSegments.slice(1).flatMap((segment,index)=>{const previous=transcriptSegments[index];const gap=segment.start-previous.end;return gap>=0.8?[{time:previous.end,gap,text:previous.text+" → "+segment.text}]:[];}).slice(0,12),[transcriptSegments]);
  const quoteDesign = useMemo(()=>understandQuote(quoteText),[quoteText]);
  const operations = useMemo<FabricOperation[]>(()=>{
    if(!intent.trim()) return [];
    const q=intent.toLowerCase(); const result:FabricOperation[]=[];
    if(/title|headline|quote|caption|text|opening|intro|message/.test(q)) { const explicit=intent.match(/(?:title|quote|caption|message)\\s*:\\s*["“]?([^"”\\n]{3,90})/i)?.[1]?.trim(); const design=understandQuote(explicit||intent); result.push({kind:"add-title",text:explicit||"Your title",fontSize:design.size,fontFamily:design.font,color:design.color,backgroundColor:design.background,align:"center",x:50,y:50,shadow:true,animation:"fade"}); }
    const target=selectedClipId?{clipId:selectedClipId}:{};
    if(/cinematic|film|movie|dramatic/.test(q)) result.push({kind:"apply-look",filter:"Cinematic",...target});
    else if(/warm|golden|sunset|faith|wisdom|inspir|emotional/.test(q)) result.push({kind:"apply-look",filter:"Warm",...target});
    else if(/black.?and.?white|monochrome|noir/.test(q)) result.push({kind:"apply-look",filter:"B&W",...target});
    if(/transition|smooth|fade|emotional|reflect|calm|faith|wisdom|inspir|hook|energetic/.test(q)) result.push({kind:"apply-transition",transition:/energetic|bold|hook|attention|action/.test(q)?"zoom":"fade",...target});
    return result;
  },[intent,dna.purpose,projectName]);
  const saveDNA = () => { try { localStorage.setItem("nexus-fabric-dna:"+projectName,JSON.stringify(dna)); setSaved(true); } catch { setSaved(false); } };
  return <aside className="nexus-fabric-panel" role="dialog" aria-label="NEXUS Creative Fabric">
    <header className="nexus-fabric-head"><div className="nexus-fabric-mark"><GitBranch size={19}/></div><div><b>NEXUS CREATIVE FABRIC</b><small>PROJECT INTELLIGENCE LAYER · LOCAL FIRST</small></div><button onClick={onClose} aria-label="Close Creative Fabric"><X size={19}/></button></header>
    <div className="nexus-fabric-intro"><span><Sparkles size={14}/> CREATIVE WORLD MAP</span><h2>Your project, connected.</h2><p>Creative Fabric links your media, timeline beats and message layers so editing decisions can consider the whole project.</p></div>
    <nav className="nexus-fabric-tabs">{(["map","scenes","dna","intent","semantic","models","quote","whatif"] as const).map(k=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{({map:"World map",scenes:"Scenes",dna:"Project DNA",intent:"Intent",semantic:"Semantic search",models:"Model Centre",quote:"Quote intelligence",whatif:"What-if"})[k]}</button>)}</nav>
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
        <div><b>Visual contact sheet</b><small>Sample real frames locally — no upload or API key. Composition and text-safe-zone suggestions are contrast-based, not subject recognition.</small></div>
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
              <span>Suggested text-safe zone: {item.visual!.composition.quietZone.replace("-"," ")} · visual busyness {Math.round(item.visual!.composition.quietZoneBusyness*100)}%</span>
              <small>{item.visual!.composition.quietZoneBusyness<.18?"This area appears relatively calm in the sampled frame; test text contrast before placing typography.":"No clearly quiet region was found. Consider a subtle text backing or gradient, then check readability on the preview."}</small>
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
    {tab==="semantic" && <div className="nexus-fabric-body">
      <p className="nexus-fabric-copy">Search the meaning of your project, not only exact filenames. This local semantic layer searches scene notes, captions, asset names and available transcription segments. It expands related concepts; it does not yet recognise objects or actions inside raw footage.</p>
      <label className="nexus-fabric-semantic-search">What are you looking for?<input value={semanticQuery} onChange={e=>setSemanticQuery(e.target.value)} placeholder="e.g. where I explain the main point, the hopeful ending, the proof…"/></label>
      {!semanticModelReady&&<button className="nexus-fabric-primary" onClick={()=>setTab("models")}>Open Model Centre · Download semantic embeddings</button>}
      <div className="nexus-fabric-semantic-actions"><button onClick={()=>void runSemanticSearch()} disabled={!semanticQuery.trim()||semanticSearchBusy||!semanticModelReady}>{semanticSearchBusy?"Understanding meaning…":"Search by meaning"}</button><span>{semanticModelReady?"Embedding model active":"Keyword fallback active"}</span></div><div className="nexus-fabric-semantic-results">{semanticQuery.trim()?(semanticSearchMode==="embedding"?semanticResults:semanticHits).map(hit=><article key={hit.kind+"-"+hit.id}><div><b>{hit.title}</b><small>{hit.kind} · {hit.time.toFixed(1)}s · {semanticSearchMode==="embedding"?"semantic similarity "+("semanticScore" in hit?hit.semanticScore.toFixed(3):""):"keyword relevance "+hit.score.toFixed(1)}</small><p>{hit.detail||"Matched from the item name or type."}</p></div><div className="nexus-fabric-hit-actions"><button onClick={()=>onSeekTo(hit.time)}>Go to moment</button>{hit.kind==="Spoken transcript"&&<button onClick={()=>onApplyPlan([{kind:"add-title",text:hit.title,start:hit.time,duration:Math.max(2,Math.min(6,hit.title.trim().split(/\\s+/).length/2.5)),fontSize:36,fontFamily:"Arial",color:"#ffffff",backgroundColor:"rgba(8,12,22,0.72)",align:"center",x:50,y:78,shadow:true,animation:"fade"}])}>Create editable caption</button>}</div></article>):<div className="nexus-fabric-empty">Try a meaning, story role, topic or phrase. Results will appear here.</div>}{semanticQuery.trim()&&semanticSearchMode==="embedding"&&!semanticResults.length&&!semanticSearchBusy&&<div className="nexus-fabric-empty">No project records were available to compare yet.</div>}{semanticQuery.trim()&&semanticSearchMode==="keyword"&&!semanticHits.length&&<div className="nexus-fabric-empty">No matching project notes yet. Add scene descriptions or captions to make search richer.</div>}</div>
      <small className="nexus-fabric-scene-note">Search covers {transcriptSegments.length} available spoken segment(s). Keyword fallback uses local concept expansion. When the embedding model is active, results use vector similarity across project text and transcripts. Neither mode invents speech that has not been transcribed.</small>      <div className="nexus-fabric-semantic-tools">
        <section><b>Natural pause candidates</b><small>Potential edit points from transcript gaps (0.8 seconds or longer). Review the audio before trimming.</small>{pauseMoments.length?pauseMoments.map((item,index)=><article key={"pause-"+index}><span>{item.gap.toFixed(1)}s pause · {item.text.slice(0,110)}</span><button onClick={()=>onSeekTo(item.time)}>Review cut</button></article>):<p>No long transcript pauses detected yet. Transcribe an audio/video source to populate this.</p>}</section>
        <section><b>Music beat moments</b><small>Detected beat markers mapped from source-audio time to timeline time where the audio asset is used.</small>{beatMoments.length?beatMoments.map((item,index)=><article key={"beat-"+index}><span>{item.asset} · timeline {item.time.toFixed(2)}s</span><button onClick={()=>onSeekTo(item.time)}>Go to beat</button></article>):<p>No mapped beat markers yet. Run local beat analysis on an audio asset.</p>}</section>
      </div>
    </div>}

    {tab==="models" && <div className="nexus-fabric-body">
      <p className="nexus-fabric-copy">Manage optional local intelligence models. Downloads are initiated by you, cached by the browser where supported and run on this device. No paid API or account key is used.</p>
      <section className="nexus-model-card"><div className="nexus-model-card-head"><span>TEXT EMBEDDINGS</span><b>{semanticModelReady?"ACTIVE":"OPTIONAL DOWNLOAD"}</b></div><h3>{SEMANTIC_MODEL.name}</h3><p>{SEMANTIC_MODEL.description}</p><div className="nexus-model-facts"><span>Model <b>{SEMANTIC_MODEL.id}</b></span><span>Download <b>{SEMANTIC_MODEL.size}</b></span><span>Runtime <b>Transformers.js · ONNX · WASM</b></span><span>Tasks <b>Meaning search, transcript retrieval</b></span></div><div className="nexus-model-capabilities">{SEMANTIC_MODEL.strengths.map(item=><span key={item}>✓ {item}</span>)}</div><small>Limitations: {SEMANTIC_MODEL.limitations.join(" · ")}</small><div className="nexus-model-device"><b>Device compatibility</b><span>WebAssembly: {deviceInfo.webAssembly?"Available":"Unavailable"} · WebGPU: {deviceInfo.webGPU?"Available":"Not detected"} · Reported memory: {deviceInfo.deviceMemory?deviceInfo.deviceMemory+" GB":"Unknown"}</span><small>{deviceInfo.note}</small></div>{semanticModelBusy&&<div className="nexus-model-progress"><i style={{width:semanticModelProgress+"%"}}/></div>}<p className="nexus-model-status">{semanticModelMessage}</p><button className="nexus-fabric-primary" disabled={semanticModelBusy||semanticModelReady||!deviceInfo.compatible} onClick={()=>void prepareSemanticModel()}>{semanticModelBusy?"Downloading model "+semanticModelProgress+"%":semanticModelReady?"Model active":"Download & activate model"}</button></section>
      <section className="nexus-model-card"><div className="nexus-model-card-head"><span>VISUAL UNDERSTANDING</span><b>NOT INSTALLED</b></div><h3>Vision model slot</h3><p>Reserved for a downloadable vision-language model that can describe sampled frames and recognise relevant visual content. The current contrast-based frame analysis remains available and is not presented as object recognition.</p><small>No vision model is being downloaded or claimed as active in this milestone.</small></section>
      <section className="nexus-model-card"><div className="nexus-model-card-head"><span>STORY INTELLIGENCE</span><b>LOCAL ALGORITHMS</b></div><h3>Transcript and timeline analysis</h3><p>Available now: transcript segments, pauses, beat markers, timeline scene notes and editable caption layers. Deeper story summarisation and key-moment ranking will build on the embedding model next.</p></section>
    </div>}
    {tab==="quote" && <div className="nexus-fabric-body">
      <p className="nexus-fabric-copy">Quote Intelligence reads the wording you provide, estimates its message category and proposes a typography, tone and visual treatment. It preserves the exact quote text.</p>
      <label>Paste your quote<textarea className="nexus-fabric-quote-input" value={quoteText} onChange={e=>setQuoteText(e.target.value)} placeholder="Paste the exact quote here…"/></label>
      {quoteText.trim()&&<div className="nexus-fabric-quote-card"><span>MESSAGE PROFILE</span><b>{quoteDesign.message}</b><p>{quoteDesign.tone}</p><div className="nexus-fabric-quote-preview" style={{fontFamily:quoteDesign.font,fontSize:"clamp(18px,5vw,28px)",color:quoteDesign.color,background:quoteDesign.background,textAlign:"center"}}>{quoteText}</div><div className="nexus-fabric-quote-specs"><span>Typeface: {quoteDesign.font}</span><span>Layout: {quoteDesign.layout}</span><span>Suggested look: {quoteDesign.look}</span><span>Transition: {quoteDesign.transition}</span></div><small>Preview is a design direction. Check the actual canvas and text-safe zone before export.</small><button className="nexus-fabric-primary" onClick={()=>{onApplyPlan([{kind:"add-title",text:quoteText,fontSize:quoteDesign.size,fontFamily:quoteDesign.font,color:quoteDesign.color,backgroundColor:quoteDesign.background,align:"center",x:50,y:50,duration:Math.max(5,Math.min(12,quoteText.trim().split(/\\s+/).length/2.4)),shadow:true,animation:"fade"},{kind:"apply-look",filter:quoteDesign.look,...(selectedClipId?{clipId:selectedClipId}:{})},{kind:"apply-transition",transition:quoteDesign.transition,...(selectedClipId?{clipId:selectedClipId}:{})}]);setApproved(true);}}><Check size={15}/> Apply quote treatment to timeline</button></div>}
      <small className="nexus-fabric-scene-note">Message category and styling are heuristic suggestions, not a claim to know the author's intention. You can edit the resulting text layer and undo the operation.</small>
    </div>}
    {tab==="whatif" && <div className="nexus-fabric-body"><p className="nexus-fabric-copy">Explore different creative directions without replacing your current edit.</p><div className="nexus-fabric-universes">{["Cinematic","Documentary","Bold social","Minimal"].map(v=><button key={v} className={universe===v?"active":""} onClick={()=>setUniverse(v)}>{v}</button>)}</div><div className="nexus-fabric-universe-card"><WandSparkles size={22}/><b>{universe} universe</b><p>{({Cinematic:"Use contrast, deliberate pacing and a strong visual payoff. Preserve the core story and quote wording.",Documentary:"Prioritise natural footage, clear context, restrained transitions and an honest visual tone.","Bold social":"Prioritise an immediate hook, strong type hierarchy, short beats and high mobile readability.",Minimal:"Reduce effects and competing layers; let one image and one clear message carry the scene."})[universe]}</p><small>This is a direction preview, not a generated duplicate or a change to your timeline.</small></div></div>}
    <footer className="nexus-fabric-footer"><span>Existing tools remain in control</span><button onClick={onClose}>Return to editor <ArrowRight size={14}/></button></footer>
  </aside>;
}
