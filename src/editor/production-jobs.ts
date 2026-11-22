export type ProductionRunState =
  | "awaiting-approval" | "queued" | "running" | "paused"
  | "review" | "completed" | "failed" | "cancelled";
export type ProductionSceneState = "pending" | "queued" | "running" | "succeeded" | "failed" | "skipped";
export type ProductionEngine = "image" | "video" | "audio" | "render" | "remotion" | "hyperframes" | "ffmpeg" | "ytdlp";

export interface ProductionScene {
  id: string;
  title: string;
  visual: string;
  narration?: string;
  duration: number;
  state: ProductionSceneState;
  progress: number;
  attempts: number;
  engine?: ProductionEngine;
  jobId?: string;
  outputUrl?: string;
  outputMimeType?: string;
  assetId?: string;
  sourceType?: "generated" | "commons" | "personal";
  sourcePageUrl?: string;
  sourceLicense?: string;
  sourceAttribution?: string;
  sourceCreator?: string;
  error?: string;
  reviewStatus?: "pending" | "approved" | "changes-requested";
  reviewNote?: string;
  updatedAt: number;
}
export interface ProductionCheckpoint {
  savedAt: number;
  completedSceneIds: string[];
  nextSceneId?: string;
  approvedPlan: boolean;
}
export interface NexusProductionRun {
  schemaVersion: 1;
  id: string;
  title: string;
  state: ProductionRunState;
  createdAt: number;
  updatedAt: number;
  approvedAt?: number;
  activeSceneId?: string;
  scenes: ProductionScene[];
  checkpoint: ProductionCheckpoint;
  error?: string;
}
export interface ProductionSceneInput {
  id?: string;
  title: string;
  visual: string;
  narration?: string;
  duration?: number;
}
const now = () => Date.now();
const makeId = () => typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID()
  : "production-" + now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);

export function createProductionRun(title: string, scenes: ProductionSceneInput[]): NexusProductionRun {
  const timestamp = now();
  const safeScenes = scenes.slice(0, 80).map((scene, index): ProductionScene => ({
    id: String(scene.id || makeId()).slice(0, 180),
    title: String(scene.title || "Scene " + (index + 1)).slice(0, 180),
    visual: String(scene.visual || "").slice(0, 4000),
    ...(scene.narration ? { narration: String(scene.narration).slice(0, 4000) } : {}),
    duration: Math.max(1, Math.min(120, Number(scene.duration) || 5)),
    state: "pending",
    progress: 0,
    attempts: 0,
    updatedAt: timestamp
  }));
  if (!safeScenes.length) throw new Error("A production needs at least one scene.");
  return {
    schemaVersion: 1,
    id: makeId(),
    title: String(title || "Untitled production").slice(0, 180),
    state: "awaiting-approval",
    createdAt: timestamp,
    updatedAt: timestamp,
    scenes: safeScenes,
    checkpoint: { savedAt: timestamp, completedSceneIds: [], nextSceneId: safeScenes[0].id, approvedPlan: false }
  };
}

