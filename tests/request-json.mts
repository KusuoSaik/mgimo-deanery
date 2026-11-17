import assert from 'node:assert/strict';
import { requestJson, ApiError } from '../src/auth/requestJson.ts';
import { SessionWork } from '../src/auth/sessionWork.ts';
const original = globalThis.fetch;
let calls = 0;
try {
  globalThis.fetch = async (_path, init) => {
    calls++;
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
  };
  const queue = new SessionWork(); queue.begin('student');
  const timeout = queue.run((_owner, signal) => requestJson('/api/student', { signal, method: 'POST' }, 15));
  const next = queue.run(async () => 'queue recovered');
  await assert.rejects(() => timeout, error => error instanceof ApiError && error.status === 504);
  assert.equal(await next, 'queue recovered'); assert.equal(calls, 1, 'Writes must never retry automatically');
  const controller = new AbortController();
  const cancelled = requestJson('/api/student', { signal: controller.signal }, 1000);
  controller.abort();
  await assert.rejects(() => cancelled, error => error instanceof Error && error.name === 'AbortError');
  globalThis.fetch = async (_path, init) => new Response(new ReadableStream({
    start(stream) {
      stream.enqueue(new TextEncoder().encode('{"partial":'));
      init?.signal?.addEventListener('abort', () => stream.error(new DOMException('Aborted', 'AbortError')), { once: true });
    },
  }));
  await assert.rejects(() => requestJson('/api/student', {}, 15), error => error instanceof ApiError && error.status === 504);
  globalThis.fetch = async () => new Response('<html>proxy failure</html>', { status: 502 });
  await assert.rejects(() => requestJson('/api/auth'), error => error instanceof ApiError && error.status === 502);
  globalThis.fetch = async () => new Response('null', { status: 200 });
  await assert.rejects(() => requestJson('/api/auth'), ApiError);
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(() => requestJson('/api/auth'), error => error instanceof ApiError && error.status === 0);
  globalThis.fetch = async (_path, init) => {
    assert.equal(new Headers(init?.headers).get('X-Test'), 'test');
    assert.equal(new Headers(init?.headers).get('Content-Type'), 'application/json');
    return new Response('{"ok":true}');
  };
  assert.deepEqual(await requestJson('/api/auth', { headers: new Headers({ 'X-Test': 'test' }) }), { ok: true });
  globalThis.fetch = async (_path, init) => {
    assert.equal(new Headers(init?.headers).get('Content-Type'), 'application/custom+json');
    return new Response('{}');
  };
  await requestJson('/api/auth', { headers: { 'content-type': 'application/custom+json' } });
} finally { globalThis.fetch = original; }
console.log('PASS: timeout releases queue, cancellation, no write retry, malformed JSON, network errors, Headers merging.');
