import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import type { GradeItem } from '../types';
import { BottomSheet } from './BottomSheet';

interface InteractiveGradeCardProps {
  item: GradeItem;
  index: number;
  isAtRisk?: boolean;
}

export const InteractiveGradeCard = ({ item, index, isAtRisk }: InteractiveGradeCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConsultDate, setSelectedConsultDate] = useState<string | null>(null);

  const percentage = (item.brsPoints / item.maxPoints) * 100;
  const statusColors = {
    'Автомат близко': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'Штатно': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'Требует внимания': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  };

  const colors = statusColors[item.status];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${colors.bg} ${colors.border}`}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-slate-900 flex-1">{item.subject}</h3>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${colors.text}`}>
            {item.brsPoints}/{item.maxPoints}
          </span>
        </div>

        {/* Прогресс-бар */}
        <div className="mb-3">
          <div className="h-2 rounded-full bg-white/60 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                item.status === 'Автомат близко'
                  ? 'bg-emerald-500'
                  : item.status === 'Штатно'
                    ? 'bg-blue-500'
                    : 'bg-red-500'
              }`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>{item.examType}</span>
          <span>{item.professor}</span>
        </div>
      </motion.div>

      {/* Bottom Sheet */}
      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title={item.subject}>
        <div className="space-y-6">
          {/* Статус и баллы */}
          <div className={`rounded-xl p-4 ${colors.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`flex items-center gap-2 font-semibold ${colors.text}`}>
                {item.status === 'Автомат близко' && <CheckCircle2 className="h-5 w-5" />}
                {item.status === 'Требует внимания' && <AlertCircle className="h-5 w-5" />}
                {item.status === 'Штатно' && <TrendingUp className="h-5 w-5" />}
                {item.status}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">Текущие баллы</span>
                <span className="font-bold">{item.brsPoints} / {item.maxPoints}</span>
              </div>
              <div className="h-3 rounded-full bg-white/60 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1 }}
                  className={`h-full rounded-full ${
                    item.status === 'Автомат близко'
                      ? 'bg-emerald-500'
                      : item.status === 'Штатно'
                        ? 'bg-blue-500'
                        : 'bg-red-500'
                  }`}
                />
              </div>
              <div className="text-xs text-slate-600">
                {item.status === 'Автомат близко'
                  ? `Осталось ${Math.max(0, 90 - item.brsPoints)} баллов до автомата`
                  : item.status === 'Требует внимания'
                    ? `Нужно ${70 - item.brsPoints} баллов до допуска к зачету`
                    : 'Хороший результат, не расслабляйтесь!'}
              </div>
            </div>
          </div>

          {/* Информация о предмете */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Тип экзамена</span>
              <span className="font-semibold text-slate-900">{item.examType}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Преподаватель</span>
              <span className="font-semibold text-slate-900">{item.professor}</span>
            </div>
          </div>

          {/* Записаться на консультацию (для красной зоны) */}
          {isAtRisk && item.status === 'Требует внимания' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h4 className="font-semibold text-amber-900 mb-3">Записаться на консультацию</h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-amber-900 mb-2">
                    Выберите дату
                  </label>
                  <select
                    value={selectedConsultDate || ''}
                    onChange={(e) => setSelectedConsultDate(e.target.value)}
                    className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Выберите дату...</option>
                    <option value="2026-11-15">15 ноября, 14:00 — 15:00</option>
                    <option value="2026-11-16">16 ноября, 10:00 — 11:00</option>
                    <option value="2026-11-17">17 ноября, 15:00 — 16:00</option>
                  </select>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!selectedConsultDate}
                  className="w-full rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-semibold py-2.5 transition-all"
                >
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Записаться
                </motion.button>
              </div>
            </div>
          )}

          {/* Рекомендации */}
          <div className="rounded-xl bg-slate-100 p-4">
            <h4 className="font-semibold text-slate-900 mb-2">Рекомендации</h4>
            <ul className="text-xs text-slate-700 space-y-1.5">
              {item.status === 'Требует внимания' && (
                <>
                  <li>✓ Посетите консультацию к преподавателю</li>
                  <li>✓ Решите дополнительные задачи из сборника</li>
                  <li>✓ Составьте план подготовки к пересдаче</li>
                  <li>✓ Обратитесь в деканат за поддержкой</li>
                </>
              )}
              {item.status === 'Штатно' && (
                <>
                  <li>✓ Поддерживайте текущий уровень</li>
                  <li>✓ Решайте дополнительные задачи для укрепления</li>
                  <li>✓ Посещайте семинары и лекции</li>
                </>
              )}
              {item.status === 'Автомат близко' && (
                <>
                  <li>✓ Отличная работа! Автомат почти гарантирован</li>
                  <li>✓ Продолжайте в том же духе</li>
                  <li>✓ Помогайте другим студентам</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </BottomSheet>
    </>
  );
};
