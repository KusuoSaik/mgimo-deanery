import { academicWeekType, parseTimeRange, weekdayLabel } from './scheduleUtils.js';
import type { GradeItem, RequestItem, ScheduleItem } from './types.js';

export type RequestLifecycle = 'active' | 'needs_info' | 'cancelled';
export interface RequestEvent { id: string; at: string; actor: 'student' | 'staff'; text: string }
export interface RequestDetails {
  lifecycle: RequestLifecycle;
  dueAt: string;
  revision: number;
  events: RequestEvent[];
}
export interface Consultation { id: string; gradeId: string; startsAt: string; status: 'booked' | 'cancelled' }
export interface ConsultationSlot { id: string; startsAt: string }
export interface AcademicResult { gradeId: string; semester: number; result: '5' | '4' | '3' | '2' | 'Зачтено' | 'Не зачтено'; assessedAt: string; resitAt?: string }
export interface StaffStudent { id: string; name: string; group: string; requests: RequestItem[]; details: Record<string, RequestDetails> }

export function moscowDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function requestDueAt(createdAt: string): string {
  const [day, month, year] = createdAt.split('.').map(Number);
  const date = new Date(Date.UTC(year || 2026, (month || 1) - 1, day || 1, 9));
  for (let days = 0; days < 3;) { date.setUTCDate(date.getUTCDate() + 1); if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) days++; }
  return date.toISOString();
}
export function requestDetails(request: RequestItem, saved?: RequestDetails): RequestDetails {
  return saved ?? { lifecycle: 'active', dueAt: requestDueAt(request.createdAt), revision: 0, events: [] };
}
export function requestLabel(request: RequestItem, details?: RequestDetails): string {
  if (details?.lifecycle === 'cancelled') return 'Отменена';
  if (details?.lifecycle === 'needs_info') return 'Нужно уточнение';
  return request.status;
}
export function isActiveRequest(request: RequestItem, details?: RequestDetails): boolean {
  return request.stage < 5 && details?.lifecycle !== 'cancelled';
}
// A demo consultation lasts 30 minutes. Offer up to three different working days.
export function availableSlots(gradeId: string, now: Date, schedule: ScheduleItem[], bookings: Consultation[]): ConsultationSlot[] {
  const [year, month, day] = moscowDay(now).split('-').map(Number);
  const slots: ConsultationSlot[] = [];
  for (let offset = 1; offset <= 14 && slots.length < 3; offset++) {
    const date = new Date(year, month - 1, day + offset, 12);
    const weekday = weekdayLabel(date);
    if (!weekday || weekday === 'Сб') continue;
    const parity = academicWeekType(date);
    const lessons = schedule.filter(item => item.day === weekday && (item.weekType === 'both' || item.weekType === parity));
    const ranges = lessons.map(item => parseTimeRange(item.time));
    // A malformed class time cannot be treated as free time.
    if (ranges.some(range => !range)) continue;
    for (const hour of [12, 14, 16]) {
      const start = hour * 60;
      if (ranges.some(range => range && start < range.end && start + 30 > range.start)) continue;
      const instant = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hour - 3);
      if (bookings.some(b => b.status === 'booked' && Math.abs(Date.parse(b.startsAt) - instant) < 30 * 60_000)) continue;
      const startsAt = new Date(instant).toISOString();
      slots.push({ id: `${gradeId}:${startsAt}`, startsAt });
      break;
    }
  }
  return slots;
}
export function directionFor(group: string): string {
  return group.startsWith('МП') ? '40.03.01 Юриспруденция' : group.startsWith('МЭО') ? '38.03.01 Экономика' : '41.03.05 Международные отношения';
}
export function academicResults(grades: GradeItem[], course: number, ownerId: string): AcademicResult[] {
  // Explicit fictional assessment outcomes, separate from live BRS; never claim an AI forecast.
  const outcomes: AcademicResult['result'][] = ownerId === 'acc-002'
    ? ['2', '2', 'Зачтено', 'Зачтено', 'Зачтено']
    : ownerId === 'acc-003' ? ['4', 'Зачтено', 'Зачтено', '3', 'Зачтено']
    : ['5', '5', '5', 'Зачтено', 'Зачтено', '4'];
  return grades.map((g, index) => ({ gradeId: g.id, semester: Math.max(1, course * 2 - 1), result: outcomes[index] ?? (g.examType === 'Зачет' ? 'Зачтено' : '4'), assessedAt: '2026-11-10', ...(ownerId === 'acc-002' && index < 2 ? { resitAt: index ? '2026-11-24T12:00:00+03:00' : '2026-11-20T09:00:00+03:00' } : {}) }));
}
export function prettyDate(value: string, english = false): string {
  return new Date(value).toLocaleString(english ? 'en-GB' : 'ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
