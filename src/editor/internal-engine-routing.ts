export type InternalEngineToolId = "remotion" | "hyperframes" | "ffmpeg" | "whisper" | "ytdlp";
export type EngineMediaKind = "image" | "video" | "audio";

/**
 * Internal execution catalogue for the existing NEXUS AI Director.
 * This is deliberately separate from the user-facing capability registry.
 */
export const NEXUS_INTERNAL_ENGINE_TOOLS = Object.freeze([
  { id: "remotion", purpose: "Compose and render deterministic React-based video scenes.", execution: "server-job", fallback: "Existing editable NEXUS timeline renderer", visibleToUsers: false },
  { id: "hyperframes", purpose: "Create animated typography and motion-graphics compositions.", execution: "server-job", fallback: "Existing editable SVG/Canvas motion layers", visibleToUsers: false },
  { id: "ffmpeg", purpose: "Extract, trim, transcode, mux and prepare media for export.", execution: "server-job", fallback: "Supported browser and native media operations", visibleToUsers: false },
  { id: "whisper", purpose: "Transcribe selected audio into text and timestamped segments.", execution: "existing-speech-pipeline", fallback: "On-device Whisper Tiny", visibleToUsers: false },
  { id: "ytdlp", purpose: "Retrieve metadata or authorized reference media only.", execution: "server-job", fallback: "Licensed media search and user imports", visibleToUsers: false }
] satisfies ReadonlyArray<{ id: InternalEngineToolId; purpose: string; execution: "server-job" | "existing-speech-pipeline"; fallback: string; visibleToUsers: false }>);

const REMOTE_ENGINE_TOOLS = new Set<InternalEngineToolId>(["remotion", "hyperframes", "ffmpeg", "ytdlp"]);
export function isRemoteInternalEngineTool(value: unknown): value is Exclude<InternalEngineToolId, "whisper"> {
  return typeof value === "string" && REMOTE_ENGINE_TOOLS.has(value as InternalEngineToolId);
}

/** Determine the real media kind from a verified worker MIME type, not its engine name. */
export function getInternalEngineOutputKind(engine: string, mimeType: string): EngineMediaKind | null {
  const mime = String(mimeType || "").split(";")[0].trim().toLowerCase();
  const kind: EngineMediaKind | null = mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : null;
  if (!kind || engine === "render" || engine === "whisper") return null;
  if (engine === "remotion" || engine === "hyperframes") return kind === "video" ? "video" : null;
  if (engine === "ffmpeg" || engine === "ytdlp") return kind === "audio" || kind === "video" ? kind : null;
  if (engine === "image" || engine === "video" || engine === "audio") return engine === kind ? kind : null;
  return null;
}
