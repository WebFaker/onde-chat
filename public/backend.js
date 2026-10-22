// Same-origin API. Cookies are HttpOnly; no identity token is stored in browser JS.
export class NodeBackend {
 async fetch(path,{method='GET',body}={}){
  const notify=phase=>{if(typeof document!=='undefined')document.dispatchEvent(new CustomEvent('onde-request',{detail:phase}));};notify('start');try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);let r;try{r=await fetch('/api/'+path,{signal:controller.signal,method,credentials:'same-origin',headers:{'Content-Type':'application/json'},...(body?{body}:{})});}catch{throw Error(controller.signal.aborted?'Le serveur met trop de temps à répondre. Ton brouillon est conservé. Réessaie.':'Connexion interrompue. Vérifie ton réseau et réessaie.');}finally{clearTimeout(timeout);}
  const raw=await r.text();let data;try{data=JSON.parse(raw);}catch{throw Error('Le serveur a renvoyé une réponse inattendue (HTTP '+r.status+'). Réessaie dans quelques instants.');}if(!r.ok){const messages={INVALID_EMAIL_OR_PASSWORD:'Adresse e-mail ou mot de passe incorrect.',USER_ALREADY_EXISTS:'Un compte utilise déjà cette adresse e-mail.',INVALID_EMAIL:'Adresse e-mail invalide.'};const error=Error(messages[data.code]||data.error?.message||data.error||data.message||'La requête a échoué.');error.status=r.status;throw error;}return data;
  }finally{notify('end');}
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
