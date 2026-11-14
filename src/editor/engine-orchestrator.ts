import type { RenderInput } from "./browser-renderer";
import { renderTimeline } from "./browser-renderer";
import { clipDuration } from "../project";

type EngineModule = typeof import("@elah/core");

function canUseElah(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  const webgl2 = !!canvas.getContext("webgl2");
  const webCodecs = "VideoEncoder" in window && "VideoDecoder" in window;
  const workers = "Worker" in window && "OffscreenCanvas" in window;
  return webgl2 && webCodecs && workers;
}

function transformFor(clip: { zoom?: number; offsetX?: number; offsetY?: number; rotation?: number; opacity?: number }) {
  return {
    x: Math.max(-1, Math.min(2, 0.5 + (clip.offsetX ?? 0) / 200)),
    y: Math.max(-1, Math.min(2, 0.5 + (clip.offsetY ?? 0) / 200)),
    scale: Math.max(0.05, Math.min(8, (clip.zoom ?? 100) / 100)),
    rotation: ((clip.rotation ?? 0) * Math.PI) / 180,
    anchor: { x: 0.5, y: 0.5 },
  };
}

function effectsFor(clip: RenderInput["clips"][number]) {
  const effects: Array<{ id: string; kind: string; params: Record<string, number | string | boolean> }> = [];
  const brightness = Math.max(0.2, Math.min(2.5, (clip.brightness ?? 100) / 100));
  const contrast = Math.max(0, Math.min(2, (clip.contrast ?? 100) / 100));
  const saturation = Math.max(0, Math.min(2, (clip.saturation ?? 100) / 100));
  const exposure = Math.max(-2, Math.min(2, Math.log2(brightness)));
  if (Math.abs(exposure) > 0.005 || Math.abs(contrast - 1) > 0.005 || Math.abs(saturation - 1) > 0.005 || (clip.temperature ?? 0) !== 0 || (clip.tint ?? 0) !== 0) {
    effects.push({ id: crypto.randomUUID(), kind: "colorGrade", params: { exposure, contrast, saturation, temperature: Math.max(-1, Math.min(1, (clip.temperature ?? 0) / 100)), tint: Math.max(-1, Math.min(1, (clip.tint ?? 0) / 100)) } });
  }
  if ((clip.vignette ?? 0) > 0) effects.push({ id: crypto.randomUUID(), kind: "vignette", params: { amount: Math.max(0, Math.min(1, (clip.vignette ?? 0) / 100)) } });
  const filterName = (clip.filter ?? "").toLowerCase();
  if (/grain|noise|film|analog|vhs|dust/.test(filterName)) effects.push({ id: crypto.randomUUID(), kind: "grain", params: { amount: 0.22, size: 1.5, seed: 7, animated: false } });
  if (/blur|soft focus|defocus|bokeh/.test(filterName)) effects.push({ id: crypto.randomUUID(), kind: "gaussianBlur", params: { radius: /heavy|strong|deep/.test(filterName) ? 14 : 6 } });
  if ((clip.highlights ?? 0) !== 0 || (clip.shadows ?? 0) !== 0) effects.push({ id: crypto.randomUUID(), kind: "colorGrade", params: { highlights: Math.max(-1, Math.min(1, (clip.highlights ?? 0) / 100)), shadows: Math.max(-1, Math.min(1, (clip.shadows ?? 0) / 100)) } });
  return effects;
}

