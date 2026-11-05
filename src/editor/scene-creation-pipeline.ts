import type { AudioPreset } from "./audio-sfx";
export type SceneCreationBrief = { title:string; visual:string; narration:string; searchTerms:string[]; duration?:number; audioCueType?:string };
export type SceneEngineAvailability = { imageConfigured:boolean; videoConfigured:boolean };
export type SceneGenerationRoute =
 | {engine:"image";route:"managed-image-worker";explanation:string}
 | {engine:"video";route:"managed-video-worker";explanation:string}
 | {engine:"video";route:"image-motion-fallback";explanation:string}
 | {engine:"image"|"video";route:"unavailable";explanation:string};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export function buildSceneVisualPrompt(scene:SceneCreationBrief,options:{style?:string;aspectRatio?:string;projectBrief?:string}={}):string {
 const visual=scene.visual.trim().slice(0,2400),narration=scene.narration.trim().slice(0,1200),terms=scene.searchTerms.filter(Boolean).slice(0,8).join(", ");
 return [
  "Create one coherent production-ready visual for the scene: "+scene.title.trim().slice(0,160)+".",
  "Scene visual direction: "+(visual||"Use the scene title and direct project brief to choose a relevant visual."),
  narration?"Narrative context (guide meaning, do not render as text): "+narration:"",
  terms?"Relevant visual concepts: "+terms+".":"",
  options.projectBrief?.trim()?"Overall project intent: "+options.projectBrief.trim().slice(0,1600):"",
  "Creative treatment: "+(options.style||"Cinematic")+".",
  "Composition / delivery frame: "+(options.aspectRatio||"16:9")+".",
  "Use a clear subject, intentional composition, believable lighting and visual continuity. Do not add typography, captions, logos, watermarks, UI, borders or invented brand marks.",
  "The scene image is a visual asset, not a finished video. Keep the result useful as a still frame that can be animated in the editor."
 ].filter(Boolean).join("\n");
}
export function resolveSceneGenerationRoute(engine:"image"|"video",availability:SceneEngineAvailability):SceneGenerationRoute {
 if(engine==="image")return availability.imageConfigured?{engine,route:"managed-image-worker",explanation:"Use the configured image model worker and import its verified image output."}:{engine,route:"unavailable",explanation:"The image model worker is not configured. Use licensed media, imported media or editable native graphics instead."};
 if(availability.videoConfigured)return{engine,route:"managed-video-worker",explanation:"Use the configured video generation worker and verify its returned video before importing."};
 if(availability.imageConfigured)return{engine,route:"image-motion-fallback",explanation:"No video model is configured. Generate a still image, then create an editable camera-motion scene locally; this is not model-generated video."};
 return{engine,route:"unavailable",explanation:"Neither a video model nor an image worker is configured. Keep the storyboard unchanged and use imported/licensed footage."};
}
export function validateGeneratedImage(blob:Blob,declaredMime="",maxBytes=10*1024*1024) {
 const mimeType=(blob.type||declaredMime).split(";")[0].trim().toLowerCase();
 if(!["image/png","image/jpeg","image/webp"].includes(mimeType))throw new Error("The generation worker did not return a supported PNG, JPEG or WebP image.");
 if(!blob.size||blob.size>maxBytes)throw new Error("The generated image is empty or larger than the editor's "+Math.round(maxBytes/1048576)+" MB import limit.");
 return{mimeType,extension:mimeType==="image/jpeg"?"jpg":mimeType.slice("image/".length)};
}
export function createSceneAudioPreset(scene:SceneCreationBrief):AudioPreset {
 const cue=(scene.audioCueType||"").toLowerCase(),words=[scene.title,scene.visual,scene.narration,...scene.searchTerms].join(" ").toLowerCase();
 const isEffect=/impact|hit|whoosh|transition|riser|stinger|sting|sfx/.test(cue),isAfrican=/afro|african|talking drum|highlife|amapiano/.test(words),isCinematic=/cinematic|trailer|dramatic|epic|suspense/.test(words),isAmbient=/ambient|calm|peaceful|reflection|meditation|nature/.test(words),isPiano=/piano|emotional|heartfelt|inspirational|wisdom|faith|hope/.test(words);
 const duration=clamp(Number(scene.duration)||8,.5,12);
 if(isEffect)return{name:scene.title+" · Original transition accent",category:"Scene accents",kind:"sfx",duration:Math.min(duration,3.5),recipe:/riser/.test(cue)?"sweep":"sweep"};
 return{name:scene.title+" · Original music bed",category:isAfrican?"African-inspired":isCinematic?"Cinematic":isAmbient?"Ambient":"Scene music",kind:"music",duration,recipe:isAmbient&&!isPiano?"ambience":"music"};
}
