import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Guilloche } from './Guilloche';
import { SPRING, initials } from './tokens';

type PageHeaderProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  drawOrnament?: boolean;
  className?: string;
};

export function PageHeader({ title, subtitle, action, children, drawOrnament = false, className = '' }: PageHeaderProps) {
  return (
    <header
      className={`relative overflow-hidden rounded-b-3xl bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 pb-6 pt-4 text-white shadow-md ${className}`}
    >
      <Guilloche draw={drawOrnament} className="absolute -right-20 -top-24 h-72 w-72 text-amber-300/[0.13]" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="relative">
        {(title || action) && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title && <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-balance">{title}</h1>}
              {subtitle && <p className="mt-1 text-[13px] text-slate-300">{subtitle}</p>}
            </div>
            {action}
          </div>
        )}
        {children}
      </div>
    </header>
  );
}

type Option<T extends string> = { value: T; label: ReactNode; count?: number };

type SegmentedProps<T extends string> = {
  id: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  tone?: 'dark' | 'light';
  size?: 'sm' | 'md';
  className?: string;
};

export function Segmented<T extends string>({ id, options, value, onChange, tone = 'light', size = 'md', className = '' }: SegmentedProps<T>) {
  const dark = tone === 'dark';
  return (
    <div
      role="tablist"
      className={`relative grid gap-1 rounded-xl p-1 ${dark ? 'bg-white/[0.08] ring-1 ring-inset ring-white/10' : 'bg-slate-100'} ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`relative rounded-lg font-medium transition-colors duration-200 ${size === 'sm' ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'} ${
              active ? (dark ? 'text-slate-900' : 'text-slate-900') : dark ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={SPRING}
                className={`absolute inset-0 rounded-lg ${dark ? 'bg-white shadow-sm' : 'bg-white shadow-[0_1px_2px_rgb(15_23_42/0.08),0_2px_8px_-2px_rgb(15_23_42/0.12)]'}`}
              />
            )}
            <span className="relative z-10 inline-flex items-center justify-center gap-1.5">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

type ChipsProps<T extends string> = {
  id: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function Chips<T extends string>({ id, options, value, onChange, className = '' }: ChipsProps<T>) {
  return (
    <div role="tablist" className={`no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 ${className}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`relative shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 ${
              active ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {active ? (
              <motion.span layoutId={`chip-${id}`} transition={SPRING} className="absolute inset-0 rounded-full bg-slate-900" />
            ) : (
              <span className="absolute inset-0 rounded-full border border-slate-200 bg-white" />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {option.label}
              {option.count !== undefined && (
                <span className={`tabular text-[11px] ${active ? 'text-white/60' : 'text-slate-400'}`}>{option.count}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type CountUpProps = { value: number; decimals?: number; duration?: number; className?: string; prefix?: string; suffix?: string };

export function CountUp({ value, decimals = 0, duration = 0.9, className = '', prefix = '', suffix = '' }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const format = (n: number) => `${prefix}${n.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    if (reduce) {
      node.textContent = format(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        node.textContent = format(latest);
      },
    });
    from.current = value;
    return () => controls.stop();
  }, [value, decimals, duration, prefix, suffix, reduce]);

  return <span ref={ref} className={`tabular ${className}`}>{`${prefix}${(0).toFixed(decimals).replace('.', ',')}${suffix}`}</span>;
}

export function RollingText({ text, className = '' }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={`tabular inline-flex overflow-hidden ${className}`} aria-label={text}>
      {text.split('').map((char, index) => {
        const isDigit = /\d/.test(char);
        if (!isDigit || reduce) {
          return (
            <span key={`s-${index}`} aria-hidden="true" className={char === ' ' ? 'w-[0.28em]' : ''}>
              {char}
            </span>
          );
        }
        return (
          <span key={`d-${index}`} aria-hidden="true" className="relative inline-block w-[1ch] text-center">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={char}
                initial={{ y: '-70%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '70%', opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block"
              >
                {char}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
}

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function Avatar({ src, name, size = 48, className = '' }: { src?: string; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };
  if (!src || failed) {
    return (
      <span
        style={style}
        className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 font-semibold text-amber-300 ring-1 ring-white/15 ${className}`}
      >
        <span style={{ fontSize: size * 0.34 }}>{initials(name)}</span>
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      style={style}
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-2xl object-cover ring-1 ring-white/15 ${className}`}
    />
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-0.5">
      <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{children}</h2>
      {action}
    </div>
  );
}

export function IconTile({ icon: Icon, className = '' }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${className}`}>
      <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
    </span>
  );
}

export function EmptyState({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="card flex flex-col items-center px-6 py-8 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-medium text-slate-900">{title}</p>
      {hint && <p className="mt-1 max-w-[16rem] text-[13px] text-slate-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}

export function ProgressBar({ value, className = '', barClassName = 'bg-blue-600', delay = 0 }: { value: number; className?: string; barClassName?: string; delay?: number }) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <motion.div
        className={`h-full rounded-full ${barClassName}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
