import { useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, FormEvent, KeyboardEvent, ReactNode } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import {
  AtSign,
  Check,
  ChevronDown,
  CircleAlert,
  Eye,
  EyeOff,
  Landmark,
  LoaderCircle,
  Lock,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react';
import type { Faculty, UserRole, RegisterData } from '../../auth/types';
import { validateCredentials, create2FASession, verify2FACode, resend2FACode, registerAccount } from '../../auth/authService';
import { Guilloche } from '../ui/Guilloche';
import { Segmented } from '../ui/primitives';

export interface LoginScreenProps {
  onLoginSuccess: () => void;
}

type Screen = 'credentials' | '2fa' | 'register';
type AuthMethod = 'mgimo' | 'esia';

const DEMO_ACCOUNTS = [
  { name: 'Алексей Волков', hint: 'Староста, отличник', initials: 'АВ', tone: 'bg-blue-900 text-amber-300', email: 'a.volkov@my.mgimo.ru', password: 'mgimo2026' },
  { name: 'Дмитрий Соколов', hint: 'Есть долги по БРС', initials: 'ДС', tone: 'bg-amber-900/70 text-amber-200', email: 'd.sokolov@my.mgimo.ru', password: 'debt1234' },
  { name: 'София Чен', hint: 'Иностранная студентка', initials: 'СЧ', tone: 'bg-emerald-900/70 text-emerald-200', email: 's.chen@my.mgimo.ru', password: 'china2025' },
];

const FACULTIES: Faculty[] = ['МО', 'МП', 'МЭО', 'МИЭП', 'ИМТУР', 'ФУП'];
const ROLES: UserRole[] = ['Студент', 'Староста', 'Иностранный студент'];

const inputBase =
  'w-full rounded-xl border bg-slate-950/50 py-3 text-[15px] text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:bg-slate-950/70 focus:ring-4 focus:ring-blue-500/15';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-slate-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <p className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-[13px] text-rose-300 ring-1 ring-inset ring-rose-500/20">
        <CircleAlert className="h-4 w-4 shrink-0" />
        {text}
      </p>
    </motion.div>
  );
}

