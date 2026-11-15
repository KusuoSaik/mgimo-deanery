import type { ReactNode } from 'react';
import { useUI } from '../i18n';
import { useState } from 'react';
import { motion } from '../motion';
import { Check, ChevronRight } from 'lucide-react';
import type { GradeItem } from '../types';
import { BottomSheet } from './BottomSheet';
import { Badge, CountUp } from './ui/primitives';
import { GRADE_STATUS_TONE } from './ui/tokens';
interface InteractiveGradeCardProps {
    item: GradeItem;
    index: number;
    isAtRisk?: boolean;
    initialOpen?: boolean;
    onClose?: () => void;
    booking?: ReactNode;
    result?: ReactNode;
}
const ADMISSION = 70;
const AUTO_PASS = 90;
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
function Ring({ value, max, className }: {
    value: number;
    max: number;
    className: string;
}) {
    const radius = 44;
    const circumference = 2 * Math.PI * radius;
    const ratio = Math.max(0, Math.min(1, value / max));
    return (<svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
      <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8" className="stroke-slate-100"/>
      <motion.circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8" strokeLinecap="round" className={className} strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference * (1 - ratio) }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}/>
    </svg>);
}
export const InteractiveGradeCard = ({ item, index, initialOpen = false, onClose, booking, result }: InteractiveGradeCardProps) => {
    const uiT = useUI();
    const [isOpen, setIsOpen] = useState(initialOpen);
    const tone = GRADE_STATUS_TONE[item.status];
    const percentage = (item.brsPoints / item.maxPoints) * 100;
    const examLabel = item.examType === 'Зачет' ? 'Зачёт' : 'Экзамен';
    const note = item.brsPoints >= AUTO_PASS
        ? 'Баллов хватает на автомат'
        : item.brsPoints >= ADMISSION
            ? `До автомата ${AUTO_PASS - item.brsPoints} б.`
            : `До допуска ${ADMISSION - item.brsPoints} б.`;
    return (<>
      <motion.button type="button" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }} onClick={() => setIsOpen(true)} className="card pressable group block w-full p-4 text-left hover:border-slate-300/80">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-slate-900">{uiT(item.subject)}</h3>
            <p className="mt-1 truncate text-xs text-slate-500">
              {uiT(examLabel)}{uiT(", ")}{uiT(item.professor)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="tabular text-xl font-semibold leading-none tracking-tight text-slate-900">
              {uiT(item.brsPoints)}
              <span className="text-xs font-medium text-slate-400">{uiT("/")}{uiT(item.maxPoints)}</span>
            </p>
          </div>
        </div>

        <div className="relative mt-3.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div className={`h-full rounded-full ${tone.bar}`} initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.9, delay: 0.1 + index * 0.04, ease: [0.22, 1, 0.36, 1] }}/>
          </div>
          {uiT([ADMISSION, AUTO_PASS].map((mark) => (<span key={mark} className="absolute top-0 h-1.5 w-[3px] -translate-x-1/2 bg-white" style={{ left: `${mark}%` }} aria-hidden="true"/>)))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Badge className={tone.badge}>{uiT(item.status)}</Badge>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            {uiT(note)}
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5"/>
          </span>
        </div>
      </motion.button>

      <BottomSheet isOpen={isOpen} onClose={() => { setIsOpen(false); onClose?.(); }} title={uiT(item.subject)} subtitle={uiT(`${examLabel}, ${item.professor}`)}>
        <div className="space-y-5">
          <div className="flex items-center gap-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-100">
            <div className="relative">
              <Ring value={item.brsPoints} max={item.maxPoints} className={tone.stroke}/>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <CountUp value={item.brsPoints} className="text-3xl font-semibold leading-none tracking-tight text-slate-900"/>
                <span className="mt-0.5 text-[11px] text-slate-400">{uiT("из ")}{uiT(item.maxPoints)}</span>
              </div>
            </div>
            <div className="min-w-0 space-y-2">
              <Badge className={tone.badge}>{uiT(item.status)}</Badge>
              <dl className="space-y-1 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">{uiT("Допуск")}</dt>
                  <dd className="tabular font-medium text-slate-900">{uiT(item.brsPoints >= ADMISSION ? 'есть' : `−${ADMISSION - item.brsPoints}`)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">{uiT("Автомат")}</dt>
                  <dd className="tabular font-medium text-slate-900">{uiT(item.brsPoints >= AUTO_PASS ? 'есть' : `−${AUTO_PASS - item.brsPoints}`)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {result}
          {booking}

          <section>
            <h4 className="text-[15px] font-semibold tracking-tight text-slate-900">{uiT("Что делать дальше")}</h4>
            <ul className="mt-2 space-y-2">
              {uiT(RECOMMENDATIONS[item.status].map((text) => (<li key={text} className="flex items-start gap-2.5 text-[13px] text-slate-700">
                  <Check className={`mt-0.5 h-4 w-4 shrink-0 ${tone.text}`} strokeWidth={2.5}/>
                  {uiT(text)}
                </li>)))}
            </ul>
          </section>
        </div>
      </BottomSheet>
    </>);
};
