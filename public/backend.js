// Provider boundary: the UI only depends on request() and subscribe().
export class SupabaseBackend {
  constructor(config, storage = localStorage) {
    this.url=config.supabaseUrl.replace(/\/$/,'');this.key=config.supabaseKey;this.storage=storage;
    if(!this.url||!this.key)throw Error('Configure SUPABASE_URL et SUPABASE_PUBLISHABLE_KEY pour démarrer.');
    try { this.session=JSON.parse(storage.getItem('onde.session')||'null'); } catch {this.session=null;}
  }
  save(session){this.session=session?{...session,expires_at:session.expires_at||Date.now()/1000+session.expires_in}:null;if(session)this.storage.setItem('onde.session',JSON.stringify(this.session));else this.storage.removeItem('onde.session');}
  async fetch(path,method='GET',data,auth=true){
    if(auth&&this.session?.refresh_token&&this.session.expires_at<Date.now()/1000+60){
      if(!this.refreshing)this.refreshing=this.fetch('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:this.session.refresh_token},false).then(s=>this.save(s)).catch(e=>{this.save(null);throw e;}).finally(()=>{this.refreshing=null;});
      await this.refreshing;
    }
    const r=await fetch(this.url+path,{method,headers:{apikey:this.key,...(auth&&this.session?.access_token?{Authorization:'Bearer '+this.session.access_token}:{}),'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
    const text=await r.text();let result;try{result=text?JSON.parse(text):null;}catch{throw Error('Réponse du serveur invalide.');}
    if(!r.ok)throw Error(result?.msg||result?.message||result?.error_description||'La requête a échoué.');return result;
  }
  async me(){const id=await this.fetch('/rest/v1/rpc/current_profile_id','POST',{});if(!id)throw Error('Connectez-vous pour continuer.');const rows=await this.fetch('/rest/v1/profiles?id=eq.'+encodeURIComponent(id)+'&select=id,name');if(!rows[0])throw Error('Profil introuvable.');return rows[0];}
  async request(path,{method='GET',body}={}){const data=body?JSON.parse(body):{},[route,query]=path.split('?');
    if(route==='register'){const s=await this.fetch('/auth/v1/signup','POST',{email:data.email,password:data.password,data:{name:data.name}},false);if(!s.access_token)return {confirmationRequired:true};this.save(s);return this.me();}
    if(route==='login'){this.save(await this.fetch('/auth/v1/token?grant_type=password','POST',{email:data.email,password:data.password},false));return this.me();}
    if(route==='me')return this.me();
    if(route==='logout'){try{await this.fetch('/auth/v1/logout','POST',{});}finally{this.save(null);}return {ok:true};}
    if(route==='channels'){if(method==='POST')return this.fetch('/rest/v1/channels','POST',{name:data.name});return this.fetch('/rest/v1/channels?select=id,name&order=id');}
    if(route==='members')return this.fetch('/rest/v1/profiles?select=id,name&order=name&limit=200');
    if(route==='messages'){const channel=Number(new URLSearchParams(query).get('channel'));if(!Number.isSafeInteger(channel)||channel<1)throw Error('Salon invalide.');
      if(method==='POST'){const user=await this.me();return this.fetch('/rest/v1/messages','POST',{channel_id:channel,user_id:user.id,body:data.text});}
      const rows=await this.fetch('/rest/v1/messages?select=id,channel_id,user_id,body,created,profiles(name)&channel_id=eq.'+channel+'&order=id.desc&limit=150');return rows.reverse().map(({profiles,...m})=>({...m,name:profiles?.name||'Membre'}));}
    throw Error('Opération inconnue.');
  }
  // Polling avoids a persistent server on Vercel and is interchangeable with WebSocket.
  subscribe(onUpdate,onError){let stopped=false,timer;const tick=async()=>{try{if(!document.hidden)await onUpdate();}catch(e){onError(e);}finally{if(!stopped)timer=setTimeout(tick,5000);}};timer=setTimeout(tick,5000);return {close(){stopped=true;clearTimeout(timer);}};}
}
