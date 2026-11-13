import { useEffect, useId } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  tone?: 'light' | 'dark';
  children: ReactNode;
}

export const BottomSheet = ({ isOpen, onClose, title, subtitle, tone = 'light', children }: BottomSheetProps) => {
  const controls = useDragControls();
  const titleId = useId();
  const dark = tone === 'dark';

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex justify-center">
          <motion.button
            type="button"
            aria-label="Закрыть"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-slate-950/50 backdrop-blur-[2px]"
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 340, mass: 0.9 }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
            className={`absolute bottom-0 flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] shadow-[0_-12px_48px_-12px_rgb(15_23_42/0.35)] ${
              dark ? 'bg-slate-900 text-white' : 'bg-white'
            }`}
          >
            <div
              onPointerDown={(event) => controls.start(event)}
              className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
            >
              <div className="flex justify-center pb-1 pt-2.5">
                <span className={`h-1 w-10 rounded-full ${dark ? 'bg-white/20' : 'bg-slate-200'}`} />
              </div>
              {title && (
                <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-2">
                  <div className="min-w-0">
                    <h2 id={titleId} className={`text-lg font-semibold leading-snug tracking-tight text-balance ${dark ? 'text-white' : 'text-slate-900'}`}>
                      {title}
                    </h2>
                    {subtitle && <div className={`mt-1 text-[13px] ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    onPointerDown={(event) => event.stopPropagation()}
                    aria-label="Закрыть"
                    className={`-mr-1 shrink-0 rounded-full p-2 transition-colors ${dark ? 'bg-white/10 text-slate-300 hover:bg-white/15' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-1">{children}</div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
