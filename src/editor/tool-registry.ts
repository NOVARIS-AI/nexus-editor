export type EditorToolCapability = "working" | "guidance" | "planned" | "internal";
export interface EditorToolEntry { id: string; label: string; actions: string[]; capability: EditorToolCapability; }

export const EDITOR_TOOL_REGISTRY: EditorToolEntry[] = [
  { id: "edit", label: "Edit", actions: ["select", "split", "mute", "speed", "animation", "cover", "delete", "trim", "undo", "redo"], capability: "working" },
  { id: "audio", label: "Audio", actions: ["generate original SFX", "generate music beds", "preview", "add to timeline", "extract", "fade", "volume"], capability: "working" },
  { id: "text", label: "Text", actions: ["add timed text", "editable title layouts", "quote poster layers", "fonts", "style", "animation", "align"], capability: "working" },
  { id: "overlay", label: "Overlay", actions: ["add overlay", "mask", "blend", "position", "opacity", "chroma key", "green-screen removal", "spill suppression"], capability: "working" },
  { id: "effects", label: "Effects", actions: ["one-tap looks", "video filters", "transitions", "motion keyframes"], capability: "working" },
  { id: "filters", label: "Filters", actions: ["100+ colour looks", "cinematic", "film", "portrait", "product", "creative"], capability: "working" },
  { id: "adjust", label: "Adjust", actions: ["image finishing presets", "brightness", "contrast", "saturation", "exposure", "temperature", "HSL"], capability: "working" },
  { id: "media", label: "Media", actions: ["import photos", "import videos", "import audio", "browse files", "media library"], capability: "working" },
  { id: "stickers", label: "Stickers", actions: ["80+ categorized emoji and graphic stickers", "import transparent PNG/WebP sticker", "place and transform on timeline"], capability: "working" },
  { id: "background", label: "Background", actions: ["local AI subject segmentation for still photos", "brush-based object selection", "undo and restore selection", "local patch-based object reconstruction for small areas", "soft colour eraser", "12 generated gradient backdrops", "import custom background image", "full-frame editable background layer", "live camera recording", "post-live footage cleanup", "colour finishing presets", "brightness contrast saturation and warmth correction", "low-frequency rumble reduction and audio peak compression", "basic frame-to-frame camera shake reduction"], capability: "working" },
  { id: "ratio", label: "Ratio", actions: ["9:16", "16:9", "1:1", "4:5", "3:4"], capability: "working" },
  { id: "export", label: "Export", actions: ["browser timeline render", "resolution", "frame rate", "download", "share"], capability: "working" },
  // Hidden execution tools available to the existing NEXUS AI Director; never render these as user-facing controls.
  { id: "remotion", label: "Remotion", actions: ["compose React-based video scenes", "render deterministic video compositions", "produce preview and final render"], capability: "internal" },
  { id: "hyperframes", label: "HyperFrames", actions: ["build animated typography", "compose motion graphics", "create frame-accurate graphic sequences"], capability: "internal" },
  { id: "ffmpeg", label: "FFmpeg", actions: ["extract audio and frames", "trim and concatenate media", "transcode and mux supported formats", "prepare export"], capability: "internal" },
  { id: "whisper", label: "Whisper", actions: ["transcribe speech", "return timestamped segments", "support subtitle and caption timing"], capability: "internal" },
  { id: "yt-dlp", label: "yt-dlp", actions: ["retrieve user-owned or explicitly authorized reference media from supported sources", "inspect source metadata"], capability: "internal" }
];
