import {createPool} from './database.js';
import {createAuth} from './auth.js';
import {createApplication} from './application.js';
let handler;
export function getApplication(){if(!handler){const pool=createPool();handler=createApplication({pool,auth:createAuth(pool)});}return handler;}
