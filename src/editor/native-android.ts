import { Capacitor, registerPlugin } from "@capacitor/core";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

type NativeEngine = {
 extractAudio(o:{sourceUri:string;startSeconds:number;endSeconds:number}):Promise<{fileUri:string;fileName:string;mimeType:string}>;
 transcodeVideo(o:{sourceUri:string}):Promise<{fileUri:string;fileName:string;mimeType:string}>;
 cancelNativeExport():Promise<void>;
 enqueueBackgroundCopy(o:{sourceUri:string;outputName?:string}):Promise<{jobId:string}>;
 getBackgroundCopyStatus(o:{jobId:string}):Promise<{state:string;progress:number;fileUri?:string;error?:string}>;
};
const NativeEngine = registerPlugin<NativeEngine>("NexusNativeEngine");
type NativeFile = File & { __nexusNativeUri?: string };
export function isNativeAndroid():boolean{return Capacitor.isNativePlatform()&&Capacitor.getPlatform()==="android";}
export async function pickNativeMediaFiles(types:string[]):Promise<File[]>{
 if(!isNativeAndroid())throw new Error("The native Android picker is only available inside the APK.");
 const result=await FilePicker.pickFiles({types,readData:false});const picked:File[]=[];
 for(const item of result.files){const source=item.path;if(!source)continue;const response=await fetch(Capacitor.convertFileSrc(source));if(!response.ok)throw new Error("Android could not open "+item.name+". Try choosing it again.");const blob=await response.blob();const file=new File([blob],item.name||"nexus-media",{type:item.mimeType||blob.type||"application/octet-stream",lastModified:Date.now()}) as NativeFile;file.__nexusNativeUri=item.path;picked.push(file);}
 if(!picked.length&&result.files.length)throw new Error("Android selected the files but could not expose them to the editor. Please try another file location.");return picked;
}
function requireNativeUri(file:File):string{const uri=(file as NativeFile).__nexusNativeUri;if(!uri)throw new Error("Re-import this media through the APK's Android picker to use the native engine.");return uri;}
async function readNativeOutput(uri:string,name:string,mime:string):Promise<File>{const response=await fetch(Capacitor.convertFileSrc(uri));if(!response.ok)throw new Error("Android created the output but the editor could not reopen it.");return new File([await response.blob()],name,{type:mime,lastModified:Date.now()});}
export async function extractAudioNative(file:File,startSeconds:number,endSeconds:number):Promise<File>{if(!isNativeAndroid())throw new Error("Native audio extraction is available only inside the APK.");const out=await NativeEngine.extractAudio({sourceUri:requireNativeUri(file),startSeconds,endSeconds});return readNativeOutput(out.fileUri,file.name.replace(/\.[^.]+$/,"")+"-audio.m4a","audio/mp4");}
export async function transcodeNativeVideo(file:File):Promise<File>{if(!isNativeAndroid())throw new Error("Media3 rendering is available only inside the APK.");const out=await NativeEngine.transcodeVideo({sourceUri:requireNativeUri(file)});return readNativeOutput(out.fileUri,out.fileName||"nexus-render.mp4","video/mp4");}
export async function enqueueBackgroundNativeCopy(file:File,outputName:string):Promise<string>{const out=await NativeEngine.enqueueBackgroundCopy({sourceUri:requireNativeUri(file),outputName});return out.jobId;}
export async function getBackgroundNativeCopyStatus(jobId:string){return NativeEngine.getBackgroundCopyStatus({jobId});}
function blobToBase64(blob:Blob):Promise<string>{return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error("The export could not be prepared for Android storage."));reader.onload=()=>{const value=String(reader.result||""),comma=value.indexOf(",");if(comma<0)reject(new Error("The export data could not be encoded."));else resolve(value.slice(comma+1));};reader.readAsDataURL(blob);});}
export async function saveExportOnAndroid(blob:Blob,filename:string):Promise<string>{if(!isNativeAndroid())throw new Error("Android export storage is unavailable outside the APK.");if(blob.size>180*1024*1024)throw new Error("This export is too large for the safe Android file-save path on this device. Export a shorter section or lower the resolution.");const safe=filename.replace(/[^a-z0-9._-]/gi,"-").slice(0,120)||"nexus-export.mp4";const saved=await Filesystem.writeFile({path:"NEXUS Exports/"+safe,directory:Directory.Documents,recursive:true,data:await blobToBase64(blob)});try{await Share.share({title:"NEXUS Studio export",text:"Your edited video is ready.",url:saved.uri,dialogTitle:"Share or save your NEXUS export"});}catch{}return saved.uri;}
