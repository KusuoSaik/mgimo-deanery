import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
if(!process.env.DATABASE_URL)throw new Error('Use a dedicated PostgreSQL test database.');
let active=0,max=0,entries=0;
await Promise.all([1,2].map(()=>new Promise<void>((resolve,reject)=>{
 const worker=fork(new URL('./ai-worker.mts',import.meta.url),{execArgv:['--import','tsx'],env:{...process.env,AI_MAX_CONCURRENCY:'1',AI_GLOBAL_REQUESTS_PER_MINUTE:'100',TEST_USER_KEY:randomUUID()},stdio:['ignore','ignore','pipe','ipc']});
 let errors='';worker.stderr?.on('data',chunk=>errors+=chunk);
 worker.on('message',(m:any)=>{if(m.event==='enter'){active++;entries++;max=Math.max(max,active)}else if(m.event==='leave')active--;});
 worker.on('error',reject);worker.on('exit',code=>code===0?resolve():reject(new Error(errors||`Worker exited ${code}`)));
})));
assert.equal(max,1);assert.equal(entries,2);assert.equal(active,0);console.log('PASS: one shared AI slot across two independent Node processes.');
