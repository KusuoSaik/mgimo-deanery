import React, { useState, useEffect } from 'react';
import type { UserProfile } from '../types';
import type { StoredAccount } from '../auth/types';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  QrCode,
  Smartphone,
  LogOut,
  RotateCcw,
  Lock,
  GraduationCap,
  Bot,
  Clock,
  ArrowRightLeft,
} from 'lucide-react';
import { getAllAccounts } from '../auth/authService';

export interface ProfileViewProps {
  user: UserProfile;
  account: StoredAccount;
  onLogout: () => void;
  onSwitchAccount: (account: StoredAccount) => void;
  onResetDemoData: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, account, onLogout, onSwitchAccount, onResetDemoData }) => {
  const [privacyMode, setPrivacyMode] = useState<boolean>(true);
  const [qrCounter, setQrCounter] = useState<number>(60);
  const [qrToken, setQrToken] = useState<string>('MGIMO-PASS-8841');
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const allAccounts = getAllAccounts();
  const otherAccounts = allAccounts.filter(acc => acc.id !== account.id);

  // Таймер ротации QR-кода турникета (каждые 60 секунд)
  useEffect(() => {
    const timer = setInterval(() => {
      setQrCounter((prev) => {
        if (prev <= 1) {
          setQrToken(`MGIMO-PASS-${Math.floor(1000 + Math.random() * 9000)}`);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Маскирование персональных данных в соответствии с Privacy Mode
  const maskPassport = (value: string) => {
    if (!privacyMode) return value;
    const clean = value.replace(/\s+/g, '');
    if (clean.length < 5) return '45** *** 892';
    return `${clean.slice(0, 2)}** *** ${clean.slice(-3)}`;
  };

  const maskSnils = (value: string) => {
    if (!privacyMode) return value;
    return '***-***-*** 84';
  };

  const maskPhone = (value: string) => {
    if (!privacyMode) return value;
    return '+7 (***) ***-**-94';
  };

  return (
    <div className="pb-24">
      <header className="bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-b-3xl px-4 pb-5 pt-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold tracking-tight text-xl">Профиль студента</h1>
            <p className="mt-1 text-xs text-slate-300">
              {user.course} курс · {user.group}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPrivacyMode(!privacyMode)}
            aria-label={privacyMode ? 'Показать персональные данные' : 'Скрыть персональные данные'}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
              privacyMode
                ? 'border-blue-500/40 bg-blue-600/20 text-blue-400'
                : 'border-amber-500/40 bg-amber-500/20 text-amber-400'
            }`}
          >
            {privacyMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{privacyMode ? 'Скрыто' : 'Показано'}</span>
          </button>
        </div>
      </header>

      <div className="space-y-4 px-4 py-4">

        <section className="relative overflow-hidden rounded-2xl border border-blue-500/40 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 p-5 shadow-md">
          <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-blue-600/10 blur-2xl" />

          <div className="mb-4 flex items-start justify-between border-b border-slate-700/60 pb-3">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                <GraduationCap className="h-4 w-4" />
                <span>МГИМО МИД России</span>
              </div>
              <h2 className="mt-0.5 text-sm font-bold text-white">Цифровой студенческий билет</h2>
            </div>
            <span className="rounded border border-blue-500/30 bg-blue-900/60 px-2 py-0.5 font-mono text-[10px] text-blue-300">
              {user.studentId}
            </span>
          </div>

          <div className="mb-5 flex items-center gap-4">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="h-16 w-16 shrink-0 rounded-2xl border-2 border-amber-500/60 object-cover shadow-md"
            />
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-white">{user.name}</h3>
              <p className="truncate text-xs text-slate-300">{user.faculty}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <span>{user.course} курс</span>
                <span>•</span>
                <span className="font-mono">Группа {user.group}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="relative mb-2 rounded-xl bg-white p-2.5 shadow-inner">
              <QrCode className="h-28 w-28 text-slate-950" aria-hidden="true" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                  МГИМО
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span>Обновление через {qrCounter} сек</span>
            </div>
            <span className="mt-0.5 text-[10px] text-slate-500">
              Токен: {qrToken} · Защита от передачи скриншота
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-3 text-center">
            <div className="rounded-xl border border-slate-700/30 bg-slate-800/40 p-2">
              <span className="block text-[10px] text-slate-400">БРС Средний</span>
              <span className="text-sm font-bold text-emerald-400">{user.brsAverage}</span>
            </div>
            <div className="rounded-xl border border-slate-700/30 bg-slate-800/40 p-2">
              <span className="block text-[10px] text-slate-400">GPA</span>
              <span className="text-sm font-bold text-blue-400">{user.gpa.toFixed(2)}</span>
            </div>
            <div className="rounded-xl border border-slate-700/30 bg-slate-800/40 p-2">
              <span className="block text-[10px] text-slate-400">Рейтинг</span>
              <span className="text-sm font-bold text-amber-500">#{user.ratingPlace}</span>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-800/70 p-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Lock className="h-3.5 w-3.5 text-blue-400" />
              Персональные данные (152-ФЗ)
            </h3>
          </div>

          <dl className="space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-700/40 py-1.5">
              <dt className="text-slate-400">Паспорт РФ</dt>
              <dd className="font-mono text-slate-200">{maskPassport(user.passport)}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-700/40 py-1.5">
              <dt className="text-slate-400">СНИЛС</dt>
              <dd className="font-mono text-slate-200">{maskSnils(user.snils)}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-700/40 py-1.5">
              <dt className="text-slate-400">Телефон</dt>
              <dd className="font-mono text-slate-200">{maskPhone(user.phone)}</dd>
            </div>
            <div className="flex justify-between py-1.5">
              <dt className="text-slate-400">Корпоративная почта</dt>
              <dd className="font-mono text-slate-200">{user.email}</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-3 rounded-2xl border border-indigo-900/60 bg-indigo-950/40 p-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white">
            <Bot className="h-4 w-4 text-amber-500" />
            Безопасность и согласие на обработку ПДн
          </h3>

          <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="mt-0.5 shrink-0 rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">PII Masking Gateway</span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                  ACTIVE
                </span>
              </div>
              <p className="mt-1 leading-relaxed text-slate-400">
                Обезличивание включено: при обращении к ИИ-ассистенту деканата ФИО, паспорт и СНИЛС заменяются на токены
                внутри контура МГИМО (152-ФЗ).
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Активные сессии</span>
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-xs">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="font-medium text-slate-200">iPhone 15 Pro · Мобильный PWA</p>
                  <p className="text-[10px] text-slate-500">Москва, пр-т Вернадского, 76 · Онлайн</p>
                </div>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            </div>
          </div>
        </section>

        <div className="space-y-2">
          {otherAccounts.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAccountSwitcher(!showAccountSwitcher)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-900/30 bg-indigo-950/40 px-4 py-3 text-xs font-medium text-indigo-400 transition-all hover:border-indigo-700/50 hover:bg-indigo-900/40"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Переключить аккаунт
            </button>
          )}

          {showAccountSwitcher && otherAccounts.length > 0 && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/70 p-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase text-slate-400 px-2">Другие аккаунты</p>
              {otherAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    onSwitchAccount(acc);
                    setShowAccountSwitcher(false);
                  }}
                  className="w-full rounded-lg border border-slate-700/30 bg-slate-900/60 hover:bg-slate-700/60 px-3 py-2 text-left transition-all text-xs"
                >
                  <div className="font-medium text-slate-200">{acc.profile.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {acc.profile.course} курс · {acc.profile.group}
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onResetDemoData}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-900/30 bg-slate-800/80 px-4 py-3 text-xs font-medium text-amber-400 transition-all hover:border-amber-700/50 hover:bg-amber-950/40"
          >
            <RotateCcw className="h-4 w-4" />
            Сбросить демо-данные
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-900/30 bg-slate-800/80 px-4 py-3 text-xs font-medium text-rose-400 transition-all hover:border-rose-700/50 hover:bg-rose-950/40"
          >
            <LogOut className="h-4 w-4" />
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
};
