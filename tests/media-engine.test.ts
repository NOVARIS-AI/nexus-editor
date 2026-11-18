import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("mediabunny", () => {
  class BlobSource {
    file: File;
    constructor(file: File) { this.file = file; }
  }
  class Input {
    constructor(_options: unknown) {}
    async getPrimaryVideoTrack() {
      return {
        canDecode: async () => true,
        getFirstTimestamp: async () => 0,
        computeDuration: async () => 4,
      };
    }
    async getPrimaryAudioTrack() {
      return {
        canDecode: async () => true,
        getSampleRate: async () => 8,
        getFirstTimestamp: async () => 0,
        computeDuration: async () => 1,
      };
    }
  }
  class CanvasSink {
    constructor(_track: unknown, _options: unknown) {}
    async *canvasesAtTimestamps(timestamps: number[]) {
      for (const timestamp of timestamps) {
        yield { timestamp, canvas: { width: 640, height: 360 } };
      }
    }
  }
  class AudioSampleSink {
    constructor(_track: unknown) {}
    async *samples() {
      const sample = {
        timestamp: 0,
        allocationSize: () => 8 * 4,
        copyTo: async (target: Float32Array) => {
          target.set([0, 0.2, -0.4, 0.8, -1, 0.4, 0.2, 0]);
        },
        close: vi.fn(),
      };
      yield sample;
    }
  }
  return { Input, ALL_FORMATS: [], BlobSource, CanvasSink, AudioSampleSink };
});

import { extractAudioWaveformPeaks, extractVideoFilmstripFrames, getFilmstripFrameCount } from "../src/editor/media-engine";

afterEach(() => vi.unstubAllGlobals());

describe("NEXUS incremental media engine", () => {
  it("keeps filmstrip thumbnails detailed but bounded for each device tier", () => {
    expect(getFilmstripFrameCount(1, "compact")).toBe(12);
    expect(getFilmstripFrameCount(30, "compact")).toBe(23);
    expect(getFilmstripFrameCount(120, "compact")).toBe(24);
    expect(getFilmstripFrameCount(120, "balanced")).toBe(40);
    expect(getFilmstripFrameCount(120, "power")).toBe(64);
    expect(getFilmstripFrameCount(Number.NaN, "balanced")).toBe(12);
  });

  it("extracts timestamped video frames progressively within the requested source range", async () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toDataURL: () => "data:image/jpeg;base64,frame",
    };
    vi.stubGlobal("document", { createElement: () => canvas });
    const progress: string[][] = [];
    const frames = await extractVideoFilmstripFrames(
      new Blob(["video"]) as File,
      2,
      1,
      3,
      value => progress.push(value),
    );
    expect(frames.length).toBeGreaterThanOrEqual(8);
    expect(frames.every(frame => frame.startsWith("data:image/jpeg"))).toBe(true);
    expect(progress.length).toBeGreaterThan(0);
    expect(progress.at(-1)).toEqual(frames);
    expect(canvas.width).toBe(112);
    expect(canvas.height).toBe(63);
  });

  it("creates bounded, normalized waveform peaks from incrementally decoded samples", async () => {
    const peaks = await extractAudioWaveformPeaks(new Blob(["audio"]) as File, 64);
    expect(peaks).toHaveLength(64);
    expect(peaks.every(value => Number.isFinite(value) && value >= 0.045 && value <= 1)).toBe(true);
    expect(Math.max(...peaks)).toBe(1);
    expect(peaks.some(value => value < 0.1)).toBe(true);
  });
});
