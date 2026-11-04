import type { MediaAsset } from "../types";
import type { ReferenceAssetContext } from "./reference-workflow";
type SceneLike = { title?: string; visual?: string; searchTerms?: string[]; assetMatches?: string[]; matchReason?: string };
export type SceneAssetMatch = { asset: MediaAsset; score: number; confidence: "high" | "medium" | "low"; reason: string };
const STOP = new Set(["this","that","with","from","into","over","under","shot","scene","video","image","photo","clip","visual","make","show","then","there","their","your","about","using","near","wide","close","camera","style","same","reference","replacement"]);
function tokens(value: string): string[] {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").split(/[^a-z0-9]+/).filter(word=>word.length>2&&!STOP.has(word));
}
function overlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const set = new Set(b);
  return a.filter(word=>set.has(word)).length / Math.sqrt(Math.max(1,a.length)*Math.max(1,b.length));
}
export function rankSceneAssets(scene: SceneLike, assets: MediaAsset[], context: ReferenceAssetContext[] = [], usage = new Map<string,number>()): SceneAssetMatch[] {
  const sceneWords = tokens([scene.title,scene.visual,...(scene.searchTerms||[])].filter(Boolean).join(" "));
  const preferred = (scene.assetMatches||[]).map(name=>name.trim().toLowerCase()).filter(Boolean);
  return assets.map(asset=>{
    const exact = preferred.some(name=>name===asset.name.toLowerCase());
    const partial = preferred.some(name=>asset.name.toLowerCase().includes(name)||name.includes(asset.name.toLowerCase()));
    const semantic = overlap(sceneWords,tokens(asset.name));
    const role = context.find(item=>item.id===asset.id)?.role;
    const repetitionPenalty = (usage.get(asset.id)||0)*0.32;
    const score = (exact?1.2:partial?0.72:0) + semantic*0.58 + (asset.kind==="image"?0.04:0) + (role==="replacement image"||role==="replacement video"?0.05:0) - repetitionPenalty;
    const reason = exact ? "AI Director selected this exact uploaded filename." : partial ? "AI Director suggested a matching filename." : semantic>0.05 ? "Filename shares topic words with the scene description." : "No strong filename or AI filename match; verify this choice.";
    return {asset,score,confidence:(exact||partial||semantic>=0.34?"high":semantic>=0.12?"medium":"low") as "high" | "medium" | "low",reason};
  }).sort((a,b)=>b.score-a.score);
}
