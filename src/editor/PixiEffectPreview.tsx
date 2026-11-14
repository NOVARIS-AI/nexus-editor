import { useEffect, useRef, useState } from "react";

type Props = {
  source?: string;
  mediaKind?: string;
  effectName?: string;
};

function matrixFor(name: string): number[] {
  const key = name.toLowerCase();
  const identity = [1,0,0,0,0, 0,1,0,0,0, 0,0,1,0,0, 0,0,0,1,0];
  if (/mono|black.?white|noir|b&w|grayscale/.test(key)) {
    return [0.2126,0.7152,0.0722,0,0, 0.2126,0.7152,0.0722,0,0, 0.2126,0.7152,0.0722,0,0, 0,0,0,1,0];
  }
  if (/sepia|vintage|retro|polaroid|kodachrome/.test(key)) {
    return [0.393,0.769,0.189,0,0, 0.349,0.686,0.168,0,0, 0.272,0.534,0.131,0,0, 0,0,0,1,0];
  }
  if (/invert|negative/.test(key)) {
    return [-1,0,0,0,1, 0,-1,0,0,1, 0,0,-1,0,1, 0,0,0,1,0];
  }
  if (/warm|gold|sunset|rose|autumn/.test(key)) {
    return [1.12,0.02,0,0,0.015, 0,1.02,0,0,0, 0,0,0.86,0,0, 0,0,0,1,0];
  }
  if (/cool|arctic|ocean|winter|blue/.test(key)) {
    return [0.88,0,0,0,0, 0,1,0,0,0, 0,0,1.14,0,0.015, 0,0,0,1,0];
  }
  if (/neon|vivid|cyber|rich|ektar/.test(key)) {
    const s = 1.55, r = 0.2126, g = 0.7152, b = 0.0722;
    return [r*(1-s)+s,g*(1-s),b*(1-s),0,0, r*(1-s),g*(1-s)+s,b*(1-s),0,0, r*(1-s),g*(1-s),b*(1-s)+s,0,0, 0,0,0,1,0];
  }
  if (/bright|dream|glow|soft/.test(key)) {
    return [1.04,0,0,0,0.035, 0,1.04,0,0,0.035, 0,0,1.04,0,0.035, 0,0,0,1,0];
  }
  if (/dark|moody|night/.test(key)) {
    return [1.14,0,0,0,-0.08, 0,1.14,0,0,-0.08, 0,0,1.14,0,-0.08, 0,0,0,1,0];
  }
  return identity;
}

export function PixiEffectPreview({ source, mediaKind, effectName = "Original" }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "fallback">("idle");

  useEffect(() => {
    let disposed = false;
    let app: import("pixi.js").Application | undefined;
    let media: HTMLVideoElement | undefined;

    const mount = async () => {
      if (!source || (mediaKind !== "image" && mediaKind !== "video") || !host.current) {
        setState("idle");
        return;
      }
      setState("loading");
      try {
        const PIXI = await import("pixi.js");
        if (disposed || !host.current) return;
        app = new PIXI.Application();
        await app.init({
          width: 240,
          height: 156,
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resolution: Math.min(1.5, window.devicePixelRatio || 1),
          preference: "webgl",
          powerPreference: "low-power",
        });
        if (disposed || !host.current) {
          app.destroy();
          return;
        }

        let texture: import("pixi.js").Texture;
        if (mediaKind === "video") {
          media = document.createElement("video");
          media.src = source;
          media.muted = true;
          media.loop = true;
          media.playsInline = true;
          media.preload = "auto";
          await new Promise<void>((resolve, reject) => {
            const timer = window.setTimeout(() => reject(new Error("Video preview timed out")), 12000);
            media!.addEventListener("loadeddata", () => { window.clearTimeout(timer); resolve(); }, { once: true });
            media!.addEventListener("error", () => { window.clearTimeout(timer); reject(new Error("Video preview unavailable")); }, { once: true });
            media!.load();
          });
          texture = PIXI.Texture.from(media);
          void media.play().catch(() => undefined);
        } else {
          texture = await PIXI.Assets.load(source) as import("pixi.js").Texture;
        }
        if (disposed || !host.current) {
          texture.destroy(false);
          app.destroy();
          return;
        }

        const sprite = new PIXI.Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.position.set(120, 78);
        const sourceWidth = texture.width || 1;
        const sourceHeight = texture.height || 1;
        const scale = Math.max(240 / sourceWidth, 156 / sourceHeight);
        sprite.width = sourceWidth * scale;
        sprite.height = sourceHeight * scale;
        const filter = new PIXI.ColorMatrixFilter();
        filter.matrix = matrixFor(effectName);
        sprite.filters = [filter];
        app.stage.addChild(sprite);
        app.canvas.className = "nexus-pixi-preview-canvas";
        app.canvas.setAttribute("aria-label", "GPU effect preview");
        host.current.replaceChildren(app.canvas);
        setState("ready");
      } catch {
        if (!disposed) setState("fallback");
        if (app) {
          try { app.destroy(); } catch { /* WebGL context may already be lost. */ }
          app = undefined;
        }
      }
    };

    void mount();
    return () => {
      disposed = true;
      media?.pause();
      if (media) {
        media.removeAttribute("src");
        media.load();
      }
      if (app) {
        try { app.canvas.remove(); app.destroy(); } catch { /* Ignore teardown races. */ }
      }
      host.current?.replaceChildren();
    };
  }, [source, mediaKind, effectName]);

  return (
    <div className="nexus-pixi-preview-wrap">
      <div className="nexus-pixi-preview" ref={host}>
        {state !== "ready" && <span>{state === "loading" ? "Preparing GPU preview…" : state === "fallback" ? "GPU preview unavailable · standard preview remains active" : "Select a visual clip for GPU preview"}</span>}
      </div>
      <div className="nexus-pixi-preview-caption"><i/> PIXI GPU PREVIEW <b>{effectName}</b></div>
    </div>
  );
}
