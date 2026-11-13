import { useState, useEffect } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  AlertCircle,
  UserPlus,
  LogIn,
} from 'lucide-react';
import type { Faculty, UserRole, RegisterData } from '../../auth/types';
import {
  validateCredentials,
  create2FASession,
  verify2FACode,
  resend2FACode,
  registerAccount,
} from '../../auth/authService';

export interface LoginScreenProps {
  onLoginSuccess: () => void;
}

type Screen = 'credentials' | '2fa' | 'register';
type AuthMethod = 'mgimo' | 'esia';

// Демо-аккаунты для быстрого входа
const DEMO_ACCOUNTS = [
  { label: 'Алексей — Староста', email: 'a.volkov@my.mgimo.ru', password: 'mgimo2026', badge: '⭐' },
  { label: 'Дмитрий — Должник', email: 'd.sokolov@my.mgimo.ru', password: 'debt1234', badge: '⚠️' },
  { label: 'София — Иностранец', email: 's.chen@my.mgimo.ru', password: 'china2025', badge: '🌍' },
];

export const LoginScreen = ({ onLoginSuccess }: LoginScreenProps) => {
  // State управление
  const [screen, setScreen] = useState<Screen>('credentials');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('mgimo');

  // Вход
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  // 2FA
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [generated2FACode, setGenerated2FACode] = useState('');

  // Регистрация
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFaculty, setRegFaculty] = useState<Faculty>('МО');
  const [regCourse, setRegCourse] = useState(1);
  const [regRole, setRegRole] = useState<UserRole>('Студент');
  const [regError, setRegError] = useState('');

  // Таймер для 2FA
  useEffect(() => {
    if (screen !== '2fa' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [screen, countdown]);

  // Показ сгенерированного кода как пуш-уведомление
  useEffect(() => {
    if (generated2FACode) {
      // Симуляция пуш-уведомления
      console.log(`
╔═══════════════════════════════════════════════╗
║         🔔 MGIMO ID Push Notification        ║
╠═══════════════════════════════════════════════╣
║                                               ║
║  Код подтверждения входа:                    ║
║                                               ║
║           ┌───┬───┬───┬───┐                  ║
║           │ ${generated2FACode[0]} │ ${generated2FACode[1]} │ ${generated2FACode[2]} │ ${generated2FACode[3]} │                  ║
║           └───┴───┴───┴───┘                  ║
║                                               ║
║  Действителен 5 минут                        ║
║                                               ║
╚═══════════════════════════════════════════════╝
      `);
    }
  }, [generated2FACode]);

  // Обработка входа (шаг 1)
  const handleLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');

    const result = validateCredentials({ email: loginEmail, password: loginPassword });

    if (!result.success) {
      setLoginError(result.error || 'Ошибка входа');
      triggerShakeAnimation();
      return;
    }

    if (result.account) {
      const code = create2FASession(result.account);
      setGenerated2FACode(code);
      setCountdown(30);
      setScreen('2fa');
    }
  };

  // Анимация тряски при ошибке
  const triggerShakeAnimation = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Обработка OTP
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
      verifyOtp(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Проверка 2FA кода
  const verifyOtp = (code: string) => {
    setIsVerifying(true);
    setTwoFactorError('');

    setTimeout(() => {
      const result = verify2FACode(code);

      if (!result.success) {
        setTwoFactorError(result.error || 'Неверный код');
        setOtp(['', '', '', '']);
        setIsVerifying(false);
        const firstInput = document.getElementById('otp-0');
        firstInput?.focus();
        return;
      }

      // Успешная авторизация
      setTimeout(() => {
        setIsVerifying(false);
        onLoginSuccess();
      }, 800);
    }, 900);
  };

  // Повторная отправка кода
  const handleResendCode = () => {
    const newCode = resend2FACode();
    if (newCode) {
      setGenerated2FACode(newCode);
      setCountdown(30);
      setOtp(['', '', '', '']);
      setTwoFactorError('');
      const firstInput = document.getElementById('otp-0');
      firstInput?.focus();
    }
  };

  // Регистрация
  const handleRegisterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegError('');

    const registerData: RegisterData = {
      fullName: regFullName,
      email: regEmail,
      password: regPassword,
      faculty: regFaculty,
      course: regCourse,
      role: regRole,
    };

    const result = registerAccount(registerData);

    if (!result.success) {
      setRegError(result.error || 'Ошибка регистрации');
      triggerShakeAnimation();
      return;
    }

    // После регистрации переходим ко входу
    setLoginEmail(regEmail);
    setLoginPassword(regPassword);
    setScreen('credentials');
    setRegError('');
  };

  // Быстрый вход для демо
  const handleDemoLogin = (email: string, password: string) => {
    setLoginEmail(email);
    setLoginPassword(password);
    setAuthMethod('mgimo');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between items-center p-4 selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-md flex flex-col flex-grow justify-center py-6">
        {/* Логотип */}
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
        <motion.div
          animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md"
        >
          <AnimatePresence mode="wait">
            {/* ВХОД */}
            {screen === 'credentials' && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Переключатель Вход/Регистрация */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl mb-6 border border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => setScreen('credentials')}
                    className="py-2 text-xs font-semibold rounded-lg transition-all bg-blue-600 text-white shadow-md"
                  >
                    <LogIn className="w-3.5 h-3.5 inline mr-1.5" />
                    Вход
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScreen('register');
                      setLoginError('');
                    }}
                    className="py-2 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-white"
                  >
                    <UserPlus className="w-3.5 h-3.5 inline mr-1.5" />
                    Регистрация
                  </button>
                </div>

                {/* Переключатель методов входа */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl mb-6 border border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => setAuthMethod('mgimo')}
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
                    onClick={() => setAuthMethod('esia')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      authMethod === 'esia'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Госуслуги (ЕСИА)
                  </button>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      {authMethod === 'mgimo' ? 'Корпоративный логин (@my.mgimo.ru)' : 'СНИЛС или телефон'}
                    </label>
                    <input
                      type="text"
                      required
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        setLoginError('');
                      }}
                      className={`w-full bg-slate-900/90 border ${
                        loginError ? 'border-red-500' : 'border-slate-700'
                      } text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                      placeholder={authMethod === 'mgimo' ? 'student@my.mgimo.ru' : 'СНИЛС'}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Пароль
                    </label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        setLoginError('');
                      }}
                      className={`w-full bg-slate-900/90 border ${
                        loginError ? 'border-red-500' : 'border-slate-700'
                      } text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                      placeholder="••••••••"
                    />
                  </div>

                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{loginError}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-2"
                  >
                    Продолжить
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </motion.div>
            )}

            {/* 2FA */}
            {screen === '2fa' && (
              <motion.div
                key="2fa"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <div className="inline-flex p-3 rounded-full bg-indigo-950/80 border border-blue-500/30 text-amber-500 mb-3">
                  <Smartphone className="w-6 h-6 animate-pulse" />
                </div>
                <h2 className="text-lg font-bold text-white mb-1">Двухфакторная проверка</h2>
                <p className="text-xs text-slate-400 mb-2">
                  Введите 4-значный код из пуш-уведомления MGIMO ID
                </p>
                <p className="text-[10px] text-amber-400/80 mb-6 font-mono">
                  (Для демо: код {generated2FACode} в консоли браузера)
                </p>

                {/* Поля ввода 4-значного OTP */}
                <div className="flex justify-center gap-3 mb-4">
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

                {twoFactorError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{twoFactorError}</span>
                  </motion.div>
                )}

                <button
                  type="button"
                  onClick={() => verifyOtp(otp.join(''))}
                  disabled={isVerifying || otp.some(d => !d)}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-semibold text-sm py-3 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-4"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
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
                  {countdown > 0 ? (
                    <span>Повторный код через {countdown} сек</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="text-blue-400 hover:underline"
                    >
                      Запросить код повторно
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setScreen('credentials');
                      setOtp(['', '', '', '']);
                      setTwoFactorError('');
                    }}
                    className="text-blue-400 hover:underline"
                  >
                    Назад
                  </button>
                </div>
              </motion.div>
            )}

            {/* РЕГИСТРАЦИЯ */}
            {screen === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Переключатель Вход/Регистрация */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl mb-6 border border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => {
                      setScreen('credentials');
                      setRegError('');
                    }}
                    className="py-2 text-xs font-semibold rounded-lg transition-all text-slate-400 hover:text-white"
                  >
                    <LogIn className="w-3.5 h-3.5 inline mr-1.5" />
                    Вход
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreen('register')}
                    className="py-2 text-xs font-semibold rounded-lg transition-all bg-blue-600 text-white shadow-md"
                  >
                    <UserPlus className="w-3.5 h-3.5 inline mr-1.5" />
                    Регистрация
                  </button>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      ФИО полностью
                    </label>
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => {
                        setRegFullName(e.target.value);
                        setRegError('');
                      }}
                      className={`w-full bg-slate-900/90 border ${
                        regError ? 'border-red-500' : 'border-slate-700'
                      } text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                      placeholder="Иванов Иван Иванович"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Корпоративный Email (@my.mgimo.ru)
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => {
                        setRegEmail(e.target.value);
                        setRegError('');
                      }}
                      className={`w-full bg-slate-900/90 border ${
                        regError ? 'border-red-500' : 'border-slate-700'
                      } text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                      placeholder="i.ivanov@my.mgimo.ru"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Пароль (минимум 6 символов)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
                        setRegError('');
                      }}
                      className={`w-full bg-slate-900/90 border ${
                        regError ? 'border-red-500' : 'border-slate-700'
                      } text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Факультет
                      </label>
                      <select
                        value={regFaculty}
                        onChange={(e) => setRegFaculty(e.target.value as Faculty)}
                        className="w-full bg-slate-900/90 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      >
                        <option value="МО">МО</option>
                        <option value="МП">МП</option>
                        <option value="МЭО">МЭО</option>
                        <option value="МИЭП">МИЭП</option>
                        <option value="ИМТУР">ИМТУР</option>
                        <option value="ФУП">ФУП</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Курс
                      </label>
                      <select
                        value={regCourse}
                        onChange={(e) => setRegCourse(Number(e.target.value))}
                        className="w-full bg-slate-900/90 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      >
                        <option value={1}>1 курс</option>
                        <option value={2}>2 курс</option>
                        <option value={3}>3 курс</option>
                        <option value={4}>4 курс</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Статус
                    </label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="w-full bg-slate-900/90 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="Студент">Студент</option>
                      <option value="Староста">Староста</option>
                      <option value="Иностранный студент">Иностранный студент</option>
                    </select>
                  </div>

                  {regError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{regError}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <UserPlus className="w-4 h-4" />
                    Зарегистрироваться
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Демо-плашка для быстрого входа */}
        {screen === 'credentials' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4"
          >
            <p className="text-[11px] text-slate-400 mb-3 text-center font-medium">
              Быстрый вход для демонстрации (тестовые сценарии)
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {DEMO_ACCOUNTS.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => handleDemoLogin(demo.email, demo.password)}
                  className="text-xs bg-slate-900/80 hover:bg-slate-700 border border-slate-600/50 text-slate-300 hover:text-white rounded-lg px-3 py-2 transition-all active:scale-95 font-medium"
                >
                  <span className="mr-1.5">{demo.badge}</span>
                  {demo.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full max-w-md border-t border-slate-800 pb-2 pt-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-indigo-950/60 px-3 py-1.5 text-[11px] text-slate-300">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>Защищено по стандарту 152-ФЗ · Шифрование TLS 1.3</span>
        </div>
      </footer>
    </div>
  );
};
