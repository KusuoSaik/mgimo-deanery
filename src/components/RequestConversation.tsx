import { useRef, useState } from 'react';
import type { RequestItem } from '../types';
import type { RequestDetails } from '../portalDomain';
import { prettyDate } from '../portalDomain';
import { usePreferences } from '../preferences';
export default function RequestConversation({ request, details, onAction }: { request: RequestItem; details: RequestDetails; onAction: (action: string, payload: Record<string, unknown>) => Promise<unknown> }) {
  const { english: en } = usePreferences();
  const t = (ru: string, english: string) => en ? english : ru;
  const [text, setText] = useState(''), [pending, setPending] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  async function submit(action: string) {
    if (lock.current) return; lock.current = true; setPending(true); setError('');
    try { await onAction(action, { id: request.id, text, expectedRevision: details.revision }); setText(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Ошибка сохранения'); }
    finally { lock.current = false; setPending(false); }
  }
  return <section className="space-y-3 rounded-2xl bg-slate-50 p-4">
    <p className="text-xs text-slate-600">{t('Ожидаемая готовность', 'Estimated completion')}: {prettyDate(details.dueAt, en)}<span className="mt-1 block">{t('Демо-срок: 3 рабочих дня после подачи. Точную дату подтверждает сотрудник.', 'Demo estimate: three working days after submission. Staff confirm the actual date.')}</span></p>
    {details.lifecycle === 'cancelled' && <p role="status" className="text-sm font-semibold">{t('Заявка отменена', 'Request cancelled')}</p>}
    {details.events.length > 0 && <><h3 className="text-sm font-semibold">{t('История обращения', 'Request history')}</h3><ol className="space-y-3">{details.events.map(event => <li key={event.id} className="break-words border-l-2 border-blue-200 pl-3"><p className="text-xs text-slate-500">{event.actor === 'staff' ? t('Деканат', 'Staff') : t('Вы', 'You')} · {prettyDate(event.at, en)}</p><p className="mt-1 whitespace-pre-wrap text-sm">{event.text}</p></li>)}</ol></>}
    {details.lifecycle === 'needs_info' && <><p className="text-sm font-semibold text-amber-800">{t('Нужно уточнение', 'Clarification required')}</p><label className="block text-sm">{t('Ваше уточнение', 'Your clarification')}<textarea className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3" maxLength={600} value={text} onChange={e => setText(e.target.value)} disabled={pending}/></label><button className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm text-white disabled:opacity-50" disabled={pending || !text.trim()} onClick={() => void submit('reply_request')}>{t('Отправить уточнение', 'Send clarification')}</button></>}
    {details.lifecycle === 'active' && request.stage === 1 && <button disabled={pending} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm text-rose-800 disabled:opacity-50" onClick={() => void submit('cancel_request')}>{t('Отменить заявку', 'Cancel request')}</button>}
    {pending && <p role="status" className="text-xs">{t('Сохраняем…', 'Saving…')}</p>}{error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
  </section>;
}
