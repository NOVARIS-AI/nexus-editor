import type {MediaAsset,TimelineClip} from "../types";
type BeatMarker={assetId:string;time:number};
type SuggestedOperation={kind:"apply-transition";clipId:string;transition:"fade"|"zoom"|"wipe"|"slide"|"blur"};
export type MessageAwareSuggestion={id:string;title:string;detail:string;evidence:string;time:number;confidence:"high"|"medium"|"low";operation?:SuggestedOperation};
export function buildMessageAwarePlan(input:{assets:MediaAsset[];clips:TimelineClip[];beatMarkers:BeatMarker[]}):MessageAwareSuggestion[]{
 const out:MessageAwareSuggestion[]=[];
 for(const marker of input.beatMarkers.slice(0,120)){
  if(!Number.isFinite(marker.time)||marker.time<0)continue;
  const audio=input.clips.find(clip=>clip.assetId===marker.assetId&&marker.time>=clip.sourceIn&&marker.time<=clip.sourceOut);
  if(!audio)continue;
  const time=audio.start+(marker.time-audio.sourceIn)/(audio.speed||1);
  const visual=input.clips.find(clip=>{const asset=input.assets.find(a=>a.id===clip.assetId);return asset&&(asset.kind==="image"||asset.kind==="video")&&time>=clip.start&&time<clip.start+(clip.sourceOut-clip.sourceIn)/(clip.speed||1);});
  if(visual)out.push({id:"beat-"+marker.assetId+"-"+marker.time,title:"Align transition with music beat",detail:"A detected audio transient maps to this visual scene. Preview the beat; transient detection is approximate.",evidence:"Audio beat candidate mapped through its timeline clip",time,confidence:"medium",operation:{kind:"apply-transition",clipId:visual.id,transition:"fade"}});
 }
 return out.sort((a,b)=>a.time-b.time).slice(0,100);
}
