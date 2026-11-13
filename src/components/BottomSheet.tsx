import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export const BottomSheet = ({ isOpen, onClose, title, children }: BottomSheetProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto rounded-t-3xl bg-white max-h-[80vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3">
              <div className="h-1 w-12 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            {title && (
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-4">
                <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
                  aria-label="Закрыть"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            )}

            {/* Content */}
            <div className="p-4 pb-8">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
