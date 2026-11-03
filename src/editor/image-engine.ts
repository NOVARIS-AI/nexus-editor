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
