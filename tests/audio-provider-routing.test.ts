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

describe("NEXUS audio provider discovery", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("exposes Voxillika only when the audio worker is configured and selected", () => {
    vi.stubEnv("NEXUS_AUDIO_ENGINE_URL", "https://audio-worker.example");
    vi.stubEnv("NEXUS_AUDIO_ENGINE_TOKEN", "server-secret");
    vi.stubEnv("NEXUS_AUDIO_ENGINE_PROVIDER", "voxillika");
    const response = makeResponse();
    engineStatusHandler({ method: "GET" } as any, response as any);
    expect(response.statusCode).toBe(200);
    expect((response.body as any).engines.audio).toMatchObject({ configured: true, provider: "Voxillika" });
  });

  it("recognizes the shared engine worker as an audio job route", () => {
    vi.stubEnv("NEXUS_ENGINE_WORKER_URL", "https://engine-worker.example");
    vi.stubEnv("NEXUS_ENGINE_WORKER_TOKEN", "server-secret");
    vi.stubEnv("NEXUS_AUDIO_ENGINE_PROVIDER", "voxillika");
    const response = makeResponse();
    engineStatusHandler({ method: "GET" } as any, response as any);
    expect((response.body as any).engines.audio).toMatchObject({ configured: true, provider: "Voxillika" });
  });

  it("does not advertise Voxillika when no secure worker is configured", () => {
    vi.stubEnv("NEXUS_AUDIO_ENGINE_PROVIDER", "voxillika");
    const response = makeResponse();
    engineStatusHandler({ method: "GET" } as any, response as any);
    expect((response.body as any).engines.audio).toMatchObject({ configured: false, provider: "NEXUS-managed audio worker" });
  });
});
