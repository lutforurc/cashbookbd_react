import { useMemo, useState } from 'react';
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
import { FIELD_HEIGHT, FIELD_LABEL, FIELD_TEXTAREA } from '../../../../theme/fieldStyles';

/**
 * Buying the things a hotel is furnished WITH -- beds, chairs, a generator.
 *
 * ⚠️ DESIGN ONLY. Every control below is drawn and laid out; nothing is sent
 * anywhere. Save, List and Print say so when pressed rather than doing nothing,
 * and the item and account lists are placeholders standing in for the real
 * dropdowns. What the owner asked for at this stage is the SHAPE of the form:
 * once that is agreed, the fields get wired to the voucher they raise.
 *
 * ⚠️ This is the FF&E case of a general "accounts transaction": a purchase made
 * against an asset head rather than against stock. It is NOT a purchase invoice
 * -- nothing here lands in inventory or moves a product's quantity. What it is
 * meant to become is an asset purchase: money out of cash or bank, an amount
 * onto an asset head, and, when the seller is not paid in full, a balance owed
 * to them on the other side.
 *
 * ⚠️ WHY THE FORM ASKS ABOUT PAYMENT MODE AT ALL. The screenshot this was drawn
 * from offers Cash, Bank and Credit as one choice. The three are not three
 * payment methods so much as three different vouchers -- cash out, bank out, or
 * a bill with nothing paid yet -- and which one is picked decides what the
 * ledger ends up holding.
 */

/** Cash is an account like any other in this chart; 17 is the one. */
const CASH_MODE = 'cash';
const BANK_MODE = 'bank';
const CREDIT_MODE = 'credit';

type Mode = typeof CASH_MODE | typeof BANK_MODE | typeof CREDIT_MODE;

const MODES: { value: Mode; label: string; icon: React.ReactNode }[] = [
  { value: CASH_MODE, label: 'Cash', icon: <FiDollarSign size={16} /> },
  { value: BANK_MODE, label: 'Bank', icon: <FaUniversity size={15} /> },
  { value: CREDIT_MODE, label: 'Credit', icon: <FiCreditCard size={16} /> },
];

/**
 * ⚠️ PLACEHOLDERS, both lists. The real ones are the chart of accounts (level 4,
 * asset group) and whatever a hotel's assets are set up as -- see the Asset
 * module. They are written out here so the form can be read; they are not a
 * list anything should ever save against.
 */
const ACCOUNT_HEADS = [
  { id: 'furniture', name: 'Furniture & Fixtures' },
  { id: 'equipment', name: 'Equipment' },
  { id: 'electrical', name: 'Electrical Fittings' },
  { id: 'kitchen', name: 'Kitchen Equipment' },
];

const ITEMS = [
  { id: 'chair', name: 'Office Chair' },
  { id: 'desk', name: 'Office Desk' },
  { id: 'bed', name: 'Bed (Queen)' },
  { id: 'wardrobe', name: 'Wardrobe' },
];

const BANK_ACCOUNTS = [
  { id: 'business', name: 'Business Bank Account' },
  { id: 'current', name: 'Current Account' },
];

const SUPPLIERS = [
  { id: 'abc', name: 'ABC Furniture' },
  { id: 'xyz', name: 'XYZ Traders' },
];

