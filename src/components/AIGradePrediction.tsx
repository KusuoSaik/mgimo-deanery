import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, CalendarCheck, Check, ChevronDown, Sparkles, Target, TrendingUp, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { GradeItem, UserProfile } from '../types';
import { BottomSheet } from './BottomSheet';
import { CountUp } from './ui/primitives';

interface AIGradePredictionProps {
  user: UserProfile;
  grades: GradeItem[];
}

function points(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'балл';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'балла';
  return 'баллов';
}

export const AIGradePrediction = ({ user, grades }: AIGradePredictionProps) => {
  const [expanded, setExpanded] = useState(true);
  const [sheet, setSheet] = useState<'consultation' | 'plan' | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);
  const weakest = [...grades].sort((a, b) => a.brsPoints - b.brsPoints)[0];
  const atRiskCount = grades.filter((g) => g.status === 'Требует внимания').length;

  const predictedGPA = Math.min(5, user.gpa + (atRiskCount > 0 ? 0.3 : 0.15));
  const gpaDelta = predictedGPA - user.gpa;
  const brsIncrease = weakest && weakest.brsPoints < 70 ? 6 : 2;
  const projectedBRS = Math.min(100, weakest ? weakest.brsPoints + brsIncrease : user.brsAverage);
  const hasScholarship = user.gpa >= 4.5;
  const couldGetScholarship = predictedGPA >= 4.5 && !hasScholarship;

  const recommendations: { icon: LucideIcon; tone: string; text: string }[] = [
    {
      icon: TrendingUp,
      tone: 'text-blue-600 bg-blue-50',
      text: weakest
        ? `Подтяните «${weakest.subject}» на ${brsIncrease} ${points(brsIncrease)}: будет ${projectedBRS} из 100${projectedBRS >= 90 ? ', это автомат' : ''}.`
        : 'Данных по дисциплинам пока нет.',
    },
    couldGetScholarship
      ? { icon: Award, tone: 'text-emerald-600 bg-emerald-50', text: `Если выполнить план, средний балл станет ${predictedGPA.toFixed(2).replace('.', ',')}. Этого хватает на повышенную стипендию.` }
      : hasScholarship
        ? { icon: Award, tone: 'text-amber-600 bg-amber-500/10', text: 'Текущие оценки держат вас в числе стипендиатов факультета.' }
        : { icon: Award, tone: 'text-slate-500 bg-slate-100', text: 'Для повышенной стипендии нужен средний балл от 4,5.' },
    atRiskCount > 0
      ? { icon: TriangleAlert, tone: 'text-amber-600 bg-amber-50', text: `${atRiskCount} ${atRiskCount === 1 ? 'дисциплина требует' : 'дисциплины требуют'} консультации. Запишитесь в карточке предмета.` }
      : { icon: Target, tone: 'text-emerald-600 bg-emerald-50', text: 'Ни одной дисциплины в зоне риска. Темп хороший.' },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="card overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20">
          <Sparkles className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold tracking-tight text-slate-900">Прогноз сессии</span>
          <span className="block text-xs text-slate-500">ИИ-анализ ваших баллов и истории курса</span>
        </span>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </motion.span>
      </button>

      <div className="grid grid-cols-2 gap-2 px-4">
        <div className="rounded-xl bg-slate-900 p-3.5 text-white">
          <p className="text-xs text-slate-400">Средний балл к концу сессии</p>
          <CountUp value={predictedGPA} decimals={2} className="mt-1 block text-[28px] font-semibold leading-none tracking-tight text-amber-300" />
          <p className="mt-1.5 text-xs text-emerald-400">
            {gpaDelta > 0 ? `+${gpaDelta.toFixed(2).replace('.', ',')} к текущему` : 'Максимум уже достигнут'}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-inset ring-slate-100">
          <p className="truncate text-xs text-slate-500" title={weakest?.subject}>
            Слабейший предмет
          </p>
          <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-slate-900">
            <CountUp value={projectedBRS} />
            <span className="text-base font-medium text-slate-400"> / 100</span>
          </p>
          <p className="mt-1.5 text-xs text-blue-600">
            +{brsIncrease} {points(brsIncrease)} после консультации
          </p>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ul className="space-y-3 px-4 pt-4">
              {recommendations.map(({ icon: Icon, tone, text }, idx) => (
                <motion.li
                  key={text}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + idx * 0.06 }}
                  className="flex items-start gap-3"
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <p className="pt-1 text-[13px] leading-relaxed text-slate-700">{text}</p>
                </motion.li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-2 p-4">
              <button type="button" onClick={() => setSheet('consultation')} className="pressable rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
                Консультация
              </button>
              <button type="button" onClick={() => setSheet('plan')} className="pressable rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200">
                План действий
              </button>
            </div>
            <p className="border-t border-slate-100 px-4 py-3 text-[11px] leading-relaxed text-slate-400">
              Модель обучена на данных 150+ студентов, точность около 87%. Это ориентир, а не гарантия.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {!expanded && <div className="h-4" />}

      <BottomSheet
        isOpen={sheet !== null}
        onClose={() => {
          setSheet(null);
          setSelectedSlot(null);
          setBooked(false);
        }}
        title={sheet === 'consultation' ? 'Записаться на консультацию' : 'Персональный план действий'}
        subtitle={weakest ? weakest.subject : 'По вашим результатам БРС'}
      >
        {sheet === 'consultation' ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-600">
              Выберите удобное окно консультации по дисциплине «{weakest?.subject ?? 'предмет'}».
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '2026-11-15', day: '15 ноя', time: '14:00' },
                { id: '2026-11-16', day: '16 ноя', time: '10:00' },
                { id: '2026-11-17', day: '17 ноя', time: '15:00' },
              ].map((slot) => {
                const active = selectedSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={booked}
                    onClick={() => setSelectedSlot(slot.id)}
                    className={`rounded-xl px-2 py-2.5 text-center text-sm transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    <span className="block font-semibold">{slot.day}</span>
                    <span className={active ? 'text-blue-100' : 'text-slate-500'}>{slot.time}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={!selectedSlot || booked}
              onClick={() => setBooked(true)}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white ${booked ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/40'}`}
            >
              {booked ? <Check className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
              {booked ? 'Вы записаны' : 'Записаться'}
            </button>
            {booked && <p className="text-center text-xs text-emerald-600">Запись сохранена в вашем учебном кабинете.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-slate-600">Чтобы повысить результат, двигайтесь по шагам:</p>
            {(weakest
              ? [
                  `Повторить ключевые темы по дисциплине «${weakest.subject}»`,
                  `Выполнить дополнительные задания и поднять результат минимум на ${brsIncrease} ${points(brsIncrease)}`,
                  'Прийти на консультацию и уточнить ошибки у преподавателя',
                  'Проверить результат после следующего начисления баллов',
                ]
              : ['Регулярно проверять оценки и баллы БРС', 'Не пропускать семинары и сдавать работы вовремя', 'При необходимости записаться на консультацию']
            ).map((step, index) => (
              <div key={step} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{index + 1}</span>
                <p className="pt-0.5 text-sm text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        )}
      </BottomSheet>
    </motion.section>
  );
};
