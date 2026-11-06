import {requireModerator,cleanError,sendJson,supabaseRest} from "../../server/moderation-api.js";
export default async function handler(req:any,res:any){
 if(req.method!=="GET"){res.setHeader("Allow","GET");return sendJson(res,405,{error:"Method not allowed."});}
 try{const access=await requireModerator(req,res);if(!access)return;const status=String(req.query?.status||"open");if(!["open","reviewing","upheld","reversed","all"].includes(status))return sendJson(res,400,{error:"Invalid appeal filter."});const filter=status==="all"?"":"&status=eq."+status;const rows=await supabaseRest("moderation_appeals?select=id,appellant_id,target_type,target_id,explanation,status,created_at&order=created_at.asc&limit=100"+filter);return sendJson(res,200,{appeals:rows||[]});}catch(e){return sendJson(res,500,{error:cleanError(e)});}
}
