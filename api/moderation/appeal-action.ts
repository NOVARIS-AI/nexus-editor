import {requireModerator,cleanError,sendJson,supabaseRest} from "../../server/moderation-api.js";

export default async function handler(req:any,res:any){
  if(req.method!=="POST"){res.setHeader("Allow","POST");return sendJson(res,405,{error:"Method not allowed."});}
  try{
    const access=await requireModerator(req,res);
    if(!access)return;
    const body=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});
    const appealId=String(body.appealId||"");
    const decision=String(body.decision||"");
    const note=String(body.note||"").trim().slice(0,1000);
    if(!/^[0-9a-f-]{36}$/i.test(appealId)||!["upheld","reversed"].includes(decision)){
      return sendJson(res,400,{error:"Choose a valid appeal decision."});
    }
    const result=await supabaseRest("rpc/nexus_decide_moderation_appeal",{
      method:"POST",
      body:JSON.stringify({p_appeal_id:appealId,p_actor_id:access.user.id,p_decision:decision,p_note:note})
    });
    return sendJson(res,200,result||{ok:true,status:decision});
  }catch(e){
    const message=cleanError(e);
    const status=/not found|no longer exists/i.test(message)?404:/already been decided|invalid appeal decision|could not be restored/i.test(message)?409:/moderator permission/i.test(message)?403:500;
    return sendJson(res,status,{error:message});
  }
}
