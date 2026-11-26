import { useEffect } from 'react';
import { toLatinDigits } from './mapper';

/**
 * Turns Bangla (or Arabic/Devanagari...) digits into Latin digits as they are
 * typed into a numeric field: "১০০০" becomes "1000".
 *
 * The screen may show Bangla digits, but a number a form saves -- an amount, a
 * quantity -- has to stay ASCII for the API and for the arithmetic, or it reads
 * as 0/NaN. A capture-phase `input` listener runs before React's own handler,
 * so the value React stores is already Latin; no second keystroke is needed.
 *
 * Only numeric-looking values are touched: an input whose `type`/`inputMode`
 * says number, or whose value holds no letters at all. A remark that says
 * "১০০০ টাকা" keeps its Bangla digits.
 */
const isTextField = (node: EventTarget | null): node is HTMLInputElement | HTMLTextAreaElement =>
  node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement;

export const useLatinDigitsInput = () => {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const onInput = (event: Event) => {
      const field = event.target;
      if (!isTextField(field)) return;
      if (field.isContentEditable || field.closest('[contenteditable]')) return;

      const value = field.value;
      if (!value) return;

      const converted = toLatinDigits(value);
      if (converted === value) return;

      const numeric =
        field.type === 'number' ||
        field.inputMode === 'numeric' ||
        field.inputMode === 'decimal' ||
        !/\p{L}/u.test(value);

      if (!numeric) return;

      const start = field.selectionStart;
      const end = field.selectionEnd;
      field.value = converted;

      // Keep the caret where it was; every digit maps one-for-one, so the
      // offsets stay valid.
      try {
        if (start !== null && end !== null) field.setSelectionRange(start, end);
      } catch {
        /* number inputs do not expose selection in every browser */
      }
    };

    document.addEventListener('input', onInput, true);
    return () => document.removeEventListener('input', onInput, true);
  }, []);
};
