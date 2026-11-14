import { createElement, forwardRef } from 'react';
import type { ComponentType } from 'react';
import { motion as original, useReducedMotion as useSystemReducedMotion } from 'framer-motion';
import { usePreferences } from './preferences';
export function useReducedMotion() { const { still } = usePreferences(); const system = useSystemReducedMotion(); return still || system; }
function staticTarget(value: unknown): unknown {
  if (Array.isArray(value)) return value.at(-1);
  if (typeof value === 'function') return (...args: unknown[]) => staticTarget(value(...args));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, k === 'transition' ? { duration: 0, repeat: 0, delay: 0 } : staticTarget(v)]));
  return value;
}
const cache = new Map<PropertyKey, unknown>();
// Preserve every existing motion tag and its TypeScript props, while honoring the in-app setting.
export const motion: typeof original = new Proxy(original, {
  get(target, name) {
    if (typeof name !== 'string' || ['create','then','$$typeof'].includes(name)) return Reflect.get(target,name);
    if (!cache.has(name)) {
      const element = Reflect.get(target,name) as ComponentType<Record<string, unknown>>;
      const ReducedElement = forwardRef<Element, Record<string, unknown>>(function ReducedElement(props, ref) {
        const reduce = useReducedMotion();
        const next = reduce ? { ...props, initial: false, animate: staticTarget(props.animate), variants: staticTarget(props.variants), exit: undefined, transition: { duration: 0, repeat: 0, delay: 0 }, layout: false, layoutId: undefined, whileHover: undefined, whileTap: undefined, drag: false } : props;
        // Forward the ref unchanged; this adapter never reads ref.current.
        // eslint-disable-next-line react-hooks/refs
        return createElement(element,{...next,ref});
      });
      cache.set(name,ReducedElement);
    }
    return cache.get(name);
  },
});
