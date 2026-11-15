import { useRef, useState } from 'react';
import type { Consultation, ConsultationSlot } from '../portalDomain';
import { prettyDate } from '../portalDomain';
import { usePreferences } from '../preferences';
export default function ConsultationBooking({ gradeId, slots, consultations, onAction }: {
  gradeId: string; slots: ConsultationSlot[]; consultations: Consultation[];
  onAction: (action: string, payload: Record<string, unknown>) => Promise<unknown>;
}) {
  const { english: en } = usePreferences();
  const t = (ru: string, english: string) => en ? english : ru;
  const [selected, setSelected] = useState(''), [pending, setPending] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  const [now] = useState(() => Date.now());
  const booked = consultations.find(c => c.gradeId === gradeId && c.status === 'booked' && Date.parse(c.startsAt) > now);
  async function submit() {
    if (lock.current) return; lock.current = true; setPending(true); setError('');
    try { await onAction(booked ? 'cancel_consultation' : 'book_consultation', booked ? { id: booked.id } : { gradeId, slotId: selected }); setSelected(''); }
    catch (e) { setError(e instanceof Error ? e.message : t('Не удалось сохранить запись', 'Could not save the booking')); }
    finally { lock.current = false; setPending(false); }
  }
  return <section className="space-y-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200"><h3 className="text-sm font-semibold text-amber-950">{t('Консультация', 'Consultation')}</h3>
    <p className="text-xs text-amber-900">{t('Учебная демо-запись сохраняется в кабинете. Реальному преподавателю она не отправляется. Время — МСК.', 'Demo bookings are saved in your portal. No real teacher is contacted. Times are Moscow time.')}</p>
    {booked ? <p role="status" className="text-sm font-medium">{t('Вы записаны', 'You are booked')}: {prettyDate(booked.startsAt, en)}</p> : <label className="block text-sm">{t('Свободное время', 'Available time')}<select className="mt-1 w-full rounded-xl border border-amber-300 bg-white p-3 text-sm" value={selected} onChange={e => setSelected(e.target.value)} disabled={pending}><option value="">{t('Выберите время', 'Select a time')}</option>{slots.filter(s => Date.parse(s.startsAt) > now).map(s => <option key={s.id} value={s.id}>{prettyDate(s.startsAt, en)}</option>)}</select></label>}
    <button className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50" disabled={pending || (!booked && !selected)} onClick={() => void submit()}>{pending ? t('Сохраняем…', 'Saving…') : booked ? t('Отменить запись', 'Cancel booking') : t('Записаться', 'Book')}</button>
    {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
  </section>;
}
