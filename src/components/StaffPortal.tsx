import { useEffect, useRef, useState } from 'react';
import { RefreshCw, LogOut, ShieldCheck } from 'lucide-react';
import type { StaffStudent } from '../portalDomain';
import { prettyDate, requestLabel } from '../portalDomain';
import { usePreferences } from '../preferences';
async function loadQueue(signal?: AbortSignal): Promise<StaffStudent[]> {
  const response = await fetch('/api/staff', { credentials: 'include', signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Не удалось загрузить очередь.');
  return data.students;
}
const primary = 'rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-medium text-white disabled:opacity-50';
export default function StaffPortal({ name, onLogout }: { name: string; onLogout: () => void }) {
  const { english: en, setEnglish } = usePreferences();
  const t = (ru: string, english: string) => en ? english : ru;
  const [students, setStudents] = useState<StaffStudent[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(true);
  const [comments, setComments] = useState<Record<string, string>>({});
  const mounted = useRef(true), lock = useRef(false);
  async function refresh() {
    setError(''); setBusy(true);
    try { const data = await loadQueue(); if (mounted.current) setStudents(data); }
    catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'Ошибка сервера'); }
    finally { if (mounted.current) setBusy(false); }
  }
  useEffect(() => {
    mounted.current = true; const controller = new AbortController();
    void loadQueue(controller.signal).then(data => { if (mounted.current && !controller.signal.aborted) setStudents(data); })
      .catch(e => { if (mounted.current && !controller.signal.aborted) setError(e instanceof Error ? e.message : 'Ошибка сервера'); })
      .finally(() => { if (mounted.current && !controller.signal.aborted) setBusy(false); });
    return () => { mounted.current = false; controller.abort(); };
  }, []);
  async function act(student: StaffStudent, id: string, action: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const response = await fetch('/api/staff', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, studentId: student.id, id, text: comments[id] ?? '', expectedRevision: student.details[id].revision, operationId: crypto.randomUUID() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не удалось сохранить.');
      if (mounted.current) { setStudents(previous => previous.map(s => s.id === student.id ? data.student : s)); setComments(previous => ({ ...previous, [id]: '' })); }
    } catch (e) { if (mounted.current) setError(e instanceof Error ? e.message : 'Ошибка сервера'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  return <main className="min-h-dvh space-y-4 p-4 pb-24">
    <header className="rounded-2xl bg-slate-900 p-5 text-white"><ShieldCheck className="mb-2 h-6 w-6 text-amber-300"/><h1 className="text-xl font-semibold">{t('Кабинет сотрудника', 'Staff workspace')}</h1><p className="mt-1 text-sm">{name}</p><p className="mt-2 text-xs text-slate-300">{t('Конкурсный прототип · Все студенты вымышлены', 'Competition prototype · All students are fictional')}</p></header>
    <div className="flex flex-wrap gap-2"><button className={primary} onClick={() => setEnglish(!en)}>{en ? 'Русский' : 'English'}</button><button className={primary} disabled={busy} onClick={() => { setBusy(true); void refresh(); }}><RefreshCw className="mr-1 inline h-4 w-4"/>{t('Обновить', 'Refresh')}</button><button className="rounded-xl bg-slate-200 px-3 py-2.5 text-sm" onClick={onLogout}><LogOut className="mr-1 inline h-4 w-4"/>{t('Выйти', 'Sign out')}</button></div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {busy && <p role="status" className="text-sm text-slate-600">{t('Обновляем очередь…', 'Updating queue…')}</p>}
    {!busy && students.length === 0 && !error && <p>{t('Очередь пуста', 'The queue is empty')}</p>}
    {students.map(student => <section key={student.id} className="space-y-3"><h2 className="pt-2 text-sm font-semibold">{student.name} · {student.group}</h2>{student.requests.length === 0 && <p className="text-sm text-slate-500">{t('Заявок нет', 'No requests')}</p>}{student.requests.map(request => {
      const details = student.details[request.id], closed = details.lifecycle === 'cancelled' || request.stage === 5;
      return <article key={request.id} className="card space-y-3 p-4" aria-label={request.title}>
        <h3 className="font-semibold">{request.title}</h3><p className="text-sm text-blue-700">{requestLabel(request, details)}</p><p className="text-xs text-slate-500">{t('Ожидаемая готовность', 'Estimated completion')}: {prettyDate(details.dueAt, en)}</p>
        {details.events.map(event => <p key={event.id} className="break-words border-l-2 border-slate-200 pl-2 text-xs text-slate-600">{prettyDate(event.at, en)} · {event.actor === 'staff' ? t('Деканат', 'Staff') : t('Студент', 'Student')}: {event.text}</p>)}
        {!closed && <><label className="block text-sm">{t('Комментарий сотрудника', 'Staff comment')}<textarea className="mt-1 w-full rounded-xl border border-slate-300 p-3" maxLength={600} value={comments[request.id] ?? ''} onChange={e => setComments(prev => ({ ...prev, [request.id]: e.target.value }))}/></label><div className="flex flex-wrap gap-2">
          <button className={primary} disabled={busy || details.lifecycle === 'needs_info'} onClick={() => void act(student, request.id, 'advance')}>{t('Следующий этап', 'Next stage')}</button>
          <button className={primary} disabled={busy || !comments[request.id]?.trim()} onClick={() => void act(student, request.id, 'needs_info')}>{t('Нужно уточнение', 'Request clarification')}</button>
          <button className="rounded-xl bg-slate-100 px-3 py-2.5 text-sm disabled:opacity-50" disabled={busy || !comments[request.id]?.trim()} onClick={() => void act(student, request.id, 'comment')}>{t('Сохранить комментарий', 'Save comment')}</button>
        </div></>}
      </article>;
    })}</section>)}
  </main>;
}
