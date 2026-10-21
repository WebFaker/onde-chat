// Same-origin API. Cookies are HttpOnly; no identity token is stored in browser JS.
export class NodeBackend {
 async fetch(path,{method='GET',body}={}){
  const r=await fetch('/api/'+path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},...(body?{body}:{})});
  const raw=await r.text();let data;try{data=JSON.parse(raw);}catch{throw Error('Le serveur a renvoyé une réponse inattendue (HTTP '+r.status+'). Réessaie dans quelques instants.');}if(!r.ok)throw Error(data.error?.message||data.error||data.message||'La requête a échoué.');return data;
 }
 async request(path,options={}){
  if(path==='register'||path==='login'){
   const {name,email,password}=JSON.parse(options.body);
   await this.fetch(path==='register'?'auth/sign-up/email':'auth/sign-in/email',{method:'POST',body:JSON.stringify({name,email,password})});
   return this.fetch('me');
  }
  if(path==='logout')return this.fetch('auth/sign-out',{method:'POST',body:'{}'});
  return this.fetch(path,options);
 }
 subscribe(onUpdate,onError){let stopped=false,timer;const tick=async()=>{try{if(!document.hidden)await onUpdate();}catch(e){onError(e);}finally{if(!stopped)timer=setTimeout(tick,5000);}};timer=setTimeout(tick,5000);return {close(){stopped=true;clearTimeout(timer);}};}
}
