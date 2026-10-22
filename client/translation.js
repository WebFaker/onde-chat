import {francAll} from 'franc-min';

export const LANGUAGES={fr:'Français',en:'Anglais',es:'Espagnol',de:'Allemand',it:'Italien',pt:'Portugais',nl:'Néerlandais',pl:'Polonais',ru:'Russe',uk:'Ukrainien',ar:'Arabe',zh:'Chinois',ja:'Japonais',ko:'Coréen',tr:'Turc',vi:'Vietnamien'};
const codes={fra:'fr',eng:'en',spa:'es',deu:'de',ita:'it',por:'pt',nld:'nl',pol:'pl',rus:'ru',ukr:'uk',arb:'ar',cmn:'zh',jpn:'ja',kor:'ko',tur:'tr',vie:'vi'};
export function detectLanguage(text){
 const ranked=francAll(text,{only:Object.keys(codes),minLength:15});
 // Short, ambiguous chat phrases are not reliable enough to translate automatically.
 if(ranked[0]?.[0]==='und'||(ranked[1]&&ranked[0][1]-ranked[1][1]<0.08))return null;
 return codes[ranked[0]?.[0]]||null;
}
export function chunks(text,maxBytes=450){
 // Preserve paragraph separators; never submit multiple paragraphs to MyMemory.
 const result=[],encoder=new TextEncoder();
 for(const paragraph of text.split(/(\r?\n+)/)){
  if(!paragraph)continue;
  if(/^\s+$/.test(paragraph)){result.push({text:paragraph,literal:true});continue;}
  let part='';for(const word of paragraph.split(/(?<=\s)/u)){
   if(encoder.encode(part+word).length<=maxBytes){part+=word;continue;}
   if(part){result.push({text:part,literal:false});part='';}
   for(const char of word){if(encoder.encode(part+char).length>maxBytes){result.push({text:part,literal:false});part='';}part+=char;}
  }if(part)result.push({text:part,literal:false});
 }return result;
}
function decode(value){if(typeof document==='undefined')return value;const area=document.createElement('textarea');area.innerHTML=value;return area.value;}
export class TranslationEngine{
 constructor({scope=globalThis,fetcher=(...args)=>fetch(...args)}={}){this.scope=scope;this.fetcher=fetcher;this.cache=new Map();this.pending=new Map();this.translators=new Map();this.controller=new AbortController();this.tail=Promise.resolve();this.generation=0;this.cooldown=0;}
 get localAvailable(){return typeof this.scope.Translator?.create==='function'&&typeof this.scope.Translator?.availability==='function';}
 cancel(){this.generation++;this.controller.abort();this.controller=new AbortController();this.pending.clear();this.tail=Promise.resolve();}
 dispose(){this.cancel();this.cache.clear();this.detector?.destroy?.();this.detector=null;for(const promise of this.translators.values())promise.then(t=>t.destroy?.()).catch(()=>{});this.translators.clear();}
 async prepare(source,target,onProgress=()=>{}){
  if(!this.localAvailable)throw Error('La traduction locale n’est pas disponible sur cet appareil. Tu peux activer le mode en ligne dans les réglages.');
  if(!LANGUAGES[source]||!LANGUAGES[target])throw Error('Choisis les langues de départ et d’arrivée.');
  if(source===target)return null;
  const key=source+':'+target;
  if(!this.translators.has(key)){
   const options={sourceLanguage:source,targetLanguage:target};
   const pending=(async()=>{const availability=await this.scope.Translator.availability(options);if(availability==='unavailable')throw Error('Cette paire de langues n’est pas disponible sur cet appareil.');if(availability!=='available'&&this.scope.navigator?.userActivation?.isActive===false)throw Error('Clique sur Traduire pour charger cette langue sur ton appareil.');return this.scope.Translator.create({...options,monitor(m){m.addEventListener('downloadprogress',e=>onProgress('Téléchargement de la langue : '+Math.round(e.loaded*100)+' %'));}});})();
   this.translators.set(key,pending);pending.catch(()=>this.translators.delete(key));
  }return this.translators.get(key);
 }
 async detect(text){
  if(this.scope.LanguageDetector){try{if(!this.detector)this.detector=await this.scope.LanguageDetector.create();const ranked=await this.detector.detect(text);const first=ranked[0],code=first?.detectedLanguage?.split('-')[0];if(first?.confidence>=0.75&&LANGUAGES[code])return code;}catch{/* Offline statistical detector below, without uploading the text. */}}
  return detectLanguage(text);
 }
 translate(text,{source='auto',target='fr',online=false,onProgress=()=>{}}={}){
  if(typeof text!=='string'||!text.trim()||text.length>2000)return Promise.reject(Error('Traduction : 1 à 2 000 caractères.'));
  if(!LANGUAGES[target]||(source!=='auto'&&!LANGUAGES[source]))return Promise.reject(Error('Langue invalide.'));
  const key=JSON.stringify([source,target,online,text]);if(this.cache.has(key))return Promise.resolve(this.cache.get(key));if(this.pending.has(key))return this.pending.get(key);
  const generation=this.generation,signal=this.controller.signal;
  const run=async()=>{if(signal.aborted)throw new DOMException('Annulé','AbortError');const detected=source==='auto'?await this.detect(text):source;if(!detected)throw Error('Langue incertaine. Choisis la langue du message pour le traduire.');let result;
   if(detected===target)result={text,source:detected,target,engine:'same'};
   else if(online){if(Date.now()<this.cooldown)throw Error('Le quota du service gratuit est atteint. Réessaie plus tard.');result={text:await this.remote(text,detected,target,signal),source:detected,target,engine:'online'};}
   else{onProgress('Préparation de la traduction locale…');const translator=await this.prepare(detected,target,onProgress);result={text:await translator.translate(text,{signal}),source:detected,target,engine:'local'};}
   if(signal.aborted||generation!==this.generation)throw new DOMException('Annulé','AbortError');if(!result.text?.trim())throw Error('Aucune traduction reçue. Le texte original est conservé.');this.cache.set(key,result);if(this.cache.size>200)this.cache.delete(this.cache.keys().next().value);return result;
  };
  const promise=this.tail.then(run);this.tail=promise.catch(()=>{});this.pending.set(key,promise);promise.finally(()=>{if(this.pending.get(key)===promise)this.pending.delete(key);}).catch(()=>{});return promise;
 }
 async remote(text,source,target,signal){
  const translated=[];
  for(const part of chunks(text)){
   if(signal.aborted)throw new DOMException('Annulé','AbortError');if(part.literal){translated.push(part.text);continue;}
   const url=new URL('https://api.mymemory.translated.net/get');url.searchParams.set('q',part.text.trim());url.searchParams.set('langpair',source+'|'+target);
   let response,data;try{response=await this.fetcher(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(15000)]),credentials:'omit',referrerPolicy:'no-referrer'});data=await response.json();}catch(e){if(signal.aborted)throw e;throw Error('Le service de traduction ne répond pas. Ton texte est conservé.');}
   if(!data||typeof data!=='object')throw Error('Réponse de traduction invalide. Ton texte est conservé.');
   if(response.status===429||data.quotaFinished||Number(data.responseStatus)===429){this.cooldown=Date.now()+60000;throw Error('Le quota du service gratuit est atteint. Réessaie plus tard.');}
   if(!response.ok||Number(data.responseStatus)!==200)throw Error('La traduction est momentanément indisponible. Ton texte est conservé.');
   // Never substitute an unrelated memory match when machine translation is empty.
   const value=data.responseData?.translatedText;if(typeof value!=='string'||!value.trim())throw Error('Aucune traduction fiable reçue. Réessaie avec une autre formulation.');
   translated.push((part.text.match(/^\s*/)?.[0]||'')+decode(value)+(part.text.match(/\s*$/)?.[0]||''));
  }return translated.join('');
 }
}
