import { registerPlugin } from "@capacitor/core";
import type { NexusNativeEnginePlugin } from "./definitions";
export * from "./definitions";
export const NexusNativeEngine = registerPlugin<NexusNativeEnginePlugin>("NexusNativeEngine");
