import { authenticate, cleanError, getConfig, sendJson, supabaseRest } from "./social-api.js";

export async function requireModerator(req:any,res:any){
  const config=getConfig();
  if(!config.supabaseUrl||!config.anonKey||!config.serviceKey){
    sendJson(res,503,{error:"Moderation services are not configured on the server."});return null;
  }
  const user=await authenticate(req);
  if(!user){sendJson(res,401,{error:"Sign in with an approved moderator account."});return null;}
  const roles=await supabaseRest("moderator_roles?select=role&user_id=eq."+encodeURIComponent(user.id));
  const role=roles?.[0]?.role;
  if(role!=="moderator"&&role!=="admin"){sendJson(res,403,{error:"This account is not assigned to the moderation team."});return null;}
  return {user,role};
}
export {cleanError,sendJson,supabaseRest};
