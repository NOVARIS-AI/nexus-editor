import type {TimelineClip} from "../types";
import type {MediaAnalysis} from "./engines";
import type {VisualUnderstanding} from "./visual-brain";
export type VisualSceneEvidence={clipId:string;title:string;coverage:"model-described"|"frame-sampled"|"metrics-only"|"not-sampled";frameCount:number;confidence:"high"|"medium"|"low";descriptions:string[];compositionNote?:string;sceneChangeCount:number};
export function buildVisualSceneEvidence(clips:TimelineClip[],descriptions:VisualUnderstanding[],analyses:MediaAnalysis[]):VisualSceneEvidence[]{
 return [...clips].sort((a,b)=>a.start-b.start).map(clip=>{
  const frames=descriptions.filter(item=>item.assetId===clip.assetId),analysis=analyses.find(item=>item.assetId===clip.assetId),metrics=analysis?.visual;
  const coverage=frames.length?"model-described":metrics?.sampledFrames?"frame-sampled":analysis?"metrics-only":"not-sampled";
  const composition=metrics?.composition;
  const compositionNote=composition?"Contrast-weight centre near "+Math.round(composition.focusX)+"% across / "+Math.round(composition.focusY)+"% down; quieter sampled region: "+composition.quietZone+". Treat this as a placement hint, not subject detection.":undefined;
  return{clipId:clip.id,title:clip.aiScene?.title||clip.label,coverage,frameCount:frames.length||metrics?.sampledFrames||0,confidence:frames.length?"high":metrics?"medium":"low",descriptions:frames.slice(0,4).map(item=>item.description),compositionNote,sceneChangeCount:metrics?.sceneChanges.length||0};
 });
}
export function describeVisualCoverage(items:VisualSceneEvidence[]){return{totalScenes:items.length,modelDescribed:items.filter(item=>item.coverage==="model-described").length,frameSampled:items.filter(item=>item.coverage==="frame-sampled").length,metricsOnly:items.filter(item=>item.coverage==="metrics-only").length,notSampled:items.filter(item=>item.coverage==="not-sampled").length};}
