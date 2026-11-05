import type { MediaAsset, TimelineClip, TimelineImageLayer, TimelineTextLayer, TimelineTrack } from "../types";
import { compileClipTiming } from "./render-timing";
import { getNexusDeviceProfile } from "./device-profile";
import { CREATIVE_FILTER_CSS } from "./creative-library";
import { getSoftNoiseGateGain } from "./audio-processing";

const FILTER_CSS: Record<string, string> = { ...CREATIVE_FILTER_CSS, "Original":"none","Cinematic":"contrast(1.16) saturate(1.18)","Vintage":"sepia(.42) contrast(1.04)","Warm":"sepia(.18) saturate(1.28)","Cool":"hue-rotate(12deg) saturate(.9)","B&W":"grayscale(1)","Noir":"grayscale(1) contrast(1.35)","Matte":"contrast(.88) saturate(.82) brightness(1.08)","Fade":"contrast(.88) saturate(.82) brightness(1.08)","Film Grain":"contrast(1.08) saturate(.88)","Golden":"sepia(.18) saturate(1.28)","Arctic":"hue-rotate(12deg) saturate(.9)","Dream":"brightness(1.08) saturate(1.12)","Vivid":"saturate(1.45) contrast(1.08)","Teal Orange":"contrast(1.16) saturate(1.18)","Soft Glow":"brightness(1.08) saturate(1.12)","Sepia":"sepia(.65)","Retro 70s":"sepia(.3) saturate(1.2)","Retro 90s":"sepia(.18) contrast(1.12)","Kodachrome":"sepia(.25) saturate(1.25) contrast(1.08)","Portra":"saturate(1.35) contrast(1.05)","Ektar":"saturate(1.5) contrast(1.1)","Fuji Film":"hue-rotate(-8deg) saturate(1.1)","Polaroid":"sepia(.25) saturate(1.3) brightness(1.05)","Bleach Bypass":"grayscale(1) contrast(1.2)","Cross Process":"hue-rotate(25deg) saturate(1.25)","Moody":"contrast(1.18) saturate(.85)","Dark Drama":"brightness(.86) contrast(1.25)","Bright Day":"brightness(1.12) saturate(1.08)","Pastel":"saturate(.75) brightness(1.06)","Rose":"sepia(.12) hue-rotate(-12deg) saturate(1.15)","Lavender":"hue-rotate(18deg) saturate(.9)","Mint":"hue-rotate(70deg) saturate(.8)","Ocean Blue":"hue-rotate(165deg) saturate(1.15)","Sunset":"sepia(.22) saturate(1.45)","Autumn":"sepia(.32) saturate(1.1)","Winter":"hue-rotate(190deg) saturate(.85)","Spring":"hue-rotate(-25deg) saturate(1.15)","Summer":"sepia(.12) saturate(1.25) brightness(1.08)","Neon":"saturate(1.5) hue-rotate(-8deg)","Cyberpunk":"hue-rotate(145deg) saturate(1.5) contrast(1.12)","Monochrome Blue":"hue-rotate(185deg) saturate(1.4) contrast(1.1)","Monochrome Red":"grayscale(1) sepia(.25)","High Contrast":"grayscale(1) sepia(.25) hue-rotate(300deg)","Low Contrast":"contrast(1.35) saturate(1.08)","Soft Portrait":"contrast(.92) brightness(1.04)","Skin Warmth":"contrast(.96) saturate(.9)","Desaturated":"sepia(.12) saturate(1.25)","Rich Color":"saturate(.65)","Night":"saturate(1.6) contrast(1.12)"};



export type RenderInput = {
  assets: MediaAsset[];
  clips: TimelineClip[];
  textLayers: TimelineTextLayer[];
  imageLayers?: TimelineImageLayer[];
  tracks?: TimelineTrack[];
  width: number;
  height: number;
  fps: number;
  duration: number;
  masterGain?: number;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
};

const waitForMedia = (media: HTMLMediaElement, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) return reject(new DOMException("Export cancelled.", "AbortError"));
  if (media.readyState >= 2) return resolve();
  const timer = window.setTimeout(() => {
    cleanup();
    reject(new Error("A media file took too long to prepare for export. Re-import it or try a smaller file."));
  }, 30000);
  const done = () => { cleanup(); resolve(); };
  const fail = () => { cleanup(); reject(new Error("A media file could not be decoded for export. Check that the file is supported and not damaged.")); };
  const cleanup = () => {
    window.clearTimeout(timer);
    media.removeEventListener("loadeddata", done);
    media.removeEventListener("error", fail);
    signal?.removeEventListener("abort", aborted);
  };
  const aborted = () => { cleanup(); reject(new DOMException("Export cancelled.", "AbortError")); };
  signal?.addEventListener("abort", aborted, { once: true });
  media.addEventListener("loadeddata", done, { once: true });
  media.addEventListener("error", fail, { once: true });
  media.load();
});

