import { motion } from 'framer-motion';
import { FileText, Clock, CheckCircle2 } from 'lucide-react';
import type { ActionableAIAction } from '../services/aiService';

interface ActionableAICardProps {
  action: ActionableAIAction;
  onExecute: (action: ActionableAIAction) => void;
}

export const ActionableAICard = ({ action, onExecute }: ActionableAICardProps) => {
  const getActionDetails = (action: ActionableAIAction) => {
    switch (action.type) {
      case 'CREATE_REQUEST':
        return {
          icon: FileText,
          title: 'Создать заявку',
          description: `${action.docType} • ${action.reason}`,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
        };
      case 'BOOK_CONSULTATION':
        return {
          icon: Clock,
          title: 'Записаться на консультацию',
          description: `${action.subject} • ${action.consultDate}`,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
        };
      case 'CHECK_IN':
        return {
          icon: CheckCircle2,
          title: 'Отметиться на паре',
          description: 'Гео-чек в кампусе',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
        };
    }
  };

  const details = getActionDetails(action);
  const Icon = details.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 ${details.bgColor} ${details.borderColor}`}
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2.5 ${details.bgColor} flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${details.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${details.color}`}>{details.title}</h4>
          <p className="text-xs text-slate-600 mt-0.5">{details.description}</p>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onExecute(action)}
        className={`w-full mt-3 rounded-lg ${details.bgColor} hover:brightness-95 text-sm font-medium py-2 transition-all ${details.color}`}
      >
        Подтвердить действие
      </motion.button>
    </motion.div>
  );
};
