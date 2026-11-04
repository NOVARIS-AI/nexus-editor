const env = (key) => Boolean(process.env[key]);
export default function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  const cloudflareConfigured = env("CLOUDFLARE_ACCOUNT_ID") && env("CLOUDFLARE_API_TOKEN");
  res.status(200).json({
    providers: { cloudflareWorkersAI: { configured: cloudflareConfigured, textModel: process.env.NEXUS_CF_TEXT_MODEL || "@cf/meta/llama-3.1-8b-instruct", imageModel: process.env.NEXUS_CF_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell", capabilities: ["text", "image-proxy"], note: "The image proxy is synchronous and is not yet wired into the editor generation-job importer." } },
    workerProtocol: "nexus-jobs-v1",
    security: { workerEndpointsRequireHttps: true, jobOutputsRequireHttps: true },
    brain: {
      configured: (env("NEXUS_AI_API_KEY") && env("NEXUS_AI_BASE_URL") && env("NEXUS_AI_MODEL")) || cloudflareConfigured,
      provider: env("NEXUS_AI_API_KEY") && env("NEXUS_AI_BASE_URL") && env("NEXUS_AI_MODEL") ? "openai-compatible" : cloudflareConfigured ? "cloudflare-workers-ai" : null,
      model: process.env.NEXUS_AI_MODEL || (cloudflareConfigured ? process.env.NEXUS_CF_TEXT_MODEL || "@cf/meta/llama-3.1-8b-instruct" : null)
    },
    engines: {
      image: { configured: env("NEXUS_IMAGE_ENGINE_URL") && env("NEXUS_IMAGE_ENGINE_TOKEN"), provider: "NEXUS-managed image worker", fallback: "Editable SVG/Canvas graphics and licensed sourced images" },
      video: { configured: env("NEXUS_VIDEO_ENGINE_URL") && env("NEXUS_VIDEO_ENGINE_TOKEN"), provider: "NEXUS-managed video worker", fallback: "Licensed sourced footage and native animated timeline scenes" },
      audio: { configured: env("NEXUS_AUDIO_ENGINE_URL") && env("NEXUS_AUDIO_ENGINE_TOKEN"), provider: "NEXUS-managed audio worker", fallback: "Web Audio API and native audio playback" },
      render: { configured: env("NEXUS_RENDER_ENGINE_URL") && env("NEXUS_RENDER_ENGINE_TOKEN"), provider: "NEXUS-managed render worker", fallback: "Browser MediaRecorder WebM where supported" }
    }
  });
}
