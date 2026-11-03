import type { MediaAsset } from "../types";

export async function extractAudioTrackFromVideo(file: File, sourceIn: number, sourceOut: number): Promise<File> {
  if (!Number.isFinite(sourceIn) || !Number.isFinite(sourceOut) || sourceIn < 0 || sourceOut <= sourceIn) {
    throw new Error("Choose a valid video segment before extracting audio.");
  }
  if (typeof MediaRecorder === "undefined") throw new Error("Audio extraction needs MediaRecorder support in an updated browser.");
  const video = document.createElement("video");
  const url = URL.createObjectURL(file);
  const capture = video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  try {
    video.preload = "auto";
    video.playsInline = true;
    video.muted = false;
    video.volume = 1;
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => { cleanup(); reject(new Error("The video did not become ready for audio extraction.")); }, 20000);
      const cleanup = () => { window.clearTimeout(timer); video.removeEventListener("loadedmetadata", ready); video.removeEventListener("error", failed); };
      const ready = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error("This video could not be decoded by the browser.")); };
      video.addEventListener("loadedmetadata", ready, { once: true });
      video.addEventListener("error", failed, { once: true });
      if (video.readyState >= 1) ready();
    });
    const captureStream = capture.captureStream || capture.mozCaptureStream;
    if (!captureStream) throw new Error("This browser cannot capture media playback for extraction. Try a current desktop Chrome or Firefox browser.");
    stream = captureStream.call(video);
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) throw new Error("No audio track was detected in this video.");
    const audioStream = new MediaStream(audioTracks);
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error("This browser does not offer a supported audio recording format.");
    recorder = new MediaRecorder(audioStream, { mimeType, audioBitsPerSecond: 160000 });
    const chunks: BlobPart[] = [];
    const stopped = new Promise<Blob>((resolve, reject) => {
      recorder!.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder!.onerror = () => reject(new Error("The browser recorder stopped while extracting audio."));
      recorder!.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => { cleanup(); reject(new Error("The video could not seek to the selected in-point.")); }, 12000);
      const cleanup = () => { window.clearTimeout(timer); video.removeEventListener("seeked", ready); video.removeEventListener("error", failed); };
      const ready = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error("The video failed while seeking to its selected in-point.")); };
      if (Math.abs(video.currentTime - sourceIn) < 0.03) resolve();
      else { video.addEventListener("seeked", ready, { once: true }); video.addEventListener("error", failed, { once: true }); video.currentTime = sourceIn; }
    });
    recorder.start(250);
    const reachedEnd = new Promise<void>((resolve, reject) => {
      const target = Math.min(sourceOut, Number.isFinite(video.duration) ? video.duration : sourceOut);
      const timer = window.setTimeout(() => { cleanup(); reject(new Error("Audio capture timed out. Try extracting a shorter segment.")); }, Math.max(30000, (target-sourceIn)*1000+12000));
      const finish = () => { cleanup(); resolve(); };
      const cleanup = () => { window.clearTimeout(timer); video.removeEventListener("timeupdate", check); video.removeEventListener("ended", finish); video.removeEventListener("error", failed); };
      const check = () => { if (video.currentTime >= target - 0.04) { video.pause(); finish(); } };
      const failed = () => { cleanup(); reject(new Error("The video playback failed during audio extraction.")); };
      video.addEventListener("timeupdate", check);
      video.addEventListener("ended", finish, { once: true });
      video.addEventListener("error", failed, { once: true });
      void video.play().catch(error => { cleanup(); reject(new Error(error instanceof Error ? "Playback was blocked: " + error.message : "Video playback was blocked.")); });
    });
    await reachedEnd;
    recorder.stop();
    const blob = await stopped;
    if (!blob.size) throw new Error("The selected video segment produced an empty audio recording.");
    const extension = mimeType.includes("ogg") ? "ogg" : "webm";
    return new File([blob], file.name.replace(/\\.[^.]+$/, "") + "-audio." + extension, { type: mimeType, lastModified: Date.now() });
  } finally {
    if (recorder && recorder.state !== "inactive") { try { recorder.stop(); } catch {} }
    video.pause();
    stream?.getTracks().forEach(track => track.stop());
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
