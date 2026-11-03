type CaptureVideo = HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
const AUDIO_MIME_TYPES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
function chooseAudioMime() { return AUDIO_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type)); }
function waitForSeek(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    if (Math.abs(video.currentTime - time) < 0.04) { resolve(); return; }
    const timer = window.setTimeout(() => { cleanup(); reject(new Error("The video could not seek to the selected in-point.")); }, 15000);
    const cleanup = () => { window.clearTimeout(timer); video.removeEventListener("seeked", ready); video.removeEventListener("error", failed); };
    const ready = () => { cleanup(); resolve(); }, failed = () => { cleanup(); reject(new Error("The video failed while seeking.")); };
    video.addEventListener("seeked", ready, { once: true }); video.addEventListener("error", failed, { once: true }); video.currentTime = time;
  });
}
export async function extractAudioTrackFromVideo(file: File, sourceIn: number, sourceOut: number): Promise<File> {
  if (!Number.isFinite(sourceIn) || !Number.isFinite(sourceOut) || sourceIn < 0 || sourceOut <= sourceIn) throw new Error("Choose a valid video segment before extracting audio.");
  if (typeof MediaRecorder === "undefined") throw new Error("Audio extraction needs MediaRecorder support in this browser.");
  const mimeType = chooseAudioMime();
  if (!mimeType) throw new Error("This browser does not offer a supported audio recording format.");
  const video = document.createElement("video") as CaptureVideo, url = URL.createObjectURL(file);
  let sourceStream: MediaStream | null = null, outputStream: MediaStream | null = null, audioContext: AudioContext | null = null, recorder: MediaRecorder | null = null;
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  // Start/resume Web Audio immediately while the extract button gesture is still active.
  if (!video.captureStream && !video.mozCaptureStream && AudioContextCtor) { audioContext = new AudioContextCtor(); void audioContext.resume(); }
  try {
    video.preload = "auto"; video.playsInline = true; video.muted = false; video.volume = 1; video.src = url;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => { cleanup(); reject(new Error("The video did not become ready. Try a shorter or browser-supported video.")); }, 25000);
      const cleanup = () => { window.clearTimeout(timer); video.removeEventListener("loadedmetadata", ready); video.removeEventListener("error", failed); };
      const ready = () => { cleanup(); resolve(); }, failed = () => { cleanup(); reject(new Error("This video format could not be decoded by the browser.")); };
      video.addEventListener("loadedmetadata", ready, { once: true }); video.addEventListener("error", failed, { once: true }); if (video.readyState >= 1) ready();
    });
    const end = Math.min(sourceOut, Number.isFinite(video.duration) ? video.duration : sourceOut);
    if (sourceIn >= end) throw new Error("The selected in-point is beyond the available video duration.");
    await waitForSeek(video, sourceIn);
    const nativeCapture = video.captureStream || video.mozCaptureStream;
    if (nativeCapture) { try { sourceStream = nativeCapture.call(video); const tracks = sourceStream.getAudioTracks(); if (tracks.length) outputStream = new MediaStream(tracks); } catch { outputStream = null; } }
    // Mobile fallback: record the decoded media-element audio through Web Audio.
    if (!outputStream) {
      if (!AudioContextCtor) throw new Error("This browser supports neither media capture nor Web Audio audio extraction.");
      audioContext ||= new AudioContextCtor(); await audioContext.resume();
      const destination = audioContext.createMediaStreamDestination();
      audioContext.createMediaElementSource(video).connect(destination);
      outputStream = destination.stream;
    }
    if (!outputStream.getAudioTracks().length) throw new Error("No audio track was detected in this video.");
    recorder = new MediaRecorder(outputStream, { mimeType, audioBitsPerSecond: 128000 });
    const chunks: BlobPart[] = [];
    const stopped = new Promise<Blob>((resolve, reject) => {
      recorder!.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder!.onerror = () => reject(new Error("The browser recorder stopped unexpectedly during extraction."));
      recorder!.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });
    recorder.start(250);
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => { cleanup(); video.pause(); reject(new Error("Audio extraction timed out. Try a shorter video segment.")); }, Math.max(30000, (end-sourceIn)*1000+15000));
      const cleanup = () => { window.clearTimeout(timer); video.removeEventListener("timeupdate", check); video.removeEventListener("ended", finish); video.removeEventListener("error", failed); };
      const finish = () => { cleanup(); video.pause(); resolve(); };
      const check = () => { if (video.currentTime >= end - 0.035) finish(); };
      const failed = () => { cleanup(); reject(new Error("Video playback failed during audio extraction.")); };
      video.addEventListener("timeupdate", check); video.addEventListener("ended", finish, { once: true }); video.addEventListener("error", failed, { once: true });
      void video.play().catch(error => { cleanup(); reject(new Error(error instanceof Error ? "Playback was blocked. Tap Extract again after interacting with the editor." : "Video playback was blocked.")); });
    });
    if (recorder.state !== "inactive") recorder.stop();
    const blob = await stopped;
    if (!blob.size) throw new Error("The selected segment produced an empty audio recording.");
    const extension = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + "-audio." + extension, { type: mimeType, lastModified: Date.now() });
  } finally {
    if (recorder && recorder.state !== "inactive") { try { recorder.stop(); } catch {} }
    video.pause(); sourceStream?.getTracks().forEach(track => track.stop()); outputStream?.getTracks().forEach(track => track.stop());
    if (audioContext) { try { await audioContext.close(); } catch {} }
    video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url);
  }
}
