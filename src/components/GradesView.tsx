import type { AcademicResult, Consultation, ConsultationSlot } from '../portalDomain';
import { prettyDate } from '../portalDomain';
import { usePreferences } from '../preferences';
import ConsultationBooking from './ConsultationBooking';
import { useUI } from '../i18n';
import { useState } from 'react';
import { motion } from '../motion';
import { AnimatePresence } from 'framer-motion';
import { BookX } from 'lucide-react';
import type { GradeItem, UserProfile } from '../types';
import { InteractiveGradeCard } from './InteractiveGradeCard';
import { AIGradePrediction } from './AIGradePrediction';
import { Chips, CountUp, EmptyState, PageHeader } from './ui/primitives';
type GradesViewProps = {
    user: UserProfile;
    grades: GradeItem[];
    results?: AcademicResult[];
    initialGradeId?: string | null;
    onConsumeGrade?: () => void;
    consultations?: Consultation[];
    slots?: Record<string, ConsultationSlot[]>;
    onAction?: (action: string, payload: Record<string, unknown>) => Promise<unknown>;
};
type GradeFilter = 'Все' | GradeItem['examType'];
const FILTERS: GradeFilter[] = ['Все', 'Экзамен', 'Зачет'];
export default function GradesView({ user, grades, results = [], initialGradeId, onConsumeGrade, consultations = [], slots = {}, onAction }: GradesViewProps) {
    const uiT = useUI();
    const { english: en } = usePreferences();
    const t = (ru: string, english: string) => en ? english : ru;
    const [filter, setFilter] = useState<GradeFilter>('Все');
    const visible = grades.filter((item) => filter === 'Все' || item.examType === filter);
    const stats = [
        { label: 'Средний балл', value: user.gpa, decimals: 2, accent: 'text-amber-300' },
        { label: 'Рейтинг БРС', value: user.brsAverage, decimals: 0, accent: 'text-white' },
        { label: 'Место на курсе', value: user.ratingPlace, decimals: 0, accent: 'text-white' },
    ];
    return (<div className="pb-24">
      <PageHeader title={uiT("Зачётка и БРС")} subtitle={uiT(`${user.course} курс, группа ${user.group}`)}>
        <div className="mt-4 grid grid-cols-3 rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/10">
          {uiT(stats.map((stat, index) => (<div key={stat.label} className={`px-2 py-3.5 text-center ${index > 0 ? 'border-l border-white/10' : ''}`}>
              <CountUp value={stat.value} decimals={stat.decimals} prefix={stat.label === 'Место на курсе' ? '№ ' : ''} className={`text-2xl font-semibold tracking-tight ${stat.accent}`}/>
              <p className="mt-0.5 text-[11px] text-slate-400">{uiT(stat.label)}</p>
            </div>)))}
        </div>
      </PageHeader>

      <div className="space-y-4 px-4 pt-4">
        <AIGradePrediction user={user} grades={grades} onOpenGrade={() => document.getElementById('discipline-list')?.scrollIntoView({ behavior: 'smooth' })}/>
        <section className="card p-4" aria-label={t('Сессия', 'Examination results')}><h2 className="text-base font-semibold">{t('Сессия', 'Examination results')}</h2><p className="mt-1 text-xs text-slate-500">{t('Отдельные вымышленные результаты аттестации. Баллы БРС не заменяют итоговую оценку.', 'Fictional assessment results. Current points are separate from final grades.')}</p><ul className="mt-3 space-y-3">{results.map(result => <li key={result.gradeId} className="border-t border-slate-100 pt-3 text-sm"><p className="font-medium">{grades.find(g => g.id === result.gradeId)?.subject}</p><p className={['2', 'Не зачтено'].includes(result.result) ? 'text-rose-700' : 'text-emerald-700'}>{t('Результат', 'Result')}: {uiT(result.result)} · {t('Семестр', 'Semester')} {result.semester}</p><p className="mt-1 text-xs text-slate-500">{t('Дата аттестации', 'Assessment date')}: {result.assessedAt}</p>{result.resitAt && <p className="mt-1 text-xs text-amber-800">{t('Пересдача', 'Resit')}: {prettyDate(result.resitAt, en)}</p>}</li>)}</ul></section>

        <div className="flex items-center justify-between gap-3 pt-2">
          <h2 id="discipline-list" className="text-[15px] font-semibold tracking-tight text-slate-900">{uiT("Дисциплины")}</h2>
        </div>
        <Chips id="grade-filter" value={filter} onChange={setFilter} options={FILTERS.map((item) => ({
            value: item,
            label: item === 'Зачет' ? 'Зачёт' : item,
            count: item === 'Все' ? grades.length : grades.filter((g) => g.examType === item).length,
        }))}/>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={filter} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} className="space-y-2.5">
            {uiT(visible.length === 0 ? (<EmptyState icon={BookX} title={uiT("По этому фильтру дисциплин нет")}/>) : (visible.map((grade, index) => <InteractiveGradeCard key={grade.id} item={grade} index={index} initialOpen={initialGradeId === grade.id} onClose={onConsumeGrade} booking={onAction && <ConsultationBooking gradeId={grade.id} slots={slots[grade.id] ?? []} consultations={consultations} onAction={onAction}/>}/>)))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>);
}
