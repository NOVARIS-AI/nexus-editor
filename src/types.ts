export type MediaKind = "video" | "audio" | "image";
export interface MediaAsset {
  id: string; name: string; kind: MediaKind; duration: number;
  width?: number; height?: number; mimeType: string; file?: File; objectUrl?: string;
  source?: { type: "personal" | "commons" | "stock" | "generated"; pageUrl?: string; creator?: string; license?: string; licenseUrl?: string; attribution?: string };
}
export interface ClipKeyframe { time: number; zoom: number; rotation: number; offsetX: number; offsetY: number; opacity: number; easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out"; }
export interface TimelineClip {
  id: string; assetId: string; trackId: string; start: number;
  sourceIn: number; sourceOut: number; label: string;
  exposure?: number; temperature?: number; tint?: number; highlights?: number; shadows?: number; vignette?: number; blendMode?: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "soft-light" | "hard-light"; maskShape?: "none" | "circle" | "rounded" | "horizontal" | "vertical"; maskRadius?: number; gain?: number; muted?: boolean; highPassHz?: number; lowPassHz?: number; compression?: number; noiseGate?: number; fadeIn?: number; fadeOut?: number; speed?: number; rotation?: number; brightness?: number; contrast?: number; saturation?: number; zoom?: number; offsetX?: number; offsetY?: number; filter?: string; opacity?: number; transitionIn?: number; transitionOut?: number; transitionStyle?: "fade" | "zoom" | "wipe" | "slide" | "blur"; fit?: "cover" | "contain"; flipHorizontal?: boolean; flipVertical?: boolean; keyframes?: ClipKeyframe[];
  aiScene?: { title: string; visual: string; narration: string; sourceType: "personal" | "commons" | "native-fallback" };
}
export interface TimelineTrack {
  id: string; name: string; kind: "video" | "audio" | "overlay"; muted: boolean; hidden: boolean;
  volume?: number; pan?: number; solo?: boolean; locked?: boolean;
}
export interface TimelineTextLayer {
  id: string; trackId: string; start: number; duration: number; text: string;
  color: string; fontSize: number; fontFamily: string; x?: number; y?: number; opacity?: number; rotation?: number; backgroundColor?: string; padding?: number; align?: "left" | "center" | "right"; shadow?: boolean; animation?: "none" | "fade" | "pop";
}
export interface NexusProject {
  format: "nexusproj"; schemaVersion: 1; name: string; createdAt: string; updatedAt: string;
  frameRate: number; width: number; height: number;
  assets: Omit<MediaAsset, "file" | "objectUrl">[]; tracks: TimelineTrack[]; clips: TimelineClip[]; textLayers?: TimelineTextLayer[];
}