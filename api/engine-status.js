const env = (key) => Boolean(process.env[key]);
export default function handler(_req,res) {
 res.setHeader("Cache-Control","no-store");
 res.status(200).json({\n  workerProtocol: "nexus-jobs-v1",\n  security: { workerEndpointsRequireHttps: true, jobOutputsRequireHttps: true },
  brain:{configured:env("NEXUS_AI_API_KEY")&&env("NEXUS_AI_BASE_URL")&&env("NEXUS_AI_MODEL"),model:process.env.NEXUS_AI_MODEL||null},
  engines:{
   image:{configured:env("NEXUS_IMAGE_ENGINE_URL")&&env("NEXUS_IMAGE_ENGINE_TOKEN"),provider:"NEXUS-managed image worker",fallback:"Editable SVG/Canvas graphics and licensed sourced images"},
   video:{configured:env("NEXUS_VIDEO_ENGINE_URL")&&env("NEXUS_VIDEO_ENGINE_TOKEN"),provider:"NEXUS-managed video worker",fallback:"Licensed sourced footage and native animated timeline scenes"},
   audio:{configured:env("NEXUS_AUDIO_ENGINE_URL")&&env("NEXUS_AUDIO_ENGINE_TOKEN"),provider:"NEXUS-managed audio worker",fallback:"Web Audio API and native audio playback"},
   render:{configured:env("NEXUS_RENDER_ENGINE_URL")&&env("NEXUS_RENDER_ENGINE_TOKEN"),provider:"NEXUS-managed render worker",fallback:"Browser MediaRecorder WebM where supported"}
  }
 });
}
