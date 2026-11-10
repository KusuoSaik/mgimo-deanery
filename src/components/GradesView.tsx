import { useState } from 'react';
import { Calculator, X } from 'lucide-react';
import type { GradeItem, UserProfile } from '../types';

type GradesViewProps = {
  user: UserProfile;
  grades: GradeItem[];
};

type GradeFilter = 'Все' | GradeItem['examType'];

const FILTERS: GradeFilter[] = ['Все', 'Экзамен', 'Зачет'];

const STATUS_BADGE: Record<GradeItem['status'], string> = {
  'Автомат близко': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Штатно: 'bg-blue-50 text-blue-700 border-blue-200',
  'Требует внимания': 'bg-amber-50 text-amber-700 border-amber-200',
};

const STATUS_BAR: Record<GradeItem['status'], string> = {
  'Автомат близко': 'bg-emerald-500',
  Штатно: 'bg-blue-500',
  'Требует внимания': 'bg-amber-500',
};

export default function GradesView({ user, grades }: GradesViewProps) {
  const [filter, setFilter] = useState<GradeFilter>('Все');
  const [calculatorGrade, setCalculatorGrade] = useState<GradeItem | null>(null);
  const [examPoints, setExamPoints] = useState(70);
  const visible = grades.filter((item) => filter === 'Все' || item.examType === filter);

  return (
    <div className="pb-24">
      <header className="bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-b-3xl px-4 pb-6 pt-6 shadow-md">
        <h1 className="font-semibold tracking-tight text-xl">Зачётка и БРС</h1>
        <p className="mt-1 text-xs text-slate-300">
          {user.course} курс · {user.group}
        </p>
        <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/5">
          <div className="px-2 py-3 text-center">
            <p className="font-semibold tracking-tight text-xl text-amber-400">{user.gpa.toFixed(2)}</p>
            <p className="mt-1 text-[11px] text-slate-300">Средний балл</p>
          </div>
          <div className="px-2 py-3 text-center">
            <p className="font-semibold tracking-tight text-xl">{user.brsAverage}</p>
            <p className="mt-1 text-[11px] text-slate-300">Рейтинг БРС</p>
          </div>
          <div className="px-2 py-3 text-center">
            <p className="font-semibold tracking-tight text-xl">{user.ratingPlace}</p>
            <p className="mt-1 text-[11px] text-slate-300">Место на курсе</p>
          </div>
        </div>
      </header>

      <div className="space-y-4 px-4 py-4">
        <div className="flex gap-2">
          {FILTERS.map((item) => {
            const selected = item === filter;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={
                  selected
                    ? 'bg-slate-900 text-white font-medium rounded-xl px-3.5 py-2 text-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl px-3.5 py-2 text-sm transition-colors'
                }
              >
                {item}
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">По этому фильтру дисциплин нет.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((grade) => {
              const percent = Math.max(0, Math.min(100, (grade.brsPoints / grade.maxPoints) * 100));
              return (
                <article key={grade.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold tracking-tight text-slate-900">{grade.subject}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {grade.examType} · {grade.professor}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[grade.status]}`}>
                      {grade.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Баллы БРС</span>
                    <span className="font-medium text-slate-700">
                      {grade.brsPoints} / {grade.maxPoints}
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-valuenow={grade.brsPoints}
                    aria-valuemin={0}
                    aria-valuemax={grade.maxPoints}
                    aria-label={`БРС по предмету ${grade.subject}`}
                  >
                    <div className={`h-full rounded-full ${STATUS_BAR[grade.status]}`} style={{ width: `${percent}%` }} />
                  </div>
                  <button type="button" onClick={() => { setCalculatorGrade(grade); setExamPoints(Math.round(grade.maxPoints * 0.7)); }} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"><Calculator className="h-4 w-4" />Рассчитать прогноз БРС</button>
                </article>
              );
            })}
          </div>
        )}
      </div>
      {calculatorGrade && (() => {
        const total = Math.min(calculatorGrade.maxPoints, calculatorGrade.brsPoints + examPoints);
        const mark = total >= 85 ? 5 : total >= 70 ? 4 : total >= 50 ? 3 : 2;
        const verdict = mark === 5 ? 'Порог на оценку 5 достигнут' : mark === 4 ? 'Уверенный прогноз на оценку 4' : mark === 3 ? 'Порог на оценку 3 достигнут' : 'Нужно набрать больше баллов';
        return <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"><button type="button" aria-label="Закрыть калькулятор" onClick={() => setCalculatorGrade(null)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" /><section role="dialog" aria-modal="true" aria-labelledby="calculator-title" className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-2xl sm:rounded-2xl"><div className="flex items-start justify-between"><div><span className="text-xs font-medium text-blue-600">ПРОГНОЗ БРС</span><h2 id="calculator-title" className="mt-1 font-semibold tracking-tight text-xl text-slate-900">{calculatorGrade.subject}</h2></div><button type="button" onClick={() => setCalculatorGrade(null)} aria-label="Закрыть" className="rounded-full bg-slate-100 p-2 text-slate-600"><X className="h-4 w-4" /></button></div><div className="mt-5 rounded-2xl bg-slate-900 p-4 text-white"><p className="text-xs text-slate-300">Прогноз итогового рейтинга</p><p className="mt-1 font-semibold tracking-tight text-4xl tabular-nums">{total}<span className="text-lg text-slate-400"> / {calculatorGrade.maxPoints}</span></p><p className="mt-2 text-sm text-amber-300">Оценка {mark === 2 ? 'ниже 3' : mark} · {verdict}</p></div><label className="mt-5 block"><span className="flex justify-between text-sm font-medium text-slate-800"><span>Предполагаемые баллы за {calculatorGrade.examType.toLowerCase()}</span><span className="tabular-nums">{examPoints}</span></span><input type="range" min="0" max={calculatorGrade.maxPoints - calculatorGrade.brsPoints} value={examPoints} onChange={(event) => setExamPoints(Number(event.target.value))} className="mt-4 w-full accent-blue-600" /><span className="mt-1 flex justify-between text-xs text-slate-500"><span>0</span><span>Максимум {calculatorGrade.maxPoints - calculatorGrade.brsPoints}</span></span></label><div className={`mt-5 rounded-xl border px-4 py-3 text-sm font-medium ${total >= 90 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>{total >= 90 ? 'Высокий шанс на автомат при подтверждении правил курса' : `До ориентира 90 баллов для автомата: ${Math.max(0, 90 - total)} балл(ов)`}</div><p className="mt-3 text-xs leading-relaxed text-slate-500">Расчёт ориентировочный: фактические пороги и распределение баллов устанавливает преподаватель.</p></section></div>;
      })()}
    </div>
  );
}
