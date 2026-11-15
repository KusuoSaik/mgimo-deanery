import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';
import { useModalFocus } from '../useModalFocus';
import { usePreferences } from '../preferences';
import { certificateDate, certificateLines } from '../certificateContent';
import type { RequestItem, UserProfile } from '../types';
export function OfficialCertificateGenerator({ user, request, onClose }: { user: UserProfile; request: RequestItem; onClose: () => void }) {
  const { english: en } = usePreferences();
  const [english, setEnglish] = useState(en), [pending, setPending] = useState(false), [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null), lock = useRef(false); useModalFocus(true, ref, onClose);
  const t = (ru: string, eng: string) => english ? eng : ru;
  async function download() {
    if (lock.current) return; lock.current = true; setPending(true); setError('');
    try {
      const response = await fetch('/fonts/NotoSans-Regular.ttf');
      if (!response.ok) throw new Error(t('Не удалось загрузить шрифт. Попробуйте ещё раз.', 'Could not load the font. Please retry.'));
      const { createCertificatePdf } = await import('../certificatePdf');
      const bytes = await createCertificatePdf(new Uint8Array(await response.arrayBuffer()), user, request, english);
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url; a.download = `Demo_${request.id}_${english ? 'en' : 'ru'}.pdf`; a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) { setError(e instanceof Error ? e.message : t('Не удалось создать PDF', 'Could not generate PDF')); }
    finally { lock.current = false; setPending(false); }
  }
  return createPortal(<div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t('Демо-документ', 'Demo document')} className="fixed inset-0 z-[80] flex justify-center bg-slate-950/80 p-4 backdrop-blur-sm"><div className="flex h-full w-full max-w-md flex-col gap-3">
    <header className="flex items-center gap-3 text-white"><button className="rounded-xl bg-white/10 p-3" onClick={onClose} aria-label={t('Закрыть', 'Close')}><X className="h-5 w-5"/></button><p className="flex-1 text-sm">{t('Демонстрационный документ', 'Demonstration document')}</p><button className="rounded-xl bg-white/10 p-3 text-sm" onClick={() => setEnglish(!english)}>{english ? 'RU' : 'EN'}</button></header>
    <article className="flex-1 space-y-4 overflow-y-auto rounded-2xl bg-white p-5 text-slate-900"><p className="rounded-xl bg-amber-100 p-3 text-xs font-semibold text-amber-950">{t('ДЕМО · Не является официальным документом МГИМО', 'DEMO · Not an official MGIMO document')}</p><h1 className="text-xl font-semibold">{t('Демонстрационный документ', 'Demonstration document')}</h1><p className="break-all text-xs text-slate-500">{request.id} · {certificateDate(request).toLocaleDateString(english ? 'en-GB' : 'ru-RU')}</p>{certificateLines(user, request, english).map(line => <p key={line} className="break-words text-sm leading-relaxed">{line}</p>)}<p className="text-xs font-semibold">{t('Подпись: демонстрационная имитация', 'Signature: demonstration only')}</p></article>
    {error && <p role="alert" className="rounded-xl bg-rose-100 p-3 text-sm text-rose-900">{error}</p>}
    <button className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 text-sm font-medium text-white disabled:opacity-50" disabled={pending} onClick={() => void download()}><Download className="h-4 w-4"/>{pending ? t('Создаём PDF…', 'Creating PDF…') : t('Скачать PDF', 'Download PDF')}</button>
  </div></div>, document.body);
}
