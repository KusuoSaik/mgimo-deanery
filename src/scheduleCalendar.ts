import type { ScheduleItem } from './types';
import { academicWeekType, WEEK_DAYS } from './scheduleUtils';

const pad = (value: number) => String(value).padStart(2, '0');
export function weekDates(date: Date): Date[] {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() || 7) - 1));
  return WEEK_DAYS.map((_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}
const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
function fold(line: string): string {
  let result = '', length = 0;
  for (const point of line) {
    const bytes = new TextEncoder().encode(point).length;
    if (length + bytes > 75) { result += '\r\n '; length = 1; }
    result += point; length += bytes;
  }
  return result;
}

/** Selected week's snapshot; never includes student identifiers. All class times are Moscow time. */
export function scheduleCalendar(schedule: ScheduleItem[], weekStart: Date, now = new Date()): string {
  const dates = weekDates(weekStart), parity = academicWeekType(dates[0]);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Student Deanery Concept//Schedule//RU', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Учебная неделя · Конкурсный прототип', 'X-WR-TIMEZONE:Europe/Moscow',
    'BEGIN:VTIMEZONE', 'TZID:Europe/Moscow', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0300', 'TZOFFSETTO:+0300', 'TZNAME:MSK', 'END:STANDARD', 'END:VTIMEZONE'];
  for (const item of schedule) {
    if (item.weekType !== 'both' && item.weekType !== parity) continue;
    const day = dates[WEEK_DAYS.indexOf(item.day)];
    const time = item.time.match(/^(\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})$/);
    if (!day || !time) continue;
    const [sh, sm, eh, em] = time.slice(1).map(Number);
    if (sh > 23 || eh > 23 || sm > 59 || em > 59 || eh * 60 + em <= sh * 60 + sm) continue;
    const date = `${day.getFullYear()}${pad(day.getMonth() + 1)}${pad(day.getDate())}`;
    lines.push('BEGIN:VEVENT', `UID:${encodeURIComponent(item.id)}-${date}@deanery-concept`,
      `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,
      `DTSTART;TZID=Europe/Moscow:${date}T${pad(sh)}${pad(sm)}00`, `DTEND;TZID=Europe/Moscow:${date}T${pad(eh)}${pad(em)}00`,
      `SUMMARY:${escape(item.subject)}`, `LOCATION:${escape(`${item.building}, ауд. ${item.room}`)}`,
      `DESCRIPTION:${escape([item.professor, item.type, item.changeNote, 'Вымышленное расписание конкурсного прототипа. Снимок на момент экспорта.'].filter(Boolean).join('\n'))}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
