import { beforeEach, describe, expect, it } from "vitest";
import { clipDuration, clipSourceAtTimeline, clipTimelineAtSource, defaultTracks, makeProject, parseProject, speedAtSourceProgress } from "../src/project";
import { understandDirectorPrompt } from "../src/editor/prompt-understander";
import { buildReferenceContext, buildReferenceFusion } from "../src/editor/reference-workflow";
import { analyseFabricScenes, makeDirectorBrief, recommendFabricActions, readFabricMemory, writeFabricMemory } from "../src/editor/fabric-intelligence";
import { parseLocalDraft, readRecoverableDraft, writeRecoverableDraft } from "../src/editor/project-recovery";
import { buildSceneVisualPrompt, createSceneAudioPreset, resolveSceneGenerationRoute, validateGeneratedImage } from "../src/editor/scene-creation-pipeline";
import { prepareExecutionPlan, splitTimelineClipAtTime } from "../src/editor/editing-execution-engine";
import { inspectProjectQuality, qualitySummary } from "../src/editor/quality-intelligence";
import { classifyExportFailure, inspectExportRequest, makeExportFilename, validateExportBlob } from "../src/editor/export-reliability";

const asset = { id: "media-1", name: "opening.mp4", kind: "video" as const, duration: 12, mimeType: "video/mp4" };
const clip = { id: "clip-1", assetId: "media-1", trackId: "video-1", start: 0, sourceIn: 0, sourceOut: 8, label: "Opening" };
let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
    },
  });
});

describe("Core project and timeline foundation", () => {
  it("round-trips a valid project and fills legacy overlay arrays", () => {
    const project = { ...makeProject("Regression"), assets: [asset], tracks: defaultTracks, clips: [clip] };
    const parsed = parseProject(JSON.stringify(project));
    expect(parsed.name).toBe("Regression");
    expect(parsed.clips).toHaveLength(1);
    expect(parsed.textLayers).toEqual([]);
    expect(parsed.imageLayers).toEqual([]);
  });

  it("rejects malformed clip references and malformed overlay layers", () => {
    const project = { ...makeProject(), assets: [asset], tracks: defaultTracks, clips: [{ ...clip, assetId: "missing" }] };
    expect(() => parseProject(JSON.stringify(project))).toThrow(/missing media/i);
    const badOverlay = { ...makeProject(), assets: [asset], tracks: defaultTracks, clips: [], imageLayers: [{ id: "img-1", assetId: "media-1", trackId: "image-1", start: 0, duration: 3 }] };
    expect(() => parseProject(JSON.stringify(badOverlay))).toThrow(/malformed/i);
  });

  it("keeps fixed-speed and speed-curve time conversions consistent", () => {
    const fixed = { ...clip, sourceIn: 2, sourceOut: 10, speed: 2 };
    expect(clipDuration(fixed)).toBe(4);
    expect(clipSourceAtTimeline(fixed, 2)).toBe(6);
    expect(clipTimelineAtSource(fixed, 6)).toBe(2);
    const ramp = { ...clip, sourceOut: 8, speed: 1, speedCurve: [{ position: 0, speed: 1 }, { position: 1, speed: 2 }] };
    expect(speedAtSourceProgress(ramp, 0.5)).toBeCloseTo(1.5);
    const atHalf = clipSourceAtTimeline(ramp, clipDuration(ramp) / 2);
    expect(clipTimelineAtSource(ramp, atHalf)).toBeCloseTo(clipDuration(ramp) / 2, 2);
  });
});

