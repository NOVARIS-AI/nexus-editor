import type { TimelineClip } from "../types";
import type { MediaAnalysis } from "./engines";
import type { VisualUnderstanding } from "./visual-brain";

export type VisualSceneEvidence = {
  clipId: string;
  assetId: string;
  title: string;
  coverage: "model-described" | "frame-sampled" | "metrics-only" | "not-sampled";
  frameCount: number;
  descriptions: string[];
  sourceTimes: number[];
  compositionNote?: string;
  sceneChangeCount: number;
  confidence: "high" | "medium" | "low";
};

export function buildVisualSceneEvidence(
  clips: TimelineClip[],
  descriptions: VisualUnderstanding[],
  analyses: MediaAnalysis[],
): VisualSceneEvidence[] {
  return [...clips].sort((a, b) => a.start - b.start).map(clip => {
    const frames = descriptions.filter(item => item.assetId === clip.assetId)
      .filter(item => item.timestamp === undefined || (item.timestamp >= clip.sourceIn && item.timestamp <= clip.sourceOut))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const analysis = analyses.find(item => item.assetId === clip.assetId);
    const composition = analysis?.visual?.composition;
    const coverage: VisualSceneEvidence["coverage"] = frames.length ? "model-described"
      : (analysis?.visual?.sampledFrames || 0) > 0 ? "frame-sampled"
      : analysis ? "metrics-only" : "not-sampled";
    const compositionNote = composition
      ? "Contrast-weight centre " + Math.round(composition.focusX) + "% × " + Math.round(composition.focusY) + "%; quieter text region: " + composition.quietZone.replace("-", " ")
      : undefined;
    return {
      clipId: clip.id, assetId: clip.assetId, title: clip.aiScene?.title || clip.label || "Untitled scene",
      coverage, frameCount: frames.length || analysis?.visual?.sampledFrames || 0,
      descriptions: frames.map(frame => frame.description).slice(0, 6),
      sourceTimes: frames.map(frame => frame.timestamp).filter((time): time is number => typeof time === "number"),
      ...(compositionNote ? { compositionNote } : {}),
      sceneChangeCount: analysis?.visual?.sceneChanges.length || 0,
      confidence: frames.length ? "high" : coverage === "frame-sampled" || coverage === "metrics-only" ? "medium" : "low",
    };
  });
}

export function describeVisualCoverage(evidence: VisualSceneEvidence[]) {
  return {
    totalScenes: evidence.length,
    modelDescribed: evidence.filter(item => item.coverage === "model-described").length,
    sampled: evidence.filter(item => item.coverage === "frame-sampled").length,
    metricsOnly: evidence.filter(item => item.coverage === "metrics-only").length,
    notSampled: evidence.filter(item => item.coverage === "not-sampled").length,
    gaps: evidence.filter(item => item.coverage === "not-sampled").map(item => item.title),
  };
}
