import { requireModerator,cleanError,sendJson,supabaseRest } from "../../server/moderation-api.js";
export default async function handler(req:any,res:any){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return sendJson(res,405,{error:"Method not allowed."});}
 try{
  const access=await requireModerator(req,res);if(!access)return;
  const body=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});
  const id=String(body.reportId||"");const status=String(body.status||"");const note=String(body.note||"").trim().slice(0,1000);
  if(!/^[0-9a-f-]{36}$/i.test(id)||!["reviewing","actioned","dismissed"].includes(status))return sendJson(res,400,{error:"Choose a valid report and review action."});
  const current=await supabaseRest("reports?select=id,target_type,target_id,status&id=eq."+encodeURIComponent(id));
  const report=current?.[0];if(!report)return sendJson(res,404,{error:"Report not found."});
  await supabaseRest("reports?id=eq."+encodeURIComponent(id),{method:"PATCH",body:JSON.stringify({status})});
  await supabaseRest("moderation_events",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify([{actor_id:access.user.id,target_type:report.target_type,target_id:report.target_id,action:status,reason:note,metadata:{report_id:id}}])});
  return sendJson(res,200,{ok:true,status});
 }catch(e){return sendJson(res,500,{error:cleanError(e)});}
}