function SelectField({ id, value, onChange, children }: { id: string; value: string | number; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputBase} appearance-none border-slate-700/80 pl-3.5 pr-9`}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  );
}

export const LoginScreen = ({ onLoginSuccess }: LoginScreenProps) => {
  const [screen, setScreen] = useState<Screen>('credentials');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('mgimo');
  const shake = useAnimationControls();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [otp, setOtp] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [generated2FACode, setGenerated2FACode] = useState('');
  const [pushVisible, setPushVisible] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFaculty, setRegFaculty] = useState<Faculty>('МО');
  const [regCourse, setRegCourse] = useState(1);
  const [regRole, setRegRole] = useState<UserRole>('Студент');
  const [regError, setRegError] = useState('');

  useEffect(() => {
    if (screen !== '2fa' || countdown <= 0) return;
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [screen, countdown]);

  useEffect(() => {
    if (!generated2FACode) return;
    console.info(`MGIMO ID: код подтверждения входа ${generated2FACode}`);
    const show = window.setTimeout(() => setPushVisible(true), 700);
    const hide = window.setTimeout(() => setPushVisible(false), 9000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [generated2FACode]);

  useEffect(() => {
    if (screen === '2fa') window.setTimeout(() => otpRefs.current[0]?.focus(), 350);
  }, [screen]);

  const triggerShake = () => {
    void shake.start({ x: [0, -10, 9, -7, 5, -2, 0], transition: { duration: 0.45 } });
  };

  const handleLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');
    const result = validateCredentials({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      setLoginError(result.error || 'Неверный логин или пароль');
      triggerShake();
      return;
    }
    if (result.account) {
      const code = create2FASession(result.account);
      setGenerated2FACode(code);
      setCountdown(30);
      setOtp(['', '', '', '']);
      setTwoFactorError('');
      setScreen('2fa');
    }
  };

  const verifyOtp = (code: string) => {
    setIsVerifying(true);
    setTwoFactorError('');
    window.setTimeout(() => {
      const result = verify2FACode(code);
      if (!result.success) {
        setTwoFactorError(result.error || 'Код не подошёл. Проверьте цифры и введите ещё раз.');
        setOtp(['', '', '', '']);
        setIsVerifying(false);
        triggerShake();
        otpRefs.current[0]?.focus();
        return;
      }
      setPushVisible(false);
      setVerified(true);
      window.setTimeout(() => {
        setIsVerifying(false);
        onLoginSuccess();
      }, 900);
    }, 800);
  };

  const fillOtp = (digits: string) => {
    const next = ['', '', '', ''].map((_, i) => digits[i] ?? '');
    setOtp(next);
    const firstEmpty = next.findIndex((d) => !d);
    otpRefs.current[firstEmpty === -1 ? 3 : firstEmpty]?.focus();
    if (next.every(Boolean)) verifyOtp(next.join(''));
  };

  const handleOtpChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length > 1) {
      fillOtp((otp.slice(0, index).join('') + digits).slice(0, 4));
      return;
    }
    const next = [...otp];
    next[index] = digits;
    setOtp(next);
    if (digits && index < 3) otpRefs.current[index + 1]?.focus();
    if (next.every((digit) => digit !== '')) verifyOtp(next.join(''));
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
    if (event.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < 3) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (digits) {
      event.preventDefault();
      fillOtp(digits);
    }
  };

  const handleResendCode = () => {
    const newCode = resend2FACode();
    if (newCode) {
      setGenerated2FACode(newCode);
      setCountdown(30);
      setOtp(['', '', '', '']);
      setTwoFactorError('');
      otpRefs.current[0]?.focus();
    }
  };

  const handleRegisterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegError('');
    const registerData: RegisterData = { fullName: regFullName, email: regEmail, password: regPassword, faculty: regFaculty, course: regCourse, role: regRole };
    const result = registerAccount(registerData);
    if (!result.success) {
      setRegError(result.error || 'Не удалось создать аккаунт');
      triggerShake();
      return;
    }
    setLoginEmail(regEmail);
    setLoginPassword(regPassword);
    setScreen('credentials');
    setRegError('');
  };

  const handleDemoLogin = (email: string, password: string) => {
    setLoginEmail(email);
    setLoginPassword(password);
    setLoginError('');
    setAuthMethod('mgimo');
  };

  const panel = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-slate-950 px-4 text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-950/80 via-slate-950 to-slate-950" />
      <div className="pointer-events-none absolute left-1/2 top-[-6rem] h-[34rem] w-[34rem] -translate-x-1/2">
        <Guilloche draw className="h-full w-full text-amber-300/[0.14]" />
      </div>
      <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-blue-700/20 blur-3xl" />

      <AnimatePresence>
        {screen === '2fa' && pushVisible && (
          <motion.button
            type="button"
            initial={{ y: -120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.6, bottom: 0.1 }}
            onDragEnd={(_, info) => info.offset.y < -30 && setPushVisible(false)}
            onClick={() => fillOtp(generated2FACode)}
            className="absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex items-center gap-3 rounded-[22px] bg-white/90 p-3 text-left text-slate-900 shadow-2xl shadow-black/40 ring-1 ring-black/5 backdrop-blur-xl"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-amber-300">
              <Landmark className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold">MGIMO ID</span>
                <span className="text-[11px] text-slate-500">сейчас</span>
              </span>
              <span className="block text-[13px] text-slate-700">
                Код для входа: <span className="tabular font-semibold tracking-[0.2em] text-slate-900">{generated2FACode}</span>
              </span>
              <span className="block text-[11px] text-slate-500">Нажмите, чтобы подставить</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-blue-800 to-indigo-950 text-amber-300 shadow-xl shadow-blue-950/60 ring-1 ring-white/15"
          >
            <Landmark className="h-8 w-8" strokeWidth={1.8} />
          </motion.div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Цифровой деканат</h1>
          <p className="mt-1 text-sm text-slate-400">МГИМО МИД России</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        <motion.div
          animate={shake}
          className="overflow-hidden rounded-3xl bg-slate-900/70 p-5 shadow-2xl shadow-black/40 ring-1 ring-inset ring-white/10 backdrop-blur-xl"
        >
          {screen !== '2fa' && (
            <Segmented
              id="auth-screen"
              tone="dark"
              className="mb-5"
              value={screen === 'register' ? 'register' : 'credentials'}
              onChange={(value) => {
                setScreen(value);
                setLoginError('');
                setRegError('');
              }}
              options={[
                { value: 'credentials', label: 'Вход' },
                { value: 'register', label: 'Регистрация' },
              ]}
            />
          )}

          <AnimatePresence mode="wait" initial={false}>
            {screen === 'credentials' && (
              <motion.div key="credentials" {...panel}>
                <div className="mb-5 flex gap-4 border-b border-white/10 text-[13px]">
                  {(
                    [
                      ['mgimo', 'MGIMO ID'],
                      ['esia', 'Госуслуги'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAuthMethod(value)}
                      className={`relative pb-2.5 font-medium transition-colors ${authMethod === value ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      {label}
                      {authMethod === value && <motion.span layoutId="auth-method" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-amber-400" />}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <Field label={authMethod === 'mgimo' ? 'Корпоративная почта' : 'СНИЛС или телефон'} htmlFor="login">
                    <div className="relative">
                      <AtSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        id="login"
                        type="text"
                        required
                        autoComplete="username"
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          setLoginError('');
                        }}
                        className={`${inputBase} pl-10 pr-3.5 ${loginError ? 'border-rose-500/70' : 'border-slate-700/80'}`}
                        placeholder={authMethod === 'mgimo' ? 'student@my.mgimo.ru' : '000-000-000 00'}
                      />
                    </div>
                  </Field>

                  <Field label="Пароль" htmlFor="password">
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          setLoginError('');
                        }}
                        className={`${inputBase} pl-10 pr-11 ${loginError ? 'border-rose-500/70' : 'border-slate-700/80'}`}
                        placeholder="Пароль"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition-colors hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>

                  <AnimatePresence>{loginError && <ErrorNote text={loginError} />}</AnimatePresence>

                  <button
                    type="submit"
                    className="pressable w-full rounded-xl bg-blue-600 px-4 py-3 text-[15px] font-medium text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500"
                  >
                    Продолжить
                  </button>
                </form>
              </motion.div>
            )}

            {screen === '2fa' && (
              <motion.div key="2fa" {...panel} className="text-center">
                <AnimatePresence mode="wait" initial={false}>
                  {verified ? (
                    <motion.span
                      key="ok"
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                    >
                      <Check className="h-7 w-7" strokeWidth={3} />
                    </motion.span>
                  ) : (
                    <motion.span key="phone" className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-amber-300 ring-1 ring-inset ring-white/10">
                      <Smartphone className="h-6 w-6" />
                    </motion.span>
                  )}
                </AnimatePresence>
                <h2 className="mt-4 text-lg font-semibold tracking-tight">{verified ? 'Вход подтверждён' : 'Подтвердите вход'}</h2>
                <p className="mx-auto mt-1 max-w-[17rem] text-[13px] text-slate-400">
                  {verified ? 'Открываем кабинет' : 'Мы отправили четырёхзначный код в приложение MGIMO ID'}
                </p>

                <div className="mt-6 flex justify-center gap-2.5">
                  {otp.map((digit, idx) => (
                    <motion.input
                      key={idx}
                      ref={(node) => {
                        otpRefs.current[idx] = node;
                      }}
                      id={`otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                      aria-label={`Цифра ${idx + 1}`}
                      maxLength={4}
                      value={digit}
                      disabled={isVerifying}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      animate={
                        verified
                          ? { borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.12)', scale: 1 }
                          : digit
                            ? { scale: [1, 1.08, 1], borderColor: '#fbbf24' }
                            : { scale: 1, borderColor: 'rgba(71,85,105,0.8)' }
                      }
                      transition={{ duration: 0.25, delay: verified ? idx * 0.05 : 0 }}
                      className="tabular h-14 w-12 rounded-xl border-2 bg-slate-950/50 text-center text-2xl font-semibold text-white caret-amber-400 outline-none transition-shadow focus:ring-4 focus:ring-amber-400/15 disabled:opacity-80"
                    />
                  ))}
                </div>

                <div className="mt-4 min-h-6">
                  <AnimatePresence mode="wait">
                    {isVerifying && !verified ? (
                      <motion.p key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2 text-[13px] text-slate-400">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Проверяем код
                      </motion.p>
                    ) : twoFactorError ? (
                      <ErrorNote key="err" text={twoFactorError} />
                    ) : null}
                  </AnimatePresence>
                </div>

                {!verified && (
                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-[13px]">
                    {countdown > 0 ? (
                      <span className="tabular text-slate-500">Новый код через {countdown} с</span>
                    ) : (
                      <button type="button" onClick={handleResendCode} className="font-medium text-blue-400 hover:text-blue-300">
                        Отправить код ещё раз
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setScreen('credentials');
                        setOtp(['', '', '', '']);
                        setTwoFactorError('');
                        setPushVisible(false);
                      }}
                      className="font-medium text-slate-400 hover:text-white"
                    >
                      Изменить логин
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {screen === 'register' && (
              <motion.div key="register" {...panel}>
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <Field label="ФИО полностью" htmlFor="reg-name">
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        id="reg-name"
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => {
                          setRegFullName(e.target.value);
                          setRegError('');
                        }}
                        className={`${inputBase} border-slate-700/80 pl-10 pr-3.5`}
                        placeholder="Иванов Иван Иванович"
                      />
                    </div>
                  </Field>
                  <Field label="Корпоративная почта" htmlFor="reg-email">
                    <div className="relative">
                      <AtSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => {
                          setRegEmail(e.target.value);
                          setRegError('');
                        }}
                        className={`${inputBase} border-slate-700/80 pl-10 pr-3.5`}
                        placeholder="i.ivanov@my.mgimo.ru"
                      />
                    </div>
                  </Field>
                  <Field label="Пароль, от 6 символов" htmlFor="reg-password">
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        id="reg-password"
                        type="password"
                        required
                        minLength={6}
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          setRegError('');
                        }}
                        className={`${inputBase} border-slate-700/80 pl-10 pr-3.5`}
                        placeholder="Придумайте пароль"
                      />
                    </div>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Факультет" htmlFor="reg-faculty">
                      <SelectField id="reg-faculty" value={regFaculty} onChange={(v) => setRegFaculty(v as Faculty)}>
                        {FACULTIES.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </SelectField>
                    </Field>
                    <Field label="Курс" htmlFor="reg-course">
                      <SelectField id="reg-course" value={regCourse} onChange={(v) => setRegCourse(Number(v))}>
                        {[1, 2, 3, 4].map((c) => (
                          <option key={c} value={c}>
                            {c} курс
                          </option>
                        ))}
                      </SelectField>
                    </Field>
                  </div>
                  <Field label="Статус" htmlFor="reg-role">
                    <SelectField id="reg-role" value={regRole} onChange={(v) => setRegRole(v as UserRole)}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </SelectField>
                  </Field>

                  <AnimatePresence>{regError && <ErrorNote text={regError} />}</AnimatePresence>

                  <button
                    type="submit"
                    className="pressable mt-1 w-full rounded-xl bg-blue-600 px-4 py-3 text-[15px] font-medium text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500"
                  >
                    Создать аккаунт
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        </motion.div>

        <AnimatePresence>
          {screen === 'credentials' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-6"
            >
              <p className="mb-2 px-1 text-xs text-slate-500">Демо-аккаунты: нажмите, чтобы подставить данные</p>
              <div className="overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.08]">
                {DEMO_ACCOUNTS.map((demo, index) => {
                  const active = loginEmail === demo.email;
                  return (
                    <button
                      key={demo.email}
                      type="button"
                      onClick={() => handleDemoLogin(demo.email, demo.password)}
                      className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.04] ${index > 0 ? 'border-t border-white/[0.06]' : ''}`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-xs font-semibold ${demo.tone}`}>{demo.initials}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-100">{demo.name}</span>
                        <span className="block text-xs text-slate-500">{demo.hint}</span>
                      </span>
                      <AnimatePresence>
                        {active && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-900">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="relative mx-auto flex w-full max-w-sm items-center justify-center gap-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-xs text-slate-500">
        <ShieldCheck className="h-4 w-4 text-emerald-500/80" />
        Данные защищены по 152-ФЗ, соединение TLS 1.3
      </footer>
    </div>
  );
};
