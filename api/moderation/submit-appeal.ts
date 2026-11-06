import {authenticate,cleanError,getConfig,sendJson,supabaseRest} from "../../server/social-api.js";
export default async function handler(req:any,res:any){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return sendJson(res,405,{error:"Method not allowed."});}
 try{
  const cfg=getConfig();if(!cfg.supabaseUrl||!cfg.anonKey||!cfg.serviceKey)return sendJson(res,503,{error:"Appeals are not configured."});
  const user=await authenticate(req);if(!user)return sendJson(res,401,{error:"Sign in to submit an appeal."});
  const body=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});
  const type=String(body.targetType||"");const id=String(body.targetId||"");const explanation=String(body.explanation||"").trim().slice(0,2000);
  if(!["post","comment"].includes(type)||!/^[0-9a-f-]{36}$/i.test(id)||explanation.length<10)return sendJson(res,400,{error:"Choose your moderated post or comment and explain the appeal in at least 10 characters."});
  const rows=await supabaseRest((type==="post"?"posts":"comments")+"?select=id,author_id,status&id=eq."+encodeURIComponent(id));
  const target=rows?.[0];if(!target||target.author_id!==user.id||!(type==="post"?["blocked","removed"].includes(target.status):["hidden","removed"].includes(target.status)))return sendJson(res,403,{error:"You can only appeal content you own that has been restricted."});
  const prior=await supabaseRest("moderation_appeals?select=id&appellant_id=eq."+encodeURIComponent(user.id)+"&target_type=eq."+type+"&target_id=eq."+encodeURIComponent(id)+"&status=in.(open,reviewing)");
  if(prior?.length)return sendJson(res,409,{error:"An appeal for this item is already being reviewed."});
  const result=await supabaseRest("moderation_appeals",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{appellant_id:user.id,target_type:type,target_id:id,explanation}])});
  return sendJson(res,201,{appeal:result?.[0]||null});
 }catch(e){return sendJson(res,500,{error:cleanError(e)});}
}