function touch(run: NexusProductionRun, patch: Partial<NexusProductionRun> = {}): NexusProductionRun {
  return { ...run, ...patch, updatedAt: now() };
}
export function approveProductionPlan(run: NexusProductionRun): NexusProductionRun {
  if (run.state !== "awaiting-approval") throw new Error("Only a plan awaiting review can be approved.");
  const timestamp = now();
  return touch(run, { state: "queued", approvedAt: timestamp, checkpoint: { ...run.checkpoint, savedAt: timestamp, approvedPlan: true } });
}
export function startProductionRun(run: NexusProductionRun): NexusProductionRun {
  if (run.state !== "queued" && run.state !== "paused") throw new Error("Only a queued or paused production can start.");
  return touch(run, { state: "running", error: undefined });
}
export function pauseProductionRun(run: NexusProductionRun): NexusProductionRun {
  if (run.state !== "running") throw new Error("Only a running production can be paused.");
  return touch(run, { state: "paused", checkpoint: { ...run.checkpoint, savedAt: now() } });
}
export function sendProductionToReview(run: NexusProductionRun): NexusProductionRun {
  if (run.scenes.some(scene => scene.state !== "succeeded" && scene.state !== "skipped")) throw new Error("Every scene must finish or be skipped before review.");
  return touch(run, { state: "review", activeSceneId: undefined, checkpoint: { ...run.checkpoint, savedAt: now() } });
}
export function completeProductionRun(run: NexusProductionRun): NexusProductionRun {
  if (run.state !== "review") throw new Error("A production must pass draft review before completion.");
  const awaitingReview = run.scenes.filter(scene => scene.state === "succeeded" && scene.reviewStatus !== "approved");
  if (awaitingReview.length) throw new Error("Approve every completed scene in Creative Review before completing the draft.");
  return touch(run, { state: "completed" });
}

/** Record a human review decision without changing a scene's generated media. */
export function reviewProductionScene(
  run: NexusProductionRun,
  sceneId: string,
  decision: "approved" | "changes-requested",
  note = ""
): NexusProductionRun {
  if (run.state !== "review") throw new Error("Scene review is available only after production reaches draft review.");
  const scene = run.scenes.find(item => item.id === sceneId);
  if (!scene || scene.state !== "succeeded") throw new Error("Only a completed scene can be reviewed.");
  const scenes = run.scenes.map(item => item.id === sceneId
    ? { ...item, reviewStatus: decision, reviewNote: String(note).trim().slice(0, 1000), updatedAt: now() }
    : item);
  return touch(run, { scenes });
}

