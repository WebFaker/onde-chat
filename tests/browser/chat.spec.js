import {test,expect} from '@playwright/test';
let clientIP=0;
async function signup(page,name){await page.setExtraHTTPHeaders({'x-forwarded-for':'192.0.2.'+(++clientIP)});await page.goto('/');await page.locator('#auth-toggle').click();await page.locator('#name').fill(name);await page.locator('#email').fill(name+'@example.com');await page.locator('#password').fill('browser-test-password-123');await page.locator('#auth-submit').click();await expect(page.locator('#app')).toBeVisible();}
async function channel(page,name){page.once('dialog',d=>d.accept(name));await page.locator('#add-channel').click();await expect(page.locator('#channel-title')).toHaveText(name);}
test('desktop : comptes, salons, messages croisés, sauts de ligne, rechargement et sortie',async({browser})=>{
 const ca=await browser.newContext(),cb=await browser.newContext();const a=await ca.newPage(),b=await cb.newPage();const errors=[];a.on('pageerror',e=>errors.push(e.message));b.on('pageerror',e=>errors.push(e.message));
 await signup(a,'BrowserAlice');await signup(b,'BrowserBob');await channel(a,'browser-chat');
 await expect(b.locator('#channels')).toContainText('browser-chat',{timeout:12000});await b.getByRole('button',{name:/^#\s*browser-chat$/,exact:true}).click();
 await a.locator('#message').fill('Bonjour Bob');await a.locator('#message').press('Enter');await expect(a.locator('#message')).toHaveValue('');await expect(b.locator('#messages')).toContainText('Bonjour Bob',{timeout:12000});
 await b.locator('#message').fill('Première ligne');await b.locator('#message').press('Shift+Enter');await b.locator('#message').pressSequentially('Deuxième ligne');await expect(b.locator('#message')).toHaveValue('Première ligne\nDeuxième ligne');await b.locator('#message').press('Enter');await expect(a.locator('#messages')).toContainText('Deuxième ligne',{timeout:12000});
 await a.locator('#message').fill('<img src=x onerror="window.hacked=true">');await a.locator('#message').press('Enter');await expect(a.locator('#messages')).toContainText('<img');expect(await a.evaluate(()=>window.hacked)).toBeUndefined();
 await a.getByRole('button',{name:/^#\s*général$/,exact:true}).click();await expect(a.locator('#messages')).not.toContainText('Bonjour Bob');await a.getByRole('button',{name:/^#\s*browser-chat$/,exact:true}).click();await expect(a.locator('#messages')).toContainText('Bonjour Bob');
 await a.reload();await expect(a.locator('#app')).toBeVisible();await a.getByRole('button',{name:/^#\s*browser-chat$/,exact:true}).click();await expect(a.locator('#messages')).toContainText('Deuxième ligne');
 await a.screenshot({path:'test-results/desktop-chat.png'});
 await a.locator('#logout').click();await expect(a.locator('#auth')).toBeVisible();await a.locator('#email').fill('BrowserAlice@example.com');await a.locator('#password').fill('incorrect-password');await a.locator('#auth-submit').click();await expect(a.locator('#auth-error')).toContainText('incorrect');await a.locator('#password').fill('browser-test-password-123');await a.locator('#auth-submit').click();await expect(a.locator('#app')).toBeVisible();expect(errors).toEqual([]);
 await ca.close();await cb.close();
});
test('mobile : menu, sélection de salon, message long et absence de débordement',async({browser})=>{
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await c.newPage();await signup(page,'BrowserMobile');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('.sidebar')).not.toBeVisible();await page.locator('#mobile-menu').click();await expect(page.locator('.sidebar')).toBeVisible();await page.getByRole('button',{name:/^#\s*projets$/,exact:true}).click();await expect(page.locator('.sidebar')).not.toBeVisible();await expect(page.locator('#channel-title')).toHaveText('projets');
 await page.locator('#message').fill('Texte mobile '+ 'x'.repeat(400));await page.locator('#message').press('Enter');await expect(page.locator('#messages')).toContainText('Texte mobile');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('#composer')).toBeInViewport();await page.screenshot({path:'test-results/mobile-chat.png'});await c.close();
});
test('réseau : un envoi échoué conserve le brouillon puis permet de réessayer',async({page})=>{
 await signup(page,'BrowserOffline');await page.route('**/api/messages?channel=1',async route=>{if(route.request().method()==='POST')await route.abort();else await route.continue();});await page.locator('#message').fill('Brouillon conservé');await page.locator('#message').press('Enter');await expect(page.locator('#error')).not.toBeEmpty();await expect(page.locator('#message')).toHaveValue('Brouillon conservé');await page.unroute('**/api/messages?channel=1');await page.locator('#message').press('Enter');await expect(page.locator('#message')).toHaveValue('');await expect(page.locator('#messages')).toContainText('Brouillon conservé');
});
test('brouillons par salon, double envoi et changement de salon pendant un envoi',async({page})=>{
 await signup(page,'BrowserDraft');
 await page.locator('#message').fill('Brouillon général');await page.getByRole('button',{name:/^#\s*projets$/}).click();await expect(page.locator('#message')).toHaveValue('');await page.locator('#message').fill('Brouillon projets');await page.getByRole('button',{name:/^#\s*général$/}).click();await expect(page.locator('#message')).toHaveValue('Brouillon général');
 let sends=0,release;const gate=new Promise(r=>release=r);await page.route('**/api/messages?channel=1',async route=>{if(route.request().method()==='POST'){sends++;await gate;await route.continue();}else await route.continue();});
 await page.locator('#message').fill('Envoi unique');await page.locator('#message').press('Enter');await expect(page.locator('#composer button')).toBeDisabled();await page.locator('#message').press('Enter');await page.locator('#message').fill('Nouveau brouillon pendant envoi');await page.getByRole('button',{name:/^#\s*projets$/}).click();await expect(page.locator('#message')).toHaveValue('Brouillon projets');release();await expect(page.locator('#composer button')).toBeEnabled();await expect(page.locator('#message')).toHaveValue('Brouillon projets');expect(sends).toBe(1);
 await page.getByRole('button',{name:/^#\s*général$/}).click();await expect(page.locator('#messages')).toContainText('Envoi unique');await expect(page.locator('#message')).toHaveValue('Nouveau brouillon pendant envoi');
});
test('mobile : fermer le menu avec Échap, puis en cliquant dans la conversation',async({browser})=>{
 const context=await browser.newContext({viewport:{width:360,height:640}}),page=await context.newPage();await signup(page,'BrowserMenu');await page.locator('#mobile-menu').click();await expect(page.locator('#mobile-menu')).toHaveAttribute('aria-expanded','true');await page.keyboard.press('Escape');await expect(page.locator('.sidebar')).not.toBeVisible();await page.locator('#mobile-menu').click();await page.locator('main').click({position:{x:340,y:300}});await expect(page.locator('.sidebar')).not.toBeVisible();await expect(page.locator('#mobile-menu')).toHaveAttribute('aria-expanded','false');await context.close();
});
