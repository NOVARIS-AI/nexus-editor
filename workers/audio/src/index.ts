export interface Env {
  NEXUS_AUDIO_WORKER_TOKEN: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_DEFAULT_VOICE_ID?: string;
  STABILITY_API_KEY?: string;
  DISBAND_KEY?: string;
  AUDIO_OUTPUTS: R2Store;
  AUDIO_JOBS: KVStore;
}
interface KVStore { get(key:string,type:"json"):Promise<any>; put(key:string,value:string,options?:{expirationTtl?:number}):Promise<void>; }
interface R2Store { put(key:string,value:ArrayBuffer,options?:any):Promise<void>; list(options?:any):Promise<{objects:Array<{key:string}>}>; get(key:string):Promise<{writeHttpMetadata(headers:Headers):void;body:ReadableStream<Uint8Array>}|null>; }
interface ExecutionContextLike { waitUntil(promise:Promise<unknown>):void; }
type Job = { id:string; engine:"audio"; provider:string; state:"queued"|"running"|"succeeded"|"failed"; progress:number; message:string; createdAt:number; output?:{url:string;mimeType:string}; metadata?:Record<string,unknown>; error?:string; externalId?:string; options?:Record<string,unknown>; prompt?:string };
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const providerOf=(options:Record<string,unknown>)=>String(options.provider||"stable-audio").toLowerCase();
const durationOf=(v:unknown,min:number,max:number,fallback:number)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):fallback));
function promptText(value:unknown){return String(value||"").trim().slice(0,4100);}
const DISBAND_STEMS=new Set(["vocals","vocals.lead","vocals.backing","instrumental","instrumental.drums","instrumental.bass","instrumental.guitar","instrumental.piano","instrumental.other"]);
async function refreshDisbandJob(job:Job,env:Env,publicBase:string):Promise<Job>{
  if(!env.DISBAND_KEY||!job.externalId) throw new Error("Disband is not configured for this audio worker.");
  const response=await fetch("https://api.disband.io/v1/separations/"+encodeURIComponent(job.externalId),{headers:{Authorization:"Bearer "+env.DISBAND_KEY,Prefer:"wait=2",Accept:"application/json"}});
  const body=await response.json().catch(()=>null) as any;
  if(!response.ok) throw new Error("Disband status check failed (HTTP "+response.status+").");
  if(body?.status==="failed") throw new Error(String(body.problem?.type||"Disband separation failed."));
  if(body?.status!=="ready") return {...job,state:"running",progress:body?.status==="processing"?55:25,message:"Disband is separating the selected audio into stems."};
  const outputs:Array<{name:string;url:string;mimeType:string}>=[];
  for(const [stem,formats] of Object.entries(body.stems||{})){
    const mp3=(formats as any)?.mp3;
    if(!mp3?.url) continue;
    const source=new URL(String(mp3.url));
    if(source.protocol!=="https:"||source.hostname!=="api.disband.io") continue;
    const file=await fetch(source.toString(),{headers:{Authorization:"Bearer "+env.DISBAND_KEY}});
    if(!file.ok) continue;
    const bytes=await file.arrayBuffer(); if(!bytes.byteLength) continue;
    const safeStem=String(stem).replace(/[^a-z0-9_-]/gi,"-").slice(0,48);
    const asset=await saveOutput(env,job.id+"-"+safeStem,bytes,file.headers.get("Content-Type")||"audio/mpeg","mp3",publicBase);
    outputs.push({name:String(stem),url:asset.url,mimeType:asset.mimeType});
  }
  if(!outputs.length) throw new Error("Disband finished but did not return downloadable audio stems.");
  const primary=outputs.find(item=>item.name==="vocals")||outputs[0];
  return {...job,state:"succeeded",progress:100,message:"Audio separated into "+outputs.length+" editable stem(s).",output:{url:primary.url,mimeType:primary.mimeType},metadata:{provider:"disband",stems:outputs}};
}
async function saveOutput(env:Env,id:string,bytes:ArrayBuffer,mimeType:string,ext:string,publicBase:string){
  const key="audio/"+id+"."+ext;
  await env.AUDIO_OUTPUTS.put(key,bytes,{httpMetadata:{contentType:mimeType,cacheControl:"private, max-age=3600"}});
  return {url:new URL("/assets/"+encodeURIComponent(id),publicBase).toString(),mimeType};
}
async function generate(job:Job,env:Env,publicBase:string):Promise<Job>{
  const options=job.options||{}, provider=job.provider, prompt=promptText(job.prompt);
  if(provider==="elevenlabs"){
    if(!env.ELEVENLABS_API_KEY) throw new Error("ElevenLabs is not configured on the NEXUS audio worker.");
    const task=String(options.task||"sfx");
    let response:Response, mime="audio/mpeg", ext="mp3";
    if(task==="voice"){
      const voiceId=String(options.voiceId||env.ELEVENLABS_DEFAULT_VOICE_ID||"").trim();
      const text=String(options.text||prompt).trim().slice(0,5000);
      if(!voiceId||!text) throw new Error("ElevenLabs voice generation requires a configured default voice ID and text.");
      response=await fetch("https://api.elevenlabs.io/v1/text-to-speech/"+encodeURIComponent(voiceId)+"?output_format=mp3_44100_128",{method:"POST",headers:{"xi-api-key":env.ELEVENLABS_API_KEY,"Content-Type":"application/json","Accept":"audio/mpeg"},body:JSON.stringify({text,model_id:"eleven_multilingual_v2"})});
    }else if(task==="music"){
      const length=durationOf(options.duration,3,600,30);
      response=await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128",{method:"POST",headers:{"xi-api-key":env.ELEVENLABS_API_KEY,"Content-Type":"application/json","Accept":"audio/mpeg"},body:JSON.stringify({prompt,music_length_ms:Math.round(length*1000),model_id:"music_v2_5",force_instrumental:options.instrumental!==false})});
    }else{
      const length=durationOf(options.duration,0.5,22,5);
      response=await fetch("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128",{method:"POST",headers:{"xi-api-key":env.ELEVENLABS_API_KEY,"Content-Type":"application/json","Accept":"audio/mpeg"},body:JSON.stringify({text:prompt,duration_seconds:length})});
    }
    if(!response.ok) throw new Error("ElevenLabs returned HTTP "+response.status+": "+(await response.text()).slice(0,350));
    const bytes=await response.arrayBuffer(); if(!bytes.byteLength) throw new Error("ElevenLabs returned an empty audio file.");
    const output=await saveOutput(env,job.id,bytes,mime,ext,publicBase);
    return {...job,state:"succeeded",progress:100,message:"Audio generated by ElevenLabs.",output,metadata:{provider:"elevenlabs",task}};
  }
  if(provider==="stable-audio"){
    if(!env.STABILITY_API_KEY){if(env.ELEVENLABS_API_KEY)return generate({...job,provider:"elevenlabs",options:{...options,task:String(options.task||"music")}},env,publicBase).then(result=>({...result,metadata:{...(result.metadata||{}),fallbackFrom:"stable-audio"}}));throw new Error("Stable Audio is not configured on the NEXUS audio worker.");}
    const form=new FormData(); form.set("model","stable-audio-3"); form.set("prompt",prompt); form.set("duration",String(durationOf(options.duration,1,190,20))); form.set("output_format","mp3");
    const response=await fetch("https://api.stability.ai/v2beta/audio/stable-audio/text-to-audio",{method:"POST",headers:{Authorization:"Bearer "+env.STABILITY_API_KEY,Accept:"audio/*"},body:form});
    if(!response.ok){const detail=(await response.text()).slice(0,350);if(env.ELEVENLABS_API_KEY)return generate({...job,provider:"elevenlabs",options:{...options,task:String(options.task||"music")}},env,publicBase).then(result=>({...result,metadata:{...(result.metadata||{}),fallbackFrom:"stable-audio",fallbackReason:"Stable Audio HTTP "+response.status}}));throw new Error("Stable Audio returned HTTP "+response.status+": "+detail);}
    const bytes=await response.arrayBuffer(); if(!bytes.byteLength) throw new Error("Stable Audio returned an empty audio file.");
    const output=await saveOutput(env,job.id,bytes,response.headers.get("Content-Type")||"audio/mpeg","mp3",publicBase);
    return {...job,state:"succeeded",progress:100,message:"Audio generated by Stable Audio.",output,metadata:{provider:"stable-audio",model:"stable-audio-3"}};
  }
  if(provider==="disband") throw new Error("Disband is a stem-separation service. Use the dedicated separation upload route; it does not generate new audio.");
  throw new Error("Unsupported audio provider. Choose elevenlabs, stable-audio or disband.");
}
export default {
  async fetch(request:Request,env:Env,ctx:ExecutionContextLike):Promise<Response>{
    const url=new URL(request.url),path=url.pathname;
    if(request.method==="OPTIONS") return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Authorization,Content-Type","Access-Control-Max-Age":"86400"}});
    if(path==="/health"&&request.method==="GET") return json({ok:true,service:"nexus-audio-router",providers:{elevenlabs:Boolean(env.ELEVENLABS_API_KEY),stableAudio:Boolean(env.STABILITY_API_KEY),disband:Boolean(env.DISBAND_KEY)}});
    if(request.headers.get("Authorization")!=="Bearer "+env.NEXUS_AUDIO_WORKER_TOKEN) return json({error:"Unauthorized"},401);
    if(path==="/separations"&&request.method==="POST"){
      if(!env.DISBAND_KEY) return json({error:"Disband is not configured on the NEXUS audio worker."},503);
      const form=await request.formData().catch(()=>null);
      const file=form?.get("file");
      if(!(file instanceof File)||!file.type.toLowerCase().startsWith("audio/")) return json({error:"Upload one supported audio file using the file field."},400);
      if(file.size<=0||file.size>100*1024*1024) return json({error:"Audio uploads must be between 1 byte and 100 MB."},413);
      const requested=String(form?.get("stems")||"vocals,instrumental").split(",").map(value=>value.trim()).filter(value=>DISBAND_STEMS.has(value));
      const stems=[...new Set(requested)];
      if(!stems.length) return json({error:"Choose at least one supported stem."},400);
      const params=new URLSearchParams(); stems.forEach(stem=>params.append("stems",stem)); params.append("formats","mp3"); params.set("name",file.name.slice(0,120));
      const upstream=await fetch("https://api.disband.io/v1/separations?"+params.toString(),{method:"POST",headers:{Authorization:"Bearer "+env.DISBAND_KEY,"Content-Type":"application/octet-stream",Accept:"application/json"},body:await file.arrayBuffer()});
      const payload=await upstream.json().catch(()=>null) as any;
      if(!upstream.ok||!payload?.id) return json({error:String(payload?.problem?.type||payload?.error||"Disband rejected the audio separation request.").slice(0,400)},upstream.status===402?402:upstream.status>=500?502:400);
      const id=crypto.randomUUID().replace(/-/g,"");
      const job:Job={id,engine:"audio",provider:"disband",state:"queued",progress:0,message:"Audio stem separation accepted by Disband.",createdAt:Date.now(),externalId:String(payload.id),options:{stems},prompt:file.name};
      await env.AUDIO_JOBS.put(id,JSON.stringify(job),{expirationTtl:86400});
      return json(job,202);
    }
    if(path==="/jobs"&&request.method==="POST"){
      const body=await request.json().catch(()=>null) as {engine?:string;prompt?:string;options?:Record<string,unknown>}|null;
      if(!body||body.engine!=="audio"||typeof body.prompt!=="string"||!body.prompt.trim()||body.prompt.length>12000) return json({error:"A valid audio engine prompt is required."},400);
      const options=body.options&&typeof body.options==="object"&&!Array.isArray(body.options)?body.options:{};
      const provider=providerOf(options);
      if(provider==="disband") return json({error:"Disband requires an uploaded source audio file. Use the /separations endpoint."},400);
      if(provider==="elevenlabs"&&!env.ELEVENLABS_API_KEY) return json({error:"ElevenLabs is not configured."},503);
      if(provider==="stable-audio"&&!env.STABILITY_API_KEY&&!env.ELEVENLABS_API_KEY) return json({error:"Stable Audio and ElevenLabs are not configured."},503);
      const id=crypto.randomUUID().replace(/-/g,"");
      let job:Job={id,engine:"audio",provider,state:"queued",progress:0,message:"Audio request accepted by NEXUS Audio Router.",createdAt:Date.now(),options,prompt:body.prompt};
      await env.AUDIO_JOBS.put(id,JSON.stringify(job),{expirationTtl:86400});
      ctx.waitUntil((async()=>{
        let current:Job={...job,state:"running",progress:10,message:"Generating audio with "+provider+"."};
        await env.AUDIO_JOBS.put(id,JSON.stringify(current),{expirationTtl:86400});
        try{current=await generate(current,env,url.origin);}catch(error){current={...current,state:"failed",progress:0,message:"Audio generation failed.",error:error instanceof Error?error.message:"Unknown provider error"};}
        await env.AUDIO_JOBS.put(id,JSON.stringify(current),{expirationTtl:86400});
      })());
      return json(job,202);
    }
    const match=path.match(/^\/jobs\/([a-zA-Z0-9_-]{8,100})$/);
    if(match&&request.method==="GET"){
      let job=await env.AUDIO_JOBS.get(match[1],"json") as Job|null;
      if(!job) return json({error:"Audio job not found or expired."},404);
      if(job.provider==="disband"&&job.state!=="succeeded"&&job.state!=="failed"){
        try{job=await refreshDisbandJob(job,env,url.origin);}catch(error){job={...job,state:"failed",progress:0,message:"Audio stem separation failed.",error:error instanceof Error?error.message:"Disband request failed"};}
        await env.AUDIO_JOBS.put(job.id,JSON.stringify(job),{expirationTtl:86400});
      }
      return json(job);
    }
    const asset=path.match(/^\/assets\/([a-zA-Z0-9_-]{8,100})$/);
    if(asset&&request.method==="GET"){
      const objects=await env.AUDIO_OUTPUTS.list({prefix:"audio/"+asset[1]+"."});
      const item=objects.objects[0]; if(!item)return json({error:"Audio output expired or not found."},404);
      const object=await env.AUDIO_OUTPUTS.get(item.key); if(!object)return json({error:"Audio output not found."},404);
      const headers=new Headers(); object.writeHttpMetadata(headers); headers.set("Cache-Control","private, max-age=3600"); headers.set("Access-Control-Allow-Origin","*"); headers.set("Access-Control-Expose-Headers","Content-Type, Content-Length"); headers.set("Content-Disposition",'attachment; filename="nexus-audio-'+asset[1]+'.mp3"');
      return new Response(object.body,{headers});
    }
    return json({error:"Not found"},404);
  }
};
