import { afterEach, describe, expect, it, vi } from "vitest";
import engineJobsHandler from "../api/engine-jobs.js";

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

describe("NEXUS internal engine job API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("does not create a duplicate remote Whisper worker job", async () => {
    const response = makeResponse();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await engineJobsHandler({ method: "POST", query: {}, body: { engine: "whisper", prompt: "Transcribe audio" } } as any, response as any);
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({ error: "Unsupported NEXUS engine." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits server-backed jobs with server-only credentials", async () => {
    vi.stubEnv("NEXUS_REMOTION_ENGINE_URL", "https://remotion.example");
    vi.stubEnv("NEXUS_REMOTION_ENGINE_TOKEN", "server-secret");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "render-123", state: "queued", progress: 0, message: "Queued" })
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = makeResponse();
    await engineJobsHandler({ method: "POST", query: {}, body: { engine: "remotion", prompt: "Render scenes", options: { fps: 30 } } } as any, response as any);
    expect(response.statusCode).toBe(202);
    expect(response.body).toMatchObject({ id: "render-123", state: "queued" });
    expect(fetchMock).toHaveBeenCalledWith("https://remotion.example/jobs", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer server-secret" })
    }));
  });

  it("rejects insecure worker endpoints without making a network request", async () => {
    vi.stubEnv("NEXUS_FFMPEG_ENGINE_URL", "http://unsafe.example");
    vi.stubEnv("NEXUS_FFMPEG_ENGINE_TOKEN", "server-secret");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = makeResponse();
    await engineJobsHandler({ method: "POST", query: {}, body: { engine: "ffmpeg", prompt: "Prepare export" } } as any, response as any);
    expect(response.statusCode).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
