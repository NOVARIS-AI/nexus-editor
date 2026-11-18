export type TimelineShortcutAction = "toggle-playback" | "rewind" | "split" | "step-backward" | "step-forward";

export interface TimelineShortcutContext {
  key: string;
  page: string;
  editorView: string;
  previewPlaying: boolean;
  altKey?: boolean;
}

/** Resolve editor-only keyboard shortcuts without coupling the rules to the DOM. */
export function getTimelineShortcutAction(context: TimelineShortcutContext): TimelineShortcutAction | null {
  if (context.page !== "editor" || context.editorView !== "workspace") return null;
  const key = context.key.toLowerCase();

  if (key === " " || key === "spacebar") return "toggle-playback";
  if (key === "home") return "rewind";
  if (key === "s" && !context.altKey) return "split";
  if (context.previewPlaying) return null;
  if (key === "arrowleft") return "step-backward";
  if (key === "arrowright") return "step-forward";
  return null;
}
