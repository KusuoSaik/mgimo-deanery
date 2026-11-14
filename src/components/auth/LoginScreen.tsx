import { useState, type FormEvent, type ReactNode } from 'react';
import { AtSign, Check, CircleAlert, Eye, EyeOff, Landmark, LoaderCircle, Lock, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import type { StoredAccount } from '../../auth/types';
import { login } from '../../auth/authService';
import { Guilloche } from '../ui/Guilloche';
import { Segmented } from '../ui/primitives';

export interface LoginScreenProps {
  onLoginSuccess: (account: StoredAccount) => void;
}

type AuthMethod = 'mgimo' | 'esia';

const DEMO_ACCOUNTS = [
  { name: 'Алексей Волков', hint: 'Староста, отличник', initials: 'АВ', tone: 'bg-blue-900 text-amber-300', email: 'a.volkov@my.mgimo.ru', identity: '158-472-836 21' },
  { name: 'Дмитрий Соколов', hint: 'Есть долги по БРС', initials: 'ДС', tone: 'bg-amber-900/70 text-amber-200', email: 'd.sokolov@my.mgimo.ru', identity: '172-583-947 45' },
  { name: 'София Чен', hint: 'Иностранная студентка', initials: 'СЧ', tone: 'bg-emerald-900/70 text-emerald-200', email: 's.chen@my.mgimo.ru', identity: '+7 (999) 782-34-91' },
];

const inputBase = 'w-full rounded-xl border bg-slate-950/50 py-3 text-[15px] text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:bg-slate-950/70 focus:ring-4 focus:ring-blue-500/15';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return <div><label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-slate-300">{label}</label>{children}</div>;
}

function ErrorNote({ text }: { text: string }) {
  return <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-[13px] text-rose-300 ring-1 ring-inset ring-rose-500/20"><CircleAlert className="h-4 w-4 shrink-0" />{text}</motion.p>;
}

export const LoginScreen = ({ onLoginSuccess }: LoginScreenProps) => {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('mgimo');
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [panel, setPanel] = useState<'login' | 'register'>('login');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError('');
    setIsLoading(true);
    const result = await login({ email: loginValue, password });
    setIsLoading(false);
    if (!result.success || !result.account) {
      setLoginError(result.error || 'Неверный логин или пароль');
      return;
    }
    onLoginSuccess(result.account);
  }

  function fillDemo(email: string, identity: string) {
    setLoginValue(authMethod === 'esia' ? identity : email);
    setPassword('');
    setLoginError('');
    setPanel('login');
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-slate-950 px-4 text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-950/80 via-slate-950 to-slate-950" />
      <div className="pointer-events-none absolute left-1/2 top-[-6rem] h-[34rem] w-[34rem] -translate-x-1/2"><Guilloche draw className="h-full w-full text-amber-300/[0.14]" /></div>
      <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-blue-700/20 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-blue-800 to-indigo-950 text-amber-300 shadow-xl shadow-blue-950/60 ring-1 ring-white/15">
            <Landmark className="h-8 w-8" strokeWidth={1.8} />
          </motion.div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight">Цифровой деканат</h1>
          <p className="mt-1 text-sm text-slate-300">Концепт личного кабинета студента МГИМО</p>
          <p className="mt-1.5 inline-block rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300 ring-1 ring-inset ring-amber-400/20">Конкурсный прототип • Не официальный сервис</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl bg-slate-900/70 p-5 shadow-2xl shadow-black/40 ring-1 ring-inset ring-white/10 backdrop-blur-xl">
          <Segmented id="auth-screen" tone="dark" className="mb-5" value={panel} onChange={(value) => { setPanel(value as 'login' | 'register'); setLoginError(''); }} options={[{ value: 'login', label: 'Вход' }, { value: 'register', label: 'О проекте' }]} />

          {panel === 'register' ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/20"><ShieldCheck className="h-6 w-6" /></div>
              <h2 className="text-lg font-semibold">Безопасный демо-доступ</h2>
              <p className="text-[13px] leading-relaxed text-slate-400">В этой конкурсной версии используются только вымышленные аккаунты. Пароли проверяются на сервере, сессия хранится в защищённой HttpOnly cookie.</p>
              <button type="button" onClick={() => setPanel('login')} className="pressable w-full rounded-xl bg-blue-600 px-4 py-3 text-[15px] font-medium text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500">Перейти ко входу</button>
            </div>
          ) : (
            <>
              <div className="mb-5 flex gap-4 border-b border-white/10 text-[13px]">
                {([['mgimo', 'MGIMO ID'], ['esia', 'СНИЛС или телефон']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setAuthMethod(value)} className={`relative pb-2.5 font-medium transition-colors ${authMethod === value ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>{label}{authMethod === value && <motion.span layoutId="auth-method" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-amber-400" />}</button>)}
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label={authMethod === 'mgimo' ? 'Корпоративная почта' : 'СНИЛС или телефон'} htmlFor="login">
                  <div className="relative"><AtSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input id="login" type="text" required autoComplete="username" value={loginValue} onChange={(event) => { setLoginValue(event.target.value); setLoginError(''); }} className={`${inputBase} border-slate-700/80 pl-10 pr-3.5`} placeholder={authMethod === 'mgimo' ? 'student@my.mgimo.ru' : '000-000-000 00'} /></div>
                </Field>
                <Field label="Пароль" htmlFor="password">
                  <div className="relative"><Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input id="password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setLoginError(''); }} className={`${inputBase} border-slate-700/80 pl-10 pr-11`} placeholder="Пароль" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:text-slate-300">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                </Field>
                {loginError && <ErrorNote text={loginError} />}
                <button type="submit" disabled={isLoading} className="pressable flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-[15px] font-medium text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 disabled:cursor-wait disabled:opacity-70">{isLoading ? <><LoaderCircle className="h-4 w-4 animate-spin" />Проверяем вход</> : 'Войти в кабинет'}</button>
              </form>
            </>
          )}
        </motion.div>

        {panel === 'login' && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6"><p className="mb-2 px-1 text-xs text-slate-500">Демо-аккаунты: подставляем логин, пароль указан в README</p><div className="overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.08]">{DEMO_ACCOUNTS.map((demo, index) => { const active = loginValue === demo.email || loginValue === demo.identity; return <button key={demo.email} type="button" onClick={() => fillDemo(demo.email, demo.identity)} className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.04] ${index > 0 ? 'border-t border-white/[0.06]' : ''}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-xs font-semibold ${demo.tone}`}>{demo.initials}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-100">{demo.name}</span><span className="block text-xs text-slate-500">{demo.hint}</span></span>{active && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-900"><Check className="h-3 w-3" strokeWidth={3} /></span>}</button>; })}</div></motion.div>}
      </div>

      <footer className="relative mx-auto flex w-full max-w-sm flex-col items-center justify-center gap-1 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center text-xs text-slate-500"><span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500/80" />Вымышленные демо-данные • Сессия защищена cookie</span><span className="text-[11px] text-slate-600">Концепт для конкурса «Цифровой деканат будущего»</span></footer>
    </div>
  );
};
