import {requireModerator,cleanError,sendJson,supabaseRest} from "../../server/moderation-api";
export default async function handler(req:any,res:any){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return sendJson(res,405,{error:"Method not allowed."});}
 try{
  const access=await requireModerator(req,res);if(!access)return;
  const body=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});const reportId=String(body.reportId||"");const decision=String(body.decision||"");const note=String(body.note||"").trim().slice(0,1000);
  if(!/^[0-9a-f-]{36}$/i.test(reportId)||!["remove_content","dismiss"].includes(decision))return sendJson(res,400,{error:"Choose a valid report decision."});
  const rows=await supabaseRest("reports?select=id,target_type,target_id,status&id=eq."+encodeURIComponent(reportId));const report=rows?.[0];if(!report)return sendJson(res,404,{error:"Report not found."});
  if(decision==="remove_content"){
   if(report.target_type==="post"){
    const posts=await supabaseRest("posts?select=id,author_id,media_asset_id&id=eq."+encodeURIComponent(report.target_id));const post=posts?.[0];if(!post)return sendJson(res,404,{error:"Post not found."});
    await supabaseRest("posts?id=eq."+encodeURIComponent(post.id),{method:"PATCH",body:JSON.stringify({status:"blocked",moderation_state:"rejected"})});
    if(post.media_asset_id)await supabaseRest("media_assets?id=eq."+encodeURIComponent(post.media_asset_id),{method:"PATCH",body:JSON.stringify({upload_state:"blocked"})});
   }else if(report.target_type==="comment"){
    await supabaseRest("comments?id=eq."+encodeURIComponent(report.target_id),{method:"PATCH",body:JSON.stringify({status:"hidden"})});
   }else return sendJson(res,409,{error:"Profile-level restrictions require a separate account review process."});
  }
  await supabaseRest("reports?id=eq."+encodeURIComponent(reportId),{method:"PATCH",body:JSON.stringify({status:decision==="dismiss"?"dismissed":"actioned"})});
  await supabaseRest("moderation_events",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify([{actor_id:access.user.id,target_type:report.target_type,target_id:report.target_id,action:decision,reason:note,metadata:{report_id:reportId}}])});
  return sendJson(res,200,{ok:true,decision});
 }catch(e){return sendJson(res,500,{error:cleanError(e)});}
}
