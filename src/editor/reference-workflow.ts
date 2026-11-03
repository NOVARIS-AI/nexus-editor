export type ReferenceAssetLike = { id: string; name: string; kind: string; duration?: number };
export type ReferenceAnalysisLike = {
  assetId: string; notes?: string[]; duration?: number;
  visual?: { sampledFrames?: number; sceneChanges?: number[]; averageLuminance?: number };
  audio?: { rms?: number; silenceRatio?: number; beatCandidates?: number[] };
};
export type ReferenceRole = "reference video" | "replacement image" | "replacement video" | "audio source" | "project media";
export type ReferenceAssetContext = { id: string; name: string; kind: string; role: ReferenceRole; duration?: number; analysis?: string[] };
export function detectReferenceWorkflow(input: string): { useReference: boolean; extractAudio: boolean } {
  const value = input.toLowerCase();
  const extractAudio = /\b(extract|separate|pull|get|take)\b.{0,45}\b(audio|sound|music)\b|\b(audio|sound)\b.{0,45}\b(from|inside|in)\b.{0,25}\b(this|the|it)\b.{0,20}\b(video|clip)?\b|\b(audio|sound)\b.{0,20}\bin it\b/.test(value);
  const useReference = /\b(reference|template|like this|same style|recreate|recreate this|match this|based on this|use this video|use this picture|use this photo|look at this|look at this picture|look at this video|this is the template|that video is the template|use this as a template|use this as reference|replace the person|replace it with|with this picture|with this image|analyse this image|analyze this image|analyse this video|analyze this video)\b/.test(value);
  return { useReference, extractAudio };
}
export function buildReferenceContext(assets: ReferenceAssetLike[], analyses: ReferenceAnalysisLike[]): ReferenceAssetContext[] {
  const videos = assets.filter(item => item.kind === "video");
  const images = assets.filter(item => item.kind === "image");
  const roleFor = (asset: ReferenceAssetLike): ReferenceRole => {
    if (asset.kind === "audio") return "audio source";
    if (asset.kind === "image") return "replacement image";
    if (asset.kind === "video" && videos.length > 1) return videos[0].id === asset.id ? "reference video" : "replacement video";
    if (asset.kind === "video" && images.length) return "reference video";
    if (asset.kind === "video") return "replacement video";
    return "project media";
  };
  return assets.slice(0, 30).map(asset => {
    const analysis = analyses.find(item => item.assetId === asset.id);
    const notes = [
      ...(analysis?.notes || []),
      ...(analysis?.visual ? ["Visual metadata only: " + (analysis.visual.sampledFrames || 0) + " sampled frames; " + (analysis.visual.sceneChanges?.length || 0) + " brightness-change candidates; average luminance " + Math.round((analysis.visual.averageLuminance || 0) * 100) + "%"] : []),
      ...(analysis?.audio ? ["Audio metadata: estimated silence " + Math.round((analysis.audio.silenceRatio || 0) * 100) + "%; " + (analysis.audio.beatCandidates?.length || 0) + " transient candidates"] : [])
    ].slice(0, 8);
    return { id: asset.id, name: asset.name.slice(0, 180), kind: asset.kind, role: roleFor(asset), ...(Number.isFinite(asset.duration) ? { duration: asset.duration } : {}), ...(notes.length ? { analysis: notes } : {}) };
  });
}
