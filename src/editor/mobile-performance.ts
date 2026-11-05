export function getMobilePerformanceProfile(device:{hardwareConcurrency?:number;deviceMemory?:number}){
 const cores=Math.max(1,device.hardwareConcurrency||2),memoryGb=device.deviceMemory,compact=(memoryGb!==undefined&&memoryGb<=4)||cores<=4,power=memoryGb!==undefined&&memoryGb>=8&&cores>=8;
 return {tier:compact?"compact":power?"power":"balanced",cores,memoryGb,recommendedPreviewFps:compact?24:30,recommendedExport:compact?"720p":"1080p",maxConcurrentAnalyses:compact?1:power?3:2,maxSemanticSamples:compact?2:power?8:4};
}