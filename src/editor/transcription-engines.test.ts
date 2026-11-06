import { describe, expect, it } from "vitest";
import { getSpeechPerformanceProfile, validateSpeechMedia } from "./transcription-engines";

describe("internal speech engine resilience", () => {
  it("uses compact-device limits for low-memory Android devices", () => {
    const profile = getSpeechPerformanceProfile({ deviceMemory: 3, hardwareConcurrency: 4 });
    expect(profile.tier).toBe("compact");
    expect(profile.maxLocalBytes).toBe(12 * 1024 * 1024);
    expect(profile.maxLocalSeconds).toBe(120);
  });

  it("allows a larger local budget on capable devices", () => {
    const profile = getSpeechPerformanceProfile({ deviceMemory: 8, hardwareConcurrency: 8 });
    expect(profile.tier).toBe("power");
    expect(profile.maxLocalBytes).toBe(48 * 1024 * 1024);
  });

  it("rejects empty media", () => {
    expect(validateSpeechMedia(new File([], "empty.wav", { type: "audio/wav" }))).toContain("empty");
  });

  it("rejects unsupported formats before calling a provider", () => {
    expect(validateSpeechMedia(new File(["data"], "clip.xyz", { type: "application/x-unknown" }))).toContain("not supported");
  });

  it("enforces the connected provider's 25 MB request limit", () => {
    const file = new File([new Uint8Array(25 * 1024 * 1024 + 1)], "long.wav", { type: "audio/wav" });
    expect(validateSpeechMedia(file, true)).toContain("25 MB");
  });

  it("accepts supported browser audio formats", () => {
    for (const type of ["audio/mpeg", "audio/wav", "audio/mp4", "audio/webm", "audio/ogg"]) {
      expect(validateSpeechMedia(new File(["audio"], "clip", { type }))).toBeNull();
    }
  });
});
