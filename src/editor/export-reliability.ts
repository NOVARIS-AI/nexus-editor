import {getNexusDeviceProfile} from "./device-profile";

export type ExportRequest={width:number;height:number;fps:number;duration:number;clipCount:number;hasVisual:boolean;hasAudio:boolean};

export function inspectExportRequest(r:ExportRequest){
  const errors:string[]=[],warnings:string[]=[],device=getNexusDeviceProfile();
  const validDimensions=Number.isSafeInteger(r.width)&&Number.isSafeInteger(r.height)&&r.width>=160&&r.height>=160;
  if(r.hasVisual!==true)errors.push("Add visible project content before exporting.");
  if(!Number.isInteger(r.clipCount)||r.clipCount<0)errors.push("The project contains an invalid clip count.");
  if(!validDimensions)errors.push("Export dimensions are invalid.");
  if(!Number.isInteger(r.fps)||r.fps<12||r.fps>60)errors.push("Choose a frame rate between 12 and 60 FPS.");
  if(!Number.isFinite(r.duration)||r.duration<=0||r.duration>1800)errors.push("Export duration must be between 0 and 30 minutes.");
  if(validDimensions&&r.width*r.height>device.maxRenderPixels)errors.push("The selected resolution exceeds this device's recommended render pixel budget ("+device.maxRenderPixels.toLocaleString()+").");
  if(device.tier==="mobile-efficient"&&Number.isFinite(r.duration)&&r.duration>90)warnings.push("This device profile is memory-constrained. Export in sections of 90 seconds or less where possible.");
  if(validDimensions&&r.width*r.height>2_500_000&&r.duration>60)warnings.push("High-resolution long exports can use substantial memory. Try a short test export first.");
  if(r.fps===60&&device.tier==="mobile-efficient")warnings.push("60 FPS increases render workload on this device. 30 FPS is a safer starting point.");
  if(r.hasAudio!==true)warnings.push("No audio track is included. Confirm that silent output is intentional.");
  return{ok:errors.length===0,errors,warnings,suggestedQuality:device.preferredQuality};
}

export function validateExportBlob(blob:Blob,maxBytes=1_500_000_000){
  if(!Number.isFinite(maxBytes)||maxBytes<=0)throw new Error("The export size limit is invalid.");
  const type=(blob.type||"").split(";")[0].toLowerCase();
  if(!["video/mp4","video/webm"].includes(type))throw new Error("The renderer returned an unsupported video format.");
  if(!blob.size)throw new Error("The renderer returned an empty video file.");
  if(blob.size>maxBytes)throw new Error("The rendered video exceeds the safe "+(maxBytes/1_000_000_000).toFixed(2)+" GB browser export limit. Export shorter sections.");
  return{mimeType:type,extension:type==="video/mp4"?"mp4":"webm",bytes:blob.size};
}

export function makeExportFilename(name:string,extension:string){
  const safe=(name||"nexus-video").normalize("NFKD").replace(/[^a-z0-9-_]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,90)||"nexus-video";
  const ext=(extension||"mp4").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,8)||"mp4";
  return safe+"."+ext;
}

export function classifyExportFailure(error:unknown){
  const message=error instanceof Error?error.message:String(error||"Unknown export error");
  if(/cancel|abort/i.test(message))return{code:"cancelled",message:"Export cancelled. Your project and source media are unchanged."};
  if(/memory|pixel|resolution|large|size limit/i.test(message))return{code:"resource-limit",message:message+" Try 720p, 30 FPS or a shorter section."};
  if(/decode|media|seek|source video|source audio/i.test(message))return{code:"media-decode",message:message+" Re-import the affected file or try a browser-compatible format."};
  if(/recorder|recording|canvas|format|MP4|WebM/i.test(message))return{code:"renderer",message:message+" Try an updated Chrome browser or a shorter section."};
  return{code:"unknown",message:message+" The original project has not been modified."};
}
