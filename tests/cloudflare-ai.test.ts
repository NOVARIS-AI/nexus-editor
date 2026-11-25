import { describe, expect, it, vi } from "vitest";
import cloudflareAiHandler from "../api/cloudflare-ai.js";
import engineStatusHandler from "../api/engine-status.js";
import healthHandler from "../api/health.js";
import nexusWorkerHandler from "../api/nexus-worker.js";
import aiDirectorHandler from "../api/ai-director.js";

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

describe("NEXUS native Cloudflare Workers AI binding", () => {
  it("generates text through the app Worker's AI binding without account API secrets", async () => {
    const run = vi.fn(async () => ({ response: "A concise creative plan." }));
    const res = makeResponse();
    await cloudflareAiHandler(
      { method: "POST", body: { task: "text", prompt: "Plan a short cinematic edit." } } as any,
      res as any,
      { AI: { run } }
    );
    expect(run).toHaveBeenCalledWith("@cf/meta/llama-3.2-1b-instruct", {
      messages: [{ role: "user", content: "Plan a short cinematic edit." }]
    });
    expect(res.statusCode).toBe(200);
    expect((res.body as any).response).toBe("A concise creative plan.");
  });

  it("returns generated image data from the Workers AI binding", async () => {
    const run = vi.fn(async () => ({ image: "aGVsbG8=" }));
    const res = makeResponse();
    await cloudflareAiHandler(
      { method: "POST", body: { task: "image", prompt: "A clean abstract violet background" } } as any,
      res as any,
      { AI: { run } }
    );
    expect(res.statusCode).toBe(200);
    expect((res.body as any).image).toBe("data:image/png;base64,aGVsbG8=");
  });

  it("does not call a provider for invalid requests", async () => {
    const run = vi.fn();
    const res = makeResponse();
    await cloudflareAiHandler(
      { method: "POST", body: { task: "video", prompt: "A video" } } as any,
      res as any,
      { AI: { run } }
    );
    expect(res.statusCode).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });



  it("runs AI Director planning on the native Workers AI binding", async () => {
    const plan = {
      summary: "A three-scene edit plan.",
      scenes: [
        { title: "Opening", visual: "Wide establishing shot", duration: 4, narration: "", searchTerms: ["opening shot"] },
        { title: "Main point", visual: "Close detail shot", duration: 5, narration: "", searchTerms: ["detail"] },
        { title: "Closing", visual: "Clean closing frame", duration: 3, narration: "", searchTerms: ["closing"] }
      ],
      editPlan: [], assetNeeds: [], userReferenceNeeded: false, engineTasks: []
    };
    const run = vi.fn(async () => ({ response: JSON.stringify(plan) }));
    const res = makeResponse();
    await aiDirectorHandler(
      { method: "POST", body: { brief: "Make a short, clear video", context: {} } } as any,
      res as any,
      { AI: { run } }
    );
    expect(run).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect((res.body as any).provider).toBe("cloudflare-workers-ai-binding");
    expect((res.body as any).plan.scenes).toHaveLength(3);
  });

  it("uses the app's native AI binding for the image endpoint used by the editor", async () => {
    const run = vi.fn(async () => ({ image: "aGVsbG8=" }));
    const res = makeResponse();
    await nexusWorkerHandler(
      { method: "POST", headers: {}, body: { task: "image", prompt: "A luminous violet glass sculpture" } } as any,
      res as any,
      { AI: { run } }
    );
    expect(run).toHaveBeenCalledWith("@cf/black-forest-labs/flux-1-schnell", { prompt: "A luminous violet glass sculpture" });
    expect(res.statusCode).toBe(200);
    expect((res.body as any).image).toBe("data:image/png;base64,aGVsbG8=");
  });

  it("reports the native Workers AI binding as a healthy NEXUS worker", async () => {
    const res = makeResponse();
    await nexusWorkerHandler({ method: "GET", headers: {} } as any, res as any, { AI: { run: vi.fn() } });
    expect(res.statusCode).toBe(200);
    expect((res.body as any).ok).toBe(true);
    expect((res.body as any).mode).toBe("native-workers-ai-binding");
  });

  it("reports the native binding as configured in engine discovery and health", async () => {
    const status = makeResponse();
    await engineStatusHandler({ method: "GET" } as any, status as any, { AI: { run: vi.fn() } });
    expect((status.body as any).providers.cloudflareWorkersAI.configured).toBe(true);
    expect((status.body as any).providers.cloudflareWorkersAI.connection).toBe("native-workers-ai-binding");
    expect((status.body as any).brain.configured).toBe(true);
    expect((status.body as any).engines.image.configured).toBe(true);
    expect((status.body as any).engines.video.configured).toBe(false);

    const health = makeResponse();
    await healthHandler({ method: "GET" } as any, health as any, { AI: { run: vi.fn() } });
    expect((health.body as any).checks.cloudflareAi).toBe(true);
    expect((health.body as any).appCoreConfigured).toBe(true);
    expect((health.body as any).missingCore).toEqual([]);
    expect((health.body as any).trustedPublishingConfigured).toBe(false);
  });
});
