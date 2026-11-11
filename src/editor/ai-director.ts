export type DirectorPlan = { summary:string; engineTasks?:{engine:"remotion"|"hyperframes"|"ffmpeg"|"whisper"|"ytdlp";action:string;prompt:string;options?:Record<string,unknown>}[]; scenes:{title:string;visual:string;duration:number;narration:string;searchTerms:string[];assetMatches?:string[];matchReason?:string;overlayText?:string;referenceStart?:number;referenceEnd?:number;transitionStyle?:"fade"|"zoom"|"wipe"|"slide"|"blur"|"none";transitionDuration?:number;textX?:number;textY?:number;audioCueTime?:number;audioCueType?:string}[]; editPlan:{action:string;target:string;details:string}[]; assetNeeds:{kind:string;query:string;reason:string}[]; userReferenceNeeded:boolean };
export type DirectorEngineJob = {engine:string;state:"queued"|"running"|"succeeded"|"failed"|"unavailable";id?:string;message:string;progress?:number};
export async function askNexusDirector(brief:string,context:Record<string,unknown>,signal?:AbortSignal):Promise<{plan:DirectorPlan;model:string;provider:string;engineJobs?:DirectorEngineJob[]}> {
 const response=await fetch("/api/ai-director",{method:"POST",signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({brief,context})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok) throw new Error(data.error||"NEXUS AI Director is unavailable.");
 const tasks=Array.isArray(data.plan?.engineTasks)?data.plan.engineTasks:[];
 const engineJobs:DirectorEngineJob[]=[];
 // Speech recognition is already callable through the existing online-first/local Whisper pipeline.
 for(const task of tasks){
  if(task.engine==="whisper"){engineJobs.push({engine:"whisper",state:"succeeded",message:"Routed through the existing internal speech pipeline when source audio is available."});continue;}
  if(!["remotion","hyperframes","ffmpeg","ytdlp"].includes(task.engine))continue;
  try{
   const jobResponse=await fetch("/api/engine-jobs",{method:"POST",signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({engine:task.engine,prompt:task.prompt,options:{...(task.options&&typeof task.options==="object"?task.options:{}),action:task.action,source:"nexus-ai-director"}})});
   const job=await jobResponse.json().catch(()=>({}));
   if(!jobResponse.ok)throw new Error(job.error||"Internal execution service is not connected.");
   engineJobs.push({engine:task.engine,state:job.state||"queued",id:job.id,message:String(job.message||"Internal task accepted."),progress:Number(job.progress)||0});
  }catch(error){
   engineJobs.push({engine:task.engine,state:"unavailable",message:error instanceof Error?error.message:"Internal execution service is unavailable."});
  }
 }
 return {...data,engineJobs};
}
