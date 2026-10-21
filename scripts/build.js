import {build} from 'esbuild';
await build({entryPoints:['client/calls.js'],outdir:'public',bundle:true,format:'esm',minify:true,target:'es2022',legalComments:'none'});