describe("Prompt understanding and reference intelligence", () => {
  it("separates explicit creative requirements from inferred choices", () => {
    const result = understandDirectorPrompt("Create a cinematic 9:16 video under 30 seconds. Keep the same logo and exact wording, no watermark.");
    expect(result.styleSignals).toContain("cinematic");
    expect(result.explicitConstraints).toContain("9:16");
    expect(result.explicitConstraints.some(item => /under 30 seconds/i.test(item))).toBe(true);
    expect(result.preserve.length).toBeGreaterThan(0);
    expect(result.avoid).toContain("No watermark.");
  });

  it("assigns distinct style and replacement roles when both are requested", () => {
    const assets = [
      { id: "style", name: "style.png", kind: "image" },
      { id: "structure", name: "sequence.mp4", kind: "video" },
      { id: "replacement", name: "replacement.png", kind: "image" },
      { id: "script", name: "script.pdf", kind: "document" },
      { id: "sound", name: "music.wav", kind: "audio" },
    ];
    const contexts = buildReferenceContext(assets, [], "Use the image as a style reference and replace the person with the replacement image. Match the shot order.");
    expect(contexts.find(item => item.id === "style")?.role).toBe("style reference");
    expect(contexts.find(item => item.id === "replacement")?.role).toBe("replacement image");
    expect(contexts.find(item => item.id === "structure")?.role).toBe("reference video");
    expect(contexts.find(item => item.id === "script")?.role).toBe("script or document");
    expect(contexts.find(item => item.id === "sound")?.role).toBe("audio source");
    expect(contexts.find(item => item.id === "script")?.limitations).toContain("Document contents are not inferred from the filename");
  });

  it("keeps multi-reference contributions in separate lanes", () => {
    const refs = buildReferenceContext([
      { id: "one", name: "mood.png", kind: "image" },
      { id: "two", name: "edit.mp4", kind: "video" },
    ], [], "Use the visual style and match the shot order.");
    const fusion = buildReferenceFusion(refs, "Use the visual style and match the shot order.");
    expect(fusion.referenceCount).toBe(2);
    expect(fusion.assignments.map(item => item.role)).toContain("style reference");
    expect(fusion.assignments.map(item => item.role)).toContain("reference video");
    expect(fusion.synthesisRules.some(rule => /separate lanes/i.test(rule))).toBe(true);
  });
});

describe("Creative Fabric project intelligence", () => {
  it("builds scene roles, risks, recommendations and a director brief from timeline evidence", () => {
    const second = { ...clip, id: "clip-2", start: 8, label: "Wisdom lesson" };
    const third = { ...clip, id: "clip-3", start: 16, label: "Ending" };
    const scenes = analyseFabricScenes([asset], [clip, second, third], [], [], []);
    expect(scenes[0].role).toBe("Hook");
    expect(scenes[1].role).toBe("Core message");
    expect(scenes[1].risks).toContain("Core message has no overlapping text layer");
    const recommendations = recommendFabricActions(scenes, [clip, second, third]);
    expect(recommendations.length).toBeGreaterThan(0);
    expect(makeDirectorBrief("Test", "Teach", "Creators", scenes, recommendations)).toContain("Continue directing my existing NEXUS project");
  });

  it("stores and reads project memory without losing its structure", () => {
    const memory = { updatedAt: "2026-11-05T00:00:00.000Z", sceneCount: 1, assetCount: 1, lastBrief: "Keep the hook", signatures: ["Hook:Opening:8"], decisions: [] };
    expect(writeFabricMemory("Test", memory)).toBe(true);
    expect(readFabricMemory("Test")).toEqual(memory);
  });
});


describe("Build 9 — Intelligent media and creation pipeline", () => {
  const scene = { title: "Wisdom message", visual: "A speaker in a warm cinematic interior", narration: "Share a thoughtful message", searchTerms: ["warm light", "portrait"], duration: 18 };

  it("builds a scene-specific prompt from brief, style and delivery frame", () => {
    const prompt = buildSceneVisualPrompt(scene, { style: "Documentary", aspectRatio: "9:16", projectBrief: "A calm educational short" });
    expect(prompt).toContain("Wisdom message");
    expect(prompt).toContain("Documentary");
    expect(prompt).toContain("9:16");
    expect(prompt).toContain("not a finished video");
    expect(prompt).toContain("Do not add typography");
  });

  it("routes to configured engines and never pretends a fallback is model-generated video", () => {
    expect(resolveSceneGenerationRoute("video", { imageConfigured: true, videoConfigured: true }).route).toBe("managed-video-worker");
    expect(resolveSceneGenerationRoute("video", { imageConfigured: true, videoConfigured: false }).route).toBe("image-motion-fallback");
    expect(resolveSceneGenerationRoute("video", { imageConfigured: false, videoConfigured: false }).route).toBe("unavailable");
    expect(resolveSceneGenerationRoute("image", { imageConfigured: false, videoConfigured: true }).route).toBe("unavailable");
  });

  it("creates bounded procedural music beds and short transition accents", () => {
    const music = createSceneAudioPreset(scene);
    expect(music.kind).toBe("music");
    expect(music.duration).toBe(12);
    const accent = createSceneAudioPreset({ ...scene, audioCueType: "whoosh transition", duration: 20 });
    expect(accent.kind).toBe("sfx");
    expect(accent.recipe).toBe("sweep");
    expect(accent.duration).toBeLessThanOrEqual(3.5);
  });

  it("rejects invalid, empty and oversized generated images", () => {
    expect(validateGeneratedImage(new Blob(["png"], { type: "image/png" })).extension).toBe("png");
    expect(() => validateGeneratedImage(new Blob(["bad"], { type: "text/plain" }))).toThrow(/PNG, JPEG or WebP/i);
    expect(() => validateGeneratedImage(new Blob([], { type: "image/png" }))).toThrow(/empty/i);
    expect(() => validateGeneratedImage(new Blob(["12345"], { type: "image/png" }), "", 4)).toThrow(/import limit/i);
  });
});


