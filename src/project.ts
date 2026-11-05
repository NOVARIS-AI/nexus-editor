import type { MediaAsset, NexusProject, TimelineClip, TimelineTrack } from "./types";
export const defaultTracks: TimelineTrack[] = [
  { id: "video-1", name: "Video 1", kind: "video", muted: false, hidden: false },
  { id: "overlay-1", name: "Video 2", kind: "overlay", muted: false, hidden: false },
  { id: "image-1", name: "Images & Stickers", kind: "overlay", muted: false, hidden: false },
  { id: "text-1", name: "Text 1", kind: "overlay", muted: false, hidden: false },
  { id: "audio-1", name: "Audio 1 · Main", kind: "audio", muted: false, hidden: false },
  { id: "audio-2", name: "Audio 2 · Music", kind: "audio", muted: false, hidden: false },
  { id: "audio-3", name: "Audio 3 · Effects", kind: "audio", muted: false, hidden: false },
  { id: "audio-4", name: "Audio 4 · Voice", kind: "audio", muted: false, hidden: false }
];
export function makeProject(name = "Untitled Project"): NexusProject {
  const now = new Date().toISOString();
  return { format: "nexusproj", schemaVersion: 1, name, createdAt: now, updatedAt: now,
    frameRate: 30, width: 1920, height: 1080, assets: [], tracks: defaultTracks, clips: [], textLayers: [], imageLayers: [] };
}
export function serialiseProject(project: NexusProject, assets: MediaAsset[]): NexusProject {
  return { ...project, updatedAt: new Date().toISOString(),
    assets: assets.map(({ file, objectUrl, ...asset }) => asset) };
}
export function downloadProject(project: NexusProject, assets: MediaAsset[]) {
  const blob = new Blob([JSON.stringify(serialiseProject(project, assets), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = `${project.name.replace(/[^a-z0-9-_]+/gi, "-")}.nexusproj`;
  a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const validAsset = (value: unknown): value is MediaAsset =>
  isRecord(value) && typeof value.id === "string" && !!value.id &&
  typeof value.name === "string" && ["video", "image", "audio"].includes(String(value.kind)) &&
  finite(value.duration) && value.duration >= 0;
const validTrack = (value: unknown): value is TimelineTrack =>
  isRecord(value) && typeof value.id === "string" && !!value.id &&
  typeof value.name === "string" &&
  ["video", "audio", "overlay"].includes(String(value.kind)) &&
  (value.muted === undefined || typeof value.muted === "boolean") &&
  (value.hidden === undefined || typeof value.hidden === "boolean");
const validClip = (value: unknown): value is TimelineClip =>
  isRecord(value) && typeof value.id === "string" && !!value.id &&
  typeof value.assetId === "string" && typeof value.trackId === "string" &&
  typeof value.label === "string" && finite(value.start) && value.start >= 0 &&
  finite(value.sourceIn) && value.sourceIn >= 0 &&
  finite(value.sourceOut) && value.sourceOut > value.sourceIn;
const validTextLayer = (value: unknown) =>
  isRecord(value) && typeof value.id === "string" && typeof value.trackId === "string" &&
  typeof value.text === "string" && typeof value.color === "string" &&
  typeof value.fontFamily === "string" && finite(value.start) && value.start >= 0 &&
  finite(value.duration) && value.duration > 0 && finite(value.fontSize) && value.fontSize > 0;
const validImageLayer = (value: unknown) =>
  isRecord(value) && typeof value.id === "string" && typeof value.assetId === "string" &&
  typeof value.trackId === "string" && finite(value.start) && value.start >= 0 &&
  finite(value.duration) && value.duration > 0 &&
  ["x", "y", "scale", "rotation", "opacity"].every(key => finite(value[key]));

export function parseProject(text: string): NexusProject {
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch { throw new Error("This file is not valid NEXUS EDITOR project data."); }
  if (!isRecord(parsed) || parsed.format !== "nexusproj" || parsed.schemaVersion !== 1 ||
      typeof parsed.name !== "string" || !Array.isArray(parsed.assets) ||
      !Array.isArray(parsed.tracks) || !Array.isArray(parsed.clips))
    throw new Error("This file is not a supported NEXUS EDITOR project.");
  const assets = parsed.assets;
  const tracks = parsed.tracks;
  const clips = parsed.clips;
  const textLayers = parsed.textLayers === undefined ? [] : parsed.textLayers;
  const imageLayers = parsed.imageLayers === undefined ? [] : parsed.imageLayers;
  if (!assets.every(validAsset) || !tracks.every(validTrack) || !clips.every(validClip) ||
      !Array.isArray(textLayers) || !textLayers.every(validTextLayer) ||
      !Array.isArray(imageLayers) || !imageLayers.every(validImageLayer))
    throw new Error("This project contains malformed media, timeline, or overlay data.");
  const assetIds = new Set(assets.map(asset => asset.id));
  const trackIds = new Set(tracks.map(track => track.id));
  if (assetIds.size !== assets.length || trackIds.size !== tracks.length)
    throw new Error("This project contains duplicate media or track identifiers.");
  if (clips.some(clip => !assetIds.has(clip.assetId) || !trackIds.has(clip.trackId)))
    throw new Error("This project contains a clip with missing media or timeline track references.");
  if (imageLayers.some(layer => !assetIds.has(layer.assetId) || !trackIds.has(layer.trackId) ||
      assets.find(asset => asset.id === layer.assetId)?.kind !== "image"))
    throw new Error("This project contains an image layer with a missing or non-image source.");
  if (textLayers.some(layer => !trackIds.has(layer.trackId)))
    throw new Error("This project contains a text layer with a missing timeline track.");
  return { ...parsed, assets, tracks, clips, textLayers, imageLayers } as unknown as NexusProject;
}

export function speedAtSourceProgress(clip: TimelineClip, progress: number) {
  const base = Math.max(.1, Math.min(8, clip.speed || 1));
  const points = [...(clip.speedCurve || [])]
    .filter(point => Number.isFinite(point.position) && Number.isFinite(point.speed))
    .map(point => ({ position: Math.max(0, Math.min(1, point.position)), speed: Math.max(.1, Math.min(8, point.speed)) }))
    .sort((a, b) => a.position - b.position);
  if (!points.length) return base;
  const p = Math.max(0, Math.min(1, progress));
  if (p <= points[0].position) return points[0].speed;
  if (p >= points[points.length - 1].position) return points[points.length - 1].speed;
  const index = points.findIndex(point => point.position >= p);
  const left = points[index - 1], right = points[index];
  const mix = (p - left.position) / Math.max(.0001, right.position - left.position);
  return left.speed + (right.speed - left.speed) * mix;
}
function sourceTravelTime(clip: TimelineClip, sourceDelta: number) {
  const span = Math.max(.0001, clip.sourceOut - clip.sourceIn);
  const end = Math.max(0, Math.min(span, sourceDelta));
  if (!clip.speedCurve?.length) return end / Math.max(.1, clip.speed || 1);
  const steps = Math.max(24, Math.ceil(end * 12));
  let total = 0;
  for (let i = 0; i < steps; i++) {
    const mid = (i + .5) / steps * end;
    total += (end / steps) / speedAtSourceProgress(clip, mid / span);
  }
  return total;
}
export function clipDuration(clip: TimelineClip) {
  return sourceTravelTime(clip, Math.max(0, clip.sourceOut - clip.sourceIn));
}
export function clipSourceAtTimeline(clip: TimelineClip, timelineTime: number) {
  const span = Math.max(0, clip.sourceOut - clip.sourceIn);
  const target = Math.max(0, Math.min(clipDuration(clip), timelineTime));
  if (!clip.speedCurve?.length) return clip.sourceIn + target * Math.max(.1, clip.speed || 1);
  let low = 0, high = span;
  for (let i = 0; i < 28; i++) {
    const mid = (low + high) / 2;
    if (sourceTravelTime(clip, mid) < target) low = mid; else high = mid;
  }
  return clip.sourceIn + (low + high) / 2;
}
export function clipTimelineAtSource(clip: TimelineClip, sourceTime: number) {
  return sourceTravelTime(clip, Math.max(0, Math.min(clip.sourceOut - clip.sourceIn, sourceTime - clip.sourceIn)));
}
export function timelineDuration(clips: TimelineClip[]) {
  return clips.reduce((max, clip) => Math.max(max, clip.start + clipDuration(clip)), 0);
}
