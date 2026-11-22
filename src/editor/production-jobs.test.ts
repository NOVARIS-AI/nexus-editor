import { describe, expect, it } from "vitest";
import {
  approveProductionPlan,
  createProductionRun,
  startProductionRun,
  updateProductionScene,
  retryProductionScene,
  sendProductionToReview,
  completeProductionRun,
  pauseProductionRun,
  beginProductionScene,
  getNextProductionScene,
  recoverInterruptedProductionRun,
  resumeProductionRun,
  reviewProductionScene,
  reorderProductionScene
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
    const finished = updateProductionScene(second, second.scenes[1].id, { state: "succeeded", progress: 100, outputUrl: "https://cdn.example/scene-2.mp4" });
    const review = sendProductionToReview(finished);
    expect(review.state).toBe("review");
    const reviewed = review.scenes.reduce((current, scene) => reviewProductionScene(current, scene.id, "approved"), review);
    expect(completeProductionRun(reviewed).state).toBe("completed");
  });

  it("refuses to mark a scene successful without a secure attached output", () => {
    const plan = approveProductionPlan(createProductionRun("Output validation", [
      { title: "Scene one", visual: "A generated visual" }
    ]));
    const running = startProductionRun(plan);
    const sceneId = running.scenes[0].id;
    expect(() => updateProductionScene(running, sceneId, { state: "succeeded" }))
      .toThrow(/linked project asset is attached/i);
    expect(() => updateProductionScene(running, sceneId, {
      state: "succeeded", outputUrl: "http://cdn.example/scene.mp4"
    })).toThrow(/secure HTTPS/i);
    expect(() => updateProductionScene(running, sceneId, {
      state: "succeeded", outputUrl: "https://user:pass@cdn.example/scene.mp4"
    })).toThrow(/secure HTTPS/i);
  });

  it("accepts a linked generated asset and records full Commons provenance", () => {
    const plan = approveProductionPlan(createProductionRun("Hybrid sourcing", [
      { title: "Generated still", visual: "A generated image" },
      { title: "Licensed shot", visual: "A public-domain photograph" }
    ]));
    const running = startProductionRun(plan);
    const generated = updateProductionScene(running, running.scenes[0].id, {
      state: "succeeded", assetId: "asset-generated-1", sourceType: "generated", outputMimeType: "image/png"
    });
    expect(generated.scenes[0].state).toBe("succeeded");
    expect(generated.scenes[0].assetId).toBe("asset-generated-1");
    expect(() => updateProductionScene(generated, generated.scenes[1].id, {
      state: "succeeded", assetId: "asset-commons-1", sourceType: "commons"
    })).toThrow(/source page, licence and attribution/i);
    const sourced = updateProductionScene(generated, generated.scenes[1].id, {
      state: "succeeded", assetId: "asset-commons-1", sourceType: "commons",
      sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
      sourceLicense: "CC BY 4.0", sourceAttribution: "Photo by Example", sourceCreator: "Example"
    });
    expect(sourced.scenes[1].sourceLicense).toBe("CC BY 4.0");
    expect(sourced.scenes[1].sourceAttribution).toBe("Photo by Example");
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


describe("NEXUS production executor recovery", () => {
  it("claims scenes in storyboard order and records attempts before execution", () => {
    const approved = approveProductionPlan(createProductionRun("Sequential run", [
      { title: "First", visual: "Opening" },
      { title: "Second", visual: "Middle" }
    ]));
    const running = startProductionRun(approved);
    const first = getNextProductionScene(running);
    expect(first?.title).toBe("First");
    const claimed = beginProductionScene(running, first!.id);
    expect(claimed.scenes[0].state).toBe("running");
    expect(claimed.scenes[0].attempts).toBe(1);
    expect(getNextProductionScene(claimed)?.title).toBe("Second");
    expect(() => beginProductionScene(claimed, first!.id)).toThrow(/pending or queued/i);
  });

  it("recovers interrupted local work without resetting successful scenes", () => {
    const approved = approveProductionPlan(createProductionRun("Recoverable run", [
      { title: "Completed", visual: "Keep output" },
      { title: "Interrupted", visual: "Resume later" },
      { title: "Waiting", visual: "Not started" }
    ]));
    const running = startProductionRun(approved);
    const completed = updateProductionScene(running, running.scenes[0].id, {
      state: "succeeded", outputUrl: "https://cdn.example/keep-this.mp4"
    });
    const interrupted = beginProductionScene(completed, completed.scenes[1].id);
    const recovered = recoverInterruptedProductionRun(interrupted);
    expect(recovered.state).toBe("paused");
    expect(recovered.scenes[0].state).toBe("succeeded");
    expect(recovered.scenes[0].outputUrl).toBe("https://cdn.example/keep-this.mp4");
    expect(recovered.scenes[1].state).toBe("failed");
    expect(recovered.scenes[1].error).toMatch(/interrupted/i);
    expect(recovered.checkpoint.completedSceneIds).toEqual([recovered.scenes[0].id]);
    expect(recovered.checkpoint.nextSceneId).toBe(recovered.scenes[1].id);
  });

  it("resumes only after failed scenes are explicitly retried", () => {
    const approved = approveProductionPlan(createProductionRun("Resume run", [
      { title: "First", visual: "One" },
      { title: "Second", visual: "Two" }
    ]));
    const running = startProductionRun(approved);
    const failed = updateProductionScene(running, running.scenes[0].id, { state: "failed", error: "Interrupted" });
    const recovered = recoverInterruptedProductionRun(failed);
    const resumed = startProductionRun(resumeProductionRun(recovered));
    expect(resumed.state).toBe("running");
    expect(resumed.scenes[0].state).toBe("failed");
    expect(getNextProductionScene(resumed)?.title).toBe("Second");
    const retried = retryProductionScene(resumed, resumed.scenes[0].id);
    expect(retried.state).toBe("queued");
    expect(retried.scenes[0].state).toBe("queued");
    expect(retried.scenes[0].attempts).toBe(1);
    const restarted = startProductionRun(retried);
    const claimed = beginProductionScene(restarted, restarted.scenes[0].id);
    expect(claimed.scenes[0].attempts).toBe(1);
  });

  it("keeps remote jobs with persisted IDs pollable after app restart", () => {
    const approved = approveProductionPlan(createProductionRun("Remote run", [
      { title: "Remote scene", visual: "Provider job" }
    ]));
    const running = startProductionRun(approved);
    const active = updateProductionScene(running, running.scenes[0].id, {
      state: "running", engine: "video", jobId: "remote-job-123"
    });
    const recovered = recoverInterruptedProductionRun(active);
    expect(recovered.state).toBe("running");
    expect(recovered.scenes[0].state).toBe("running");
    expect(recovered.scenes[0].jobId).toBe("remote-job-123");
  });
});


describe("NEXUS production pause and resume", () => {
  it("pauses at a checkpoint and resumes without resetting completed output", () => {
    const approved = approveProductionPlan(createProductionRun("Pause-safe edit", [
      { title: "Completed opening", visual: "Opening scene" },
      { title: "Next scene", visual: "Next scene description" }
    ]));
    const running = startProductionRun(approved);
    const checkpointed = updateProductionScene(running, running.scenes[0].id, {
      state: "succeeded", outputUrl: "https://cdn.example/opening.mp4"
    });
    const paused = pauseProductionRun(checkpointed);
    expect(paused.state).toBe("paused");
    expect(paused.scenes[0].state).toBe("succeeded");
    expect(paused.scenes[0].outputUrl).toBe("https://cdn.example/opening.mp4");
    const resumed = startProductionRun(resumeProductionRun(paused));
    expect(resumed.state).toBe("running");
    expect(resumed.scenes[0].state).toBe("succeeded");
    expect(getNextProductionScene(resumed)?.title).toBe("Next scene");
  });
});


describe("NEXUS Creative Review Studio", () => {
  function completedReviewRun() {
    const approved = approveProductionPlan(createProductionRun("Review studio", [
      { title: "Opening", visual: "A calm sunrise" },
      { title: "Middle", visual: "A busy city" },
      { title: "Ending", visual: "A hopeful horizon" }
    ]));
    const running = startProductionRun(approved);
    const complete = running.scenes.reduce((current, scene, index) =>
      updateProductionScene(current, scene.id, {
        state: "succeeded",
        assetId: "review-asset-" + index,
        sourceType: "generated",
        outputMimeType: "image/png"
      }), running);
    return sendProductionToReview(complete);
  }

  it("requires every completed scene to be approved before final draft completion", () => {
    const review = completedReviewRun();
    expect(() => completeProductionRun(review)).toThrow(/approve every completed scene/i);
    const first = reviewProductionScene(review, review.scenes[0].id, "approved");
    expect(first.scenes[0].reviewStatus).toBe("approved");
    expect(() => completeProductionRun(first)).toThrow(/approve every completed scene/i);
    const allApproved = first.scenes.slice(1).reduce(
      (current, scene) => reviewProductionScene(current, scene.id, "approved"), first
    );
    expect(completeProductionRun(allApproved).state).toBe("completed");
  });

  it("records change requests and reviewer notes without discarding generated assets", () => {
    const review = completedReviewRun();
    const target = review.scenes[1];
    const updated = reviewProductionScene(review, target.id, "changes-requested", "Use a wider establishing shot.");
    expect(updated.scenes[1].reviewStatus).toBe("changes-requested");
    expect(updated.scenes[1].reviewNote).toBe("Use a wider establishing shot.");
    expect(updated.scenes[1].assetId).toBe(target.assetId);
    expect(() => completeProductionRun(updated)).toThrow(/approve every completed scene/i);
  });

  it("reopens only a scene that the reviewer explicitly sent back for changes", () => {
    const review = completedReviewRun();
    const requested = reviewProductionScene(review, review.scenes[1].id, "changes-requested", "Replace the city shot.");
    const retried = retryProductionScene(requested, requested.scenes[1].id);
    expect(retried.state).toBe("queued");
    expect(retried.scenes[1].state).toBe("queued");
    expect(retried.scenes[1].reviewStatus).toBe("pending");
    expect(retried.scenes[0].state).toBe("succeeded");
    expect(retried.scenes[2].state).toBe("succeeded");
  });

  it("reorders storyboard scenes without losing their asset references", () => {
    const review = completedReviewRun();
    const middle = review.scenes[1];
    const moved = reorderProductionScene(review, middle.id, -1);
    expect(moved.scenes[0].id).toBe(middle.id);
    expect(moved.scenes[0].assetId).toBe(middle.assetId);
    expect(reorderProductionScene(moved, moved.scenes[0].id, -1).scenes[0].id).toBe(middle.id);
  });
});
