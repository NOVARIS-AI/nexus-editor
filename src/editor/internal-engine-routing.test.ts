import { describe, expect, it } from "vitest";
import { getInternalEngineOutputKind, isRemoteInternalEngineTool, NEXUS_INTERNAL_ENGINE_TOOLS } from "./internal-engine-routing";

describe("internal NEXUS engine routing", () => {
  it("registers all five requested tools as invisible internal capabilities", () => {
    expect(NEXUS_INTERNAL_ENGINE_TOOLS.map(tool => tool.id)).toEqual(["remotion", "hyperframes", "ffmpeg", "whisper", "ytdlp"]);
    expect(NEXUS_INTERNAL_ENGINE_TOOLS.every(tool => tool.visibleToUsers === false)).toBe(true);
  });

  it("keeps Whisper on the existing speech pipeline rather than a duplicate worker", () => {
    expect(isRemoteInternalEngineTool("whisper")).toBe(false);
    expect(NEXUS_INTERNAL_ENGINE_TOOLS.find(tool => tool.id === "whisper")?.execution).toBe("existing-speech-pipeline");
  });

  it("routes the other four tools through server jobs", () => {
    for (const id of ["remotion", "hyperframes", "ffmpeg", "ytdlp"]) expect(isRemoteInternalEngineTool(id)).toBe(true);
    expect(isRemoteInternalEngineTool("unknown")).toBe(false);
  });

  it("classifies completed outputs by verified MIME type", () => {
    expect(getInternalEngineOutputKind("remotion", "video/mp4")).toBe("video");
    expect(getInternalEngineOutputKind("hyperframes", "video/webm")).toBe("video");
    expect(getInternalEngineOutputKind("ffmpeg", "audio/mpeg")).toBe("audio");
    expect(getInternalEngineOutputKind("ytdlp", "video/mp4")).toBe("video");
    expect(getInternalEngineOutputKind("ytdlp", "application/json")).toBeNull();
    expect(getInternalEngineOutputKind("remotion", "image/png")).toBeNull();
    expect(getInternalEngineOutputKind("whisper", "text/plain")).toBeNull();
  });
});
