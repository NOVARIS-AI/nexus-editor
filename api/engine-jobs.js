const engines = {
 image:{url:"NEXUS_IMAGE_ENGINE_URL",token:"NEXUS_IMAGE_ENGINE_TOKEN"},
 video:{url:"NEXUS_VIDEO_ENGINE_URL",token:"NEXUS_VIDEO_ENGINE_TOKEN"},
 audio:{url:"NEXUS_AUDIO_ENGINE_URL",token:"NEXUS_AUDIO_ENGINE_TOKEN"},
 render:{url:"NEXUS_RENDER_ENGINE_URL",token:"NEXUS_RENDER_ENGINE_TOKEN"}
};
const json = (res,status,body)=>res.status(status).json(body);
export default async function handler(req,res) {
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST") return json(res,405,{error:"Job lookup requires a configured job store; submit jobs with POST."});
 const {engine,prompt,options={}}=req.body||{};
 if(!Object.prototype.hasOwnProperty.call(engines,engine)) return json(res,400,{error:"Unsupported NEXUS engine."});
 if(typeof prompt!=="string"||!prompt.trim()||prompt.length>12000) return json(res,400,{error:"Provide a prompt of up to 12,000 characters."});
 const config=engines[engine],url=process.env[config.url],token=process.env[config.token];
 if(!url||!token) return json(res,503,{error:"The NEXUS "+engine+" worker is not configured yet. Use the listed editor fallback; no generation has been started."});
 try {
  const upstream=await fetch(url.replace(/\/$/,"")+"/jobs",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({engine,prompt:prompt.trim(),options})});
  const body=await upstream.json().catch(()=>({}));
  if(!upstream.ok) return json(res,upstream.status,{error:body.error||"The NEXUS worker rejected this job."});
  return json(res,202,body);
 } catch { return json(res,502,{error:"The NEXUS worker could not be reached. The project is unchanged; use the configured fallback."}); }
}
