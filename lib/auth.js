import {betterAuth} from 'better-auth';
export function createAuth(pool){
  if(!process.env.BETTER_AUTH_SECRET||process.env.BETTER_AUTH_SECRET.length<32)throw new Error('BETTER_AUTH_SECRET doit contenir au moins 32 caractères.');
  if(!process.env.BETTER_AUTH_URL)throw new Error('BETTER_AUTH_URL est requis.');
  return betterAuth({database:pool,baseURL:process.env.BETTER_AUTH_URL,secret:process.env.BETTER_AUTH_SECRET,
    emailAndPassword:{enabled:true,minPasswordLength:8,maxPasswordLength:128},
    rateLimit:{enabled:true,storage:'database',window:60,max:60},
    session:{expiresIn:60*60*24*7,updateAge:60*60*24},
    databaseHooks:{user:{create:{before:async user=>{
      if(!/^[\p{L}\p{N}_-]{2,24}$/u.test(user.name))throw new Error('Pseudo invalide : 2 à 24 lettres, chiffres, tirets ou underscores.');
      return {data:user};
    }}}}
  });
}
