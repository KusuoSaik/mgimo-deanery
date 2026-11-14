import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
const env={...process.env,ALLOWED_ORIGIN:'http://localhost:5173',VITE_API_PORT:'3001'};
const children=[];let browser;let debugPage;let serverLog='';const errors=[];
function start(args){const child=spawn(process.execPath,args,{env,stdio:['ignore','pipe','pipe']});for(const stream of [child.stdout,child.stderr])stream.on('data',data=>serverLog+=data);children.push(child);return child;}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function ready(url){for(let n=0;n<100;n++){try{await fetch(url);return;}catch{await pause(100);}}throw new Error('Local server did not start: '+serverLog);}
const out=process.env.SMOKE_SCREENSHOTS || '/tmp/mgimo-smoke';
try{
 start(['--import','tsx','server/dev-proxy.ts']);start(['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort']);
 await Promise.all([ready('http://localhost:5173'),ready('http://localhost:3001/api/auth')]);
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE_PATH||undefined,args:process.env.BROWSER_ARGS?JSON.parse(process.env.BROWSER_ARGS):[]});
 const context=await browser.newContext({viewport:{width:360,height:800},deviceScaleFactor:1});
 const page=await context.newPage();debugPage=page;page.on('pageerror',e=>errors.push(e.message));
 const nav=()=>page.getByRole('navigation');
 async function login(email,password){await page.locator('#login').fill(email);await page.locator('#password').fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('heading',{name:'My priorities',exact:true}).waitFor();}
 async function noOverflow(label){await pause(700);const good=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);if(!good){console.log(await page.evaluate(()=>[...document.querySelectorAll('*')].map(e=>({tag:e.tagName,cls:e.className,text:e.textContent?.slice(0,60),right:e.getBoundingClientRect().right,left:e.getBoundingClientRect().left})).filter(e=>e.right>innerWidth+1||e.left< -1).slice(-20)));await page.screenshot({path:out+'/overflow.png',fullPage:true});}assert(good,`Horizontal overflow: ${label}`);}
 await page.goto('http://localhost:5173');await page.getByRole('button',{name:'English',exact:true}).click();
 await login('a.volkov@my.mgimo.ru','mgimo2026');
 const a=await context.request.get('http://localhost:5173/api/student');const owner=(await a.json()).account.id;
 await context.request.post('http://localhost:5173/api/student',{data:{action:'reset_demo',ownerId:owner}});await page.reload();await page.getByRole('heading',{name:'My priorities',exact:true}).waitFor();
 await noOverflow('home 360');await mkdir(out,{recursive:true});await page.screenshot({path:out+'/home-360-en.png',fullPage:true});
 await page.getByLabel('Purpose (no passport details)').fill('Mobile smoke');await page.getByRole('button',{name:'Confirm submission',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.waitFor();assert((await dialog.innerText()).includes('Mobile smoke'));
 // The guided form must open the exact new request, then advance the persisted server state.
 const created=(await(await context.request.get('http://localhost:5173/api/student')).json()).account.requestsData.find(r=>r.title.includes('Mobile smoke'));assert(created);
 await dialog.getByRole('button',{name:'Demo: next stage',exact:true}).click();
 await page.waitForFunction(async({id})=>{const data=await(await fetch('/api/student')).json();return data.account.requestsData.find(r=>r.id===id)?.stage===2;},{id:created.id});
 // Tab remains in the dialog even after the parent rerenders while an API response arrives.
 for(let i=0;i<15;i++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>Boolean(document.activeElement?.closest('[role="dialog"]'))));}
 await page.screenshot({path:out+'/request-360-en.png',fullPage:true});await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 for(const section of ['Schedule','Grades','Requests','Profile']){await nav().getByRole('button',{name:section,exact:true}).click();await pause(250);await noOverflow(section+' 360');}
 await nav().getByRole('button',{name:'Home',exact:true}).click();
 await page.getByText('Accessibility',{exact:true}).click();await page.getByLabel('Larger text',{exact:true}).check();await page.getByLabel('High contrast',{exact:true}).check();await page.getByLabel('Reduce motion',{exact:true}).check();
 await nav().getByRole('button',{name:'Schedule',exact:true}).click();
 assert(await page.evaluate(()=>['large-text','high-contrast','no-motion'].every(c=>document.documentElement.classList.contains(c))));await noOverflow('accessible schedule 360');
 const selectedColor=await page.locator('[role=tablist]').first().getByRole('tab',{selected:true}).evaluate(node=>getComputedStyle(node).color);assert.equal(selectedColor,'rgb(15, 23, 42)','Selected week label must remain dark against the white pill');
 await page.screenshot({path:out+'/schedule-360-accessibility.png',fullPage:true});
 await nav().getByRole('button',{name:'Home',exact:true}).click();await page.getByText('Accessibility',{exact:true}).click();await page.getByLabel('Larger text',{exact:true}).uncheck();await page.getByLabel('High contrast',{exact:true}).uncheck();
 let aiCalls=0;let release;const gate=new Promise(resolve=>{release=resolve});
 await context.route('**/api/chat',async route=>{aiCalls++;await gate;await route.fulfill({status:429,contentType:'application/json',body:JSON.stringify({response:'Лимит провайдера ИИ исчерпан. Попробуйте позже.'})}).catch(()=>undefined);});
 await nav().getByRole('button',{name:'Assistant',exact:true}).click();await page.getByLabel('Message the assistant',{exact:true}).fill('Справка');await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByText('Справка',{exact:true}).waitFor();
 await nav().getByRole('button',{name:'Schedule',exact:true}).click();await nav().getByRole('button',{name:'Assistant',exact:true}).click();
 assert(await page.getByRole('button',{name:'Send',exact:true}).isDisabled());assert.equal(aiCalls,1);release();await page.getByText('The AI provider limit has been reached. Try again later.',{exact:true}).waitFor();
 await context.unroute('**/api/chat');
 let finishOld;const oldGate=new Promise(resolve=>{finishOld=resolve;});
 await context.route('**/api/chat',async route=>{await oldGate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({response:'OLD_A_RESPONSE'})}).catch(()=>undefined);});
 await page.getByLabel('Message the assistant',{exact:true}).fill('Old A message');await page.getByRole('button',{name:'Send',exact:true}).click();
 await nav().getByRole('button',{name:'Profile',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.locator('#login').waitFor();
 await login('d.sokolov@my.mgimo.ru','debt1234');finishOld();await pause(250);
 await nav().getByRole('button',{name:'Assistant',exact:true}).click();assert(!(await page.locator('body').innerText()).includes('OLD_A_RESPONSE'));assert(!(await page.locator('body').innerText()).includes('Old A message'));
 const bAfter=(await(await context.request.get('http://localhost:5173/api/student')).json()).account;assert(!bAfter.chatHistoryData.some(m=>['OLD_A_RESPONSE','Old A message'].includes(m.text)));
 await context.unroute('**/api/chat');await nav().getByRole('button',{name:'Profile',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.locator('#login').waitFor();await login('a.volkov@my.mgimo.ru','mgimo2026');
 for(const width of [430,1280]){await page.setViewportSize({width,height:900});await nav().getByRole('button',{name:'Home',exact:true}).click();await noOverflow('home '+width);await page.screenshot({path:out+`/home-${width}-en.png`,fullPage:true});}
 await page.setViewportSize({width:360,height:800});await nav().getByRole('button',{name:'Home',exact:true}).click();await page.getByRole('button',{name:'Русский',exact:true}).click();await page.getByRole('heading',{name:'Что мне важно',exact:true}).waitFor();await noOverflow('Russian home 360');await page.screenshot({path:out+'/home-360-ru.png',fullPage:true});await page.getByRole('button',{name:'English',exact:true}).click();
 // Check the existing request form and focus stability while typing.
 await nav().getByRole('button',{name:'Requests',exact:true}).click();await page.getByRole('button',{name:'New request',exact:true}).click();const title=page.locator('#request-title');await title.pressSequentially('Browser form',{delay:10});assert.equal(await title.inputValue(),'Browser form');assert(await title.evaluate(node=>node===document.activeElement));await page.getByRole('button',{name:'Submit request',exact:true}).click();await page.getByRole('dialog').filter({has:page.getByRole('heading',{name:'Browser form',exact:true})}).waitFor();await page.keyboard.press('Escape');
 // A second context has its own session and cannot read or advance A's request.
 const second=await browser.newContext({viewport:{width:360,height:800}});
 const bLogin=await second.request.post('http://localhost:5173/api/auth',{data:{login:'d.sokolov@my.mgimo.ru',password:'debt1234'}});assert.equal(bLogin.status(),200);const bOwner=(await bLogin.json()).account.id;
 const bState=(await(await second.request.get('http://localhost:5173/api/student')).json()).account;assert(!bState.requestsData.some(r=>r.id===created.id));
 assert.equal((await second.request.post('http://localhost:5173/api/student',{data:{ownerId:bOwner,action:'advance_demo_request',id:created.id}})).status(),404);
 await nav().getByRole('button',{name:'Profile',exact:true}).click();await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.locator('#login').waitFor();
 await login('a.volkov@my.mgimo.ru','mgimo2026');const restored=(await(await context.request.get('http://localhost:5173/api/student')).json()).account;assert(restored.requestsData.some(r=>r.id===created.id));
 assert.deepEqual(errors,[]);console.log('PASS: real browser, 360/430/1280 px, login/persistence, guided request detail, server stage advance, modal focus, RU/EN controls, accessibility persistence, chat navigation lock, provider error display, two browser contexts. Late response isolation and existing form verified. AI response mocked.');
}catch(error){console.error(serverLog.slice(-3000));console.log('PAGE ERRORS',errors);if(debugPage){console.log(await debugPage.evaluate(()=>({rootInert:document.getElementById('root')?.hasAttribute('inert'),dialogs:[...document.querySelectorAll('[role=dialog]')].map(x=>x.textContent),text:document.body.innerText.slice(-3000)})));await debugPage.screenshot({path:out+'/failure.png',fullPage:false}).catch(()=>undefined);}throw error;}
finally{await browser?.close();for(const child of children)child.kill('SIGTERM');}
