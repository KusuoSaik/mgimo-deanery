import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRightLeft, ChevronRight, Eye, EyeOff, LogOut, RotateCcw, ShieldCheck, Smartphone } from 'lucide-react';
import type { UserProfile } from '../types';
import type { StoredAccount } from '../auth/types';
import { getAllAccounts } from '../auth/authService';
import { Avatar, CountUp, PageHeader } from './ui/primitives';
import { Guilloche } from './ui/Guilloche';
import { PseudoQr } from './ui/PseudoQr';

export interface ProfileViewProps {
  user: UserProfile;
  account: StoredAccount;
  onLogout: () => void;
  onSwitchAccount: (account: StoredAccount) => void;
  onResetDemoData: () => void;
}

const QR_PERIOD = 60;

function TimerRing({ value }: { value: number }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 -rotate-90" aria-hidden="true">
      <circle cx="12" cy="12" r={r} fill="none" strokeWidth="2.5" className="stroke-white/15" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-amber-400 transition-[stroke-dashoffset] duration-1000 ease-linear"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / QR_PERIOD)}
      />
    </svg>
  );
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, account, onLogout, onSwitchAccount, onResetDemoData }) => {
  const [privacyMode, setPrivacyMode] = useState(true);
  const [qrCounter, setQrCounter] = useState(QR_PERIOD);
  const [qrToken, setQrToken] = useState('MGIMO-PASS-8841');
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const otherAccounts = getAllAccounts().filter((acc) => acc.id !== account.id);

  useEffect(() => {
    const timer = setInterval(() => {
      setQrCounter((prev) => {
        if (prev <= 1) {
          setQrToken(`MGIMO-PASS-${Math.floor(1000 + Math.random() * 9000)}`);
          return QR_PERIOD;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const personal = [
    {
      label: 'Паспорт РФ',
      shown: user.passport,
      hidden: (() => {
        const c = user.passport.replace(/\s+/g, '');
        return c.length < 5 ? '•• ••••••' : `${c.slice(0, 2)}•• •••${c.slice(-3)}`;
      })(),
    },
    {
      label: 'СНИЛС',
      shown: user.snils,
      hidden: user.snils.length < 5 ? user.snils : `•••-•••-••• ${user.snils.slice(-2)}`,
    },
    { label: 'Телефон', shown: user.phone, hidden: `+7 (•••) •••-••-${user.phone.slice(-2)}` },
    { label: 'Почта', shown: user.email, hidden: user.email },
  ];

  return (
    <div className="pb-24">
      <PageHeader title="Профиль" subtitle={user.faculty} className="pb-16" />

      <div className="relative -mt-12 space-y-5 px-4">
        <motion.section
          initial={{ opacity: 0, y: 18, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformPerspective: 900 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-5 text-white shadow-[0_24px_48px_-20px_rgb(15_23_42/0.6)] ring-1 ring-white/10"
        >
          <Guilloche className="absolute -right-24 -top-24 h-80 w-80 text-amber-300/[0.16]" />
          <Guilloche className="absolute -bottom-40 -left-32 h-80 w-80 text-blue-300/[0.08]" />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-amber-300">Цифровой студенческий билет</p>
              <p className="mt-0.5 text-[11px] text-slate-400">Концепт для конкурса • Не является официальным сервисом МГИМО</p>
            </div>
            <span className="tabular rounded-lg bg-white/[0.08] px-2 py-1 text-xs text-slate-200 ring-1 ring-inset ring-white/10">№ {user.studentId}</span>
          </div>

          <div className="relative mt-5 flex items-center gap-4">
            <Avatar src={user.avatarUrl} name={user.name} size={64} className="ring-2 ring-amber-400/40" />
            <div className="min-w-0">
              <h2 className="text-[17px] font-semibold leading-snug tracking-tight">{user.name}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {user.course} курс, группа {user.group}
                {user.role && user.role !== 'Студент' ? `, ${user.role.toLowerCase()}` : ''}
              </p>
            </div>
          </div>

          <div className="relative mt-5 flex items-center gap-4 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-inset ring-white/10">
            <div className="relative h-[104px] w-[104px] shrink-0 overflow-hidden rounded-xl bg-white p-1.5">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={qrToken}
                  initial={{ opacity: 0, scale: 0.92, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 1.04 }}
                  transition={{ duration: 0.4 }}
                >
                  <PseudoQr token={qrToken} className="h-full w-full" />
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Пропуск в корпус</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-slate-300">
                <TimerRing value={qrCounter} />
                <span className="tabular">Новый код через {qrCounter} с</span>
              </p>
              <p className="tabular mt-2 truncate text-[11px] text-slate-500">{qrToken}</p>
            </div>
          </div>
        </motion.section>

        <section className="grid grid-cols-3 gap-2">
          {[
            { label: 'БРС', value: user.brsAverage, decimals: 0, tone: 'text-slate-900' },
            { label: 'Средний балл', value: user.gpa, decimals: 2, tone: 'text-amber-600' },
            { label: 'Место', value: user.ratingPlace, decimals: 0, tone: 'text-slate-900', prefix: '№ ' },
          ].map((stat) => (
            <div key={stat.label} className="card px-2 py-3 text-center">
              <CountUp value={stat.value} decimals={stat.decimals} prefix={stat.prefix} className={`text-xl font-semibold tracking-tight ${stat.tone}`} />
              <p className="mt-0.5 text-[11px] text-slate-500">{stat.label}</p>
            </div>
          ))}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-4">
            <div>
              <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">Персональные данные</h3>
              <p className="text-xs text-slate-500">Скрыты по умолчанию, 152-ФЗ</p>
            </div>
            <button
              type="button"
              onClick={() => setPrivacyMode((value) => !value)}
              aria-pressed={!privacyMode}
              className="pressable flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              {privacyMode ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {privacyMode ? 'Показать' : 'Скрыть'}
            </button>
          </div>
          <dl className="divide-y divide-slate-100 px-4">
            {personal.map((row) => {
              const value = privacyMode ? row.hidden : row.shown;
              return (
                <div key={row.label} className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-[13px] text-slate-500">{row.label}</dt>
                  <dd className="tabular relative min-w-0 overflow-hidden text-right text-sm font-medium text-slate-900">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={value}
                        initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
                        transition={{ duration: 0.22 }}
                        className="block truncate"
                      >
                        {value}
                      </motion.span>
                    </AnimatePresence>
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>

        <section className="card divide-y divide-slate-100 overflow-hidden">
          <div className="flex items-start gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">Обезличивание для ИИ</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  включено
                </span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                ФИО, паспорт и СНИЛС заменяются токенами, прежде чем запрос уйдёт ассистенту.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Smartphone className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">iPhone 15 Pro, это устройство</p>
              <p className="mt-0.5 truncate text-[13px] text-slate-500">Москва, пр-т Вернадского, 76</p>
            </div>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>
        </section>

        <section className="card overflow-hidden">
          {otherAccounts.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowAccountSwitcher((value) => !value)}
                aria-expanded={showAccountSwitcher}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
              >
                <ArrowRightLeft className="h-[18px] w-[18px] text-slate-400" />
                <span className="flex-1 text-sm font-medium text-slate-900">Сменить аккаунт</span>
                <motion.span animate={{ rotate: showAccountSwitcher ? 90 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {showAccountSwitcher && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden bg-slate-50"
                  >
                    {otherAccounts.map((acc) => (
                      <li key={acc.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onSwitchAccount(acc);
                            setShowAccountSwitcher(false);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-100"
                        >
                          <Avatar src={acc.profile.avatarUrl} name={acc.profile.name} size={32} className="rounded-[10px]" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-slate-900">{acc.profile.name}</span>
                            <span className="block text-xs text-slate-500">
                              {acc.profile.course} курс, {acc.profile.group}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </>
          )}
          <button
            type="button"
            onClick={onResetDemoData}
            className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3.5 text-left transition-colors first:border-t-0 hover:bg-slate-50"
          >
            <RotateCcw className="h-[18px] w-[18px] text-slate-400" />
            <span className="flex-1 text-sm font-medium text-slate-900">Сбросить демо-данные</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3.5 text-left transition-colors hover:bg-rose-50"
          >
            <LogOut className="h-[18px] w-[18px] text-rose-500" />
            <span className="flex-1 text-sm font-medium text-rose-600">Выйти из аккаунта</span>
          </button>
        </section>
      </div>
    </div>
  );
};
