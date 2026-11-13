import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coffee } from 'lucide-react';
import { WEEK_DAYS, academicWeekType, weekdayLabel } from '../scheduleUtils';
import type { WeekParity } from '../scheduleUtils';
import type { ScheduleItem } from '../types';
import { InteractiveScheduleCard } from './InteractiveScheduleCard';
import { Chips, EmptyState, PageHeader, Segmented } from './ui/primitives';
import { SPRING, plural } from './ui/tokens';

type ScheduleViewProps = {
  schedule: ScheduleItem[];
};

type TypeFilter = 'Все' | 'Лекция' | 'Семинар' | 'Язык';

function mondayOf(date: Date): Date {
  const day = date.getDay() || 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - (day - 1));
}

export default function ScheduleView({ schedule }: ScheduleViewProps) {
  const now = new Date();
  const today = weekdayLabel(now);
  const currentWeek = academicWeekType(now);
  const [weekType, setWeekType] = useState<WeekParity>(currentWeek);
  const [day, setDay] = useState<ScheduleItem['day']>(today ?? 'Пн');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('Все');
  const [direction, setDirection] = useState(1);

  const weekStart = useMemo(() => {
    const monday = mondayOf(new Date());
    if (weekType !== currentWeek) monday.setDate(monday.getDate() + 7);
    return monday;
  }, [weekType, currentWeek]);

  const dates = WEEK_DAYS.map((_, index) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index));
  const range = `${dates[0].getDate()} ${dates[0].toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')} – ${dates[5].getDate()} ${dates[5]
    .toLocaleDateString('ru-RU', { month: 'short' })
    .replace('.', '')}`;

  const inWeek = (item: ScheduleItem) => item.weekType === 'both' || item.weekType === weekType;
  const countByDay = Object.fromEntries(WEEK_DAYS.map((label) => [label, schedule.filter((item) => item.day === label && inWeek(item)).length]));

  const lessons = schedule
    .filter((item) => item.day === day && inWeek(item) && (typeFilter === 'Все' || item.type === typeFilter))
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time, 'ru'));

  function selectDay(label: ScheduleItem['day']) {
    setDirection(WEEK_DAYS.indexOf(label) >= WEEK_DAYS.indexOf(day) ? 1 : -1);
    setDay(label);
  }

  const isCurrentWeek = weekType === currentWeek;

  return (
    <div className="pb-24">
      <PageHeader title="Расписание" subtitle={`${isCurrentWeek ? 'Эта неделя' : 'Следующая неделя'}, ${range}`}>
        <Segmented
          id="week"
          tone="dark"
          className="mt-4"
          value={weekType}
          onChange={setWeekType}
          options={[
            { value: 'odd', label: 'Нечётная' },
            { value: 'even', label: 'Чётная' },
          ]}
        />

        <div className="mt-3 grid grid-cols-6 gap-1">
          {WEEK_DAYS.map((label, index) => {
            const selected = label === day;
            const isToday = isCurrentWeek && label === today;
            const count = countByDay[label];
            return (
              <button
                key={label}
                type="button"
                onClick={() => selectDay(label)}
                aria-pressed={selected}
                className={`relative flex flex-col items-center rounded-2xl py-2 transition-colors duration-200 ${selected ? 'text-slate-900' : 'text-slate-300 hover:text-white'}`}
              >
                {selected && <motion.span layoutId="day-pill" transition={SPRING} className="absolute inset-0 rounded-2xl bg-white shadow-sm" />}
                <span className={`relative text-[11px] font-medium ${selected ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
                <span className="tabular relative mt-0.5 text-lg font-semibold leading-tight">{dates[index].getDate()}</span>
                <span className="relative mt-1 flex h-1 gap-0.5">
                  {Array.from({ length: Math.min(count, 4) }).map((_, dot) => (
                    <span
                      key={dot}
                      className={`h-1 w-1 rounded-full ${isToday ? 'bg-amber-400' : selected ? 'bg-blue-600' : 'bg-white/40'}`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </PageHeader>

      <div className="space-y-4 px-4 pt-4">
        <Chips
          id="lesson-type"
          value={typeFilter}
          onChange={setTypeFilter}
          options={(['Все', 'Лекция', 'Семинар', 'Язык'] as const).map((type) => ({ value: type, label: type }))}
        />

        <div className="flex items-baseline justify-between px-0.5">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
            {dates[WEEK_DAYS.indexOf(day)].toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase())}
          </h2>
          <span className="text-[13px] text-slate-500">
            {lessons.length > 0 ? `${lessons.length} ${plural(lessons.length, ['пара', 'пары', 'пар'])}` : ''}
          </span>
        </div>

        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={`${day}-${weekType}-${typeFilter}`}
            custom={direction}
            initial={{ opacity: 0, x: direction * 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {lessons.length === 0 ? (
              <EmptyState
                icon={Coffee}
                title="Свободный день"
                hint={typeFilter === 'Все' ? `На ${weekType === 'even' ? 'чётной' : 'нечётной'} неделе в этот день пар нет` : `Занятий типа «${typeFilter}» в этот день нет`}
              />
            ) : (
              <ol className="space-y-2.5">
                {lessons.map((item, index) => (
                  <InteractiveScheduleCard key={item.id} item={item} index={index} isToday={isCurrentWeek && day === today} />
                ))}
              </ol>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
