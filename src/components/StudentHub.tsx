import { useUI } from '../i18n';
import { usePreferences } from '../preferences';
import { useRef, useState } from 'react';
import type { GradeItem, RequestItem, ScheduleItem, TabType, UserProfile } from '../types';
import { academicWeekType, findUpcomingClass, weekdayLabel, moscowClock } from '../scheduleUtils';
type Props = {
    user: UserProfile;
    grades: GradeItem[];
    schedule: ScheduleItem[];
    requests: RequestItem[];
    onOpenRequest: (id: string) => void;
    onNavigate: (tab: TabType) => void;
    onRequest: (r: Pick<RequestItem, 'title' | 'category' | 'deliveryFormat'>) => Promise<RequestItem>;
    english: boolean;
    setEnglish: (value: boolean) => void;
};
const btn = 'rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-medium text-white hover:bg-blue-700';
const card = 'rounded-2xl border border-slate-100 bg-white p-4 shadow-sm';
export default function StudentHub({ grades, schedule, requests, onNavigate, onOpenRequest, onRequest, english: en, setEnglish }: Props) {
    const uiT = useUI();
    const t = (ru: string, eng: string) => en ? eng : ru;
    const { large, setLarge, contrast, setContrast, still, setStill } = usePreferences();
    const [weekOffset, setWeekOffset] = useState(0);
    const [situation, setSituation] = useState('study');
    const [purpose, setPurpose] = useState('');
    const [feedback, setFeedback] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const submitLock = useRef(false);
    const upcoming = findUpcomingClass(schedule, new Date());
    const risk = grades.filter(g => g.status === 'Требует внимания');
    const pending = requests.filter(r => r.stage < 5);
    const monday = moscowClock();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weekOffset * 7);
    const titles: Record<string, string> = { study: 'Справка об обучении', visa: 'Справка для продления студенческой визы', retake: 'Заявление на пересдачу' };
    async function submitRequest() {
        if (submitLock.current)
            return;
        submitLock.current = true;
        setSubmitting(true);
        setFeedback('');
        try {
            const created = await onRequest({ title: titles[situation] + (purpose.trim() ? ` — ${purpose.trim()}` : ''), category: situation === 'retake' ? 'Академические' : 'Справки', deliveryFormat: 'Электронная с ЭЦП (PDF)' });
            setFeedback(t(`Создана заявка «${created.title}».`, `Request “${created.title}” created.`));
            setPurpose('');
            onOpenRequest(created.id);
        }
        catch {
            setFeedback(t('Не удалось создать заявку. Проверьте соединение и повторите попытку.', 'Could not create the request. Check your connection and try again.'));
        }
        finally {
            submitLock.current = false;
            setSubmitting(false);
        }
    }
    return <section aria-label={uiT(t('Студенческий помощник', 'Student support'))} className="space-y-4 px-4 py-4 pb-24">
    <div className="flex flex-wrap items-center gap-2">
      <button className={btn} onClick={() => setEnglish(!en)} aria-label={en ? 'Русский' : 'English'}>{uiT(en ? 'Русский' : 'English')}</button>
      <details className="flex-1 rounded-xl border border-slate-200 bg-white p-3 text-sm"><summary className="cursor-pointer">{uiT(t('Доступность', 'Accessibility'))}</summary>
        <div className="mt-3 space-y-3">{uiT([[large, setLarge, t('Крупный текст', 'Larger text')], [contrast, setContrast, t('Высокий контраст', 'High contrast')], [still, setStill, t('Без анимации', 'Reduce motion')]].map(([value, set, label]) => <label key={String(label)} className="flex items-center gap-3"><input type="checkbox" checked={Boolean(value)} onChange={e => (set as (v: boolean) => void)(e.target.checked)}/>{uiT(String(label))}</label>))}</div>
      </details>
    </div>
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 text-white">
      <h1 className="text-xl font-semibold">{uiT(t('Что мне важно', 'My priorities'))}</h1>
      <p className="mt-1 text-xs text-slate-300">{uiT(t('Конкурсный концепт · Все данные вымышлены', 'Competition concept · All data is fictional'))}</p>
      {uiT(upcoming && <p className="mt-3">{uiT(t('Ближайшая пара', 'Next class'))}{uiT(": ")}{uiT(upcoming.item.subject)}{uiT(" · ")}{uiT(upcoming.item.time)}{uiT(" · ")}{uiT(t('ауд.', 'room'))} {uiT(upcoming.item.room)}</p>)}
      <div className="mt-3 flex flex-wrap gap-2"><button className={btn} onClick={() => onNavigate('schedule')}>{uiT(t('Расписание', 'Schedule'))}</button><button className={btn} onClick={() => onNavigate('ai')}>{uiT(t('Задать вопрос', 'Ask assistant'))}</button></div>
    </div>
    <div className={card}>
      <h2 className="font-semibold">{uiT(t('Следующий шаг', 'Next step'))}</h2>
      <p className="my-3 text-sm">{uiT(risk.length ? t(`Требуют внимания: ${risk.map(g => g.subject).join(', ')}. Посмотрите баллы и уточните условия пересдачи.`, `Needs attention: ${risk.map(g => g.subject).join(', ')}. Review your points and confirm resit requirements.`) : t('Предметов в зоне риска нет. Проверьте ближайшие занятия и заявки.', 'No subjects flagged as at risk. Check upcoming classes and requests.'))}</p>
      <p className="mb-3 text-sm">{uiT(t('Заявок в работе', 'Requests in progress'))}{uiT(": ")}{uiT(pending.length)}</p>
      <button className={btn} onClick={() => onNavigate(risk.length ? 'grades' : 'requests')}>{uiT(t('Открыть', 'Open'))}</button>
    </div>
    <div className={card}>
      <h2 className="font-semibold">{uiT(t('Помощник по ситуации', 'Guided support'))}</h2>
      <label className="mt-3 block text-sm">{uiT(t('Что нужно решить?', 'What do you need?'))}<select className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3" value={situation} onChange={e => { setSituation(e.target.value); setFeedback(''); }}><option value="study">{uiT(t('Подтвердить обучение', 'Proof of enrolment'))}</option><option value="visa">{uiT(t('Подготовить документы для визы', 'Visa documents'))}</option><option value="retake">{uiT(t('Оформить пересдачу', 'Request a resit'))}</option></select></label>
      <p className="my-3 text-sm text-slate-600">{uiT(t('1. Уточните цель. 2. Проверьте название. 3. Подтвердите отправку. Заявка появится в разделе «Заявки».', '1. Specify the purpose. 2. Review the title. 3. Confirm submission. Track progress in Requests.'))}</p>
      <p className="mb-3 text-sm">{uiT(t('Документ', 'Document'))}{uiT(": ")}{uiT(titles[situation])}</p>
      <label className="block text-sm">{uiT(t('Цель (без паспортных данных)', 'Purpose (no passport details)'))}<input className="my-2 w-full rounded-xl border border-slate-300 p-3" value={purpose} maxLength={70} onChange={e => setPurpose(e.target.value)}/></label>
      <button className={btn} disabled={submitting} onClick={() => void submitRequest()}>{uiT(submitting ? t('Отправляем…', 'Sending…') : t('Подтвердить отправку', 'Confirm submission'))}</button>
      <p role="status" className="mt-2 text-sm" aria-live="polite">{uiT(feedback)}</p>
    </div>
    <div className={card}>
      <h2 className="font-semibold">{uiT(t('План недели', 'Weekly plan'))}</h2>
      <div className="my-3 flex flex-wrap items-center gap-2"><button className={btn} onClick={() => setWeekOffset(v => v - 1)} aria-label={uiT(t('Предыдущая неделя', 'Previous week'))}>{uiT("←")}</button><span className="text-sm">{uiT(monday.toLocaleDateString(en ? 'en-GB' : uiT.locale))}</span><button className={btn} onClick={() => setWeekOffset(v => v + 1)} aria-label={uiT(t('Следующая неделя', 'Next week'))}>{uiT("→")}</button><button className="rounded-xl bg-slate-100 p-2 text-sm text-slate-800" onClick={() => setWeekOffset(0)}>{uiT(t('Эта неделя', 'This week'))}</button></div>
      {uiT(Array.from({ length: 7 }, (_, i) => { const date = new Date(monday); date.setDate(date.getDate() + i); const day = weekdayLabel(date); const items = schedule.filter(s => s.day === day && (s.weekType === 'both' || s.weekType === academicWeekType(date))).sort((a, b) => a.time.localeCompare(b.time)); return <div key={i} className="border-t border-slate-200 py-3"><h3 className="text-sm font-semibold">{uiT(date.toLocaleDateString(en ? 'en-GB' : uiT.locale, { weekday: 'long', day: 'numeric', month: 'short' }))}</h3>{uiT(items.length ? items.map(s => <p key={s.id} className="mt-2 break-words text-sm">{uiT(s.time)}{uiT(" · ")}{uiT(s.subject)}{uiT(" · ")}{uiT(s.room)}{uiT(s.changeNote && <strong className="block text-amber-700">{uiT(s.changeNote)}</strong>)}</p>) : <p className="mt-1 text-xs text-slate-600">{uiT(t('Занятий нет', 'No classes'))}</p>)}</div>; }))}
      <p className="mt-2 text-xs text-slate-600">{uiT(t('Здесь учебное расписание. Сроки визы и пересдачи уточняйте в уведомлениях; новые даты не выдумываются.', 'This plan shows classes. Confirm visa and resit deadlines in notifications; dates are not inferred.'))}</p>
    </div>

  </section>;
}
