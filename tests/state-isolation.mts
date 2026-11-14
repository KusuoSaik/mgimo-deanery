import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import auth from '../api/auth.ts';
import student from '../api/student.ts';
import chat from '../api/chat.ts';
import { loadState, persistState, StateConflict, pool } from '../server/stateStore.ts';
const jars: Record<string, Record<string,string>> = { a:{}, b:{} };
const accounts: Record<string, any> = {};
async function call(who:string, handler:any, method:string, body?:Record<string,unknown>, extraHeaders:Record<string,string>={}) {
 const headers:Record<string,any>={}; let data:any;
 const req:any={method,headers:{host:'localhost',cookie:Object.entries(jars[who]).map(([k,v])=>`${k}=${v}`).join('; '),...extraHeaders},body:body?{ownerId:accounts[who]?.id,chatGeneration:accounts[who]?.chatGeneration??0,...body}:undefined};
 const res:any={statusCode:200,setHeader:(k:string,v:unknown)=>headers[k]=v,getHeader:(k:string)=>headers[k],end:(s:string)=>{data=s?JSON.parse(s):undefined;}};
 await handler(req,res);
 for(const x of headers['Set-Cookie']||[]){const pair=x.split(';')[0],i=pair.indexOf('=');jars[who][pair.slice(0,i)]=pair.slice(i+1);}
 if(data?.account)accounts[who]=data.account;
 return {status:res.statusCode,data,headers};
}
try {
 assert.equal((await call('a',student,'GET')).status,401);
 const a=await call('a',auth,'POST',{login:'a.volkov@my.mgimo.ru',password:'mgimo2026'});
 const b=await call('b',auth,'POST',{login:'d.sokolov@my.mgimo.ru',password:'debt1234'});
 assert.equal(a.status,200);assert.equal(b.status,200);
 await call('a',student,'POST',{action:'reset_demo'});
 const operationId=randomUUID();
 const r=await call('a',student,'POST',{action:'create_request',operationId,title:'Persistent request',category:'Справки',deliveryFormat:'Электронная с ЭЦП (PDF)'});
 const id=r.data.createdRequest.id;
 assert.equal((await call('a',student,'POST',{action:'create_request',operationId,title:'Persistent request',category:'Справки',deliveryFormat:'Электронная с ЭЦП (PDF)'})).data.createdRequest.id,id);
 assert.equal(accounts.a.requestsData.filter((x:any)=>x.id===id).length,1);
 await call('a',auth,'POST',{action:'logout'});
 await call('a',auth,'POST',{login:'a.volkov@my.mgimo.ru',password:'mgimo2026'});
 assert((await call('a',auth,'GET')).data.account.requestsData.some((x:any)=>x.id===id));
 assert(!(await call('b',auth,'GET')).data.account.requestsData.some((x:any)=>x.id===id));
 assert.equal((await call('b',student,'POST',{action:'advance_demo_request',id})).status,404);
 assert.equal((await call('b',student,'POST',{action:'update_chat',ownerId:accounts.a.id,messages:[]})).status,409);
 const [c1,c2]=await Promise.all(['Concurrent A','Concurrent B'].map(title=>call('a',student,'POST',{action:'create_request',title,category:'Справки',deliveryFormat:'Электронная с ЭЦП (PDF)'})));
 assert.equal(c1.status,200); assert.equal(c2.status,200);
 const all=(await call('a',student,'GET')).data.account.requestsData;
 assert(all.some((x:any)=>x.id===c1.data.createdRequest.id));assert(all.some((x:any)=>x.id===c2.data.createdRequest.id));
 assert([c1,c2].some(result=>result.data.account.requestsData.some((x:any)=>x.id===c1.data.createdRequest.id)&&result.data.account.requestsData.some((x:any)=>x.id===c2.data.createdRequest.id)));
 const stage=accounts.a.requestsData.find((x:any)=>x.id===id).stage;
 const operations=await Promise.all([
   call('a',student,'POST',{action:'advance_demo_request',id,expectedStage:stage}),
   call('a',student,'POST',{action:'update_chat',messages:[{id:randomUUID(),sender:'user',text:'Concurrent chat',timestamp:'12:00'}]}),
   call('a',student,'POST',{action:'mark_all_notifications_read'}),
 ]);
 assert(operations.every(result=>result.status===200));
 const final=(await call('a',student,'GET')).data.account;
 assert.equal(final.requestsData.find((x:any)=>x.id===id).stage,stage+1);
 assert(final.notificationsData.every((n:any)=>n.isRead));
 assert(final.chatHistoryData.some((m:any)=>m.text==='Concurrent chat'));
 await call('a',student,'POST',{action:'advance_demo_request',id,expectedStage:stage});
 assert.equal(accounts.a.requestsData.find((x:any)=>x.id===id).stage,stage+1);
 const oldGeneration=accounts.a.chatGeneration??0;
 await call('a',student,'POST',{action:'reset_demo'});
 assert(!accounts.a.requestsData.some((x:any)=>x.id===id));
 assert.equal((await call('a',student,'POST',{action:'update_chat',chatGeneration:oldGeneration,messages:[]})).status,409);
 assert.equal((await call('a',student,'POST',{action:'update_chat',messages:[{text:{bad:true}}]})).status,400);
 const seed={requests:[],notifications:[],chatHistory:[]};
 const key=`test-conflict-${randomUUID()}`,loaded=await loadState(key,seed);
 await persistState(key,loaded.version,seed);
 await assert.rejects(()=>persistState(key,loaded.version,seed),StateConflict);
 assert.equal((await call('a',student,'POST',{action:'reset_demo'},{origin:'https://evil.example'})).status,403);
 assert.equal((await call('a',chat,'POST',{messages:[],ownerId:accounts.a.id},{host:'example-preview.vercel.app',origin:'https://example-preview.vercel.app'})).status,400);
 if (!pool) {
   const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';
   for(const handler of [auth,student])assert.equal((await call('a',handler,'GET')).status,503);
   assert.equal((await call('a',student,'POST',{action:'reset_demo'})).status,503);
   assert.equal((await call('a',chat,'POST',{messages:[{role:'user',content:'test'}]})).status,503);
   if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;
 }
 console.log('PASS: persistence, ownership, idempotency, operation replay, response consistency, no stage rollback, notification preservation, reset generation, 503 handlers, preview origin. Storage:',pool?'PostgreSQL':'local memory');
} finally { if(pool)await pool.end(); }
