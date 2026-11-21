const env = (key) => Boolean(process.env[key]);
const hasSecureWorkerPair = (urlKey, tokenKey) => {
  if (!env(tokenKey)) return false;
  try {
    const endpoint = new URL(process.env[urlKey]);
    return endpoint.protocol === "https:" && !endpoint.username && !endpoint.password;
  } catch { return false; }
};
const capability = (configured, provider, fallback, capabilities, note) => ({
  configured: Boolean(configured),
  verified: false,
  status: configured ? "configured-unverified" : "fallback",
  provider,
  fallback,
  capabilities,
  note: note || (configured
    ? "Secure endpoint credentials are present. Runtime support is not confirmed until the provider passes a health/capability check."
    : "No secure endpoint and token pair is configured; use the listed fallback.")
});
export default function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  const cloudflareConfigured = env("CLOUDFLARE_ACCOUNT_ID") && env("CLOUDFLARE_API_TOKEN");
  const mediaWorkerConfigured = hasSecureWorkerPair("NEXUS_ENGINE_WORKER_URL", "NEXUS_ENGINE_WORKER_TOKEN");
  const workerConfigured = hasSecureWorkerPair("NEXUS_WORKER_URL", "NEXUS_WORKER_TOKEN");
  const cloudflareAvailable = cloudflareConfigured || workerConfigured;
  const dedicated = {
    image: hasSecureWorkerPair("NEXUS_IMAGE_ENGINE_URL", "NEXUS_IMAGE_ENGINE_TOKEN"),
    video: hasSecureWorkerPair("NEXUS_VIDEO_ENGINE_URL", "NEXUS_VIDEO_ENGINE_TOKEN"),
    audio: hasSecureWorkerPair("NEXUS_AUDIO_ENGINE_URL", "NEXUS_AUDIO_ENGINE_TOKEN"),
    render: hasSecureWorkerPair("NEXUS_RENDER_ENGINE_URL", "NEXUS_RENDER_ENGINE_TOKEN"),
    remotion: hasSecureWorkerPair("NEXUS_REMOTION_ENGINE_URL", "NEXUS_REMOTION_ENGINE_TOKEN"),
    hyperframes: hasSecureWorkerPair("NEXUS_HYPERFRAMES_ENGINE_URL", "NEXUS_HYPERFRAMES_ENGINE_TOKEN"),
    ffmpeg: hasSecureWorkerPair("NEXUS_FFMPEG_ENGINE_URL", "NEXUS_FFMPEG_ENGINE_TOKEN"),
    ytdlp: hasSecureWorkerPair("NEXUS_YTDLP_ENGINE_URL", "NEXUS_YTDLP_ENGINE_TOKEN")
  };
  const audioWorkerConfigured = dedicated.audio || mediaWorkerConfigured;
  const audioProvider = audioWorkerConfigured ? "NEXUS Audio Router" : "NEXUS local audio engine";
  const sharedMediaEngines = ["render", "remotion", "hyperframes", "ffmpeg", "ytdlp"];
  const engines = {
    image: capability(workerConfigured || dedicated.image, workerConfigured ? "Cloudflare Workers AI image worker" : "NEXUS-managed image worker", "Editable SVG/Canvas graphics and licensed sourced images", ["image-generation", "image-layer-replacement"]),
    video: capability(dedicated.video || mediaWorkerConfigured, dedicated.video ? "NEXUS-managed video worker" : "NEXUS shared media worker", "Licensed sourced footage and native animated timeline scenes", ["prompt-to-video", "scene-video"]),
    audio: capability(audioWorkerConfigured, audioProvider, "Wikimedia Commons licensed audio search, then original local Web Audio synthesis", ["voice", "music", "sound-effects", "stem-separation"]),
    render: capability(dedicated.render || mediaWorkerConfigured, "NEXUS-managed render worker", "Browser MediaRecorder WebM where supported", ["final-render", "export"]),
    remotion: capability(dedicated.remotion || mediaWorkerConfigured, "Remotion composition worker", "Existing editable browser timeline composition", ["react-video-composition", "deterministic-render"]),
    hyperframes: capability(dedicated.hyperframes || mediaWorkerConfigured, "HyperFrames motion-graphics worker", "Existing SVG/Canvas text and motion layers", ["motion-graphics", "animated-typography"]),
    ffmpeg: capability(dedicated.ffmpeg || mediaWorkerConfigured, "FFmpeg media-processing worker", "Existing browser/native media processing", ["transcode", "trim", "mux", "extract"]),
    whisper: capability(true, env("GROQ_API_KEY") ? "Existing online-first speech pipeline" : "Existing on-device Whisper Tiny pipeline", "Existing on-device Whisper Tiny pipeline", ["speech-to-text", "timestamps"], "A local transcription fallback is included; online transcription is available only when GROQ_API_KEY is configured."),
    ytdlp: capability(dedicated.ytdlp || mediaWorkerConfigured, "yt-dlp authorized-media worker", "Existing licensed media search and user imports", ["authorized-reference-download", "source-metadata"])
  };
  for (const name of sharedMediaEngines) {
    if (engines[name].configured && !dedicated[name]) {
      engines[name].note = "A shared HTTPS worker endpoint is configured, but this specific engine has not yet been verified by a capability handshake.";
    }
  }
  res.status(200).json({
    providers: {
      cloudflareWorkersAI: {
        configured: cloudflareAvailable,
        connection: workerConfigured ? "secure-worker-proxy" : cloudflareConfigured ? "direct-api" : "not-configured",
        textModel: process.env.NEXUS_CF_TEXT_MODEL || "@cf/meta/llama-3.2-1b-instruct",
        imageModel: process.env.NEXUS_CF_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell",
        capabilities: ["text", "image-proxy"],
        note: workerConfigured
          ? "Cloudflare Worker credentials are configured. Confirm its health endpoint before relying on generation."
          : "Set NEXUS_WORKER_URL and NEXUS_WORKER_TOKEN in the app server runtime to connect the deployed Worker."
      }
    },
    workerProtocol: "nexus-ai-v1",
    security: { workerEndpointsRequireHttps: true, jobOutputsRequireHttps: true },
    capabilityDiscovery: {
      meaning: "configured means a valid HTTPS endpoint and token pair exists; it does not mean the provider has been tested.",
      verification: "verified remains false until a live health/capability handshake confirms the requested engine and operation."
    },
    brain: {
      configured: Boolean((env("NEXUS_AI_API_KEY") && env("NEXUS_AI_BASE_URL") && env("NEXUS_AI_MODEL")) || cloudflareAvailable),
      provider: env("NEXUS_AI_API_KEY") && env("NEXUS_AI_BASE_URL") && env("NEXUS_AI_MODEL") ? "openai-compatible" : workerConfigured ? "cloudflare-workers-ai-worker" : cloudflareConfigured ? "cloudflare-workers-ai" : null,
      model: process.env.NEXUS_AI_MODEL || (cloudflareAvailable ? process.env.NEXUS_CF_TEXT_MODEL || "@cf/meta/llama-3.2-1b-instruct" : null)
    },
    engines
  });
}
