import type { TimelineClip, TimelineImageLayer, TimelineTextLayer, TimelineTrack } from "../types";

export type LocalDraft = {
  version: 3;
  projectName: string;
  clips: TimelineClip[];
  textLayers: TimelineTextLayer[];
  imageLayers: TimelineImageLayer[];
  tracks: TimelineTrack[];
  aspectRatio: string;
  savedAt: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

function validClip(value: unknown): value is TimelineClip {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.assetId === "string" &&
    typeof value.trackId === "string" && typeof value.label === "string" &&
    Number.isFinite(value.start) && Number(value.start) >= 0 &&
    Number.isFinite(value.sourceIn) && Number(value.sourceIn) >= 0 &&
    Number.isFinite(value.sourceOut) && Number(value.sourceOut) > Number(value.sourceIn);
}

function validTextLayer(value: unknown): value is TimelineTextLayer {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.trackId === "string" &&
    typeof value.text === "string" && typeof value.color === "string" &&
    typeof value.fontFamily === "string" && Number.isFinite(value.start) &&
    Number(value.start) >= 0 && Number.isFinite(value.duration) &&
    Number(value.duration) > 0 && Number.isFinite(value.fontSize);
}

function validImageLayer(value: unknown): value is TimelineImageLayer {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.assetId === "string" && typeof value.trackId === "string" &&
    Number.isFinite(value.start) && Number(value.start) >= 0 && Number.isFinite(value.duration) && Number(value.duration) > 0 &&
    ["x","y","scale","rotation","opacity"].every(key => Number.isFinite(value[key]));
}

function validTrack(value: unknown): value is TimelineTrack {
  return isRecord(value) && typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.kind === "video" || value.kind === "audio" || value.kind === "overlay") &&
    typeof value.muted === "boolean" && typeof value.hidden === "boolean";
}

export function parseLocalDraft(raw: string | null): LocalDraft | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || ![1, 2, 3].includes(Number(value.version)) ||
      typeof value.projectName !== "string" || !Array.isArray(value.clips) ||
      !Array.isArray(value.textLayers) ||
      (value.tracks !== undefined && !Array.isArray(value.tracks)) ||
      typeof value.aspectRatio !== "string" ||
      !Number.isFinite(value.savedAt)) return null;
    if (value.clips.length > 5000 || value.textLayers.length > 2000 || (value.imageLayers !== undefined && (!Array.isArray(value.imageLayers) || value.imageLayers.length > 2000))) return null;
    if (!value.clips.every(validClip) || !value.textLayers.every(validTextLayer) || !(value.imageLayers || []).every(validImageLayer)) return null;
    const tracks = (value.tracks || []).filter(validTrack) as TimelineTrack[];
    if (new Set(tracks.map(track => track.id)).size !== tracks.length) return null;
    return {
      version: 3,
      projectName: value.projectName.slice(0, 180),
      clips: value.clips as TimelineClip[],
      textLayers: value.textLayers as TimelineTextLayer[],
      imageLayers: (value.imageLayers || []) as TimelineImageLayer[],
      tracks,
      aspectRatio: value.aspectRatio,
      savedAt: Number(value.savedAt)
    };
  } catch {
    return null;
  }
}

export function readRecoverableDraft(): LocalDraft | null {
  try {
    const keys = ["nexus-editor-autosave-v3", "nexus-editor-autosave-v2",
      "nexus-editor-autosave-v1", "nexus-editor-autosave-backup"];
    const candidates = keys
      .map(key => parseLocalDraft(localStorage.getItem(key)))
      .filter((draft): draft is LocalDraft => !!draft)
      .sort((a, b) => b.savedAt - a.savedAt);
    return candidates[0] || null;
  } catch {
    return null;
  }
}

export function writeRecoverableDraft(snapshot: LocalDraft): boolean {
  try {
    const serialised = JSON.stringify({ ...snapshot, version: 3 });
    // localStorage is only for the editable timeline metadata, never media blobs.
    if (serialised.length > 3_500_000) return false;
    const current = localStorage.getItem("nexus-editor-autosave-v3") ||
      localStorage.getItem("nexus-editor-autosave-v2");
    if (current && current !== serialised) {
      localStorage.setItem("nexus-editor-autosave-backup", current);
    }
    localStorage.setItem("nexus-editor-autosave-v3", serialised);
    localStorage.setItem("nexus-editor-autosave-v2", serialised);
    return true;
  } catch {
    return false;
  }
}
