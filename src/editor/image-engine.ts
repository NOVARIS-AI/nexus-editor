import type { TimelineTextLayer } from "../types";
export function createApostleQuotePosterLayers(input: { quote: string; attribution: string; start: number; duration: number; makeId: () => string }): TimelineTextLayer[] {
  const common = { trackId: "text-1", start: Math.max(0, input.start), duration: Math.max(1, input.duration), animation: "fade" as const };
  const quote = input.quote.trim().slice(0, 700);
  const attribution = input.attribution.trim().slice(0, 120) || "Apostle Richman Daniel";
  return [
    { ...common, id: input.makeId(), text: "APOSTLE RICHMAN DANIEL", color: "#e8c77b", fontSize: 24, fontFamily: "Arial", x: 50, y: 17, align: "center", shadow: false, backgroundColor: "transparent", padding: 0 },
    { ...common, id: input.makeId(), text: quote, color: "#fffaf0", fontSize: 54, fontFamily: "Georgia", x: 50, y: 49, align: "center", shadow: true, backgroundColor: "#111827", padding: 28 },
    { ...common, id: input.makeId(), text: attribution, color: "#e8c77b", fontSize: 25, fontFamily: "Georgia", x: 50, y: 82, align: "center", shadow: false, backgroundColor: "transparent", padding: 0 }
  ];
}

export type ImageStylePreset = "portrait" | "product" | "editorial" | "mono" | "reset" | "food" | "landscape" | "night" | "pastel" | "dramatic" | "warm-film" | "clean-studio" | "cool-editorial" | "soft-glow";
export function getImageStylePreset(preset: ImageStylePreset): Partial<import("../types").TimelineClip> {
  const presets: Record<ImageStylePreset, Partial<import("../types").TimelineClip>> = {
    portrait: { brightness: 104, contrast: 96, saturation: 92, exposure: 0.12, temperature: 12, tint: 0, highlights: -18, shadows: 22, vignette: 12, filter: "Soft Portrait", fit: "cover" },
    product: { brightness: 103, contrast: 112, saturation: 118, exposure: 0.08, temperature: 2, tint: 0, highlights: -12, shadows: 8, vignette: 0, filter: "Vivid", fit: "contain" },
    editorial: { brightness: 100, contrast: 108, saturation: 88, exposure: -0.08, temperature: -4, tint: 2, highlights: -28, shadows: 14, vignette: 20, filter: "Matte", fit: "cover" },
    mono: { brightness: 102, contrast: 118, saturation: 0, exposure: 0, temperature: 0, tint: 0, highlights: -18, shadows: 10, vignette: 16, filter: "B&W", fit: "cover" },
    reset: { brightness: 100, contrast: 100, saturation: 100, exposure: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0, vignette: 0, filter: "Original", fit: "cover", zoom: 100, offsetX: 0, offsetY: 0, rotation: 0, opacity: 1 },
    food: { brightness: 106, contrast: 112, saturation: 132, exposure: .12, temperature: 14, tint: 2, highlights: -12, shadows: 12, vignette: 8, filter: "Food Fresh", fit: "cover" },
    landscape: { brightness: 104, contrast: 112, saturation: 118, exposure: .08, temperature: -4, tint: 0, highlights: -24, shadows: 22, vignette: 10, filter: "Ocean Pop", fit: "cover" },
    night: { brightness: 88, contrast: 122, saturation: 92, exposure: -.35, temperature: -18, tint: 6, highlights: -28, shadows: 18, vignette: 28, filter: "Moonlight", fit: "cover" },
    pastel: { brightness: 112, contrast: 88, saturation: 78, exposure: .18, temperature: 8, tint: 4, highlights: -8, shadows: 18, vignette: 0, filter: "Pastel Dream", fit: "cover" },
    dramatic: { brightness: 92, contrast: 132, saturation: 106, exposure: -.18, temperature: 4, tint: 0, highlights: -32, shadows: -8, vignette: 36, filter: "Epic Film", fit: "cover" },
    "warm-film": { brightness: 104, contrast: 104, saturation: 108, exposure: .08, temperature: 22, tint: 3, highlights: -18, shadows: 14, vignette: 22, filter: "35mm Film", fit: "cover" },
    "clean-studio": { brightness: 110, contrast: 108, saturation: 96, exposure: .22, temperature: 0, tint: 0, highlights: -24, shadows: 8, vignette: 0, filter: "Bright Studio", fit: "contain" },
    "cool-editorial": { brightness: 98, contrast: 114, saturation: 84, exposure: -.05, temperature: -20, tint: -3, highlights: -28, shadows: 12, vignette: 18, filter: "Cool Matte", fit: "cover" },
    "soft-glow": { brightness: 110, contrast: 92, saturation: 104, exposure: .18, temperature: 10, tint: 2, highlights: -10, shadows: 18, vignette: 4, filter: "Portrait Glow", fit: "cover" }
  };
  return { ...presets[preset] };
}
