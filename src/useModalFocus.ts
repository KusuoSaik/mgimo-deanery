import { useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
const dialogs: symbol[] = [];
let initialOverflow = '', initialInert = false;
export function useModalFocus(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const close = useRef(onClose);
  useLayoutEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current, token = Symbol();
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.getElementById('root');
    if (!dialogs.length) { initialOverflow = document.body.style.overflow; initialInert = root?.hasAttribute('inert') ?? false; }
    dialogs.push(token); root?.setAttribute('inert',''); document.body.style.overflow = 'hidden';
    const focusable = () => [...(dialog?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])].filter(node => node.getClientRects().length && !node.closest('[hidden], [inert]'));
    const onKey = (event: KeyboardEvent) => {
      if (dialogs.at(-1) !== token) return;
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable(), first = items[0], last = items.at(-1);
      if (!first) { event.preventDefault(); dialog?.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown',onKey);
    const frame = requestAnimationFrame(() => (focusable()[0] ?? dialog)?.focus());
    return () => {
      cancelAnimationFrame(frame); window.removeEventListener('keydown',onKey);
      dialogs.splice(dialogs.indexOf(token),1);
      if (!dialogs.length) { document.body.style.overflow = initialOverflow; if (!initialInert) root?.removeAttribute('inert'); }
      if (previous?.isConnected && !previous.closest('[inert]')) previous.focus();
    };
  },[open,ref]);
}
