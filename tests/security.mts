import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { consumeLoginAttempt, LoginLimitError } from '../server/authLimiter.ts';
import { pool } from '../server/stateStore.ts';
import { readBody, verifyPassword, isAllowedOrigin, getAuthenticatedAccount, issueSession, findAccount } from '../api/_server.ts';
import type { ApiRequest, ApiResponse } from '../api/_server.ts';
import auth from '../api/auth.ts';
import { createApp } from '../server/app.ts';

const fake = (body: unknown, headers = {}) => ({ body, headers }) as ApiRequest;
try {
  for (const body of [[], null, '[]', { value: 'x'.repeat(256 * 1024) }]) await assert.rejects(() => readBody(fake(body)));
  const stream = Readable.from([Buffer.alloc(128 * 1024), Buffer.alloc(129 * 1024)]) as ApiRequest;
  stream.headers = {}; await assert.rejects(() => readBody(stream));
  assert.deepEqual(await readBody(fake('{"action":"login"}')), { action: 'login' });
  assert.equal(isAllowedOrigin(fake({}, { host: 'localhost:5173', 'sec-fetch-site': 'cross-site' })), false);
  assert.equal(isAllowedOrigin(fake({}, { host: 'localhost:5173', origin: 'http://localhost:5173' })), true);
  assert.equal(await verifyPassword(undefined, 'unknown'), false);
  assert.equal(await verifyPassword(findAccount('a.volkov@my.mgimo.ru'), 'mgimo2026'), true);
  let cookie = '';
  const res = { setHeader: (_key: string, value: string[]) => { cookie = value[0].split(';')[0]; }, getHeader: () => undefined } as unknown as ApiResponse;
  issueSession(fake({}, { host: 'localhost.attacker.test' }), res, findAccount('a.volkov@my.mgimo.ru')!.id);
  assert(getAuthenticatedAccount(fake({}, { cookie })));
  assert.equal(getAuthenticatedAccount(fake({}, { cookie: cookie + '.extra' })), null);
  assert.equal(getAuthenticatedAccount(fake({}, { cookie: cookie.replace('mgimo_session=', 'mgimo_session=forged') })), null);
  const identity = 'test-security-' + randomUUID();
  for (let i = 0; i < 30; i++) await consumeLoginAttempt(identity);
  await assert.rejects(() => consumeLoginAttempt(identity), LoginLimitError);
  // A separate process in production reads the same PostgreSQL counters.
  const account = findAccount('s.chen@my.mgimo.ru')!;
  if (pool) await pool.query('DELETE FROM auth_attempts WHERE key=$1', [(await import('node:crypto')).createHash('sha256').update(account.id).digest('hex')]);
  for (let i = 0; i < 30; i++) await consumeLoginAttempt(account.id);
  let data: unknown, retry = '';
  const response = { statusCode: 200, getHeader: () => undefined, setHeader: (key: string, value: string) => { if (key === 'Retry-After') retry = value; }, end: (value: string) => { data = JSON.parse(value); } } as unknown as ApiResponse;
  await auth({ method: 'POST', headers: { host: 'localhost' }, body: { login: account.email, password: 'china2025' } } as ApiRequest, response);
  assert.equal(response.statusCode, 429); assert(Number(retry) > 0); assert(data);
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const addr = server.address() as { port: number };
    const url = `http://127.0.0.1:${addr.port}`;
    const missing = await fetch(url + '/api/nonexistent'); assert.equal(missing.status, 404);
    assert.equal(missing.headers.get('x-frame-options'), 'DENY');
    assert.equal(missing.headers.get('x-powered-by'), null);
    const large = await fetch(url + '/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: 'x'.repeat(300_000) }) }); assert.equal(large.status, 413);
    const malformed = await fetch(url + '/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' }); assert.equal(malformed.status, 400);
    assert.equal((await fetch(url + '/healthz')).status, pool ? 200 : 503);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  console.log('PASS: login quotas/Retry-After, async password hashes, forged sessions, cross-site requests, body size/shape, HTTP headers and health check. Storage:', pool ? 'PostgreSQL' : 'memory');
} finally {
  if (pool) {
    const { createHash } = await import('node:crypto');
    await pool.query('DELETE FROM auth_attempts WHERE key=$1', [createHash('sha256').update(findAccount('s.chen@my.mgimo.ru')!.id).digest('hex')]);
    await pool.end();
  }
}
