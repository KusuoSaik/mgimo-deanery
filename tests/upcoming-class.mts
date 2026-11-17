import assert from 'node:assert/strict';
import { academicWeekType, findUpcomingClass } from '../src/scheduleUtils.ts';
import type { ScheduleItem } from '../src/types.ts';

const monday = new Date('2026-11-16T12:00:00+03:00');
const lesson: ScheduleItem = { id: 'biweekly', day: 'Пн', weekType: academicWeekType(monday), time: '09:00 – 10:30', subject: 'Test', professor: 'Demo', room: '1', building: 'Demo', type: 'Лекция' };
for (const now of [monday, new Date('2026-11-17T12:00:00+03:00')]) {
  const next = findUpcomingClass([lesson], now);
  assert(next);
  assert.equal(next.start.toISOString(), '2026-11-30T06:00:00.000Z');
}
for (const time of ['25:00 – 26:00', '09:65 – 10:30', '10:30 – 09:00', '09:00 – 09:00', 'garbage 09:00 – 10:30']) {
  assert.equal(findUpcomingClass([{ ...lesson, time }], monday), null);
}
assert.equal(findUpcomingClass([lesson], new Date('2026-11-16T09:30:00+03:00'))?.start.toISOString(), '2026-11-16T06:00:00.000Z');
assert.equal(findUpcomingClass([], monday), null);
console.log('PASS: fortnightly lessons after today/next week, active lesson, malformed time ranges.');

for (const tz of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo', 'Europe/Moscow']) {
  process.env.TZ = tz;
  assert.equal(findUpcomingClass([{ ...lesson, weekType: 'both' }], new Date('2026-11-15T22:00:00Z'))?.start.toISOString(), '2026-11-16T06:00:00.000Z');
}
console.log('PASS: Moscow class instant across UTC, Los Angeles, Tokyo and Moscow, including local date boundary.');
