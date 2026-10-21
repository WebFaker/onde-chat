import pg from 'pg';
export function createPool(){
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL est requis.');
  return new pg.Pool({connectionString:process.env.DATABASE_URL,max:5,idleTimeoutMillis:10000,connectionTimeoutMillis:10000});
}