export async function renderWithElah(input: RenderInput): Promise<Blob> {
  if (!canUseElah()) throw new Error("Elah requires WebGL2, WebCodecs, Web Workers and OffscreenCanvas on this browser.");
  if (input.signal?.aborted) throw new DOMException("Export cancelled.", "AbortError");

  const elah: EngineModule = await import("@elah/core");
  const engine = new elah.TimelineEngine({
    fps: input.fps,
    stage: { width: input.width, height: input.height },
    initialTracks: [],
  });

  const sourceAssets = new Map(input.assets.map(asset => [asset.id, asset]));
  const trackIds = new Map<string, string>();
  const ensureTrack = (sourceTrackId: string, kind: "video" | "audio" | "elements", name: string) => {
    const key = sourceTrackId + ":" + kind;
    const existing = trackIds.get(key);
    if (existing) return existing;
    const created = engine.addTrack(kind, { name }).id;
    trackIds.set(key, created);
    return created;
  };

  for (const track of input.tracks ?? []) {
    const kind = track.kind === "video" ? "video" : track.kind === "audio" ? "audio" : "elements";
    const id = ensureTrack(track.id, kind, track.name);
    engine.updateTrack(id, {
      muted: track.muted,
      volume: track.volume ?? 1,
      opacity: Math.max(0, Math.min(1, track.opacity ?? 1)),
      blendMode: track.blendMode ?? "normal",
      solo: track.solo ?? false,
    } as never);
  }

  const elahClipIds = new Map<string, { id: string; trackId: string; startFrame: number; endFrame: number; transitionIn: number; transitionOut: number; transitionStyle?: string }>();
  for (const clip of input.clips) {
    if (input.signal?.aborted) throw new DOMException("Export cancelled.", "AbortError");
    const sourceTrackState = input.tracks?.find(track => track.id === clip.trackId);
    if (sourceTrackState?.hidden) continue;
    const asset = sourceAssets.get(clip.assetId);
    if (!asset?.objectUrl) throw new Error("Elah cannot access the source media for " + clip.label + ".");
    const kind = asset.kind === "video" ? "video" : "audio";
    const sourceTrack = sourceTrackState;
    const trackId = ensureTrack(clip.trackId, kind, sourceTrack?.name ?? (kind === "video" ? "Video" : "Audio"));
    const startFrame = Math.max(0, Math.round(clip.start * input.fps));
    const durationFrames = Math.max(1, Math.round(clipDuration(clip) * input.fps));
    const created = engine.addClip({
      type: kind,
      trackId,
      name: clip.label,
      src: asset.objectUrl,
      startFrame,
      durationFrames,
      volume: Math.max(0, Math.min(1, clip.gain ?? 1)),
      opacity: Math.max(0, Math.min(1, clip.opacity ?? 1)),
      transform: transformFor(clip),
      blendMode: clip.blendMode ?? sourceTrackState?.blendMode ?? "normal",
      fit: clip.fit ?? "cover",
      mask: { shape: clip.maskShape ?? "none", radius: clip.maskRadius ?? 12 },
      flipHorizontal: clip.flipHorizontal ?? false,
      flipVertical: clip.flipVertical ?? false,
    } as never);
    engine.updateClip(created.id, trackId, {
      sourceStartFrame: Math.max(0, Math.round(clip.sourceIn * input.fps)),
      sourceDurationFrames: Math.max(durationFrames, Math.round(asset.duration * input.fps)),
      ...(kind === "video" ? { speed: Math.max(0.25, Math.min(4, clip.speed ?? 1)) } : {}),
      effects: effectsFor(clip),
    } as never);
    elahClipIds.set(clip.id, {
      id: created.id,
      trackId,
      startFrame,
      endFrame: startFrame + durationFrames,
      transitionIn: clip.transitionIn ?? 0,
      transitionOut: clip.transitionOut ?? 0,
      transitionStyle: clip.transitionStyle,
    });
  }

  for (const layer of input.imageLayers ?? []) {
    if (layer.visible === false || input.tracks?.find(track => track.id === layer.trackId)?.hidden) continue;
    const asset = sourceAssets.get(layer.assetId);
    if (!asset?.objectUrl) continue;
    const trackId = ensureTrack(layer.trackId, "elements", "Images & overlays");
    const startFrame = Math.max(0, Math.round(layer.start * input.fps));
    const durationFrames = Math.max(1, Math.round(layer.duration * input.fps));
    const created = engine.addClip({
      type: "image", trackId, name: asset.name, src: asset.objectUrl,
      startFrame, durationFrames, opacity: Math.max(0, Math.min(1, layer.opacity)),
      transform: {
        x: Math.max(-1, Math.min(2, layer.x / input.width)),
        y: Math.max(-1, Math.min(2, layer.y / input.height)),
        scale: Math.max(0.02, Math.min(8, layer.scale)),
        rotation: (layer.rotation * Math.PI) / 180,
        anchor: { x: 0.5, y: 0.5 },
      },
      blendMode: layer.blendMode ?? "normal",
      fit: layer.fit ?? "contain",
      mask: { shape: layer.maskShape ?? "none", radius: layer.maskRadius ?? 12 },
    } as never);
    engine.updateClip(created.id, trackId, {
      sourceDurationFrames: Math.max(durationFrames, Math.round(asset.duration * input.fps)),
    });
  }

  for (const layer of input.textLayers) {
    if (layer.visible === false || input.tracks?.find(track => track.id === layer.trackId)?.hidden) continue;
    const trackId = ensureTrack(layer.trackId, "elements", "Text & titles");
    const startFrame = Math.max(0, Math.round(layer.start * input.fps));
    const durationFrames = Math.max(1, Math.round(layer.duration * input.fps));
    engine.addClip({
      type: "text", trackId, name: layer.text.slice(0, 48) || "Text",
      startFrame, durationFrames,
      text: {
        content: layer.text,
        fontSize: Math.max(8, Math.min(360, layer.fontSize)),
        color: layer.color,
        fontFamily: layer.fontFamily || "Arial",
        textAlign: layer.align ?? "center",
        backgroundColor: layer.backgroundColor ?? "transparent",
        padding: Math.max(0, Math.min(96, layer.padding ?? 0)),
        shadow: layer.shadow ?? false,
      },
      opacity: Math.max(0, Math.min(1, layer.opacity ?? 1)),
      blendMode: layer.blendMode ?? "normal",
      animation: layer.animation ?? "none",
      transform: {
        x: Math.max(0, Math.min(1, (layer.x ?? input.width / 2) / input.width)),
        y: Math.max(0, Math.min(1, (layer.y ?? input.height / 2) / input.height)),
        scale: 1,
        rotation: ((layer.rotation ?? 0) * Math.PI) / 180,
        anchor: { x: 0.5, y: 0.5 },
      },
    });
  }

  const byTrack = new Map<string, Array<{ sourceId: string; data: NonNullable<ReturnType<typeof elahClipIds.get>> }>>();
  for (const [sourceId, data] of elahClipIds) {
    const list = byTrack.get(data.trackId) ?? [];
    list.push({ sourceId, data });
    byTrack.set(data.trackId, list);
  }
  for (const [trackId, clips] of byTrack) {
    clips.sort((a, b) => a.data.startFrame - b.data.startFrame);
    for (let index = 1; index < clips.length; index++) {
      const previous = clips[index - 1].data;
      const next = clips[index].data;
      if (previous.endFrame > next.startFrame) continue;
      const requested = Math.max(previous.transitionOut, next.transitionIn);
      if (requested <= 0) continue;
      const style = next.transitionStyle ?? previous.transitionStyle ?? "fade";
      const kind = style === "zoom" ? "zoom" : style === "wipe" ? "wipe" : style === "slide" ? "slide" : "fade";
      engine.addTransition({
        fromClipId: previous.id,
        toClipId: next.id,
        trackId,
        kind,
        durationFrames: Math.max(1, Math.round(requested * input.fps)),
      });
    }
  }

  const project = engine.getProject();
  const output = await elah.lazyExportVideo(project, {
    outputHeight: Math.min(input.width, input.height),
    videoCodec: "avc",
    audioCodec: "aac",
    signal: input.signal,
    onProgress: progress => {
      const percent = progress.totalFrames > 0 ? Math.round((progress.frame / progress.totalFrames) * 100) : 0;
      input.onProgress?.(Math.max(0, Math.min(100, percent)));
    },
  });
  if (!(output instanceof Blob) || !output.size || !output.type.startsWith("video/")) {
    throw new Error("Elah did not return a valid video file.");
  }
  return output;
}

export async function renderTimelineWithEngines(input: RenderInput): Promise<Blob> {
  if (canUseElah()) {
    try {
      return await renderWithElah(input);
    } catch (error) {
      if (input.signal?.aborted) throw error;
      console.warn("NEXUS Elah engine fell back to the compatibility renderer.", error);
    }
  }
  return renderTimeline(input);
}
