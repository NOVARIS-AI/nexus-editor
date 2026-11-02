export type NexusJobState = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type NexusEngineJob = { id:string; engine:"image"|"video"|"audio"|"render"; state:NexusJobState; progress:number; message:string; output?:{url?:string;mimeType?:string;assetId?:string}; error?:string };
export async function getEngineStatus(signal?:AbortSignal) {
 const response = await fetch("/api/engine-status",{signal,headers:{Accept:"application/json"}});
 if(!response.ok) throw new Error("NEXUS engine status is unavailable ("+response.status+").");
 return response.json() as Promise<{brain:{configured:boolean;model?:string};engines:Record<string,{configured:boolean;provider:string;fallback:string}>}>;
}
export async function submitEngineJob(engine:NexusEngineJob["engine"],prompt:string,options:Record<string,unknown>={},signal?:AbortSignal):Promise<NexusEngineJob>{
 const response=await fetch("/api/engine-jobs",{method:"POST",signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({engine,prompt,options})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok) throw new Error(data.error||"NEXUS "+engine+" engine is not ready ("+response.status+").");
 return data as NexusEngineJob;
}
export async function getEngineJob(id:string,signal?:AbortSignal):Promise<NexusEngineJob>{
 const response=await fetch("/api/engine-jobs?id="+encodeURIComponent(id),{signal,headers:{Accept:"application/json"}});
 const data=await response.json().catch(()=>({}));
 if(!response.ok) throw new Error(data.error||"Could not check the generation job.");
 return data as NexusEngineJob;
}
