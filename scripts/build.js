import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
const options={outdir:'public',bundle:true,format:'esm',minify:true,target:'es2022',legalComments:'none'};
await build({...options,entryPoints:['client/calls.js']});
const notices=await readFile(new URL('../client/translation-LICENSE.txt',import.meta.url),'utf8');
await build({...options,entryPoints:['client/translation.js'],banner:{js:'/*! Translation language detection: third-party notices\n'+notices+'\n*/'}});

const gpsNotices=await readFile(new URL('../node_modules/tz-lookup/LICENSE',import.meta.url),'utf8');
await build({...options,entryPoints:['client/location.js'],banner:{js:'/*! tz-lookup notice\n'+gpsNotices+'\n*/'}});