const loadImageForExport = (image: HTMLImageElement, source: string, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) return reject(new DOMException("Export cancelled.", "AbortError"));
  const timer = window.setTimeout(() => { cleanup(); reject(new Error("An image took too long to load for export. Re-import it or try a smaller image.")); }, 20000);
  const done = () => { cleanup(); resolve(); };
  const fail = () => { cleanup(); reject(new Error("An image could not be decoded for export. Check that the source file is supported and not damaged.")); };
  const aborted = () => { cleanup(); reject(new DOMException("Export cancelled.", "AbortError")); };
  const cleanup = () => { window.clearTimeout(timer); image.removeEventListener("load", done); image.removeEventListener("error", fail); signal?.removeEventListener("abort", aborted); };
  image.addEventListener("load", done, { once: true });
  image.addEventListener("error", fail, { once: true });
  signal?.addEventListener("abort", aborted, { once: true });
  image.src = source;
});

const seekMedia = async (media: HTMLMediaElement, time: number, signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException("Export cancelled.", "AbortError");
  if (!Number.isFinite(time) || time < 0) throw new Error("A timeline clip has an invalid source in-point.");
  if (Math.abs(media.currentTime - time) < 0.04) return;
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => { cleanup(); reject(new Error("A media clip could not seek to its selected in-point.")); }, 8000);
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error("A media clip failed while seeking for export.")); };
    const cleanup = () => { window.clearTimeout(timer); media.removeEventListener("seeked", done); media.removeEventListener("error", fail); signal?.removeEventListener("abort", aborted); };
    const aborted = () => { cleanup(); reject(new DOMException("Export cancelled.", "AbortError")); };
    signal?.addEventListener("abort", aborted, { once: true });
    media.addEventListener("seeked", done, { once: true });
    media.addEventListener("error", fail, { once: true });
    try { media.currentTime = time; } catch (error) { cleanup(); reject(error); }
  });
};

function dimensions(ratio: string, quality: string) {
  // Quality labels describe the short edge: 1080p landscape is 1920×1080,
  // while 1080p portrait is 1080×1920.
  const shortEdge = quality === "720p" ? 720 : quality === "2K" ? 1440 : quality === "4K Ultra HD" ? 2160 : 1080;
  const parts = ratio.split(":").map(Number);
  const w = Number.isFinite(parts[0]) && parts[0] > 0 ? parts[0] : 16;
  const h = Number.isFinite(parts[1]) && parts[1] > 0 ? parts[1] : 9;
  if (Math.abs(w - h) < 0.0001) return { width: shortEdge, height: shortEdge };
  return w > h
    ? { width: Math.round(shortEdge * w / h), height: shortEdge }
    : { width: shortEdge, height: Math.round(shortEdge * h / w) };
}

