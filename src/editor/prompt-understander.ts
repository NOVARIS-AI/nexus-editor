export type PromptUnderstanding = {
  original: string;
  coreGoal: string;
  deliverable: string;
  styleSignals: string[];
  explicitConstraints: string[];
  preserve: string[];
  avoid: string[];
  referenceIntent: "style" | "structure" | "content" | "replacement" | "mixed" | "unspecified";
  ambiguityNotes: string[];
  directorInstruction: string;
};

const unique = (items: string[]) => [...new Set(items.map(value => value.trim()).filter(Boolean))].slice(0, 12);

export function understandDirectorPrompt(input: string): PromptUnderstanding {
  const original = input.trim().slice(0, 12000);
  const lower = original.toLowerCase();
  const has = (pattern: RegExp) => pattern.test(lower);
  const styleSignals = unique([
    ...((lower.match(/\b(cinematic|documentary|minimalist|minimal|luxury|premium|corporate|editorial|vintage|retro|anime|realistic|photorealistic|dramatic|energetic|calm|playful|inspirational|gritty|clean|bold|elegant|futuristic|afrofuturist)\b/g) || [])),
    ...((lower.match(/\b(warm|cool|moody|bright|dark|high contrast|soft light|natural light|neon|pastel|monochrome|black and white|golden)\b/g) || [])),
  ]);
  const explicitConstraints = unique([
    ...((original.match(/\b(?:under|within|exactly|at least|no more than|maximum of)\s+\d+\s*(?:seconds?|minutes?|mins?|secs?|s)\b/gi) || [])),
    ...((original.match(/\b(?:vertical|horizontal|portrait|landscape|square|9:16|16:9|1:1|4:5|1080p|4k|subtitles?|captions?)\b/gi) || [])),
  ]);
  const preserve = unique([
    ...(has(/keep|preserve|don't change|do not change|retain/) ? ["Preserve the elements the user explicitly asked to keep; do not redesign them without permission."] : []),
    ...(has(/same person|same product|same logo|exact wording|keep the text/) ? ["Maintain the explicitly named identity, product, logo or wording consistently."] : []),
  ]);
  const avoid = unique([
    ...(has(/no watermark/) ? ["No watermark."] : []),
    ...(has(/no text|without text|no captions/) ? ["Do not add text or captions unless required by the brief."] : []),
    ...(has(/don't|do not|avoid|without/) ? ["Respect every explicit negative instruction in the original prompt."] : []),
  ]);
  const referenceIntent = has(/replace|swap|substitute/) ? "replacement"
    : has(/same style|style of|look like|visual style|colour palette|color palette/) && has(/reference|this image|this video|uploaded/) ? "style"
    : has(/recreate|same sequence|same shots|same layout|match the edit|copy the structure/) ? "structure"
    : has(/use this|based on|reference|template|uploaded|attached/) ? "mixed" : "unspecified";
  const deliverable = has(/poster|flyer|thumbnail|logo|cover|image|photo|graphic|design/) && !has(/video|reel|short|film|clip/) ? "image or graphic"
    : has(/audio|podcast|voiceover|sound design/) && !has(/video|reel|short|film|clip/) ? "audio"
    : "video or editable timeline";
  const ambiguityNotes: string[] = [];
  if (has(/reference|template|like this|based on this|uploaded|attached/) && !has(/style|replace|recreate|same|match|use as|based on/)) ambiguityNotes.push("Reference purpose is not explicit; inspect the reference and infer whether it informs style, structure or content, while stating the interpretation.");
  if (!/\b\d+\s*(?:seconds?|minutes?|mins?|secs?|s)\b/i.test(original)) ambiguityNotes.push("Duration was not specified; choose a sensible default and state it.");
  if (!has(/\b(9:16|16:9|1:1|4:5|vertical|horizontal|portrait|landscape|square)\b/)) ambiguityNotes.push("Aspect ratio was not specified; use the selected project format.");
  const coreGoal = original.replace(/\s+/g, " ").slice(0, 1200);
  const directorInstruction = [
    "Interpret the user's original words faithfully; do not silently add goals or constraints.",
    "Separate explicit requirements from inferred creative choices.",
    "Use reference files according to their assigned purpose; do not copy unrelated content.",
    "If a reference is ambiguous, state the most reasonable interpretation and keep uncertain choices editable.",
    "Preserve named subjects, wording, logos and required details; obey exclusions.",
    "Do not claim to inspect file contents unless corresponding visual, audio or text evidence is supplied.",
  ].join(" ");
  return { original, coreGoal, deliverable, styleSignals, explicitConstraints, preserve, avoid, referenceIntent, ambiguityNotes, directorInstruction };
}
