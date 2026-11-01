export type MediaKind = "video" | "audio" | "image";
export interface MediaAsset {
  id: string; name: string; kind: MediaKind; duration: number;
  width?: number; height?: number; mimeType: string; file?: File; objectUrl?: string;
  source?: { type: "personal" | "commons" | "stock" | "generated"; pageUrl?: string; creator?: string; license?: string; licenseUrl?: string; attribution?: string };
}
export interface TimelineClip {
  id: string; assetId: string; trackId: string; start: number;
  sourceIn: number; sourceOut: number; label: string;
}
export interface TimelineTrack {
  id: string; name: string; kind: "video" | "audio" | "overlay"; muted: boolean; hidden: boolean;
}
export interface NexusProject {
  format: "nexusproj"; schemaVersion: 1; name: string; createdAt: string; updatedAt: string;
  frameRate: number; width: number; height: number;
  assets: Omit<MediaAsset, "file" | "objectUrl">[]; tracks: TimelineTrack[]; clips: TimelineClip[];
}