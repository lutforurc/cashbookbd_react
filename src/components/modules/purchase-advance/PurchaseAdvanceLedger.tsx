import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';
import { FiChevronDown, FiChevronRight, FiPrinter, FiSearch, FiX } from 'react-icons/fi';

import InputDatePicker from '../../utils/fields/DatePicker';
import ToggleSwitch from '../../utils/fields/ToggleSwitch';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { FIELD_LABEL } from '../../../theme/fieldStyles';
import httpService from '../../services/httpService';
import { API_PURCHASE_ADVANCE_URL } from '../../services/apiRoutes';
import PurchaseAdvanceLedgerPrint, { LedgerRow } from './PurchaseAdvanceLedgerPrint';
import PurchaseBillView from './PurchaseBillView';

/**
 * One employee's purchase advance, as a ledger.
 *
 * Opening balance brought forward to From, every movement From..To with the
 * balance after it, the two totals and the closing balance. Debit is money into
 * his hands (an advance, or the difference paid when a bill ran over); credit
 * is what came out (goods bought, money handed back). A balance below zero is
 * the company owing him, and is marked so rather than shown as a bare minus.
 *
 * A bill row opens to show what it bought, from the purchase screen's own lines.
 *
 * ⚠️ A MODAL, NOT A PANEL UNDER THE LIST (owner, 14 Nov 2026). Under the list it
 * opened below every employee of the branch, and with a long staff the person
 * who pressed Ledger had to go looking for it. Esc or a click outside closes
 * it -- unless a bill is open on top, which Esc closes first.
 */

const money = (value: number) => thousandSeparator(Number(value) || 0);
const day = (value?: string | null) => (value ? String(value).slice(0, 10).split('-').reverse().join('/') : '');

const dateFromIso = (value: string): Date | null => {
  const [year, month, dayOf] = String(value || '').split('-').map(Number);
  return year && month && dayOf ? new Date(year, month - 1, dayOf) : null;
};

const isoFromDate = (date: Date | null): string =>
  date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';

/** "1,200.00" or "1,200.00 owed": the sign said in words. */
export const balanceText = (value: number) =>
  Number(value) === 0 ? '-' : `${money(Math.abs(Number(value)))}${Number(value) < 0 ? ' Cr' : ' Dr'}`;

export const KIND_LABEL: Record<LedgerRow['kind'], string> = {
  advance: 'Advance given',
  bill: 'Goods bought',
  refund: 'Returned by him',
  topup: 'Paid over the advance',
};

type Props = {
  employee: { id: number; name: string; designation?: string | null };
  /** The branch's transaction date: To starts here, From on the 1st of its month. */
  today: string;
  /** Bumped by the screen after a save, so an open ledger reads again. */
  refreshKey: number;
  onClose: () => void;
};

