import assert from 'node:assert/strict';
import auth from '../api/auth.ts';
import student from '../api/student.ts';
import {loadState,persistState,StateConflict} from '../server/stateStore.ts';
const jars:Record<string,Record<string,string>>={a:{},b:{}};
async function call(who:string, handler:any, method:string, body?:unknown){
 const headers:Record<string,any>={};let data:any;
 const req:any={method,headers:{host:'localhost',cookie:Object.entries(jars[who]).map(([k,v])=>`${k}=${v}`).join('; ')},body};
 const res:any={statusCode:200,setHeader:(k:string,v:unknown)=>headers[k]=v,getHeader:(k:string)=>headers[k],end:(s:string)=>data=JSON.parse(s)};
 await handler(req,res);
 for(const x of headers['Set-Cookie']||[]){const pair=x.split(';')[0],i=pair.indexOf('=');jars[who][pair.slice(0,i)]=pair.slice(i+1);}
 return {status:res.statusCode,data};
}
await call('a',auth,'POST',{login:'a.volkov@my.mgimo.ru',password:'mgimo2026'});
await call('b',auth,'POST',{login:'d.sokolov@my.mgimo.ru',password:'debt1234'});
const r=await call('a',student,'POST',{action:'create_request',title:'Persistent request',category:'Справки',deliveryFormat:'Электронная с ЭЦП (PDF)'});
const id=r.data.account.requestsData[0].id;
await call('a',auth,'POST',{action:'logout'});
await call('a',auth,'POST',{login:'a.volkov@my.mgimo.ru',password:'mgimo2026'});
assert((await call('a',auth,'GET')).data.account.requestsData.some((x:any)=>x.id===id));
assert(!(await call('b',auth,'GET')).data.account.requestsData.some((x:any)=>x.id===id));
assert.equal((await call('b',student,'POST',{action:'advance_demo_request',id})).status,404);
const seed={requests:[],notifications:[],chatHistory:[]};
const loaded=await loadState('test-conflict',seed);
await persistState('test-conflict',loaded.version,seed);
await assert.rejects(()=>persistState('test-conflict',loaded.version,seed),StateConflict);
console.log('PASS: re-login persistence, owner isolation, foreign ID rejected, stale write rejected. Storage: local development memory.');
