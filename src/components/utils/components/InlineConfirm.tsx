import { useEffect, useRef } from 'react';

export type InlineConfirmPosition = { top: number; left: number };

type Props = {
  /** Where the clicked button is, from getBoundingClientRect(). */
  position: InlineConfirmPosition | null;
  question: string;
  /** Colour of the Yes button: what kind of thing is being agreed to. */
  tone?: 'danger' | 'warning' | 'success';
  yesLabel?: string;
  noLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const TONE_CLASS: Record<string, string> = {
  danger: 'bg-red-600 hover:bg-red-700',
  warning: 'bg-amber-600 hover:bg-amber-700',
  success: 'bg-green-600 hover:bg-green-700',
};

/**
 * A small "are you sure?" that opens against the button that asked it.
 *
 * Beside the button rather than in the middle of the screen, because these sit
 * in table rows: a centred dialog makes the reader find their row again
 * afterwards, and on a list of twenty vouchers that is how the wrong one gets
 * confirmed. Positioned `fixed` so it escapes the cell's overflow.
 *
 * Lifted out of VoucherActionButtons, where it was written for approvals, when
 * the transfer list came to need the same question about deleting -- so both
 * ask it the same way and it is drawn in one place.
 */
const InlineConfirm = ({
  position,
  question,
  tone = 'danger',
  yesLabel = 'Yes',
  noLabel = 'No',
  onConfirm,
  onCancel,
}: Props) => {
  const yesRef = useRef<HTMLButtonElement>(null);

  // Focus Yes as it opens, so Enter answers it and Escape closes it without
  // the reader having to reach for the mouse.
  useEffect(() => {
    if (position) {
      yesRef.current?.focus();
    }
  }, [position]);

  if (!position) return null;

  return (
    <div
      className="fixed z-50"
      style={{ top: position.top, left: position.left, transform: 'translateX(-50%)' }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onConfirm();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <div className="relative rounded-md border border-gray-300 bg-white px-4 py-3 shadow-md dark:border-gray-700 dark:bg-gray-800">
        <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800"></div>
        <p className="mb-3 whitespace-nowrap text-center text-sm text-black-900 dark:text-gray-200">
          {question}
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            ref={yesRef}
            onClick={onConfirm}
            className={`rounded px-4 py-1.5 text-sm text-white ${TONE_CLASS[tone] ?? TONE_CLASS.danger}`}
          >
            {yesLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded bg-gray-500 px-4 py-1.5 text-sm text-white hover:bg-gray-600"
          >
            {noLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InlineConfirm;
