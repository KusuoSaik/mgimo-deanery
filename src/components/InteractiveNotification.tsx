import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Info, CheckCircle2, X } from 'lucide-react';
import type { NotificationItem } from '../types';

interface InteractiveNotificationProps {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  index: number;
}

export const InteractiveNotification = ({
  item,
  onMarkRead,
  onDelete,
  index,
}: InteractiveNotificationProps) => {
  const [isDeleted, setIsDeleted] = useState(false);

  const iconMap = {
    warning: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100' },
    info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-100' },
    success: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  };

  const { icon: Icon, color, bg } = iconMap[item.type];

  if (isDeleted) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ delay: index * 0.05 }}
      drag="x"
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        if (info.offset.x > 100) {
          setIsDeleted(true);
          onDelete(item.id);
        }
      }}
      className={`group rounded-xl border-2 p-4 transition-all cursor-pointer ${
        item.isRead
          ? 'border-slate-200 bg-slate-50'
          : 'border-blue-200 bg-blue-50/50 hover:border-blue-300'
      }`}
      onClick={() => {
        if (!item.isRead) onMarkRead(item.id);
      }}
    >
      <div className="flex gap-3">
        <div className={`rounded-lg p-2.5 ${bg} flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`font-semibold ${
                item.isRead ? 'text-slate-600' : 'text-slate-900'
              }`}
            >
              {item.title}
            </h3>
            {!item.isRead && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-2.5 w-2.5 rounded-full bg-blue-500 flex-shrink-0"
              />
            )}
          </div>

          <p className={`text-sm mt-1 ${item.isRead ? 'text-slate-500' : 'text-slate-700'}`}>
            {item.message}
          </p>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-500">{item.date}</span>

            {!item.isRead && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(item.id);
                }}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Отметить прочитанным
              </motion.button>
            )}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            setIsDeleted(true);
            onDelete(item.id);
          }}
          className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );
};
