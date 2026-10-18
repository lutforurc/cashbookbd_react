import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiDollarSign, FiList, FiPrinter, FiRefreshCcw, FiSave } from 'react-icons/fi';
import { FaUniversity } from 'react-icons/fa';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { FIELD_HEIGHT, FIELD_LABEL, FIELD_TEXTAREA } from '../../../../theme/fieldStyles';
import httpService from '../../../services/httpService';
import {
  API_COAL3_ID_BY_L4_URL,
  API_HOTEL_RECEIVED_ENTRY_URL,
} from '../../../services/apiRoutes';

/**
 * Money coming in to the hotel's cash or bank, against one head.
 *
 * ⚠️ IT WRITES A REAL VOUCHER, the same `1-` receipt the accounts Cash Received
 * and Bank Received screens write -- cash debits head 17, bank debits the chosen
 * bank head, and the chosen account head is credited -- so it lands in the
 * ledger, the Cash Book and the Bank Book like any other receipt. See
 * ReceivedEntryController.
 *
 * ⚠️ THE MIRROR OF HotelPaymentEntry. Same single head, same single amount, the
 * money going the other way; a receipt has no clerk-typed voucher number, only
 * who paid.
 */
const CASH = 'cash';
const BANK = 'bank';

const money = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const HotelReceivedEntry = () => {
  const [mode, setMode] = useState<string>(CASH);
  const [account, setAccount] = useState<{ value: string; label: string } | null>(null);
  const [receivedFrom, setReceivedFrom] = useState('');
  const [amount, setAmount] = useState('');
  const [bankList, setBankList] = useState<{ id: number; name: string }[]>([]);
  const [bankAccount, setBankAccount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const isCash = mode === CASH;
  const total = Number(amount) || 0;
  const bankName = bankList.find((b) => String(b.id) === String(bankAccount))?.name ?? '';

  useEffect(() => {
    let cancelled = false;

    httpService
      .get(`${API_COAL3_ID_BY_L4_URL}2`)
      .then((res: any) => {
        if (cancelled) return;

        const list = res?.data?.data?.data ?? [];
        const banks = Array.isArray(list) ? list : [];

        setBankList(banks);
        // Most companies keep one bank; picking it saves the clerk a click.
        if (banks.length === 1) setBankAccount(String(banks[0].id));
      })
      .catch(() => {
        // The interceptor has already said what went wrong.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const reset = () => {
    setMode(CASH);
    setAccount(null);
    setReceivedFrom('');
    setAmount('');
    setBankAccount('');
    setNotes('');
  };

  const save = async () => {
    if (!account) return toast.error('Select the account head the money came in against.');
    if (!(total > 0)) return toast.error('Enter the received amount.');
    if (!isCash && !bankAccount) return toast.error('Select the bank account the money is received into.');

    setSaving(true);

    try {
      const res = await httpService.post(API_HOTEL_RECEIVED_ENTRY_URL, {
        mode,
        account: account.value,
        amount: total,
        received_from: receivedFrom.trim() || null,
        bank_account: isCash ? null : bankAccount,
        notes: notes.trim() || null,
      });

      // ⚠️ A refusal rides HTTP 200 with success:false, so the body has to be
      // read rather than the status. Same shape every other screen here reads.
      const body = res?.data;

      if (!body?.success) {
        toast.error(body?.message || 'The server refused that.');
        return;
      }

      const voucher = body?.data?.data ?? {};
      const savedVrNo = String(voucher?.vr_no ?? '');

      reset();
      toast.success(`Voucher ${savedVrNo} saved`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <HelmetTitle title="Accounts Transaction" />

      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-black dark:text-white">Received Entry</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Accounts Receipt</p>
        </div>

        <div className="flex gap-2">
          <ButtonLoading
            onClick={() => toast.info('List — not built yet.')}
            label="List"
            variant="ghost"
            className="border border-stroke px-3 dark:border-strokedark"
            icon={<FiList size={16} />}
          />
          <ButtonLoading
            onClick={() => toast.info('Print — not built yet.')}
            label="Print"
            variant="ghost"
            className="border border-stroke px-3 dark:border-strokedark"
            icon={<FiPrinter size={16} />}
          />
        </div>
      </div>

      {/* What it comes in against, and who paid. */}
      <div className="mb-3 grid grid-cols-1 gap-3 rounded border border-stroke p-3 md:grid-cols-2 dark:border-strokedark">
        <div>
          <label htmlFor="account" className={FIELD_LABEL}>
            Account Head *
          </label>
          <DdlMultiline
            id="account"
            name="account"
            placeholder="Select Account Head"
            value={account}
            onSelect={(option: any) =>
              setAccount(
                option ? { value: String(option.value), label: String(option.label) } : null,
              )
            }
          />
        </div>

        <InputElement
          id="receivedFrom"
          name="receivedFrom"
          label="Received From"
          value={receivedFrom}
          placeholder="Optional"
          onChange={(e: any) => setReceivedFrom(e.target.value)}
          description="Optional. Who the money was received from."
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Where the money went. */}
        <div className="rounded border border-stroke p-3 dark:border-strokedark">
          <h2 className="mb-2 text-base font-semibold text-black dark:text-white">
            Received Details
          </h2>

          <div
            role="radiogroup"
            aria-label="Received into"
            className="mb-3 grid grid-cols-2 overflow-hidden rounded border border-stroke dark:border-strokedark"
          >
            {[
              { value: CASH, label: 'Cash', icon: <FiDollarSign size={16} /> },
              { value: BANK, label: 'Bank', icon: <FaUniversity size={15} /> },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={mode === item.value}
                onClick={() => setMode(item.value)}
                className={`${FIELD_HEIGHT} inline-flex items-center justify-center gap-2 text-sm font-medium ${
                  mode === item.value
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-meta-4'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* A bank receipt debits a bank head, and which bank is not
                something the screen may guess. */}
            {!isCash ? (
              <DropdownCommon
                id="bankAccount"
                name="bankAccount"
                label="Bank Account *"
                data={[{ id: '', name: 'Select a bank account' }, ...bankList]}
                value={bankAccount}
                onChange={(e: any) => setBankAccount(e.target.value)}
              />
            ) : null}

            <InputElement
              id="receivedAmount"
              name="receivedAmount"
              type="number"
              min={0}
              step="any"
              label="Received Amount (Tk.) *"
              placeholder="0.00"
              value={amount}
              onChange={(e: any) => setAmount(e.target.value)}
            />

            <div>
              <label htmlFor="notes" className={FIELD_LABEL}>
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional note for the receipt"
                className={`${FIELD_TEXTAREA} w-full px-3 py-2`}
              />
            </div>
          </div>
        </div>

        {/* What it adds up to. */}
        <div className="rounded border border-stroke p-3 dark:border-strokedark">
          <h2 className="mb-2 text-base font-semibold text-black dark:text-white">
            Received Summary
          </h2>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Received Method</span>
            <span className="font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
              {isCash ? 'Cash' : 'Bank'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Received To</span>
            <span className="font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
              {isCash ? 'Cash in Hand' : bankName || '—'}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Account Head</span>
            <span className="font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
              {account?.label || '—'}
            </span>
          </div>

          <div className="my-1 border-t border-stroke dark:border-strokedark" />

          <div className="flex items-center justify-between py-1.5">
            <span className="text-base font-semibold text-black dark:text-white">
              Total Received (Tk.)
            </span>
            <span className="text-lg font-semibold text-primary">{money(total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <ButtonLoading
          onClick={reset}
          label="Reset"
          variant="ghost"
          className="border border-stroke px-3 dark:border-strokedark"
          icon={<FiRefreshCcw size={16} />}
        />
        <ButtonLoading
          onClick={save}
          buttonLoading={saving}
          label={saving ? 'Saving...' : 'Save Received'}
          variant="primary"
          disabled={saving}
          className="px-4"
          icon={<FiSave size={16} />}
        />
      </div>
    </div>
  );
};

export default HotelReceivedEntry;
