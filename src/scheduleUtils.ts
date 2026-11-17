import type { ScheduleItem } from './types';

export const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'] as const;

export type WeekParity = 'even' | 'odd';

/** Moscow wall-clock fields for calendar UI; not an instant for elapsed-time arithmetic. */
export function moscowClock(instant = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const value = (name: string) => Number(parts.find(p => p.type === name)?.value);
  return new Date(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'));
}

/** Чётность учебной недели от понедельника недели, в которую попадает 1 сентября. */
export function academicWeekType(date: Date): WeekParity {
  const year = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  const firstOfSeptember = new Date(year, 8, 1);
  const startDow = firstOfSeptember.getDay() || 7;
  const firstMonday = new Date(year, 8, 1 - (startDow - 1));
  firstMonday.setHours(0, 0, 0, 0);

  const point = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((point.getTime() - firstMonday.getTime()) / 86_400_000);
  const weekNumber = Math.floor(Math.max(0, diffDays) / 7) + 1;
  return weekNumber % 2 === 0 ? 'even' : 'odd';
}

export function weekdayLabel(date: Date): ScheduleItem['day'] | null {
  const day = date.getDay();
  if (day < 1 || day > 6) return null;
  return WEEK_DAYS[day - 1] ?? null;
}

export function parseTimeRange(time: string): { start: number; end: number } | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const [sh, sm, eh, em] = match.slice(1).map(Number);
  if (sh > 23 || eh > 23 || sm > 59 || em > 59 || eh * 60 + em <= sh * 60 + sm) return null;
  return {
    start: Number(match[1]) * 60 + Number(match[2]),
    end: Number(match[3]) * 60 + Number(match[4]),
  };
}

function atMinutes(day: Date, minutes: number): Date {
  return new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes) - 3 * 60 * 60 * 1000);
}

export type UpcomingClass = {
  item: ScheduleItem;
  start: Date;
  end: Date;
};

export function findUpcomingClass(schedule: ScheduleItem[], now: Date): UpcomingClass | null {
  const clock = moscowClock(now);
  // Include the same weekday two weeks later after today's final class ends.
  for (let offset = 0; offset <= 14; offset += 1) {
    const day = new Date(clock.getFullYear(), clock.getMonth(), clock.getDate() + offset);
    const label = weekdayLabel(day);
    if (!label) continue;

    const week = academicWeekType(day);
    const matches: UpcomingClass[] = [];

    for (const item of schedule) {
      if (item.day !== label) continue;
      if (item.weekType !== 'both' && item.weekType !== week) continue;
      const range = parseTimeRange(item.time);
      if (!range) continue;
      const start = atMinutes(day, range.start);
      const end = atMinutes(day, range.end);
      if (end.getTime() <= now.getTime()) continue;
      matches.push({ item, start, end });
    }

    matches.sort((a, b) => a.start.getTime() - b.start.getTime());
    if (matches[0]) return matches[0];
  }

  return null;
}

export function formatCountdown(ms: number, locale = 'ru-RU'): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const clock = [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
  if (days > 0) return `${days} ${locale.startsWith('en') ? 'd' : 'д'} ${clock}`;
  return clock;
}
