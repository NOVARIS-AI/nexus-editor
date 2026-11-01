export type EditorAIIntent =
  | { type: "guide" }
  | { type: "split-selected" }
  | { type: "delete-selected" }
  | { type: "toggle-mute" }
  | { type: "select-tool"; tool: "edit" | "audio" | "text" | "overlay" | "effects" | "captions" | "filters" | "adjust" | "media" | "stickers" | "background" | "ratio" }
  | { type: "set-ratio"; ratio: "9:16" | "16:9" | "1:1" | "4:5" | "3:4" }
  | { type: "unsupported"; reason: string };

const tools = ["audio", "text", "overlay", "effects", "captions", "filters", "adjust", "media", "stickers", "background", "ratio", "edit"] as const;

export function understandEditorRequest(raw: string): EditorAIIntent {
  const q = raw.trim().toLowerCase();
  if (!q || /^(guide me|what next\??|help|teach me)$/.test(q)) return { type: "guide" };
  const ratio = q.match(/(?:change|set|make|use)?\s*(9:16|16:9|1:1|4:5|3:4)/);
  if (ratio && /(ratio|format|aspect|screen|canvas|video)/.test(q)) return { type: "set-ratio", ratio: ratio[1] as "9:16" | "16:9" | "1:1" | "4:5" | "3:4" };
  if (/\b(split|cut)\b/.test(q)) return { type: "split-selected" };
  if (/\b(delete|remove)\b/.test(q) && /(clip|selected|this)/.test(q)) return { type: "delete-selected" };
  if (/\b(mute|unmute)\b/.test(q)) return { type: "toggle-mute" };
  const requestedTool = tools.find(tool => new RegExp("\\b" + tool + "\\b").test(q));
  if (requestedTool) return { type: "select-tool", tool: requestedTool };
  if (/text|title|caption/.test(q)) return { type: "select-tool", tool: "text" };
  if (/music|sound|voice|audio/.test(q)) return { type: "select-tool", tool: "audio" };
  if (/effect|transition|keyframe/.test(q)) return { type: "select-tool", tool: "effects" };
  return { type: "unsupported", reason: "I don't have a connected editing command for that request yet. I can currently guide you to tools, split or delete the selected clip, mute it, and change the canvas ratio." };
}
