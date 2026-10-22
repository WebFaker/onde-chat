import {test,expect} from '@playwright/test';
async function signup(page,name,ip){await page.setExtraHTTPHeaders({'x-forwarded-for':ip});await page.goto('/');await page.locator('#auth-toggle').click();await page.locator('#name').fill(name);await page.locator('#email').fill(name+'@example.com');await page.locator('#password').fill('ringing-browser-password-123');await page.locator('#auth-submit').click();await expect(page.locator('#app')).toBeVisible();}
test('sonnerie entre deux comptes : refuser, accepter et raccrocher',async({browser})=>{
 const ca=await browser.newContext(),cb=await browser.newContext(),a=await ca.newPage(),b=await cb.newPage();
 for(const page of [a,b]){
 await page.addInitScript(()=>{window.notesStarted=0;window.mediaConnections=0;window.AudioContext=class {state='running';currentTime=0;destination={};async resume(){}createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}};}createOscillator(){return {frequency:{value:0},connect(){},start(){window.notesStarted++;},stop(){}};}};});
 await page.route('**/api/capabilities',route=>route.fulfill({json:{calls:true}}));await page.route('**/api/call',route=>route.fulfill({json:{url:'wss://test.invalid',token:'isolated-browser-token'}}));
 await page.route('**/calls.js',route=>route.fulfill({contentType:'text/javascript',body:`export async function connectCall({onState,onParticipants,onDisconnected}){window.mediaConnections++;onState({status:'connected'});onParticipants([{name:'Vous',local:true,mic:true}]);return {disconnect:async()=>onDisconnected(),mic:async()=>true,camera:async()=>false,screen:async()=>false};}`}));
 }
 try{
 await signup(a,'RingingCaller','192.0.2.220');await signup(b,'RingingRecipient','192.0.2.221');await expect(a.locator('.member').filter({hasText:'RingingRecipient'})).toBeVisible({timeout:12000});await a.locator('.member').filter({hasText:'RingingRecipient'}).click();await a.getByRole('button',{name:'Envoyer un message',exact:true}).click();
 await a.locator('#dm-call').click();await expect(a.locator('#outgoing-call')).toBeVisible();await expect(b.locator('#incoming-call')).toBeVisible({timeout:10000});await expect(b.locator('#incoming-name')).toContainText('RingingCaller');expect(await b.evaluate(()=>window.notesStarted)).toBeGreaterThan(0);expect(await b.evaluate(()=>window.mediaConnections)).toBe(0);
 await b.locator('#decline-call').click();await expect(b.locator('#incoming-call')).not.toBeVisible();await expect(a.locator('#call-dock')).not.toBeVisible({timeout:10000});
 await a.locator('#dm-call').click();await expect(b.locator('#incoming-call')).toBeVisible({timeout:10000});await b.locator('#accept-call').click();await expect(b.locator('#incoming-call')).not.toBeVisible();await expect(b.locator('#call-dock')).toBeVisible();expect(await b.evaluate(()=>window.mediaConnections)).toBe(1);await expect(a.locator('#outgoing-call')).not.toBeVisible({timeout:10000});
 await a.locator('#leave-call').click();await expect(b.locator('#call-dock')).not.toBeVisible({timeout:10000});
 await a.locator('#dm-call').click();await expect(b.locator('#incoming-call')).toBeVisible({timeout:10000});await b.locator('#ring-mute').click();await expect(b.locator('#ring-mute')).toHaveAttribute('aria-pressed','true');await a.locator('#cancel-outgoing').click();await expect(b.locator('#incoming-call')).not.toBeVisible({timeout:10000});
 }finally{await ca.close();await cb.close();}
});
