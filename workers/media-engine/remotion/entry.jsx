import React from "react";
import { AbsoluteFill, Composition, interpolate, useCurrentFrame, registerRoot } from "remotion";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const cleanScenes = (props) => Array.isArray(props.scenes) && props.scenes.length
  ? props.scenes.slice(0, 12).map((scene, index) => ({
      title: String(scene.title || "Scene " + (index + 1)).slice(0, 90),
      visual: String(scene.visual || scene.description || "").slice(0, 240),
      color: /^#[0-9a-f]{6}$/i.test(scene.color || "") ? scene.color : ["#24172e", "#182a3a", "#35251d", "#182c28"][index % 4]
    }))
  : [{ title: String(props.title || "NEXUS Studio").slice(0, 90), visual: String(props.prompt || "A cinematic visual composition").slice(0, 240), color: "#21172d" }];

const Video = (props) => {
  const frame = useCurrentFrame();
  const scenes = cleanScenes(props);
  const duration = Math.max(1, Number(props.durationInFrames) || 150);
  const sceneFrames = Math.ceil(duration / scenes.length);
  const index = Math.min(scenes.length - 1, Math.floor(frame / sceneFrames));
  const scene = scenes[index];
  const local = frame - index * sceneFrames;
  const opacity = interpolate(local, [0, 12, sceneFrames - 12, sceneFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(local, [0, sceneFrames], [34, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 75% 18%, #5e496e 0%, " + scene.color + " 42%, #08090d 100%)", justifyContent: "center", padding: 90, color: "white", fontFamily: "Arial, sans-serif" }}>
      <AbsoluteFill style={{ opacity: 0.16, backgroundImage: "linear-gradient(135deg, transparent 48%, rgba(255,255,255,.15) 49%, transparent 50%)", backgroundSize: "70px 70px" }} />
      <div style={{ opacity, transform: "translateY(" + y + "px)", position: "relative" }}>
        <div style={{ color: "#f2d65c", fontSize: 26, letterSpacing: 7, textTransform: "uppercase", marginBottom: 28 }}>NEXUS • SCENE {String(index + 1).padStart(2, "0")}</div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.06, maxWidth: "90%", textShadow: "0 8px 40px rgba(0,0,0,.3)" }}>{scene.title}</div>
        <div style={{ fontSize: 30, lineHeight: 1.35, opacity: 0.82, marginTop: 32, maxWidth: "85%" }}>{scene.visual}</div>
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, bottom: 72, height: 4, background: "rgba(255,255,255,.22)" }}>
        <div style={{ width: ((frame + 1) / duration * 100) + "%", height: "100%", background: "#f2d65c" }} />
      </div>
    </AbsoluteFill>
  );
};

const Root = () => (
  <Composition
    id="NexusDirector"
    component={Video}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={150}
    defaultProps={{ title: "NEXUS Studio", prompt: "A cinematic visual composition", scenes: [], durationInFrames: 150 }}
    calculateMetadata={({ props }) => {
      const scenes = cleanScenes(props);
      const seconds = clamp(Number(props.durationSeconds) || Math.max(5, scenes.length * 4), 3, 180);
      const ratio = String(props.aspectRatio || "9:16");
      const dimensions = ratio === "16:9" ? [1920, 1080] : ratio === "1:1" ? [1080, 1080] : ratio === "4:5" ? [1080, 1350] : [1080, 1920];
      return { width: dimensions[0], height: dimensions[1], durationInFrames: Math.round(seconds * 30), fps: 30 };
    }}
  />
);
registerRoot(Root);
