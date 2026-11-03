import type { MediaAsset, TimelineClip, ClipKeyframe } from "../types";
import { clipDuration } from "../project";
type FaceBox = { boundingBox: { x:number; y:number; width:number; height:number } };
type DetectorLike = { detect(source:HTMLVideoElement):Promise<FaceBox[]> };
type DetectorConstructor = new (options?:{fastMode?:boolean;maxDetectedFaces?:number})=>DetectorLike;
function seekFrame(video:HTMLVideoElement) {
 return new Promise<void>((resolve,reject)=>{
  const timer=window.setTimeout(()=>{cleanup();reject(new Error("Frame seek timed out. Try a shorter clip."));},5000);
  const cleanup=()=>{window.clearTimeout(timer);video.removeEventListener("seeked",done);video.removeEventListener("error",failed);};
  const done=()=>{cleanup();resolve();}, failed=()=>{cleanup();reject(new Error("The video frame could not be decoded."));};
  video.addEventListener("seeked",done,{once:true});video.addEventListener("error",failed,{once:true});
 });
}
export async function detectSubjectKeyframes(asset:MediaAsset,clip:TimelineClip,mode:"reframe"|"track"):Promise<ClipKeyframe[]> {
 const Detector=(window as unknown as {FaceDetector?:DetectorConstructor}).FaceDetector;
 if(!Detector) throw new Error("Face Detection is not available in this browser yet. Try a supported Chrome browser or use manual motion keyframes.");
 const video=document.createElement("video");video.src=asset.objectUrl||"";video.muted=true;video.playsInline=true;video.preload="auto";
 try {
  await new Promise<void>((resolve,reject)=>{
   const timer=window.setTimeout(()=>reject(new Error("Video metadata loading timed out.")),10000);
   video.onloadedmetadata=()=>{window.clearTimeout(timer);resolve();};
   video.onerror=()=>{window.clearTimeout(timer);reject(new Error("The selected video could not be opened for subject analysis."));};
  });
  const detector=new Detector({fastMode:true,maxDetectedFaces:5});
  const span=Math.max(.1,clip.sourceOut-clip.sourceIn),length=Math.max(.1,clipDuration(clip)),frames:ClipKeyframe[]=[];
  for(let i=0;i<8;i++){
   const progress=i/7,sourceTime=Math.min(clip.sourceOut-.03,clip.sourceIn+span*progress);
   if(Math.abs(video.currentTime-sourceTime)>.01){const pending=seekFrame(video);video.currentTime=sourceTime;await pending;}
   const faces=await detector.detect(video);
   const face=faces.sort((a,b)=>b.boundingBox.width*b.boundingBox.height-a.boundingBox.width*a.boundingBox.height)[0];
   if(!face) continue;
   const box=face.boundingBox,cx=(box.x+box.width/2)/Math.max(1,video.videoWidth),cy=(box.y+box.height/2)/Math.max(1,video.videoHeight);
   const zoom=mode==="reframe"?Math.max(100,Math.min(180,Math.round(.28/Math.max(.08,box.width/video.videoWidth)*100))):(clip.zoom??100);
   frames.push({time:length*progress,zoom,rotation:clip.rotation??0,offsetX:Math.max(-45,Math.min(45,(.5-cx)*100)),offsetY:Math.max(-45,Math.min(45,(.5-cy)*100)),opacity:clip.opacity??1,easing:"ease-in-out"});
  }
  if(frames.length<2) throw new Error("A clear face could not be detected in enough frames. Improve the lighting or choose a clip with a visible face.");
  return frames;
 } finally {video.pause();video.removeAttribute("src");video.load();}
}