/** Reorder storyboard scenes during draft review; generated assets remain attached to their scene IDs. */
export function reorderProductionScene(run: NexusProductionRun, sceneId: string, direction: -1 | 1): NexusProductionRun {
  if (run.state !== "review") throw new Error("Storyboard order can be changed during draft review.");
  const index = run.scenes.findIndex(scene => scene.id === sceneId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= run.scenes.length) return run;
  const scenes = [...run.scenes];
  [scenes[index], scenes[target]] = [scenes[target], scenes[index]];
  return touch(run, { scenes, checkpoint: { ...run.checkpoint, savedAt: now(), nextSceneId: scenes.find(scene => scene.state !== "succeeded" && scene.state !== "skipped")?.id } });
}
export function updateProductionScene(
  run: NexusProductionRun,
  sceneId: string,
  update: Partial<Pick<ProductionScene, "state" | "progress" | "engine" | "jobId" | "outputUrl" | "outputMimeType" | "assetId" | "sourceType" | "sourcePageUrl" | "sourceLicense" | "sourceAttribution" | "sourceCreator" | "error">>
): NexusProductionRun {
  const scene = run.scenes.find(item => item.id === sceneId);
  if (!scene) throw new Error("The requested production scene does not exist.");
  if (run.state !== "running" && update.state !== "queued") throw new Error("Scene execution requires a running production.");
  const state = update.state ?? scene.state;
  if (state === "succeeded") {
    if (typeof update.outputUrl === "string" && update.outputUrl.trim()) {
      let outputUrl: URL;
      try { outputUrl = new URL(update.outputUrl); } catch { throw new Error("The scene output URL is invalid."); }
      if (outputUrl.protocol !== "https:" || outputUrl.username || outputUrl.password) {
        throw new Error("Scene media outputs must use a secure HTTPS URL.");
      }
    } else if (typeof update.assetId === "string" && update.assetId.trim() && update.sourceType) {
      if (update.sourceType === "commons") {
        if (!update.sourcePageUrl || !update.sourceLicense || !update.sourceAttribution) {
          throw new Error("A sourced scene needs its source page, licence and attribution recorded.");
        }
        let sourcePage: URL;
        try { sourcePage = new URL(update.sourcePageUrl); } catch { throw new Error("The source page URL is invalid."); }
        if (sourcePage.protocol !== "https:" || sourcePage.username || sourcePage.password) throw new Error("Source pages must use secure HTTPS URLs.");
      }
    } else {
      throw new Error("A scene cannot succeed until validated output media or a linked project asset is attached.");
    }
  }
  const progress = state === "succeeded" ? 100 : Math.max(0, Math.min(100, Number(update.progress ?? scene.progress) || 0));
  const updatedScenes = run.scenes.map(item => item.id === sceneId ? { ...item, ...update, state, progress, updatedAt: now() } : item);
  const completedSceneIds = updatedScenes.filter(item => item.state === "succeeded").map(item => item.id);
  const next = updatedScenes.find(item => item.state === "pending" || item.state === "queued" || item.state === "failed");
  return touch(run, {
    scenes: updatedScenes,
    activeSceneId: state === "running" ? sceneId : run.activeSceneId,
    checkpoint: { savedAt: now(), completedSceneIds, nextSceneId: next?.id, approvedPlan: run.checkpoint.approvedPlan },
    ...(state === "failed" ? { error: update.error || "A scene failed. Retry that scene without rebuilding completed scenes." } : {})
  });
}
export function retryProductionScene(run: NexusProductionRun, sceneId: string): NexusProductionRun {
  if (run.state !== "running" && run.state !== "paused" && run.state !== "failed") throw new Error("This production is not in a retryable state.");
  const scene = run.scenes.find(item => item.id === sceneId);
  if (!scene || (scene.state !== "failed" && scene.state !== "skipped")) throw new Error("Only a failed or skipped scene can be retried.");
  const scenes = run.scenes.map(item => item.id === sceneId
    ? { ...item, state: "queued" as const, progress: 0, attempts: item.attempts + 1, jobId: undefined, outputUrl: undefined, outputMimeType: undefined, assetId: undefined, sourceType: undefined, sourcePageUrl: undefined, sourceLicense: undefined, sourceAttribution: undefined, sourceCreator: undefined, error: undefined, updatedAt: now() }
    : item);
  return touch(run, { state: "queued", scenes, error: undefined, activeSceneId: sceneId, checkpoint: { ...run.checkpoint, savedAt: now(), nextSceneId: sceneId } });
}
export function cancelProductionRun(run: NexusProductionRun): NexusProductionRun {
  if (run.state === "completed" || run.state === "cancelled") return run;
  return touch(run, { state: "cancelled", checkpoint: { ...run.checkpoint, savedAt: now() } });
}

const STORAGE_KEY = "nexus-production-runs-v1";
const MAX_RUNS = 12;
export function loadProductionRuns(): NexusProductionRun[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((run): run is NexusProductionRun =>
      Boolean(run && typeof run === "object" && run.schemaVersion === 1 &&
        typeof run.id === "string" && typeof run.title === "string" &&
        ["awaiting-approval", "queued", "running", "paused", "review", "completed", "failed", "cancelled"].includes(run.state) &&
        Array.isArray(run.scenes) && run.scenes.length <= 80 &&
        run.scenes.every((scene: ProductionScene) => scene && typeof scene.id === "string" &&
          ["pending", "queued", "running", "succeeded", "failed", "skipped"].includes(scene.state)))
    ).slice(0, MAX_RUNS).map(recoverInterruptedProductionRun);
  } catch { return []; }
}
export function saveProductionRuns(runs: NexusProductionRun[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs.slice(0, MAX_RUNS).map(run => ({
      ...run,
      title: run.title.slice(0, 180),
      scenes: run.scenes.slice(0, 80).map(scene => ({
        ...scene, title: scene.title.slice(0, 180), visual: scene.visual.slice(0, 4000),
        narration: scene.narration?.slice(0, 4000), progress: Math.max(0, Math.min(100, scene.progress)),
        error: scene.error?.slice(0, 1000),
      reviewNote: scene.reviewNote?.slice(0, 1000)
      }))
    }))));
  } catch { /* Local checkpoints are best-effort; the active editor project remains untouched. */ }
}


