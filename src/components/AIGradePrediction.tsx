import type { GradeItem, UserProfile } from '../types';
import { usePreferences } from '../preferences';
export function AIGradePrediction({ grades, onOpenGrade }: { user: UserProfile; grades: GradeItem[]; onOpenGrade?: () => void }) {
  const { english: en } = usePreferences();
  const risk = grades.filter(g => g.brsPoints < 70);
  return <section className="card space-y-2 p-4"><h2 className="text-base font-semibold">{en ? 'Your next academic step' : 'Следующий шаг в учёбе'}</h2><p className="text-sm text-slate-600">{en ? 'Demo rules: admission at 70 points, automatic pass at 90. University rules may differ.' : 'Учебные правила прототипа: допуск от 70 баллов, автомат от 90. Это вымышленные пороги, а не правила вуза.'}</p><p className="text-sm">{risk.length ? (en ? `${risk.length} subjects below the demo admission threshold.` : `Ниже демо-порога допуска: ${risk.length} дисциплин.`) : (en ? 'All current subjects meet the demo admission threshold.' : 'По текущим предметам демо-порог допуска достигнут.')}</p>{onOpenGrade && <button className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white" onClick={onOpenGrade}>{en ? 'Review subjects' : 'Посмотреть дисциплины'}</button>}</section>;
}
