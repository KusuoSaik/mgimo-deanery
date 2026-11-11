import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  ArrowRight, 
  RefreshCw, 
  Smartphone, 
  Building2 
} from 'lucide-react';

export interface LoginScreenProps {
  onLoginSuccess: () => void;
}

type AuthMethod = 'mgimo' | 'esia';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('mgimo');
  const [loginInput, setLoginInput] = useState('i.ivanov@my.mgimo.ru');
  const [password, setPassword] = useState('••••••••••••');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(45);

  useEffect(() => {
    if (step !== '2fa' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('2fa');
  };

  const triggerVerification = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      onLoginSuccess();
    }, 900);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }

    if (newOtp.every((digit) => digit !== '')) {
      triggerVerification();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between items-center p-4 selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-md flex flex-col flex-grow justify-center py-6">
        {/* Шапка и логотип */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-950 border border-blue-600/30 shadow-lg shadow-blue-900/20 mb-3 text-amber-500">
            <Building2 className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Цифровой деканат</h1>
          <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mt-1">
            МГИМО МИД России
          </p>
        </div>

        {/* Карточка авторизации */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
          {step === 'credentials' ? (
            <div>
              {/* Переключатель методов входа */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl mb-6 border border-slate-700/50">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('mgimo');
                    setLoginInput('i.ivanov@my.mgimo.ru');
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    authMethod === 'mgimo'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  MGIMO ID
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('esia');
                    setLoginInput('123-456-789 00');
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    authMethod === 'esia'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Госуслуги (ЕСИА)
                </button>
              </div>

              <form onSubmit={handleInitialSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {authMethod === 'mgimo' ? 'Корпоративный логин (@my.mgimo.ru)' : 'СНИЛС или телефон'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder={authMethod === 'mgimo' ? 'student@my.mgimo.ru' : 'СНИЛС'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Пароль
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-2"
                >
                  Продолжить
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="text-center">
              <div className="inline-flex p-3 rounded-full bg-indigo-950/80 border border-blue-500/30 text-amber-500 mb-3">
                <Smartphone className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Двухфакторная проверка</h2>
              <p className="text-xs text-slate-400 mb-6">
                Введите 4-значный код из пуш-уведомления MGIMO ID
              </p>

              {/* Поля ввода 4-значного OTP */}
              <div className="flex justify-center gap-3 mb-6">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-12 h-14 text-center text-xl font-bold bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={triggerVerification}
                disabled={isVerifying}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 font-semibold text-sm py-3 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-4"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    Проверка сертификата...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Подтвердить вход
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  {countdown > 0 ? `Повторный код через ${countdown} сек` : 'Запросить код повторно'}
                </span>
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="text-blue-400 hover:underline"
                >
                  Назад ко входу
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Футер-бейдж соответствия 152-ФЗ */}
      <footer className="w-full max-w-md pt-4 pb-2 border-t border-slate-800 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-950/60 border border-blue-500/20 text-slate-300 text-[11px]">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Защищено по стандарту 152-ФЗ • Шифрование TLS 1.3</span>
        </div>
      </footer>
    </div>
  );
};
