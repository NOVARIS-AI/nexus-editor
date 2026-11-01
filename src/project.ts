import type { MediaAsset, NexusProject, TimelineClip, TimelineTrack } from "./types";
export const defaultTracks: TimelineTrack[] = [
  { id: "video-1", name: "Video 1", kind: "video", muted: false, hidden: false },
  { id: "overlay-1", name: "Video 2", kind: "overlay", muted: false, hidden: false },
  { id: "text-1", name: "Text 1", kind: "overlay", muted: false, hidden: false },
  { id: "audio-1", name: "Audio 1", kind: "audio", muted: false, hidden: false }
];
export function makeProject(name = "Untitled Project"): NexusProject {
  const now = new Date().toISOString();
  return { format: "nexusproj", schemaVersion: 1, name, createdAt: now, updatedAt: now,
    frameRate: 30, width: 1920, height: 1080, assets: [], tracks: defaultTracks, clips: [], textLayers: [] };
}
export function serialiseProject(project: NexusProject, assets: MediaAsset[]): NexusProject {
  return { ...project, updatedAt: new Date().toISOString(),
    assets: assets.map(({ file, objectUrl, ...asset }) => asset) };
}
export function downloadProject(project: NexusProject, assets: MediaAsset[]) {
  const blob = new Blob([JSON.stringify(serialiseProject(project, assets), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = `${project.name.replace(/[^a-z0-9-_]+/gi, "-")}.nexusproj`;
  a.click(); URL.revokeObjectURL(url);
}
export function parseProject(text: string): NexusProject {
  const value = JSON.parse(text) as NexusProject;
  if (value.format !== "nexusproj" || value.schemaVersion !== 1 ||
      !Array.isArray(value.assets) || !Array.isArray(value.tracks) || !Array.isArray(value.clips))
    throw new Error("This file is not a supported NEXUS EDITOR project.");
  return { ...value, textLayers: Array.isArray(value.textLayers) ? value.textLayers : [] };
}
export function clipDuration(clip: TimelineClip) { return Math.max(0, clip.sourceOut - clip.sourceIn); }
export function timelineDuration(clips: TimelineClip[]) {
  return clips.reduce((max, clip) => Math.max(max, clip.start + clipDuration(clip)), 0);
}