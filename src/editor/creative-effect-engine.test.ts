import { describe, expect, it } from "vitest";
import { NEXUS_EFFECT_CATALOG } from "./creative-catalog";
import { NEXUS_VIDEO_EFFECTS } from "./creative-library";
import { getCreativeEffectCss, hasCreativeEffectProcessor } from "./creative-effect-engine";

describe("creative effect processors", () => {
  it("provides a live processor or dedicated legacy renderer for every effect card", () => {
    const dedicated = new Set<string>(NEXUS_VIDEO_EFFECTS.map(effect => effect.name));
    const missing = NEXUS_EFFECT_CATALOG
      .filter(item => item.kind === "effect")
      .map(item => item.name)
      .filter(name => !hasCreativeEffectProcessor(name) && !dedicated.has(name));
    expect(missing).toEqual([]);
  });

  it("returns usable filter treatments for named catalogue effects", () => {
    for (const name of ["Digital Glitch", "Snowfall", "Film Grain", "Neon Glow", "Gaussian Blur", "Paper Texture"]) {
      expect(hasCreativeEffectProcessor(name)).toBe(true);
      expect(getCreativeEffectCss(name)).not.toBe("none");
    }
  });

  it("does not claim arbitrary unknown names are processed", () => {
    expect(hasCreativeEffectProcessor("Made Up Effect")).toBe(false);
    expect(getCreativeEffectCss("Made Up Effect")).toBe("none");
  });
});
