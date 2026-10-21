import http from 'node:http';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./public/',import.meta.url));
// Node 24 reads an optional local .env; environment variables take precedence.
try{process.loadEnvFile();}catch(e){if(e.code!=='ENOENT')throw e;}
const files={'/':'index.html','/app.js':'app.js','/backend.js':'backend.js','/style.css':'style.css'};
http.createServer((req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  res.setHeader('X-Content-Type-Options','nosniff');
  if(path==='/api/config'){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({supabaseUrl:process.env.SUPABASE_URL||'',supabaseKey:process.env.SUPABASE_PUBLISHABLE_KEY||''}));}
  if(!files[path]){res.writeHead(404);return res.end('Introuvable');}
  res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html');res.end(readFileSync(root+files[path]));
}).listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Onde : http://localhost:'+(process.env.PORT||3000)));
