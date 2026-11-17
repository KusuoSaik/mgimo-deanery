import assert from 'node:assert/strict';
import { scheduleCalendar, weekDates } from '../src/scheduleCalendar.ts';
import { academicWeekType } from '../src/scheduleUtils.ts';
import type { ScheduleItem } from '../src/types.ts';

const start = new Date(2026, 10, 16);
const base: ScheduleItem = { id: 'class-1', day: 'Пн', weekType: 'both', time: '09:00 – 10:30', subject: 'Русский язык, практика; ' + 'Я'.repeat(100), professor: 'Демо\\преподаватель', type: 'Язык', room: '201', building: 'Учебный корпус', changeNote: 'Перенос\nBEGIN:VEVENT' };
const opposite = academicWeekType(start) === 'odd' ? 'even' : 'odd';
const result = scheduleCalendar([base, { ...base, id: 'excluded', weekType: opposite }, { ...base, id: 'invalid', time: '25:10 – 26:00' }], start, new Date('2026-11-16T12:00:00Z'));
const unfolded = result.replace(/\r\n /g, '');
// Validate nesting, including the empty calendar: a download alone proves no interoperability.
for (const calendar of [result, scheduleCalendar([], start)]) {
  const stack: string[] = [];
  for (const line of calendar.replace(/\r\n /g, '').split('\r\n')) {
    if (line.startsWith('BEGIN:')) stack.push(line.slice(6));
    if (line.startsWith('END:')) assert.equal(stack.pop(), line.slice(4));
  }
  assert.deepEqual(stack, []);
  assert(calendar.endsWith('END:VCALENDAR\r\n'));
}
assert.equal((unfolded.match(/^BEGIN:VEVENT$/gm) || []).length, 1);
assert(unfolded.includes('DTSTART;TZID=Europe/Moscow:20261116T090000'));
assert(unfolded.includes('DTEND;TZID=Europe/Moscow:20261116T103000'));
assert(unfolded.includes('DTSTAMP:20261116T120000Z'));
assert(unfolded.includes('Русский язык\\, практика\\;'));
assert(unfolded.includes('Перенос\\nBEGIN:VEVENT'));
assert(unfolded.includes('Демо\\\\преподаватель'));
assert(result.split('\r\n').every(line => Buffer.byteLength(line) <= 75));
assert.equal(weekDates(new Date(2027, 0, 3))[0].getFullYear(), 2026);
assert.equal(weekDates(new Date(2027, 0, 3))[0].getDate(), 28);
assert.equal(scheduleCalendar([], start).includes('BEGIN:VEVENT'), false);
console.log('PASS: week/calendar boundaries, parity, Moscow timezone, Unicode folding, ICS injection escaping, invalid time rejection.');
