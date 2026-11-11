import { afterEach, describe, expect, it, vi } from "vitest";
import { askNexusDirector } from "./ai-director";

const response = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body
});

describe("NEXUS AI Director internal engine orchestration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("submits remote engine tasks and never reports Whisper as a fake completed job", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        plan: { engineTasks: [
          { engine: "whisper", action: "transcribe", prompt: "Transcribe selected audio" },
          { engine: "remotion", action: "render", prompt: "Render the planned scenes" },
          { engine: "hyperframes", action: "animate", prompt: "Animate the title sequence" }
        ] },
        model: "existing-brain",
        provider: "existing-provider"
      }))
      .mockResolvedValueOnce(response({ id: "render-1", engine: "remotion", state: "queued", progress: 0, message: "Queued" }, 202))
      .mockResolvedValueOnce(response({ id: "motion-1", engine: "hyperframes", state: "queued", progress: 0, message: "Queued" }, 202));
    vi.stubGlobal("fetch", fetchMock);

    const result = await askNexusDirector("Create a short title sequence", {});
    expect(result.engineJobs).toHaveLength(3);
    expect(result.engineJobs?.[0].state).toBe("unavailable");
    expect(result.engineJobs?.[0].message).toMatch(/existing selected-audio speech pipeline/i);
    expect(result.engineJobs?.[1]).toMatchObject({ engine: "remotion", state: "queued", id: "render-1" });
    expect(result.engineJobs?.[2]).toMatchObject({ engine: "hyperframes", state: "queued", id: "motion-1" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/engine-jobs");
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).engine).toBe("remotion");
  });

  it("keeps advice-only requests from submitting engine jobs", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ plan: { engineTasks: [] }, model: "existing-brain", provider: "existing-provider" }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await askNexusDirector("How can I improve this edit?", {});
    expect(result.engineJobs).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
