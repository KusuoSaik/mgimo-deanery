import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import auth from '../api/auth.ts';
import student from '../api/student.ts';
import staff from '../api/staff.ts';
import chat from '../api/chat.ts';
import { loadState, persistState, StateConflict, pool } from '../server/stateStore.ts';
const jars: Record<string, Record<string, string>> = { a: {}, b: {}, staff: {} };
const accounts: Record<string, any> = {};
async function call(who: string, handler: any, method: string, body?: Record<string, unknown>, extraHeaders: Record<string, string> = {}) {
  const headers: Record<string, any> = {}; let data: any;
  const req: any = { method, headers: { host: 'localhost', cookie: Object.entries(jars[who]).map(([k, v]) => `${k}=${v}`).join('; '), ...extraHeaders }, body: body ? { ownerId: accounts[who]?.id, chatGeneration: accounts[who]?.chatGeneration ?? 0, ...body } : undefined };
  const res: any = { statusCode: 200, setHeader: (k: string, v: unknown) => headers[k] = v, getHeader: (k: string) => headers[k], end: (s: string) => { data = s ? JSON.parse(s) : undefined; } };
  await handler(req, res);
  for (const x of headers['Set-Cookie'] || []) { const pair = x.split(';')[0], i = pair.indexOf('='); jars[who][pair.slice(0, i)] = pair.slice(i + 1); }
  if (data?.account) accounts[who] = data.account;
  return { status: res.statusCode, data, headers };
}
try {
  assert.equal((await call('a', student, 'GET')).status, 401);
  assert.equal((await call('a', auth, 'POST', { login: 'a.volkov@my.mgimo.ru', password: 'wrong' })).status, 401);
  for (const [who, login, password] of [['a', 'a.volkov@my.mgimo.ru', 'mgimo2026'], ['b', 'd.sokolov@my.mgimo.ru', 'debt1234'], ['staff', 'dean.demo@my.mgimo.ru', 'dean2026demo']]) assert.equal((await call(who, auth, 'POST', { login, password })).status, 200);
  assert.equal(accounts.a.accessRole, 'student'); assert.equal(accounts.staff.accessRole, 'staff');
  assert(!JSON.stringify(accounts.a).includes('passwordHash'));
  assert(accounts.a.direction.includes('Юриспруденция')); assert(accounts.b.academicResultsData.some((r: any) => r.result === '2'));
  assert.equal((await call('a', staff, 'GET')).status, 403);
  assert.equal((await call('staff', student, 'GET')).status, 403);
  await call('a', student, 'POST', { action: 'reset_demo' });
  const operationId = randomUUID(), create = { action: 'create_request', operationId, title: 'Persistent request', category: 'Справки', deliveryFormat: 'Электронная с ЭЦП (PDF)' };
  const r = await call('a', student, 'POST', create), id = r.data.createdRequest.id;
  assert.equal((await call('a', student, 'POST', create)).data.createdRequest.id, id);
  assert.equal(accounts.a.requestsData.filter((x: any) => x.id === id).length, 1);
  assert(accounts.a.requestDetailsData[id].dueAt);
  await call('a', auth, 'POST', { action: 'logout' });
  await call('a', auth, 'POST', { login: 'a.volkov@my.mgimo.ru', password: 'mgimo2026' });
  assert(accounts.a.requestsData.some((x: any) => x.id === id));
  assert(!(await call('b', auth, 'GET')).data.account.requestsData.some((x: any) => x.id === id));
  assert.equal((await call('a', student, 'POST', { action: 'advance_demo_request', id })).status, 403);
  assert.equal((await call('a', student, 'POST', { action: 'update_request', id, patch: { comment: 'fake staff' } })).status, 403);
  assert.equal((await call('b', student, 'POST', { action: 'cancel_request', id, expectedRevision: 0 })).status, 404);
  assert.equal((await call('b', student, 'POST', { action: 'update_chat', ownerId: accounts.a.id, messages: [] })).status, 409);
  const staffAction = (action: string, expectedRevision: number, text = '') => call('staff', staff, 'POST', { studentId: accounts.a.id, id, action, expectedRevision, text, operationId: randomUUID() });
  assert.equal((await staffAction('needs_info', 0, 'Уточните назначение справки')).status, 200);
  assert.equal((await staffAction('advance', 1)).status, 409);
  await call('a', student, 'GET');
  assert.equal(accounts.a.requestDetailsData[id].lifecycle, 'needs_info');
  assert.equal((await call('a', student, 'POST', { action: 'reply_request', id, expectedRevision: 1, text: 'Для вымышленной стажировки' })).status, 200);
  assert.equal((await call('a', student, 'POST', { action: 'reply_request', id, expectedRevision: 1, text: 'Повтор' })).status, 409);
  const [advance, writing, read] = await Promise.all([
    staffAction('advance', 2), call('a', student, 'POST', { action: 'update_chat', messages: [{ id: randomUUID(), sender: 'user', text: 'Concurrent chat', timestamp: '12:00' }] }), call('a', student, 'POST', { action: 'mark_all_notifications_read' }),
  ]); assert([advance, writing, read].every(r => r.status === 200));
  await call('a', student, 'GET'); assert.equal(accounts.a.requestsData.find((r: any) => r.id === id).stage, 2); assert(accounts.a.chatHistoryData.some((m: any) => m.text === 'Concurrent chat'));
  assert.equal((await staffAction('advance', 2)).status, 409);
  assert.equal((await call('a', student, 'POST', { action: 'cancel_request', id, expectedRevision: 3 })).status, 409);
  for (const revision of [3, 4, 5]) assert.equal((await staffAction('advance', revision)).status, 200);
  await call('a', student, 'GET'); assert.equal(accounts.a.requestsData.find((r: any) => r.id === id).stage, 5);
  const second = await call('a', student, 'POST', { ...create, operationId: randomUUID(), title: 'Cancel me' }), cancelId = second.data.createdRequest.id;
  assert.equal((await call('a', student, 'POST', { action: 'cancel_request', id: cancelId, expectedRevision: 0 })).status, 200);
  assert.equal((await call('staff', staff, 'POST', { action: 'advance', studentId: accounts.a.id, id: cancelId, expectedRevision: 1 })).status, 409);
  const gradeId = accounts.a.gradesData[0].id, slotId = accounts.a.consultationSlotsData[gradeId][0].id;
  const booked = await Promise.all([0, 1].map(() => call('a', student, 'POST', { action: 'book_consultation', gradeId, slotId })));
  assert.deepEqual(booked.map(x => x.status).sort(), [200, 409]);
  await call('a', student, 'GET'); const consultation = accounts.a.consultationsData[0]; assert(consultation && Date.parse(consultation.startsAt) > Date.now());
  assert.equal((await call('b', student, 'POST', { action: 'cancel_consultation', id: consultation.id })).status, 404);
  await call('a', auth, 'POST', { action: 'logout' }); await call('a', auth, 'POST', { login: 'a.volkov@my.mgimo.ru', password: 'mgimo2026' }); assert(accounts.a.consultationsData.some((c: any) => c.id === consultation.id));
  assert.equal((await call('a', student, 'POST', { action: 'cancel_consultation', id: consultation.id })).status, 200);
  assert.equal((await call('a', student, 'POST', { action: 'book_consultation', gradeId: accounts.b.gradesData[0].id, slotId })).status, 404);
  assert.equal((await call('a', student, 'POST', { action: 'book_consultation', gradeId, slotId: `${gradeId}:2000-01-01` })).status, 409);
  const oldGeneration = accounts.a.chatGeneration ?? 0; await call('a', student, 'POST', { action: 'reset_demo' });
  assert.equal(accounts.a.consultationsData.length, 0);
  assert.equal((await call('a', student, 'POST', { action: 'update_chat', chatGeneration: oldGeneration, messages: [] })).status, 409);
  assert.equal((await call('a', student, 'POST', { action: 'update_chat', messages: [{ text: { bad: true } }] })).status, 400);
  const seed = { requests: [], notifications: [], chatHistory: [] }, key = `test-conflict-${randomUUID()}`, loaded = await loadState(key, seed);
  await persistState(key, loaded.version, seed); await assert.rejects(() => persistState(key, loaded.version, seed), StateConflict);
  assert.equal((await call('a', student, 'POST', { action: 'reset_demo' }, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await call('staff', staff, 'POST', { action: 'advance' }, { origin: 'https://evil.example' })).status, 403);
  if (!pool) {
    const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
    for (const handler of [auth, student]) assert.equal((await call('a', handler, 'GET')).status, 503);
    assert.equal((await call('staff', staff, 'GET')).status, 503);
    assert.equal((await call('a', chat, 'POST', { messages: [{ role: 'user', content: 'test' }] })).status, 503);
    if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
  }
  console.log('PASS: student/staff roles, isolation, request clarification/cancellation, stage concurrency, consultation persistence, duplicate booking, stale dates, chat/reset, origin, storage failures. Storage:', pool ? 'PostgreSQL' : 'local memory');
} finally { if (pool) await pool.end(); }
