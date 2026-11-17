import { useUI } from '../i18n';
import { useMemo, useState } from 'react';
import { motion } from '../motion';
import { AnimatePresence } from 'framer-motion';
import { Coffee, Download, CalendarCheck } from 'lucide-react';
import { scheduleCalendar } from '../scheduleCalendar';
import { WEEK_DAYS, academicWeekType, weekdayLabel, moscowClock } from '../scheduleUtils';
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
    const uiT = useUI();
    const now = moscowClock();
    const today = weekdayLabel(now);
    const currentWeek = academicWeekType(now);
    const [weekType, setWeekType] = useState<WeekParity>(currentWeek);
    const [day, setDay] = useState<ScheduleItem['day']>(today ?? 'Пн');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('Все');
    const [view, setView] = useState<'day' | 'week'>('day');
    const [direction, setDirection] = useState(1);
    const weekStart = useMemo(() => {
        const monday = mondayOf(moscowClock());
        if (weekType !== currentWeek)
            monday.setDate(monday.getDate() + 7);
        return monday;
    }, [weekType, currentWeek]);
    const dates = WEEK_DAYS.map((_, index) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index));
    const range = `${dates[0].getDate()} ${dates[0].toLocaleDateString(uiT.locale, { month: 'short' }).replace('.', '')} – ${dates[5].getDate()} ${dates[5]
        .toLocaleDateString(uiT.locale, { month: 'short' })
        .replace('.', '')}`;
    const inWeek = (item: ScheduleItem) => item.weekType === 'both' || item.weekType === weekType;
    const countByDay = Object.fromEntries(WEEK_DAYS.map((label) => [label, schedule.filter((item) => item.day === label && inWeek(item)).length]));
    const lessons = schedule
        .filter((item) => item.day === day && inWeek(item) && (typeFilter === 'Все' || item.type === typeFilter))
        .slice()
        .sort((a, b) => a.time.localeCompare(b.time, 'ru'));
    function selectDay(label: ScheduleItem['day']) {
        setView('day');
        setDirection(WEEK_DAYS.indexOf(label) >= WEEK_DAYS.indexOf(day) ? 1 : -1);
        setDay(label);
    }
    const isCurrentWeek = weekType === currentWeek;
    function downloadCalendar() {
        const url = URL.createObjectURL(new Blob([scheduleCalendar(schedule, weekStart)], { type: 'text/calendar;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url; link.download = `study-week-${weekStart.getFullYear()}-${weekStart.getMonth() + 1}-${weekStart.getDate()}.ics`;
        link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return (<div className="pb-24">
      <PageHeader title={uiT("Расписание")} subtitle={uiT(`${isCurrentWeek ? 'Эта неделя' : 'Следующая неделя'}, ${range}`)}>
        <Segmented id="week" tone="dark" className="mt-4" value={weekType} onChange={setWeekType} options={[
            { value: 'odd', label: 'Нечётная' },
            { value: 'even', label: 'Чётная' },
        ]}/>

        <div className="mt-3 grid grid-cols-6 gap-1">
          {uiT(WEEK_DAYS.map((label, index) => {
            const selected = label === day;
            const isToday = isCurrentWeek && label === today;
            const count = countByDay[label];
            return (<button key={label} type="button" onClick={() => selectDay(label)} aria-pressed={selected} className={`relative flex flex-col items-center rounded-2xl py-2 transition-colors duration-200 ${selected ? 'text-slate-900' : 'text-slate-300 hover:text-white'}`}>
                {uiT(selected && <motion.span layoutId="day-pill" transition={SPRING} className="absolute inset-0 rounded-2xl bg-white shadow-sm"/>)}
                <span className={`relative text-[11px] font-medium ${selected ? 'text-slate-500' : 'text-slate-400'}`}>{uiT(label)}</span>
                <span className="tabular relative mt-0.5 text-lg font-semibold leading-tight">{uiT(dates[index].getDate())}</span>
                <span className="relative mt-1 flex h-1 gap-0.5">
                  {uiT(Array.from({ length: Math.min(count, 4) }).map((_, dot) => (<span key={dot} className={`h-1 w-1 rounded-full ${isToday ? 'bg-amber-400' : selected ? 'bg-blue-600' : 'bg-white/40'}`}/>)))}
                </span>
              </button>);
        }))}
        </div>
      </PageHeader>

      <div className="space-y-4 px-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented id="schedule-view" className="min-w-0 flex-1" value={view} onChange={setView} options={[{ value: 'day', label: 'День' }, { value: 'week', label: 'Неделя' }]}/>
          <button type="button" onClick={downloadCalendar} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-blue-700"><Download className="h-4 w-4"/>{uiT('В календарь')}</button>
        </div>
        <p className="text-xs text-slate-500">{uiT('Время занятий — МСК. Экспорт .ics сохраняет выбранную неделю без фильтров.')}</p>
        {!isCurrentWeek && <button type="button" onClick={() => { setWeekType(currentWeek); if (today) selectDay(today); }} className="flex min-h-11 items-center gap-2 text-sm font-medium text-blue-700"><CalendarCheck className="h-4 w-4"/>{uiT('Вернуться к текущей неделе')}</button>}
        <Chips id="lesson-type" value={typeFilter} onChange={setTypeFilter} options={(['Все', 'Лекция', 'Семинар', 'Язык'] as const).map((type) => ({ value: type, label: type }))}/>

        {view === 'week' ? <section aria-label={uiT('Расписание на неделю')} className="space-y-5">
          {dates.map((date, index) => {
            const items = schedule.filter(item => item.day === WEEK_DAYS[index] && inWeek(item) && (typeFilter === 'Все' || item.type === typeFilter)).sort((a, b) => a.time.localeCompare(b.time));
            return <section key={date.toISOString()} className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-900">{date.toLocaleDateString(uiT.locale, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
              {items.length ? <ol className="space-y-2">{items.map((item, i) => <InteractiveScheduleCard key={item.id} item={item} index={i} isToday={isCurrentWeek && item.day === today}/>)}</ol> : <p className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">{uiT(typeFilter === 'Все' ? 'Занятий нет' : 'Нет занятий по выбранному фильтру')}</p>}
            </section>;
          })}
        </section> : <>
        <div className="flex items-baseline justify-between px-0.5">
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">
            {uiT(dates[WEEK_DAYS.indexOf(day)].toLocaleDateString(uiT.locale, { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase()))}
          </h2>
          <span className="text-[13px] text-slate-500">
            {uiT(lessons.length > 0 ? `${lessons.length} ${plural(lessons.length, ['пара', 'пары', 'пар'])}` : '')}
          </span>
        </div>

        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div key={`${day}-${weekType}-${typeFilter}`} custom={direction} initial={{ opacity: 0, x: direction * 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direction * -12 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
            {uiT(lessons.length === 0 ? (<EmptyState icon={Coffee} title={uiT("Свободный день")} hint={uiT(typeFilter === 'Все' ? `На ${weekType === 'even' ? 'чётной' : 'нечётной'} неделе в этот день пар нет` : `Занятий типа «${typeFilter}» в этот день нет`)}/>) : (<ol className="space-y-2.5">
                {uiT(lessons.map((item, index) => (<InteractiveScheduleCard key={item.id} item={item} index={index} isToday={isCurrentWeek && day === today}/>)))}
              </ol>))}
          </motion.div>
        </AnimatePresence>
        </>}
      </div>
    </div>);
}