/**
 * Reconcile a locally persisted run after a reload or app restart.
 * Remote jobs with IDs remain pollable; in-flight local work becomes retryable.
 * Successful scenes are never reset or regenerated.
 */
export function recoverInterruptedProductionRun(run: NexusProductionRun): NexusProductionRun {
  if (run.state !== "running") return run;
  const timestamp = now();
  const scenes = run.scenes.map(scene => {
    if (scene.state !== "running" || scene.jobId) return scene;
    return {
      ...scene,
      state: "failed" as const,
      error: scene.error || "This scene was interrupted before its result was checkpointed. Retry this scene to continue.",
      updatedAt: timestamp
    };
  });
  const hasPollableRemoteJob = scenes.some(scene => scene.state === "running" && Boolean(scene.jobId));
  const allFinished = scenes.every(scene => scene.state === "succeeded" || scene.state === "skipped");
  const next = scenes.find(scene => scene.state === "queued" || scene.state === "pending" || scene.state === "failed");
  return touch(run, {
    state: allFinished ? "review" : hasPollableRemoteJob ? "running" : "paused",
    activeSceneId: hasPollableRemoteJob ? scenes.find(scene => scene.state === "running" && scene.jobId)?.id : undefined,
    scenes,
    checkpoint: {
      savedAt: timestamp,
      completedSceneIds: scenes.filter(scene => scene.state === "succeeded").map(scene => scene.id),
      nextSceneId: next?.id,
      approvedPlan: run.checkpoint.approvedPlan
    }
  });
}

/** Resume a paused run without discarding any completed scene output. */
export function resumeProductionRun(run: NexusProductionRun): NexusProductionRun {
  if (run.state !== "paused" && run.state !== "failed") {
    throw new Error("Only a paused or failed production can be resumed.");
  }
  if (run.scenes.every(scene => scene.state === "succeeded" || scene.state === "skipped")) {
    return sendProductionToReview(run);
  }
  const next = run.scenes.find(scene => scene.state === "queued" || scene.state === "pending");
  if (!next && run.scenes.some(scene => scene.state === "failed")) {
    throw new Error("Retry the failed scene before resuming this production.");
  }
  return touch(run, {
    state: "queued",
    error: undefined,
    activeSceneId: undefined,
    checkpoint: { ...run.checkpoint, savedAt: now(), nextSceneId: next?.id }
  });
}

/** Return the next scene in storyboard order; failed scenes require an explicit retry. */
export function getNextProductionScene(run: NexusProductionRun): ProductionScene | undefined {
  if (run.state !== "running") return undefined;
  return run.scenes.find(scene => scene.state === "queued" || scene.state === "pending");
}

/** Claim one scene for sequential execution and persist its attempt before work begins. */
export function beginProductionScene(run: NexusProductionRun, sceneId: string): NexusProductionRun {
  if (run.state !== "running") throw new Error("Scene execution requires a running production.");
  const scene = run.scenes.find(item => item.id === sceneId);
  if (!scene) throw new Error("The requested production scene does not exist.");
  if (scene.state !== "pending" && scene.state !== "queued") {
    throw new Error("Only a pending or queued scene can begin execution.");
  }
  const timestamp = now();
  const scenes = run.scenes.map(item => item.id === sceneId
    ? { ...item, state: "running" as const, progress: 0, attempts: item.attempts + (item.state === "pending" ? 1 : 0), error: undefined, updatedAt: timestamp }
    : item);
  return touch(run, {
    scenes,
    activeSceneId: sceneId,
    checkpoint: {
      savedAt: timestamp,
      completedSceneIds: scenes.filter(item => item.state === "succeeded").map(item => item.id),
      nextSceneId: scenes.find(item => item.state === "pending" || item.state === "queued")?.id,
      approvedPlan: run.checkpoint.approvedPlan
    }
  });
}
