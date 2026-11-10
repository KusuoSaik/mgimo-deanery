type LoginScreenProps = {
  onLoginSuccess: () => void;
};

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  return (
    <div className="flex min-h-screen flex-col justify-between bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-12 text-white">
      <div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-lg font-semibold text-amber-400">
          М
        </div>
        <p className="mt-8 text-xs text-slate-300">МГИМО</p>
        <h1 className="mt-2 font-semibold tracking-tight text-3xl">Цифровой деканат</h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-300">
          Расписание, баллы БРС, заявки в деканат и ассистент — в одном студенческом кабинете.
        </p>
      </div>
      <button
        type="button"
        onClick={onLoginSuccess}
        className="bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm w-full"
      >
        Войти через MGIMO ID
      </button>
    </div>
  );
}
