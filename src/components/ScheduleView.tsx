import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WEEK_DAYS, academicWeekType, weekdayLabel } from '../scheduleUtils';
import type { WeekParity } from '../scheduleUtils';
import type { ScheduleItem } from '../types';
import { InteractiveScheduleCard } from './InteractiveScheduleCard';

type ScheduleViewProps = {
  schedule: ScheduleItem[];
};

export default function ScheduleView({ schedule }: ScheduleViewProps) {
  const today = weekdayLabel(new Date());
  const currentWeek = academicWeekType(new Date());
  const [weekType, setWeekType] = useState<WeekParity>(currentWeek);
  const [day, setDay] = useState<ScheduleItem['day']>(today ?? 'Пн');
  const [typeFilter, setTypeFilter] = useState<'Все' | 'Лекция' | 'Семинар' | 'Язык'>('Все');

  const lessons = schedule
    .filter(
      (item) =>
        item.day === day &&
        (item.weekType === 'both' || item.weekType === weekType) &&
        (typeFilter === 'Все' || item.type === typeFilter),
    )
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time, 'ru'));

  return (
    <div className="pb-24">
      <header className="bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-b-3xl px-4 pb-6 pt-6 shadow-md">
        <h1 className="font-semibold tracking-tight text-xl">Расписание</h1>
        <p className="mt-1 text-xs text-slate-300">
          {currentWeek === 'even' ? 'Сейчас чётная неделя' : 'Сейчас нечётная неделя'}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-white/10 p-1">
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setWeekType('odd')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              weekType === 'odd' ? 'bg-white text-slate-900' : 'text-slate-200'
            }`}
          >
            Нечётная
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setWeekType('even')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              weekType === 'even' ? 'bg-white text-slate-900' : 'text-slate-200'
            }`}
          >
            Чётная
          </motion.button>
        </div>
      </header>

      <div className="space-y-4 px-4 py-4">
        {/* Фильтр по типу */}
        <motion.div layout className="flex gap-2 overflow-x-auto pb-1">
          {(['Все', 'Лекция', 'Семинар', 'Язык'] as const).map((type) => (
            <motion.button
              key={type}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                typeFilter === type
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-100'
              }`}
            >
              {type}
            </motion.button>
          ))}
        </motion.div>

        {/* Селектор дня */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {WEEK_DAYS.map((label) => {
            const selected = label === day;
            return (
              <motion.button
                key={label}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => setDay(label)}
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold transition-all ${
                  selected
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'bg-white text-slate-700 border border-slate-100 shadow-sm'
                }`}
              >
                <motion.div animate={{ scale: selected ? 1.05 : 1 }}>{label}</motion.div>
                {label === today && (
                  <motion.span
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={`absolute bottom-1.5 h-1 w-1 rounded-full ${
                      selected ? 'bg-amber-400' : 'bg-blue-600'
                    }`}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Список пар */}
        <AnimatePresence mode="wait">
          {lessons.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
            >
              <p className="text-sm text-slate-500">
                На {weekType === 'even' ? 'чётной' : 'нечётной'} неделе в этот день пар нет.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={`${day}-${weekType}-${typeFilter}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ staggerChildren: 0.05 }}
              className="space-y-3"
            >
              {lessons.map((item, index) => (
                <InteractiveScheduleCard key={item.id} item={item} index={index} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
