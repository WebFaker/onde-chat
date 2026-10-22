const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
export function callInviteRoutes(pool){
 return async({p,req,user,body,send,res})=>{
 if(p!=='/api/call-invites')return false;
 const reply=data=>send(res,200,data);
 if(req.method==='GET')return reply((await pool.query(`SELECT i.id,i.channel_id,i.caller_id,i.callee_id,p.name AS caller_name,q.name AS callee_name,CASE WHEN i.expires_at<=now() AND i.status IN ('ringing','accepted') THEN 'expired' ELSE i.status END AS status,i.expires_at FROM call_invites i JOIN profiles p ON p.id=i.caller_id JOIN profiles q ON q.id=i.callee_id WHERE (i.caller_id=$1 OR i.callee_id=$1) AND (i.expires_at>now() OR i.updated_at>now()-interval '2 minutes') ORDER BY i.created_at DESC LIMIT 20`,[user.id])).rows);
 if(req.method!=='POST')return send(res,405,{error:'Méthode refusée.'});
 const d=await body(req),c=await pool.connect();
 try{
 await c.query('BEGIN');
 if(d.action==='create'){
  const id=Number(d.channel_id);if(!Number.isSafeInteger(id)||id<1)fail(400,'Conversation invalide.');
  await c.query("SELECT pg_advisory_xact_lock(hashtext('onde-private-call-invites'))");
  const peer=(await c.query(`SELECT b.user_id,p.status,p.suspended_at FROM dm_members a JOIN dm_members b ON b.channel_id=a.channel_id AND b.user_id<>a.user_id JOIN channels ch ON ch.id=a.channel_id JOIN profiles p ON p.id=b.user_id WHERE a.channel_id=$1 AND a.user_id=$2 AND ch.kind='dm' AND ch.archived_at IS NULL`,[id,user.id])).rows[0];if(!peer)fail(403,'Conversation privée inaccessible.');
  if(peer.suspended_at||peer.status==='dnd')fail(409,'Ce contact ne peut pas recevoir d’appel pour le moment.');
  const existing=(await c.query("SELECT * FROM call_invites WHERE caller_id=$1 AND channel_id=$2 AND status IN ('ringing','accepted') AND expires_at>now() ORDER BY created_at DESC LIMIT 1",[user.id,id])).rows[0];
  if(existing){await c.query('COMMIT');return reply(existing);}
  const busy=(await c.query("SELECT id FROM call_invites WHERE (caller_id IN ($1,$2) OR callee_id IN ($1,$2)) AND status IN ('ringing','accepted') AND expires_at>now() LIMIT 1",[user.id,peer.user_id])).rows.length;if(busy)fail(409,'Un des participants a déjà un appel en cours.');
  const rate=(await c.query("SELECT count(*)::int AS count FROM call_invites WHERE caller_id=$1 AND created_at>now()-interval '1 minute'",[user.id])).rows[0].count;if(rate>=5)fail(429,'Trop d’appels. Réessaie dans une minute.');
  const invite=(await c.query('INSERT INTO call_invites(channel_id,caller_id,callee_id) VALUES($1,$2,$3) RETURNING *',[id,user.id,peer.user_id])).rows[0];await c.query('COMMIT');return reply(invite);
 }
 const invite=(await c.query('SELECT * FROM call_invites WHERE id=$1 FOR UPDATE',[d.id])).rows[0];if(!invite||![invite.caller_id,invite.callee_id].includes(user.id))fail(404,'Appel introuvable.');
 if(d.action==='heartbeat'){
  if(invite.status!=='accepted'||new Date(invite.expires_at)<=new Date())fail(409,'Cet appel est terminé.');
  await c.query("UPDATE call_invites SET expires_at=now()+interval '90 seconds',updated_at=now() WHERE id=$1",[d.id]);
 }else if(d.action==='accept'||d.action==='decline'){
  if(invite.callee_id!==user.id)fail(403,'Seul le destinataire peut répondre.');
  if(invite.status!=='ringing'||new Date(invite.expires_at)<=new Date())fail(409,'Cet appel n’attend plus de réponse.');
  await c.query("UPDATE call_invites SET status=$2,updated_at=now(),expires_at=CASE WHEN $2='accepted' THEN now()+interval '90 seconds' ELSE now() END WHERE id=$1",[d.id,d.action==='accept'?'accepted':'declined']);
 }else if(d.action==='end'){
  if(invite.status==='ringing'&&invite.caller_id!==user.id)fail(403,'Refuse cet appel pour y répondre.');
  if(['ringing','accepted'].includes(invite.status))await c.query("UPDATE call_invites SET status=$2,updated_at=now(),expires_at=now() WHERE id=$1",[d.id,invite.status==='ringing'?'cancelled':'ended']);
 }else fail(400,'Action invalide.');
 await c.query('COMMIT');return reply({ok:true});
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 };
}
