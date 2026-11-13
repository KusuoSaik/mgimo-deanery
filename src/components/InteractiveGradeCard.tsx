import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarCheck, Check, ChevronRight } from 'lucide-react';
import type { GradeItem } from '../types';
import { BottomSheet } from './BottomSheet';
import { Badge, CountUp } from './ui/primitives';
import { GRADE_STATUS_TONE, SPRING } from './ui/tokens';

interface InteractiveGradeCardProps {
  item: GradeItem;
  index: number;
  isAtRisk?: boolean;
}

const ADMISSION = 70;
const AUTO_PASS = 90;

const CONSULT_SLOTS = [
  { id: '2026-11-15', day: '15 ноя', time: '14:00' },
  { id: '2026-11-16', day: '16 ноя', time: '10:00' },
  { id: '2026-11-17', day: '17 ноя', time: '15:00' },
];

const RECOMMENDATIONS: Record<GradeItem['status'], string[]> = {
  'Требует внимания': [
    'Сходите на консультацию к преподавателю',
    'Решите дополнительные задачи из сборника',
    'Составьте план подготовки к пересдаче',
    'Если нужна помощь, напишите в деканат',
  ],
  Штатно: ['Держите текущий уровень', 'Добавьте пару задач сверх программы', 'Не пропускайте семинары'],
  'Автомат близко': ['Автомат почти в кармане', 'Сдайте оставшиеся работы вовремя', 'Можно помочь одногруппникам'],
};

function Ring({ value, max, className }: { value: number; max: number; className: string }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.max(0, Math.min(1, value / max));
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
      <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8" className="stroke-slate-100" />
      <motion.circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        className={className}
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference * (1 - ratio) }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      />
    </svg>
  );
}

export const InteractiveGradeCard = ({ item, index, isAtRisk }: InteractiveGradeCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);
  const tone = GRADE_STATUS_TONE[item.status];
  const percentage = (item.brsPoints / item.maxPoints) * 100;
  const examLabel = item.examType === 'Зачет' ? 'Зачёт' : 'Экзамен';

  const note =
    item.brsPoints >= AUTO_PASS
      ? 'Баллов хватает на автомат'
      : item.brsPoints >= ADMISSION
        ? `До автомата ${AUTO_PASS - item.brsPoints} б.`
        : `До допуска ${ADMISSION - item.brsPoints} б.`;

  return (
    <>
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        onClick={() => setIsOpen(true)}
        className="card pressable group block w-full p-4 text-left hover:border-slate-300/80"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-slate-900">{item.subject}</h3>
            <p className="mt-1 truncate text-xs text-slate-500">
              {examLabel}, {item.professor}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="tabular text-xl font-semibold leading-none tracking-tight text-slate-900">
              {item.brsPoints}
              <span className="text-xs font-medium text-slate-400">/{item.maxPoints}</span>
            </p>
          </div>
        </div>

        <div className="relative mt-3.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className={`h-full rounded-full ${tone.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.9, delay: 0.1 + index * 0.04, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          {[ADMISSION, AUTO_PASS].map((mark) => (
            <span key={mark} className="absolute top-0 h-1.5 w-[3px] -translate-x-1/2 bg-white" style={{ left: `${mark}%` }} aria-hidden="true" />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Badge className={tone.badge}>{item.status}</Badge>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            {note}
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </motion.button>

      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title={item.subject} subtitle={`${examLabel}, ${item.professor}`}>
        <div className="space-y-5">
          <div className="flex items-center gap-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-100">
            <div className="relative">
              <Ring value={item.brsPoints} max={item.maxPoints} className={tone.stroke} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <CountUp value={item.brsPoints} className="text-3xl font-semibold leading-none tracking-tight text-slate-900" />
                <span className="mt-0.5 text-[11px] text-slate-400">из {item.maxPoints}</span>
              </div>
            </div>
            <div className="min-w-0 space-y-2">
              <Badge className={tone.badge}>{item.status}</Badge>
              <dl className="space-y-1 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Допуск</dt>
                  <dd className="tabular font-medium text-slate-900">{item.brsPoints >= ADMISSION ? 'есть' : `−${ADMISSION - item.brsPoints}`}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Автомат</dt>
                  <dd className="tabular font-medium text-slate-900">{item.brsPoints >= AUTO_PASS ? 'есть' : `−${AUTO_PASS - item.brsPoints}`}</dd>
                </div>
              </dl>
            </div>
          </div>

          {isAtRisk && item.status === 'Требует внимания' && (
            <section className="rounded-2xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
              <h4 className="text-[15px] font-semibold tracking-tight text-amber-950">Записаться на консультацию</h4>
              <p className="mt-0.5 text-[13px] text-amber-900/70">Свободные окна у преподавателя</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {CONSULT_SLOTS.map((option) => {
                  const active = slot === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={booked}
                      onClick={() => setSlot(option.id)}
                      className={`relative rounded-xl px-2 py-2.5 text-center transition-colors ${active ? 'text-white' : 'bg-white text-slate-700 ring-1 ring-inset ring-amber-200 hover:ring-amber-300'}`}
                    >
                      {active && <motion.span layoutId={`slot-${item.id}`} transition={SPRING} className="absolute inset-0 rounded-xl bg-amber-600" />}
                      <span className="relative block text-sm font-semibold">{option.day}</span>
                      <span className={`tabular relative block text-xs ${active ? 'text-amber-100' : 'text-slate-500'}`}>{option.time}</span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={!slot || booked}
                onClick={() => setBooked(true)}
                className={`pressable mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors ${
                  booked ? 'bg-emerald-600' : 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/40'
                }`}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={String(booked)} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="inline-flex items-center gap-2">
                    {booked ? <Check className="h-4 w-4" strokeWidth={3} /> : <CalendarCheck className="h-4 w-4" />}
                    {booked ? 'Вы записаны' : 'Записаться'}
                  </motion.span>
                </AnimatePresence>
              </button>
            </section>
          )}

          <section>
            <h4 className="text-[15px] font-semibold tracking-tight text-slate-900">Что делать дальше</h4>
            <ul className="mt-2 space-y-2">
              {RECOMMENDATIONS[item.status].map((text) => (
                <li key={text} className="flex items-start gap-2.5 text-[13px] text-slate-700">
                  <Check className={`mt-0.5 h-4 w-4 shrink-0 ${tone.text}`} strokeWidth={2.5} />
                  {text}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </BottomSheet>
    </>
  );
};
