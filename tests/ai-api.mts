import assert from 'node:assert/strict';
import auth from '../api/auth.ts';
import chat from '../api/chat.ts';
import { pool } from '../server/stateStore.ts';
const nativeFetch=globalThis.fetch;
const oldKey=process.env.AI_API_KEY;const oldModel=process.env.AI_MODEL;
process.env.AI_API_KEY='AIza-fictional-unit-test-only';process.env.AI_MODEL='test-model';process.env.AI_MAX_ATTEMPTS='1';process.env.AI_REQUESTS_PER_MINUTE='100';process.env.AI_GLOBAL_REQUESTS_PER_MINUTE='100';
let cookie='',owner='';
async function call(handler:any,body:unknown){let data:any;const headers:Record<string,any>={};const res:any={statusCode:200,setHeader:(k:string,v:unknown)=>headers[k]=v,getHeader:(k:string)=>headers[k],end:(text:string)=>data=JSON.parse(text)};await handler({method:'POST',headers:{host:'localhost',cookie},body} as any,res);if(headers['Set-Cookie'])cookie=headers['Set-Cookie'].map((x:string)=>x.split(';')[0]).join('; ');return{status:res.statusCode,data,headers};}
try{
 const login=await call(auth,{login:'a.volkov@my.mgimo.ru',password:'mgimo2026'});assert.equal(login.status,200);owner=login.data.account.id;
 const question={ownerId:owner,language:'en',messages:[{role:'user',content:'When is my class?'}]};
 globalThis.fetch=async(input,init)=>{assert(String(input).includes('/models/test-model:generateContent'));const body=JSON.parse(String(init?.body));assert(body.systemInstruction.parts[0].text.includes('на английском'));assert(!('temperature' in body.generationConfig));assert.equal(body.contents.at(-1).role,'user');return new Response(JSON.stringify({candidates:[{content:{parts:[{thought:true,text:'hidden'},{text:'Visible answer'}]}}]}),{status:200,headers:{'Content-Type':'application/json'}})};
 assert.equal((await call(chat,question)).data.response,'Visible answer');
 for(const status of [403,404,503]){let count=0;globalThis.fetch=async()=>{count++;return new Response('{}',{status,headers:{'Retry-After':'1'}})};const result=await call(chat,question);assert.equal(result.status,status);assert.equal(count,1);if(status===429)assert.equal(result.headers['Retry-After'],'1');}
 globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[]}),{status:200});assert.equal((await call(chat,question)).status,502);
 process.env.AI_REQUEST_TIMEOUT_MS='5';globalThis.fetch=(_input,init)=>new Promise((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))));assert.equal((await call(chat,question)).status,504);
 globalThis.fetch=async()=>new Response('{}',{status:429,headers:{'Retry-After':'1'}});const limited=await call(chat,question);assert.equal(limited.status,429);assert.equal(limited.headers['Retry-After'],'1');
 console.log('PASS: Gemini model/language, visible parts, provider statuses, Retry-After, empty response, timeout. Provider mocked; no real Gemini request.');
}finally{globalThis.fetch=nativeFetch;if(oldKey===undefined)delete process.env.AI_API_KEY;else process.env.AI_API_KEY=oldKey;if(oldModel===undefined)delete process.env.AI_MODEL;else process.env.AI_MODEL=oldModel;await pool?.end();}
