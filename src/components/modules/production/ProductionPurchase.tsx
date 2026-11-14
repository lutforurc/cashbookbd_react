import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiEdit2, FiPlus, FiRefreshCcw, FiSave, FiSearch, FiTrash2, FiXCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import useVoucherAutoEditSearch from '../../utils/hooks/useVoucherAutoEditSearch';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import DdlMultiline from '../../utils/utils-functions/DdlMultiline';
import ProductDropdown from '../../utils/utils-functions/ProductDropdown';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import {
  getProductionPurchaseForEdit,
  storeProductionPurchase,
  updateProductionPurchase,
} from './productionSlice';
import { branchTodayIso } from './branchDate';

type Option = { value: string; label: string; label_5?: string };

type PurchaseLine = {
  id: number;
  code: string;
  name: string;
  unit: string;
  qty: string;
  price: string;
  free: boolean;
};

const emptyLine = { code: '', name: '', unit: '', qty: '', price: '', free: false };

const dateFromIso = (value: string | null | undefined): Date | null => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};

const isoFromDate = (date: Date | null): string =>
  date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';

/**
 * A purchase on a Production branch, with the supplier's free line (v4 খ-৯,
 * Phase 4).
 *
 * ⚠️ A FREE LINE IS ITS OWN ROW, PRICE 0 -- never a discount on the paid row.
 * The supplier's gift enters stock as a layer of its own at 0, beside the paid
 * layer at the price (see ProductionPurchasePosting). The old Purchase Invoice
 * drops a price-0 line, which is why this form exists at all.
 *
 * There is no scheme here: a sale earns free goods, a purchase is simply given
 * them, so the line is ticked in by hand.
 */
