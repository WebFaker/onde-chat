import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {NodeBackend} from '../public/backend.js';
const html=await readFile(new URL('./fixtures/community.html',import.meta.url),'utf8');
const source=(await readFile(new URL('../public/app.js',import.meta.url),'utf8')).replace("import {NodeBackend} from './backend.js';",'').replace("import {createRingtone} from './ringtone.js';",'').replace("import {animateEmblems} from './motion.js';",'');
const flush=()=>new Promise(resolve=>setTimeout(resolve,20));
function setup(){
 const dom=new JSDOM(html,{url:'https://onde.example',runScripts:'outside-only'}),w=dom.window;
 let logged=false,failChannels=false,expire=false,poll;
 const requests=[];
 class Backend {
  async request(path,options={}){requests.push(path);
   if(path==='login'){const data=JSON.parse(options.body);if(data.password==='incorrect')throw Error('Identifiants incorrects.');logged=true;return {id:'a',name:'Alice'};}
   if(path==='logout'){logged=false;return {};}
   if(!logged||expire)throw Object.assign(Error('Connectez-vous pour continuer.'),{status:401});
   if(path==='me')return {id:'a',name:'Alice'};
   if(path==='servers')return [{id:1,name:'La communauté',role:'member'}];
   if(path==='dms')return [];
   if(path==='capabilities')return {calls:false};
   if(path==='call-invites')return [];
   if(path==='progress')return {level:1,xp:20,badges:[]};
   if(path==='presence'||path==='read')return {};
   if(path.startsWith('channels')){if(failChannels)throw Error('Service temporairement indisponible.');return [{id:1,name:'général',kind:'text'},{id:2,name:'projets',kind:'text'}];}
   if(path.startsWith('messages'))return [{id:1,user_id:'a',name:'Alice',created:new Date().toISOString(),body:'<script>window.attacked=true</script>'}];
   if(path.startsWith('members'))return [{id:'a',name:'Alice'}];
  }
  subscribe(update,error){poll=async()=>{try{await update();}catch(e){error(e);}};return {close(){}};}
 }
 w.createRingtone=()=>({unlock(){},start(){},stop(){},setMuted(){},enable:async()=>true});w.NodeBackend=Backend;w.animateEmblems=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};w.eval(source);
 return {w,dom,requests,setFail:v=>{failChannels=v;},setExpired:v=>{expire=v;},poll:()=>poll()};
}
test('formulaire : mauvais mot de passe, panne après login, succès, texte sûr, expiration',async()=>{
 const t=setup(),w=t.w,$=id=>w.document.getElementById(id);
 try{
  await flush();assert.equal($('app').hidden,true);assert.equal($('name').required,false);
  $('email').value='alice@example.com';$('password').value='incorrect';await $('auth-form').onsubmit({preventDefault(){}});
  assert.match($('auth-error').textContent,/incorrects/);assert.equal($('auth').hidden,false);assert.equal($('auth-submit').disabled,false);
  t.setFail(true);$('password').value='valid-password';await $('auth-form').onsubmit({preventDefault(){}});
  assert.equal($('auth').hidden,false);assert.equal($('app').hidden,true);assert.match($('auth-error').textContent,/indisponible/);
  t.setFail(false);$('password').value='valid-password';await $('auth-form').onsubmit({preventDefault(){}});
  assert.equal($('auth').hidden,true);assert.equal($('app').hidden,false);assert.equal($('my-name').textContent,'Alice');assert.equal($('password').value,'');
  assert.match($('messages').textContent,/<script>/);assert.equal(w.attacked,undefined);assert.equal($('messages').querySelector('script'),null);
  t.setExpired(true);await t.poll();assert.equal($('app').hidden,true);assert.equal($('auth').hidden,false);assert.match($('auth-error').textContent,/expiré/);
 }finally{t.dom.window.close();}
});
test('déconnexion de l’interface après connexion',async()=>{
 const t=setup(),$=id=>t.w.document.getElementById(id);try{
 await flush();$('password').value='valid-password';await $('auth-form').onsubmit({preventDefault(){}});
 await $('logout').onclick();assert.equal($('app').hidden,true);assert.equal($('auth').hidden,false);assert.ok(t.requests.includes('logout'));
 }finally{t.dom.window.close();}
});
test('adaptateur : erreurs JSON et page non JSON lisibles',async()=>{
 const original=globalThis.fetch,b=new NodeBackend();try{
 globalThis.fetch=async()=>new Response('The page could not be found',{status:404});await assert.rejects(()=>b.request('me'),/HTTP 404/);
 globalThis.fetch=async()=>new Response(JSON.stringify({code:'INVALID_EMAIL_OR_PASSWORD',message:'Invalid email or password'}),{status:401});await assert.rejects(()=>b.request('login',{body:JSON.stringify({email:'x@y.z',password:'wrong'})}),/mot de passe incorrect/);
 }finally{globalThis.fetch=original;}
});
test('messages enrichis : mise en forme, spoilers accessibles et liens sûrs',()=>{
 const t=setup(),w=t.w;try{
 const root=w.document.createElement('div');w.document.body.append(root);w.richRoot=root;
 w.eval('richRoot.append(richText("**gras** *italique* __souligné__ ~~barré~~ `code` ||secret|| https://example.com <img src=x onerror=alert(1)> javascript:alert(1)"))');
 assert.equal(root.querySelector('strong').textContent,'gras');assert.equal(root.querySelector('em').textContent,'italique');assert.equal(root.querySelector('u').textContent,'souligné');assert.equal(root.querySelector('s').textContent,'barré');assert.equal(root.querySelector('code').textContent,'code');
 const spoiler=root.querySelector('.spoiler');assert.equal(spoiler.getAttribute('aria-expanded'),'false');spoiler.click();assert.equal(spoiler.getAttribute('aria-expanded'),'true');spoiler.click();assert.equal(spoiler.getAttribute('aria-expanded'),'false');
 assert.equal(root.querySelectorAll('a').length,1);assert.equal(root.querySelector('a').rel,'noopener noreferrer');assert.equal(root.querySelector('img'),null);
 }finally{t.dom.window.close();}
});
test('apparence : validation, sauvegarde et restauration sur cet appareil',async()=>{
 const t=setup(),w=t.w,$=id=>w.document.getElementById(id);try{
 await flush();w.eval('appearanceSettings()');$('modal-theme').value='light';$('modal-density').value='compact';$('modal-font').value='18';$('modal-motion').value='reduce';await w.document.querySelector('.modal-form').onsubmit({preventDefault(){}});
 assert.equal(w.document.documentElement.dataset.theme,'light');assert.equal(w.document.documentElement.dataset.density,'compact');assert.equal(w.document.documentElement.style.getPropertyValue('--message-font'),'18px');assert.equal(JSON.parse(w.localStorage.getItem('onde-appearance')).motion,'reduce');
 w.eval('applyAppearance({theme:"bad",font:"900"})');assert.equal(w.document.documentElement.dataset.theme,'classic');assert.equal(w.document.documentElement.style.getPropertyValue('--message-font'),'16px');
 w.eval('applyAppearance(JSON.parse(localStorage.getItem("onde-appearance")))');assert.equal(w.document.documentElement.dataset.theme,'light');
 }finally{t.dom.window.close();}
});
