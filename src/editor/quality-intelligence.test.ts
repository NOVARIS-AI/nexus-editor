import { describe, expect, it } from "vitest";
import { inspectProjectQuality, qualitySummary } from "./quality-intelligence";

describe("NEXUS render quality gate", () => {
  it("blocks an empty project before rendering", () => {
    const findings = inspectProjectQuality({
      assets: [], clips: [], imageLayers: [], textLayers: [], tracks: [], duration: 0
    });
    expect(qualitySummary(findings).ready).toBe(false);
    expect(findings.some(item => item.id === "empty" && item.severity === "error")).toBe(true);
  });

  it("returns a clean structural report for a valid empty overlay set with a visible clip", () => {
    const asset = { id: "video-1", name: "Source", kind: "video", duration: 8, objectUrl: "blob:source" } as never;
    const clip = { id: "clip-1", assetId: "video-1", trackId: "video-track", start: 0, sourceIn: 0, sourceOut: 8, label: "Opening" } as never;
    const track = { id: "video-track", name: "Video", kind: "video" } as never;
    const findings = inspectProjectQuality({
      assets: [asset], clips: [clip], imageLayers: [], textLayers: [], tracks: [track], duration: 8
    });
    expect(qualitySummary(findings).ready).toBe(true);
    expect(findings.some(item => item.severity === "error")).toBe(false);
  });

  it("identifies missing assets and invalid timeline timing as export blockers", () => {
    const clip = { id: "broken", assetId: "missing", trackId: "video-track", start: -1, sourceIn: 0, sourceOut: 0, label: "Broken" } as never;
    const findings = inspectProjectQuality({
      assets: [], clips: [clip], imageLayers: [], textLayers: [], tracks: [], duration: 3
    });
    expect(findings.some(item => item.id === "asset:broken" && item.severity === "error")).toBe(true);
    expect(findings.some(item => item.id === "timing:broken" && item.severity === "error")).toBe(true);
  });
});
