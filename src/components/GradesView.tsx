import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookX } from 'lucide-react';
import type { GradeItem, UserProfile } from '../types';
import { InteractiveGradeCard } from './InteractiveGradeCard';
import { AIGradePrediction } from './AIGradePrediction';
import { Chips, CountUp, EmptyState, PageHeader } from './ui/primitives';

type GradesViewProps = {
  user: UserProfile;
  grades: GradeItem[];
};

type GradeFilter = 'Все' | GradeItem['examType'];

const FILTERS: GradeFilter[] = ['Все', 'Экзамен', 'Зачет'];

export default function GradesView({ user, grades }: GradesViewProps) {
  const [filter, setFilter] = useState<GradeFilter>('Все');
  const visible = grades.filter((item) => filter === 'Все' || item.examType === filter);
  const hasAtRiskGrades = grades.some((g) => g.status === 'Требует внимания');

  const stats = [
    { label: 'Средний балл', value: user.gpa, decimals: 2, accent: 'text-amber-300' },
    { label: 'Рейтинг БРС', value: user.brsAverage, decimals: 0, accent: 'text-white' },
    { label: 'Место на курсе', value: user.ratingPlace, decimals: 0, accent: 'text-white' },
  ];

  return (
    <div className="pb-24">
      <PageHeader title="Зачётка и БРС" subtitle={`${user.course} курс, группа ${user.group}`}>
        <div className="mt-4 grid grid-cols-3 rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/10">
          {stats.map((stat, index) => (
            <div key={stat.label} className={`px-2 py-3.5 text-center ${index > 0 ? 'border-l border-white/10' : ''}`}>
              <CountUp value={stat.value} decimals={stat.decimals} prefix={stat.label === 'Место на курсе' ? '№ ' : ''} className={`text-2xl font-semibold tracking-tight ${stat.accent}`} />
              <p className="mt-0.5 text-[11px] text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </PageHeader>

      <div className="space-y-4 px-4 pt-4">
        <AIGradePrediction user={user} grades={grades} />

        <div className="flex items-center justify-between gap-3 pt-2">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">Дисциплины</h2>
        </div>
        <Chips
          id="grade-filter"
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((item) => ({
            value: item,
            label: item === 'Зачет' ? 'Зачёт' : item,
            count: item === 'Все' ? grades.length : grades.filter((g) => g.examType === item).length,
          }))}
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={filter}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-2.5"
          >
            {visible.length === 0 ? (
              <EmptyState icon={BookX} title="По этому фильтру дисциплин нет" />
            ) : (
              visible.map((grade, index) => <InteractiveGradeCard key={grade.id} item={grade} index={index} isAtRisk={hasAtRiskGrades} />)
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
