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
export async function getEngineJob(engine:NexusEngineJob["engine"],id:string,signal?:AbortSignal):Promise<NexusEngineJob>{
 const response=await fetch("/api/engine-jobs?engine="+encodeURIComponent(engine)+"&id="+encodeURIComponent(id),{signal,headers:{Accept:"application/json"}});
 const data=await response.json().catch(()=>({}));
 if(!response.ok) throw new Error(data.error||"Could not check the generation job.");
 return data as NexusEngineJob;
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
        ["image", "video", "audio"].includes(item.engine) &&
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
      .map(({ id, engine, state, progress, message, output, error, sceneTitle }) => ({
        id, engine, state, progress: Math.max(0, Math.min(100, Number(progress) || 0)),
        message: String(message || "").slice(0, 500),
        ...(output?.url ? { output: { url: output.url, mimeType: output.mimeType, assetId: output.assetId } } : {}),
        ...(error ? { error: String(error).slice(0, 1000) } : {}),
        sceneTitle: String(sceneTitle || "Generated media").slice(0, 160)
      }));
    localStorage.setItem(JOB_HISTORY_KEY, JSON.stringify(safe));
  } catch {
    // Storage can be disabled or full; generation itself must remain usable.
  }
}
