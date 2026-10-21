import {getApplication} from '../lib/runtime.js';
export default function handler(req,res){
  const url=new URL(req.url,'http://localhost');
  const route=url.searchParams.get('__route');
  if(route!==null){url.searchParams.delete('__route');req.url='/api/'+route+(url.searchParams.size?'?'+url.searchParams.toString():'');}
  return getApplication()(req,res);
}
