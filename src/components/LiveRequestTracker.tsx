import { AnimatePresence, motion } from 'framer-motion';
import { Check, FastForward, ShieldCheck } from 'lucide-react';
import type { RequestItem } from '../types';
import { REQUEST_STAGES } from './ui/tokens';

interface LiveRequestTrackerProps {
  request: RequestItem;
  onStageChange: (request: RequestItem) => void;
}

const STAMP_KEYS = ['registered', 'inReview', 'inSigning', 'signed', 'ready'] as const;

export const LiveRequestTracker = ({ request, onStageChange }: LiveRequestTrackerProps) => {
  const currentStage = request.stage || 1;

  const handleAdvanceStage = () => {
    if (currentStage >= 5) return;
    const next = REQUEST_STAGES[currentStage];
    const stamp = new Date().toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const updated: RequestItem = {
      ...request,
      stage: next.stage,
      status: next.status,
      updatedAt: stamp,
      timestamps: { ...request.timestamps, [STAMP_KEYS[next.stage - 1]]: stamp },
    };
    if (next.stage === 5 && !updated.verificationQrCode) {
      updated.verificationQrCode = `MGIMO-${request.id.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    }
    onStageChange(updated);
  };

  return (
    <div>
      <ol className="relative">
        {REQUEST_STAGES.map((stage, index) => {
          const done = stage.stage < currentStage || currentStage === 5;
          const current = stage.stage === currentStage && currentStage < 5;
          const stamp = request.timestamps?.[STAMP_KEYS[index]] ?? (stage.stage === 1 ? request.createdAt : undefined);
          const last = index === REQUEST_STAGES.length - 1;
          return (
            <li key={stage.stage} className="relative flex gap-3 pb-5 last:pb-0">
              {!last && (
                <span className="absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-0.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                  <motion.span
                    className="block w-full bg-blue-600"
                    initial={false}
                    animate={{ height: stage.stage < currentStage ? '100%' : '0%' }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
              )}
              <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center">
                {current && <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/25" />}
                <motion.span
                  initial={false}
                  animate={{
                    backgroundColor: done ? (stage.stage === 5 ? '#10b981' : '#2563eb') : current ? '#ffffff' : '#f1f5f9',
                    borderColor: done ? (stage.stage === 5 ? '#10b981' : '#2563eb') : current ? '#2563eb' : '#e2e8f0',
                    scale: current ? 1.08 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className="relative flex h-7 w-7 items-center justify-center rounded-full border-2"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {done ? (
                      <motion.span key="check" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 22 }}>
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                      </motion.span>
                    ) : (
                      <motion.span key="num" className={`text-[11px] font-semibold ${current ? 'text-blue-600' : 'text-slate-400'}`}>
                        {stage.stage}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.span>
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`text-sm ${done || current ? 'font-semibold text-slate-900' : 'font-medium text-slate-400'}`}>{stage.label}</p>
                  {stamp && (done || current) && <span className="tabular shrink-0 text-xs text-slate-400">{stamp}</span>}
                </div>
                <p className={`mt-0.5 text-[13px] ${done || current ? 'text-slate-500' : 'text-slate-400'}`}>{stage.hint}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <AnimatePresence initial={false}>
        {currentStage < 5 && (
          <motion.button
            key="advance"
            type="button"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onClick={handleAdvanceStage}
            className="pressable mt-4 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            <FastForward className="h-4 w-4" />
            Демо: следующий этап
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {request.verificationQrCode && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-start gap-3 rounded-xl bg-emerald-50 p-3.5 ring-1 ring-inset ring-emerald-200"
          >
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-emerald-900">Код проверки подлинности</p>
              <p className="tabular mt-0.5 break-all text-sm font-semibold tracking-wide text-emerald-700">{request.verificationQrCode}</p>
              <p className="mt-1 text-xs text-emerald-700/70">Проверяется на verify.mgimo.ru</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
