export type ReferenceAssetLike = { id: string; name: string; kind: string; duration?: number };
export type ReferenceAnalysisLike = {
  assetId: string; notes?: string[]; duration?: number;
  visual?: { sampledFrames?: number; sceneChanges?: number[]; averageLuminance?: number };
  audio?: { rms?: number; silenceRatio?: number; beatCandidates?: number[] };
};
export type ReferenceRole = "style reference" | "structure reference" | "content reference" | "replacement image" | "replacement video" | "audio source" | "script or document" | "project media";
export type ReferenceAssetContext = {
  id: string; name: string; kind: string; role: ReferenceRole; duration?: number;
  analysis?: string[]; evidenceAvailable?: string[]; limitations?: string[];
};
export type ReferenceFusion = {
  strategy: string;
  referenceCount: number;
  assignments: Array<{ assetId: string; name: string; role: ReferenceRole; contributes: string[]; mustNotCopy: string[] }>;
  synthesisRules: string[];
  unresolvedChoices: string[];
};

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].slice(0, 12);
const isDocument = (asset: ReferenceAssetLike) => /\.(txt|md|csv|json|ya?ml|xml|html?|pdf|docx?)$/i.test(asset.name) || /document|text|script/i.test(asset.kind);
const hasAny = (brief: string, pattern: RegExp) => pattern.test(brief.toLowerCase());

export function detectReferenceWorkflow(input: string): { useReference: boolean; extractAudio: boolean } {
  const value = input.toLowerCase();
  const extractAudio = /\b(extract|separate|pull|get|take)\b.{0,45}\b(audio|sound|music)\b|\b(audio|sound)\b.{0,45}\b(from|inside|in)\b.{0,25}\b(this|the|it)\b.{0,20}\b(video|clip)?\b|\b(audio|sound)\b.{0,20}\bin it\b/.test(value);
  const useReference = /\b(reference|template|like this|same style|recreate|match this|based on this|use this video|use this picture|use this photo|look at this|this is the template|use this as a template|use this as reference|replace the person|replace it with|with this picture|with this image|analyse this image|analyze this image|analyse this video|analyze this video|first reference|second reference|combine these|mix these references)\b/.test(value);
  return { useReference, extractAudio };
}

export function buildReferenceContext(assets: ReferenceAssetLike[], analyses: ReferenceAnalysisLike[], brief = ""): ReferenceAssetContext[] {
  const videos = assets.filter(item => item.kind === "video");
  const images = assets.filter(item => item.kind === "image");
  const documents = assets.filter(isDocument);
  const explicitStyle = hasAny(brief, /style|look|colour|color|aesthetic|visual language/);
  const explicitStructure = hasAny(brief, /structure|sequence|shot order|pacing|edit pattern|recreate|match the edit/);
  const explicitReplacement = hasAny(brief, /replace|swap|substitute|use .* instead|put .* in place/);
  return assets.slice(0, 30).map((asset, index) => {
    const analysis = analyses.find(item => item.assetId === asset.id);
    const role: ReferenceRole = isDocument(asset) ? "script or document"
      : asset.kind === "audio" ? "audio source"
      : explicitReplacement && asset.kind === "image" ? "replacement image"
      : explicitReplacement && asset.kind === "video" ? "replacement video"
      : asset.kind === "video" && (explicitStructure || videos.length > 1) ? "structure reference"
      : asset.kind === "image" && explicitStyle ? "style reference"
      : asset.kind === "image" ? "content reference"
      : asset.kind === "video" ? "content reference" : "project media";
    const evidenceAvailable = unique([
      ...(asset.kind === "video" ? ["Video metadata", ...(analysis?.visual?.sampledFrames ? ["Sparse sampled frames"] : [])] : []),
      ...(asset.kind === "image" ? ["Image file available", "Visual pixels may be inspected when decoding succeeds"] : []),
      ...(asset.kind === "audio" ? ["Audio file metadata", ...(analysis?.audio ? ["Basic audio measurements"] : [])] : []),
      ...(isDocument(asset) ? ["Filename and extension only unless extracted text is separately supplied"] : []),
      ...(analysis?.notes?.length ? ["Existing local analysis notes"] : [])
    ]);
    const limitations = unique([
      ...(asset.kind === "video" ? ["Sparse samples cannot verify every cut, action or exact motion path"] : []),
      ...(asset.kind === "audio" ? ["No semantic music or speech understanding unless a transcript or dedicated analysis is supplied"] : []),
      ...(isDocument(asset) ? ["Document contents are not inferred from the filename"] : []),
      ...(!analysis && asset.kind !== "image" ? ["No detailed local analysis is available for this asset"] : [])
    ]);
    const notes = [
      ...(analysis?.notes || []),
      ...(analysis?.visual ? ["Visual metadata only: " + (analysis.visual.sampledFrames || 0) + " sampled frames; " + (analysis.visual.sceneChanges?.length || 0) + " brightness-change candidates; average luminance " + Math.round((analysis.visual.averageLuminance || 0) * 100) + "%"] : []),
      ...(analysis?.audio ? ["Audio metadata: estimated silence " + Math.round((analysis.audio.silenceRatio || 0) * 100) + "%; " + (analysis.audio.beatCandidates?.length || 0) + " transient candidates"] : [])
    ].slice(0, 8);
    return { id: asset.id, name: asset.name.slice(0, 180), kind: asset.kind, role, ...(Number.isFinite(asset.duration) ? { duration: asset.duration } : {}), ...(notes.length ? { analysis: notes } : {}), evidenceAvailable, limitations };
  });
}

