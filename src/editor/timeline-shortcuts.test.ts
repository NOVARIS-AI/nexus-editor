import { describe, expect, it } from "vitest";
import { getTimelineShortcutAction } from "./timeline-shortcuts";

describe("NEXUS timeline keyboard shortcuts", () => {
  const context = { page: "editor", editorView: "workspace", previewPlaying: false };

  it("maps Space and Home to playback and rewind", () => {
    expect(getTimelineShortcutAction({ ...context, key: " " })).toBe("toggle-playback");
    expect(getTimelineShortcutAction({ ...context, key: "Spacebar" })).toBe("toggle-playback");
    expect(getTimelineShortcutAction({ ...context, key: "Home" })).toBe("rewind");
  });

  it("maps S to split, but does not intercept Alt+S", () => {
    expect(getTimelineShortcutAction({ ...context, key: "s" })).toBe("split");
    expect(getTimelineShortcutAction({ ...context, key: "S", altKey: true })).toBeNull();
  });

  it("steps exactly one frame direction while paused", () => {
    expect(getTimelineShortcutAction({ ...context, key: "ArrowLeft" })).toBe("step-backward");
    expect(getTimelineShortcutAction({ ...context, key: "ArrowRight" })).toBe("step-forward");
  });

  it("does not step frames during playback", () => {
    expect(getTimelineShortcutAction({ ...context, key: "ArrowLeft", previewPlaying: true })).toBeNull();
    expect(getTimelineShortcutAction({ ...context, key: "ArrowRight", previewPlaying: true })).toBeNull();
  });

  it("keeps shortcuts scoped to the active editor workspace", () => {
    expect(getTimelineShortcutAction({ ...context, key: " " , page: "home" })).toBeNull();
    expect(getTimelineShortcutAction({ ...context, key: "Home", editorView: "landing" })).toBeNull();
    expect(getTimelineShortcutAction({ ...context, key: "Escape" })).toBeNull();
  });
});
