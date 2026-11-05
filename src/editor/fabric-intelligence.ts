import type { MediaAsset, TimelineClip, TimelineTextLayer } from "../types";
import type { MediaAnalysis } from "./engines";

export type FabricSceneInsight = {
  clipId: string;
  title: string;
  role: string;
  duration: number;
  clarity: number;
  momentum: number;
  confidence: "high" | "medium" | "low";
  strengths: string[];
  risks: string[];
  nextAction: string;
  context: string;
};

export type FabricMemory = {
  updatedAt: string;
  sceneCount: number;
  assetCount: number;
  lastBrief: string;
  signatures: string[];
  decisions: string[];
};

export function analyseFabricScenes(
  assets: MediaAsset[],
  clips: TimelineClip[],
  textLayers: TimelineTextLayer[],
  analyses: MediaAnalysis[],
  visualDescriptions: { assetId: string; timestamp?: number; description: string }[] = []
): FabricSceneInsight[] {
  const ordered = [...clips].sort((a, b) => a.start - b.start);
  return ordered.map((clip, index) => {
    const duration = Math.max(0, (clip.sourceOut - clip.sourceIn) / (clip.speed || 1));
    const end = clip.start + duration;
    const texts = textLayers.filter(layer => layer.start < end && layer.start + layer.duration > clip.start);
    const asset = assets.find(item => item.id === clip.assetId);
    const analysis = analyses.find(item => item.assetId === clip.assetId);
    const visualContext = visualDescriptions.filter(item => item.assetId === clip.assetId).map(item => item.description);
    const context = [clip.label, clip.aiScene?.title, clip.aiScene?.visual, clip.aiScene?.narration, ...texts.map(layer => layer.text), ...visualContext].filter(Boolean).join(" ");
    const lower = context.toLowerCase();
    const role = /hook|intro|opening|attention|stop scrolling/.test(lower) || index === 0 ? "Hook"
      : /closing|conclusion|subscribe|follow|call to action|takeaway/.test(lower) || index === ordered.length - 1 ? "Closing"
      : /evidence|proof|example|result|demonstrat/.test(lower) ? "Evidence"
      : /context|background|problem|why|story/.test(lower) ? "Context"
      : /quote|wisdom|message|lesson|teach|main point/.test(lower) ? "Core message" : "Development";
    const strengths: string[] = [];
    const risks: string[] = [];
    if (texts.length) strengths.push("Timed message layer supports this scene");
    if (clip.aiScene?.visual) strengths.push("Scene has a written visual brief");
    if (analysis?.visual?.sampledFrames) strengths.push("Real frames sampled locally");
    if (visualContext.length) strengths.push("Vision model described " + visualContext.length + " sampled frame(s)");
    if (duration >= 2 && duration <= 8) strengths.push("Duration sits in a flexible short-form range");
    if (!texts.length && role === "Core message") risks.push("Core message has no overlapping text layer");
    if (duration < 1.2) risks.push("Very short scene; verify the cut is intentional");
    if (duration > 12) risks.push("Long scene; check whether it needs an internal cut or visual change");
    if (!asset) risks.push("Source media reference is missing");
    if (analysis?.visual?.sceneChanges.length) strengths.push(analysis.visual.sceneChanges.length + " possible visual change point(s) in source");
    const clarity = Math.max(10, Math.min(100, 42 + (texts.length ? 18 : 0) + (clip.aiScene?.visual ? 14 : 0) + (clip.aiScene?.narration ? 10 : 0) + (analysis?.visual?.sampledFrames ? 10 : 0) - risks.length * 12));
    const momentum = Math.max(10, Math.min(100, 55 + (role === "Hook" ? 18 : 0) + (role === "Closing" ? 8 : 0) + (duration < 2 ? -14 : duration > 12 ? -12 : 8) + (index > 0 && clip.start > ordered[index - 1].start + Math.max(0, (ordered[index - 1].sourceOut - ordered[index - 1].sourceIn) / (ordered[index - 1].speed || 1)) + .25 ? -18 : 0)));
    const confidence = visualContext.length ? "high" : clip.aiScene?.visual || texts.length || analysis?.visual?.sampledFrames ? "medium" : "low";
    const nextAction = risks[0] || (role === "Hook" ? "Check that the first frame communicates the subject immediately" : role === "Closing" ? "Make the final message and call to action easy to remember" : "Compare this scene's visual rhythm with the scenes around it");
    return { clipId: clip.id, title: clip.aiScene?.title || clip.label || "Untitled scene", role, duration, clarity, momentum, confidence, strengths, risks, nextAction, context };
  });
}

