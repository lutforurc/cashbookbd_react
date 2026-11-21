import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Buttons pinned to the bottom of the drawer. */
  footer?: ReactNode;
  /** Tailwind max-width class; default matches the 500px drawer in the design. */
  width?: string;
};

/**
 * Right-side slide-in drawer. Esc or a backdrop click closes it.
 *
 * ⚠️ A plain fixed layer, NOT a modal <dialog>: showModal() puts the dialog in
 * the browser's top layer, above every z-index -- so ConfirmModal, toasts and
 * portaled dropdown menus would open hidden behind it. z-10000 clears the
 * sidebar and top menu bar (9999); toasts (100000) and portaled dropdown menus
 * (99999) are raised over it. A ConfirmModal (z-50) still cannot show over
 * it: close the drawer before asking.
 */
const SideDrawer = ({ open, onClose, title, children, footer, width = 'max-w-[500px]' }: Props) => {
  const panel = useRef<HTMLDivElement>(null);
  // Callers pass a fresh arrow every render; reading it through a ref keeps the
  // effect below from re-running (and stealing focus) on every keystroke.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex justify-end bg-black/60" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <style>{'@keyframes drawer-in{from{transform:translateX(100%)}}'}</style>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`flex h-dvh w-full ${width} flex-col rounded-l-xl border-l border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] shadow-default outline-none animate-[drawer-in_.2s_ease-out] motion-reduce:animate-none`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--c-border))] px-4 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded px-2 py-1 hover:bg-primary/10">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-[rgb(var(--c-border))] px-4 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

export default SideDrawer;
