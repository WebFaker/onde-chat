import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';import {Readable} from 'node:stream';import {testPool} from './postgres.js';import {createAuth} from '../lib/auth.js';import {createApplication} from '../lib/application.js';
process.env.BETTER_AUTH_SECRET='isolated-community-tests-secret-123456789';process.env.BETTER_AUTH_URL='http://localhost:3000';
test('espaces privés, invitations, permissions, MP, messages enrichis, fichiers et appels',{timeout:45000},async()=>{
 const pool=await testPool();try{for(const f of (await readdir('db/migrations')).sort())await pool.exec(await readFile('db/migrations/'+f,'utf8'));await pool.exec(await readFile('db/seed.sql','utf8'));const auth=createAuth(pool),app=createApplication({pool,auth});let ip=0;
 async function signup(name){const response=await auth.handler(new Request('http://localhost:3000/api/auth/sign-up/email',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000','x-forwarded-for':'192.0.2.'+(++ip)},body:JSON.stringify({name,email:name+'@example.com',password:'isolated-password-123'})}));assert.equal(response.status,200,await response.clone().text());return response.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');}
 async function api(path,cookie,data){const req=Readable.from(data===undefined?[]:[JSON.stringify(data)]);Object.assign(req,{url:'/api/'+path,method:data===undefined?'GET':'POST',headers:{cookie,origin:'http://localhost:3000'}});return new Promise((resolve,reject)=>app(req,{writeHead(status,headers){this.status=status;this.headers=headers;},end(text){resolve({status:this.status,headers:this.headers,data:Buffer.isBuffer(text)?text:JSON.parse(text)});}}).catch(reject));}
 const a=await signup('Owner'),b=await signup('Member'),c=await signup('Stranger'),ua=(await api('me',a)).data,ub=(await api('me',b)).data;
 const created=await api('servers',a,{name:'Atelier secret',description:'Privé'});assert.equal(created.status,201);const s=created.data.id;
 assert.equal((await api('channels?server='+s,b)).status,403);assert.ok(!(await api('servers',b)).data.some(x=>x.id===s));
 const invite=(await api('invites',a,{server_id:s})).data;assert.match(invite.token,/^[a-f0-9]{48}$/);assert.equal((await api('invites',b,{token:'invalid'})).status,404);assert.equal((await api('invites',b,{token:invite.token})).status,200);
 assert.equal((await api('invites',b,{server_id:s})).status,403);assert.equal((await api('channels?server='+s,b,{name:'forbidden'})).status,403);
 const list=(await api('channels?server='+s,a)).data,chat=list.find(c=>c.kind==='text'),voice=list.find(c=>c.kind==='voice');
 assert.equal((await api('messages?channel='+chat.id,c)).status,403);assert.equal((await api('messages?channel='+chat.id,c,{text:'attack'})).status,403);
 assert.equal((await api('messages?channel='+chat.id,b,{text:'Bonjour secret'})).status,201);let messages=(await api('messages?channel='+chat.id,a)).data;const first=messages[0];
 assert.equal((await api('message',a,{id:first.id,action:'edit',text:'usurpation'})).status,403);
 assert.equal((await api('message',b,{id:first.id,action:'edit',text:'Bonjour édité'})).status,200);
 assert.equal((await api('message',b,{id:first.id,action:'react',emoji:'❤️'})).status,200);
 assert.equal((await api('message',b,{id:first.id,action:'pin'})).status,403);assert.equal((await api('message',a,{id:first.id,action:'pin'})).status,200);
 assert.equal((await api('messages?channel='+chat.id,a,{text:'Réponse privée',reply_to:first.id})).status,201);
 messages=(await api('messages?channel='+chat.id,a)).data;assert.equal(messages[0].pinned,true);assert.equal(messages[0].reactions[0].emoji,'❤️');assert.equal(messages[1].reply_name,'Member');assert.equal((await api('messages?channel='+chat.id+'&q='+encodeURIComponent('édité'),a)).data.length,1);
 const dm=(await api('dms',a,{user_id:ub.id})).data;assert.equal((await api('messages?channel='+dm.id,c)).status,403);assert.equal((await api('messages?channel='+dm.id,a,{text:'MP'})).status,201);assert.equal((await api('messages?channel='+dm.id,b)).data[0].body,'MP');assert.equal((await api('dms',b,{user_id:ua.id})).data.id,dm.id);
 assert.equal((await api('messages?channel='+dm.id,a,{text:'reply spoof',reply_to:first.id})).status,400);
 const upload=await api('upload',b,{channel_id:chat.id,name:'note.txt',mime:'text/plain',data:Buffer.from('hello attachment').toString('base64')});assert.equal(upload.status,201);
 assert.equal((await api('messages?channel='+chat.id,a,{text:'vol de fichier',attachment_id:upload.data.id})).status,400);
 assert.equal((await api('messages?channel='+chat.id,b,{text:'Ma note',attachment_id:upload.data.id})).status,201);
 assert.equal((await api('file?id='+upload.data.id,c)).status,403);const downloaded=await api('file?id='+upload.data.id,a);assert.equal(downloaded.data.toString(),'hello attachment');assert.equal(downloaded.headers['Content-Type'],'application/octet-stream');
 assert.equal((await api('upload',a,{channel_id:chat.id,name:'attack.html',mime:'text/html',data:'dGVzdA=='})).status,400);
 assert.equal((await api('read',a,{channel_id:chat.id})).status,200);assert.equal((await api('channels?server='+s,a)).data.find(x=>x.id===chat.id).unread,0);
 assert.equal((await api('profile',b,{bio:'Une bio lisible'})).status,200);assert.equal((await api('presence',b,{})).status,200);const profile=(await api('members?server='+s,a)).data.find(x=>x.id===ub.id);assert.equal(profile.bio,'Une bio lisible');assert.equal(profile.online,true);
 assert.ok((await api('progress',b)).data.badges.some(x=>x.unlocked));
 assert.equal((await api('call',a,{channel_id:voice.id})).status,503);assert.equal((await api('call',c,{channel_id:voice.id})).status,403);
 process.env.LIVEKIT_URL='wss://test.invalid';process.env.LIVEKIT_API_KEY='isolated-test-key';process.env.LIVEKIT_API_SECRET='isolated-livekit-secret-not-a-real-key';
 const call=await api('call',a,{channel_id:voice.id});assert.equal(call.status,200);const claims=JSON.parse(Buffer.from(call.data.token.split('.')[1],'base64url'));assert.equal(claims.sub,ua.id);assert.equal(claims.video.room,'onde-channel-'+voice.id);delete process.env.LIVEKIT_URL;delete process.env.LIVEKIT_API_KEY;delete process.env.LIVEKIT_API_SECRET;
 assert.equal((await api('members?server='+s,b,{user_id:ua.id,role:'member'})).status,403);
 assert.equal((await api('members?server='+s,a,{user_id:ub.id,role:'moderator'})).status,200);assert.equal((await api('channels?server='+s,b,{name:'par-la-modération'})).status,201);
 assert.equal((await api('message',b,{id:messages[1].id,action:'delete'})).status,200);assert.ok(!(await api('messages?channel='+chat.id,a)).data.some(x=>x.id===messages[1].id));
 assert.equal((await api('members?server='+s,a,{user_id:ub.id,action:'kick'})).status,200);assert.equal((await api('messages?channel='+chat.id,b)).status,403);assert.ok((await api('moderation?server='+s,a)).data.length>=2);
 }finally{await pool.end();}
});
