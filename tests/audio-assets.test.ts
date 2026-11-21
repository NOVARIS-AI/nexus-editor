import { afterEach, describe, expect, it, vi } from "vitest";
import audioAssetsHandler from "../api/audio-assets.js";

function response() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as unknown,
    setHeader(name: string, value: string) { this.headers[name] = value; },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
    send(body: unknown) { this.body = body; return this; }
  };
}

describe("private generated audio asset proxy", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("rejects malformed asset IDs before contacting the worker", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = response();
    await audioAssetsHandler({ method: "GET", query: { id: "../secret" } } as any, res as any);
    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the server-side token and returns only audio bytes", async () => {
    vi.stubEnv("NEXUS_AUDIO_ENGINE_URL", "https://audio-worker.example");
    vi.stubEnv("NEXUS_AUDIO_ENGINE_TOKEN", "private-token");
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer private-token");
      return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "Content-Type": "audio/mpeg" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const res = response();
    await audioAssetsHandler({ method: "GET", query: { id: "1234567890abcdef1234567890abcdef" } } as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.headers["Content-Type"]).toBe("audio/mpeg");
    expect((res.body as Uint8Array).byteLength).toBe(3);
  });

  it("refuses a non-audio worker response", async () => {
    vi.stubEnv("NEXUS_AUDIO_ENGINE_URL", "https://audio-worker.example");
    vi.stubEnv("NEXUS_AUDIO_ENGINE_TOKEN", "private-token");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not audio", { status: 200, headers: { "Content-Type": "text/html" } })));
    const res = response();
    await audioAssetsHandler({ method: "GET", query: { id: "1234567890abcdef1234567890abcdef" } } as any, res as any);
    expect(res.statusCode).toBe(502);
  });
});
