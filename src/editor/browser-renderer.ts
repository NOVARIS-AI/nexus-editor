import type { MediaAsset, TimelineClip, TimelineTextLayer, TimelineTrack } from "../types";

export type RenderInput = {
  assets: MediaAsset[];
  clips: TimelineClip[];
  textLayers: TimelineTextLayer[];
  tracks?: TimelineTrack[];
  width: number;
  height: number;
  fps: number;
  duration: number;
  onProgress?: (progress: number) => void;
};

const waitForMedia = (media: HTMLMediaElement) => new Promise<void>((resolve, reject) => {
  if (media.readyState >= 2) return resolve();
  const done = () => { cleanup(); resolve(); };
  const fail = () => { cleanup(); reject(new Error("A media file could not be decoded for export.")); };
  const cleanup = () => { media.removeEventListener("loadeddata", done); media.removeEventListener("error", fail); };
  media.addEventListener("loadeddata", done, { once: true });
  media.addEventListener("error", fail, { once: true });
  media.load();
});

function dimensions(ratio: string, quality: string) {
  const base = quality === "720p" ? 720 : quality === "2K" ? 1440 : quality === "4K Ultra HD" ? 2160 : 1080;
  const parts = ratio.split(":").map(Number);
  const w = parts[0] || 16, h = parts[1] || 9;
  return w >= h ? { width: base, height: Math.round(base * h / w) } : { width: Math.round(base * w / h), height: base };
}

