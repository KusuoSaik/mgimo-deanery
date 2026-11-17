import assert from 'node:assert/strict';
import { performStudentAction, ApiError } from '../src/auth/authService.ts';

const original = globalThis.fetch;
try {
  for (const action of ['refresh', 'mark_all_notifications_read']) {
    globalThis.fetch = async () => new Response(JSON.stringify({ account: { id: 'second-student' } }), { status: 200 });
    await assert.rejects(() => performStudentAction(action, { ownerId: 'first-student' }),
      error => error instanceof ApiError && error.status === 409);
  }
  globalThis.fetch = async () => new Response(JSON.stringify({ account: { id: 'first-student' } }), { status: 200 });
  assert.equal((await performStudentAction('refresh', { ownerId: 'first-student' })).account.id, 'first-student');
} finally { globalThis.fetch = original; }
console.log('PASS: account identity checked on refresh and mutation responses after a shared cookie changes.');
