import {fromNodeHeaders,toNodeHandler} from 'better-auth/node';
export function createApplication({pool,auth}){
 const authHandler=toNodeHandler(auth);
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>16000)throw Object.assign(Error('Requête trop grande.'),{status:413});}try{return JSON.parse(text||'{}');}catch{throw Object.assign(Error('JSON invalide.'),{status:400});}}
 return async function application(req,res){
  try{
   const url=new URL(req.url,'http://localhost'),p=url.pathname;
   if(p.startsWith('/api/auth/'))return await authHandler(req,res);
   if(req.method==='POST'&&req.headers.origin!==new URL(process.env.BETTER_AUTH_URL).origin)return send(res,403,{error:'Origine refusée.'});
   const session=await auth.api.getSession({headers:fromNodeHeaders(req.headers)});
   if(!session)return send(res,401,{error:'Connectez-vous pour continuer.'});
   const {rows:profiles}=await pool.query("SELECT p.id,p.name FROM profiles p JOIN identity_links i ON i.profile_id=p.id WHERE i.provider='better-auth' AND i.subject=$1",[session.user.id]);
   const user=profiles[0];if(!user)return send(res,403,{error:'Profil introuvable.'});
   if(p==='/api/me'&&req.method==='GET')return send(res,200,user);
   if(p==='/api/members'&&req.method==='GET')return send(res,200,(await pool.query('SELECT id,name FROM profiles ORDER BY name LIMIT 200')).rows);
   if(p==='/api/channels'){
    if(req.method==='GET')return send(res,200,(await pool.query('SELECT id,name FROM channels ORDER BY id')).rows);
    if(req.method==='POST'){const {name}=await body(req);if(typeof name!=='string'||! /^[\p{L}\p{N}_-]{2,32}$/u.test(name))return send(res,400,{error:'Nom de salon invalide.'});await pool.query('INSERT INTO channels(name) VALUES($1)',[name]);return send(res,201,{ok:true});}
   }
   if(p==='/api/messages'){
    const channel=Number(url.searchParams.get('channel'));if(!Number.isSafeInteger(channel)||channel<1)return send(res,400,{error:'Salon invalide.'});
    if(req.method==='GET'){const {rows}=await pool.query('SELECT m.id,m.channel_id,m.user_id,m.body,m.created,p.name FROM messages m JOIN profiles p ON p.id=m.user_id WHERE channel_id=$1 ORDER BY m.id DESC LIMIT 150',[channel]);return send(res,200,rows.reverse());}
    if(req.method==='POST'){const {text}=await body(req);if(typeof text!=='string'||!text.trim()||text.length>2000)return send(res,400,{error:'Message : 1 à 2000 caractères.'});await pool.query('INSERT INTO messages(channel_id,user_id,body) VALUES($1,$2,$3)',[channel,user.id,text.trim()]);return send(res,201,{ok:true});}
   }
   return send(res,404,{error:'Route introuvable.'});
  }catch(e){if(e.code==='23505')return send(res,409,{error:'Ce nom existe déjà.'});if(e.code==='23503')return send(res,404,{error:'Salon introuvable.'});if(e.status)return send(res,e.status,{error:e.message});console.error('Onde API failure',{code:e.code||'internal'});return send(res,500,{error:'Le serveur n’a pas pu traiter la requête.'});}
 };
}