type Line = {
  id: number;
  itemId: string;
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
  const [accountHead, setAccountHead] = useState('furniture');
  const [mode, setMode] = useState<Mode>(BANK_MODE);

  const [line, setLine] = useState({ itemId: '', itemName: '', quantity: '', rate: '' });
  const [editingId, setEditingId] = useState<number | null>(null);

  /**
   * ⚠️ SEEDED, so the screen reads as a filled-in example rather than an empty
   * grid. Two lines and a discount, exactly as in the picture this was drawn
   * from. Reset clears them.
   */
  const [rows, setRows] = useState<Line[]>([
    { id: 1, itemId: 'chair', itemName: 'Office Chair', quantity: '5', rate: '3000' },
    { id: 2, itemId: 'desk', itemName: 'Office Desk', quantity: '1', rate: '10000' },
  ]);

  const [bankAccount, setBankAccount] = useState('business');
  const [supplier, setSupplier] = useState('abc');
  const [paidAmount, setPaidAmount] = useState('10000');
  const [discount, setDiscount] = useState('1000');
  const [notes, setNotes] = useState('Office furniture purchase');

  const subtotal = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.quantity || 0) * Number(row.rate || 0), 0),
    [rows],
  );
  const netTotal = subtotal - Number(discount || 0);
  const dueAmount = netTotal - Number(paidAmount || 0);

  /** ⚠️ The whole point of the "design only" stage: nothing is wired, so say so. */
  const notWired = (what: string) => toast.info(`${what} — not wired up yet.`);

  const addLine = () => {
    if (!line.itemId) {
      toast.error('Pick an item first');
      return;
    }

    if (!Number(line.quantity)) {
      toast.error('How many?');
      return;
    }

    if (editingId !== null) {
      setRows((prev) =>
        prev.map((row) => (row.id === editingId ? { ...row, ...line } : row)),
      );
      setEditingId(null);
    } else {
      setRows((prev) => [...prev, { ...line, id: Date.now() }]);
    }

    setLine({ itemId: '', itemName: '', quantity: '', rate: '' });
  };

  /** Back into the form to be corrected. The row stays put, greyed, so the total does not jump. */
  const editLine = (row: Line) => {
    setLine({
      itemId: row.itemId,
      itemName: row.itemName,
      quantity: row.quantity,
      rate: row.rate,
    });
    setEditingId(row.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setLine({ itemId: '', itemName: '', quantity: '', rate: '' });
  };

  const reset = () => {
    setRows([]);
    setLine({ itemId: '', itemName: '', quantity: '', rate: '' });
    setEditingId(null);
    setDiscount('0');
    setPaidAmount('0');
    setNotes('');
    setTransactionDate(today());
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
          <ButtonLoading
            onClick={() => notWired('List')}
            label="List"
            variant="ghost"
            className="border border-stroke px-3 dark:border-strokedark"
            icon={<FiList size={16} />}
          />
          <ButtonLoading
            onClick={() => notWired('Print')}
            label="Print"
            variant="ghost"
            className="border border-stroke px-3 dark:border-strokedark"
            icon={<FiPrinter size={16} />}
          />
        </div>
      </div>

      {/* Who is being bought from, what head it lands on, and when. */}
      <div className="mb-3 grid grid-cols-1 gap-3 rounded border border-stroke p-3 md:grid-cols-3 dark:border-strokedark">
        <DropdownCommon
          id="accountHead"
          name="accountHead"
          label="Accounts Head *"
          data={ACCOUNT_HEADS}
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

        {/* ⚠️ Disabled on purpose, as in the picture: the number is the
            server's to give, and a box somebody could type one into would be a
            number the books do not have. */}
        <InputElement
          id="voucherNo"
          name="voucherNo"
          label="Voucher No"
          value=""
          placeholder="Auto-generated"
          disabled
          onChange={() => undefined}
        />
      </div>

      {/* What is being bought. */}
      <div className="mb-3 rounded border border-stroke p-3 dark:border-strokedark">
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <DropdownCommon
              id="item"
              name="item"
              label="Select Item"
              data={ITEMS}
              value={line.itemId}
              onChange={(e: any) => {
                const picked = ITEMS.find((item) => item.id === e.target.value);
                setLine((prev) => ({
                  ...prev,
                  itemId: e.target.value,
                  itemName: picked?.name ?? '',
                }));
              }}
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
                    {money(Number(row.quantity) * Number(row.rate))}
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
                  <td colSpan={6} className="px-2 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                    Nothing added yet — pick an item above and press Add Item.
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

          {/* ⚠️ Three vouchers, not three payment methods — see the note at the
              top of this file. Which one is picked decides what the ledger
              holds, so the choice is not a display preference. */}
          <div className="mb-3 grid grid-cols-3 overflow-hidden rounded border border-stroke dark:border-strokedark">
            {MODES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                className={`${FIELD_HEIGHT} inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                  mode === item.value
                    ? 'bg-primary text-white'
                    : 'text-body hover:bg-gray-100 dark:text-bodydark dark:hover:bg-meta-4'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Only a bank payment has an account to name. */}
            {mode === BANK_MODE ? (
              <DropdownCommon
                id="bankAccount"
                name="bankAccount"
                label="Bank Account"
                data={BANK_ACCOUNTS}
                value={bankAccount}
                onChange={(e: any) => setBankAccount(e.target.value)}
              />
            ) : null}

            <DropdownCommon
              id="supplier"
              name="supplier"
              label={mode === CREDIT_MODE ? 'Seller / Supplier *' : 'Seller / Supplier'}
              data={SUPPLIERS}
              value={supplier}
              onChange={(e: any) => setSupplier(e.target.value)}
              description="Required when an outstanding balance remains."
            />

            {mode !== CREDIT_MODE ? (
              <InputElement
                id="paidAmount"
                name="paidAmount"
                type="number"
                min={0}
                label="Payment Amount (Tk.)"
                placeholder="0.00"
                value={paidAmount}
                onChange={(e: any) => setPaidAmount(e.target.value)}
              />
            ) : null}

            <div className={mode === BANK_MODE ? 'md:col-span-2' : ''}>
              <label htmlFor="notes" className={FIELD_LABEL}>
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
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

          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Discount Amount (Tk.)</span>
            <input
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className={`${FIELD_HEIGHT} w-32 rounded border border-[rgb(var(--c-border-strong))] bg-white px-2 text-right text-gray-700 outline-none dark:bg-boxdark dark:text-white`}
            />
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
              {money(Number(paidAmount || 0))}
            </span>
          </div>

          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400">Due Amount (Tk.)</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {money(dueAmount)}
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
          onClick={() => notWired('Save Transaction')}
          label="Save Transaction"
          variant="primary"
          className="px-4"
          icon={<FiSave size={16} />}
        />
      </div>
    </div>
  );
};

export default HotelAssetPurchase;
