import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Download, Printer, X } from 'lucide-react';
import type { RequestItem, UserProfile } from '../types';
import { Segmented } from './ui/primitives';

type CertificateLanguage = 'ru' | 'en';

interface OfficialCertificateGeneratorProps {
  user: UserProfile;
  request: RequestItem;
  onClose: () => void;
}

const TEMPLATES = {
  ru: {
    org: 'Федеральное государственное автономное образовательное учреждение высшего образования',
    header: 'Московский государственный институт международных отношений (университет) Министерства иностранных дел Российской Федерации',
    title: 'Справка',
    docNumber: 'Исх. №',
    body: (p: Record<string, string>) => [
      `Дана ${p.name}, студенту ${p.course} курса (${p.faculty}, группа ${p.group}), в том, что он(а) действительно обучается в МГИМО МИД России по очной форме обучения.`,
      `Приказ о зачислении № 001 от ${p.enrolled}`,
      `Справка выдана для предъявления по месту требования и действительна 90 дней с момента выдачи.`,
    ],
    signer: 'Проректор по учебной работе',
    stampTop: 'МГИМО МИД РОССИИ',
    stampBottom: 'ЭЛЕКТРОННАЯ ПОДПИСЬ',
    stampCenter: 'Подписано',
    verify: 'Проверка подлинности: verify.mgimo.ru, код',
  },
  en: {
    org: 'Federal State Autonomous Educational Institution of Higher Education',
    header: 'Moscow State Institute of International Relations (University) of the Ministry of Foreign Affairs of the Russian Federation',
    title: 'Certificate',
    docNumber: 'Ref. No.',
    body: (p: Record<string, string>) => [
      `This is to certify that ${p.name}, a year ${p.course} student (${p.faculty}, group ${p.group}), is enrolled at MGIMO University in a full-time programme.`,
      `Enrollment order No. 001 dated ${p.enrolled}.`,
      `This certificate is issued for presentation upon request and is valid for 90 days from the date of issue.`,
    ],
    signer: 'Vice-Rector for Academic Affairs',
    stampTop: 'MGIMO UNIVERSITY',
    stampBottom: 'ELECTRONIC SIGNATURE',
    stampCenter: 'Signed',
    verify: 'Verify at verify.mgimo.ru, code',
  },
};

const formatDate = (date: Date, locale: CertificateLanguage) =>
  date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

function Stamp({ top, bottom, center, date }: { top: string; bottom: string; center: string; date: string }) {
  return (
    <svg viewBox="0 0 140 140" className="h-32 w-32 text-blue-700" aria-hidden="true">
      <defs>
        <path id="stamp-top" d="M 70 70 m -52 0 a 52 52 0 1 1 104 0" />
        <path id="stamp-bottom" d="M 70 70 m -52 0 a 52 52 0 0 0 104 0" />
      </defs>
      <g fill="none" stroke="currentColor" opacity="0.85">
        <circle cx="70" cy="70" r="66" strokeWidth="2.5" />
        <circle cx="70" cy="70" r="60" strokeWidth="0.8" />
        <circle cx="70" cy="70" r="38" strokeWidth="1.4" />
      </g>
      <g fill="currentColor" opacity="0.85" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
        <text fontSize="10" letterSpacing="2.2">
          <textPath href="#stamp-top" startOffset="50%" textAnchor="middle">
            {top}
          </textPath>
        </text>
        <text fontSize="8.5" letterSpacing="1.6">
          <textPath href="#stamp-bottom" startOffset="50%" textAnchor="middle" dominantBaseline="hanging">
            {bottom}
          </textPath>
        </text>
        <text x="70" y="68" textAnchor="middle" fontSize="11">
          {center}
        </text>
        <text x="70" y="82" textAnchor="middle" fontSize="7.5" fontWeight="500">
          {date}
        </text>
      </g>
    </svg>
  );
}

