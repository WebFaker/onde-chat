import {partnerRoutes} from './partners.js';
const languages=['fr','en','es','de','it','pt','nl','pl','ru','uk','ar','zh','ja','ko','tr','vi'];
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
const number=v=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<1)fail(400,'Identifiant invalide.');return n;};
export function exchangeRoutes(pool){const partners=partnerRoutes(pool);return async(ctx)=>{if(await partners(ctx)!==false)return;const {p,url,req,user,body,send,res}=ctx;
 if(p!=='/api/exchange/duo')return false;
 const reply=data=>send(res,200,data);
 const channel=number(url.searchParams.get('channel'));
 const client=await pool.connect();try{await client.query('BEGIN');const peers=(await client.query(`SELECT d.user_id FROM dm_members d JOIN channels c ON c.id=d.channel_id JOIN profiles p ON p.id=d.user_id WHERE d.channel_id=$1 AND c.kind='dm' AND c.archived_at IS NULL AND p.suspended_at IS NULL ORDER BY d.user_id`,[channel])).rows.map(r=>r.user_id);if(peers.length!==2||!peers.includes(user.id))fail(403,'Conversation privée.');const [low,high]=peers;await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[low+':'+high]);if(!(await client.query("SELECT 1 FROM friendships WHERE low_id=$1 AND high_id=$2 AND status='accepted' AND NOT EXISTS(SELECT 1 FROM user_blocks WHERE (user_id=$1 AND blocked_id=$2) OR (user_id=$2 AND blocked_id=$1))",[low,high])).rows.length)fail(403,'Ajoutez-vous comme amis pour pratiquer en Duo.');
 if(req.method==='POST'){
  const d=await body(req);await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['duo:'+channel]);
  await client.query("UPDATE duo_sessions SET status='ended',ended_at=now() WHERE channel_id=$1 AND status<>'ended' AND ((status='pending' AND created_at<now()-interval '1 day') OR (status='active' AND started_at+minutes*interval '2 minutes'<=now()))",[channel]);
  const current=(await client.query("SELECT * FROM duo_sessions WHERE channel_id=$1 AND status<>'ended' FOR UPDATE",[channel])).rows[0];
  if(d.action==='offer'){
   if(!languages.includes(d.first_language)||!languages.includes(d.second_language)||d.first_language===d.second_language||![5,10,15,20].includes(d.minutes))fail(400,'Choisis deux langues différentes et une durée de 5 à 20 minutes.');
   if(!current)await client.query('INSERT INTO duo_sessions(channel_id,offered_by,first_language,second_language,minutes) VALUES($1,$2,$3,$4,$5)',[channel,user.id,d.first_language,d.second_language,d.minutes]);
  }else{if(!current||number(d.id)!==Number(current.id))fail(409,'Cette session n’est plus disponible.');if(d.action==='accept'){if(current.offered_by===user.id)fail(403,'Ton ami doit accepter la proposition.');if(current.status==='pending')await client.query("UPDATE duo_sessions SET status='active',started_at=now() WHERE id=$1",[current.id]);}
   else if(d.action==='end')await client.query("UPDATE duo_sessions SET status='ended',ended_at=now() WHERE id=$1",[current.id]);else fail(400,'Action invalide.');}
 }else if(req.method!=='GET'){await client.query('ROLLBACK');return send(res,405,{error:'Méthode refusée.'});}
 const session=(await client.query(`SELECT *,now() AS server_now,CASE WHEN status='active' AND started_at+minutes*interval '2 minutes'<=now() THEN 'completed' WHEN status='pending' AND created_at<now()-interval '1 day' THEN 'expired' ELSE status END AS state FROM duo_sessions WHERE channel_id=$1 ORDER BY id DESC LIMIT 1`,[channel])).rows[0]||null;await client.query('COMMIT');return reply(session);
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
};}
