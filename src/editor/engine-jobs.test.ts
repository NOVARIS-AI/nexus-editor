import { describe, expect, it } from "vitest";
import { parseEngineJob } from "./engine-jobs";

describe("NEXUS engine job output validation", () => {
  it("accepts a completed job only when it has a secure HTTPS media URL", () => {
    const job = parseEngineJob({
      id: "video-job-1",
      engine: "video",
      state: "succeeded",
      progress: 100,
      output: { url: "https://media.example.test/scene.mp4", mimeType: "video/mp4" }
    }, "video");
    expect(job.state).toBe("succeeded");
    expect(job.output?.url).toBe("https://media.example.test/scene.mp4");
    expect(job.output?.mimeType).toBe("video/mp4");
  });

  it("rejects a worker that reports success without an output", () => {
    expect(() => parseEngineJob({
      id: "video-job-2", engine: "video", state: "succeeded", progress: 100
    }, "video")).toThrow(/without returning a media output URL/i);
  });

  it("rejects insecure or credential-bearing output URLs", () => {
    for (const url of ["http://media.example.test/scene.mp4", "https://user:pass@media.example.test/scene.mp4", "javascript:alert(1)"]) {
      expect(() => parseEngineJob({
        id: "video-job-3", engine: "video", state: "succeeded", output: { url }
      }, "video")).toThrow(/secure HTTPS/i);
    }
  });

  it("does not require an output URL while a job is queued or running", () => {
    expect(parseEngineJob({ id: "image-job-1", engine: "image", state: "queued", progress: 0 }, "image").state).toBe("queued");
    expect(parseEngineJob({ id: "image-job-2", engine: "image", state: "running", progress: 42 }, "image").progress).toBe(42);
  });

  it("rejects a job returned for a different engine", () => {
    expect(() => parseEngineJob({ id: "wrong-engine", engine: "image", state: "queued" }, "video")).toThrow(/wrong engine/i);
  });
});
