import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { pool } from '../server/stateStore.ts';
if (!pool) throw new Error('Use an isolated PostgreSQL DATABASE_URL');
const owner = 'restart-test-' + randomUUID();
const seed = { requests: [], notifications: [], chatHistory: [] };
function child(code: string) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], { env: process.env, encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr);
}
try {
  child(`import { mutateState, pool } from './server/stateStore.ts'; await mutateState(${JSON.stringify(owner)}, ${JSON.stringify(seed)}, s => s.chatGeneration = 42); await pool.end();`);
  child(`import assert from 'node:assert/strict'; import { loadState, pool } from './server/stateStore.ts'; const a = await loadState(${JSON.stringify(owner)}, ${JSON.stringify(seed)}); const b = await loadState(${JSON.stringify(owner + '-other')}, ${JSON.stringify(seed)}); assert.equal(a.data.chatGeneration, 42); assert.equal(b.data.chatGeneration, undefined); await pool.end();`);
  child(`import { consumeLoginAttempt } from './server/authLimiter.ts'; import { pool } from './server/stateStore.ts'; for (let i=0;i<30;i++) await consumeLoginAttempt(${JSON.stringify(owner)}); await pool.end();`);
  child(`import assert from 'node:assert/strict'; import { consumeLoginAttempt, LoginLimitError } from './server/authLimiter.ts'; import { pool } from './server/stateStore.ts'; await assert.rejects(()=>consumeLoginAttempt(${JSON.stringify(owner)}), LoginLimitError); await pool.end();`);
  console.log('PASS: PostgreSQL retains account state and login quotas across independent Node processes; another owner remains isolated.');
} finally {
  await pool.query('DELETE FROM student_state WHERE owner_id = ANY($1::text[])', [[owner, owner + '-other']]);
  await pool.query('DELETE FROM auth_attempts WHERE key=$1', [createHash('sha256').update(owner).digest('hex')]);
  await pool.end();
}
