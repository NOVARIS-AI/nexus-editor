import type { MediaAsset, TimelineClip, TimelineTextLayer, TimelineTrack } from "../types";

const FILTER_CSS: Record<string, string> = {"Original":"none","Cinematic":"contrast(1.16) saturate(1.18)","Vintage":"sepia(.42) contrast(1.04)","Warm":"sepia(.18) saturate(1.28)","Cool":"hue-rotate(12deg) saturate(.9)","B&W":"grayscale(1)","Noir":"grayscale(1) contrast(1.35)","Matte":"contrast(.88) saturate(.82) brightness(1.08)","Fade":"contrast(.88) saturate(.82) brightness(1.08)","Film Grain":"contrast(1.08) saturate(.88)","Golden":"sepia(.18) saturate(1.28)","Arctic":"hue-rotate(12deg) saturate(.9)","Dream":"brightness(1.08) saturate(1.12)","Vivid":"saturate(1.45) contrast(1.08)","Teal Orange":"contrast(1.16) saturate(1.18)","Soft Glow":"brightness(1.08) saturate(1.12)","Sepia":"sepia(.65)","Retro 70s":"sepia(.3) saturate(1.2)","Retro 90s":"sepia(.18) contrast(1.12)","Kodachrome":"sepia(.25) saturate(1.25) contrast(1.08)","Portra":"saturate(1.35) contrast(1.05)","Ektar":"saturate(1.5) contrast(1.1)","Fuji Film":"hue-rotate(-8deg) saturate(1.1)","Polaroid":"sepia(.25) saturate(1.3) brightness(1.05)","Bleach Bypass":"grayscale(1) contrast(1.2)","Cross Process":"hue-rotate(25deg) saturate(1.25)","Moody":"contrast(1.18) saturate(.85)","Dark Drama":"brightness(.86) contrast(1.25)","Bright Day":"brightness(1.12) saturate(1.08)","Pastel":"saturate(.75) brightness(1.06)","Rose":"sepia(.12) hue-rotate(-12deg) saturate(1.15)","Lavender":"hue-rotate(18deg) saturate(.9)","Mint":"hue-rotate(70deg) saturate(.8)","Ocean Blue":"hue-rotate(165deg) saturate(1.15)","Sunset":"sepia(.22) saturate(1.45)","Autumn":"sepia(.32) saturate(1.1)","Winter":"hue-rotate(190deg) saturate(.85)","Spring":"hue-rotate(-25deg) saturate(1.15)","Summer":"sepia(.12) saturate(1.25) brightness(1.08)","Neon":"saturate(1.5) hue-rotate(-8deg)","Cyberpunk":"hue-rotate(145deg) saturate(1.5) contrast(1.12)","Monochrome Blue":"hue-rotate(185deg) saturate(1.4) contrast(1.1)","Monochrome Red":"grayscale(1) sepia(.25)","High Contrast":"grayscale(1) sepia(.25) hue-rotate(300deg)","Low Contrast":"contrast(1.35) saturate(1.08)","Soft Portrait":"contrast(.92) brightness(1.04)","Skin Warmth":"contrast(.96) saturate(.9)","Desaturated":"sepia(.12) saturate(1.25)","Rich Color":"saturate(.65)","Night":"saturate(1.6) contrast(1.12)"};



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

