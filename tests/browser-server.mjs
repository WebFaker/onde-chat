import {securityHeaders} from '../lib/headers.js';
import http from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {testPool} from './postgres.js';
import {createAuth} from '../lib/auth.js';
import {createApplication} from '../lib/application.js';
process.env.BETTER_AUTH_URL='http://127.0.0.1:3250';
process.env.BETTER_AUTH_SECRET='local-browser-tests-only-secret-123456789';
const pool=await testPool();
for(const file of (await readdir('db/migrations')).sort())await pool.exec(await readFile('db/migrations/'+file,'utf8'));
await pool.exec(await readFile('db/seed.sql','utf8'));
const auth=createAuth(pool);
// This fixture exists only in the isolated browser-test server and database.
const seeded=await auth.handler(new Request(process.env.BETTER_AUTH_URL+'/api/auth/sign-up/email',{method:'POST',headers:{'Content-Type':'application/json',Origin:process.env.BETTER_AUTH_URL,'x-forwarded-for':'192.0.2.250'},body:JSON.stringify({name:'BackofficeOwner',email:'backoffice@example.com',password:'browser-admin-password-123'})}));
if(!seeded.ok)throw Error('Unable to create isolated admin fixture');
await pool.query(`INSERT INTO site_admins(profile_id,auth_user_id) SELECT i.profile_id,i.subject FROM identity_links i JOIN "user" u ON u.id=i.subject WHERE i.provider='better-auth' AND u.email='backoffice@example.com'`);
const app=createApplication({pool,auth});
const files={'/admin':'admin.html','/admin.html':'admin.html','/admin.js':'admin.js','/admin.css':'admin.css','/translation-ui.js':'translation-ui.js','/translation.js':'translation.js','/location.js':'location.js','/partner-discovery.js':'partner-discovery.js','/exchange.js':'exchange.js','/friends.js':'friends.js','/friends.css':'friends.css','/':'index.html','/app.js':'app.js','/backend.js':'backend.js','/ringtone.js':'ringtone.js','/style.css':'style.css','/motion.js':'motion.js','/calls.js':'calls.js','/assets/orbit.json':'assets/orbit.json'};
http.createServer(async(req,res)=>{for(const [key,value] of Object.entries(securityHeaders))res.setHeader(key,value);const p=new URL(req.url,'http://localhost').pathname;
 if(p.startsWith('/api/'))return app(req,res);
 if(!files[p]){res.writeHead(404);return res.end('Not found');}
 res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':'text/html');res.end(await readFile('public/'+files[p]));
}).listen(3250,'127.0.0.1',()=>console.log('Browser test server ready'));
