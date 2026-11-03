export interface NativeMediaResult { fileUri: string; fileName?: string; mimeType?: string }
export interface BackgroundCopyResult { jobId: string }
export interface BackgroundCopyStatus { state: string; progress: number; fileUri?: string; error?: string }
export interface NexusNativeEnginePlugin {
 extractAudio(options:{sourceUri:string;startSeconds:number;endSeconds:number}):Promise<NativeMediaResult>;
 transcodeVideo(options:{sourceUri:string}):Promise<NativeMediaResult>;
 cancelNativeExport():Promise<void>;
 enqueueAudioExtraction(options:{sourceUri:string;startSeconds:number;endSeconds:number}):Promise<BackgroundCopyResult>;
 enqueueBackgroundCopy(options:{sourceUri:string;outputName?:string}):Promise<BackgroundCopyResult>;
 getBackgroundCopyStatus(options:{jobId:string}):Promise<BackgroundCopyStatus>;
}
