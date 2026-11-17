import type { GradeItem, RequestItem, ScheduleItem, TabType } from '../types';
import type { Consultation, RequestDetails } from '../portalDomain';
import { prettyDate, isActiveRequest } from '../portalDomain';
import { findUpcomingClass } from '../scheduleUtils';
import { usePreferences } from '../preferences';
import { ArrowRight, CircleCheck } from 'lucide-react';
export default function PrioritiesCard({ grades, requests, details, schedule, consultations, onOpenGrade, onOpenRequest, onNavigate }: {
  grades: GradeItem[]; requests: RequestItem[]; details: Record<string, RequestDetails>; schedule: ScheduleItem[]; consultations: Consultation[];
  onOpenGrade: (id: string) => void; onOpenRequest: (id: string) => void; onNavigate: (tab: TabType) => void;
}) {
  const { english: en } = usePreferences();
  const t = (ru: string, english: string) => en ? english : ru;
  const now = new Date();
  const items: { id: string; title: string; note: string; action: () => void }[] = [];
  for (const r of requests.filter(r => details[r.id]?.lifecycle === 'needs_info')) items.push({ id: r.id, title: t('Деканат ждёт уточнение', 'Staff need clarification'), note: r.title, action: () => onOpenRequest(r.id) });
  const upcomingBookings = consultations.filter(c => c.status === 'booked' && Date.parse(c.startsAt) > now.getTime());
  for (const grade of grades.filter(g => g.brsPoints < 70)) {
    const booked = upcomingBookings.find(c => c.gradeId === grade.id);
    const note = booked
      ? t(`Консультация · ${prettyDate(booked.startsAt, en)} МСК`, `Consultation · ${prettyDate(booked.startsAt, en)} MSK`)
      : t(`До демо-порога допуска: ${70 - grade.brsPoints} б.`, `${70 - grade.brsPoints} points to the demo admission threshold.`);
    items.push({ id: grade.id, title: grade.subject, note, action: () => onOpenGrade(grade.id) });
  }
  for (const r of requests.filter(r => r.stage === 5 && details[r.id]?.lifecycle !== 'cancelled')) items.push({ id: r.id, title: t('Документ готов', 'Document ready'), note: r.title, action: () => onOpenRequest(r.id) });
  for (const c of upcomingBookings.slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt))) items.push({ id: c.gradeId, title: t('Предстоит консультация', 'Upcoming consultation'), note: `${grades.find(g => g.id === c.gradeId)?.subject ?? ''} · ${prettyDate(c.startsAt, en)}`, action: () => onOpenGrade(c.gradeId) });
  const upcoming = findUpcomingClass(schedule, now);
  if (upcoming?.item.changeNote) items.push({ id: 'schedule', title: t('Изменение расписания', 'Schedule change'), note: `${upcoming.item.subject} · ${upcoming.item.changeNote}`, action: () => onNavigate('schedule') });
  for (const r of requests.filter(r => isActiveRequest(r, details[r.id]) && details[r.id] && Date.parse(details[r.id].dueAt) < now.getTime())) items.push({ id: r.id, title: t('Ожидаемый срок прошёл', 'Estimated date has passed'), note: r.title, action: () => onOpenRequest(r.id) });
  const seen = new Set<string>(), visible = items.filter(i => !seen.has(i.id) && Boolean(seen.add(i.id))).slice(0, 3);
  return <section className="card overflow-hidden" aria-label={t('Что требует внимания', 'Needs attention')}><div className="border-b border-slate-100 p-4"><h2 className="text-base font-semibold text-slate-900">{t('Что требует внимания', 'Needs attention')}</h2><p className="mt-1 text-xs text-slate-500">{t('Самое важное — максимум три дела', 'Your top three next steps')}</p></div>
    {visible.length ? visible.map(item => <button key={item.id} className="flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left last:border-0 hover:bg-slate-50" onClick={item.action}><span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold text-slate-900">{item.title}</span><span className="mt-1 block break-words text-xs text-slate-600">{item.note}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-blue-600"/></button>) : <p className="flex gap-2 p-4 text-sm text-emerald-800"><CircleCheck className="h-5 w-5 shrink-0"/>{t('Срочных дел нет. Можно спокойно учиться.', 'No urgent tasks. You are on track.')}</p>}
  </section>;
}
