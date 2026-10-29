import { useState } from 'react';
import { FiRotateCcw, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';

import httpService from '../../services/httpService';
import { API_INTERBRANCH_TRANSFER_REVERSE_URL } from '../../services/apiRoutes';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { formatDayMonthYear } from '../../utils/utils-functions/formatDate';

export type ReversibleTransfer = {
  id: number;
  reference: string;
  amount: number;
  from_branch_name?: string;
  to_branch_name?: string;
  payment_date?: string;
  receipt_date?: string;
  received_by_name?: string;
};

type Props = {
  transfer: ReversibleTransfer | null;
  /** 'receipt' undoes only this branch's receipt; 'full' undoes both sides. */
  scope?: 'receipt' | 'full';
  onClose: () => void;
  /** Called after the reversal is posted, so the screen behind can refresh. */
  onReversed: (result: any) => void;
};

/**
 * Reverse a received transfer, or only the destination's receipt.
 *
 *   Reverse Receipt  the destination undoes its own receipt; the sender's
 *                    payment stands and the transfer returns to Pending.
 *   Reverse Transfer both sides are undone; the transfer becomes Reversed and
 *                    the sender enters a fresh payment.
 *
 * Either way the user supplies a reason, and the server posts the mirror
 * journals and keeps the originals for the audit.
 */
const ReverseTransferModal = ({ transfer, scope = 'full', onClose, onReversed }: Props) => {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  if (!transfer) return null;

  const isReceipt = scope === 'receipt';
  const actionLabel = isReceipt ? 'Reverse Receipt' : 'Reverse Transfer';

  const handleConfirm = async () => {
    if (reason.trim().length < 3) {
      toast.error('Enter a reason for the reversal.');
      return;
    }

    try {
      setSaving(true);
      const res = await httpService.post(API_INTERBRANCH_TRANSFER_REVERSE_URL, {
        transfer_id: transfer.id,
        reason: reason.trim(),
        scope,
      });

      const result = res?.data;
      if (result?.success) {
        toast.success(
          isReceipt
            ? `Receipt for ${transfer.reference} reversed. It is pending receive again.`
            : `Transfer ${transfer.reference} reversed.`,
        );
        onReversed(result?.data?.data);
        onClose();
        return;
      }

      toast.error(result?.message || 'The transfer could not be reversed.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'The transfer could not be reversed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-1001 flex items-center justify-center bg-black/50 px-3 py-6">
      <div className="w-full max-w-lg rounded-sm bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{actionLabel}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <FiX />
          </button>
        </div>

        <div className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Reference</p>
              <p className="font-semibold">{transfer.reference}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Amount</p>
              <p className="font-semibold">{thousandSeparator(Number(transfer.amount) || 0)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">From → To</p>
              <p className="font-semibold">
                {transfer.from_branch_name} → {transfer.to_branch_name}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Received</p>
              <p className="font-semibold">
                {formatDayMonthYear(transfer.receipt_date)}
                {transfer.received_by_name ? ` by ${transfer.received_by_name}` : ''}
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {isReceipt
              ? "This reverses only your branch's receipt. The sender's payment stands and the transfer returns to Pending Receive, so it can be received again."
              : "This reverses both sides: the sender's payment portion and the destination's receipt. The transfer becomes Reversed and is not reopened; enter a new payment to correct it."}
          </p>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={255}
              placeholder="Why is this transfer being reversed?"
              className="w-full rounded-sm border border-[rgb(var(--c-border))] bg-white px-3 py-2 text-sm text-slate-700 dark:bg-gray-900 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-[rgb(var(--c-border))] px-4 py-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-[rgb(var(--c-border))] px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <ButtonLoading
            type="button"
            onClick={handleConfirm}
            buttonLoading={saving}
            label={actionLabel}
            className="whitespace-nowrap bg-rose-600 px-4 py-2"
            icon={<FiRotateCcw className="ml-2 mr-2 text-lg" />}
            disabled={saving}
          />
        </div>
      </div>
    </div>
  );
};

export default ReverseTransferModal;
