import type { MediaAsset, TimelineClip } from "../types";

export type MessageAwareOperation =
  | { kind: "add-title"; text: string; start: number; duration: number; fontSize: number; fontFamily: string; color: string; backgroundColor: string; align: "center"; x: number; y: number; shadow: boolean; animation: "fade" }
  | { kind: "split-clip"; clipId: string; time: number }
  | { kind: "apply-transition"; transition: "fade" | "zoom" | "wipe" | "slide" | "blur"; clipId: string }
  | { kind: "apply-look"; filter: string; clipId: string };

export type MessageAwareSuggestion = {
  id: string; title: string; detail: string; evidence: string; time: number;
  confidence: "high" | "medium" | "low"; operation?: MessageAwareOperation;
};
type Segment = { start: number; end: number; text: string };
type Beat = { assetId: string; time: number };

function sourceToTimeline(clip: TimelineClip, sourceTime: number) {
  return clip.start + (sourceTime - clip.sourceIn) / Math.max(.1, clip.speed || 1);
}
function findVisualClip(clips: TimelineClip[], assets: MediaAsset[], sourceTime: number) {
  return clips.find(clip => {
    const asset = assets.find(item => item.id === clip.assetId);
    return asset && asset.kind !== "audio" && sourceTime >= clip.sourceIn && sourceTime <= clip.sourceOut;
  });
}

export function buildMessageAwarePlan(input: {
  assets: MediaAsset[]; clips: TimelineClip[];
  transcriptSegments: Segment[]; beatMarkers: Beat[];
}): MessageAwareSuggestion[] {
  const { assets, clips } = input;
  const suggestions: MessageAwareSuggestion[] = [];
  const ordered = [...clips].sort((a, b) => a.start - b.start);
  const segments = input.transcriptSegments.filter(item => Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start && item.text.trim()).slice(0, 240);

  for (const segment of segments.slice(0, 16)) {
    const clip = findVisualClip(ordered, assets, segment.start);
    const text = segment.text.trim().replace(/\s+/g, " ").slice(0, 110);
    if (!clip || text.length < 3) continue;
    const start = sourceToTimeline(clip, segment.start);
    const duration = Math.max(1.2, Math.min(5, (segment.end - segment.start) / Math.max(.1, clip.speed || 1)));
    suggestions.push({
      id: "caption-" + clip.id + "-" + Math.round(start * 100), title: "Caption the spoken message",
      detail: "Create an editable caption from the available transcript. Check line breaks and timing against the actual voice.",
      evidence: "Transcript segment · " + segment.start.toFixed(2) + "–" + segment.end.toFixed(2) + "s",
      time: start, confidence: "high",
      operation: { kind: "add-title", text, start, duration, fontSize: 34, fontFamily: "Arial", color: "#ffffff", backgroundColor: "rgba(8,12,22,0.72)", align: "center", x: 50, y: 80, shadow: true, animation: "fade" }
    });
  }

  for (let index = 1; index < segments.length && suggestions.length < 28; index++) {
    const previous = segments[index - 1], next = segments[index];
    const gap = next.start - previous.end;
    if (gap < .8 || gap > 4) continue;
    const clip = findVisualClip(ordered, assets, previous.end);
    if (!clip || clip.speedCurve?.length) continue;
    const time = sourceToTimeline(clip, previous.end);
    if (time <= clip.start + .15 || time >= clip.start + (clip.sourceOut - clip.sourceIn) / Math.max(.1, clip.speed || 1) - .15) continue;
    suggestions.push({
      id: "pause-" + clip.id + "-" + Math.round(time * 100), title: "Review a natural pause for a cut",
      detail: "A " + gap.toFixed(1) + "s transcript gap may be a clean edit point. Preview the audio first; silence may be intentional.",
      evidence: "Transcript timing gap · " + previous.end.toFixed(2) + "–" + next.start.toFixed(2) + "s",
      time, confidence: "medium", operation: { kind: "split-clip", clipId: clip.id, time }
    });
  }

  const audioAssets = new Set(assets.filter(asset => asset.kind === "audio").map(asset => asset.id));
  const audioBeats = input.beatMarkers.filter(beat => audioAssets.has(beat.assetId)).slice(0, 80);
  for (const beat of audioBeats) {
    const audioClip = ordered.find(clip => clip.assetId === beat.assetId && beat.time >= clip.sourceIn && beat.time <= clip.sourceOut);
    if (!audioClip) continue;
    const timelineTime = sourceToTimeline(audioClip, beat.time);
    const visual = ordered.find(clip => {
      const asset = assets.find(item => item.id === clip.assetId);
      const end = clip.start + (clip.sourceOut - clip.sourceIn) / Math.max(.1, clip.speed || 1);
      return asset && asset.kind !== "audio" && timelineTime >= clip.start && timelineTime <= end;
    });
    if (!visual) continue;
    suggestions.push({
      id: "beat-" + visual.id + "-" + Math.round(timelineTime * 100), title: "Use a detected music beat",
      detail: "A locally detected audio transient maps to this timeline moment. Consider a transition or cut on this beat; listen before applying.",
      evidence: "Audio transient candidate · source " + beat.time.toFixed(2) + "s · timeline " + timelineTime.toFixed(2) + "s",
      time: timelineTime, confidence: "medium",
      operation: { kind: "apply-transition", transition: "fade", clipId: visual.id }
    });
    if (suggestions.length >= 32) break;
  }

  for (const clip of ordered.filter(item => assets.find(asset => asset.id === item.assetId)?.kind !== "audio").slice(0, 12)) {
    const sourceText = [clip.label, clip.aiScene?.title, clip.aiScene?.visual, clip.aiScene?.narration].filter(Boolean).join(" ").toLowerCase();
    const messageLook = /faith|wisdom|quote|reflection|hope|inspir|emotional|heart/.test(sourceText) ? "Warm"
      : /hook|attention|energy|action|launch|bold/.test(sourceText) ? "Vivid"
      : /documentary|interview|explain|tutorial|lesson/.test(sourceText) ? "Matte" : "";
    if (!messageLook) continue;
    suggestions.push({
      id: "look-" + clip.id, title: "Match the visual treatment to the message",
      detail: "The scene notes suggest a " + messageLook.toLowerCase() + " treatment. Preview it first; this is a creative interpretation, not an objective classification.",
      evidence: "Scene title, notes or narration", time: clip.start, confidence: "low",
      operation: { kind: "apply-look", filter: messageLook, clipId: clip.id }
    });
  }
  const unique = new Map<string, MessageAwareSuggestion>();
  for (const item of suggestions) if (!unique.has(item.id)) unique.set(item.id, item);
  return [...unique.values()].sort((a, b) => a.time - b.time).slice(0, 32);
}
