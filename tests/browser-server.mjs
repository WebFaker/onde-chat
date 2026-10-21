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
const app=createApplication({pool,auth:createAuth(pool)});
const files={'/':'index.html','/app.js':'app.js','/backend.js':'backend.js','/style.css':'style.css','/motion.js':'motion.js','/calls.js':'calls.js','/assets/orbit.json':'assets/orbit.json'};
http.createServer(async(req,res)=>{const p=new URL(req.url,'http://localhost').pathname;
 if(p.startsWith('/api/'))return app(req,res);
 if(!files[p]){res.writeHead(404);return res.end('Not found');}
 res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':'text/html');res.end(await readFile('public/'+files[p]));
}).listen(3250,'127.0.0.1',()=>console.log('Browser test server ready'));
