import type { NexusEngineJob } from "./engine-jobs";

export async function submitAudioSeparation(file: File, stems: string[] = ["vocals", "instrumental"]): Promise<NexusEngineJob> {
  if (!file.type.toLowerCase().startsWith("audio/")) throw new Error("Choose an audio file before separating stems.");
  if (file.size <= 0 || file.size > 100 * 1024 * 1024) throw new Error("Audio files must be between 1 byte and 100 MB for stem separation.");
  const form = new FormData();
  form.set("file", file, file.name);
  form.set("stems", stems.join(","));
  const response = await fetch("/api/audio-separate", { method: "POST", body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Audio stem separation is not available (" + response.status + ").");
  return data as NexusEngineJob;
}
