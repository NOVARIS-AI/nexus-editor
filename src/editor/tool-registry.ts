export type EditorToolCapability = "working" | "guidance" | "planned";
export interface EditorToolEntry { id: string; label: string; actions: string[]; capability: EditorToolCapability; }

export const EDITOR_TOOL_REGISTRY: EditorToolEntry[] = [
  { id: "edit", label: "Edit", actions: ["select", "split", "mute", "speed", "animation", "cover", "delete", "trim", "undo", "redo"], capability: "working" },
  { id: "audio", label: "Audio", actions: ["sounds", "extract", "voiceover", "effects", "fade", "volume"], capability: "guidance" },
  { id: "text", label: "Text", actions: ["add text", "fonts", "style", "animation", "align", "auto captions"], capability: "guidance" },
  { id: "overlay", label: "Overlay", actions: ["add overlay", "mask", "blend", "position", "opacity"], capability: "guidance" },
  { id: "effects", label: "Effects", actions: ["one-tap looks", "video filters", "transitions", "motion keyframes"], capability: "working" },
  { id: "captions", label: "Captions", actions: ["auto captions", "manual captions", "caption style", "language"], capability: "guidance" },
  { id: "filters", label: "Filters", actions: ["100+ colour looks", "cinematic", "film", "portrait", "product", "creative"], capability: "working" },
  { id: "adjust", label: "Adjust", actions: ["brightness", "contrast", "saturation", "exposure", "temperature", "hsl"], capability: "guidance" },
  { id: "media", label: "Media", actions: ["import photos", "import videos", "import audio", "browse files", "media library"], capability: "working" },
  { id: "stickers", label: "Stickers", actions: ["emoji and symbols", "import image sticker"], capability: "working" },
  { id: "background", label: "Background", actions: ["color", "blur", "canvas"], capability: "guidance" },
  { id: "ratio", label: "Ratio", actions: ["9:16", "16:9", "1:1", "4:5", "3:4"], capability: "working" },
  { id: "export", label: "Export", actions: ["resolution", "frame rate", "render", "share"], capability: "planned" }
];
