import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { runLimitedAi, AiLimitError } from '../server/aiLimiter.ts';
import { pool } from '../server/stateStore.ts';
process.env.AI_MAX_CONCURRENCY='1';process.env.AI_REQUESTS_PER_MINUTE='2';process.env.AI_GLOBAL_REQUESTS_PER_MINUTE='100';
const key=randomUUID();let active=0,max=0;
try {
 await Promise.all([1,2].map(()=>runLimitedAi(key,async()=>{active++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,25));active--;return 'ok'})));
 assert.equal(max,1);
 await assert.rejects(()=>runLimitedAi(key,async()=>'bad'),(e:unknown)=>e instanceof AiLimitError&&e.statusCode===429);
 let attempts=0;
 await assert.rejects(()=>runLimitedAi(randomUUID(),async()=>{attempts++;throw new AiLimitError('Bad key',403)}));assert.equal(attempts,1);
 attempts=0;assert.equal(await runLimitedAi(randomUUID(),async()=>{attempts++;if(attempts===1)throw new AiLimitError('Temporary',503);return 'recovered'}),'recovered');assert.equal(attempts,2);
 assert.equal(await runLimitedAi(randomUUID(),async()=>'released'),'released');
 process.env.AI_MAX_ATTEMPTS='1';let providerCalls=0;await assert.rejects(()=>runLimitedAi(randomUUID(),async()=>{providerCalls++;throw new AiLimitError('Provider quota',429,300)}));await assert.rejects(()=>runLimitedAi(randomUUID(),async()=>{providerCalls++;return 'should not call'}),(e:unknown)=>e instanceof AiLimitError&&e.statusCode===429);assert.equal(providerCalls,1);await new Promise(resolve=>setTimeout(resolve,350));assert.equal(await runLimitedAi(randomUUID(),async()=>'cooldown expired'),'cooldown expired');
 console.log('PASS: shared/local concurrency, rate limit, no retry for invalid keys, transient retry, lease release. Storage:',pool?'PostgreSQL':'local memory');
}finally{if(pool)await pool.end();}
