import { afterEach, describe, expect, it, vi } from "vitest";
import audioWorker from "../workers/audio/src/index";

class MemoryKV {
  data = new Map<string,string>();
  async put(key:string,value:string){this.data.set(key,value);}
  async get(key:string,type:"json"){const value=this.data.get(key);return value&&type==="json"?JSON.parse(value):null;}
}
class MemoryR2 {
  data = new Map<string,{bytes:ArrayBuffer;mime:string}>();
  async put(key:string,value:ArrayBuffer,options:any){this.data.set(key,{bytes:value,mime:options?.httpMetadata?.contentType||"application/octet-stream"});}
  async list(options:any){return {objects:[...this.data.keys()].filter(key=>key.startsWith(options.prefix)).map(key=>({key}))};}
  async get(key:string){const value=this.data.get(key);if(!value)return null;return {writeHttpMetadata(headers:Headers){headers.set("Content-Type",value.mime);},body:new Response(value.bytes).body!};}
}
function environment(overrides:Record<string,unknown>={}) {
  return {NEXUS_AUDIO_WORKER_TOKEN:"worker-secret",STABILITY_API_KEY:"stability-secret",AUDIO_JOBS:new MemoryKV(),AUDIO_OUTPUTS:new MemoryR2(),...overrides} as any;
}
function context(){const tasks:Promise<unknown>[]=[];return {tasks,waitUntil(promise:Promise<unknown>){tasks.push(promise);}};}

describe("NEXUS Cloudflare audio router",()=>{
  afterEach(()=>vi.unstubAllGlobals());

  it("rejects requests without the server-side worker token",async()=>{
    const response=await audioWorker.fetch(new Request("https://audio.example/jobs",{method:"POST"}),environment(),context() as any);
    expect(response.status).toBe(401);
  });

  it("generates Stable Audio output into R2 and exposes a pollable job",async()=>{
    const fakeFetch=vi.fn(async()=>new Response(new Uint8Array([1,2,3,4]),{status:200,headers:{"Content-Type":"audio/mpeg"}}));
    vi.stubGlobal("fetch",fakeFetch);
    const env=environment(),ctx=context();
    const response=await audioWorker.fetch(new Request("https://audio.example/jobs",{method:"POST",headers:{"Authorization":"Bearer worker-secret","Content-Type":"application/json"},body:JSON.stringify({engine:"audio",prompt:"Warm cinematic background score",options:{provider:"stable-audio",task:"music",duration:12}})}),env,ctx as any);
    expect(response.status).toBe(202);
    const accepted=await response.json() as any;
    expect(accepted.state).toBe("queued");
    await Promise.all(ctx.tasks);
    const poll=await audioWorker.fetch(new Request("https://audio.example/jobs/"+accepted.id,{headers:{"Authorization":"Bearer worker-secret"}}),env,context() as any);
    const completed=await poll.json() as any;
    expect(completed).toMatchObject({state:"succeeded",metadata:{provider:"stable-audio"}});
    expect(completed.output.url).toBe("https://audio.example/assets/"+accepted.id);
    expect(fakeFetch).toHaveBeenCalledOnce();
  });

  it("returns a clear setup error when no generation provider is configured",async()=>{
    const env=environment({STABILITY_API_KEY:undefined,ELEVENLABS_API_KEY:undefined}),ctx=context();
    const response=await audioWorker.fetch(new Request("https://audio.example/jobs",{method:"POST",headers:{"Authorization":"Bearer worker-secret","Content-Type":"application/json"},body:JSON.stringify({engine:"audio",prompt:"A gentle ambient sound",options:{provider:"stable-audio"}})}),env,ctx as any);
    expect(response.status).toBe(503);
  });

  it("submits a source file to Disband and imports returned vocal and instrumental stems",async()=>{
    const fakeFetch=vi.fn(async(input:RequestInfo|URL)=>{
      const url=String(input);
      if(url.includes("/v1/separations?")) return new Response(JSON.stringify({id:"sep_123",status:"queued"}),{status:202,headers:{"Content-Type":"application/json"}});
      if(url.endsWith("/v1/separations/sep_123")) return new Response(JSON.stringify({id:"sep_123",status:"ready",stems:{
        vocals:{mp3:{url:"https://api.disband.io/v1/separations/sep_123/stems/vocals/mp3"}},
        instrumental:{mp3:{url:"https://api.disband.io/v1/separations/sep_123/stems/instrumental/mp3"}}
      }}),{status:200,headers:{"Content-Type":"application/json"}});
      return new Response(new Uint8Array([4,5,6]),{status:200,headers:{"Content-Type":"audio/mpeg"}});
    });
    vi.stubGlobal("fetch",fakeFetch);
    const env=environment({DISBAND_KEY:"disband-secret"}),ctx=context();
    const form=new FormData();
    form.set("file",new File([new Uint8Array([1,2,3])],"song.mp3",{type:"audio/mpeg"}));
    form.set("stems","vocals,instrumental");
    const acceptedResponse=await audioWorker.fetch(new Request("https://audio.example/separations",{method:"POST",headers:{"Authorization":"Bearer worker-secret"},body:form}),env,ctx as any);
    expect(acceptedResponse.status).toBe(202);
    const accepted=await acceptedResponse.json() as any;
    const poll=await audioWorker.fetch(new Request("https://audio.example/jobs/"+accepted.id,{headers:{"Authorization":"Bearer worker-secret"}}),env,context() as any);
    const completed=await poll.json() as any;
    expect(completed).toMatchObject({state:"succeeded",metadata:{provider:"disband"}});
    expect(completed.metadata.stems).toHaveLength(2);
    expect(completed.output.url).toContain("/assets/"+accepted.id+"-vocals");
  });

  it("serves generated audio with cross-origin access for the editor app",async()=>{
    const env=environment(),ctx=context();
    vi.stubGlobal("fetch",vi.fn(async()=>new Response(new Uint8Array([7,8,9]),{status:200,headers:{"Content-Type":"audio/mpeg"}})));
    const acceptedResponse=await audioWorker.fetch(new Request("https://audio.example/jobs",{method:"POST",headers:{"Authorization":"Bearer worker-secret","Content-Type":"application/json"},body:JSON.stringify({engine:"audio",prompt:"Soft ambient texture",options:{provider:"stable-audio"}})}),env,ctx as any);
    const accepted=await acceptedResponse.json() as any;
    await Promise.all(ctx.tasks);
    const asset=await audioWorker.fetch(new Request("https://audio.example/assets/"+accepted.id),env,context() as any);
    expect(asset.status).toBe(200);
    expect(asset.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(asset.headers.get("Content-Type")).toBe("audio/mpeg");
  });
});
