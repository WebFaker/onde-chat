import {getApplication} from '../lib/runtime.js';
export default function handler(req,res){return getApplication()(req,res);}
