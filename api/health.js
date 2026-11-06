export default function handler(_req, res) {
  const env = globalThis.process?.env || {};
  const present = (name) => Boolean(env[name]);
  const checks = {
    supabasePublic: present("SUPABASE_URL") || present("VITE_SUPABASE_URL"),
    supabasePublicKey: present("SUPABASE_ANON_KEY") || present("VITE_SUPABASE_ANON_KEY") || present("VITE_SUPABASE_PUBLISHABLE_KEY"),
    supabaseServiceRole: present("SUPABASE_SERVICE_ROLE_KEY"),
    groqTranscription: present("GROQ_API_KEY"),
    cloudflareAi: present("CLOUDFLARE_ACCOUNT_ID") && present("CLOUDFLARE_API_TOKEN"),
    stream: present("CLOUDFLARE_ACCOUNT_ID") && present("CLOUDFLARE_STREAM_TOKEN") && present("CLOUDFLARE_STREAM_CUSTOMER_CODE"),
    nexusAiWorker: present("NEXUS_WORKER_URL") && present("NEXUS_WORKER_TOKEN"),
    imageEngine: present("NEXUS_IMAGE_ENGINE_URL") && present("NEXUS_IMAGE_ENGINE_TOKEN"),
    videoEngine: present("NEXUS_VIDEO_ENGINE_URL") && present("NEXUS_VIDEO_ENGINE_TOKEN"),
    audioEngine: present("NEXUS_AUDIO_ENGINE_URL") && present("NEXUS_AUDIO_ENGINE_TOKEN"),
    renderEngine: present("NEXUS_RENDER_ENGINE_URL") && present("NEXUS_RENDER_ENGINE_TOKEN")
  };
  const required = ["supabasePublic", "supabasePublicKey", "supabaseServiceRole", "groqTranscription"];
  const ready = required.every((key) => checks[key]);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    ok: true,
    service: "nexus-studio-app",
    hosting: "cloudflare-workers",
    appCoreConfigured: ready,
    checks,
    missingCore: required.filter((key) => !checks[key])
  });
}
