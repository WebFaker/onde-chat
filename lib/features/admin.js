import {checkCallService} from './call-health.js';
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const number=v=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<1)fail(400,'Identifiant invalide.');return n;};
const text=(v,min,max)=>{if(typeof v!=='string'||v.trim().length<min||v.length>max)fail(400,`Texte attendu : ${min} à ${max} caractères.`);return v.trim();};
export function adminRoutes(pool){
 return async({p,url,req,user,body,send,res})=>{
 if(!p.startsWith('/api/admin/'))return false;
 if(!user.site_admin)fail(403,'Accès réservé à l’administration du site.');
 const kind=p.slice('/api/admin/'.length),reply=data=>send(res,200,data),page=Math.min(10000,Math.max(0,Number(url.searchParams.get('page'))||0)),q=String(url.searchParams.get('q')||'').slice(0,100),pattern='%'+q.replace(/[\\%_]/g,'\\$&')+'%';
 if(req.method==='GET'){
  if(kind==='calls')return reply(await checkCallService());
  if(kind==='overview')return reply((await pool.query(`SELECT (SELECT count(*)::int FROM profiles) AS users,(SELECT count(*)::int FROM profiles WHERE suspended_at IS NOT NULL) AS suspended,(SELECT count(*)::int FROM servers WHERE archived_at IS NULL) AS servers,(SELECT count(*)::int FROM channels WHERE kind<>'dm' AND archived_at IS NULL) AS channels,(SELECT count(*)::int FROM messages m JOIN channels c ON c.id=m.channel_id WHERE c.kind<>'dm' AND NOT m.deleted) AS messages,(SELECT COALESCE(sum(size),0) FROM attachments)+(SELECT COALESCE(sum(size),0) FROM profile_media) AS storage_bytes`)).rows[0]);
  let sql,values=[pattern,page*50];
  if(kind==='users')sql=`SELECT p.id,p.name,u.email,p.created_at,p.suspended_at,p.suspension_reason,EXISTS(SELECT 1 FROM site_admins a WHERE a.profile_id=p.id) AS site_admin FROM profiles p LEFT JOIN identity_links i ON i.profile_id=p.id AND i.provider='better-auth' LEFT JOIN "user" u ON u.id=i.subject WHERE p.name ILIKE $1 OR u.email ILIKE $1 ORDER BY p.created_at DESC,p.id LIMIT 51 OFFSET $2`;
  else if(kind==='servers')sql=`SELECT s.*,p.name AS owner_name,(SELECT count(*)::int FROM memberships WHERE server_id=s.id) AS members FROM servers s LEFT JOIN profiles p ON p.id=s.owner_id WHERE s.name ILIKE $1 ORDER BY s.id DESC LIMIT 51 OFFSET $2`;
  else if(kind==='channels')sql=`SELECT c.*,s.name AS server_name FROM channels c JOIN servers s ON s.id=c.server_id WHERE c.kind<>'dm' AND (c.name ILIKE $1 OR s.name ILIKE $1) ORDER BY c.id DESC LIMIT 51 OFFSET $2`;
  else if(kind==='messages')sql=`SELECT m.id,m.body,m.created,m.deleted,p.name AS author,c.name AS channel_name,s.name AS server_name FROM messages m JOIN profiles p ON p.id=m.user_id JOIN channels c ON c.id=m.channel_id JOIN servers s ON s.id=c.server_id WHERE c.kind<>'dm' AND (m.body ILIKE $1 OR p.name ILIKE $1) ORDER BY m.id DESC LIMIT 51 OFFSET $2`;
  else if(kind==='audit')sql=`SELECT a.id,a.action,a.target,a.reason,a.details,a.created_at,p.name AS actor FROM admin_audit a JOIN profiles p ON p.id=a.actor_id WHERE a.action ILIKE $1 OR a.reason ILIKE $1 ORDER BY a.id DESC LIMIT 51 OFFSET $2`;
  else if(kind==='members'){values=[number(url.searchParams.get('server')),page*50];sql=`SELECT p.id,p.name,m.role,m.server_id FROM memberships m JOIN profiles p ON p.id=m.user_id WHERE m.server_id=$1 ORDER BY p.name LIMIT 51 OFFSET $2`;}
  else fail(404,'Outil introuvable.');
  const {rows}=await pool.query(sql,values);return reply({items:rows.slice(0,50),more:rows.length>50});
 }
 if(req.method!=='POST')return send(res,405,{error:'Méthode refusée.'});
 const d=await body(req),reason=text(d.reason,3,300),c=await pool.connect();let details={};
 try{
  await c.query('BEGIN');
  if(kind==='users'){
   const target=(await c.query('SELECT p.id,p.suspended_at,i.subject,EXISTS(SELECT 1 FROM site_admins WHERE profile_id=p.id) AS site_admin FROM profiles p LEFT JOIN identity_links i ON i.profile_id=p.id AND i.provider=\'better-auth\' WHERE p.id=$1 FOR UPDATE OF p',[d.id])).rows[0];if(!target)fail(404,'Utilisateur introuvable.');if(target.site_admin||target.id===user.id)fail(403,'Le compte administrateur est protégé.');
   if(d.action==='suspend'){await c.query('UPDATE profiles SET suspended_at=now(),suspension_reason=$2 WHERE id=$1',[d.id,reason]);await c.query('DELETE FROM session WHERE "userId"=$1',[target.subject]);}
   else if(d.action==='restore')await c.query("UPDATE profiles SET suspended_at=NULL,suspension_reason='' WHERE id=$1",[d.id]);
   else if(d.action==='revoke_sessions')await c.query('DELETE FROM session WHERE "userId"=$1',[target.subject]);
   else if(d.action==='clear_profile'){await c.query("UPDATE profiles SET bio='',custom_status='',accent_color='#5865f2' WHERE id=$1",[d.id]);await c.query('DELETE FROM profile_media WHERE user_id=$1',[d.id]);}
   else fail(400,'Action invalide.');details={was_suspended:!!target.suspended_at};
  }else if(kind==='servers'||kind==='channels'){
   const table=kind==='servers'?'servers':'channels',id=number(d.id),old=(await c.query(`SELECT * FROM ${table} WHERE id=$1 FOR UPDATE`,[id])).rows[0];if(!old||old.kind==='dm')fail(404,'Élément introuvable.');
   if(d.action==='archive'||d.action==='restore'){if(kind==='servers'&&id===1&&d.action==='archive')fail(403,'Le serveur d’accueil doit rester disponible.');await c.query(`UPDATE ${table} SET archived_at=${d.action==='archive'?'now()':'NULL'} WHERE id=$1`,[id]);}
   else if(d.action==='edit'){const name=text(d.name,2,kind==='servers'?50:32),description=text(kind==='servers'?d.description:d.topic,0,kind==='servers'?300:160);await c.query(`UPDATE ${table} SET name=$2,${kind==='servers'?'description':'topic'}=$3 WHERE id=$1`,[id,name,description]);details={previous_name:old.name,name};}
   else fail(400,'Action invalide.');
  }else if(kind==='messages'){
   if(d.action!=='hide')fail(400,'Action invalide.');const m=(await c.query("SELECT m.id,m.channel_id FROM messages m JOIN channels c ON c.id=m.channel_id WHERE m.id=$1 AND c.kind<>'dm' AND NOT m.deleted FOR UPDATE OF m",[number(d.id)])).rows[0];if(!m)fail(404,'Message introuvable.');await c.query('UPDATE messages SET deleted=true WHERE id=$1',[d.id]);details={channel_id:m.channel_id};
  }else if(kind==='members'){
   if(d.action!=='role'||!['member','moderator','admin'].includes(d.role))fail(400,'Rôle invalide.');const server=number(d.server_id),m=(await c.query('SELECT role FROM memberships WHERE server_id=$1 AND user_id=$2 FOR UPDATE',[server,d.id])).rows[0];if(!m)fail(404,'Membre introuvable.');if(m.role==='owner')fail(403,'Le rôle du propriétaire est protégé.');await c.query('UPDATE memberships SET role=$3 WHERE server_id=$1 AND user_id=$2',[server,d.id,d.role]);details={server_id:server,previous_role:m.role,role:d.role};
  }else fail(404,'Outil introuvable.');
  await c.query('INSERT INTO admin_audit(actor_id,action,target,reason,details) VALUES($1,$2,$3,$4,$5)',[user.id,kind+':'+d.action,String(d.id),reason,JSON.stringify(details)]);await c.query('COMMIT');return reply({ok:true});
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 };
}
