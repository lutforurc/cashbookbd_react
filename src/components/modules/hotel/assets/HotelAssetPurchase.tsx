import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import {
  FiCreditCard,
  FiDollarSign,
  FiEdit2,
  FiList,
  FiPlus,
  FiPrinter,
  FiRefreshCcw,
  FiSave,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import { FaUniversity } from 'react-icons/fa';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import InputDatePicker from '../../../utils/fields/DatePicker';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import httpService from '../../../services/httpService';
import {
  API_HOTEL_ASSET_PURCHASE_ACCOUNTS_URL,
  API_HOTEL_ASSET_PURCHASE_URL,
} from '../../../services/apiRoutes';
import { FIELD_HEIGHT, FIELD_LABEL, FIELD_TEXTAREA } from '../../../../theme/fieldStyles';

/**
 * Buying the things a hotel is furnished WITH -- beds, chairs, a generator.
 *
 * ⚠️ IT IS NUMBERED AS A PURCHASE. The invoice is given the Purchase Invoice
 * number (`4-...`) by the same backend generator every purchase uses, so its
 * number sits in the purchase series -- prefix, month segment and sequence.
 * Only the asset head it debits is new. Nothing here touches inventory, and no
 * product's quantity moves.
 *
 * ⚠️ CASH ONLY, paid in full -- THE FIRST STEP. Bank, credit, discounting and
 * part payment are not built, and rather than pretend, each control that would
 * need them is DISABLED with a line saying so. Nothing on this screen can put a
 * figure in the books that the books do not mean.
 *
 * ⚠️ THE ITEM IS FREE TEXT. It is not a product and there is no catalogue behind
 * it -- an office chair is a thing a hotel keeps, not something it resells. What
 * is typed lands on the voucher line's remark, which is the only place the
 * ledger can say WHAT was bought.
 */

/** Cash, bank and credit are three vouchers, not three payment methods. */
const CASH_MODE = 'cash';
const BANK_MODE = 'bank';
const CREDIT_MODE = 'credit';

type Mode = typeof CASH_MODE | typeof BANK_MODE | typeof CREDIT_MODE;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

type Line = {
  id: number;
  itemName: string;
  quantity: string;
  rate: string;
};

const asDate = (value: string) => (value ? dayjs(value).toDate() : null);
const asText = (date: Date | null) => (date ? dayjs(date).format('YYYY-MM-DD') : '');
const today = () => dayjs().format('YYYY-MM-DD');

const money = (value: number) => thousandSeparator(Number(value) || 0);

const HotelAssetPurchase = () => {
  const [transactionDate, setTransactionDate] = useState(today());

  const [accounts, setAccounts] = useState<{ id: number; name: string }[]>([]);
  const [accountHead, setAccountHead] = useState('');

  const [line, setLine] = useState({ itemName: '', quantity: '', rate: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [rows, setRows] = useState<Line[]>([]);

  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  /** The number the server gave the voucher it just wrote, if any. */
  const [savedVoucher, setSavedVoucher] = useState('');

  useEffect(() => {
    let cancelled = false;

    httpService
      .get(API_HOTEL_ASSET_PURCHASE_ACCOUNTS_URL)
      .then((res: any) => {
        if (cancelled) return;

        const list = res?.data?.data?.data ?? res?.data?.data ?? [];

        setAccounts(
          Array.isArray(list)
            ? list.map((row: any) => ({ id: Number(row.value), name: row.label }))
            : [],
        );
      })
      .catch(() => {
        // The interceptor has already said what went wrong. An empty list is
        // what the screen shows either way, and it cannot save without a head.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const subtotal = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.quantity || 0) * Number(row.rate || 0), 0),
    [rows],
  );

  /**
   * ⚠️ THE VOUCHER PAYS THE WHOLE THING. There is no discount and no part
   * payment yet, so net, paid and due are the subtotal and two zeros -- stated
   * rather than left off, so the panel still says what it is going to do.
   */
  const netTotal = round2(subtotal);

  const addLine = () => {
    if (!line.itemName.trim()) {
      toast.error('What is being bought?');
      return;
    }

    if (!Number(line.quantity)) {
      toast.error('How many?');
      return;
    }

    if (!Number(line.rate)) {
      toast.error('At what rate? A line worth nothing cannot be saved.');
      return;
    }

    if (editingId !== null) {
      setRows((prev) => prev.map((row) => (row.id === editingId ? { ...row, ...line } : row)));
      setEditingId(null);
    } else {
      setRows((prev) => [...prev, { ...line, id: Date.now() }]);
    }

    setLine({ itemName: '', quantity: '', rate: '' });
  };

  /** Back into the form to be corrected. The row stays put, greyed, so the total does not jump. */
  const editLine = (row: Line) => {
    setLine({ itemName: row.itemName, quantity: row.quantity, rate: row.rate });
    setEditingId(row.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setLine({ itemName: '', quantity: '', rate: '' });
  };

  const reset = () => {
    setRows([]);
    setLine({ itemName: '', quantity: '', rate: '' });
    setEditingId(null);
    setNotes('');
    setAccountHead('');
    setTransactionDate(today());
    // A fresh entry has no number yet, so the one just saved must leave the box.
    setSavedVoucher('');
  };

  const save = async () => {
    if (!accountHead) {
      toast.error('Choose the asset head this is being bought against.');
      return;
    }

    if (!rows.length) {
      toast.error('Add at least one line before saving.');
      return;
    }

    if (editingId !== null) {
      toast.error('Finish the line you are correcting first — Save item, or cancel.');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_HOTEL_ASSET_PURCHASE_URL}/store`, {
        account: Number(accountHead),
        vr_date: transactionDate,
        note: notes || null,
        rows: rows.map((row) => ({
          // Rounded here rather than left to the server: the figure the clerk
          // sees on the line is the figure that must be saved, and 3 × 33.33
          // is not 99.99 in binary floating point.
          amount: round2(Number(row.quantity) * Number(row.rate)),
          remarks: row.itemName.trim() || null,
        })),
      });

      // ⚠️ A refusal rides HTTP 200 with success:false, so the body has to be
      // read rather than the status. Same shape every other screen here reads.
      const body = res?.data;

      if (!body?.success) {
        toast.error(body?.message || 'The server refused that.');
        return;
      }

      const saved = body?.data?.data ?? {};

      // Clear the form first, then put the number it was given back in the box.
      reset();
      setSavedVoucher(String(saved?.vr_no ?? ''));
      toast.success(`Voucher ${saved?.vr_no} saved`);
    } catch (error: any) {
      if (!error?.toastReported) {
        toast.error(error?.response?.data?.message || error?.message || 'Could not save');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <HelmetTitle title="Accounts Transaction" />

      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-black dark:text-white">
            Accounts Transaction
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Furniture &amp; equipment purchases
          </p>
        </div>

        <div className="flex gap-2">
          {/* Both are for later, and say so rather than doing nothing. */}
          <ButtonLoading
            onClick={() => toast.info('List — not built yet.')}
            label="List"
            variant="ghost"
            className="border border-stroke px-3 dark:border-strokedark"
            icon={<FiList size={16} />}
          />
          <ButtonLoading
            onClick={() => toast.info('Print — not built yet; the voucher prints from the ledger.')}
            label="Print"
            variant="ghost"
            className="border border-stroke px-3 dark:border-strokedark"
            icon={<FiPrinter size={16} />}
          />
        </div>
      </div>

      {/* The number the server gave the voucher just written. There is no list
          screen yet, so this is the only place it can be read. */}
      {savedVoucher ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded border border-success bg-success/10 px-3 py-2">
          <span className="text-sm font-medium text-black dark:text-white">
            Saved — voucher <strong>{savedVoucher}</strong>. It is in the cash book and the ledger
            like any other payment.
          </span>
          <button
            type="button"
            onClick={() => setSavedVoucher('')}
            aria-label="Dismiss"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <FiX size={16} />
          </button>
        </div>
      ) : null}

      {/* Who is being bought from, what head it lands on, and when. */}
      <div className="mb-3 grid grid-cols-1 gap-3 rounded border border-stroke p-3 md:grid-cols-3 dark:border-strokedark">
        <DropdownCommon
          id="accountHead"
          name="accountHead"
          label="Accounts Head *"
          data={[{ id: '', name: 'Select an asset head' }, ...accounts]}
          value={accountHead}
          onChange={(e: any) => setAccountHead(e.target.value)}
          description="The asset head the money lands on. Not a stock purchase — nothing here moves a product's quantity."
        />

        <InputDatePicker
          id="transactionDate"
          name="transactionDate"
          label="Transaction Date *"
          selectedDate={asDate(transactionDate)}
          setSelectedDate={(date: Date | null) => setTransactionDate(asText(date))}
          setCurrentDate={(date: Date | null) => setTransactionDate(asText(date))}
          className="w-full"
        />

        {/* ⚠️ Disabled on purpose: the number is the server's to give, and a box
            somebody could type one into would be a number the books do not have.
            It shows, read-only, the purchase number the server issued for the
            voucher just saved. */}
        <InputElement
          id="voucherNo"
          name="voucherNo"
          label="Voucher No"
          value={savedVoucher}
          placeholder="Auto-generated"
          disabled
          onChange={() => undefined}
        />
      </div>

      {/* What is being bought. */}
      <div className="mb-3 rounded border border-stroke p-3 dark:border-strokedark">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <InputElement
              id="itemName"
              name="itemName"
              label="Select Item"
              placeholder="Office Chair"
              value={line.itemName}
              onChange={(e: any) => setLine((prev) => ({ ...prev, itemName: e.target.value }))}
              description=""
            />
          </div>

          <div className="md:col-span-2">
            <InputElement
              id="quantity"
              name="quantity"
              type="number"
              min={0}
              label="Quantity"
              placeholder="0"
              value={line.quantity}
              onChange={(e: any) => setLine((prev) => ({ ...prev, quantity: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <InputElement
              id="rate"
              name="rate"
              type="number"
              min={0}
              label="Rate (Tk.)"
              placeholder="0.00"
              value={line.rate}
              onChange={(e: any) => setLine((prev) => ({ ...prev, rate: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 md:col-span-3">
            <ButtonLoading
              onClick={addLine}
              label={editingId !== null ? 'Save Item' : 'Add Item'}
              variant="primary"
              className="flex-1 whitespace-nowrap"
              icon={editingId !== null ? <FiEdit2 size={16} /> : <FiPlus size={16} />}
            />
            {editingId !== null ? (
              <ButtonLoading onClick={cancelEdit} label=" " icon={<FiX size={16} />} />
            ) : null}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[rgb(var(--c-table-head))] text-xs uppercase text-gray-700 dark:text-gray-200">
              <tr>
                <th scope="col" className="w-14 px-2 py-2 text-left">SL</th>
                <th scope="col" className="px-2 py-2 text-left">Item</th>
                <th scope="col" className="px-2 py-2 text-right">Quantity</th>
                <th scope="col" className="px-2 py-2 text-right">Rate (Tk.)</th>
                <th scope="col" className="px-2 py-2 text-right">Total (Tk.)</th>
                <th scope="col" className="w-20 px-2 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={
                    'border-b border-stroke dark:border-strokedark ' +
                    (editingId === row.id
                      ? 'bg-blue-50 dark:bg-blue-950'
                      : 'text-gray-900 dark:text-[rgb(var(--c-text))]')
                  }
                >
                  <td className="px-2 py-2">{String(index + 1).padStart(2, '0')}</td>
                  <td className="px-2 py-2 font-medium">{row.itemName}</td>
                  <td className="px-2 py-2 text-right">{row.quantity}</td>
                  <td className="px-2 py-2 text-right">{money(Number(row.rate))}</td>
                  <td className="px-2 py-2 text-right font-medium">
                    {money(round2(Number(row.quantity) * Number(row.rate)))}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        aria-label="Edit item"
                        title="Change this line"
                        onClick={() => editLine(row)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        <FiEdit2 size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label="Remove item"
                        title="Take this line off"
                        onClick={() => {
                          setRows((prev) => prev.filter((item) => item.id !== row.id));
                          if (editingId === row.id) cancelEdit();
                        }}
                        className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-2 py-3 text-center text-xs text-gray-500 dark:text-gray-400"
                  >
                    Nothing added yet — name what was bought above and press Add Item.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Where the money came from, and who it went to. */}
        <div className="rounded border border-stroke p-3 dark:border-strokedark">
          <h2 className="mb-2 text-base font-semibold text-black dark:text-white">
            Payment Details
          </h2>

          {/* ⚠️ Three vouchers, not three payment methods. Bank and credit are
              DISABLED rather than merely unbuilt: pressing one and getting a
              cash voucher anyway is the one thing this screen must not do. */}
          <div className="mb-2 grid grid-cols-3 overflow-hidden rounded border border-stroke dark:border-strokedark">
            <span
              className={`${FIELD_HEIGHT} inline-flex items-center justify-center gap-2 bg-primary text-sm font-medium text-white`}
            >
              <FiDollarSign size={16} />
              Cash
            </span>
            {[
              { label: 'Bank', icon: <FaUniversity size={15} /> },
              { label: 'Credit', icon: <FiCreditCard size={16} /> },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                disabled
                title={`${item.label} is the next step — not built yet.`}
                className={`${FIELD_HEIGHT} inline-flex cursor-not-allowed items-center justify-center gap-2 text-sm font-medium text-gray-400 opacity-60 dark:text-gray-500`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <p className="mb-3 text-xs leading-snug text-gray-500 dark:text-gray-400">
            Paid out of cash, in full. Bank, credit and part payment come next — a credit purchase
            moves no money at all and is a journal, not a setting on this one.
          </p>

          <div className="grid grid-cols-1 gap-3">
            <InputElement
              id="paidAmount"
              name="paidAmount"
              label="Payment Amount (Tk.)"
              value={money(netTotal)}
              disabled
              onChange={() => undefined}
              description="The whole of it. Part payment arrives with credit, and is what leaves a balance owing to the seller."
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
                placeholder="Optional note for the whole voucher"
                className={`${FIELD_TEXTAREA} w-full px-3 py-2`}
              />
            </div>
          </div>
        </div>

        {/* What it adds up to. */}
        <div className="rounded border border-stroke p-3 dark:border-strokedark">
          <h2 className="mb-2 text-base font-semibold text-black dark:text-white">
            Transaction Totals
          </h2>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Subtotal (Tk.)</span>
            <span className="font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
              {money(subtotal)}
            </span>
          </div>

          {/* ⚠️ No discount yet, and it is not merely unbuilt: a discount is a
              third ledger leg, and where it goes is a bookkeeping decision
              nobody has made. Zero, and not typeable, until it is. */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Discount Amount (Tk.)</span>
            <span className="text-sm text-gray-400 dark:text-gray-500">
              0 — not built yet
            </span>
          </div>

          <div className="my-1 border-t border-stroke dark:border-strokedark" />

          <div className="flex items-center justify-between py-1.5">
            <span className="text-base font-semibold text-black dark:text-white">
              Net Total (Tk.)
            </span>
            <span className="text-lg font-semibold text-black dark:text-white">
              {money(netTotal)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Paid Amount (Tk.)</span>
            <span className="font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
              {money(netTotal)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Due Amount (Tk.)</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {money(0)}
            </span>
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
          label={saving ? 'Saving...' : 'Save Transaction'}
          variant="primary"
          disabled={saving}
          className="px-4"
          icon={<FiSave size={16} />}
        />
      </div>
    </div>
  );
};

export default HotelAssetPurchase;