const seekMedia = async (media: HTMLMediaElement, time: number) => {
  if (!Number.isFinite(time) || time < 0) throw new Error("A timeline clip has an invalid source in-point.");
  if (Math.abs(media.currentTime - time) < 0.04) return;
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => { cleanup(); reject(new Error("A media clip could not seek to its selected in-point.")); }, 8000);
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error("A media clip failed while seeking for export.")); };
    const cleanup = () => { window.clearTimeout(timer); media.removeEventListener("seeked", done); media.removeEventListener("error", fail); };
    media.addEventListener("seeked", done, { once: true });
    media.addEventListener("error", fail, { once: true });
    try { media.currentTime = time; } catch (error) { cleanup(); reject(error); }
  });
};

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
  if (!input.clips.length || !Number.isFinite(input.duration) || input.duration <= 0) throw new Error("Add at least one timeline clip before exporting.");
  if (!Number.isInteger(input.fps) || input.fps < 12 || input.fps > 60) throw new Error("Choose an export frame rate between 12 and 60 FPS.");
  if (!Number.isInteger(input.width) || !Number.isInteger(input.height) || input.width < 160 || input.height < 160) throw new Error("Choose a valid export resolution.");
  const memoryGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const maxPixels = memoryGb !== undefined && memoryGb <= 4 ? 4_500_000 : 8_500_000;
  if (input.width * input.height > maxPixels) throw new Error("This resolution is too demanding for the available device memory. Choose 1080p or 720p for a more reliable export.");
  const assetMap = new Map(input.assets.map(asset => [asset.id, asset]));
  for (const clip of input.clips) {
    const asset = assetMap.get(clip.assetId);
    if (!asset) throw new Error("A timeline clip refers to missing media: " + clip.label);
    if (!asset.objectUrl) throw new Error("The original media for " + clip.label + " is unavailable. Re-import that file before exporting.");
    if (!Number.isFinite(clip.start) || !Number.isFinite(clip.sourceIn) || !Number.isFinite(clip.sourceOut) || clip.start < 0 || clip.sourceIn < 0 || clip.sourceOut <= clip.sourceIn) {
      throw new Error("The timeline timing is invalid for " + clip.label + ". Check its trim points.");
    }
  }
  const needsAudio = input.clips.some(clip => assetMap.get(clip.assetId)?.kind === "audio" || assetMap.get(clip.assetId)?.kind === "video");
  const canvas = document.createElement("canvas");
  canvas.width = input.width; canvas.height = input.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is unavailable on this device.");
  const assets = new Map(input.assets.map(asset => [asset.id, asset]));
  const tracks = new Map((input.tracks || []).map((track, index) => [track.id, { ...track, order: index }]));
  const trackFor = (clip: TimelineClip) => tracks.get(clip.trackId);
  const trackHidden = (clip: TimelineClip) => trackFor(clip)?.hidden === true;
  const trackMuted = (clip: TimelineClip) => trackFor(clip)?.muted === true || (input.tracks || []).some(track => track.kind === "audio" && track.solo && track.id !== clip.trackId);
  const mediaByClip = new Map<string, HTMLVideoElement>();
  const imageByClip = new Map<string, HTMLImageElement>();
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const audioContext = AudioContextCtor ? new AudioContextCtor() : null;
  const audioDestination = audioContext?.createMediaStreamDestination();
  const audioNodes = new Map<string, { element: HTMLMediaElement; highPass: BiquadFilterNode; lowPass: BiquadFilterNode; compressor: DynamicsCompressorNode; analyser: AnalyserNode; gateBuffer: Float32Array; gain: GainNode; panner?: StereoPannerNode }>();
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
    if (needsAudio && (!audioContext || !audioDestination)) throw new Error("Audio export is unavailable in this browser. Use an updated Chrome browser with Web Audio support.");
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
        await seekMedia(video, clip.sourceIn);
        if (audioContext && audioDestination) {
          const source = audioContext.createMediaElementSource(video);
          const highPass = audioContext.createBiquadFilter(); highPass.type = "highpass"; highPass.frequency.value = 20; const lowPass = audioContext.createBiquadFilter(); lowPass.type = "lowpass"; lowPass.frequency.value = 20000; const compressor = audioContext.createDynamicsCompressor(); compressor.threshold.value = 0; compressor.knee.value = 30; compressor.ratio.value = 1; compressor.attack.value = 0.003; compressor.release.value = 0.25; const analyser = audioContext.createAnalyser(); analyser.fftSize = 256; const gateBuffer = new Float32Array(analyser.fftSize); const gain = audioContext.createGain(); const panner = audioContext.createStereoPanner(); source.connect(highPass); highPass.connect(lowPass); lowPass.connect(compressor); compressor.connect(analyser); analyser.connect(gain); gain.connect(panner); panner.connect(audioDestination);
          video.muted = false; audioNodes.set(clip.id, { element: video, highPass, lowPass, compressor, analyser, gateBuffer, gain, panner });
        }
        mediaByClip.set(clip.id, video); activeVideos.push(video);
      } else {
        const audio = document.createElement("audio"); audio.src = asset.objectUrl; audio.preload = "auto";
        await waitForMedia(audio);
        await seekMedia(audio, clip.sourceIn);
        if (audioContext && audioDestination) {
          const source = audioContext.createMediaElementSource(audio);
          const highPass = audioContext.createBiquadFilter(); highPass.type = "highpass"; highPass.frequency.value = 20; const lowPass = audioContext.createBiquadFilter(); lowPass.type = "lowpass"; lowPass.frequency.value = 20000; const compressor = audioContext.createDynamicsCompressor(); compressor.threshold.value = 0; compressor.knee.value = 30; compressor.ratio.value = 1; compressor.attack.value = 0.003; compressor.release.value = 0.25; const analyser = audioContext.createAnalyser(); analyser.fftSize = 256; const gateBuffer = new Float32Array(analyser.fftSize); const gain = audioContext.createGain(); const panner = audioContext.createStereoPanner(); source.connect(highPass); highPass.connect(lowPass); lowPass.connect(compressor); compressor.connect(analyser); analyser.connect(gain); gain.connect(panner); panner.connect(audioDestination);
          audioNodes.set(clip.id, { element: audio, highPass, lowPass, compressor, analyser, gateBuffer, gain, panner });
        }
      }
    }
    canvasStream = canvas.captureStream(input.fps);
    if (audioDestination) audioDestination.stream.getAudioTracks().forEach(track => canvasStream!.addTrack(track));
    const mimeType = [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4",
      "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"
    ].find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error("This browser does not expose a supported MP4 or WebM recording format. Try an updated Chrome browser.");
    const videoBitsPerSecond = Math.max(2_000_000, Math.min(24_000_000, Math.round(input.width * input.height * input.fps * 0.08)));
    const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    const stopped = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("The browser stopped the export unexpectedly."));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });
    const animatedValues = (clip: TimelineClip, time: number) => {
      const frames = [...(clip.keyframes || [])].filter(frame => Number.isFinite(frame.time)).sort((a, b) => a.time - b.time);
      const base = { zoom: clip.zoom ?? 100, rotation: clip.rotation ?? 0, offsetX: clip.offsetX ?? 0, offsetY: clip.offsetY ?? 0, opacity: clip.opacity ?? 1 };
      if (!frames.length) return base;
      const local = Math.max(0, time - clip.start);
      const first = frames[0], last = frames[frames.length - 1];
      if (local <= first.time) return { zoom:first.zoom, rotation:first.rotation, offsetX:first.offsetX, offsetY:first.offsetY, opacity:first.opacity };
      if (local >= last.time) return { zoom:last.zoom, rotation:last.rotation, offsetX:last.offsetX, offsetY:last.offsetY, opacity:last.opacity };
      const rightIndex = frames.findIndex(frame => frame.time >= local);
      const left = frames[rightIndex - 1], right = frames[rightIndex];
      const span = Math.max(.0001, right.time - left.time), progress = (local - left.time) / span;
      const mix = (a: number, b: number) => a + (b - a) * progress;
      return { zoom:mix(left.zoom,right.zoom), rotation:mix(left.rotation,right.rotation), offsetX:mix(left.offsetX,right.offsetX), offsetY:mix(left.offsetY,right.offsetY), opacity:mix(left.opacity,right.opacity) };
    };
    const drawCover = (source: CanvasImageSource, sw: number, sh: number, clip: TimelineClip, time: number) => {
      if (!sw || !sh) return;
      const scale = clip.fit === "contain" ? Math.min(canvas.width / sw, canvas.height / sh) : Math.max(canvas.width / sw, canvas.height / sh);
      const dw = sw * scale, dh = sh * scale;
      ctx.save();
      const blendModes: Record<string, GlobalCompositeOperation> = { normal: "source-over", multiply: "multiply", screen: "screen", overlay: "overlay", darken: "darken", lighten: "lighten", "soft-light": "soft-light", "hard-light": "hard-light" };
      ctx.globalCompositeOperation = blendModes[clip.blendMode || "normal"] || "source-over";
      const localTime = time - clip.start;
      const clipLen = (clip.sourceOut-clip.sourceIn)/Math.max(.1,clip.speed||1);
      const inProgress = clip.transitionIn ? Math.max(0,Math.min(1,localTime/clip.transitionIn)) : 1;
      const outProgress = clip.transitionOut ? Math.max(0,Math.min(1,(clipLen-localTime)/clip.transitionOut)) : 1;
      const transitionProgress = Math.min(inProgress,outProgress);
      const transitionStyle = clip.transitionStyle || "fade";
      const transitionAlpha = transitionStyle === "fade" ? transitionProgress : 1;
      const animated = animatedValues(clip, time);
      ctx.globalAlpha = Math.max(0, Math.min(1, animated.opacity * transitionAlpha));
      const filter = FILTER_CSS[clip.filter || "Original"] || "none";
      const transitionBlur = transitionStyle === "blur" ? (1-transitionProgress)*12 : 0;
      const exposure = clip.exposure ?? 0, temperature = clip.temperature ?? 0, tint = clip.tint ?? 0, highlights = clip.highlights ?? 0, shadows = clip.shadows ?? 0;
      const gradedBrightness = Math.max(.2, Math.min(2.5, (clip.brightness ?? 100) / 100 * Math.pow(2, exposure) * (1 + shadows / 650 - highlights / 900)));
      const gradedContrast = Math.max(.4, Math.min(2, (clip.contrast ?? 100) / 100 * (1 + highlights / 450 - shadows / 700)));
      ctx.filter = [filter, `brightness(${gradedBrightness})`, `contrast(${gradedContrast})`, `saturate(${(clip.saturation ?? 100)/100})`, temperature ? `sepia(${Math.abs(temperature)/260})` : "", temperature ? `hue-rotate(${-temperature*.28}deg)` : "", tint ? `hue-rotate(${tint*.32}deg)` : "", transitionBlur ? `blur(${transitionBlur}px)` : ""].filter(Boolean).join(" ");
      if (transitionStyle === "wipe") {
        const reveal = Math.max(.001, Math.min(1, transitionProgress));
        ctx.beginPath(); ctx.rect(0,0,canvas.width*reveal,canvas.height); ctx.clip();
      }
      const zoomBoost = transitionStyle === "zoom" ? 1.18-(.18*transitionProgress) : 1;
      const slideOffset = transitionStyle === "slide" ? (1-transitionProgress)*canvas.width*.16 : 0;
      ctx.translate(canvas.width/2 + canvas.width*animated.offsetX/100 + slideOffset, canvas.height/2 + canvas.height*animated.offsetY/100);
      ctx.rotate(animated.rotation*Math.PI/180);
      ctx.scale((animated.zoom/100)*zoomBoost,(animated.zoom/100)*zoomBoost);
      ctx.drawImage(source, -dw/2, -dh/2, dw, dh);
      const vignette = Math.max(0, Math.min(100, clip.vignette ?? 0));
      if (vignette > 0) { const radius = Math.hypot(dw, dh) * .68; const gradient = ctx.createRadialGradient(0, 0, radius * .18, 0, 0, radius); gradient.addColorStop(0, "rgba(0,0,0,0)"); gradient.addColorStop(.62, "rgba(0,0,0,0)"); gradient.addColorStop(1, `rgba(0,0,0,${vignette / 100 * .82})`); ctx.fillStyle = gradient; ctx.fillRect(-dw/2, -dh/2, dw, dh); }
      ctx.restore();
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
            // Apply the same mute, track visibility, clip gain and fades to audio-only
            // clips and the audio channel embedded in video clips.
            if (active && !clip.muted && !trackMuted(clip)) {
              if (Math.abs(audio.element.currentTime - wanted) > .3) { try { audio.element.currentTime = wanted; } catch {} }
              if (audio.element.paused) void audio.element.play().catch(() => {});
              const elapsed = Math.max(0, local), remaining = Math.max(0, (clip.sourceOut - clip.sourceIn) / speed - elapsed);
              const fadeIn = clip.fadeIn ? Math.min(1, elapsed / clip.fadeIn) : 1;
              const fadeOut = clip.fadeOut ? Math.min(1, remaining / clip.fadeOut) : 1;
              const track = trackFor(clip);
              audio.highPass.frequency.value = Math.max(20, Math.min(1200, clip.highPassHz ?? 20));
              audio.lowPass.frequency.value = Math.max(1500, Math.min(20000, clip.lowPassHz ?? 20000));
              const compression = Math.max(0, Math.min(100, clip.compression ?? 0));
              audio.compressor.threshold.value = compression ? -6 - compression * 0.24 : 0;
              audio.compressor.ratio.value = compression ? 1 + compression * 0.09 : 1;
              let gateLevel = 1;
              const gateStrength = Math.max(0, Math.min(100, clip.noiseGate ?? 0));
              if (gateStrength > 0) { audio.analyser.getFloatTimeDomainData(audio.gateBuffer); let energy = 0; for (let sample = 0; sample < audio.gateBuffer.length; sample++) energy += audio.gateBuffer[sample] * audio.gateBuffer[sample]; const rms = Math.sqrt(energy / audio.gateBuffer.length); const threshold = 0.0005 + gateStrength * 0.00035; gateLevel = rms < threshold ? 0 : 1; }
              audio.gain.gain.setTargetAtTime(Math.max(0, Math.min(2, clip.gain ?? 1)) * Math.max(0, Math.min(2, track?.volume ?? 1)) * Math.min(fadeIn, fadeOut) * gateLevel, audioContext!.currentTime, 0.025);
              if (audio.panner) audio.panner.pan.value = Math.max(-1, Math.min(1, track?.pan ?? 0));
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
