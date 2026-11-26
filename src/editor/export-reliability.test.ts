import { describe, expect, it } from "vitest";
import { classifyExportFailure, inspectExportRequest, makeExportFilename, validateExportBlob } from "./export-reliability";

describe("NEXUS export reliability gates", () => {
  it("rejects invalid dimensions, frame rates and absent visuals", () => {
    const result = inspectExportRequest({
      width: 100, height: 100, fps: 120, duration: 10, clipCount: 0, hasVisual: false, hasAudio: false
    });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("accepts a valid MP4/WebM blob and rejects empty or unsupported output", () => {
    expect(validateExportBlob(new Blob(["video"], { type: "video/mp4" })).extension).toBe("mp4");
    expect(validateExportBlob(new Blob(["video"], { type: "video/webm" })).extension).toBe("webm");
    expect(() => validateExportBlob(new Blob([], { type: "video/mp4" }))).toThrow(/empty video/i);
    expect(() => validateExportBlob(new Blob(["audio"], { type: "audio/wav" }))).toThrow(/unsupported video format/i);
  });

  it("normalises filenames and explains resource-limit failures", () => {
    expect(makeExportFilename("My Project !!!", "MP4")).toBe("My-Project.mp4");
    expect(classifyExportFailure(new Error("Out of memory at 4K resolution")).code).toBe("resource-limit");
  });
});
