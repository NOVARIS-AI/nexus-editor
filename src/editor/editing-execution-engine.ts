import type { MediaAsset, TimelineClip, TimelineTextLayer } from "../types";
export type ExecutionOperation={kind:"add-title";text:string;start?:number;duration?:number;fontSize?:number;color?:string;clipId?:string}|{kind:"apply-look";filter:string;clipId?:string}|{kind:"apply-transition";transition:"fade"|"zoom"|"wipe"|"slide"|"blur";clipId?:string}|{kind:"split-clip";clipId:string;time:number};
export type ExecutionContext={assets:MediaAsset[];clips:TimelineClip[];textLayers:TimelineTextLayer[];selectedClipId?:string|null;playhead:number};
export type ExecutionPlan={accepted:ExecutionOperation[];rejected:{operation:ExecutionOperation;reason:string}[];summary:string;requiresApproval:true};
export function prepareExecutionPlan(operations:ExecutionOperation[],context:ExecutionContext):ExecutionPlan{
 const accepted:ExecutionOperation[]=[],rejected:ExecutionPlan["rejected"]=[];
 for(const op of operations.slice(0,80)){
  const reject=(reason:string)=>rejected.push({operation:op,reason});
  if(op.kind==="add-title"){const start=op.start??context.playhead,duration=op.duration??5;if(!op.text.trim())reject("Title text is empty.");else if(!Number.isFinite(start)||start<0||!Number.isFinite(duration)||duration<=0||duration>600)reject("Title timing is outside the supported range.");else if(op.text.length>700)reject("Title exceeds the 700-character editor limit.");else accepted.push({...op,text:op.text.trim(),start,duration,fontSize:Math.max(12,Math.min(180,op.fontSize??64))});continue;}
  const targetId=op.kind==="split-clip"?op.clipId:(op.clipId||context.selectedClipId),clip=context.clips.find(item=>item.id===targetId);
  if(!clip){reject("The target timeline clip no longer exists.");continue;}
  const asset=context.assets.find(item=>item.id===clip.assetId);
  if(!asset){reject("The target clip has no available media asset.");continue;}
  if(op.kind==="split-clip"){const end=clip.start+(clip.sourceOut-clip.sourceIn)/(clip.speed||1);if(!Number.isFinite(op.time)||op.time<=clip.start+.08||op.time>=end-.08){reject("The split point must be safely inside the selected clip.");continue;}}
  else if(asset.kind==="audio"){reject("Visual treatments can only target image or video clips.");continue;}
  if(op.kind==="apply-look"&&!op.filter.trim()){reject("A filter name is required.");continue;}
  accepted.push(op);
 }
 if(operations.length>80)for(const op of operations.slice(80))rejected.push({operation:op,reason:"Execution plans are limited to 80 operations."});
 return{accepted,rejected,summary:accepted.length+" operation(s) ready"+(rejected.length?"; "+rejected.length+" require correction":"")+". Nothing is applied until the user approves.",requiresApproval:true};
}
export function splitTimelineClipAtTime(clip:TimelineClip,time:number):[TimelineClip,TimelineClip]{
 const speed=Math.max(.1,Number(clip.speed)||1),sourcePoint=clip.sourceIn+Math.max(0,time-clip.start)*speed;
 return[{...clip,sourceOut:sourcePoint,fadeOut:0,transitionOut:0},{...clip,id:clip.id+"-split-"+Math.round(time*1000),start:time,sourceIn:sourcePoint,fadeIn:0,transitionIn:0,label:clip.label+" · split"}];
}