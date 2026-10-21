import {existsSync} from 'node:fs';
import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',workers:1,timeout:45000,
 use:{baseURL:'http://127.0.0.1:3250',headless:true,launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']},screenshot:'only-on-failure',trace:'off'},
 webServer:{command:'node tests/browser-server.mjs',url:'http://127.0.0.1:3250',timeout:30000,reuseExistingServer:false},
 reporter:'list'
});
