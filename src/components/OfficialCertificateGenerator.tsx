import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Printer } from 'lucide-react';
import type { UserProfile, RequestItem } from '../types';

type CertificateLanguage = 'ru' | 'en';

interface OfficialCertificateGeneratorProps {
  user: UserProfile;
  request: RequestItem;
  onClose: () => void;
}

const CERTIFICATE_TEMPLATES = {
  ru: {
    header: 'Министерство иностранных дел Российской Федерации\nМГИМО МИД России',
    title: 'СПРАВКА',
    docNumber: 'Исх. №',
    date: 'Дата:',
    content: () => `
СПРАВКА

Дана настоящая справка {{STUDENT_NAME}}, студенту {{COURSE}}-го курса {{FACULTY}}, группа {{GROUP}}, в том, что он(а) является студентом МГИМО МИД России и обучается по очной форме обучения.

Приказ о зачислении: № {{ENROLLMENT_NUMBER}} от {{ENROLLMENT_DATE}}

Справка выдана для предъявления в {{PURPOSE}}.

Справка действительна {{VALIDITY}} дней с момента выдачи.

Проверить подлинность документа можно на портале МГИМО: https://verify.mgimo.ru
Код проверки: {{QR_CODE}}
    `,
    signature: 'Проректор по учебной работе',
    stamp: 'ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ',
    verified: 'Подпись действительна',
  },
  en: {
    header: 'Ministry of Foreign Affairs of the Russian Federation\nMGIMO University',
    title: 'CERTIFICATE',
    docNumber: 'Ref. No.',
    date: 'Date:',
    content: () => `
CERTIFICATE

This is to certify that {{STUDENT_NAME}}, a {{COURSE}}-year student of {{FACULTY}}, group {{GROUP}}, is a student of MGIMO University and is studying on a full-time basis.

Enrollment Order: No. {{ENROLLMENT_NUMBER}} dated {{ENROLLMENT_DATE}}

This certificate is issued for presentation to {{PURPOSE}}.

This certificate is valid for {{VALIDITY}} days from the date of issue.

To verify the authenticity of this document, visit MGIMO portal: https://verify.mgimo.ru
Verification code: {{QR_CODE}}
    `,
    signature: 'Vice Rector for Academic Affairs',
    stamp: 'DOCUMENT SIGNED WITH ELECTRONIC SIGNATURE',
    verified: 'Signature is valid',
  },
};

const formatDate = (date: Date, locale: CertificateLanguage) => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return locale === 'ru'
    ? date.toLocaleDateString('ru-RU', options)
    : date.toLocaleDateString('en-US', options);
};

export const OfficialCertificateGenerator = ({
  user,
  request,
  onClose,
}: OfficialCertificateGeneratorProps) => {
  const [language, setLanguage] = useState<CertificateLanguage>('ru');
  const template = CERTIFICATE_TEMPLATES[language];

  const now = new Date();
  const docNumber = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${request.id.slice(-4).toUpperCase()}`;
  const enrollmentDate = new Date(2022, 8, 1); // 1 сентября 2022

  let purpose = 'Для предъявления по месту требования';
  if (language === 'en') {
    purpose = 'For presentation as requested';
  }

  const certificateContent = template
    .content()
    .replace('{{STUDENT_NAME}}', user.name)
    .replace('{{COURSE}}', String(user.course))
    .replace('{{FACULTY}}', user.faculty)
    .replace('{{GROUP}}', user.group)
    .replace('{{ENROLLMENT_NUMBER}}', '001')
    .replace('{{ENROLLMENT_DATE}}', formatDate(enrollmentDate, language))
    .replace('{{PURPOSE}}', purpose)
    .replace('{{VALIDITY}}', '90')
    .replace('{{QR_CODE}}', request.verificationQrCode || 'MGIMO-' + request.id);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const element = document.getElementById('certificate-content');
    if (element) {
      const html = element.innerHTML;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate_${user.studentId}_${language}.html`;
      link.click();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        {/* Toolbar */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Официальный документ</h2>

          {/* Переключатель языка */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage('ru')}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium transition-all ${
                language === 'ru'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="text-lg">🇷🇺</span>
              На русском
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium transition-all ${
                language === 'en'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="text-lg">🇬🇧</span>
              In English
            </button>
          </div>
        </div>

        {/* Certificate Content */}
        <div
          id="certificate-content"
          className="bg-white p-12 min-h-[1000px] font-serif text-slate-900"
        >
          {/* Letterhead */}
          <div className="text-center border-b-2 border-blue-900 pb-4 mb-8">
            <p className="text-xs uppercase tracking-widest text-slate-600 mb-2">
              Федеральное государственное автономное образовательное учреждение
              <br />
              высшего образования
            </p>
            <h1 className="text-lg font-bold text-blue-900 whitespace-pre-line leading-tight">
              {template.header}
            </h1>
            <div className="flex justify-between items-center mt-6 text-xs text-slate-600">
              <div>
                <p>
                  {template.docNumber} {docNumber}
                </p>
              </div>
              <div>
                <p>
                  {template.date} {formatDate(now, language)}
                </p>
              </div>
            </div>
          </div>

          {/* Certificate Title */}
          <h2 className="text-3xl font-bold text-center text-blue-900 mb-8 uppercase tracking-wide">
            {template.title}
          </h2>

          {/* Certificate Body */}
          <div className="whitespace-pre-wrap text-sm leading-relaxed mb-12 text-justify">
            {certificateContent}
          </div>

          {/* Signature Block */}
          <div className="mt-16 flex justify-between">
            {/* Left signature */}
            <div className="text-center">
              <div className="h-20 border-t-2 border-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-800">Подпись</p>
            </div>

            {/* Blue Stamp */}
            <motion.div
              animate={{ rotate: [-2, 2, -2] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="flex flex-col items-center justify-center"
            >
              <div className="border-4 border-blue-600 rounded-full px-6 py-4 text-center transform -rotate-12">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                  {template.stamp}
                </p>
                <p className="text-[8px] text-blue-600 mt-1 font-semibold">{template.verified}</p>
              </div>
            </motion.div>

            {/* Right signature */}
            <div className="text-center">
              <div className="h-20 border-t-2 border-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-800">{template.signature}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-slate-300 text-center text-[10px] text-slate-500">
            <p>
              Документ распечатан в соответствии с установленными требованиями МГИМО.
              <br />
              Проверка подлинности: https://verify.mgimo.ru | Код: {request.verificationQrCode}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-100"
          >
            Закрыть
          </button>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white px-4 py-2.5 text-sm font-medium transition-all"
            >
              <Printer className="h-4 w-4" />
              Печать
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm font-medium transition-all"
            >
              <Download className="h-4 w-4" />
              Скачать
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
