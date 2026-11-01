import { EDITOR_TOOL_REGISTRY } from "./tool-registry";

type ContextMessage = {
  type: "context";
  payload: {
    projectName: string;
    clipCount: number;
    assetCount: number;
    selectedClip?: { id: string; label: string; trackId: string; start: number; sourceIn: number; sourceOut: number } | null;
    activeTool: string;
    activeSubtool: string;
    playhead: number;
    aspectRatio: string;
  };
};

self.onmessage = (event: MessageEvent<ContextMessage>) => {
  const { payload } = event.data;
  const selected = payload.selectedClip;
  const tool = EDITOR_TOOL_REGISTRY.find(item => item.id === payload.activeTool);
  const ready = EDITOR_TOOL_REGISTRY.filter(item => item.capability === "working").length;
  const guided = EDITOR_TOOL_REGISTRY.filter(item => item.capability === "guidance").length;
  const planned = EDITOR_TOOL_REGISTRY.filter(item => item.capability === "planned").length;
  const summary = selected
    ? `Project “${payload.projectName}” · ${payload.clipCount} timeline clips · ${payload.assetCount} imported assets · selected “${selected.label}” on ${selected.trackId} · playhead ${payload.playhead.toFixed(2)}s · active ${tool?.label ?? payload.activeTool}/${payload.activeSubtool || "overview"} · canvas ${payload.aspectRatio}.`
    : `Project “${payload.projectName}” · ${payload.clipCount} timeline clips · ${payload.assetCount} imported assets · no clip selected · active ${tool?.label ?? payload.activeTool} · canvas ${payload.aspectRatio}.`;
  self.postMessage({
    type: "context-ready",
    summary,
    toolCount: EDITOR_TOOL_REGISTRY.length,
    actionCount: EDITOR_TOOL_REGISTRY.reduce((sum, item) => sum + item.actions.length, 0),
    capabilityCounts: { working: ready, guidance: guided, planned }
  });
};
