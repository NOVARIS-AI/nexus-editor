export type EngineAdapter = { name: string; preferred: string; active: string; fallback: string; mode: "primary" | "fallback"; available: boolean; note: string };
export type EngineStack = { editing: EngineAdapter; audio: EngineAdapter; graphics: EngineAdapter; checkedAt: string };
function supportsWebGL(): boolean { if (typeof document === "undefined") return false; try { const c=document.createElement("canvas"); return !!(c.getContext("webgl2")||c.getContext("webgl")); } catch { return false; } }
function supportsCanvas():boolean{if(typeof document==="undefined")return false;try{return!!document.createElement("canvas").getContext("2d");}catch{return false;}}
export function detectEngineStack(): EngineStack {
 const browser=typeof window!=="undefined";
 const webCodecs=browser&&"VideoEncoder" in window&&"VideoDecoder" in window;
 const audioContext=browser&&(!!window.AudioContext||!!(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext);
 const webgl=supportsWebGL(); const canvas2d=supportsCanvas();
 return {
  checkedAt:new Date().toISOString(),
  editing:{name:"Editing Engine",preferred:"Canvas + MediaRecorder",active:"Canvas timeline compositor with HTML media decoding and supported layered effects",fallback:"native browser media playback",mode:canvas2d?"primary":"fallback",available:browser&&canvas2d,note:(webCodecs?"WebCodecs APIs are detected but no deterministic muxer is connected. ":"")+"Current export is real-time Canvas/MediaRecorder; exact frame scheduling, frame-accurate output and deterministic MP4 muxing are not guaranteed."},
  audio:{name:"Audio Engine",preferred:audioContext?"Web Audio API":"HTMLMediaElement audio",active:audioContext ? "Web Audio processing + selected-clip preview bus gain, mute and solo" : "HTMLMediaElement preview gain, mute and fade controls",fallback:"native browser audio playback",mode:audioContext?"primary":"fallback",available:browser,note:audioContext?"Web Audio processing and browser playback are available. Confirm individual effects in preview and export; external AI restoration and vocal isolation require a configured service.":"Using native media audio controls as the compatibility path; advanced processing requires Web Audio."},
  graphics:{name:"Graphics Engine",preferred:webgl?"Canvas 2D + SVG (WebGL detected)":"Canvas 2D + SVG",active:canvas2d ? "Canvas 2D image/text compositor + DOM/CSS preview" : "DOM/CSS text and preview filters",fallback:canvas2d?"Canvas 2D":"DOM/CSS",mode:canvas2d?"primary":"fallback",available:browser,note:webgl?"Canvas 2D image compositing, wrapped poster text, masks and filters are connected; WebGL is detected but is not currently the active compositor.":canvas2d?"Canvas 2D image compositing, wrapped poster text, masks and filters are connected.":"DOM/CSS overlays are the compatibility route."}
 };
}
export function trimClipAtPlayhead<T extends {start:number;sourceIn:number;sourceOut:number}>(clip:T,playhead:number):T|null { const point=clip.sourceIn+(playhead-clip.start); if(!Number.isFinite(point)||point<=clip.sourceIn+.04||point>=clip.sourceOut-.04)return null; return {...clip,sourceOut:point}; }
export function moveClip<T extends {id:string;start:number}>(clips:T[],id:string,delta:number):T[]{const target=clips.find(c=>c.id===id);if(!target)return clips;return clips.map(c=>c.id===id?{...c,start:Math.max(0,target.start+delta)}:c).sort((a,b)=>a.start-b.start);}
export function applyMediaElementGain(element:HTMLMediaElement,gain:number):void{element.volume=Math.min(1,Math.max(0,Number.isFinite(gain)?gain:1));}
export function getGraphicsFallbackStyle(_text:string,color:string,size:number,font:string):React.CSSProperties{return{color,fontSize:size,fontFamily:font,whiteSpace:"pre-wrap",textShadow:"0 2px 12px rgba(0,0,0,.65)"};}
