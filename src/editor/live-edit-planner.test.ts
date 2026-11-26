import { describe, expect, it } from "vitest";
import { planLiveEditInstruction } from "./live-edit-planner";

describe("planLiveEditInstruction", () => {
  it("keeps a multi-step edit in the requested order", () => {
    const plan = planLiveEditInstruction('select clip "Intro" then set speed to 1.5x and add title saying "Welcome"');
    expect(plan?.unsupported).toEqual([]);
    expect(plan?.steps.map(step => step.type)).toEqual(["select", "speed", "title"]);
    expect(plan?.steps[1]).toMatchObject({ type: "speed", value: 1.5 });
    expect(plan?.steps[2]).toMatchObject({ type: "title", text: "Welcome" });
  });

  it("supports volume, fades, canvas format and movement", () => {
    const plan = planLiveEditInstruction("set volume to 75%, fade in 2 seconds, change ratio to 9:16, move clip to 8 seconds");
    expect(plan?.steps.map(step => step.type)).toEqual(["volume", "fade", "ratio", "move"]);
    expect(plan?.steps[0]).toMatchObject({ type: "volume", value: 75 });
    expect(plan?.steps[1]).toMatchObject({ type: "fade", direction: "in", seconds: 2 });
    expect(plan?.steps[2]).toMatchObject({ type: "ratio", value: "9:16" });
    expect(plan?.steps[3]).toMatchObject({ type: "move", seconds: 8 });
  });

  it("does not turn a single action into a batch", () => {
    expect(planLiveEditInstruction("set speed to 1.5x")).toBeNull();
  });

  it("reports unknown steps instead of silently guessing", () => {
    const plan = planLiveEditInstruction("set speed to 1.5x then do a magic cinematic thing");
    expect(plan?.steps).toHaveLength(1);
    expect(plan?.unsupported).toEqual(["do a magic cinematic thing"]);
  });

  it("does not split title text on an ordinary 'and'", () => {
    const plan = planLiveEditInstruction('add title saying "Love and hope" then set speed to 2x');
    expect(plan?.steps[0]).toMatchObject({ type: "title", text: "Love and hope" });
    expect(plan?.steps).toHaveLength(2);
  });
});
