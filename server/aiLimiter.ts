import { randomUUID } from 'node:crypto';
import { env } from 'node:process';
import { pool } from './stateStore.js';
export class AiLimitError extends Error {
  constructor(message: string, readonly statusCode: number, readonly retryAfterMs = 0) { super(message); this.name = 'AiLimitError'; }
}
function positiveInteger(name: string, fallback: number): number {
  const value = Number(env[name]); return Number.isInteger(value) && value > 0 ? value : fallback;
}
const recent = new Map<string, number[]>();
const localLeases = new Map<string, number>();
let localCooldownUntil = 0;
const LOCK_ID = 73286541;
async function shared<T>(operation: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  if (!pool) throw new AiLimitError('Общее хранилище ИИ не настроено.', 503);
  const client = await pool.connect().catch(() => { throw new AiLimitError('Хранилище очереди ИИ временно недоступно.', 503); });
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [LOCK_ID]);
    const value = await operation(client);
    await client.query('COMMIT'); return value;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    if (error instanceof AiLimitError) throw error;
    console.error('AI shared limiter unavailable');
    throw new AiLimitError('Хранилище очереди ИИ временно недоступно.', 503);
  } finally { client.release(); }
}
async function consumeRate(key: string) {
  const limits = [[`user:${key}`, positiveInteger('AI_REQUESTS_PER_MINUTE',12)], ['global', positiveInteger('AI_GLOBAL_REQUESTS_PER_MINUTE',20)]] as const;
  if (pool) {
    await shared(async client => {
      const now = Number((await client.query('SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS now')).rows[0].now);
      const cooldown = await client.query("SELECT timestamps[1] AS until FROM ai_rate_limits WHERE key='provider-cooldown'");
      const until = Number(cooldown.rows[0]?.until || 0);
      if (until > now) throw new AiLimitError('Лимит провайдера ИИ исчерпан. Попробуйте позже.',429,until-now);
      for (const [scope,limit] of limits) {
        const row = await client.query('SELECT timestamps FROM ai_rate_limits WHERE key=$1', [scope]);
        const times = ((row.rows[0]?.timestamps ?? []) as string[]).map(Number).filter(t => now-t < 60000);
        if (times.length >= limit) throw new AiLimitError('Лимит запросов к ИИ исчерпан. Попробуйте через минуту.',429,Math.max(1000,60000-(now-times[0])));
        await client.query('INSERT INTO ai_rate_limits(key,timestamps) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET timestamps=EXCLUDED.timestamps', [scope,[...times,now]]);
      }
    }); return;
  }
  if (env.VERCEL || env.NODE_ENV === 'production') throw new AiLimitError('Общее хранилище ИИ не настроено.',503);
  const now=Date.now();
  if (localCooldownUntil > now) throw new AiLimitError('Лимит провайдера ИИ исчерпан. Попробуйте позже.',429,localCooldownUntil-now);
  for (const [scope,limit] of limits) if ((recent.get(scope)||[]).filter(t=>now-t<60000).length >= limit) throw new AiLimitError('Лимит запросов к ИИ исчерпан. Попробуйте через минуту.',429,60000);
  for (const [scope] of limits) recent.set(scope,[...(recent.get(scope)||[]).filter(t=>now-t<60000),now]);
}
async function recordProviderCooldown(delay: number) {
  if (pool) await shared(async client => {
    const now=Number((await client.query('SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS now')).rows[0].now);
    await client.query("INSERT INTO ai_rate_limits(key,timestamps) VALUES('provider-cooldown',$1) ON CONFLICT(key) DO UPDATE SET timestamps=ARRAY[GREATEST(ai_rate_limits.timestamps[1],EXCLUDED.timestamps[1])]",[[now+delay]]);
  });
  else localCooldownUntil=Math.max(localCooldownUntil,Date.now()+delay);
}
async function tryLease(id: string): Promise<boolean> {
  if (pool) return shared(async client => {
    const cooldown=await client.query("SELECT timestamps[1] - floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS remaining FROM ai_rate_limits WHERE key='provider-cooldown'");
    const remaining=Number(cooldown.rows[0]?.remaining || 0);
    if (remaining>0) throw new AiLimitError('Лимит провайдера ИИ исчерпан. Попробуйте позже.',429,remaining);
    await client.query('DELETE FROM ai_leases WHERE expires_at <= clock_timestamp()');
    const count = Number((await client.query('SELECT count(*) AS count FROM ai_leases')).rows[0].count);
    if(count>=positiveInteger('AI_MAX_CONCURRENCY',2)) return false;
    await client.query("INSERT INTO ai_leases(id,expires_at) VALUES($1,clock_timestamp()+interval '65 seconds')",[id]); return true;
  });
  if (localCooldownUntil>Date.now()) throw new AiLimitError('Лимит провайдера ИИ исчерпан. Попробуйте позже.',429,localCooldownUntil-Date.now());
  for(const [key,expiry] of localLeases) if(expiry<Date.now()) localLeases.delete(key);
  if(localLeases.size>=positiveInteger('AI_MAX_CONCURRENCY',2)) return false;
  localLeases.set(id,Date.now()+65000); return true;
}
const pause=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
async function timed<T>(task:(signal:AbortSignal)=>Promise<T>,ms:number):Promise<T>{
  const controller=new AbortController(); let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([task(controller.signal),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new AiLimitError('ИИ-сервис не ответил вовремя.',504));},ms);})]);}
  finally{if(timer)clearTimeout(timer);}
}
export async function runLimitedAi<T>(key:string,task:(signal:AbortSignal)=>Promise<T>):Promise<T>{
  const deadline=Date.now()+48000;
  await consumeRate(key);
  const id=randomUUID(),queueDeadline=Math.min(deadline,Date.now()+Math.min(10000,positiveInteger('AI_QUEUE_TIMEOUT_MS',10000)));
  while(!await tryLease(id)){if(Date.now()>=queueDeadline)throw new AiLimitError('Очередь ИИ занята. Повторите запрос позже.',503,5000);await pause(200);}
  try{
    for(let attempt=1;;attempt++){
      try{return await timed(task,Math.max(1,Math.min(positiveInteger('AI_REQUEST_TIMEOUT_MS',25000),25000,deadline-Date.now())));}
      catch(caught){
        let error=caught;
        if (error instanceof AiLimitError && error.statusCode===429) {
          const delay=error.retryAfterMs || 60000;
          await recordProviderCooldown(delay);
          error=new AiLimitError(error.message,429,delay);
        }
        const retryable=error instanceof AiLimitError ? [429,500,502,503,504].includes(error.statusCode) : error instanceof TypeError;
        const wait=Math.max(error instanceof AiLimitError?error.retryAfterMs:0,Math.min(250*2**(attempt-1),1500));
        if(!retryable||attempt>=Math.min(3,positiveInteger('AI_MAX_ATTEMPTS',3))||Date.now()+wait+1000>=deadline)throw error;
        await pause(wait);
      }
    }
  }finally{
    if(pool)await pool.query('DELETE FROM ai_leases WHERE id=$1',[id]).catch(()=>console.error('AI lease cleanup deferred until expiry'));
    else localLeases.delete(id);
  }
}
