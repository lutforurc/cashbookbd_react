import React, { useEffect, useState } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputElement from '../../../utils/fields/InputElement';

interface SeparateNotesModalProps {
  isOpen: boolean;
  purchaseNotes: string;
  salesNotes: string;
  /** The same lookup the Notes box uses; each box here asks with its own text. */
  fetchSuggestions: (query: string) => Promise<string[]>;
  onSave: (purchaseNotes: string, salesNotes: string) => void;
  onCancel: () => void;
}

/**
 * One note for the Purchase voucher and another for the Sales voucher.
 *
 * The Combined Invoice writes two vouchers from one screen, and the Notes box
 * with its Both / Purchase / Sales strip puts ONE note on one or both of
 * them. When the two legs need different words -- the supplier is told one
 * thing about the lorry, the customer another -- the strip's fourth choice,
 * Separate, opens this. Two boxes rather than two more boxes on the form: the
 * row stays as it is, and most entries never need them.
 *
 * Enter moves from the first box to the second and saves from the second;
 * Escape cancels. Both boxes keep the suggestion list the Notes box has.
 */
const SeparateNotesModal: React.FC<SeparateNotesModalProps> = ({
  isOpen,
  purchaseNotes,
  salesNotes,
  fetchSuggestions,
  onSave,
  onCancel,
}) => {
  const [draft, setDraft] = useState({ purchase: purchaseNotes, sales: salesNotes });
  const [suggestions, setSuggestions] = useState<{ purchase: string[]; sales: string[] }>({
    purchase: [],
    sales: [],
  });

  // Fresh copies each time it opens, and the cursor in the first box.
  useEffect(() => {
    if (!isOpen) return;
    setDraft({ purchase: purchaseNotes, sales: salesNotes });
    window.setTimeout(() => document.getElementById('separate_purchase_notes')?.focus(), 50);
  }, [isOpen, purchaseNotes, salesNotes]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(() => {
      void fetchSuggestions(draft.purchase).then((items) =>
        setSuggestions((prev) => ({ ...prev, purchase: items })),
      );
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isOpen, draft.purchase, fetchSuggestions]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(() => {
      void fetchSuggestions(draft.sales).then((items) =>
        setSuggestions((prev) => ({ ...prev, sales: items })),
      );
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isOpen, draft.sales, fetchSuggestions]);

  // Escape from anywhere, not only from inside the popup: opened by the pencil,
  // the focus is still on the pencil until the first box takes it.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const save = () => onSave(draft.purchase.trim(), draft.sales.trim());

  return (
    <div className="fixed inset-0 z-1001 flex items-center justify-center bg-black/50 px-3 py-6">
      <div className="w-full max-w-md rounded-sm bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
              Separate Notes
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              One note on the Purchase voucher, another on the Sales voucher.
            </p>
          </div>
          <Button
            type="button"
            onClick={onCancel}
            className="rounded-sm p-1 text-gray-500 transition hover:bg-gray-100 hover:text-red-500 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <FiX className="text-lg" />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4">
          <InputElement
            id="separate_purchase_notes"
            name="separate_purchase_notes"
            label="Purchase Note"
            placeholder="Note on the Purchase voucher"
            value={draft.purchase}
            list="separate-purchase-notes-suggestions"
            autoComplete="off"
            onChange={(e) => setDraft((prev) => ({ ...prev, purchase: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('separate_sales_notes')?.focus();
              }
            }}
          />
          <datalist id="separate-purchase-notes-suggestions">
            {suggestions.purchase.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>

          <InputElement
            id="separate_sales_notes"
            name="separate_sales_notes"
            label="Sales Note"
            placeholder="Note on the Sales voucher"
            value={draft.sales}
            list="separate-sales-notes-suggestions"
            autoComplete="off"
            onChange={(e) => setDraft((prev) => ({ ...prev, sales: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                save();
              }
            }}
          />
          <datalist id="separate-sales-notes-suggestions">
            {suggestions.sales.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>

        <div className="flex justify-end gap-2 border-t border-[rgb(var(--c-border))] px-4 py-3">
          <ButtonLoading
            type="button"
            onClick={onCancel}
            label="Cancel"
            variant="ghost"
            icon={<FiX className="h-5 w-5" />}
          />
          <ButtonLoading
            type="button"
            onClick={save}
            label="OK"
            icon={<FiCheck className="h-5 w-5" />}
          />
        </div>
      </div>
    </div>
  );
};

export default SeparateNotesModal;