describe("Build 10 — AI editing execution engine",()=>{
 it("prepares safe reviewable operations and rejects invalid split targets",()=>{
  const plan=prepareExecutionPlan([{kind:"add-title",text:"A clear message",start:2,duration:4},{kind:"apply-look",filter:"Cinematic",clipId:"clip-1"},{kind:"split-clip",clipId:"clip-1",time:4},{kind:"split-clip",clipId:"clip-1",time:0}],{assets:[{...asset,objectUrl:"blob:video"}],clips:[clip],textLayers:[],selectedClipId:"clip-1",playhead:0});
  expect(plan.requiresApproval).toBe(true);expect(plan.accepted).toHaveLength(3);expect(plan.rejected).toHaveLength(1);
 });
 it("splits a clip while preserving the source boundary",()=>{const [left,right]=splitTimelineClipAtTime(clip,3);expect(left.sourceOut).toBe(3);expect(right.sourceIn).toBe(3);expect(right.start).toBe(3);});
});
describe("Build 11 — Quality intelligence",()=>{
 it("finds missing assets, short reading time and small text",()=>{
  const findings=inspectProjectQuality({assets:[asset],clips:[{...clip,assetId:"missing"}],imageLayers:[],textLayers:[{id:"t",trackId:"text-1",start:0,duration:.5,text:"This is a long message that needs much more reading time",color:"#fff",fontSize:12,fontFamily:"Arial"}],tracks:defaultTracks,duration:8});
  expect(findings.some(x=>x.severity==="error"&&/missing media/i.test(x.title))).toBe(true);expect(findings.some(x=>x.id==="read:t")).toBe(true);expect(findings.some(x=>x.id==="small:t")).toBe(true);expect(qualitySummary(findings).ready).toBe(false);
 });
 it("marks a structurally clean project ready for human review",()=>{const findings=inspectProjectQuality({assets:[{...asset,objectUrl:"blob:video"}],clips:[clip],imageLayers:[],textLayers:[],tracks:defaultTracks,duration:8});expect(qualitySummary(findings).ready).toBe(true);});
});
describe("Build 12 — Export reliability",()=>{
 it("blocks invalid export requests and clip metadata",()=>{expect(inspectExportRequest({width:0,height:0,fps:30,duration:8,clipCount:1,hasVisual:true,hasAudio:false}).ok).toBe(false);expect(inspectExportRequest({width:1280,height:720,fps:30,duration:8,clipCount:-1,hasVisual:true,hasAudio:true}).errors).toContain("The project contains an invalid clip count.");expect(inspectExportRequest({width:1280,height:720,fps:30,duration:8,clipCount:1,hasVisual:false,hasAudio:true}).ok).toBe(false);});
 it("validates video outputs, custom limits and sanitises filenames",()=>{expect(validateExportBlob(new Blob(["video"],{type:"video/webm"})).extension).toBe("webm");expect(()=>validateExportBlob(new Blob([],{type:"video/mp4"}))).toThrow(/empty/i);expect(()=>validateExportBlob(new Blob(["12345"],{type:"video/mp4"}),4)).toThrow(/0.00 GB/);expect(makeExportFilename("My project / final","mp4")).toBe("My-project-final.mp4");expect(makeExportFilename("Untitled","")).toBe("Untitled.mp4");});
 it("classifies cancellation and decode failures",()=>{expect(classifyExportFailure(new Error("Export cancelled")).code).toBe("cancelled");expect(classifyExportFailure(new Error("A media file could not be decoded")).code).toBe("media-decode");});
});

describe("Local project recovery", () => {
  it("rejects corrupt recovery data and writes a recoverable draft", () => {
    expect(parseLocalDraft("{broken")).toBeNull();
    const draft = { version: 3 as const, projectName: "Recovered", clips: [clip], textLayers: [], imageLayers: [], tracks: defaultTracks, aspectRatio: "9:16", savedAt: 100 };
    expect(writeRecoverableDraft(draft)).toBe(true);
    expect(readRecoverableDraft()?.projectName).toBe("Recovered");
  });
});
