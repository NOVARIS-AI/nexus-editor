import { useCallback, useEffect, useRef, useState } from "react";

type Props = { onRecorded: (file: File, duration: number) => void };

export function LiveCameraStudio({ onRecorded }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundRef = useRef<HTMLImageElement | null>(null);
  const cameraRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const frameRef = useRef<number>(0);
  const startedAtRef = useRef(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mode, setMode] = useState<"screen" | "original">("screen");
  const [keyColor, setKeyColor] = useState("#00ff00");
  const [tolerance, setTolerance] = useState(105);
  const [softness, setSoftness] = useState(32);
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [message, setMessage] = useState("Choose a green/blue screen for clean live replacement.");

  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      frameRef.current = requestAnimationFrame(drawFrame);
      return;
    }
    const width = 640;
    const height = Math.max(360, Math.round(640 * (video.videoHeight || 720) / (video.videoWidth || 1280)));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    if (mode === "screen" && backgroundRef.current?.complete && backgroundRef.current.naturalWidth) {
      const bg = backgroundRef.current;
      const scale = Math.max(width / bg.naturalWidth, height / bg.naturalHeight);
      const bw = bg.naturalWidth * scale, bh = bg.naturalHeight * scale;
      ctx.drawImage(bg, (width - bw) / 2, (height - bh) / 2, bw, bh);
      const frame = ctx.getImageData(0, 0, width, height);
      const pixels = frame.data;
      const hex = keyColor.replace("#", "");
      const kr = parseInt(hex.slice(0, 2), 16), kg = parseInt(hex.slice(2, 4), 16), kb = parseInt(hex.slice(4, 6), 16);
      const threshold = tolerance * 2.2;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const distance = Math.hypot(r - kr, g - kg, b - kb);
        const alpha = Math.max(0, Math.min(255, ((distance - threshold) / Math.max(1, softness * 2)) * 255));
        if (alpha < 255) {
          const x = (i / 4) % width, y = Math.floor(i / 4 / width);
          const bgIndex = (y * width + x) * 4;
          const original = [r, g, b];
          const bgData = frame.data;
          pixels[i] = original[0]; pixels[i + 1] = original[1]; pixels[i + 2] = original[2]; pixels[i + 3] = alpha;
          // Reconstruct the background from a cached frame before the keyed subject.
          // The background is painted again below from the selected image.
          void bgData; void bgIndex;
        }
      }
      // Recompose using a separate foreground canvas so keyed pixels reveal the selected backdrop.
      const foreground = document.createElement("canvas");
      foreground.width = width; foreground.height = height;
      const fg = foreground.getContext("2d");
      if (fg) {
        fg.putImageData(frame, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(bg, (width - bw) / 2, (height - bh) / 2, bw, bh);
        ctx.drawImage(foreground, 0, 0);
      }
    }
    frameRef.current = requestAnimationFrame(drawFrame);
  }, [keyColor, mode, softness, tolerance]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
      cameraRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraOn(true);
      setMessage("Camera ready. For live background replacement, use an evenly lit green or blue screen.");
      frameRef.current = requestAnimationFrame(drawFrame);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Camera permission was not granted.");
    }
  }

  function stopCamera() {
    if (recording) stopRecording();
    cancelAnimationFrame(frameRef.current);
    cameraRef.current?.getTracks().forEach(track => track.stop());
    cameraRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  function startRecording() {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    if (!canvas || !camera || !("MediaRecorder" in window)) {
      setMessage("Camera or video recording is not available in this browser.");
      return;
    }
    const output = canvas.captureStream(24);
    camera.getAudioTracks().forEach(track => output.addTrack(track));
    const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(type => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(output, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      if (!blob.size) { setMessage("No video was captured. Please try again."); return; }
      const file = new File([blob], "NEXUS-Live-Studio-" + new Date().toISOString().replace(/[:.]/g, "-") + ".webm", { type: blob.type });
      onRecorded(file, Math.max(1, (Date.now() - startedAtRef.current) / 1000));
      setMessage("Recording added to your project timeline.");
      output.getTracks().forEach(track => track.stop());
    };
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    recorder.start(250);
    setRecording(true);
    setElapsed(0);
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 500);
    recorder.addEventListener("stop", () => window.clearInterval(timer), { once: true });
    setMessage("Recording live camera output…");
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  }

  function chooseBackground(file?: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
    setBackgroundUrl(url);
    const image = new Image();
    image.onload = () => { backgroundRef.current = image; };
    image.src = url;
    setMode("screen");
  }

  useEffect(() => () => {
    cancelAnimationFrame(frameRef.current);
    cameraRef.current?.getTracks().forEach(track => track.stop());
    if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
  }, [backgroundUrl]);

  return <div className="nexus-context-controls nexus-live-camera">
    <div className="nexus-effect-library-head"><div><b>Live Camera Studio</b><small>Record a processed camera video directly into your timeline</small></div><span>LIVE</span></div>
    <div className="nexus-live-camera-preview">
      <video ref={videoRef} muted playsInline style={{ display: "none" }}/>
      <canvas ref={canvasRef} aria-label="Live camera preview"/>
      {!cameraOn && <div className="nexus-live-camera-placeholder">Camera preview will appear here</div>}
    </div>
    <div className="nexus-live-camera-actions">
      {!cameraOn ? <button onClick={() => void startCamera()}>Start camera</button> : <button onClick={stopCamera}>Stop camera</button>}
      {!recording ? <button disabled={!cameraOn} onClick={startRecording}>● Record</button> : <button className="active" onClick={stopRecording}>Stop recording · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</button>}
    </div>
    <section className="nexus-effect-group"><b>Background replacement</b><p>For real-time replacement, use a plain, evenly lit green or blue screen behind the subject. This live keyer is designed for that setup; it does not claim AI person segmentation.</p>
      <label>Mode <select value={mode} onChange={e => setMode(e.target.value as "screen" | "original")}><option value="screen">Replace screen colour</option><option value="original">Original camera</option></select></label>
      <label>Screen colour <input type="color" value={keyColor} onChange={e => setKeyColor(e.target.value)}/></label>
      <label>Key tolerance <input type="range" min="20" max="180" value={tolerance} onChange={e => setTolerance(Number(e.target.value))}/><small>{tolerance}</small></label>
      <label>Edge softness <input type="range" min="1" max="100" value={softness} onChange={e => setSoftness(Number(e.target.value))}/><small>{softness}</small></label>
      <label className="nexus-live-file">Replacement background <input type="file" accept="image/*" onChange={e => chooseBackground(e.target.files?.[0])}/></label>
      {backgroundUrl && <img className="nexus-live-background-thumb" src={backgroundUrl} alt="Selected replacement background"/>}
    </section>
    <small role="status">{message}</small>
    <p className="nexus-live-note">Virtual-camera output to other Android apps is not available to ordinary browser-based apps. This studio records the processed feed inside NEXUS; Android system-level virtual-camera support would require a dedicated native camera service and device/OS support.</p>
  </div>;
}