export const OfficialCertificateGenerator = ({ user, request, onClose }: OfficialCertificateGeneratorProps) => {
  const [language, setLanguage] = useState<CertificateLanguage>('ru');
  const t = TEMPLATES[language];
  const now = new Date();
  const docNumber = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${request.id.slice(-4).toUpperCase()}`;
  const code = request.verificationQrCode || `MGIMO-${request.id.toUpperCase()}`;
  const paragraphs = t.body({
    name: user.name,
    course: String(user.course),
    faculty: user.faculty,
    group: user.group,
    enrolled: formatDate(new Date(2022, 8, 1), language),
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const handleDownload = () => {
    const element = document.getElementById('certificate-content');
    if (!element) return;
    const html = `<!doctype html><meta charset="utf-8"><title>${t.title}</title><body style="font-family:Georgia,serif;max-width:720px;margin:40px auto">${element.innerHTML}</body>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `Certificate_${user.studentId}_${language}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex justify-center bg-slate-950/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Официальный документ"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="flex h-full w-full max-w-md flex-col"
      >
        <div className="flex items-center gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <button type="button" onClick={onClose} aria-label="Закрыть" className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
          <p className="flex-1 text-sm font-medium text-white">Документ</p>
          <Segmented
            id="cert-lang"
            tone="dark"
            size="sm"
            className="w-36"
            value={language}
            onChange={setLanguage}
            options={[
              { value: 'ru', label: 'RU' },
              { value: 'en', label: 'EN' },
            ]}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <motion.article
            key={language}
            id="certificate-content"
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="relative rounded-md bg-[#fdfdfb] px-6 py-8 font-serif text-slate-900 shadow-2xl"
          >
            <header className="border-b border-slate-300 pb-4 text-center">
              <p className="text-[10px] leading-snug text-slate-500">{t.org}</p>
              <h1 className="mt-2 text-[13px] font-bold leading-snug text-blue-950">{t.header}</h1>
              <div className="mt-4 flex justify-between font-sans text-[10px] text-slate-500">
                <span className="tabular">
                  {t.docNumber} {docNumber}
                </span>
                <span>{formatDate(now, language)}</span>
              </div>
            </header>

            <h2 className="mt-8 text-center text-2xl font-bold tracking-[0.2em] text-blue-950">{t.title.toUpperCase()}</h2>

            <div className="mt-6 space-y-3 text-[13px] leading-[1.75] text-slate-800 [hyphens:auto] [text-align:justify]" lang={language}>
              {paragraphs.map((text) => (
                <p key={text} className="indent-6">
                  {text}
                </p>
              ))}
            </div>

            <div className="relative mt-12 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[12px] leading-snug text-slate-700">{t.signer}</p>
                <svg viewBox="0 0 120 30" className="mt-2 h-7 w-28 text-blue-900" aria-hidden="true">
                  <path d="M2 22c10-14 14-16 16-10s-6 10 0 8 10-18 16-14-4 16 4 12 8-12 14-10 2 10 10 6 16-10 20-6 10 4 34-6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <div className="mt-1 w-32 border-t border-slate-400" />
              </div>
              <motion.div
                initial={{ scale: 1.8, rotate: -28, opacity: 0 }}
                animate={{ scale: 1, rotate: -12, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.35 }}
                className="-mb-6 -mr-2 shrink-0 mix-blend-multiply"
              >
                <Stamp top={t.stampTop} bottom={t.stampBottom} center={t.stampCenter} date={now.toLocaleDateString('ru-RU')} />
              </motion.div>
            </div>

            <footer className="mt-10 border-t border-slate-200 pt-3 text-center font-sans text-[10px] leading-relaxed text-slate-500">
              {t.verify} <span className="tabular font-semibold text-slate-700">{code}</span>
            </footer>
          </motion.article>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-white/10 bg-slate-950/60 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="pressable flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/15"
          >
            <Printer className="h-4 w-4" />
            Печать
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="pressable flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            <Download className="h-4 w-4" />
            Скачать
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
};
