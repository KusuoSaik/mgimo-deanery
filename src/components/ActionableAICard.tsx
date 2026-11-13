import { motion } from 'framer-motion';
import { CheckCircle2, FileText } from 'lucide-react';

interface ActionableAICardProps {
  action: {
    type: 'request';
    title: string;
    category: string;
    deliveryFormat: string;
  };
  onConfirm: () => void;
}

export const ActionableAICard = ({ action, onConfirm }: ActionableAICardProps) => {
  if (action.type !== 'request') return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200"
    >
      <div className="flex items-start gap-2 mb-2">
        <FileText className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-900">{action.title}</p>
          <p className="text-[10px] text-slate-600 mt-0.5">
            {action.category} • {action.deliveryFormat}
          </p>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onConfirm}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Подтвердить и отправить в 1 клик
      </motion.button>

      <p className="text-[9px] text-slate-500 mt-1.5 text-center">
        Заявка будет сохранена в ваш список заявок
      </p>
    </motion.div>
  );
};
