export type NexusJobState = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type NexusEngineJob = { id:string; engine:"image"|"video"|"audio"|"render"|"remotion"|"hyperframes"|"ffmpeg"|"ytdlp"; state:NexusJobState; progress:number; message:string; output?:{url?:string;mimeType?:string;assetId?:string}; metadata?:Record<string,unknown>; error?:string };
export type NexusWorkerHealth = { ok:boolean; status:"online"|"unavailable"; message:string; provider?:string; checkedAt:number };
export type NexusEngineCapability = { configured:boolean; verified?:boolean; status?:"ready"|"configured-unverified"|"fallback"; provider:string; fallback:string; capabilities?:string[]; note?:string };
export type NexusEngineStatus = {
  brain:{configured:boolean;provider?:string|null;model?:string|null};
  providers?:Record<string,unknown>;
  engines:Record<string,NexusEngineCapability>;
  capabilityDiscovery?:{meaning:string;verification:string};
};
const JOB_STATES = ["queued","running","succeeded","failed","cancelled"] as const;
function parseEngineJob(value:unknown, expectedEngine?:NexusEngineJob["engine"]):NexusEngineJob {
  if(!value || typeof value!=="object") throw new Error("The NEXUS worker returned an invalid job record.");
  const data=value as Record<string,unknown>;
  if(typeof data.id!=="string" || !data.id || data.id.length>180 || !JOB_STATES.includes(data.state as typeof JOB_STATES[number])) {
    throw new Error("The NEXUS worker returned an invalid job id or state.");
  }
  const engine=String(data.engine||expectedEngine||"");
  if(!["image","video","audio","render","remotion","hyperframes","ffmpeg","ytdlp"].includes(engine) || (expectedEngine && engine!==expectedEngine)) {
    throw new Error("The NEXUS worker returned a job for the wrong engine.");
  }
  const output=data.output && typeof data.output==="object" ? data.output as Record<string,unknown> : undefined;
  return {
    id:data.id, engine:engine as NexusEngineJob["engine"], state:data.state as NexusEngineJob["state"],
    progress:Math.max(0,Math.min(100,Number(data.progress)||0)),
    message:String(data.message||data.state).slice(0,500),
    ...(output && typeof output.url==="string" ? {output:{url:output.url,mimeType:typeof output.mimeType==="string"?output.mimeType:undefined,assetId:typeof output.assetId==="string"?output.assetId:undefined}} : {}),
    ...(data.metadata && typeof data.metadata==="object" ? {metadata:data.metadata as Record<string,unknown>} : {}),
    ...(typeof data.error==="string" ? {error:data.error.slice(0,1000)} : {})
  };
}
export async function checkNexusWorker(signal?:AbortSignal):Promise<NexusWorkerHealth>{
 const response=await fetch("/api/nexus-worker",{method:"GET",signal,headers:{Accept:"application/json", "Cache-Control":"no-cache"}});
 const data=await response.json().catch(()=>({}));
 if(!response.ok || data.ok!==true) return {ok:false,status:"unavailable",message:String(data.error||"The Cloudflare Worker health check failed."),provider:data.provider,checkedAt:Date.now()};
 return {ok:true,status:"online",message:"Cloudflare Worker is reachable and its health endpoint is responding.",provider:data.provider||"cloudflare-workers-ai",checkedAt:Date.now()};
}
export async function getEngineStatus(signal?:AbortSignal) {
 const response = await fetch("/api/engine-status",{signal,headers:{Accept:"application/json"}});
 if(!response.ok) throw new Error("NEXUS engine status is unavailable ("+response.status+").");
 return response.json() as Promise<{brain:{configured:boolean;model?:string};engines:Record<string,{configured:boolean;provider:string;fallback:string}>}>;
}
export async function submitEngineJob(engine:NexusEngineJob["engine"],prompt:string,options:Record<string,unknown>={},signal?:AbortSignal):Promise<NexusEngineJob>{
 const response=await fetch("/api/engine-jobs",{method:"POST",signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({engine,prompt,options})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok) throw new Error(data.error||"NEXUS "+engine+" engine is not ready ("+response.status+").");
 return parseEngineJob(data,engine);
}
export async function getEngineJob(engine:NexusEngineJob["engine"],id:string,signal?:AbortSignal):Promise<NexusEngineJob>{
 const response=await fetch("/api/engine-jobs?engine="+encodeURIComponent(engine)+"&id="+encodeURIComponent(id),{signal,headers:{Accept:"application/json"}});
 const data=await response.json().catch(()=>({}));
 if(!response.ok) throw new Error(data.error||"Could not check the generation job.");
 return parseEngineJob(data,engine);
}

const JOB_HISTORY_KEY = "nexus-editor-generation-jobs-v1";
const MAX_SAVED_JOBS = 30;

export type SavedNexusEngineJob = NexusEngineJob & { sceneTitle: string };

export function loadSavedGenerationJobs(): SavedNexusEngineJob[] {
  try {
    const raw = localStorage.getItem(JOB_HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedNexusEngineJob =>
      Boolean(item && typeof item === "object" &&
        typeof item.id === "string" && item.id.length <= 180 &&
        ["image", "video", "audio", "render", "remotion", "hyperframes", "ffmpeg", "ytdlp"].includes(item.engine) &&
        ["queued", "running", "succeeded", "failed", "cancelled"].includes(item.state) &&
        typeof item.sceneTitle === "string")
    ).slice(0, MAX_SAVED_JOBS);
  } catch {
    return [];
  }
}

export function saveGenerationJobs(jobs: SavedNexusEngineJob[]): void {
  try {
    const safe = jobs
      .filter(job => !job.id.startsWith("unavailable-"))
      .slice(0, MAX_SAVED_JOBS)
      .map(({ id, engine, state, progress, message, output, metadata, error, sceneTitle }) => ({
        id, engine, state, progress: Math.max(0, Math.min(100, Number(progress) || 0)),
        message: String(message || "").slice(0, 500),
        ...(output?.url ? { output: { url: output.url, mimeType: output.mimeType, assetId: output.assetId } } : {}),
        ...(metadata && JSON.stringify(metadata).length <= 4000 ? { metadata: JSON.parse(JSON.stringify(metadata)) } : {}),
        ...(error ? { error: String(error).slice(0, 1000) } : {}),
        sceneTitle: String(sceneTitle || "Generated media").slice(0, 160)
      }));
    localStorage.setItem(JOB_HISTORY_KEY, JSON.stringify(safe));
  } catch {
    // Storage can be disabled or full; generation itself must remain usable.
  }
}
