export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const brain = !!process.env.GROQ_API_KEY;
  const image = !!process.env.NEXUS_IMAGE_ENGINE_URL;
  const video = !!process.env.NEXUS_VIDEO_ENGINE_URL;
  const audio = !!process.env.NEXUS_AUDIO_ENGINE_URL;
  return res.status(200).json({
    brain: { configured: brain, model: process.env.NEXUS_BRAIN_MODEL || "llama-3.3-70b-versatile" },
    engines: {
      image: { configured: image, provider: image ? "NEXUS worker" : "Not connected", fallback: "Editable native graphics and licensed media search" },
      video: { configured: video, provider: video ? "NEXUS worker" : "Not connected", fallback: "Timeline scenes, imported clips and licensed footage" },
      audio: { configured: audio, provider: audio ? "NEXUS worker" : "Not connected", fallback: "Browser audio tools and imported audio" }
    }
  });
}
