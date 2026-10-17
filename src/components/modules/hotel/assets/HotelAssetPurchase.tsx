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
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import httpService from '../../../services/httpService';
import {
  API_COAL3_ID_BY_L4_URL,
  API_HOTEL_ASSET_PURCHASE_ACCOUNTS_URL,
  API_HOTEL_ASSET_PURCHASE_ITEMS_URL,
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
 * ⚠️ CASH, BANK OR CREDIT -- three vouchers, the ordinary purchase form's three.
 * Cash and bank are `4-` purchases paid in full out of the till or a bank
 * account; credit is a `9-` Credit Purchase journal owed to the supplier's own
 * head, so the Supplier Ledger carries it and the payment screens settle it.
 * Discounting and part payment are not built, and stay DISABLED rather than
 * pretend.
 *
 * ⚠️ THE ITEM COMES FROM `asset_items`, NOT FROM products. An office chair is a
 * thing a hotel keeps, not something it resells, so it has no stock, no FIFO
 * layer and no place on the sales screens. The catalogue is its own small list,
 * filed under an asset category -- and that category is what decides the head
 * the line debits. The Accounts Head box above only filters the list; the
 * server reads each line's head from the item.
 *
 * ⚠️ SAVING WRITES TO TWO PLACES. The voucher goes to the ledger (asset head
 * debited, cash credited), and the register gets ONE ROW PER THING bought -- two
 * chairs are two rows, because they are moved, sold and written off one at a
 * time.
 */

/** Cash, bank and credit are three vouchers, not three payment methods. */
const CASH_MODE = 'cash';
const BANK_MODE = 'bank';
const CREDIT_MODE = 'credit';

type Mode = typeof CASH_MODE | typeof BANK_MODE | typeof CREDIT_MODE;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** One row of the `asset_items` catalogue, as the dropdown hands it back. */
type AssetItem = {
  id: number;
  name: string;
  unit: string;
  last_rate: number;
  category_name: string;
  head_name: string;
};

type Line = {
  id: number;
  itemId: number;
  itemName: string;
  unit: string;
  quantity: string;
  rate: string;
};

const asDate = (value: string) => (value ? dayjs(value).toDate() : null);
const asText = (date: Date | null) => (date ? dayjs(date).format('YYYY-MM-DD') : '');
const today = () => dayjs().format('YYYY-MM-DD');

const money = (value: number) => thousandSeparator(Number(value) || 0);

const HotelAssetPurchase = () => {
  const [transactionDate, setTransactionDate] = useState(today());

  // Assets -> Category -> List, but the value kept here is the ledger's: each
  // category nominates an asset head (`asset_coa4_id`), and that is what the
  // voucher debits.
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [accountHead, setAccountHead] = useState('');

  /** The catalogue, narrowed to the head chosen above. */
  const [items, setItems] = useState<AssetItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  /** The inline "new item" box -- adding one without leaving the screen. */
  const [newItemName, setNewItemName] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  const [line, setLine] = useState({
    itemId: '',
    itemName: '',
    unit: '',
    quantity: '',
    rate: '',
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [rows, setRows] = useState<Line[]>([]);

  /** How the bill was settled -- and so which voucher the server writes. */
  const [mode, setMode] = useState<Mode>(CASH_MODE);
  const [bankList, setBankList] = useState<{ id: number; name: string }[]>([]);
  const [bankAccount, setBankAccount] = useState('');
  const [chequeNo, setChequeNo] = useState('');
  const [supplier, setSupplier] = useState<{ value: string; label: string } | null>(null);

  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  /** The number the server gave the voucher it just wrote, if any. */
  const [savedVoucher, setSavedVoucher] = useState('');
  /** How that voucher was settled -- it decides which book the banner names. */
  const [savedMode, setSavedMode] = useState<Mode>(CASH_MODE);

  useEffect(() => {
    let cancelled = false;

    httpService
      .get(API_HOTEL_ASSET_PURCHASE_ACCOUNTS_URL)
      .then((res: any) => {
        if (cancelled) return;

        const list = res?.data?.data?.data ?? res?.data?.data ?? [];

        setCategories(
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

  /** The company's bank accounts -- the Bank Account group (level 3, id 2), as Bank Payment lists them. */
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

  /**
   * The catalogue for the chosen head.
   *
   * ⚠️ REFETCHED WHEN THE HEAD CHANGES, because the list IS the head's items --
   * the dropdown is a filter over the catalogue, not a second free choice. A
   * line already added keeps its own head; only the next one follows the box.
   */
  useEffect(() => {
    if (!accountHead) {
      setItems([]);
      return;
    }

    let cancelled = false;
    setItemsLoading(true);

    httpService
      .get(API_HOTEL_ASSET_PURCHASE_ITEMS_URL, { params: { account: Number(accountHead) } })
      .then((res: any) => {
        if (cancelled) return;

        const list = res?.data?.data?.data ?? res?.data?.data ?? [];
        setItems(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        // The interceptor has already said what went wrong. An empty list is
        // what the screen shows either way.
      })
      .finally(() => {
        if (!cancelled) setItemsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountHead]);

  const subtotal = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.quantity || 0) * Number(row.rate || 0), 0),
    [rows],
  );

  /**
   * ⚠️ ALL OR NOTHING. There is no discount and no part payment yet: cash and
   * bank pay the whole of it, credit pays none -- stated rather than left off,
   * so the panel still says what it is going to do.
   */
  const netTotal = round2(subtotal);
  const paidAmount = mode === CREDIT_MODE ? 0 : netTotal;
  const dueAmount = round2(netTotal - paidAmount);

  const emptyLine = { itemId: '', itemName: '', unit: '', quantity: '', rate: '' };

  const addLine = () => {
    if (!line.itemId) {
      toast.error('Pick an item.');
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

    const row: Omit<Line, 'id'> = {
      itemId: Number(line.itemId),
      itemName: line.itemName,
      unit: line.unit,
      quantity: line.quantity,
      rate: line.rate,
    };

    if (editingId !== null) {
      setRows((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...row } : item)));
      setEditingId(null);
    } else {
      setRows((prev) => [...prev, { ...row, id: Date.now() }]);
    }

    setLine(emptyLine);
  };

  /** Back into the form to be corrected. The row stays put, greyed, so the total does not jump. */
  const editLine = (row: Line) => {
    setLine({
      itemId: String(row.itemId),
      itemName: row.itemName,
      unit: row.unit,
      quantity: row.quantity,
      rate: row.rate,
    });
    setEditingId(row.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setLine(emptyLine);
  };

  /**
   * Add an item to the catalogue from here, so a first purchase does not need a
   * screen that does not exist yet. The head chosen above decides the category,
   * and the row the server wrote comes back selected -- with the head IT
   * resolved, not one this screen guessed.
   */
  const addItem = async () => {
    const name = newItemName.trim();

    if (!accountHead) {
      toast.error('Choose an Accounts Head first.');
      return;
    }

    if (!name) {
      toast.error('What is the item called?');
      return;
    }

    setAddingItem(true);

    try {
      const res = await httpService.post(`${API_HOTEL_ASSET_PURCHASE_URL}/items/store`, {
        name,
        account: Number(accountHead),
      });

      const body = res?.data;

      if (!body?.success) {
        toast.error(body?.message || 'The server refused that.');
        return;
      }

      const created: AssetItem = body?.data?.data;

      setItems((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setNewItemName('');
      setLine((prev) => ({
        ...prev,
        itemId: String(created.id),
        itemName: created.name,
        unit: created.unit,
      }));
      toast.success(`${created.name} added`);
    } catch (error: any) {
      if (!error?.toastReported) {
        toast.error(error?.response?.data?.message || error?.message || 'Could not add the item');
      }
    } finally {
      setAddingItem(false);
    }
  };

  const reset = () => {
    setRows([]);
    setLine(emptyLine);
    setEditingId(null);
    setNotes('');
    setAccountHead('');
    setNewItemName('');
    // The mode and the bank are habits of the desk, so they stay; who this
    // bill was owed to and its cheque belong to the bill just saved.
    setSupplier(null);
    setChequeNo('');
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

    if (mode === BANK_MODE && !bankAccount) {
      toast.error('Which bank account was it paid from?');
      return;
    }

    if (mode === CREDIT_MODE && !supplier?.value) {
      toast.error('Bought on credit from whom? Choose the supplier.');
      return;
    }

    setSaving(true);

    try {
      const res = await httpService.post(`${API_HOTEL_ASSET_PURCHASE_URL}/store`, {
        // The asset head the picked category nominates -- what the ledger writes.
        account: Number(accountHead),
        vr_date: transactionDate,
        note: notes || null,
        mode,
        bank_account: mode === BANK_MODE ? Number(bankAccount) : null,
        cheque_no: mode === BANK_MODE ? chequeNo.trim() || null : null,
        supplier: mode === CREDIT_MODE ? Number(supplier?.value) : null,
        // ⚠️ THE ITEM, NOT A TYPED NAME. The server reads the head from the
        // item's category and writes one register row per unit, so the id is
        // the only thing it needs besides the figures.
        rows: rows.map((row) => ({
          item_id: row.itemId,
          quantity: Number(row.quantity),
          rate: round2(Number(row.rate)),
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
      setSavedMode(mode);
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
            Saved — voucher <strong>{savedVoucher}</strong>.{' '}
            {savedMode === CREDIT_MODE
              ? "It is owed to the supplier — see the Supplier Ledger."
              : savedMode === BANK_MODE
                ? 'It is in the bank book and the ledger like any other payment.'
                : 'It is in the cash book and the ledger like any other payment.'}
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
          data={[{ id: '', name: 'Select an asset head' }, ...categories]}
          value={accountHead}
          onChange={(e: any) => setAccountHead(e.target.value)}
          // description="Assets → Category → List. The voucher debits the head that category nominates — nothing here moves a product's quantity."
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
            <DropdownCommon
              id="itemId"
              name="itemId"
              label="Select Item *"
              data={[
                {
                  id: '',
                  name: !accountHead
                    ? 'Choose an Accounts Head first'
                    : itemsLoading
                      ? 'Loading…'
                      : items.length
                        ? 'Select an item'
                        : 'No items yet — add one below',
                },
                ...items.map((item) => ({
                  id: item.id,
                  name: item.unit ? `${item.name} (${item.unit})` : item.name,
                })),
              ]}
              value={line.itemId}
              onChange={(e: any) => {
                const id = e.target.value;
                const picked = items.find((item) => String(item.id) === String(id));

                setLine((prev) => ({
                  ...prev,
                  itemId: id,
                  itemName: picked?.name ?? '',
                  unit: picked?.unit ?? '',
                  // The last price paid is a starting figure, not a rule: the
                  // clerk overwrites it whenever this bill was dearer or cheaper.
                  rate: picked ? (picked.last_rate > 0 ? String(picked.last_rate) : '') : '',
                }));
              }}
              // description="The item decides where the cost lands — see its category above."
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

        {/* ⚠️ THE CATALOGUE CAN BE EXTENDED FROM HERE. There is no asset-item
            master screen yet, and a first purchase must not be blocked on one;
            the head chosen above decides which category the item is filed
            under. */}
        {accountHead ? (
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-dashed border-stroke pt-3 dark:border-strokedark">
            <div className="w-full max-w-xs">
              <InputElement
                id="newItemName"
                name="newItemName"
                label="New item — adds to the catalogue"
                placeholder="Office chair, executive"
                value={newItemName}
                onChange={(e: any) => setNewItemName(e.target.value)}
              />
            </div>
            <ButtonLoading
              onClick={addItem}
              buttonLoading={addingItem}
              label="Add item"
              variant="ghost"
              className="border border-stroke px-3 dark:border-strokedark"
              icon={<FiPlus size={16} />}
            />
          </div>
        ) : null}

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
                  <td className="px-2 py-2 text-right">
                    {row.quantity}
                    {row.unit ? <span className="ml-1 text-xs text-gray-500">{row.unit}</span> : null}
                  </td>
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

          {/* ⚠️ Three vouchers, not three payment methods: each button decides
              the voucher the server writes -- see the note at the top. */}
          <div
            role="radiogroup"
            aria-label="Payment mode"
            className="mb-2 grid grid-cols-3 overflow-hidden rounded border border-stroke dark:border-strokedark"
          >
            {[
              { value: CASH_MODE, label: 'Cash', icon: <FiDollarSign size={16} /> },
              { value: BANK_MODE, label: 'Bank', icon: <FaUniversity size={15} /> },
              { value: CREDIT_MODE, label: 'Credit', icon: <FiCreditCard size={16} /> },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={mode === item.value}
                onClick={() => setMode(item.value as Mode)}
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

          <p className="mb-3 text-xs leading-snug text-gray-500 dark:text-gray-400">
            {mode === CREDIT_MODE
              ? 'Nothing paid now — the whole bill is owed to the supplier and is settled later from the payment screens.'
              : mode === BANK_MODE
                ? 'Paid in full from the bank account below.'
                : 'Paid out of cash, in full.'}
          </p>

          <div className="grid grid-cols-1 gap-3">
            {mode === BANK_MODE ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <DropdownCommon
                  id="bankAccount"
                  name="bankAccount"
                  label="Bank Account *"
                  data={[{ id: '', name: 'Select a bank account' }, ...bankList]}
                  value={bankAccount}
                  onChange={(e: any) => setBankAccount(e.target.value)}
                />
                <InputElement
                  id="chequeNo"
                  name="chequeNo"
                  label="Cheque No"
                  placeholder="Optional"
                  value={chequeNo}
                  onChange={(e: any) => setChequeNo(e.target.value)}
                />
              </div>
            ) : null}

            {mode === CREDIT_MODE ? (
              <div>
                <label htmlFor="supplier" className={FIELD_LABEL}>
                  Supplier *
                </label>
                <DdlMultiline
                  id="supplier"
                  name="supplier"
                  placeholder="Select Supplier"
                  acType={'3'}
                  value={supplier}
                  onSelect={(option: any) =>
                    setSupplier(
                      option ? { value: String(option.value), label: String(option.label) } : null,
                    )
                  }
                />
              </div>
            ) : null}

            <InputElement
              id="paidAmount"
              name="paidAmount"
              label="Payment Amount (Tk.)"
              value={money(paidAmount)}
              disabled
              onChange={() => undefined}
              description={
                mode === CREDIT_MODE
                  ? 'Nothing now. Part payment is not built yet.'
                  : 'The whole of it. Part payment is not built yet.'
              }
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
              {money(paidAmount)}
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