export function recommendFabricActions(scenes: FabricSceneInsight[], clips: TimelineClip[]) {
  const recommendations: { title: string; detail: string; clipId?: string; priority: "high" | "normal" }[] = [];
  if (!scenes.length) return [{ title: "Build the first scene", detail: "Import media and place at least one clip on the timeline to activate project intelligence.", priority: "normal" as const }];
  const hook = scenes[0];
  if (hook.duration > 3.5) recommendations.push({ title: "Tighten the opening", detail: "Your first scene runs " + hook.duration.toFixed(1) + "s. Check whether the strongest visual or message can arrive sooner.", clipId: hook.clipId, priority: "high" });
  if (hook.clarity < 55) recommendations.push({ title: "Clarify the hook", detail: "Add a concise opening caption or a clearer scene note so the first beat has a defined purpose.", clipId: hook.clipId, priority: "high" });
  const weak = scenes.find(scene => scene.clarity < 55 && scene.role !== "Hook");
  if (weak) recommendations.push({ title: "Strengthen " + weak.role.toLowerCase(), detail: weak.nextAction, clipId: weak.clipId, priority: "normal" });
  const long = scenes.find(scene => scene.duration > 12);
  if (long) recommendations.push({ title: "Review long scene", detail: "Consider an internal cut, reframing or supporting visual after " + long.duration.toFixed(1) + "s.", clipId: long.clipId, priority: "normal" });
  const gaps = [...clips].sort((a, b) => a.start - b.start).slice(1).filter((clip, index, arr) => {
    const previous = [...clips].sort((a, b) => a.start - b.start)[index];
    return previous && clip.start > previous.start + Math.max(0, (previous.sourceOut - previous.sourceIn) / (previous.speed || 1)) + .25;
  });
  if (gaps.length) recommendations.push({ title: "Inspect timeline gap", detail: "A gap may interrupt the story flow. Review the cut before closing it.", clipId: gaps[0].id, priority: "high" });
  if (!recommendations.length) recommendations.push({ title: "Run a story pass", detail: "The structure looks balanced under local checks. Review the actual footage, sound and message together.", priority: "normal" });
  return recommendations.slice(0, 5);
}

export function makeDirectorBrief(projectName: string, purpose: string, audience: string, scenes: FabricSceneInsight[], recommendations: ReturnType<typeof recommendFabricActions>) {
  const sceneLines = scenes.map((scene, index) => (index + 1) + ". " + scene.role + " — " + scene.title + " (" + scene.duration.toFixed(1) + "s): " + (scene.context || "No written scene context yet")).join("\n");
  const actionLines = recommendations.map(item => "- " + item.title + ": " + item.detail).join("\n");
  return "Continue directing my existing NEXUS project: " + projectName + ". Do not replace the edit.\nPurpose: " + (purpose || "Not specified") + "\nAudience: " + (audience || "Not specified") + "\nCurrent scene map:\n" + (sceneLines || "No scenes yet") + "\nFabric recommendations:\n" + actionLines + "\nPreserve existing media and make changes reviewable before applying.";
}

export function readFabricMemory(projectName: string): FabricMemory | null {
  try {
    const raw = localStorage.getItem("nexus-fabric-memory:" + projectName);
    return raw ? JSON.parse(raw) as FabricMemory : null;
  } catch { return null; }
}

export function writeFabricMemory(projectName: string, memory: FabricMemory) {
  try { localStorage.setItem("nexus-fabric-memory:" + projectName, JSON.stringify(memory)); return true; }
  catch { return false; }
}
