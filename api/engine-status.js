const env = (key) => Boolean(process.env[key]);
export default function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  const cloudflareConfigured = env("CLOUDFLARE_ACCOUNT_ID") && env("CLOUDFLARE_API_TOKEN");
  const workerConfigured = env("NEXUS_WORKER_URL") && env("NEXUS_WORKER_TOKEN");
  const cloudflareAvailable = cloudflareConfigured || workerConfigured;
  res.status(200).json({
    providers: { cloudflareWorkersAI: { configured: cloudflareAvailable, connection: workerConfigured ? "secure-worker-proxy" : cloudflareConfigured ? "direct-api" : "not-configured", textModel: process.env.NEXUS_CF_TEXT_MODEL || "@cf/meta/llama-3.2-1b-instruct", imageModel: process.env.NEXUS_CF_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell", capabilities: ["text", "image-proxy"], note: workerConfigured ? "Cloudflare Worker is connected through the server-side proxy. Storyboard scene images and selected image-layer replacements can be generated and imported by the editor." : "Set NEXUS_WORKER_URL and NEXUS_WORKER_TOKEN in the app server runtime to connect the deployed Worker." } },
    workerProtocol: "nexus-ai-v1",
    security: { workerEndpointsRequireHttps: true, jobOutputsRequireHttps: true },
    brain: {
      configured: (env("NEXUS_AI_API_KEY") && env("NEXUS_AI_BASE_URL") && env("NEXUS_AI_MODEL")) || cloudflareAvailable,
      provider: env("NEXUS_AI_API_KEY") && env("NEXUS_AI_BASE_URL") && env("NEXUS_AI_MODEL") ? "openai-compatible" : workerConfigured ? "cloudflare-workers-ai-worker" : cloudflareConfigured ? "cloudflare-workers-ai" : null,
      model: process.env.NEXUS_AI_MODEL || (cloudflareAvailable ? process.env.NEXUS_CF_TEXT_MODEL || "@cf/meta/llama-3.2-1b-instruct" : null)
    },
    engines: {
      image: { configured: workerConfigured || (env("NEXUS_IMAGE_ENGINE_URL") && env("NEXUS_IMAGE_ENGINE_TOKEN")), provider: "NEXUS-managed image worker", fallback: "Editable SVG/Canvas graphics and licensed sourced images" },
      video: { configured: env("NEXUS_VIDEO_ENGINE_URL") && env("NEXUS_VIDEO_ENGINE_TOKEN"), provider: "NEXUS-managed video worker", fallback: "Licensed sourced footage and native animated timeline scenes" },
      audio: { configured: env("NEXUS_AUDIO_ENGINE_URL") && env("NEXUS_AUDIO_ENGINE_TOKEN"), provider: "NEXUS-managed audio worker", fallback: "Web Audio API and native audio playback" },
      render: { configured: env("NEXUS_RENDER_ENGINE_URL") && env("NEXUS_RENDER_ENGINE_TOKEN"), provider: "NEXUS-managed render worker", fallback: "Browser MediaRecorder WebM where supported" }
    }
  });
}
