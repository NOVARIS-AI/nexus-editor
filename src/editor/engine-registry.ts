export type EngineId = "media" | "image" | "video" | "editing" | "graphics" | "color" | "vfx" | "motion3d" | "audio" | "export";
export type EngineState = "native" | "remote" | "fallback" | "unavailable";
export type EngineCapability = { id: EngineId; label: string; purpose: string; primary: string; fallback: string; execution: "browser" | "server" | "hybrid"; requiresCompute: boolean };
export const NEXUS_ENGINE_REGISTRY: EngineCapability[] = [
 {id:"media",label:"Media Asset Management",purpose:"Search, import, catalogue and license-check project assets.",primary:"Licensed online media connectors + local asset library",fallback:"Wikimedia Commons search + user imports",execution:"hybrid",requiresCompute:false},
 {id:"image",label:"Image Generation & Editing",purpose:"Generate and edit images, posters, thumbnails and backgrounds.",primary:"NEXUS-managed image model worker",fallback:"Editable SVG/Canvas graphics and sourced licensed images",execution:"hybrid",requiresCompute:true},
 {id:"video",label:"Video Generation",purpose:"Generate scenes and image-to-video clips for the project.",primary:"NEXUS-managed video model worker",fallback:"Licensed stock footage, user clips and animated native timeline scenes",execution:"server",requiresCompute:true},
 {id:"editing",label:"Video Editing & Timeline",purpose:"Trim, split, arrange, layer, keyframe and composite clips.",primary:"NEXUS timeline renderer / WebCodecs adapter",fallback:"HTMLMediaElement preview + Canvas/MediaRecorder where supported",execution:"browser",requiresCompute:false},
 {id:"graphics",label:"Vector Graphics & Illustration",purpose:"Editable vector shapes, titles, illustrations and layouts.",primary:"Canvas/WebGL graphics adapter",fallback:"SVG + Canvas 2D + DOM/CSS",execution:"browser",requiresCompute:false},
 {id:"color",label:"Colour Grading & HDR",purpose:"Colour correction, looks, exposure and tone mapping.",primary:"GPU shader colour pipeline",fallback:"CSS filters and Canvas 2D colour adjustments",execution:"browser",requiresCompute:false},
 {id:"vfx",label:"VFX & Compositing",purpose:"Masks, chroma key, overlays and visual compositing.",primary:"WebGL shader/compositing pipeline",fallback:"Canvas 2D layers, CSS blend modes and opacity",execution:"browser",requiresCompute:false},
 {id:"motion3d",label:"3D & Motion Graphics",purpose:"3D scenes, animated titles, camera moves and motion graphics.",primary:"WebGL/WebGPU scene adapter",fallback:"2D keyframed SVG/Canvas motion graphics",execution:"hybrid",requiresCompute:false},
 {id:"audio",label:"Audio Post-Production",purpose:"Voice, music, sound effects, mixing and cleanup.",primary:"Web Audio processing graph + optional NEXUS audio worker",fallback:"HTMLMediaElement playback, gain and fade controls",execution:"hybrid",requiresCompute:false},
 {id:"export",label:"Export & Delivery",purpose:"Render, encode, mux and package completed projects.",primary:"WebCodecs + MP4/WebM muxer or managed render worker",fallback:"Browser MediaRecorder WebM export",execution:"hybrid",requiresCompute:false}
];
export type EngineHealth = { id: EngineId; state: EngineState; active: string; fallback: string; ready: boolean; note: string };
export function getBrowserEngineHealth(): EngineHealth[] {
 const browser = typeof window !== "undefined";
 const canvas = browser && !!document.createElement("canvas").getContext("2d");
 const webgl = browser && (()=>{try{const c=document.createElement("canvas");return !!(c.getContext("webgl2")||c.getContext("webgl"));}catch{return false;}})();
 const webgpu = browser && "gpu" in navigator;
 const audio = browser && (!!window.AudioContext || !!(window as Window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext);
 const webCodecs = browser && "VideoEncoder" in window && "VideoDecoder" in window;
 return NEXUS_ENGINE_REGISTRY.map(engine => {
  if (engine.id === "media") return {id:engine.id,state:"fallback",active:"Wikimedia Commons + local imports",fallback:engine.fallback,ready:browser,note:"Online search is available when the source responds; verify each asset licence before use."};
  if (engine.id === "editing") return {id:engine.id,state:"fallback",active:webCodecs?"HTMLMediaElement preview; WebCodecs detected but not yet wired for rendering":"HTMLMediaElement + Canvas/MediaRecorder",fallback:engine.fallback,ready:browser,note:"Advanced frame-accurate multi-track rendering still requires integration."};
  if (engine.id === "graphics") return {id:engine.id,state:"native",active:webgl?"WebGL + Canvas 2D + SVG":"Canvas 2D + SVG + DOM/CSS",fallback:engine.fallback,ready:canvas,note:"Native graphics primitives available in this browser."};
  if (engine.id === "color" || engine.id === "vfx") return {id:engine.id,state:"fallback",active:webgl?"Canvas/CSS; WebGL detected for future shader pipeline":"Canvas 2D + CSS",fallback:engine.fallback,ready:canvas,note:"Advanced shader effects are not yet connected."};
  if (engine.id === "motion3d") return {id:engine.id,state:"fallback",active:webgpu?"Canvas/SVG; WebGPU detected":"SVG/Canvas 2D motion fallback",fallback:engine.fallback,ready:browser,note:"A full 3D scene engine is not yet connected."};
  if (engine.id === "audio") return {id:engine.id,state:audio?"native":"fallback",active:audio?"Web Audio API + native media playback":"HTMLMediaElement audio",fallback:engine.fallback,ready:audio,note:"Advanced restoration and mastering models require a configured worker."};
  if (engine.id === "export") return {id:engine.id,state:"fallback",active:webCodecs?"MediaRecorder; WebCodecs detected but muxing is not connected":"MediaRecorder WebM where supported",fallback:engine.fallback,ready:browser && "MediaRecorder" in window,note:"MP4 muxing and deterministic full multi-track export are not yet connected."};
  return {id:engine.id,state:"unavailable",active:"No NEXUS generation worker configured",fallback:engine.fallback,ready:false,note:"Requires NEXUS-managed model compute. The editor must not pretend a generation completed."};
 });
}