const ProductionPurchase = () => {
  const dispatch = useDispatch<any>();
  const trxDt = useSelector((s: any) => s.settings?.data?.trx_dt);
  const today = () => branchTodayIso(trxDt);

  const [form, setForm] = useState({
    account: '',
    accountName: '',
    invoiceDate: today(),
    invoiceNo: '',
    discountAmt: '',
    paidAmt: '',
    notes: '',
    lines: [] as PurchaseLine[],
  });
  const [line, setLine] = useState({ ...emptyLine });
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchNo, setSearchNo] = useState('');
  // Opened from a report's Edit button: the purchase is found as if its number
  // had been typed in the Find box.
  useVoucherAutoEditSearch({ setSearch: setSearchNo, triggerSearch: (no) => loadForEdit(no) });
  const [searching, setSearching] = useState(false);
  const [editing, setEditing] = useState<{ mtmId: string; vrNo: string } | null>(null);

  const lineSeq = useRef(0);
  const newLineId = () => -(++lineSeq.current);

  const setField = (name: string, value: any) => setForm((p) => ({ ...p, [name]: value }));

  const total = form.lines.reduce((sum, r) => sum + Number(r.qty) * Number(r.price), 0);
  const net = Math.max(0, total - (Number(form.discountAmt) || 0));

  // A cash supplier is always paid in full and the box is locked; anyone else
  // starts at 0 and may pay part -- the ordinary purchase's rule.
  const isCashSupplier = Number(form.account) === 17;
  const paid = isCashSupplier ? net.toFixed(2) : form.paidAmt;

  const handleSupplier = (option: any) =>
    setForm((p) => ({ ...p, account: option?.value || '', accountName: option?.label || '', paidAmt: '0' }));

  const handleLineProduct = (option: Option | null) =>
    setLine((p) => ({
      ...p,
      code: option?.value || '',
      name: option?.label || '',
      unit: option?.label_5 || '',
      price: p.free ? '0' : p.price,
    }));

  const addLine = () => {
    if (!line.code) return toast.error('Pick a product');
    if (!line.qty || Number(line.qty) <= 0) return toast.error('Enter a quantity');
    if (!line.free && (line.price === '' || Number(line.price) <= 0)) {
      return toast.error('Enter a price, or tick Free');
    }

    setForm((p) => ({
      ...p,
      lines: [
        ...p.lines,
        {
          id: newLineId(),
          code: line.code,
          name: line.name,
          unit: line.unit,
          qty: line.qty,
          price: line.free ? '0' : line.price,
          free: line.free,
        },
      ],
    }));
    setLine({ ...emptyLine });
    setEditingLineId(null);
  };

  const editLine = (id: number) => {
    const found = form.lines.find((r) => r.id === id);
    if (!found) return;
    setLine({
      code: found.code,
      name: found.name,
      unit: found.unit,
      qty: found.qty,
      price: found.price,
      free: found.free,
    });
    setEditingLineId(id);
  };

  const updateLine = () => {
    if (editingLineId === null) return;
    setForm((p) => ({
      ...p,
      lines: p.lines.map((r) =>
        r.id === editingLineId
          ? { ...r, qty: line.qty, price: line.free ? '0' : line.price, free: line.free }
          : r,
      ),
    }));
    setLine({ ...emptyLine });
    setEditingLineId(null);
  };

  const deleteLine = (id: number) => {
    setForm((p) => ({ ...p, lines: p.lines.filter((r) => r.id !== id) }));
    if (editingLineId === id) {
      setLine({ ...emptyLine });
      setEditingLineId(null);
    }
  };

  const resetForm = () => {
    setForm({
      account: '',
      accountName: '',
      invoiceDate: today(),
      invoiceNo: '',
      discountAmt: '',
      paidAmt: '',
      notes: '',
      lines: [],
    });
    setLine({ ...emptyLine });
    setEditingLineId(null);
    setEditing(null);
    setSearchNo('');
  };

  // `given` is the number a report's Edit button sent; the Find box sends none.
  const loadForEdit = (given?: string) => {
    const invoiceNo = (given ?? searchNo).trim();
    if (!invoiceNo) return toast.error('Enter the Vr. No. of the purchase');

    setSearching(true);
    dispatch(
      getProductionPurchaseForEdit({ invoiceNo }, (response: any) => {
        setSearching(false);
        if (!response?.success) return toast.error(response?.message || 'Could not load the purchase');

        const found = response?.data?.data;
        if (!found?.mtmId) return toast.error(response?.message || 'Production purchase not found');

        const lines: PurchaseLine[] = (found.products || []).map((r: any) => ({
          id: Number(r.id),
          code: String(r.product),
          name: r.product_name || '',
          unit: r.unit || '',
          qty: String(Number(r.qty)),
          price: String(Number(r.price)),
          free: Number(r.is_free) === 1,
        }));

        setForm({
          account: String(found.account ?? ''),
          accountName: found.accountName || '',
          invoiceDate: found.invoice_date ? String(found.invoice_date).slice(0, 10) : today(),
          invoiceNo: found.invoice_no || '',
          discountAmt: Number(found.discount) > 0 ? String(Number(found.discount)) : '',
          paidAmt: String(Number(found.netpayment ?? 0)),
          notes: found.notes || '',
          lines,
        });
        setLine({ ...emptyLine });
        setEditingLineId(null);
        setEditing({ mtmId: String(found.mtmId), vrNo: found.vr_no || invoiceNo });
        toast.success(`Editing ${found.vr_no || invoiceNo}`);
      }) as any,
    );
  };

  const save = () => {
    if (!form.account) return toast.error('Select the supplier');
    if (!form.lines.length) return toast.error('Add at least one purchase item');
    if (!form.lines.some((r) => !r.free)) return toast.error('A free line needs a paid line on the same invoice');
    if (paid === '' || Number(paid) < 0) return toast.error('Enter the paid amount (0 if none)');
    if (Number(paid) > net) return toast.error('The paid amount cannot be more than the net');

    setSaving(true);
    const payload: any = {
      account: form.account,
      accountName: form.accountName,
      invoice_date: form.invoiceDate,
      invoice_no: form.invoiceNo || null,
      discountAmt: Number(form.discountAmt) || 0,
      paymentAmt: Number(paid) || 0,
      notes: form.notes || null,
      table_data: form.lines.map((r) => ({
        product: Number(r.code),
        qty: Number(r.qty),
        price: Number(r.price),
        godown: null,
        free: r.free,
      })),
    };

    if (editing) payload.mtmId = editing.mtmId;

    dispatch(
      (editing ? updateProductionPurchase : storeProductionPurchase)(payload, (response: any) => {
        setSaving(false);
        if (response?.success) {
          toast.success(
            editing
              ? `Purchase updated — ${editing.vrNo}`
              : `Purchase saved — ${response?.data?.data?.vr_no || ''}`.trim(),
          );
          resetForm();
        } else {
          toast.error(response?.message || 'Could not save the purchase');
        }
      }) as any,
    );
  };

  return (
    <div>
      <HelmetTitle title="Production Purchase" />

      <div className="mb-3 flex flex-wrap items-end gap-2 rounded border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-3 py-2">
        <InputElement
          id="productionPurchaseSearch"
          name="searchNo"
          label="Vr. No. (find a purchase to edit)"
          placeholder="e.g. 30-0001"
          value={searchNo}
          onChange={(e: any) => setSearchNo(e.target.value)}
          onKeyDown={(e: any) => {
            if (e.key === 'Enter') loadForEdit();
          }}
          className="w-full md:w-64"
        />
        <ButtonLoading
          onClick={() => loadForEdit()}
          buttonLoading={searching}
          label={searching ? 'Finding...' : 'Find'}
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiSearch className="text-lg " />}
        />
        {editing && (
          <>
            <span className="rounded bg-[rgb(var(--c-table-head))] px-2 py-1 text-xs font-semibold text-[rgb(var(--c-text))]">
              Editing {editing.vrNo}
            </span>
            <ButtonLoading
              onClick={() => {
                resetForm();
                toast.info('Back to a new purchase');
              }}
              buttonLoading={false}
              label="Cancel edit"
              className="whitespace-nowrap text-center mr-0 py-2"
              icon={<FiXCircle className="text-lg " />}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
        <div>
          <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Supplier</label>
          <DdlMultiline
            onSelect={handleSupplier}
            value={form.account ? { value: form.account, label: form.accountName } : null}
            acType={'3'}
          />
        </div>
        <InputDatePicker
          id="productionPurchaseDate"
          name="invoiceDate"
          label="Date"
          selectedDate={dateFromIso(form.invoiceDate)}
          setSelectedDate={(date) => setField('invoiceDate', isoFromDate(date))}
          setCurrentDate={() => undefined}
          className="w-full"
        />
        <InputElement
          id="productionPurchaseBillNo"
          name="invoiceNo"
          label="Bill No."
          placeholder="Supplier's bill, optional"
          value={form.invoiceNo}
          onChange={(e: any) => setField('invoiceNo', e.target.value)}
          className="w-full"
        />
        <InputElement
          id="productionPurchaseNotes"
          name="notes"
          label="Note"
          placeholder="Optional"
          value={form.notes}
          onChange={(e: any) => setField('notes', e.target.value)}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end mb-3">
        <div className="md:col-span-4">
          <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Product</label>
          <ProductDropdown
            id="productionPurchaseProduct"
            name="productionPurchaseProduct"
            onSelect={handleLineProduct}
            defaultValue={line.code ? { value: line.code, label: line.name } : null}
            value={line.code ? { value: line.code, label: line.name } : null}
          />
        </div>
        {/* ⚠️ The span classes go on a WRAPPER, never on InputElement's own
            className: that one lands on the <input>, where a grid span does
            nothing and the box comes out a finger wide. */}
        <div className="md:col-span-2">
          <InputElement
            id="productionPurchaseQty"
            name="qty"
            type="number"
            step="0.01"
            label={`Quantity ${line.unit ? `(${line.unit})` : ''}`}
            value={line.qty}
            onChange={(e: any) => setLine((p) => ({ ...p, qty: e.target.value }))}
            className="w-full"
          />
        </div>
        <div className="md:col-span-2">
          <InputElement
            id="productionPurchasePrice"
            name="price"
            type="number"
            step="0.01"
            label="Price"
            value={line.free ? '0' : line.price}
            onChange={(e: any) => setLine((p) => ({ ...p, price: e.target.value }))}
            disabled={line.free}
            className="w-full"
          />
        </div>
        <label className="md:col-span-2 mb-2 flex items-center gap-2 whitespace-nowrap text-sm text-[rgb(var(--c-text))]">
          <input
            type="checkbox"
            checked={line.free}
            onChange={(e) => setLine((p) => ({ ...p, free: e.target.checked, price: e.target.checked ? '0' : p.price }))}
          />
          ফ্রি (free)
        </label>
        <div className="md:col-span-2">
          <ButtonLoading
            onClick={editingLineId === null ? addLine : updateLine}
            buttonLoading={false}
            label={editingLineId === null ? 'Add Item' : 'Update Item'}
            className="whitespace-nowrap text-center mr-0 py-2"
            icon={editingLineId === null ? <FiPlus className="text-lg" /> : <FiEdit2 className="text-lg" />}
          />
        </div>
      </div>

      <div className="overflow-x-auto mb-3">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-[rgb(var(--c-table-head))] dark:text-gray-200">
            <tr>
              <th className="px-2 py-2 text-center">Sl</th>
              <th className="px-2 py-2">Product</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2 text-right">Price</th>
              <th className="px-2 py-2 text-right">Amount</th>
              <th className="px-2 py-2 text-center w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            {form.lines.map((row, index) => (
              <tr key={row.id} className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td className="px-2 py-2 text-center text-gray-900 dark:text-[rgb(var(--c-text))]">{index + 1}</td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {row.name}
                  {row.free && (
                    <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                      ফ্রি
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.qty))} {row.unit}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {row.free ? '0' : thousandSeparator(Number(row.price))}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {row.free ? '0' : thousandSeparator(Number(row.qty) * Number(row.price))}
                </td>
                <td className="px-2 py-2 text-center text-gray-900 dark:text-[rgb(var(--c-text))]">
                  <Button onClick={() => deleteLine(row.id)} className="text-red-500 ml-2 text-center">
                    <FiTrash2 className="cursor-pointer text-center" />
                  </Button>
                  <Button onClick={() => editLine(row.id)} className="text-green-500 ml-2 text-center">
                    <FiEdit2 className="cursor-pointer text-center" />
                  </Button>
                </td>
              </tr>
            ))}
            {form.lines.length === 0 && (
              <tr className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td colSpan={6} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
                  No item added
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <InputElement
          id="productionPurchaseDiscount"
          name="discountAmt"
          type="number"
          step="0.01"
          label="Discount"
          value={form.discountAmt}
          onChange={(e: any) => setField('discountAmt', e.target.value)}
          className="w-full"
        />
        <InputElement
          id="productionPurchasePaid"
          name="paidAmt"
          type="number"
          step="0.01"
          label={`Paid (net ${net.toFixed(2)})`}
          value={paid}
          onChange={(e: any) => setField('paidAmt', e.target.value)}
          disabled={isCashSupplier}
          className="w-full"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <ButtonLoading
          onClick={save}
          buttonLoading={saving}
          label={saving ? 'Saving...' : editing ? 'Update' : 'Save'}
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiSave className="text-lg" />}
        />
        <ButtonLoading
          onClick={resetForm}
          buttonLoading={false}
          label="Reset"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiRefreshCcw className="text-lg" />}
        />
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        ফ্রি মাল নিজের সারিতে, দাম ০ — সরবরাহকারী যে মাল বিনামূল্যে দিয়েছেন, সেটি আলাদা সারিতে টিক দিয়ে লিখুন। ফ্রি
        সারির মালও স্টকে ঢোকে (দাম ০-এর স্তরে), তাই স্টকের পরিমাণ ঠিক থাকে; মোট স্টক মূল্যও ঠিক থাকে।
      </p>
    </div>
  );
};

export default ProductionPurchase;
