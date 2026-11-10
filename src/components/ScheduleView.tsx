import { useState } from 'react';
import { Building, Clock, Map, X } from 'lucide-react';
import { WEEK_DAYS, academicWeekType, weekdayLabel } from '../scheduleUtils';
import type { WeekParity } from '../scheduleUtils';
import type { ScheduleItem } from '../types';

type ScheduleViewProps = {
  schedule: ScheduleItem[];
};

const CLASS_TYPE: Record<ScheduleItem['type'], { badge: string; bar: string }> = {
  Лекция: { badge: 'bg-blue-50 text-blue-700 border-blue-200', bar: 'border-l-blue-500' },
  Семинар: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'border-l-emerald-500' },
  Язык: { badge: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'border-l-amber-500' },
  Экзамен: { badge: 'bg-rose-50 text-rose-700 border-rose-200', bar: 'border-l-rose-500' },
};

const WEEK_CAPTION: Record<ScheduleItem['weekType'], string> = {
  both: 'Каждую неделю',
  even: 'Только чётная',
  odd: 'Только нечётная',
};

export default function ScheduleView({ schedule }: ScheduleViewProps) {
  const today = weekdayLabel(new Date());
  const currentWeek = academicWeekType(new Date());
  const [weekType, setWeekType] = useState<WeekParity>(currentWeek);
  const [day, setDay] = useState<ScheduleItem['day']>(today ?? 'Пн');
  const [typeFilter, setTypeFilter] = useState<'Все' | 'Лекция' | 'Семинар' | 'Язык'>('Все');
  const [selectedLesson, setSelectedLesson] = useState<ScheduleItem | null>(null);

  const lessons = schedule
    .filter((item) => item.day === day && (item.weekType === 'both' || item.weekType === weekType) && (typeFilter === 'Все' || item.type === typeFilter))
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
          <button
            type="button"
            onClick={() => setWeekType('odd')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              weekType === 'odd' ? 'bg-white text-slate-900' : 'text-slate-200'
            }`}
          >
            Нечётная
          </button>
          <button
            type="button"
            onClick={() => setWeekType('even')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              weekType === 'even' ? 'bg-white text-slate-900' : 'text-slate-200'
            }`}
          >
            Чётная
          </button>
        </div>
      </header>

      <div className="space-y-4 px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1">{(['Все', 'Лекция', 'Семинар', 'Язык'] as const).map((type) => <button key={type} type="button" onClick={() => setTypeFilter(type)} className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium ${typeFilter === type ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-100'}`}>{type}</button>)}</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {WEEK_DAYS.map((label) => {
            const selected = label === day;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setDay(label)}
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold transition-colors ${
                  selected
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-100 shadow-sm'
                }`}
              >
                {label}
                {label === today && (
                  <span
                    className={`absolute bottom-1.5 h-1 w-1 rounded-full ${selected ? 'bg-amber-400' : 'bg-blue-600'}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {lessons.length === 0 ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">
              На {weekType === 'even' ? 'чётной' : 'нечётной'} неделе в этот день пар нет.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((item) => {
              const tone = CLASS_TYPE[item.type];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedLesson(item)}
                  className={`w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 border-l-4 text-left transition-all active:scale-[0.99] ${tone.bar}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      {item.time}
                    </span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone.badge}`}>
                      {item.type}
                    </span>
                  </div>
                  <h2 className="mt-2 font-semibold tracking-tight text-slate-900">{item.subject}</h2>
                  <p className="mt-1 text-sm text-slate-600">{item.professor}</p>
                  <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                    <Building className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span>
                      {item.building}, ауд. {item.room}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{WEEK_CAPTION[item.weekType]}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {selectedLesson && <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"><button type="button" aria-label="Закрыть детали пары" onClick={() => setSelectedLesson(null)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" /><section role="dialog" aria-modal="true" aria-labelledby="lesson-title" className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-2xl sm:rounded-2xl"><div className="flex items-start justify-between gap-3"><div><span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${CLASS_TYPE[selectedLesson.type].badge}`}>{selectedLesson.type} · {selectedLesson.time}</span><h2 id="lesson-title" className="mt-3 font-semibold tracking-tight text-xl text-slate-900">{selectedLesson.subject}</h2></div><button type="button" onClick={() => setSelectedLesson(null)} aria-label="Закрыть" className="rounded-full bg-slate-100 p-2 text-slate-600"><X className="h-4 w-4" /></button></div><div className="mt-5 space-y-4"><div><p className="text-xs text-slate-500">Преподаватель</p><p className="mt-1 text-sm font-medium text-slate-900">{selectedLesson.professor}</p></div><div><p className="text-xs text-slate-500">Кафедра МГИМО</p><p className="mt-1 text-sm font-medium text-slate-900">Кафедра {selectedLesson.subject.toLowerCase()}</p></div><div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-medium text-amber-800">Тема / подготовка к занятию</p><p className="mt-1 text-sm text-amber-950">{selectedLesson.type === 'Семинар' ? `Подготовить тезисы и примеры по теме «${selectedLesson.subject}»` : `Повторить конспект и ключевые понятия курса «${selectedLesson.subject}»`}</p></div><button type="button" onClick={() => setSelectedLesson(null)} className="flex w-full items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-medium rounded-xl px-4 py-2.5 text-sm transition-all shadow-sm"><Map className="h-4 w-4" />Показать аудиторию на схеме</button><p className="flex items-center gap-2 text-sm text-slate-600"><Building className="h-4 w-4 text-slate-400" />{selectedLesson.building}, ауд. {selectedLesson.room}</p></div></section></div>}
    </div>
  );
}
