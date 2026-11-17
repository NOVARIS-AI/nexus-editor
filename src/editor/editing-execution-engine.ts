import type { MediaAsset, TimelineClip, TimelineTextLayer } from "../types";
import { clipDuration, clipSourceAtTimeline, speedAtSourceProgress } from "../project";
export type ExecutionOperation={kind:"add-title";text:string;start?:number;duration?:number;fontSize?:number;color?:string;fontFamily?:string;align?:"left"|"center"|"right";backgroundColor?:string;x?:number;y?:number;shadow?:boolean;animation?:"none"|"fade"|"pop";clipId?:string}|{kind:"apply-look";filter:string;clipId?:string}|{kind:"apply-transition";transition:"fade"|"zoom"|"wipe"|"slide"|"blur";clipId?:string}|{kind:"split-clip";clipId:string;time:number}|{kind:"move-text";textId:string;x:number;y:number};
export type ExecutionContext={assets:MediaAsset[];clips:TimelineClip[];textLayers:TimelineTextLayer[];selectedClipId?:string|null;playhead:number};
export type ExecutionPlan={accepted:ExecutionOperation[];rejected:{operation:ExecutionOperation;reason:string}[];summary:string;requiresApproval:true};
export function prepareExecutionPlan(operations:ExecutionOperation[],context:ExecutionContext):ExecutionPlan{
 const accepted:ExecutionOperation[]=[],rejected:ExecutionPlan["rejected"]=[];
 for(const op of operations.slice(0,80)){
  const reject=(reason:string)=>rejected.push({operation:op,reason});
  if(op.kind==="move-text"){const layer=context.textLayers.find(item=>item.id===op.textId);if(!layer)reject("The target text layer no longer exists.");else if(!Number.isFinite(op.x)||!Number.isFinite(op.y)||op.x<0||op.x>100||op.y<0||op.y>100)reject("Text position must be between 0 and 100 percent.");else accepted.push({...op,x:Math.max(0,Math.min(100,op.x)),y:Math.max(0,Math.min(100,op.y))});continue;}
  if(op.kind==="add-title"){const start=op.start??context.playhead,duration=op.duration??5;if(!op.text.trim())reject("Title text is empty.");else if(!Number.isFinite(start)||start<0||!Number.isFinite(duration)||duration<=0||duration>600)reject("Title timing is outside the supported range.");else if(op.text.length>700)reject("Title exceeds the 700-character editor limit.");else accepted.push({...op,text:op.text.trim(),start,duration,fontSize:Math.max(12,Math.min(180,op.fontSize??64))});continue;}
  const targetId=op.kind==="split-clip"?op.clipId:(op.clipId||context.selectedClipId),clip=context.clips.find(item=>item.id===targetId);
  if(!clip){reject("The target timeline clip no longer exists.");continue;}
  const asset=context.assets.find(item=>item.id===clip.assetId);
  if(!asset){reject("The target clip has no available media asset.");continue;}
  if(op.kind==="split-clip"){const end=clip.start+clipDuration(clip);if(!Number.isFinite(op.time)||op.time<=clip.start+.04||op.time>=end-.04){reject("The split point must be safely inside the selected clip.");continue;}}
  else if(asset.kind==="audio"){reject("Visual treatments can only target image or video clips.");continue;}
  if(op.kind==="apply-look"&&!op.filter.trim()){reject("A filter name is required.");continue;}
  accepted.push(op);
 }
 if(operations.length>80)for(const op of operations.slice(80))rejected.push({operation:op,reason:"Execution plans are limited to 80 operations."});
 return{accepted,rejected,summary:accepted.length+" operation(s) ready"+(rejected.length?"; "+rejected.length+" require correction":"")+". Nothing is applied until the user approves.",requiresApproval:true};
}
export function splitTimelineClipAtTime(clip:TimelineClip,time:number,rightId?:string):[TimelineClip,TimelineClip]{
 const offset=time-clip.start,length=clipDuration(clip),frameTolerance=.0001;
 if(!Number.isFinite(time)||offset<=frameTolerance||offset>=length-frameTolerance)throw new Error("Place the playhead inside the selected clip before splitting.");
 const sourcePoint=clipSourceAtTimeline(clip,offset);
 if(sourcePoint<=clip.sourceIn+.0001||sourcePoint>=clip.sourceOut-.0001)throw new Error("The split point is too close to the clip edge.");
 const sourceSpan=Math.max(.0001,clip.sourceOut-clip.sourceIn),progress=Math.max(0,Math.min(1,(sourcePoint-clip.sourceIn)/sourceSpan));
 let leftCurve=clip.speedCurve,rightCurve=clip.speedCurve;
 if(clip.speedCurve?.length){
  const boundarySpeed=speedAtSourceProgress(clip,progress);
  const points=[...clip.speedCurve].filter(point=>Number.isFinite(point.position)&&Number.isFinite(point.speed)).sort((a,b)=>a.position-b.position);
  const leftPoints=[...points.filter(point=>point.position<progress),{position:progress,speed:boundarySpeed}];
  const rightPoints=[{position:0,speed:boundarySpeed},...points.filter(point=>point.position>progress).map(point=>({position:(point.position-progress)/Math.max(.0001,1-progress),speed:point.speed}))];
  leftCurve=leftPoints.map(point=>({position:Math.max(0,Math.min(1,point.position/progress)),speed:point.speed}));
  rightCurve=rightPoints.map(point=>({position:Math.max(0,Math.min(1,point.position)),speed:point.speed}));
 }
 const splitOffset=Math.max(0,Math.min(length,offset));
 const leftKeyframes=clip.keyframes?.filter(frame=>frame.time<=splitOffset+frameTolerance);
 const rightKeyframes=clip.keyframes?.filter(frame=>frame.time>=splitOffset-frameTolerance).map(frame=>({...frame,time:Math.max(0,frame.time-splitOffset)}));
 const left:TimelineClip={...clip,sourceOut:sourcePoint,speedCurve:leftCurve,fadeOut:0,transitionOut:0,keyframes:leftKeyframes?.length?leftKeyframes:undefined};
 const right:TimelineClip={...clip,id:rightId||clip.id+"-split-"+Math.round(time*1000),start:time,sourceIn:sourcePoint,speedCurve:rightCurve,fadeIn:0,transitionIn:0,label:clip.label+" · split",keyframes:rightKeyframes?.length?rightKeyframes:undefined};
 return[left,right];
}