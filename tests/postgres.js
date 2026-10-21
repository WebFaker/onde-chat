import {PGlite} from '@electric-sql/pglite';
export async function testPool(){
 const db=new PGlite();await db.waitReady;
 const client={query:async(sql,values=[])=>{const r=await db.query(typeof sql==='string'?sql:sql.text,values);return {...r,rowCount:r.affectedRows||r.rows.length};},release(){},on(){},off(){},removeListener(){}};
 return {query:client.query,connect:async()=>client,end:()=>db.close(),exec:sql=>db.exec(sql)};
}
