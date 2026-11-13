import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GradeItem, UserProfile } from '../types';
import { InteractiveGradeCard } from './InteractiveGradeCard';
import { AIGradePrediction } from './AIGradePrediction';

type GradesViewProps = {
  user: UserProfile;
  grades: GradeItem[];
};

type GradeFilter = 'Все' | GradeItem['examType'];

const FILTERS: GradeFilter[] = ['Все', 'Экзамен', 'Зачет'];

export default function GradesView({ user, grades }: GradesViewProps) {
  const [filter, setFilter] = useState<GradeFilter>('Все');
  const visible = grades.filter((item) => filter === 'Все' || item.examType === filter);

  // Проверяем, есть ли дисциплины в красной зоне
  const hasAtRiskGrades = grades.some((g) => g.status === 'Требует внимания');

  return (
    <div className="pb-24">
      <header className="bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-b-3xl px-4 pb-6 pt-6 shadow-md">
        <h1 className="font-semibold tracking-tight text-xl">Зачётка и БРС</h1>
        <p className="mt-1 text-xs text-slate-300">
          {user.course} курс · {user.group}
        </p>

        {/* Аналитика */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/5">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-2 py-3 text-center"
          >
            <motion.p
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.6 }}
              className="font-semibold tracking-tight text-xl text-amber-400"
            >
              {user.gpa.toFixed(2)}
            </motion.p>
            <p className="mt-1 text-[11px] text-slate-300">Средний балл</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="px-2 py-3 text-center"
          >
            <motion.p
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-semibold tracking-tight text-xl"
            >
              {user.brsAverage}
            </motion.p>
            <p className="mt-1 text-[11px] text-slate-300">Рейтинг БРС</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="px-2 py-3 text-center"
          >
            <motion.p
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="font-semibold tracking-tight text-xl"
            >
              {user.ratingPlace}
            </motion.p>
            <p className="mt-1 text-[11px] text-slate-300">Место на курсе</p>
          </motion.div>
        </div>
      </header>

      <div className="space-y-4 px-4 py-4">
        {/* AI Prediction */}
        <AIGradePrediction user={user} grades={grades} />

        {/* Фильтры */}
        <motion.div layout className="flex gap-2">
          {FILTERS.map((item) => {
            const selected = item === filter;
            return (
              <motion.button
                key={item}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setFilter(item)}
                className={`transition-all rounded-xl px-3.5 py-2 text-sm font-medium ${
                  selected
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {item}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Карточки оценок */}
        <AnimatePresence mode="wait">
          {visible.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
            >
              <p className="text-sm text-slate-500">По этому фильтру дисциплин нет.</p>
            </motion.div>
          ) : (
            <motion.div
              key={filter}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ staggerChildren: 0.05 }}
              className="space-y-3"
            >
              {visible.map((grade, index) => (
                <InteractiveGradeCard
                  key={grade.id}
                  item={grade}
                  index={index}
                  isAtRisk={hasAtRiskGrades}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
