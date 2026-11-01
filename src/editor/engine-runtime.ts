export type EngineAdapter = { name: string; active: string; fallback: string; mode: "primary" | "fallback"; available: boolean; note: string };
export type EngineStack = { editing: EngineAdapter; audio: EngineAdapter; graphics: EngineAdapter; checkedAt: string };
function supportsWebGL(): boolean { if (typeof document === "undefined") return false; try { const c=document.createElement("canvas"); return !!(c.getContext("webgl2")||c.getContext("webgl")); } catch { return false; } }
export function detectEngineStack(): EngineStack {
 const browser=typeof window!=="undefined";
 const webCodecs=browser&&"VideoEncoder" in window&&"VideoDecoder" in window;
 const audioContext=browser&&(!!window.AudioContext||!!(window as typeof window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext);
 const webgl=supportsWebGL(); const canvas2d=typeof document!=="undefined"&&!!document.createElement("canvas").getContext("2d");
 return {
  editing:{name:"Editing Engine",active:webCodecs?"WebCodecs adapter":"HTML media adapter",fallback:webCodecs?"HTML media adapter":"browser-native media playback",mode:webCodecs?"primary":"fallback",available:browser,note:webCodecs?"WebCodecs detected; timeline composition and MP4 muxing remain separate tasks.":"Using native browser media playback; frame-accurate export is not available yet."},
  audio:{name:"Audio Engine",active:audioContext?"Web Audio API":"HTMLMediaElement audio",fallback:audioContext?"HTMLMediaElement audio":"browser-native audio playback",mode:audioContext?"primary":"fallback",available:browser,note:audioContext?"Web Audio is available for gain, mixing and effects integration.":"Using native media audio controls as the compatibility fallback."},
  graphics:{name:"Graphics Engine",active:webgl?"WebGL":canvas2d?"Canvas 2D":"DOM/CSS",fallback:webgl?"Canvas 2D / DOM-CSS":"DOM/CSS",mode:webgl?"primary":"fallback",available:webgl||canvas2d||browser,note:webgl?"WebGL detected; Canvas 2D and DOM/CSS remain the fallback path.":canvas2d?"Canvas 2D selected as the graphics fallback.":"DOM/CSS overlays selected as the compatibility fallback."}
 };
}
export function trimClipAtPlayhead<T extends {start:number;sourceIn:number;sourceOut:number}>(clip:T,playhead:number):T|null { const point=clip.sourceIn+(playhead-clip.start); if(!Number.isFinite(point)||point<=clip.sourceIn+.04||point>=clip.sourceOut-.04)return null; return {...clip,sourceOut:point}; }
export function moveClip<T extends {id:string;start:number}>(clips:T[],id:string,delta:number):T[]{const target=clips.find(c=>c.id===id);if(!target)return clips;return clips.map(c=>c.id===id?{...c,start:Math.max(0,target.start+delta)}:c).sort((a,b)=>a.start-b.start);}
export function applyMediaElementGain(element:HTMLMediaElement,gain:number):void{element.volume=Math.min(1,Math.max(0,Number.isFinite(gain)?gain:1));}
export function getGraphicsFallbackStyle(_text:string,color:string,size:number,font:string):React.CSSProperties{return{color,fontSize:size,fontFamily:font,whiteSpace:"pre-wrap",textShadow:"0 2px 12px rgba(0,0,0,.65)"};}
