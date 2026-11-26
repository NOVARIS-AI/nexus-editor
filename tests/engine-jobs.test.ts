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

describe("NEXUS engine job API output contract", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("rejects a worker success response that has no media output", async () => {
    vi.stubEnv("NEXUS_VIDEO_ENGINE_URL", "https://video-worker.example");
    vi.stubEnv("NEXUS_VIDEO_ENGINE_TOKEN", "private-token");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      id: "job-no-output", state: "succeeded", progress: 100
    })));
    const res = makeResponse();
    await engineJobsHandler({ method: "POST", body: { engine: "video", prompt: "A calm ocean scene" } } as any, res as any);
    expect(res.statusCode).toBe(502);
    expect((res.body as any).error).toMatch(/invalid job record/i);
  });

  it("accepts a completed job with a secure HTTPS media output", async () => {
    vi.stubEnv("NEXUS_VIDEO_ENGINE_URL", "https://video-worker.example");
    vi.stubEnv("NEXUS_VIDEO_ENGINE_TOKEN", "private-token");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      id: "job-with-output", state: "succeeded", progress: 100,
      output: { url: "https://cdn.example.test/scene.mp4", mimeType: "video/mp4" }
    })));
    const res = makeResponse();
    await engineJobsHandler({ method: "POST", body: { engine: "video", prompt: "A calm ocean scene" } } as any, res as any);
    expect(res.statusCode).toBe(202);
    expect((res.body as any).output.url).toBe("https://cdn.example.test/scene.mp4");
  });

  it("rejects insecure output URLs instead of returning a false success", async () => {
    vi.stubEnv("NEXUS_IMAGE_ENGINE_URL", "https://image-worker.example");
    vi.stubEnv("NEXUS_IMAGE_ENGINE_TOKEN", "private-token");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      id: "job-insecure", state: "succeeded", progress: 100,
      output: { url: "http://cdn.example.test/image.png" }
    })));
    const res = makeResponse();
    await engineJobsHandler({ method: "POST", body: { engine: "image", prompt: "A blue flower" } } as any, res as any);
    expect(res.statusCode).toBe(502);
  });

  it("keeps queued jobs valid without an output URL", async () => {
    vi.stubEnv("NEXUS_VIDEO_ENGINE_URL", "https://video-worker.example");
    vi.stubEnv("NEXUS_VIDEO_ENGINE_TOKEN", "private-token");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      id: "job-queued", state: "queued", progress: 0
    })));
    const res = makeResponse();
    await engineJobsHandler({ method: "POST", body: { engine: "video", prompt: "A calm ocean scene" } } as any, res as any);
    expect(res.statusCode).toBe(202);
    expect((res.body as any).state).toBe("queued");
  });
});
