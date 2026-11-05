import type {MediaAsset,TimelineClip} from "../types";
type TranscriptSegment={start:number;end:number;text:string};
type BeatMarker={assetId:string;time:number};
type SuggestedOperation={kind:"add-title";text:string;start:number;duration:number;fontSize:number;fontFamily:string;color:string;backgroundColor:string;align:"center";x:number;y:number;shadow:boolean;animation:"fade"}|{kind:"split-clip";clipId:string;time:number}|{kind:"apply-transition";clipId:string;transition:"fade"|"zoom"|"wipe"|"slide"|"blur"}|{kind:"apply-look";clipId:string;filter:string};
export type MessageAwareSuggestion={id:string;title:string;detail:string;evidence:string;time:number;confidence:"high"|"medium"|"low";operation?:SuggestedOperation};
export function buildMessageAwarePlan(input:{assets:MediaAsset[];clips:TimelineClip[];transcriptSegments:TranscriptSegment[];beatMarkers:BeatMarker[]}):MessageAwareSuggestion[]{
 const out:MessageAwareSuggestion[]=[];
 const segments=input.transcriptSegments.filter(s=>Number.isFinite(s.start)&&Number.isFinite(s.end)&&s.end>s.start&&s.text.trim()).slice(0,80);
 for(const [index,s] of segments.entries()){
  const text=s.text.trim().slice(0,180);
  out.push({id:"caption-"+index,title:"Create editable caption",detail:"Use this spoken segment as a timed caption; check line breaks and reading speed.",evidence:"Transcript: "+text,time:s.start,confidence:"high",operation:{kind:"add-title",text,start:s.start,duration:Math.max(1,s.end-s.start),fontSize:36,fontFamily:"Arial",color:"#ffffff",backgroundColor:"rgba(8,12,22,0.72)",align:"center",x:50,y:78,shadow:true,animation:"fade"}});
 }
 for(let i=1;i<segments.length;i++){
  const previous=segments[i-1],current=segments[i],gap=current.start-previous.end;
  if(gap<.8)continue;
  const clip=input.clips.find(item=>{const end=item.start+(item.sourceOut-item.sourceIn)/(item.speed||1);return !item.speedCurve?.length&&item.start+.12<previous.end&&end-.12>current.start;});
  if(clip)out.push({id:"pause-"+i,title:"Review possible pause cut",detail:"A transcript timing gap of "+gap.toFixed(1)+" seconds may contain a pause. Listen before trimming.",evidence:"Adjacent transcript timestamps",time:previous.end,confidence:"medium",operation:{kind:"split-clip",clipId:clip.id,time:previous.end}});
 }
 for(const marker of input.beatMarkers.slice(0,120)){
  const audio=input.clips.find(clip=>clip.assetId===marker.assetId&&marker.time>=clip.sourceIn&&marker.time<=clip.sourceOut);
  if(!audio)continue;
  const time=audio.start+(marker.time-audio.sourceIn)/(audio.speed||1);
  const visual=input.clips.find(clip=>{const asset=input.assets.find(a=>a.id===clip.assetId);return asset&&(asset.kind==="image"||asset.kind==="video")&&time>=clip.start&&time<clip.start+(clip.sourceOut-clip.sourceIn)/(clip.speed||1);});
  if(visual)out.push({id:"beat-"+marker.assetId+"-"+marker.time,title:"Align transition with music beat",detail:"A detected audio transient maps to this visual scene. Preview the beat; transient detection is approximate.",evidence:"Audio beat candidate mapped through its timeline clip",time,confidence:"medium",operation:{kind:"apply-transition",clipId:visual.id,transition:"fade"}});
 }
 return out.sort((a,b)=>a.time-b.time).slice(0,100);
}
