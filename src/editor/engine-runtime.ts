export type EngineAdapter = { name: string; preferred: string; active: string; fallback: string; mode: "primary" | "fallback"; available: boolean; note: string };
export type EngineStack = { editing: EngineAdapter; audio: EngineAdapter; graphics: EngineAdapter; checkedAt: string };
function supportsWebGL(): boolean { if (typeof document === "undefined") return false; try { const c=document.createElement("canvas"); return !!(c.getContext("webgl2")||c.getContext("webgl")); } catch { return false; } }
export function detectEngineStack(): EngineStack {
 const browser=typeof window!=="undefined";
 const webCodecs=browser&&"VideoEncoder" in window&&"VideoDecoder" in window;
 const audioContext=browser&&(!!window.AudioContext||!!(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext);
 const webgl=supportsWebGL(); const canvas2d=typeof document!=="undefined"&&!!document.createElement("canvas").getContext("2d");
 return {
  checkedAt:new Date().toISOString(),
  editing:{name:"Editing Engine",preferred:webCodecs?"WebCodecs":"HTMLMediaElement",active:"HTMLMediaElement preview + Canvas/MediaRecorder timeline renderer with clip-speed playback",fallback:"native browser video/audio playback",mode:"fallback",available:browser,note:webCodecs?"WebCodecs is detected but not connected to deterministic frame rendering or MP4 muxing; the current browser renderer applies clip speed and timeline compositing.":"The browser renderer applies clip speed and timeline compositing; frame-accurate export is not available yet."},
  audio:{name:"Audio Engine",preferred:audioContext?"Web Audio API":"HTMLMediaElement audio",active:audioContext ? "Web Audio export processing + live preview bus gain, mute and solo" : "HTMLMediaElement preview gain, mute and fade controls",fallback:"native browser audio playback",mode:audioContext?"primary":"fallback",available:browser,note:audioContext?"Bus volume, mute and solo are connected to selected-clip preview; EQ, compression, noise gate and stereo pan are applied during export.":"Using native media audio controls as the compatibility path; advanced processing requires Web Audio."},
  graphics:{name:"Graphics Engine",preferred:webgl?"WebGL":canvas2d?"Canvas 2D":"DOM/CSS",active:canvas2d ? "Canvas 2D image/text compositor + DOM/CSS preview" : "DOM/CSS text and preview filters",fallback:canvas2d?"Canvas 2D":"DOM/CSS",mode:canvas2d?"primary":"fallback",available:webgl||canvas2d||browser,note:webgl?"Canvas 2D image compositing, wrapped poster text, masks and filters are connected; WebGL remains available for a future shader upgrade.":canvas2d?"Canvas 2D image compositing, wrapped poster text, masks and filters are connected.":"DOM/CSS overlays are the compatibility route."}
 };
}
export function trimClipAtPlayhead<T extends {start:number;sourceIn:number;sourceOut:number}>(clip:T,playhead:number):T|null { const point=clip.sourceIn+(playhead-clip.start); if(!Number.isFinite(point)||point<=clip.sourceIn+.04||point>=clip.sourceOut-.04)return null; return {...clip,sourceOut:point}; }
export function moveClip<T extends {id:string;start:number}>(clips:T[],id:string,delta:number):T[]{const target=clips.find(c=>c.id===id);if(!target)return clips;return clips.map(c=>c.id===id?{...c,start:Math.max(0,target.start+delta)}:c).sort((a,b)=>a.start-b.start);}
export function applyMediaElementGain(element:HTMLMediaElement,gain:number):void{element.volume=Math.min(1,Math.max(0,Number.isFinite(gain)?gain:1));}
export function getGraphicsFallbackStyle(_text:string,color:string,size:number,font:string):React.CSSProperties{return{color,fontSize:size,fontFamily:font,whiteSpace:"pre-wrap",textShadow:"0 2px 12px rgba(0,0,0,.65)"};}
