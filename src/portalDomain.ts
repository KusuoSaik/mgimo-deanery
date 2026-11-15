import type { GradeItem, RequestItem } from './types.js';

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
export function availableSlots(gradeId: string, now = new Date()): ConsultationSlot[] {
  const day = moscowDay(now);
  const date = new Date(`${day}T12:00:00+03:00`);
  const slots: ConsultationSlot[] = [];
  // Rolling demo slots are always in the future, in Moscow time, on weekdays.
  for (let i = 0; slots.length < 3 && i < 10; i++) {
    date.setUTCDate(date.getUTCDate() + 1);
    if ([0, 6].includes(date.getUTCDay())) continue;
    const startsAt = date.toISOString();
    slots.push({ id: `${gradeId}:${startsAt}`, startsAt });
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
