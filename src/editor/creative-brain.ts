export type CreativeCommand = "duplicate-clip" | "flip-horizontal" | "flip-vertical" | "chroma-key" | "none";
export function interpretCreativeCommand(input: string): CreativeCommand {
  const text = input.toLowerCase().replace(/[’']/g, "'");
  if (/\b(duplicate|dupe|copy)\b/.test(text) && /\b(clip|selected|this)\b/.test(text)) return "duplicate-clip";
  if (/\b(flip|mirror)\b/.test(text) && /\b(horizontal|horizontally|left.?right)\b/.test(text)) return "flip-horizontal";
  if (/\b(flip|mirror)\b/.test(text) && /\b(vertical|vertically|up.?down)\b/.test(text)) return "flip-vertical";
  if (/\b(chroma|green.?screen|key out (the )?background)\b/.test(text)) return "chroma-key";
  return "none";
}
export function getCreativeNextSteps(context: { hasMedia: boolean; hasClip: boolean; hasAudio: boolean; hasText: boolean }): string[] {
  const steps: string[] = [];
  if (!context.hasMedia) steps.push("Import a photo, video or audio file to begin.");
  else if (!context.hasClip) steps.push("Add one asset to the timeline, then select its clip.");
  if (context.hasClip && !context.hasText) steps.push("Add a timed title or caption to establish the message.");
  if (context.hasAudio && context.hasClip) steps.push("Balance music under narration and preview the mix.");
  if (context.hasClip) steps.push("Review the opening and ending, then export a short draft before a long render.");
  return steps;
}
