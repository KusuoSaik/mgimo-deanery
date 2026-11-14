import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Clock, LoaderCircle, MapPin, MapPinCheck, UserRound } from 'lucide-react';
import type { ScheduleItem } from '../types';
import { BottomSheet } from './BottomSheet';
import { Badge } from './ui/primitives';
import { CLASS_TYPE_TONE } from './ui/tokens';

interface InteractiveScheduleCardProps {
  item: ScheduleItem;
  index: number;
  isToday?: boolean;
}

const AUTO_PASS = 90;
const ADMISSION = 70;

const HOMEWORK = ['Подготовить реферат на 10–15 страниц', 'Прочитать 3–4 главы из учебника', 'Решить задачи из сборника, № 1–20'];

function splitTime(time: string): [string, string] {
  const [start = time, end = ''] = time.split(/\s*[–—-]\s*/);
  return [start, end];
}

function minutesOf(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export const InteractiveScheduleCard = ({ item, index, isToday = false }: InteractiveScheduleCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [score, setScore] = useState(70);
  const [checked, setChecked] = useState<boolean[]>([false, false, false]);
  const [checkIn, setCheckIn] = useState<'idle' | 'checking' | 'done'>('idle');
  const [start, end] = splitTime(item.time);
  const tone = CLASS_TYPE_TONE[item.type];

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const live = isToday && nowMinutes >= minutesOf(start) && nowMinutes < minutesOf(end || start);
  const past = isToday && end !== '' && nowMinutes >= minutesOf(end);

  useEffect(() => {
    if (checkIn !== 'checking') return;
    const timer = window.setTimeout(() => setCheckIn('done'), 1300);
    return () => window.clearTimeout(timer);
  }, [checkIn]);

  const doneCount = checked.filter(Boolean).length;
  const verdict =
    score >= AUTO_PASS
      ? { text: 'Автомат: экзамен можно не сдавать', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' }
      : score >= ADMISSION
        ? { text: `Допуск есть. До автомата ${AUTO_PASS - score} ${AUTO_PASS - score === 1 ? 'балл' : 'баллов'}`, tone: 'bg-blue-50 text-blue-700 ring-blue-200' }
        : { text: `До допуска не хватает ${ADMISSION - score} баллов`, tone: 'bg-amber-50 text-amber-800 ring-amber-200' };

  return (
    <>
      <motion.li
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex gap-3"
      >
        <div className={`w-11 shrink-0 pt-3.5 text-right ${past ? 'opacity-50' : ''}`}>
          <p className="tabular text-sm font-semibold text-slate-900">{start}</p>
          <p className="tabular text-xs text-slate-400">{end}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`card pressable group relative flex min-w-0 flex-1 items-center gap-3 overflow-hidden p-3.5 pl-4 text-left hover:border-slate-300/80 ${past ? 'opacity-60' : ''} ${
            live ? 'ring-2 ring-blue-600/80' : ''
          }`}
        >
          <span className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${tone.rail}`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">{item.type}</span>
              {live && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" />
                  сейчас
                </span>
              )}
              {item.changeNote && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                  {item.changeNote}
                </span>
              )}
            </div>
            <h3 className="mt-0.5 text-[15px] font-semibold leading-snug tracking-tight text-slate-900">{item.subject}</h3>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                {item.room}, {item.building}
              </span>
              <span className="inline-flex min-w-0 items-center gap-1">
                <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="truncate">{item.professor}</span>
              </span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      </motion.li>

      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title={item.subject} subtitle={<Badge className={tone.badge}>{item.type}</Badge>}>
        <div className="space-y-5">
          {item.changeNote && (
            <div className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
              Изменение в расписании: {item.changeNote}
            </div>
          )}
          <dl className="divide-y divide-slate-100 rounded-2xl bg-slate-50 ring-1 ring-inset ring-slate-100">
            {[
              { icon: Clock, label: 'Время', value: `${item.day}, ${item.time}` },
              { icon: MapPin, label: 'Место', value: `${item.building}, аудитория ${item.room}` },
              { icon: UserRound, label: 'Преподаватель', value: item.professor },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-3.5 py-3">
                <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <dt className="w-[104px] shrink-0 text-[13px] text-slate-500">{label}</dt>
                <dd className="min-w-0 text-sm font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>

          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h4 className="text-[15px] font-semibold tracking-tight text-slate-900">Домашнее задание</h4>
              <span className="tabular text-xs text-slate-500">
                {doneCount} из {HOMEWORK.length}
              </span>
            </div>
            <ul className="space-y-1">
              {HOMEWORK.map((task, idx) => {
                const isChecked = checked[idx];
                return (
                  <li key={task}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      onClick={() => setChecked((prev) => prev.map((value, i) => (i === idx ? !value : value)))}
                      className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-slate-50"
                    >
                      <motion.span
                        animate={{ backgroundColor: isChecked ? '#10b981' : '#ffffff', borderColor: isChecked ? '#10b981' : '#cbd5e1' }}
                        transition={{ duration: 0.18 }}
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2"
                      >
                        <AnimatePresence>
                          {isChecked && (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 600, damping: 24 }}>
                              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.span>
                      <span className={`relative text-sm transition-colors ${isChecked ? 'text-slate-400' : 'text-slate-700'}`}>
                        {task}
                        <motion.span
                          initial={false}
                          animate={{ scaleX: isChecked ? 1 : 0 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute left-0 right-0 top-1/2 h-px origin-left bg-slate-400"
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-2xl p-4 ring-1 ring-inset ring-slate-200">
            <div className="flex items-baseline justify-between">
              <h4 className="text-[15px] font-semibold tracking-tight text-slate-900">Калькулятор баллов</h4>
              <span className="tabular text-2xl font-semibold tracking-tight text-slate-900">{score}</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">Сдвиньте, чтобы прикинуть итог по БРС</p>

            <div className="relative mt-4 h-6">
              <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-[background-color] duration-300 ${score >= AUTO_PASS ? 'bg-emerald-500' : score >= ADMISSION ? 'bg-blue-600' : 'bg-amber-500'}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              {[ADMISSION, AUTO_PASS].map((mark) => (
                <span key={mark} className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-slate-400" style={{ left: `${mark}%` }} aria-hidden="true" />
              ))}
              <input
                type="range"
                min={0}
                max={100}
                value={score}
                onChange={(event) => setScore(Number(event.target.value))}
                aria-label="Баллы БРС"
                className="absolute inset-0 w-full cursor-pointer"
              />
            </div>
            <div className="relative mt-1 h-4 text-[11px] text-slate-400">
              <span className="absolute left-0">0</span>
              <span className="absolute -translate-x-1/2" style={{ left: `${ADMISSION}%` }}>
                допуск
              </span>
              <span className="absolute -translate-x-1/2" style={{ left: `${AUTO_PASS}%` }}>
                автомат
              </span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={verdict.text}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className={`mt-3 rounded-xl px-3 py-2.5 text-[13px] font-medium ring-1 ring-inset ${verdict.tone}`}
              >
                {verdict.text}
              </motion.p>
            </AnimatePresence>
          </section>

          <motion.button
            type="button"
            layout
            disabled={checkIn !== 'idle'}
            onClick={() => setCheckIn('checking')}
            className={`pressable flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors ${
              checkIn === 'done' ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'
            } disabled:cursor-default`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={checkIn}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="inline-flex items-center gap-2"
              >
                {checkIn === 'idle' && (
                  <>
                    <MapPinCheck className="h-4 w-4" />
                    Отметиться на паре
                  </>
                )}
                {checkIn === 'checking' && (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Проверяем геопозицию в кампусе
                  </>
                )}
                {checkIn === 'done' && (
                  <>
                    <Check className="h-4 w-4" strokeWidth={3} />
                    Вы отмечены на паре
                  </>
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </BottomSheet>
    </>
  );
};
