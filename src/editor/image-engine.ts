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

export type ImageStylePreset = "portrait" | "product" | "editorial" | "mono" | "reset";
export function getImageStylePreset(preset: ImageStylePreset): Partial<import("../types").TimelineClip> {
  const presets: Record<ImageStylePreset, Partial<import("../types").TimelineClip>> = {
    portrait: { brightness: 104, contrast: 96, saturation: 92, exposure: 0.12, temperature: 12, tint: 0, highlights: -18, shadows: 22, vignette: 12, filter: "Soft Portrait", fit: "cover" },
    product: { brightness: 103, contrast: 112, saturation: 118, exposure: 0.08, temperature: 2, tint: 0, highlights: -12, shadows: 8, vignette: 0, filter: "Vivid", fit: "contain" },
    editorial: { brightness: 100, contrast: 108, saturation: 88, exposure: -0.08, temperature: -4, tint: 2, highlights: -28, shadows: 14, vignette: 20, filter: "Matte", fit: "cover" },
    mono: { brightness: 102, contrast: 118, saturation: 0, exposure: 0, temperature: 0, tint: 0, highlights: -18, shadows: 10, vignette: 16, filter: "B&W", fit: "cover" },
    reset: { brightness: 100, contrast: 100, saturation: 100, exposure: 0, temperature: 0, tint: 0, highlights: 0, shadows: 0, vignette: 0, filter: "Original", fit: "cover", zoom: 100, offsetX: 0, offsetY: 0, rotation: 0, opacity: 1 }
  };
  return { ...presets[preset] };
}
