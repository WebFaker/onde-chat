import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createPool} from '../lib/database.js';
try{process.loadEnvFile();}catch(e){if(e.code!=='ENOENT')throw e;}
const pool=createPool(),client=await pool.connect();
try{
 await client.query('SELECT pg_advisory_lock(809221)');
 await client.query('CREATE TABLE IF NOT EXISTS onde_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
 const dir=new URL('../db/migrations/',import.meta.url);
 for(const name of (await readdir(dir)).filter(n=>n.endsWith('.sql')).sort()){
  const sql=await readFile(new URL(name,dir),'utf8'),checksum=createHash('sha256').update(sql).digest('hex');
  const {rows}=await client.query('SELECT checksum FROM onde_migrations WHERE name=$1',[name]);
  if(rows.length){if(rows[0].checksum!==checksum)throw Error('Migration modifiée après application : '+name);continue;}
  await client.query('BEGIN');try{await client.query(sql);await client.query('INSERT INTO onde_migrations(name,checksum) VALUES($1,$2)',[name,checksum]);await client.query('COMMIT');console.log('Appliquée : '+name);}catch(e){await client.query('ROLLBACK');throw e;}
 }
 await client.query(await readFile(new URL('../db/seed.sql',import.meta.url),'utf8'));
}finally{await client.query('SELECT pg_advisory_unlock(809221)');client.release();await pool.end();}
