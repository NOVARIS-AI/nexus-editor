export type LiveEditStep =
  | { type: "select"; target: string; label: string }
  | { type: "speed"; value: number; label: string }
  | { type: "volume"; value: number; label: string }
  | { type: "mute"; value: boolean; label: string }
  | { type: "fade"; direction: "in" | "out"; seconds: number; label: string }
  | { type: "title"; text: string; label: string }
  | { type: "ratio"; value: "9:16" | "16:9" | "1:1" | "4:5" | "3:4"; label: string }
  | { type: "duplicate"; label: string }
  | { type: "move"; seconds: number; label: string };

export interface LiveEditPlan {
  steps: LiveEditStep[];
  unsupported: string[];
}

const actionStart = /\b(?:select|choose|focus|set|change|adjust|add|insert|create|apply|fade|mute|unmute|duplicate|copy|move|place)\b/i;

function splitInstruction(input: string): string[] {
  return input
    .replace(/[’]/g, "'")
    .split(/\s*(?:;|\bthen\b|\band\s+then\b)\s*|\s*,\s*(?=(?:select|choose|focus|set|change|adjust|add|insert|create|apply|fade|mute|unmute|duplicate|copy|move|place)\b)|\s+and\s+(?=(?:select|choose|focus|set|change|adjust|add|insert|create|apply|fade|mute|unmute|duplicate|copy|move|place)\b)/i)
    .map(part => part.trim().replace(/^(?:and|then)\s+/i, "").replace(/[.!]+$/, "").trim())
    .filter(Boolean);
}

function parseStep(raw: string): LiveEditStep | null {
  let match = raw.match(/^(?:select|choose|focus)\s+(?:the\s+)?(?:clip\s+)?["“]?(.+?)["”]?$/i);
  if (match) return { type: "select", target: match[1].trim(), label: "Select clip · " + match[1].trim() };

  match = raw.match(/^(?:(?:set|change|adjust)\s+(?:the\s+)?(?:playback\s+)?speed\s*(?:to|at|=)?\s*|(?:set\s+it\s+to\s+))([0-4]?(?:\.\d+)?)\s*x(?:\s+speed)?$/i)
    || raw.match(/^(?:set|change|adjust)\s+(?:the\s+)?(?:playback\s+)?speed\s*(?:to|at|=)?\s*([0-4]?(?:\.\d+)?)$/i);
  if (match && Number(match[1]) >= 0.1 && Number(match[1]) <= 4) return { type: "speed", value: Number(match[1]), label: "Set speed · " + Number(match[1]) + "×" };

  match = raw.match(/^(?:(?:set|change|adjust)\s+(?:the\s+)?(?:clip\s+)?(?:volume|gain)\s*(?:to|at|=)?\s*|(?:volume|gain)\s*(?:to|at|=)?\s*)(\d{1,3})\s*%$/i);
  if (match) return { type: "volume", value: Math.max(0, Math.min(200, Number(match[1]))), label: "Set volume · " + Math.max(0, Math.min(200, Number(match[1]))) + "%" };

  if (/^(?:mute|silence)(?:\s+(?:the\s+)?(?:clip|audio|selected))?$/i.test(raw)) return { type: "mute", value: true, label: "Mute clip" };
  if (/^(?:unmute)(?:\s+(?:the\s+)?(?:clip|audio|selected))?$/i.test(raw)) return { type: "mute", value: false, label: "Unmute clip" };

  match = raw.match(/^fade\s*(in|out)\s*(?:(?:for|over)\s*)?(\d+(?:\.\d+)?)?\s*(?:seconds?|secs?|s)?$/i);
  if (match) return { type: "fade", direction: match[1].toLowerCase() as "in" | "out", seconds: Math.max(0, Math.min(10, Number(match[2] || 1))), label: "Fade " + match[1].toLowerCase() + " · " + Number(match[2] || 1) + "s" };

  match = raw.match(/^(?:add|insert|create)\s+(?:a\s+)?(?:text\s+)?(?:title|caption|text)(?:\s+(?:saying|that says|:)?\s*["“]?(.+?)["”]?)?$/i);
  if (match) return { type: "title", text: (match[1] || "Your title").trim().replace(/^["“]|["”]$/g, "").slice(0, 180), label: "Add title" };

  match = raw.match(/^(?:(?:set|change)\s+)?(?:the\s+)?(?:canvas\s+)?(?:aspect\s+)?(?:ratio|format)\s*(?:to|=)?\s*(9:16|16:9|1:1|4:5|3:4)$/i)
    || raw.match(/^(9:16|16:9|1:1|4:5|3:4)\s+(?:ratio|canvas|format)$/i);
  if (match) return { type: "ratio", value: match[1] as "9:16" | "16:9" | "1:1" | "4:5" | "3:4", label: "Change canvas · " + match[1] };

  if (/^(?:duplicate|copy)(?:\s+(?:the\s+)?(?:selected\s+)?clip)?$/i.test(raw)) return { type: "duplicate", label: "Duplicate clip" };

  match = raw.match(/^(?:move|place|position)\s+(?:the\s+)?(?:selected\s+)?(?:clip\s+)?(?:to|at)\s*(\d+(?:\.\d+)?)\s*(?:s|sec|seconds?)$/i);
  if (match) return { type: "move", seconds: Math.max(0, Math.min(600, Number(match[1]))), label: "Move clip · " + Number(match[1]) + "s" };

  return null;
}

export function planLiveEditInstruction(input: string): LiveEditPlan | null {
  const parts = splitInstruction(input);
  if (parts.length < 2 || !parts.some(part => actionStart.test(part))) return null;
  const steps: LiveEditStep[] = [];
  const unsupported: string[] = [];
  for (const part of parts) {
    const step = parseStep(part);
    if (step) steps.push(step);
    else unsupported.push(part);
  }
  if (steps.length < 2) return null;
  return { steps, unsupported };
}
