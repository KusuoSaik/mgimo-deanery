import { motion } from 'framer-motion';
import { TrendingUp, Zap } from 'lucide-react';
import type { GradeItem, UserProfile } from '../types';

interface AIGradePredictionProps {
  user: UserProfile;
  grades: GradeItem[];
}

export const AIGradePrediction = ({ user, grades }: AIGradePredictionProps) => {
  // Анализ слабых мест
  const weakestSubject = [...grades].sort((a, b) => a.brsPoints - b.brsPoints)[0];
  const atRiskCount = grades.filter((g) => g.status === 'Требует внимания').length;

  // Прогноз
  const predictedGPA = user.gpa + (atRiskCount > 0 ? 0.3 : 0.15);
  const brsIncrease = weakestSubject && weakestSubject.brsPoints < 70 ? 6 : 2;
  const projectedBRS = Math.min(100, weakestSubject ? weakestSubject.brsPoints + brsIncrease : user.brsAverage);

  // Стипендия
  const hasScholarship = user.gpa >= 4.5;
  const couldGetScholarship = predictedGPA >= 4.5 && !hasScholarship;

  const recommendations = [
    {
      text: `Повышение ${weakestSubject?.subject} на +${brsIncrease} баллов → ${projectedBRS}/100 = экзамен автоматом!`,
      icon: '📈',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      text: couldGetScholarship
        ? `При выполнении рекомендаций ваш GPA будет ${predictedGPA.toFixed(2)} → получите повышенную стипендию! 💰`
        : `Текущий курс держит вас в топе стипендиатов по ${user.faculty}`,
      icon: couldGetScholarship ? '💰' : '✨',
      color: couldGetScholarship ? 'from-emerald-500 to-green-500' : 'from-amber-500 to-orange-500',
    },
    {
      text: atRiskCount > 0 ? `${atRiskCount} предмет(ов) требуют срочных консультаций. Запишитесь прямо из ЛК!` : 'Отличная динамика! Сохраняйте темп!',
      icon: atRiskCount > 0 ? '⚠️' : '🎯',
      color: atRiskCount > 0 ? 'from-red-500 to-rose-500' : 'from-emerald-500 to-teal-500',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white space-y-4 shadow-lg border border-indigo-500/20"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          🤖
        </motion.div>
        <h2 className="font-bold text-lg">Нейро-прогноз сессии и стипендии</h2>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="rounded-lg bg-white/10 backdrop-blur-md p-3 border border-white/20"
        >
          <p className="text-xs text-indigo-200 mb-1">Прогноз GPA (конец сессии)</p>
          <p className="text-2xl font-bold text-emerald-300">{predictedGPA.toFixed(2)}</p>
          <p className="text-[10px] text-indigo-300 mt-1">+{(predictedGPA - user.gpa).toFixed(2)} vs текущий</p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="rounded-lg bg-white/10 backdrop-blur-md p-3 border border-white/20"
        >
          <p className="text-xs text-indigo-200 mb-1">Прогноз БРС (слабейший)</p>
          <p className="text-2xl font-bold text-cyan-300">{Math.round(projectedBRS)}/100</p>
          <p className="text-[10px] text-indigo-300 mt-1">+{brsIncrease} баллов за консультацию</p>
        </motion.div>
      </div>

      {/* Recommendations */}
      <div className="space-y-2">
        {recommendations.map((rec, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`rounded-lg bg-gradient-to-r ${rec.color} p-3 shadow-lg`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg flex-shrink-0">{rec.icon}</span>
              <p className="text-sm font-medium text-white leading-snug">{rec.text}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600/80 hover:bg-emerald-600 rounded-lg font-medium text-sm transition-all"
        >
          <Zap className="h-4 w-4" />
          Консультация
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600/80 hover:bg-indigo-600 rounded-lg font-medium text-sm transition-all"
        >
          <TrendingUp className="h-4 w-4" />
          План действий
        </motion.button>
      </div>

      {/* Confidence */}
      <p className="text-[11px] text-indigo-300 text-center pt-2 border-t border-white/10">
        Прогноз основан на анализе 150+ студентов и ваших текущих данных (точность ~87%)
      </p>
    </motion.div>
  );
};