export function buildReferenceFusion(references: ReferenceAssetContext[], brief = ""): ReferenceFusion {
  const assignments = references.slice(0, 30).map((reference, index) => {
    const contributes = reference.role === "style reference" ? ["Palette, lighting, typography and visual treatment where visible"]
      : reference.role === "structure reference" ? ["Shot order, pacing and framing only where sampled evidence supports it"]
      : reference.role === "replacement image" || reference.role === "replacement video" ? ["The replacement subject or source content requested by the user"]
      : reference.role === "audio source" ? ["Audio placement; transcript meaning only if transcript evidence is supplied"]
      : reference.role === "script or document" ? ["Written content only when extracted text is supplied"]
      : ["Relevant source content without assuming it is a style template"];
    const mustNotCopy = reference.role === "replacement image" || reference.role === "replacement video"
      ? ["Do not copy unrelated style or composition unless explicitly requested"]
      : reference.role === "style reference" ? ["Do not copy its subjects, logos or wording as new content unless requested"]
      : ["Do not invent unseen details or treat file metadata as content"];
    return { assetId: reference.id, name: reference.name, role: reference.role, contributes, mustNotCopy };
  });
  const unresolvedChoices = unique([
    ...(references.length > 1 && !hasAny(brief, /combine|mix|blend|merge|use .* from|take .* from/ ) ? ["The user has not explicitly said whether all references should be blended or kept in separate roles."] : []),
    ...(references.some(item => item.role === "script or document") ? ["Document text must be extracted before its meaning can guide scenes."] : []),
    ...(references.some(item => item.role === "audio source") ? ["Audio meaning remains unknown unless transcript evidence is available."] : []),
    ...(references.some(item => item.limitations?.length) ? ["Some reference conclusions are limited by the available evidence."] : [])
  ]);
  return {
    strategy: references.length > 1 ? "Role-separated multi-reference fusion: combine only compatible evidence, preserve each source's assigned purpose, and resolve conflicts in favour of the user's brief." : references.length === 1 ? "Single-reference interpretation: use only the assigned role and supported evidence." : "No attached project references; follow the user's brief and project DNA.",
    referenceCount: references.length,
    assignments,
    synthesisRules: [
      "Build one coherent creative direction rather than averaging every reference indiscriminately.",
      "Keep style, structure, content, replacement media, audio and written source material in separate lanes.",
      "When references conflict, follow the direct user brief first, then explicit role assignments, then strongest available evidence.",
      "Map every proposed visual or edit decision to its source reference name and mark inferred choices as provisional.",
      "Never claim exact visual, audio or document understanding beyond supplied evidence."
    ],
    unresolvedChoices
  };
}
