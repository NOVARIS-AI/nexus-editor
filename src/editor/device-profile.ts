export type NexusDeviceTier = "mobile-efficient" | "balanced" | "high-performance";
export function getNexusDeviceProfile(): { tier: NexusDeviceTier; maxRenderPixels: number; preferredQuality: "720p" | "1080p"; cores: number; memoryGb?: number; advice: string } {
  const memoryGb = typeof navigator !== "undefined" ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory : undefined;
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
  const tier: NexusDeviceTier = (memoryGb !== undefined && memoryGb <= 4) || cores <= 4 ? "mobile-efficient" : memoryGb !== undefined && memoryGb >= 8 && cores >= 8 ? "high-performance" : "balanced";
  return { tier, maxRenderPixels: tier === "mobile-efficient" ? 3_700_000 : 8_500_000, preferredQuality: tier === "mobile-efficient" ? "720p" : "1080p", cores, memoryGb, advice: tier === "mobile-efficient" ? "Use 720p or 1080p, close other tabs, and export shorter sections for reliable results on this device." : tier === "balanced" ? "1080p is a sensible starting point. Check a short export before rendering a long project." : "This device reports a higher-capacity profile; export size is still limited by browser and available memory." };
}
