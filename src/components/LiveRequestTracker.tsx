import { motion } from 'framer-motion';
import { CheckCircle2, Clock, Zap } from 'lucide-react';
import type { RequestItem } from '../types';

interface LiveRequestTrackerProps {
  request: RequestItem;
  onStageChange: (request: RequestItem) => void;
}

const STAGES = [
  { number: 1, label: 'Зарегистрирована', description: 'в СЭД' },
  { number: 2, label: 'На проверке', description: 'в деканате' },
  { number: 3, label: 'На подписи', description: 'делегат' },
  { number: 4, label: 'Подписано', description: 'ЭЦП' },
  { number: 5, label: 'Готово', description: 'к выдаче' },
];

const STAGE_COLORS: Record<number, string> = {
  1: 'from-blue-500 to-blue-600',
  2: 'from-amber-500 to-amber-600',
  3: 'from-purple-500 to-purple-600',
  4: 'from-emerald-500 to-emerald-600',
  5: 'from-green-500 to-green-600',
};

export const LiveRequestTracker = ({ request, onStageChange }: LiveRequestTrackerProps) => {
  const currentStage = request.stage || 1;

  const handleAdvanceStage = () => {
    if (currentStage < 5) {
      const newRequest = {
        ...request,
        stage: (currentStage + 1) as 1 | 2 | 3 | 4 | 5,
        status: STAGES[currentStage]?.label as any,
        updatedAt: new Date().toLocaleString('ru-RU'),
      };

      if (currentStage === 4) {
        // На последнем этапе добавляем QR-код и время
        newRequest.verificationQrCode = `MGIMO-${request.id}-${Date.now()}`;
      }

      onStageChange(newRequest);
    }
  };

  return (
    <div className="space-y-4">
      {/* Жизненный цикл */}
      <div className="relative">
        {/* Линия соединения этапов */}
        <div className="absolute top-8 left-0 right-0 h-1 bg-slate-200 -z-10">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"
            animate={{ width: `${(currentStage / 5) * 100}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>

        {/* Этапы */}
        <div className="flex justify-between">
          {STAGES.map((stage) => {
            const isCompleted = stage.number < currentStage;
            const isCurrent = stage.number === currentStage;

            return (
              <motion.div
                key={stage.number}
                className="flex flex-col items-center relative z-10"
              >
                <motion.div
                  animate={{
                    scale: isCurrent ? 1.2 : 1,
                    boxShadow: isCurrent ? '0 0 20px rgba(59, 130, 246, 0.5)' : 'none',
                  }}
                  className={`h-16 w-16 rounded-full flex items-center justify-center font-semibold text-white mb-2 transition-all ${
                    isCompleted || isCurrent
                      ? `bg-gradient-to-br ${STAGE_COLORS[stage.number]}`
                      : 'bg-slate-300'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : isCurrent ? (
                    <Clock className="h-6 w-6 animate-spin" />
                  ) : (
                    <span>{stage.number}</span>
                  )}
                </motion.div>

                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-900">{stage.label}</p>
                  <p className="text-[10px] text-slate-500">{stage.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Кнопка ускорения */}
      {currentStage < 5 && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAdvanceStage}
          className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 flex items-center justify-center gap-2 transition-all shadow-lg"
        >
          <Zap className="h-5 w-5" />
          ⚡ Ускорить обработку (Демо-симуляция)
        </motion.button>
      )}

      {/* Статус */}
      <div className="text-center">
        <p className="text-sm text-slate-600">
          <span className="font-semibold">{STAGES[currentStage - 1]?.label}</span>
          {currentStage < 5 && (
            <span className="text-amber-600 ml-2">⏳ Обработка...</span>
          )}
          {currentStage === 5 && (
            <span className="text-emerald-600 ml-2">✓ Готово!</span>
          )}
        </p>
        {request.updatedAt && (
          <p className="text-xs text-slate-500 mt-1">Обновлено: {request.updatedAt}</p>
        )}
      </div>

      {/* QR-код для проверки подлинности */}
      {request.verificationQrCode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center"
        >
          <p className="text-xs font-semibold text-emerald-900 mb-2">Код проверки подлинности:</p>
          <p className="font-mono text-sm text-emerald-700 break-all">{request.verificationQrCode}</p>
          <p className="text-[10px] text-emerald-600 mt-1">
            Код действителен на портале проверки МГИМО
          </p>
        </motion.div>
      )}
    </div>
  );
};
