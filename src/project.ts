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
export function parseProject(text: string): NexusProject {
  const value = JSON.parse(text) as NexusProject;
  if (value.format !== "nexusproj" || value.schemaVersion !== 1 ||
      !Array.isArray(value.assets) || !Array.isArray(value.tracks) || !Array.isArray(value.clips))
    throw new Error("This file is not a supported NEXUS EDITOR project.");
  const assetIds = new Set(value.assets.map(asset => asset?.id).filter(Boolean));
  if (value.clips.some(clip => !clip || typeof clip.id !== "string" || !assetIds.has(clip.assetId) || !Number.isFinite(clip.start) || clip.start < 0 || !Number.isFinite(clip.sourceIn) || !Number.isFinite(clip.sourceOut) || clip.sourceOut <= clip.sourceIn))
    throw new Error("This project contains a clip with missing media or invalid timing. The original file has not been changed.");
  if (value.tracks.some(track => !track || typeof track.id !== "string" || typeof track.name !== "string"))
    throw new Error("This project contains an invalid timeline track.");
  return { ...value, textLayers: Array.isArray(value.textLayers) ? value.textLayers : [], imageLayers: Array.isArray(value.imageLayers) ? value.imageLayers : [] };
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