import sharp from 'sharp';
const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
export const profileFields=`p.status,p.custom_status,p.accent_color,
 (SELECT version FROM profile_media WHERE user_id=p.id AND kind='avatar') AS avatar_version,
 (SELECT version FROM profile_media WHERE user_id=p.id AND kind='banner') AS banner_version`;
export const publicProfileFields=profileFields.replace('p.status',"CASE WHEN p.status='invisible' THEN 'offline' ELSE p.status END AS status");
export function profileRoutes(pool){
 return async({p,url,req,user,body,send,res})=>{
  const reply=data=>send(res,200,data);
  if(p==='/api/profile'&&req.method==='POST'){
   const d=await body(req),fields=[],values=[];
   for(const key of ['bio','custom_status','status','accent_color'])if(Object.hasOwn(d,key)){
    const v=d[key];if(typeof v!=='string')fail(400,'Profil invalide.');
    if(key==='bio'&&v.length>200)fail(400,'La présentation est limitée à 200 caractères.');
    if(key==='custom_status'&&v.length>80)fail(400,'Le statut est limité à 80 caractères.');
    if(key==='status'&&!['online','idle','dnd','invisible'].includes(v))fail(400,'Statut invalide.');
    if(key==='accent_color'&&!/^#[0-9a-f]{6}$/.test(v))fail(400,'Couleur invalide.');
    values.push(v);fields.push(`${key}=$${values.length}`);
   }
   if(!fields.length)fail(400,'Aucun champ à modifier.');values.push(user.id);
   await pool.query(`UPDATE profiles SET ${fields.join(',')} WHERE id=$${values.length}`,values);return reply({ok:true});
  }
  if(p!=='/api/profile-media')return false;
  const kind=url.searchParams.get('kind');if(!['avatar','banner'].includes(kind))fail(400,'Type de média invalide.');
  if(req.method==='GET'){
   const target=url.searchParams.get('user');if(!/^[a-f0-9-]{36}$/i.test(target||''))fail(400,'Profil invalide.');
   // Only a shared server or an existing private conversation grants access.
   if(target!==user.id&&(await pool.query('SELECT 1 FROM user_blocks WHERE (user_id=$1 AND blocked_id=$2) OR (user_id=$2 AND blocked_id=$1)',[user.id,target])).rows.length)fail(403,'Profil privé.');
   const allowed=target===user.id||(await pool.query('SELECT 1 FROM exchange_profiles e JOIN profiles p ON p.id=e.user_id WHERE e.user_id=$1 AND e.discoverable AND p.suspended_at IS NULL',[target])).rows.length||(await pool.query("SELECT 1 FROM friendships WHERE low_id=LEAST($1::uuid,$2::uuid) AND high_id=GREATEST($1::uuid,$2::uuid) AND status='accepted'",[user.id,target])).rows.length||(await pool.query(`SELECT 1 FROM memberships a JOIN memberships b ON b.server_id=a.server_id WHERE a.user_id=$1 AND b.user_id=$2 UNION ALL SELECT 1 FROM dm_members a JOIN dm_members b ON b.channel_id=a.channel_id WHERE a.user_id=$1 AND b.user_id=$2 LIMIT 1`,[user.id,target])).rows.length;
   if(!allowed)fail(403,'Profil privé.');
   const media=(await pool.query('SELECT bytes FROM profile_media WHERE user_id=$1 AND kind=$2 AND version::text=$3',[target,kind,url.searchParams.get('v')])).rows[0];if(!media)fail(404,'Image introuvable.');
   res.writeHead(200,{'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"});res.end(url.searchParams.get('still')==='1'?await sharp(Buffer.from(media.bytes)).webp().toBuffer():Buffer.from(media.bytes));return;
  }
  if(req.method!=='POST')return send(res,405,{error:'Méthode refusée.'});
  const d=await body(req);
  if(d.remove===true){await pool.query('DELETE FROM profile_media WHERE user_id=$1 AND kind=$2',[user.id,kind]);return reply({ok:true});}
  if(typeof d.data!=='string'||!d.data.length||d.data.length>699052||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(d.data))fail(400,'Image invalide ou supérieure à 512 Ko.');
  const input=Buffer.from(d.data,'base64');if(!input.length||input.length>524288)fail(400,'Image limitée à 512 Ko.');let bytes;
  try{
   const image=sharp(input,{animated:true,limitInputPixels:16777216,failOn:'warning'}),info=await image.metadata();
   if(!['png','jpeg','webp','gif'].includes(info.format)||!info.width||!info.height||(info.pages||1)>60)fail(400,'Formats acceptés : PNG, JPEG, WebP et GIF (60 images maximum).');
   bytes=await image.rotate().resize(kind==='avatar'?256:960,kind==='avatar'?256:320,{fit:'cover',withoutEnlargement:true}).webp({quality:80,effort:3}).toBuffer();
  }catch(e){if(e.status)throw e;fail(400,'Image illisible ou trop complexe.');}
  if(bytes.length>524288)fail(400,'Image convertie trop volumineuse. Réduis sa taille ou sa durée.');
  const {rows}=await pool.query(`INSERT INTO profile_media(user_id,kind,bytes,size) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,kind) DO UPDATE SET bytes=EXCLUDED.bytes,size=EXCLUDED.size,version=gen_random_uuid(),updated_at=now() RETURNING version`,[user.id,kind,bytes,bytes.length]);return reply(rows[0]);
 };
}
