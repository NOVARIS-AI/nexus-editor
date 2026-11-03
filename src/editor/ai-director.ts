export type DirectorScene = { title:string; visual:string; duration:number; narration:string; searchTerms:string[]; assetMatches?:string[]; matchReason?:string; overlayText?:string; referenceStart?:number; referenceEnd?:number; transitionStyle?:"fade"|"zoom"|"wipe"|"slide"|"blur"|"none"; transitionDuration?:number; textPlacement?:{x:number;y:number;align?:"left"|"center"|"right"}; textAnimation?:"none"|"fade"|"pop"; audioCueTime?:number; audioSourceIn?:number; audioGain?:number; audioFadeIn?:number; audioFadeOut?:number; confidence?:"high"|"medium"|"low" };
export type DirectorPlan = { summary:string; scenes:DirectorScene[]; editPlan:{action:string;target:string;details:string}[]; assetNeeds:{kind:string;query:string;reason:string}[]; userReferenceNeeded:boolean };
export async function askNexusDirector(brief:string,context:Record<string,unknown>,signal?:AbortSignal):Promise<{plan:DirectorPlan;model:string;provider:string}> {
 const response=await fetch("/api/ai-director",{method:"POST",signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({brief,context})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok) throw new Error(data.error||"NEXUS AI Director is unavailable.");
 return data;
}
