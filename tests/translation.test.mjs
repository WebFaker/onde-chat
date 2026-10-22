import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TranslationEngine,chunks,detectLanguage} from '../client/translation.js';
test('language detection avoids uncertain short phrases and UTF-8 chunks preserve text',()=>{
 assert.equal(detectLanguage('Hello!'),null);assert.equal(detectLanguage('Hello, how are you today?'),null);
 assert.equal(detectLanguage('See you tomorrow at the train station.'),'en');assert.equal(detectLanguage('Bonjour, comment vas-tu aujourd’hui ?'),'fr');
 const original=('Bonjour 🌍 你好 ! '.repeat(80))+'\n\n'+('Très bien. '.repeat(80));const parts=chunks(original);assert.equal(parts.map(p=>p.text).join(''),original);for(const p of parts)if(!p.literal){assert.ok(new TextEncoder().encode(p.text).length<=450);assert.ok(!p.text.includes('\n'));}
});
test('online mode requires explicit enablement, deduplicates and caches in memory',async()=>{
 let count=0;const engine=new TranslationEngine({scope:{},fetcher:async(url,options)=>{count++;assert.equal(new URL(url).hostname,'api.mymemory.translated.net');assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');return {ok:true,status:200,json:async()=>({responseStatus:200,responseData:{translatedText:'À demain à la gare.'}})};}});
 await assert.rejects(engine.translate('See you tomorrow at the train station.',{source:'en'}),/locale/);assert.equal(count,0);
 const options={source:'en',target:'fr',online:true};const [a,b]=await Promise.all([engine.translate('See you tomorrow at the train station.',options),engine.translate('See you tomorrow at the train station.',options)]);assert.deepEqual(a,b);assert.equal(a.engine,'online');assert.equal(count,1);await engine.translate('See you tomorrow at the train station.',options);assert.equal(count,1);engine.dispose();assert.equal(engine.cache.size,0);
});
test('quota and malformed responses preserve original instead of displaying provider errors as translations',async()=>{
 const quota=new TranslationEngine({scope:{},fetcher:async()=>({ok:true,status:200,json:async()=>({responseStatus:200,quotaFinished:true,responseData:{translatedText:'limit exceeded'}})})});await assert.rejects(quota.translate('Hello',{source:'en',online:true}),/quota/);assert.equal(quota.cache.size,0);
 const empty=new TranslationEngine({scope:{},fetcher:async()=>({ok:true,status:200,json:async()=>({responseStatus:200,responseData:{translatedText:''},matches:[{translation:'unrelated'}]})})});await assert.rejects(empty.translate('Hello',{source:'en',online:true}),/fiable/);assert.equal(empty.cache.size,0);
});
test('local translation never calls external provider; canceled result cannot enter cache',async()=>{
 let finish;const engine=new TranslationEngine({scope:{Translator:{availability:async()=> 'available',create:async()=>({translate:()=>new Promise(resolve=>finish=resolve),destroy(){}})}},fetcher:()=>{throw Error('No network allowed');}});const pending=engine.translate('Hello',{source:'en'});while(!finish)await new Promise(resolve=>setTimeout(resolve,1));engine.cancel();finish('Bonjour');await assert.rejects(pending,e=>e.name==='AbortError');assert.equal(engine.cache.size,0);engine.dispose();
});
