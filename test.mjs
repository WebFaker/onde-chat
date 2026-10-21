import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {testPool} from './tests/postgres.js';
import {createAuth} from './lib/auth.js';
import {createApplication} from './lib/application.js';
process.env.BETTER_AUTH_SECRET='test-only-not-a-production-secret-123456789';
process.env.BETTER_AUTH_URL='http://localhost:3000';
test('PostgreSQL, Better Auth, profils stables et accès aux messages',{timeout:30000},async()=>{
 const pool=await testPool();try{
  for(const file of (await readdir('db/migrations')).sort())await pool.exec(await readFile('db/migrations/'+file,'utf8'));
  await pool.exec(await readFile('db/seed.sql','utf8'));
  const auth=createAuth(pool),app=createApplication({pool,auth});
  async function authCall(path,data,cookie){return auth.handler(new Request('http://localhost:3000/api/auth/'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000',...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(data)}:{})}));}
  async function api(path,{cookie,method='GET',data,origin='http://localhost:3000'}={}){
   const req=Readable.from(data?[JSON.stringify(data)]:[]);Object.assign(req,{url:'/api/'+path,method,headers:{origin,...(cookie?{cookie}:{})}});
   return new Promise((resolve,reject)=>{const res={writeHead(status){this.status=status;},end(text){resolve({status:this.status,data:JSON.parse(text)});}};app(req,res).catch(reject);});
  }
  assert.equal((await api('messages?channel=1')).status,401);
  const signup=await authCall('sign-up/email',{name:'Alice',email:'alice@example.com',password:'pass-test-123'});
  assert.equal(signup.status,200,await signup.clone().text());
  const cookie=signup.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  assert.match(signup.headers.get('set-cookie'),/httponly/i);
  const me=await api('me',{cookie});assert.equal(me.status,200);assert.equal(me.data.name,'Alice');assert.match(me.data.id,/^[a-f0-9-]{36}$/);
  const authUser=(await pool.query('SELECT id FROM "user"')).rows[0];assert.notEqual(me.data.id,authUser.id);
  assert.equal((await api('messages?channel=1',{cookie,method:'POST',data:{text:'Salut',user_id:'forged'}})).status,201);
  const bob=await authCall('sign-up/email',{name:'Bob',email:'bob@example.com',password:'pass-test-456'});assert.equal(bob.status,200,await bob.clone().text());
  const bobCookie=bob.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  const messages=await api('messages?channel=1',{cookie:bobCookie});assert.equal(messages.data[0].name,'Alice');assert.equal(messages.data[0].user_id,me.data.id);
  assert.equal((await api('messages?channel=1',{cookie,method:'POST',origin:'https://evil.example',data:{text:'refusé'}})).status,403);
  assert.equal((await api('messages?channel=1',{cookie,method:'POST',data:{text:' '}})).status,400);
  assert.equal((await api('channels',{cookie,method:'POST',data:{name:'design'}})).status,201);
  assert.equal((await api('channels',{cookie,method:'POST',data:{name:'design'}})).status,409);
  const bad=await authCall('sign-in/email',{email:'alice@example.com',password:'incorrect'});assert.equal(bad.status,401);
  await authCall('sign-out',{},cookie);assert.equal((await api('me',{cookie})).status,401);
  const login=await authCall('sign-in/email',{email:'alice@example.com',password:'pass-test-123'});assert.equal(login.status,200);
  const loginCookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');assert.equal((await api('me',{cookie:loginCookie})).data.id,me.data.id);
 }finally{await pool.end();}
});