const PurchaseAdvanceLedger = ({ employee, today, refreshKey, onClose }: Props) => {
  const [to, setTo] = useState(() => (today ? String(today).slice(0, 10) : isoFromDate(new Date())));
  const [from, setFrom] = useState(() => `${to.slice(0, 7)}-01`);
  const [loading, setLoading] = useState(false);
  const [ledger, setLedger] = useState<{ opening: number; rows: LedgerRow[]; debit: number; credit: number; balance: number } | null>(null);
  const [openBills, setOpenBills] = useState<number[]>([]);
  // On the paper as well as the screen: the goods under each bill.
  const [withItems, setWithItems] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);
  // The bill opened from its voucher number, if any.
  const [billOpen, setBillOpen] = useState<{ id: number; vrNo: string } | null>(null);

  const read = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(`${API_PURCHASE_ADVANCE_URL}/statement`, {
        params: { employee_id: employee.id, from_date: from || undefined, to_date: to || undefined },
      });
      const body = res?.data;

      if (!body?.success) {
        toast.error(body?.message || 'Could not read the ledger.');
        return;
      }

      const data = body?.data?.data ?? {};

      setLedger({
        opening: Number(data.opening) || 0,
        rows: data.rows ?? [],
        debit: Number(data.debit) || 0,
        credit: Number(data.credit) || 0,
        balance: Number(data.balance) || 0,
      });
    } catch (error: any) {
      if (!error?.toastReported) toast.error('Could not read the ledger.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, from, to]);

  // A new employee, or a save on the screen: read again. The dates are read
  // when Show is pressed, not on every keystroke in the picker.
  useEffect(() => {
    setOpenBills([]);
    read();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, refreshKey]);

  const print = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Purchase Advance Ledger ${employee.name} ${from} to ${to}`,
  });

  const toggleBill = (id: number) =>
    setOpenBills((open) => (open.includes(id) ? open.filter((one) => one !== id) : [...open, id]));

  const cell = 'px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]';
  const rows = ledger?.rows ?? [];

  // Esc closes the ledger -- but a bill opened on top of it is closed first,
  // by its own handler, and the ledger stays.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !billOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [billOpen, onClose]);

  return (
    <div
      className="fixed inset-0 z-9999 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Ledger of ${employee.name}`}
    >
    <div
      className="my-6 w-full max-w-5xl rounded border border-stroke bg-[rgb(var(--c-surface))] p-4 shadow-lg dark:border-strokedark"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-black dark:text-white">
          Ledger — {employee.name}
          {employee.designation ? <span className="ml-1 text-sm font-normal text-gray-500">({employee.designation})</span> : null}
        </h3>
        <button type="button" onClick={onClose} aria-label="Close the ledger" className="text-gray-500 hover:text-black dark:hover:text-white">
          <FiX size={18} />
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="w-full sm:w-40">
          <InputDatePicker
            id="ledgerFrom"
            name="ledgerFrom"
            label="From"
            selectedDate={dateFromIso(from)}
            setSelectedDate={(date) => setFrom(isoFromDate(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>
        <div className="w-full sm:w-40">
          <InputDatePicker
            id="ledgerTo"
            name="ledgerTo"
            label="To"
            selectedDate={dateFromIso(to)}
            setSelectedDate={(date) => setTo(isoFromDate(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>
        <ButtonLoading
          onClick={read}
          buttonLoading={loading}
          label="Show"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiSearch className="text-lg" />}
        />
        <ButtonLoading
          onClick={() => print()}
          disabled={!ledger}
          label="Print"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiPrinter className="text-lg" />}
        />
        <ToggleSwitch
          id="ledgerWithItems"
          name="ledgerWithItems"
          checked={withItems}
          onChange={(e) => setWithItems(e.target.checked)}
          label="Print the goods under each bill"
          labelClassName={FIELD_LABEL}
          className="mb-2"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
          <thead className="bg-[rgb(var(--c-table-head))] text-xs uppercase text-gray-700 dark:text-gray-200">
            <tr>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Vr. No.</th>
              <th className="px-2 py-2">Particulars</th>
              <th className="px-2 py-2 text-right align-middle">Debit</th>
              <th className="px-2 py-2 text-right align-middle">Credit</th>
              <th className="px-2 py-2 text-right align-middle">Balance</th>
            </tr>
          </thead>
          <tbody>
            {ledger ? (
              <tr className="border-b bg-[rgb(var(--c-table-body))] font-semibold dark:border-gray-700">
                <td className={cell}>{day(from)}</td>
                <td className={cell} />
                <td className={cell}>Opening Balance</td>
                <td className={cell} />
                <td className={cell} />
                <td className={`${cell} text-right align-middle`}>{balanceText(ledger.opening)}</td>
              </tr>
            ) : null}

            {rows.map((row) => {
              const items = row.items ?? [];
              const open = openBills.includes(row.id);

              return (
                <Fragment key={row.id}>
                  <tr className="border-b bg-[rgb(var(--c-table-body))] dark:border-gray-700">
                    <td className={cell}>{day(row.vr_date)}</td>
                    <td className={cell}>
                      {/* A bill opens on its own paper -- what was bought, from
                          where, by whom. The other movements are plain money. */}
                      {row.kind === 'bill' ? (
                        <button
                          type="button"
                          onClick={() => setBillOpen({ id: Number(row.main_trx_id), vrNo: row.vr_no })}
                          className="hover:underline"
                          title="Open the purchase"
                        >
                          {row.vr_no}
                        </button>
                      ) : (
                        row.vr_no
                      )}
                    </td>
                    <td className={cell}>
                      {items.length ? (
                        <button
                          type="button"
                          onClick={() => toggleBill(row.id)}
                          aria-expanded={open}
                          className="inline-flex items-center gap-1 text-left hover:underline"
                        >
                          {open ? <FiChevronDown size={15} /> : <FiChevronRight size={15} />}
                          {KIND_LABEL[row.kind] ?? row.kind}
                          <span className="text-xs">({items.length} item{items.length > 1 ? 's' : ''})</span>
                        </button>
                      ) : (
                        KIND_LABEL[row.kind] ?? row.kind
                      )}
                      {row.bought_from ? <span className="ml-1 text-xs text-gray-500">from {row.bought_from}</span> : null}
                      {row.note ? <span className="ml-1 text-xs text-gray-500">— {row.note}</span> : null}
                    </td>
                    <td className={`${cell} text-right align-middle`}>{Number(row.given) ? money(Number(row.given)) : ''}</td>
                    <td className={`${cell} text-right align-middle`}>{Number(row.used) ? money(Number(row.used)) : ''}</td>
                    <td className={`px-2 py-2 text-right align-middle font-semibold ${Number(row.balance) < 0 ? 'text-danger' : 'text-gray-900 dark:text-[rgb(var(--c-text))]'}`}>
                      {balanceText(Number(row.balance))}
                    </td>
                  </tr>
                  {open ? (
                    <tr className="border-b bg-[rgb(var(--c-surface))] dark:border-gray-700">
                      <td colSpan={6} className="px-2 py-2">
                        <table className="ml-6 w-[calc(100%-1.5rem)] text-left text-xs text-gray-700 dark:text-gray-300">
                          <thead>
                            <tr className="text-gray-500 dark:text-gray-400">
                              <th className="px-2 py-1">Item</th>
                              <th className="px-2 py-1 text-right">Quantity</th>
                              <th className="px-2 py-1 text-right">Rate</th>
                              <th className="px-2 py-1 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, index) => (
                              <tr key={index}>
                                <td className="px-2 py-1">
                                  {item.name || '-'}
                                  {item.kind === 'asset' ? <span className="ml-1 text-gray-500">(asset)</span> : null}
                                </td>
                                <td className="px-2 py-1 text-right">
                                  {Number(item.quantity)} {item.unit || ''}
                                </td>
                                <td className="px-2 py-1 text-right">{money(Number(item.rate))}</td>
                                <td className="px-2 py-1 text-right">{money(Number(item.amount))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}

            {ledger && !rows.length ? (
              <tr className="border-b bg-[rgb(var(--c-table-body))] dark:border-gray-700">
                <td colSpan={6} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
                  Nothing was entered for him between these dates.
                </td>
              </tr>
            ) : null}

            {ledger ? (
              <tr className="bg-[rgb(var(--c-table-head))] font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
                <td className="px-2 py-2 text-right" colSpan={3}>
                  Total / Closing Balance
                </td>
                <td className="px-2 py-2 text-right align-middle">{money(ledger.debit)}</td>
                <td className="px-2 py-2 text-right align-middle">{money(ledger.credit)}</td>
                <td className={`px-2 py-2 text-right align-middle ${ledger.balance < 0 ? 'text-danger' : ''}`}>{balanceText(ledger.balance)}</td>
              </tr>
            ) : null}

            {!ledger ? (
              <tr className="border-b bg-[rgb(var(--c-table-body))] dark:border-gray-700">
                <td colSpan={6} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
                  {loading ? 'Loading...' : 'Choose the dates and press Show.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Debit: কর্মচারীর হাতে দেওয়া টাকা। Credit: তাঁর কেনা পণ্য বা ফেরত দেওয়া টাকা। Balance-এর পাশে Dr মানে তাঁর হাতে টাকা আছে,
        Cr মানে প্রতিষ্ঠান তাঁর কাছে দেনা।
      </p>

      {billOpen ? (
        <PurchaseBillView mainTrxId={billOpen.id} vrNo={billOpen.vrNo} onClose={() => setBillOpen(null)} />
      ) : null}

      {ledger ? (
        <PurchaseAdvanceLedgerPrint
          ref={printRef}
          employee={employee}
          from={from}
          to={to}
          opening={ledger.opening}
          rows={rows}
          debit={ledger.debit}
          credit={ledger.credit}
          balance={ledger.balance}
          withItems={withItems}
        />
      ) : null}
    </div>
    </div>
  );
};

export default PurchaseAdvanceLedger;
