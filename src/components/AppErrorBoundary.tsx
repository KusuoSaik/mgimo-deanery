import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, info: ErrorInfo) {
    console.error('Portal render failed', info.componentStack?.split('\n')[1]);
  }
  render() {
    if (this.state.failed) return <main role="alert" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 bg-slate-950 p-6 text-white">
      <p className="text-xs text-amber-300">Конкурсный прототип · Contest prototype</p>
      <h1 className="text-2xl font-semibold">Не удалось открыть экран</h1>
      <p className="text-sm text-slate-300">Обновите кабинет. Уже отправленные заявки сохраняются на сервере; незавершённый ввод может потребоваться повторить.</p>
      <button type="button" className="min-h-11 rounded-xl bg-blue-600 p-3 font-medium" onClick={() => location.reload()}>Обновить кабинет / Reload</button>
    </main>;
    return this.props.children;
  }
}
