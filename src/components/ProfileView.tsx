import React, { useState, useEffect } from 'react';
import type { UserProfile } from '../types';
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
  Clock
} from 'lucide-react';

export interface ProfileViewProps {
  user: UserProfile;
  onLogout: () => void;
  onResetDemoData: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onLogout, onResetDemoData }) => {
  const [privacyMode, setPrivacyMode] = useState<boolean>(true);
  const [qrCounter, setQrCounter] = useState<number>(60);
  const [qrToken, setQrToken] = useState<string>('MGIMO-PASS-8841');

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
    <div className="w-full max-w-md mx-auto min-h-screen bg-slate-900 text-slate-100 p-4 pb-24 space-y-5 selection:bg-blue-600">
      
      {/* Верхняя панель и переключатель Privacy Mode */}
      <div className="flex items-center justify-between bg-slate-800/80 border border-slate-700/60 p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-slate-300">Скрыть персональные данные</span>
        </div>
        <button
          type="button"
          onClick={() => setPrivacyMode(!privacyMode)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
            privacyMode
              ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
              : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
          }`}
        >
          {privacyMode ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Скрыто</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Показано</span>
            </>
          )}
        </button>
      </div>

      {/* Интерактивная карточка: Цифровой студенческий билет и кампусный пропуск */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border border-blue-500/40 p-5 shadow-2xl">
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Шапка билета */}
        <div className="flex items-start justify-between border-b border-slate-700/60 pb-3 mb-4">
          <div>
            <div className="flex items-center gap-1.5 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" />
              <span>МГИМО МИД России</span>
            </div>
            <h2 className="text-sm font-bold text-white mt-0.5">
              Цифровой студенческий билет и пропуск
            </h2>
          </div>
          <span className="text-[10px] bg-blue-900/60 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-500/30">
            {user.studentId}
          </span>
        </div>

        {/* Персональная информация */}
        <div className="flex gap-4 items-center mb-5">
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500/60 shadow-md shrink-0"
          />
          <div className="min-w-0">
            <h3 className="font-bold text-base text-white truncate">{user.name}</h3>
            <p className="text-xs text-slate-300 truncate">{user.faculty}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span>{user.course} курс</span>
              <span>•</span>
              <span className="font-mono">Группа {user.group}</span>
            </div>
          </div>
        </div>

        {/* Динамический QR-код турникета с таймером обновления */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center">
          <div className="relative p-2.5 bg-white rounded-xl shadow-inner mb-2">
            <QrCode className="w-28 h-28 text-slate-950" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="bg-blue-600 text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow">
                МГИМО
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Обновление QR через {qrCounter} сек</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5">
            Токен: {qrToken} • Защита от передачи скриншота
          </span>
        </div>

        {/* Метрики успеваемости студента */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center">
          <div className="bg-slate-800/40 rounded-xl p-2 border border-slate-700/30">
            <span className="text-[10px] text-slate-400 block">БРС Средний</span>
            <span className="text-sm font-bold text-emerald-400">{user.brsAverage}%</span>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-2 border border-slate-700/30">
            <span className="text-[10px] text-slate-400 block">GPA</span>
            <span className="text-sm font-bold text-blue-400">{user.gpa.toFixed(2)}</span>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-2 border border-slate-700/30">
            <span className="text-[10px] text-slate-400 block">Рейтинг</span>
            <span className="text-sm font-bold text-amber-500">#{user.ratingPlace}</span>
          </div>
        </div>
      </div>

      {/* Персональные данные (с кнопкой глаза для быстрого переключения) */}
      <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            Персональные данные (152-ФЗ)
          </h4>
          <button
            type="button"
            onClick={() => setPrivacyMode(!privacyMode)}
            className="text-slate-400 hover:text-white transition-colors"
            title="Показать или скрыть данные"
          >
            {privacyMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1.5 border-b border-slate-700/40">
            <span className="text-slate-400">Паспорт РФ</span>
            <span className="font-mono text-slate-200">{maskPassport(user.passport)}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-700/40">
            <span className="text-slate-400">СНИЛС</span>
            <span className="font-mono text-slate-200">{maskSnils(user.snils)}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-slate-700/40">
            <span className="text-slate-400">Телефон</span>
            <span className="font-mono text-slate-200">{maskPhone(user.phone)}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-slate-400">Корпоративная почта</span>
            <span className="font-mono text-slate-200">{user.email}</span>
          </div>
        </div>
      </div>

      {/* Блок «Безопасность и согласие на обработку ПДн» */}
      <div className="bg-indigo-950/40 border border-indigo-900/60 rounded-2xl p-4 space-y-3">
        <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
          <Bot className="w-4 h-4 text-amber-500" />
          Безопасность и согласие на обработку ПДн
        </h4>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">PII Masking Gateway</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                ACTIVE
              </span>
            </div>
            <p className="text-slate-400 mt-1 leading-relaxed">
              Обезличивание включено: при обращении к ИИ-ассистенту деканата ФИО, паспорт и СНИЛС заменяются на токены внутри контура МГИМО (152-ФЗ).
            </p>
          </div>
        </div>

        {/* Список активных сессий */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] text-slate-400 uppercase font-semibold">Активные сессии</span>
          <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-slate-200 font-medium">iPhone 15 Pro • Мобильный PWA</p>
                <p className="text-[10px] text-slate-500">Москва, пр-т Вернадского, 76 • Онлайн</p>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={onResetDemoData}
          className="w-full bg-slate-800/80 hover:bg-amber-950/40 text-amber-400 border border-amber-900/30 hover:border-amber-700/50 font-medium text-xs py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Сбросить демо-данные
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full bg-slate-800/80 hover:bg-rose-950/40 text-rose-400 border border-rose-900/30 hover:border-rose-700/50 font-medium text-xs py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Выйти из аккаунта
        </button>
      </div>

    </div>
  );
};
