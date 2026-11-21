import { describe, expect, it } from "vitest";
import {
  approveProductionPlan,
  createProductionRun,
  startProductionRun,
  updateProductionScene,
  retryProductionScene,
  sendProductionToReview,
  completeProductionRun
} from "./production-jobs";

describe("NEXUS production checkpoints", () => {
  it("requires plan approval before execution and draft review before completion", () => {
    const planned = createProductionRun("Launch film", [
      { title: "Opening", visual: "A sunrise over a city", duration: 4 },
      { title: "Product", visual: "A close-up product reveal", duration: 5 }
    ]);
    expect(planned.state).toBe("awaiting-approval");
    const approved = approveProductionPlan(planned);
    expect(approved.state).toBe("queued");
    const running = startProductionRun(approved);
    const first = updateProductionScene(running, running.scenes[0].id, { state: "running", engine: "image" });
    const firstDone = updateProductionScene(first, first.scenes[0].id, { state: "succeeded", progress: 100, outputUrl: "https://cdn.example/scene-1.png" });
    const second = updateProductionScene(firstDone, firstDone.scenes[1].id, { state: "running", engine: "video" });
    const finished = updateProductionScene(second, second.scenes[1].id, { state: "succeeded", progress: 100 });
    const review = sendProductionToReview(finished);
    expect(review.state).toBe("review");
    expect(completeProductionRun(review).state).toBe("completed");
  });

  it("retries only a failed scene and preserves successful scene outputs", () => {
    const plan = approveProductionPlan(createProductionRun("Short edit", [
      { title: "Keep this scene", visual: "Existing shot" },
      { title: "Retry this scene", visual: "Generated shot" }
    ]));
    const running = startProductionRun(plan);
    const first = updateProductionScene(running, running.scenes[0].id, { state: "succeeded", outputUrl: "https://cdn.example/kept.mp4" });
    const failed = updateProductionScene(first, first.scenes[1].id, { state: "failed", error: "Provider timeout" });
    const retried = retryProductionScene(failed, failed.scenes[1].id);
    expect(retried.state).toBe("queued");
    expect(retried.scenes[0].state).toBe("succeeded");
    expect(retried.scenes[0].outputUrl).toBe("https://cdn.example/kept.mp4");
    expect(retried.scenes[1].state).toBe("queued");
    expect(retried.scenes[1].attempts).toBe(1);
  });
});
