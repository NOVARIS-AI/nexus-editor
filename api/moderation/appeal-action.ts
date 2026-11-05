import {requireModerator,cleanError,sendJson,supabaseRest} from "../../server/moderation-api";
export default async function handler(req:any,res:any){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return sendJson(res,405,{error:"Method not allowed."});}
 try{
  const access=await requireModerator(req,res);if(!access)return;
  const body=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});const id=String(body.appealId||"");const decision=String(body.decision||"");const note=String(body.note||"").trim().slice(0,1000);
  if(!/^[0-9a-f-]{36}$/i.test(id)||!["upheld","reversed"].includes(decision))return sendJson(res,400,{error:"Choose a valid appeal decision."});
  const rows=await supabaseRest("moderation_appeals?select=id,target_type,target_id,appellant_id,status&id=eq."+encodeURIComponent(id));const appeal=rows?.[0];if(!appeal)return sendJson(res,404,{error:"Appeal not found."});if(!["open","reviewing"].includes(appeal.status))return sendJson(res,409,{error:"This appeal has already been decided."});
  if(decision==="reversed"){
   if(appeal.target_type==="post"){
    await supabaseRest("posts?id=eq."+encodeURIComponent(appeal.target_id)+"&author_id=eq."+encodeURIComponent(appeal.appellant_id),{method:"PATCH",body:JSON.stringify({status:"ready",moderation_state:"approved"})});
    const posts=await supabaseRest("posts?select=media_asset_id&id=eq."+encodeURIComponent(appeal.target_id));const asset=posts?.[0]?.media_asset_id;if(asset)await supabaseRest("media_assets?id=eq."+encodeURIComponent(asset)+"&owner_id=eq."+encodeURIComponent(appeal.appellant_id),{method:"PATCH",body:JSON.stringify({upload_state:"ready"})});
   }else await supabaseRest("comments?id=eq."+encodeURIComponent(appeal.target_id)+"&author_id=eq."+encodeURIComponent(appeal.appellant_id),{method:"PATCH",body:JSON.stringify({status:"visible"})});
  }
  await supabaseRest("moderation_appeals?id=eq."+encodeURIComponent(id),{method:"PATCH",body:JSON.stringify({status:decision,reviewer_id:access.user.id,reviewer_note:note,reviewed_at:new Date().toISOString()})});
  await supabaseRest("moderation_events",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify([{actor_id:access.user.id,target_type:appeal.target_type,target_id:appeal.target_id,action:"appeal_"+decision,reason:note,metadata:{appeal_id:id}}])});
  return sendJson(res,200,{ok:true,status:decision});
 }catch(e){return sendJson(res,500,{error:cleanError(e)});}
}
