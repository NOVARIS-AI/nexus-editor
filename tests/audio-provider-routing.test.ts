import { afterEach, describe, expect, it, vi } from "vitest";
import engineStatusHandler from "../api/engine-status.js";

function makeResponse() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as unknown,
    setHeader(name: string, value: string) { this.headers[name] = value; },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; }
  };
}

describe("NEXUS audio router discovery", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("advertises the dedicated multi-provider router when a secure worker pair exists", () => {
    vi.stubEnv("NEXUS_AUDIO_ENGINE_URL", "https://audio-worker.example");
    vi.stubEnv("NEXUS_AUDIO_ENGINE_TOKEN", "server-secret");
    const response = makeResponse();
    engineStatusHandler({ method: "GET" } as any, response as any);
    expect(response.statusCode).toBe(200);
    expect((response.body as any).engines.audio).toMatchObject({
      configured: true,
      provider: "NEXUS Audio Router",
      capabilities: expect.arrayContaining(["ElevenLabs voice, music and sound effects", "Stable Audio 3 music, ambience and sound effects"])
    });
  });

  it("recognizes a secure shared engine worker as an audio job route", () => {
    vi.stubEnv("NEXUS_ENGINE_WORKER_URL", "https://engine-worker.example");
    vi.stubEnv("NEXUS_ENGINE_WORKER_TOKEN", "server-secret");
    const response = makeResponse();
    engineStatusHandler({ method: "GET" } as any, response as any);
    expect((response.body as any).engines.audio).toMatchObject({ configured: true, provider: "NEXUS Audio Router" });
  });

  it("keeps the local fallback when no secure audio worker is configured", () => {
    vi.stubEnv("NEXUS_AUDIO_ENGINE_URL", "");
    vi.stubEnv("NEXUS_AUDIO_ENGINE_TOKEN", "");
    vi.stubEnv("NEXUS_ENGINE_WORKER_URL", "");
    vi.stubEnv("NEXUS_ENGINE_WORKER_TOKEN", "");
    const response = makeResponse();
    engineStatusHandler({ method: "GET" } as any, response as any);
    expect((response.body as any).engines.audio).toMatchObject({ configured: false, provider: "NEXUS local audio engine" });
  });

  it("does not advertise an insecure audio worker as available", () => {
    vi.stubEnv("NEXUS_AUDIO_ENGINE_URL", "http://audio-worker.example");
    vi.stubEnv("NEXUS_AUDIO_ENGINE_TOKEN", "server-secret");
    const response = makeResponse();
    engineStatusHandler({ method: "GET" } as any, response as any);
    expect((response.body as any).engines.audio.configured).toBe(false);
  });
});