export async function renderTimeline(input: RenderInput): Promise<Blob> {
  if (input.signal?.aborted) throw new DOMException("Export cancelled.", "AbortError");
  const throwIfAborted = () => { if (input.signal?.aborted) throw new DOMException("Export cancelled.", "AbortError"); };
  if (!("MediaRecorder" in window) || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error("This browser does not support browser video recording. Try an updated Chrome browser.");
  }
  if ((!input.clips.length && !(input.imageLayers || []).some(layer => layer.visible)) || !Number.isFinite(input.duration) || input.duration <= 0) throw new Error("Add at least one visible clip or image layer before exporting.");
  if (!Number.isInteger(input.fps) || input.fps < 12 || input.fps > 60) throw new Error("Choose an export frame rate between 12 and 60 FPS.");
  if (!Number.isInteger(input.width) || !Number.isInteger(input.height) || input.width < 160 || input.height < 160) throw new Error("Choose a valid export resolution.");
  const deviceProfile = getNexusDeviceProfile();
  const lowMemory = deviceProfile.tier === "mobile-efficient";
  const maxPixels = deviceProfile.maxRenderPixels;
  if (input.width * input.height > maxPixels) throw new Error("This resolution is too demanding for the available device memory. Choose 1080p or 720p for a more reliable export.");
  const timingByClip = new Map(input.clips.map(clip => [clip.id, compileClipTiming(clip)]));
  const timingFor = (clip: TimelineClip) => timingByClip.get(clip.id)!;
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
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas rendering is unavailable on this device.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = lowMemory ? "medium" : "high";
  const assets = new Map(input.assets.map(asset => [asset.id, asset]));
  const tracks = new Map((input.tracks || []).map((track, index) => [track.id, { ...track, order: index }]));
  const trackFor = (clip: TimelineClip) => tracks.get(clip.trackId);
  const trackHidden = (clip: TimelineClip) => trackFor(clip)?.hidden === true;
  const trackMuted = (clip: TimelineClip) => {
    const track = trackFor(clip);
    const audioSolo = (input.tracks || []).some(item => item.kind === "audio" && item.solo);
    return track?.muted === true || track?.hidden === true || (!!audioSolo && !track?.solo);
  };
  const imageLayers = input.imageLayers || [];
  const imageLayerImages = new Map<string, HTMLImageElement>();
  const mediaByClip = new Map<string, HTMLVideoElement>();
  const imageByClip = new Map<string, HTMLImageElement>();
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const audioContext = AudioContextCtor ? new AudioContextCtor() : null;
  const audioDestination = audioContext?.createMediaStreamDestination();
  const masterLimiter = audioContext?.createDynamicsCompressor();
  const masterOutput = audioContext?.createGain();
  if (masterLimiter && masterOutput && audioDestination) {
    masterLimiter.threshold.value = -1.5; masterLimiter.knee.value = 0; masterLimiter.ratio.value = 20;
    masterLimiter.attack.value = 0.003; masterLimiter.release.value = 0.14;
    masterOutput.gain.value = Math.max(0, Math.min(1, Number.isFinite(input.masterGain) ? input.masterGain! : 0.9));
    masterLimiter.connect(masterOutput); masterOutput.connect(audioDestination);
  }
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
    for (const layer of imageLayers) {
      throwIfAborted();
      const asset = assets.get(layer.assetId);
      if (!asset || asset.kind !== "image" || !asset.objectUrl) throw new Error("An image layer is missing its original image. Re-import the image before exporting.");
      if (!Number.isFinite(layer.start) || !Number.isFinite(layer.duration) || layer.start < 0 || layer.duration <= 0) throw new Error("An image layer has invalid timeline timing.");
      const image = new Image();
      await loadImageForExport(image, asset.objectUrl, input.signal);
      imageLayerImages.set(layer.id,image);
    }
    for (const clip of input.clips) {
      throwIfAborted();
      const asset = assets.get(clip.assetId);
      if (!asset?.objectUrl) continue;
      if (asset.kind === "image") {
        const image = new Image();
        await loadImageForExport(image, asset.objectUrl, input.signal);
        throwIfAborted();
        imageByClip.set(clip.id, image);
      } else if (asset.kind === "video") {
        const video = document.createElement("video"); video.src = asset.objectUrl; video.muted = !audioContext; video.playsInline = true; video.preload = "auto";
        await waitForMedia(video, input.signal);
        throwIfAborted();
        if (Number.isFinite(video.duration) && clip.sourceOut > video.duration + 0.12) {
          throw new Error(`The out-point for "${clip.label}" is beyond the source video's duration. Trim the clip again before exporting.`);
        }
        await seekMedia(video, clip.sourceIn, input.signal);
        throwIfAborted();
        if (audioContext && audioDestination) {
          const source = audioContext.createMediaElementSource(video);
          const highPass = audioContext.createBiquadFilter(); highPass.type = "highpass"; highPass.frequency.value = 20; const lowPass = audioContext.createBiquadFilter(); lowPass.type = "lowpass"; lowPass.frequency.value = 20000; const compressor = audioContext.createDynamicsCompressor(); compressor.threshold.value = 0; compressor.knee.value = 30; compressor.ratio.value = 1; compressor.attack.value = 0.003; compressor.release.value = 0.25; const analyser = audioContext.createAnalyser(); analyser.fftSize = 256; const gateBuffer = new Float32Array(analyser.fftSize); const gain = audioContext.createGain(); const panner = audioContext.createStereoPanner(); source.connect(highPass); highPass.connect(lowPass); lowPass.connect(compressor); compressor.connect(analyser); analyser.connect(gain); gain.connect(panner); panner.connect(masterLimiter || audioDestination);
          video.muted = false; audioNodes.set(clip.id, { element: video, highPass, lowPass, compressor, analyser, gateBuffer, gain, panner });
        }
        mediaByClip.set(clip.id, video); activeVideos.push(video);
      } else {
        const audio = document.createElement("audio"); audio.src = asset.objectUrl; audio.preload = "auto";
        await waitForMedia(audio, input.signal);
        throwIfAborted();
        if (Number.isFinite(audio.duration) && clip.sourceOut > audio.duration + 0.12) {
          throw new Error(`The out-point for "${clip.label}" is beyond the source audio duration. Trim the clip again before exporting.`);
        }
        await seekMedia(audio, clip.sourceIn, input.signal);
        throwIfAborted();
        if (audioContext && audioDestination) {
          const source = audioContext.createMediaElementSource(audio);
          const highPass = audioContext.createBiquadFilter(); highPass.type = "highpass"; highPass.frequency.value = 20; const lowPass = audioContext.createBiquadFilter(); lowPass.type = "lowpass"; lowPass.frequency.value = 20000; const compressor = audioContext.createDynamicsCompressor(); compressor.threshold.value = 0; compressor.knee.value = 30; compressor.ratio.value = 1; compressor.attack.value = 0.003; compressor.release.value = 0.25; const analyser = audioContext.createAnalyser(); analyser.fftSize = 256; const gateBuffer = new Float32Array(analyser.fftSize); const gain = audioContext.createGain(); const panner = audioContext.createStereoPanner(); source.connect(highPass); highPass.connect(lowPass); lowPass.connect(compressor); compressor.connect(analyser); analyser.connect(gain); gain.connect(panner); panner.connect(masterLimiter || audioDestination);
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
    const videoBitsPerSecond = Math.max(lowMemory ? 1_200_000 : 2_000_000, Math.min(lowMemory ? 8_000_000 : 24_000_000, Math.round(input.width * input.height * input.fps * (lowMemory ? 0.045 : 0.08))));
    const audioBitsPerSecond = needsAudio ? (lowMemory ? 96000 : 160000) : undefined;
    const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond, ...(audioBitsPerSecond ? { audioBitsPerSecond } : {}) });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    let rejectRecording: (reason?: unknown) => void = () => {};
    let settled = false;
    const stopped = new Promise<Blob>((resolve, reject) => {
      rejectRecording = reason => { if (!settled) { settled = true; reject(reason); } };
      recorder.onerror = () => rejectRecording(new Error("The browser stopped the export unexpectedly."));
      recorder.onstop = () => { if (!settled) { settled = true; resolve(new Blob(chunks, { type: mimeType })); } };
    });
    const keyframesByClip = new Map(input.clips.map(clip => [clip.id, [...(clip.keyframes || [])].filter(frame => Number.isFinite(frame.time)).sort((a, b) => a.time - b.time)]));
    const animatedValues = (clip: TimelineClip, time: number) => {
      const frames = keyframesByClip.get(clip.id) || [];
      const base = { zoom: clip.zoom ?? 100, rotation: clip.rotation ?? 0, offsetX: clip.offsetX ?? 0, offsetY: clip.offsetY ?? 0, opacity: clip.opacity ?? 1 };
      if (!frames.length) return base;
      const local = Math.max(0, time - clip.start);
      const first = frames[0], last = frames[frames.length - 1];
      if (local <= first.time) return { zoom:first.zoom, rotation:first.rotation, offsetX:first.offsetX, offsetY:first.offsetY, opacity:first.opacity };
      if (local >= last.time) return { zoom:last.zoom, rotation:last.rotation, offsetX:last.offsetX, offsetY:last.offsetY, opacity:last.opacity };
      const rightIndex = frames.findIndex(frame => frame.time >= local);
      const left = frames[rightIndex - 1], right = frames[rightIndex];
      const span = Math.max(.0001, right.time - left.time), raw = Math.max(0, Math.min(1, (local - left.time) / span));
      const progress = left.easing === "ease-in" ? raw * raw : left.easing === "ease-out" ? 1 - (1 - raw) * (1 - raw) : left.easing === "ease-in-out" ? (raw < .5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2) : raw;
      const mix = (a: number, b: number) => a + (b - a) * progress;
      return { zoom:mix(left.zoom,right.zoom), rotation:mix(left.rotation,right.rotation), offsetX:mix(left.offsetX,right.offsetX), offsetY:mix(left.offsetY,right.offsetY), opacity:mix(left.opacity,right.opacity) };
    };
    const keyedFrames = new Map<string, HTMLCanvasElement>();
    const chromaSource = (source: CanvasImageSource, sw: number, sh: number, clip: TimelineClip): CanvasImageSource => {
      if (!clip.chromaKeyEnabled || !sw || !sh) return source;
      const width=Math.max(1,Math.min(960,sw)),height=Math.max(1,Math.round(sh*width/sw));
      let keyed=keyedFrames.get(clip.id);if(!keyed){keyed=document.createElement("canvas");keyedFrames.set(clip.id,keyed);}
      if(keyed.width!==width||keyed.height!==height){keyed.width=width;keyed.height=height;}
      const keyCtx=keyed.getContext("2d",{willReadFrequently:true});if(!keyCtx)return source;
      try {
        keyCtx.clearRect(0,0,width,height);keyCtx.drawImage(source,0,0,width,height);
        const frame=keyCtx.getImageData(0,0,width,height),data=frame.data,hex=(clip.chromaKeyColor||"#00ff00").replace("#","");
        const key=[parseInt(hex.slice(0,2),16)||0,parseInt(hex.slice(2,4),16)||255,parseInt(hex.slice(4,6),16)||0];
        const tolerance=Math.max(8,Math.min(180,clip.chromaKeyTolerance??70)),softness=Math.max(0,Math.min(100,clip.chromaKeySoftness??28))*1.4,spill=Math.max(0,Math.min(100,clip.chromaKeySpill??45))/100;
        const dominant=key[1]>=key[0]&&key[1]>=key[2]?1:key[0]>=key[1]&&key[0]>=key[2]?0:2;
        for(let i=0;i<data.length;i+=4){
          const dr=data[i]-key[0],dg=data[i+1]-key[1],db=data[i+2]-key[2],distance=Math.sqrt(dr*dr+dg*dg+db*db),edge=Math.max(1,softness);
          const t=Math.max(0,Math.min(1,(distance-(tolerance-edge))/(edge*2))),alpha=t*t*(3-2*t);
          data[i+3]=Math.round(data[i+3]*alpha);
          if(alpha>0&&alpha<1&&spill>0){const other=Math.max(data[i+(dominant===0?1:0)],data[i+(dominant===2?1:2)]);data[i+dominant]=Math.round(data[i+dominant]*(1-spill*(1-alpha))+other*spill*(1-alpha));}
        }
        keyCtx.putImageData(frame,0,0);return keyed;
      } catch { return source; }
    };
    const drawCover = (source: CanvasImageSource, sw: number, sh: number, clip: TimelineClip, time: number) => {
      if (!sw || !sh) return;
      const scale = clip.fit === "contain" ? Math.min(canvas.width / sw, canvas.height / sh) : Math.max(canvas.width / sw, canvas.height / sh);
      const dw = sw * scale, dh = sh * scale;
      ctx.save();
      const blendModes: Record<string, GlobalCompositeOperation> = { normal: "source-over", multiply: "multiply", screen: "screen", overlay: "overlay", darken: "darken", lighten: "lighten", "soft-light": "soft-light", "hard-light": "hard-light" };
      const track = trackFor(clip);
      ctx.globalCompositeOperation = blendModes[track?.blendMode || clip.blendMode || "normal"] || "source-over";
      const localTime = time - clip.start;
      const clipLen = timingFor(clip).duration;
      const inProgress = clip.transitionIn ? Math.max(0,Math.min(1,localTime/clip.transitionIn)) : 1;
      const outProgress = clip.transitionOut ? Math.max(0,Math.min(1,(clipLen-localTime)/clip.transitionOut)) : 1;
      const transitionProgress = Math.min(inProgress,outProgress);
      const transitionStyle = clip.transitionStyle || "fade";
      const transitionAlpha = transitionStyle === "fade" ? transitionProgress : 1;
      const animated = animatedValues(clip, time);
      ctx.globalAlpha = Math.max(0, Math.min(1, animated.opacity * transitionAlpha * (track?.opacity ?? 1)));
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
      const zoomBoost = transitionStyle === "zoom" ? (0.82 + 0.18 * inProgress) * (0.82 + 0.18 * outProgress) : 1;
      const slideOffset = transitionStyle === "slide" ? ((1-inProgress) - (1-outProgress)) * canvas.width * .16 : 0;
      ctx.translate(canvas.width/2 + canvas.width*animated.offsetX/100 + slideOffset, canvas.height/2 + canvas.height*animated.offsetY/100);
      const maskShape = clip.maskShape || "none";
      if (maskShape !== "none") { ctx.beginPath(); if (maskShape === "circle") ctx.arc(0, 0, Math.min(dw, dh) / 2, 0, Math.PI * 2); else if (maskShape === "rounded") { const radius = Math.min(dw, dh) * Math.max(0, Math.min(50, clip.maskRadius ?? 12)) / 100; ctx.roundRect(-dw/2, -dh/2, dw, dh, radius); } else if (maskShape === "horizontal") ctx.rect(-dw/2, -dh*.25, dw, dh*.5); else if (maskShape === "vertical") ctx.rect(-dw*.25, -dh/2, dw*.5, dh); else if (maskShape === "diamond") { ctx.moveTo(0,-dh/2); ctx.lineTo(dw/2,0); ctx.lineTo(0,dh/2); ctx.lineTo(-dw/2,0); ctx.closePath(); } else if (maskShape === "hexagon") { ctx.moveTo(-dw*.25,-dh/2); ctx.lineTo(dw*.25,-dh/2); ctx.lineTo(dw/2,0); ctx.lineTo(dw*.25,dh/2); ctx.lineTo(-dw*.25,dh/2); ctx.lineTo(-dw/2,0); ctx.closePath(); } else if (maskShape === "star") { for(let point=0;point<10;point++){const angle=-Math.PI/2+point*Math.PI/5;const radius=point%2===0?Math.min(dw,dh)*.5:Math.min(dw,dh)*.22;const px=Math.cos(angle)*radius,py=Math.sin(angle)*radius;if(point===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();} ctx.clip(); }
      ctx.rotate(animated.rotation*Math.PI/180);
      ctx.scale((animated.zoom/100)*zoomBoost*(clip.flipHorizontal?-1:1),(animated.zoom/100)*zoomBoost*(clip.flipVertical?-1:1));
      ctx.drawImage(source, -dw/2, -dh/2, dw, dh);
      const vignette = Math.max(0, Math.min(100, clip.vignette ?? 0));
      if (vignette > 0) { const radius = Math.hypot(dw, dh) * .68; const gradient = ctx.createRadialGradient(0, 0, radius * .18, 0, 0, radius); gradient.addColorStop(0, "rgba(0,0,0,0)"); gradient.addColorStop(.62, "rgba(0,0,0,0)"); gradient.addColorStop(1, `rgba(0,0,0,${vignette / 100 * .82})`); ctx.fillStyle = gradient; ctx.fillRect(-dw/2, -dh/2, dw, dh); }
      ctx.restore();
    };
    const trackOrder = (clip: TimelineClip) => trackFor(clip)?.order ?? 0;
    const orderedVisualClips = input.clips.filter(clip => { const asset = assets.get(clip.assetId); return !!asset && asset.kind !== "audio" && !trackHidden(clip); }).sort((a,b)=>trackOrder(a)-trackOrder(b)||a.start-b.start);
    const started = performance.now();
    let lastFrame = -1;
    let lastProgress = -1;
    const draw = () => {
      try {
      throwIfAborted();
      const time = Math.min(input.duration, (performance.now() - started) / 1000);
      const frame = Math.floor(time * input.fps);
      if (frame !== lastFrame) {
        lastFrame = frame;
        ctx.fillStyle = "#080817"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        imageLayers.filter(layer => {
          const track = tracks.get(layer.trackId);
          return layer.fit === "cover" && layer.visible && !track?.hidden && time >= layer.start && time < layer.start + layer.duration;
        }).forEach(layer => {
          const image = imageLayerImages.get(layer.id); if (!image) return;
          const track = tracks.get(layer.trackId);
          const scale = Math.max(.05, Math.min(4, layer.scale));
          const width = canvas.width * .5 * scale, height = width * image.naturalHeight / Math.max(1,image.naturalWidth);
          ctx.save(); ctx.globalAlpha = Math.max(0,Math.min(1,layer.opacity * (track?.opacity ?? 1)));
          ctx.translate(canvas.width * layer.x / 100, canvas.height * layer.y / 100);
          ctx.rotate(layer.rotation * Math.PI / 180);
          if(layer.fit==="cover") {
            const targetAspect=canvas.width/canvas.height, sourceAspect=image.naturalWidth/Math.max(1,image.naturalHeight);
            if(sourceAspect>targetAspect) { const cropWidth=image.naturalHeight*targetAspect; ctx.drawImage(image,(image.naturalWidth-cropWidth)/2,0,cropWidth,image.naturalHeight,-canvas.width/2,-canvas.height/2,canvas.width,canvas.height); }
            else { const cropHeight=image.naturalWidth/targetAspect; ctx.drawImage(image,0,(image.naturalHeight-cropHeight)/2,image.naturalWidth,cropHeight,-canvas.width/2,-canvas.height/2,canvas.width,canvas.height); }
          } else ctx.drawImage(image,-width/2,-height/2,width,height);
          ctx.restore();
        });
        for (const clip of orderedVisualClips) {
          const length = timingFor(clip).duration;
          if (time < clip.start || time >= clip.start + length) continue;
          const image = imageByClip.get(clip.id), video = mediaByClip.get(clip.id);
          if (image) drawCover(chromaSource(image, image.naturalWidth, image.naturalHeight, clip), image.naturalWidth, image.naturalHeight, clip, time);
          else if (video && video.videoWidth && video.videoHeight) drawCover(chromaSource(video, video.videoWidth, video.videoHeight, clip), video.videoWidth, video.videoHeight, clip, time);
        }
        for (const clip of input.clips) {
          const local = time - clip.start;
          const active = local >= 0 && local < timingFor(clip).duration && !trackHidden(clip);
          const timing = timingFor(clip);
          const wanted = timing.sourceAtTimeline(Math.max(0, local));
          const speed = timing.speedAtSource(wanted);
          const video = mediaByClip.get(clip.id);
          if (video) {
            if (active) {
              if (Math.abs(video.currentTime - wanted) > .25) { try { video.currentTime = wanted; } catch {} }
              video.playbackRate = speed;
              if (video.paused) void video.play().catch(() => {});
            } else if (!video.paused) video.pause();
          }
          const audio = audioNodes.get(clip.id);
          if (audio) {
            // Apply the same mute, track visibility, clip gain and fades to audio-only
            // clips and the audio channel embedded in video clips.
            if (active && !clip.muted && !trackMuted(clip)) {
              if (Math.abs(audio.element.currentTime - wanted) > .3) { try { audio.element.currentTime = wanted; } catch {} }
              audio.element.playbackRate = speed;
              if (audio.element.paused) void audio.element.play().catch(() => {});
              const elapsed = Math.max(0, local), remaining = Math.max(0, timingFor(clip).duration - elapsed);
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
              if (gateStrength > 0) {
                audio.analyser.getFloatTimeDomainData(audio.gateBuffer);
                let energy = 0;
                for (let sample = 0; sample < audio.gateBuffer.length; sample++) energy += audio.gateBuffer[sample] * audio.gateBuffer[sample];
                gateLevel = getSoftNoiseGateGain(Math.sqrt(energy / audio.gateBuffer.length), gateStrength);
              }
              const targetGain = Math.max(0, Math.min(2, clip.gain ?? 1)) * Math.max(0, Math.min(2, track?.volume ?? 1)) * Math.min(fadeIn, fadeOut) * gateLevel;
              audio.gain.gain.setTargetAtTime(targetGain, audioContext!.currentTime, gateStrength > 0 ? 0.075 : 0.025);
              if (audio.panner) audio.panner.pan.value = Math.max(-1, Math.min(1, (track?.pan ?? 0) + (clip.pan ?? 0)));
            } else { audio.element.pause(); audio.gain.gain.value = 0; }
          }
        }
        imageLayers.filter(layer => {
          const track = tracks.get(layer.trackId);
          return layer.fit !== "cover" && layer.visible && !track?.hidden && time >= layer.start && time < layer.start + layer.duration;
        }).forEach(layer => {
          const image = imageLayerImages.get(layer.id); if (!image) return;
          const track = tracks.get(layer.trackId);
          const scale = Math.max(.05, Math.min(4, layer.scale));
          const width = canvas.width * .5 * scale, height = width * image.naturalHeight / Math.max(1,image.naturalWidth);
          ctx.save(); ctx.globalAlpha = Math.max(0,Math.min(1,layer.opacity * (track?.opacity ?? 1)));
          ctx.translate(canvas.width * layer.x / 100, canvas.height * layer.y / 100);
          ctx.rotate(layer.rotation * Math.PI / 180);
          if(layer.fit==="cover") {
            const targetAspect=canvas.width/canvas.height, sourceAspect=image.naturalWidth/Math.max(1,image.naturalHeight);
            if(sourceAspect>targetAspect) { const cropWidth=image.naturalHeight*targetAspect; ctx.drawImage(image,(image.naturalWidth-cropWidth)/2,0,cropWidth,image.naturalHeight,-canvas.width/2,-canvas.height/2,canvas.width,canvas.height); }
            else { const cropHeight=image.naturalWidth/targetAspect; ctx.drawImage(image,0,(image.naturalHeight-cropHeight)/2,image.naturalWidth,cropHeight,-canvas.width/2,-canvas.height/2,canvas.width,canvas.height); }
          } else ctx.drawImage(image,-width/2,-height/2,width,height);
          ctx.restore();
        });
        input.textLayers.filter(layer => {
          const track = tracks.get(layer.trackId);
          return !track?.hidden && layer.visible !== false && time >= layer.start && time < layer.start + layer.duration;
        }).forEach(layer => {
          ctx.save();
          const local = time - layer.start;
          const fade = layer.animation === "fade" ? Math.min(1, local / .35, (layer.duration - local) / .35) : layer.animation === "pop" ? Math.min(1, local / .2) : 1;
          ctx.globalAlpha = Math.max(0, Math.min(1, (layer.opacity ?? 1) * fade));
          const textBlendModes: Record<string, GlobalCompositeOperation> = { normal: "source-over", multiply: "multiply", screen: "screen", overlay: "overlay", darken: "darken", lighten: "lighten", "soft-light": "soft-light", "hard-light": "hard-light" };
          ctx.globalCompositeOperation = textBlendModes[layer.blendMode || "normal"] || "source-over";
          const fontSize = Math.max(12, layer.fontSize * canvas.height / 1080);
          const maxWidth = canvas.width * .88;
          const lineHeight = fontSize * 1.2;
          ctx.font = `bold ${fontSize}px ${layer.fontFamily || "Arial"}`;
          const lines: string[] = [];
          (layer.text || "").split(/\r?\n/).forEach(paragraph => {
            const words = paragraph.split(/\s+/).filter(Boolean);
            if (!words.length) { lines.push(""); return; }
            let line = "";
            words.forEach(word => {
              const candidate = line ? line + " " + word : word;
              if (line && ctx.measureText(candidate).width > maxWidth) { lines.push(line); line = word; }
              else line = candidate;
            });
            lines.push(line);
          });
          const textWidth = Math.min(maxWidth, Math.max(1, ...lines.map(line => ctx.measureText(line).width)));
          const textHeight = Math.max(lineHeight, lines.length * lineHeight);
          const padding = layer.padding ?? 12;
          const x = canvas.width * ((layer.x ?? 50) / 100);
          const y = canvas.height * ((layer.y ?? 50) / 100);
          ctx.translate(x, y);
          if (layer.animation === "pop") {
            const entrance = Math.min(1, local / 0.2);
            const eased = 1 - Math.pow(1 - entrance, 3);
            const scale = 0.82 + eased * 0.18;
            ctx.scale(scale, scale);
          }
          if (layer.rotation) ctx.rotate(layer.rotation * Math.PI / 180);
          ctx.textAlign = layer.align || "center";
          ctx.textBaseline = "middle";
          if (layer.backgroundColor && layer.backgroundColor !== "transparent") {
            const boxWidth = Math.min(maxWidth, textWidth) + padding * 2;
            const boxHeight = textHeight + padding * 2;
            const boxX = ctx.textAlign === "left" ? 0 : ctx.textAlign === "right" ? -boxWidth : -boxWidth / 2;
            ctx.fillStyle = layer.backgroundColor;
            const left = boxX, top = -boxHeight / 2, radius = Math.min(18 * canvas.height / 1080, boxHeight / 2, boxWidth / 2);
            if (typeof ctx.roundRect === "function") {
              ctx.beginPath(); ctx.roundRect(left, top, boxWidth, boxHeight, radius); ctx.fill();
            } else ctx.fillRect(left, top, boxWidth, boxHeight);
          }
          ctx.fillStyle = layer.color;
          ctx.shadowColor = layer.shadow === false ? "transparent" : "rgba(0,0,0,.7)";
          ctx.shadowBlur = layer.shadow === false ? 0 : 12;
          lines.forEach((line, index) => ctx.fillText(line, 0, (index - (lines.length - 1) / 2) * lineHeight, maxWidth));
          ctx.restore();
        });
        const progress = Math.min(99, Math.round(time / input.duration * 100));
        if (progress !== lastProgress) { lastProgress = progress; input.onProgress?.(progress); }
      }
      if (time >= input.duration) {
        activeVideos.forEach(v => v.pause()); audioNodes.forEach(({element}) => element.pause());
        recorder.stop(); canvasStream?.getTracks().forEach(track => track.stop()); return;
      }
      raf = requestAnimationFrame(draw);
      } catch (error) {
        cancelAnimationFrame(raf);
        activeVideos.forEach(video => video.pause());
        audioNodes.forEach(({element}) => element.pause());
        rejectRecording(error instanceof Error ? error : new Error("The export renderer encountered an unexpected error."));
        if (recorder.state !== "inactive") {
          try { recorder.stop(); } catch {}
        }
      }
    };
    const abortExport = () => {
      rejectRecording(new DOMException("Export cancelled. Your project and source media are unchanged.", "AbortError"));
      cancelAnimationFrame(raf);
      activeVideos.forEach(video => video.pause());
      audioNodes.forEach(({element}) => element.pause());
      if (recorder.state !== "inactive") { try { recorder.stop(); } catch {} }
    };
    if (audioContext) await audioContext.resume();
    throwIfAborted();
    recorder.start(250);
    input.signal?.addEventListener("abort", abortExport, { once: true });
    draw();
    let result: Blob;
    try { result = await stopped; } finally { input.signal?.removeEventListener("abort", abortExport); }
    cancelAnimationFrame(raf);
    input.onProgress?.(100);
    if (!result.size) throw new Error("The export produced an empty video. Try a shorter timeline or lower resolution.");
    return result;
  } finally { cleanup(); }
}

export { dimensions as getExportDimensions };