export async function renderTimeline(input: RenderInput): Promise<Blob> {
  if (!("MediaRecorder" in window) || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error("This browser does not support browser video recording. Try an updated Chrome browser.");
  }
  if (!input.clips.length || input.duration <= 0) throw new Error("Add at least one timeline clip before exporting.");
  const canvas = document.createElement("canvas");
  canvas.width = input.width; canvas.height = input.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is unavailable on this device.");
  const assets = new Map(input.assets.map(asset => [asset.id, asset]));
  const tracks = new Map((input.tracks || []).map((track, index) => [track.id, { ...track, order: index }]));
  const trackFor = (clip: TimelineClip) => tracks.get(clip.trackId);
  const trackHidden = (clip: TimelineClip) => trackFor(clip)?.hidden === true;
  const trackMuted = (clip: TimelineClip) => trackFor(clip)?.muted === true;
  const mediaByClip = new Map<string, HTMLVideoElement>();
  const imageByClip = new Map<string, HTMLImageElement>();
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const audioContext = AudioContextCtor ? new AudioContextCtor() : null;
  const audioDestination = audioContext?.createMediaStreamDestination();
  const audioNodes = new Map<string, { element: HTMLMediaElement; gain: GainNode }>();
  const activeVideos: HTMLVideoElement[] = [];
  let canvasStream: MediaStream | null = null;
  let raf = 0;
  const cleanup = () => {
    cancelAnimationFrame(raf);
    activeVideos.forEach(v => { v.pause(); v.removeAttribute("src"); v.load(); });
    audioNodes.forEach(({ element }) => { element.pause(); element.removeAttribute("src"); element.load(); });
    canvasStream?.getTracks().forEach(track => track.stop());
    if (audioContext) void audioContext.close();
  };
  try {
    for (const clip of input.clips) {
      const asset = assets.get(clip.assetId);
      if (!asset?.objectUrl) continue;
      if (asset.kind === "image") {
        const image = new Image(); image.src = asset.objectUrl;
        await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Image could not be loaded: " + asset.name)); });
        imageByClip.set(clip.id, image);
      } else if (asset.kind === "video") {
        const video = document.createElement("video"); video.src = asset.objectUrl; video.muted = !audioContext; video.playsInline = true; video.preload = "auto";
        await waitForMedia(video);
        if (audioContext && audioDestination) {
          const source = audioContext.createMediaElementSource(video);
          const gain = audioContext.createGain(); source.connect(gain); gain.connect(audioDestination);
          video.muted = false; audioNodes.set(clip.id, { element: video, gain });
        }
        mediaByClip.set(clip.id, video); activeVideos.push(video);
      } else {
        const audio = document.createElement("audio"); audio.src = asset.objectUrl; audio.preload = "auto";
        await waitForMedia(audio);
        if (audioContext && audioDestination) {
          const source = audioContext.createMediaElementSource(audio);
          const gain = audioContext.createGain(); source.connect(gain); gain.connect(audioDestination);
          audioNodes.set(clip.id, { element: audio, gain });
        }
      }
    }
    canvasStream = canvas.captureStream(input.fps);
    if (audioDestination) audioDestination.stream.getAudioTracks().forEach(track => canvasStream!.addTrack(track));
    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error("This browser does not expose a supported WebM recording format.");
    const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: input.width >= 3000 ? 12000000 : 6500000 });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    const stopped = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("The browser stopped the export unexpectedly."));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });
    const drawCover = (source: CanvasImageSource, sw: number, sh: number, clip: TimelineClip, time: number) => {
      if (!sw || !sh) return;
      const scale = clip.fit === "contain" ? Math.min(canvas.width / sw, canvas.height / sh) : Math.max(canvas.width / sw, canvas.height / sh);
      const dw = sw * scale, dh = sh * scale;
      ctx.save(); const localTime = time - clip.start; const clipLen = (clip.sourceOut-clip.sourceIn)/Math.max(.1,clip.speed||1); const transitionAlpha = Math.min(clip.transitionIn ? Math.min(1,localTime/clip.transitionIn) : 1, clip.transitionOut ? Math.min(1,(clipLen-localTime)/clip.transitionOut) : 1); ctx.globalAlpha = Math.max(0, Math.min(1, (clip.opacity ?? 1) * transitionAlpha)); const filter = clip.filter === "B&W" ? "grayscale(1)" : clip.filter === "Vintage" ? "sepia(.42)" : clip.filter === "Warm" ? "sepia(.18) saturate(1.18)" : clip.filter === "Cool" ? "hue-rotate(12deg) saturate(.9)" : clip.filter === "Cinematic" ? "contrast(1.12) saturate(1.12)" : "none"; ctx.filter = [filter, `brightness(${(clip.brightness ?? 100)/100})`, `contrast(${(clip.contrast ?? 100)/100})`, `saturate(${(clip.saturation ?? 100)/100})`].join(" "); ctx.translate(canvas.width/2 + canvas.width*(clip.offsetX||0)/100, canvas.height/2 + canvas.height*(clip.offsetY||0)/100); ctx.rotate((clip.rotation||0)*Math.PI/180); ctx.scale((clip.zoom??100)/100,(clip.zoom??100)/100); ctx.drawImage(source, -dw/2, -dh/2, dw, dh); ctx.restore();
    };
    const trackOrder = (clip: TimelineClip) => trackFor(clip)?.order ?? 0;
    const started = performance.now();
    let lastFrame = -1;
    let lastProgress = -1;
    const draw = () => {
      const time = Math.min(input.duration, (performance.now() - started) / 1000);
      const frame = Math.floor(time * input.fps);
      if (frame !== lastFrame) {
        lastFrame = frame;
        ctx.fillStyle = "#080817"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const visualClips = input.clips
          .filter(clip => {
            const asset = assets.get(clip.assetId);
            const speed = Math.max(.1, clip.speed || 1);
            const length = Math.max(0, clip.sourceOut - clip.sourceIn) / speed;
            return asset && asset.kind !== "audio" && !trackHidden(clip) && time >= clip.start && time < clip.start + length;
          })
          .sort((a, b) => trackOrder(a) - trackOrder(b) || a.start - b.start);
        for (const clip of visualClips) {
          const image = imageByClip.get(clip.id), video = mediaByClip.get(clip.id);
          if (image) drawCover(image, image.naturalWidth, image.naturalHeight, clip, time);
          else if (video && video.videoWidth && video.videoHeight) drawCover(video, video.videoWidth, video.videoHeight, clip, time);
        }
        for (const clip of input.clips) {
          const speed = Math.max(.1, clip.speed || 1);
          const local = time - clip.start;
          const active = local >= 0 && local < (clip.sourceOut - clip.sourceIn) / speed && !trackHidden(clip);
          const wanted = clip.sourceIn + Math.max(0, local) * speed;
          const video = mediaByClip.get(clip.id);
          if (video) {
            if (active) {
              if (Math.abs(video.currentTime - wanted) > .25) { try { video.currentTime = wanted; } catch {} }
              if (video.paused) void video.play().catch(() => {});
            } else if (!video.paused) video.pause();
          }
          const audio = audioNodes.get(clip.id);
          if (audio) {
            if (active && !clip.muted && !trackMuted(clip)) {
              if (Math.abs(audio.element.currentTime - wanted) > .3) { try { audio.element.currentTime = wanted; } catch {} }
              if (audio.element.paused) void audio.element.play().catch(() => {});
              const elapsed = Math.max(0, local), remaining = Math.max(0, (clip.sourceOut - clip.sourceIn) / speed - elapsed);
              const fadeIn = clip.fadeIn ? Math.min(1, elapsed / clip.fadeIn) : 1;
              const fadeOut = clip.fadeOut ? Math.min(1, remaining / clip.fadeOut) : 1;
              audio.gain.gain.value = Math.max(0, Math.min(1, clip.gain ?? 1)) * Math.min(fadeIn, fadeOut);
            } else { audio.element.pause(); audio.gain.gain.value = 0; }
          }
        }
        input.textLayers.filter(layer => {
          const track = tracks.get(layer.trackId);
          return !track?.hidden && time >= layer.start && time < layer.start + layer.duration;
        }).forEach(layer => {
          ctx.save(); const local = time-layer.start; const fade = layer.animation === "fade" ? Math.min(1,local/.35,(layer.duration-local)/.35) : layer.animation === "pop" ? Math.min(1,local/.2) : 1; ctx.globalAlpha = Math.max(0,Math.min(1,(layer.opacity??1)*fade)); ctx.fillStyle = layer.color; ctx.font = `bold ${Math.max(12, layer.fontSize * canvas.height / 1080)}px ${layer.fontFamily || "Arial"}`;
          ctx.textAlign = layer.align || "center"; ctx.textBaseline = "middle"; if(layer.backgroundColor && layer.backgroundColor !== "transparent"){ const width=ctx.measureText(layer.text).width+(layer.padding||12)*2; const height=Math.max(24,layer.fontSize)+(layer.padding||12)*2; ctx.fillStyle=layer.backgroundColor; ctx.fillRect(canvas.width*((layer.x??50)/100)-width/2,canvas.height*((layer.y??50)/100)-height/2,width,height); ctx.fillStyle=layer.color; } if(layer.rotation) { ctx.translate(canvas.width*((layer.x??50)/100),canvas.height*((layer.y??50)/100)); ctx.rotate(layer.rotation*Math.PI/180); } ctx.shadowColor = "rgba(0,0,0,.7)"; ctx.shadowBlur = 12;
          ctx.fillText(layer.text, layer.rotation ? 0 : canvas.width * ((layer.x ?? 50) / 100), layer.rotation ? 0 : canvas.height * ((layer.y ?? 50) / 100), canvas.width * .88); ctx.restore();
        });
        const progress = Math.min(99, Math.round(time / input.duration * 100));
        if (progress !== lastProgress) { lastProgress = progress; input.onProgress?.(progress); }
      }
      if (time >= input.duration) {
        activeVideos.forEach(v => v.pause()); audioNodes.forEach(({element}) => element.pause());
        recorder.stop(); canvasStream?.getTracks().forEach(track => track.stop()); return;
      }
      raf = requestAnimationFrame(draw);
    };
    if (audioContext) await audioContext.resume();
    recorder.start(250);
    draw();
    const result = await stopped;
    cancelAnimationFrame(raf);
    input.onProgress?.(100);
    if (!result.size) throw new Error("The export produced an empty video. Try a shorter timeline or lower resolution.");
    return result;
  } finally { cleanup(); }
}

export { dimensions as getExportDimensions };
