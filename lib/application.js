import {fromNodeHeaders,toNodeHandler} from 'better-auth/node';
import {profileRoutes,profileFields} from './features/profiles.js';
import {communityRoutes} from './features/community.js';
export function createApplication({pool,auth}){
 const authHandler=toNodeHandler(auth),community=communityRoutes(pool),profilesRoute=profileRoutes(pool);
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>1500000)throw Object.assign(Error('Requête trop grande.'),{status:413});}try{const data=JSON.parse(text||'{}');if(data===null||typeof data!=='object'||Array.isArray(data))throw Error('Invalid body');return data;}catch{throw Object.assign(Error('JSON invalide.'),{status:400});}}
 return async function application(req,res){
  try{
   const url=new URL(req.url,'http://localhost'),p=url.pathname;
   if(p.startsWith('/api/auth/'))return await authHandler(req,res);
   if(req.method==='POST'&&req.headers.origin!==new URL(process.env.BETTER_AUTH_URL).origin)return send(res,403,{error:'Origine refusée.'});
   const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
   if(!session)return send(res,401,{error:'Connectez-vous pour continuer.'});
   const {rows:profiles}=await pool.query(`SELECT p.id,p.name,p.bio,${profileFields} FROM profiles p JOIN identity_links i ON i.profile_id=p.id WHERE i.provider='better-auth' AND i.subject=$1`,[session.user.id]);
   const user=profiles[0];if(!user)return send(res,403,{error:'Profil introuvable.'});
   if(p==='/api/me'&&req.method==='GET')return send(res,200,user);
   if(await profilesRoute({p,url,req,user,body,send,res})!==false)return;
   if(await community({p,url,req,user,body,send,res})!==false)return;
   return send(res,404,{error:'Route introuvable.'});
  }catch(e){if(['22P02','22001','23514'].includes(e.code))return send(res,400,{error:'Valeur invalide.'});if(e.code==='23505')return send(res,409,{error:'Ce nom existe déjà.'});if(e.code==='23503')return send(res,404,{error:'Salon introuvable.'});if(e.status)return send(res,e.status,{error:e.message});console.error('Onde API failure',{code:e.code||'internal'});return send(res,500,{error:'Le serveur n’a pas pu traiter la requête.'});}
 };
}
