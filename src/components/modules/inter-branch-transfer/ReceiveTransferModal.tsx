import { useEffect, useState } from 'react';
import { FiCheckCircle, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';

import httpService from '../../services/httpService';
import { API_INTERBRANCH_TRANSFER_ACCOUNTS_URL, API_INTERBRANCH_TRANSFER_RECEIVE_URL } from '../../services/apiRoutes';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { formatDayMonthYear } from '../../utils/utils-functions/formatDate';

export type ReceivableTransfer = {
  id: number;
  reference: string;
  amount: number;
  from_branch_id?: number;
  from_branch_name?: string;
  payment_date?: string;
  note?: string;
};

type Props = {
  transfer: ReceivableTransfer | null;
  onClose: () => void;
  /** Called after a receipt is posted, so the screen behind can refresh. */
  onReceived: (result: any) => void;
};

/**
 * Take one transfer into this branch's books.
 *
 * The sender and the amount come from the transfer itself and cannot be typed
 * over -- the only choice is the cash or bank head the money lands in. The
 * receipt is posted by the server through the ordinary receipt service, and
 * only this one transfer is marked received.
 */
const ReceiveTransferModal = ({ transfer, onClose, onReceived }: Props) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountId, setAccountId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!transfer) return;

    setAccountId('');
    setLoadingAccounts(true);
    httpService
      .get(API_INTERBRANCH_TRANSFER_ACCOUNTS_URL)
      .then((res) => setAccounts(res?.data?.data?.data ?? []))
      .catch((err) =>
        toast.error(err?.response?.data?.message || err?.message || 'Could not load accounts.'),
      )
      .finally(() => setLoadingAccounts(false));
  }, [transfer]);

  if (!transfer) return null;

  const handleConfirm = async () => {
    if (!accountId) {
      toast.error('Select the cash or bank account the money is received into.');
      return;
    }

    try {
      setSaving(true);
      const res = await httpService.post(API_INTERBRANCH_TRANSFER_RECEIVE_URL, {
        transfer_id: transfer.id,
        receive_coa4_id: Number(accountId),
      });

      const result = res?.data;
      if (result?.success) {
        toast.success(
          result?.data?.data?.already_received
            ? 'This transfer was already received.'
            : `Received. Receipt ${result?.data?.data?.vr_no ?? ''}`.trim() + '.',
        );
        onReceived(result?.data?.data);
        onClose();
        return;
      }

      toast.error(result?.message || 'The transfer could not be received.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'The transfer could not be received.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-1001 flex items-center justify-center bg-black/50 px-3 py-6">
      <div className="w-full max-w-lg rounded-sm bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Receive Inter-Branch Transfer
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <FiX />
          </button>
        </div>

        <div className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">From</p>
              <p className="font-semibold">{transfer.from_branch_name || '-'}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Reference</p>
              <p className="font-semibold">{transfer.reference}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Payment Date</p>
              <p className="font-semibold">{formatDayMonthYear(transfer.payment_date)}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Amount</p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                {thousandSeparator(Number(transfer.amount) || 0)}
              </p>
            </div>
          </div>

          {transfer.note ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{transfer.note}</p>
          ) : null}

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Receive Into (Cash / Bank)
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={loadingAccounts}
              className="w-full rounded-sm border border-[rgb(var(--c-border))] bg-white px-3 py-2 text-sm text-slate-700 dark:bg-gray-900 dark:text-slate-200"
            >
              <option value="">{loadingAccounts ? 'Loading…' : 'Select account'}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.group} — {account.name}
                </option>
              ))}
            </select>
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
            label="Receive"
            className="whitespace-nowrap px-4 py-2"
            icon={<FiCheckCircle className="ml-2 mr-2 text-lg" />}
            disabled={saving || loadingAccounts}
          />
        </div>
      </div>
    </div>
  );
};

export default ReceiveTransferModal;
