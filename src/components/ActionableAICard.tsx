import { motion } from 'framer-motion';
import { FileText, Send } from 'lucide-react';

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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mt-3 overflow-hidden rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200"
    >
      <div className="flex items-start gap-2.5 p-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-snug text-slate-900">{action.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {action.category}, {action.deliveryFormat}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onConfirm}
        className="pressable flex w-full items-center justify-center gap-1.5 border-t border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-blue-600 hover:bg-blue-50"
      >
        <Send className="h-3.5 w-3.5" />
        Отправить заявку
      </button>
    </motion.div>
  );
};
