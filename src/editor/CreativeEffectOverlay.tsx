import { useEffect, useRef } from "react";
import { drawCreativeEffect, hasCreativeEffectOverlay } from "./creative-effect-engine";

type Props = { name?: string; intensity?: number };

/** Canvas overlay pass keeps particles, film texture, light and glitch effects visible in live preview. */
export function CreativeEffectOverlay({ name, intensity = 100 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !name || !hasCreativeEffectOverlay(name)) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frame = 0;
    let lastPaint = 0;
    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    resize();
    observer?.observe(canvas.parentElement || canvas);
    const paint = (now: number) => {
      if (now - lastPaint >= 1000 / 24) {
        lastPaint = now;
        context.clearRect(0, 0, width, height);
        if (name.toLowerCase().includes("vignette")) {
          const radius = Math.hypot(width, height) * .62;
          const gradient = context.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .18, width / 2, height / 2, radius);
          gradient.addColorStop(0, "rgba(0,0,0,0)");
          gradient.addColorStop(1, "rgba(0,0,0," + (.62 * Math.max(0, Math.min(1, intensity / 100))) + ")");
          context.fillStyle = gradient;
          context.fillRect(0, 0, width, height);
        } else {
          drawCreativeEffect(context, 0, 0, width, height, now / 1000, name, Math.max(0, Math.min(1, intensity / 100)));
        }
      }
      frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [name, intensity]);

  if (!name || !hasCreativeEffectOverlay(name)) return null;
  return <canvas ref={canvasRef} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }} />;
}
