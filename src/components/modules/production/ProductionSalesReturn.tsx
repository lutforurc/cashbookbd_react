import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiEdit2, FiPlus, FiRefreshCcw, FiSave, FiSearch, FiTrash2, FiXCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { FIELD_LABEL } from '../../../theme/fieldStyles';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import DdlMultiline from '../../utils/utils-functions/DdlMultiline';
import ProductDropdown from '../../utils/utils-functions/ProductDropdown';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import {
  getProductionSalesReturnForEdit,
  storeProductionSalesReturn,
  updateProductionSalesReturn,
} from './productionSlice';
import { branchTodayIso } from './branchDate';

type Option = { value: string; label: string; label_3?: string; label_5?: string };

type ReturnLine = {
  id: number;
  code: string;
  name: string;
  unit: string;
  qty: string;
  price: string;
};

const emptyLine = { code: '', name: '', unit: '', qty: '', price: '' };

// The shared picker works in Date objects; the form and the API keep ISO,
// parsed in local time so the day never shifts.
const dateFromIso = (value: string | null | undefined): Date | null => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};

const isoFromDate = (date: Date | null): string =>
  date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';

/**
 * A sales return raised against a Production branch's sale.
 *
 * ⚠️ THE ORIGINAL SALE INVOICE IS REQUIRED. The returned goods go back into
 * stock at what they cost when they were sold (owner's decision #13), and that
 * cost is read from the named invoice's own FIFO layers -- not from the price
 * being refunded, which is what the ordinary Sales Return does (doc গ-৪). The
 * ledger rows are the ordinary return's, to the head.
 */
const ProductionSalesReturn = () => {
  const dispatch = useDispatch<any>();
  const trxDt = useSelector((s: any) => s.settings?.data?.trx_dt);
  const today = () => branchTodayIso(trxDt);

  const [form, setForm] = useState({
    account: '',
    accountName: '',
    invoiceNo: '',
    invoiceDate: today(),
    discountAmt: '',
    receivedAmt: '',
    notes: '',
    products: [] as ReturnLine[],
  });
  const [line, setLine] = useState({ ...emptyLine });
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  // The voucher being corrected, found by its Vr. No. Null means this screen is
  // writing a new return.
  const [searchNo, setSearchNo] = useState('');
  const [searching, setSearching] = useState(false);
  const [editing, setEditing] = useState<{ mtmId: string; vrNo: string } | null>(null);

  const setField = (name: string, value: any) => setForm((p) => ({ ...p, [name]: value }));

  const total = form.products.reduce((sum, r) => sum + Number(r.qty) * Number(r.price), 0);
  const refundTotal = Math.max(0, total - (Number(form.discountAmt) || 0));

  // "Cash Payment" is the cash actually handed back, and it is what the server
  // reads as netpayment -- as on the ordinary Sales Return. The cash customer
  // (account 17) is paid the whole refund and the box is locked; any other
  // customer starts at 0 (the return only reduces what they owe) and may be
  // paid part or all of it in cash.
  const isCashCustomer = Number(form.account) === 17;
  const cashPayment = isCashCustomer ? refundTotal.toFixed(2) : form.receivedAmt;

  const handleCustomer = (option: any) =>
    setForm((p) => ({ ...p, account: option?.value || '', accountName: option?.label || '', receivedAmt: '0' }));

  const handleLineProduct = (option: Option | null) =>
    setLine((p) => ({ ...p, code: option?.value || '', name: option?.label || '', unit: option?.label_5 || '' }));

  const addLine = () => {
    if (!line.code) return toast.error('Pick a product');
    if (!line.qty || Number(line.qty) <= 0) return toast.error('Enter a quantity');
    if (line.price === '' || Number(line.price) < 0) return toast.error('Enter the refund price');
    setForm((p) => ({
      ...p,
      products: [
        ...p.products,
        { id: Date.now(), code: line.code, name: line.name, unit: line.unit, qty: line.qty, price: line.price },
      ],
    }));
    setLine({ ...emptyLine });
    setEditingLineId(null);
  };

  const editLine = (id: number) => {
    const found = form.products.find((r) => r.id === id);
    if (!found) return;
    setLine({ code: found.code, name: found.name, unit: found.unit, qty: found.qty, price: found.price });
    setEditingLineId(id);
  };

  const updateLine = () => {
    if (editingLineId === null) return;
    setForm((p) => ({
      ...p,
      products: p.products.map((r) =>
        r.id === editingLineId ? { ...r, code: line.code, name: line.name, unit: line.unit, qty: line.qty, price: line.price } : r,
      ),
    }));
    setLine({ ...emptyLine });
    setEditingLineId(null);
  };

  const deleteLine = (id: number) => {
    setForm((p) => ({ ...p, products: p.products.filter((r) => r.id !== id) }));
    if (editingLineId === id) {
      setLine({ ...emptyLine });
      setEditingLineId(null);
    }
  };

  const resetForm = () => {
    setForm({
      account: '',
      accountName: '',
      invoiceNo: '',
      invoiceDate: today(),
      discountAmt: '',
      receivedAmt: '',
      notes: '',
      products: [],
    });
    setLine({ ...emptyLine });
    setEditingLineId(null);
    setEditing(null);
    setSearchNo('');
  };

  // Find a posted return by its Vr. No. and fill the form from it. The server
  // answers by voucher_type, by name, so a number from another type is simply
  // not found rather than read as a sale return.
  const loadForEdit = () => {
    const invoiceNo = searchNo.trim();
    if (!invoiceNo) return toast.error('Enter the Vr. No. of the return');

    setSearching(true);
    dispatch(
      getProductionSalesReturnForEdit(invoiceNo, (response: any) => {
        setSearching(false);
        if (!response?.success) return toast.error(response?.message || 'Could not load the return');

        const found = response?.data?.data;
        if (!found?.mtmId) return toast.error(response?.message || 'Production sales return not found');

        const products: ReturnLine[] = (found.products || []).map((r: any) => ({
          id: Number(r.id),
          code: String(r.product),
          name: r.product_name || '',
          unit: r.unit || '',
          qty: String(Number(r.qty)),
          price: String(Number(r.price)),
        }));

        setForm({
          account: String(found.account ?? ''),
          accountName: found.accountName || '',
          invoiceNo: found.invoice_no || '',
          // The server sends the original sale's own date when the stored one is
          // empty, so this never silently becomes today.
          invoiceDate: found.invoice_date ? String(found.invoice_date).slice(0, 10) : today(),
          discountAmt: Number(found.discount) > 0 ? String(Number(found.discount)) : '',
          // The real cash paid, not the refund total. A reloaded credit return
          // with a part refund must show that part.
          receivedAmt: String(Number(found.cash_payment ?? found.netpayment ?? 0)),
          notes: found.notes || '',
          products,
        });
        setLine({ ...emptyLine });
        setEditingLineId(null);
        setEditing({ mtmId: String(found.mtmId), vrNo: found.vr_no || invoiceNo });
        toast.success(`Editing ${found.vr_no || invoiceNo}`);
      }) as any,
    );
  };

  const cancelEdit = () => {
    resetForm();
    toast.info('Back to a new return');
  };

  const save = () => {
    if (!form.account) return toast.error('Select the customer');
    if (!form.invoiceNo) return toast.error('The original sale invoice is required -- the cost is read from it');
    if (!form.products.length) return toast.error('Add at least one returned item');
    if (cashPayment === '' || Number(cashPayment) < 0) return toast.error('Enter the cash payment (0 if none)');
    if (Number(cashPayment) > refundTotal) return toast.error('The cash payment cannot be more than the refund');

    setSaving(true);
    const payload: any = {
      supplier_id: form.account,
      sales_invoice_number: form.invoiceNo,
      sales_invoice_date: form.invoiceDate,
      total,
      discount: Number(form.discountAmt) || 0,
      netpayment: Number(cashPayment) || 0,
      notes: form.notes || null,
      table_data: form.products.map((r) => ({
        code: Number(r.code),
        qty: Number(r.qty),
        price: Number(r.price),
      })),
    };

    // The edit endpoint corrects the voucher under its own number; the number
    // is what the server hashes into `mtmId`, so it must travel back unchanged.
    if (editing) payload.mtmId = editing.mtmId;

    const action = editing
      ? updateProductionSalesReturn(payload, (response: any) => {
          setSaving(false);
          if (response?.success) {
            toast.success(`Return updated — ${editing.vrNo}`.trim());
            resetForm();
          } else {
            toast.error(response?.message || 'Could not update the return');
          }
        })
      : storeProductionSalesReturn(payload, (response: any) => {
          setSaving(false);
          if (response?.success) {
            toast.success(`Return saved — ${response?.data?.data?.vr_no || ''}`.trim());
            resetForm();
          } else {
            toast.error(response?.message || 'Could not save the return');
          }
        });

    dispatch(action as any);
  };

  return (
    <div>
      <HelmetTitle title="Production Sales Return" />

      {/* Correct an existing return under its own number. The server looks it up
          by voucher_type (by name), so a number from another kind is refused. */}
      <div className="mb-3 flex flex-wrap items-end gap-2 rounded border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-3 py-2">
        <InputElement
          id="productionReturnSearch"
          name="searchNo"
          label="Vr. No. (find a return to edit)"
          placeholder="e.g. 28-0001"
          value={searchNo}
          onChange={(e: any) => setSearchNo(e.target.value)}
          onKeyDown={(e: any) => {
            if (e.key === 'Enter') loadForEdit();
          }}
          className="w-full md:w-64"
        />
        <ButtonLoading
          onClick={loadForEdit}
          buttonLoading={searching}
          label={searching ? 'Finding...' : 'Find'}
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiSearch className="text-lg ml-2 mr-2" />}
        />
        {editing && (
          <>
            <span className="rounded bg-[rgb(var(--c-table-head))] px-2 py-1 text-xs font-semibold text-[rgb(var(--c-text))]">
              Editing {editing.vrNo}
            </span>
            <ButtonLoading
              onClick={cancelEdit}
              buttonLoading={false}
              label="Cancel edit"
              className="whitespace-nowrap text-center mr-0 py-2"
              icon={<FiXCircle className="text-lg ml-2 mr-2" />}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <div>
          <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Customer</label>
          <DdlMultiline
            onSelect={handleCustomer}
            value={form.account ? { value: form.account, label: form.accountName } : null}
            acType={'3'}
          />
        </div>
        <InputElement
          id="productionReturnInvoiceNo"
          name="invoiceNo"
          label="Original Sale Invoice No."
          placeholder="The sale the goods came back from"
          value={form.invoiceNo}
          onChange={(e: any) => setField('invoiceNo', e.target.value)}
          className="w-full"
        />
        <InputDatePicker
          id="productionReturnInvoiceDate"
          name="invoiceDate"
          label="Original Sale Date"
          selectedDate={dateFromIso(form.invoiceDate)}
          setSelectedDate={(date) => setField('invoiceDate', isoFromDate(date))}
          setCurrentDate={() => undefined}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end mb-3">
        <div className="md:col-span-5">
          <label className={FIELD_LABEL}>Returned product</label>
          <ProductDropdown
            id="returnProduct"
            name="returnProduct"
            onSelect={handleLineProduct}
            defaultValue={line.code ? { value: line.code, label: line.name } : null}
            value={line.code ? { value: line.code, label: line.name } : null}
          />
        </div>
        {/* ⚠️ The span classes go on a WRAPPER, never on InputElement's own
            className: that one lands on the <input>, where a grid span does
            nothing and the box comes out a finger wide. */}
        <div className="md:col-span-3">
          <InputElement
            id="returnQty"
            name="returnQty"
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
            id="returnPrice"
            name="returnPrice"
            type="number"
            step="0.01"
            label="Refund price"
            value={line.price}
            onChange={(e: any) => setLine((p) => ({ ...p, price: e.target.value }))}
            className="w-full"
          />
        </div>
        <div className="md:col-span-2">
          <ButtonLoading
            onClick={editingLineId === null ? addLine : updateLine}
            buttonLoading={false}
            label={editingLineId === null ? 'Add Item' : 'Update Item'}
            className="whitespace-nowrap text-center mr-0 py-2"
            icon={
              editingLineId === null ? (
                <FiPlus className="text-lg ml-2 mr-2" />
              ) : (
                <FiEdit2 className="text-lg ml-2 mr-2" />
              )
            }
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
              <th className="px-2 py-2 text-right">Refund price</th>
              <th className="px-2 py-2 text-right">Amount</th>
              <th className="px-2 py-2 text-center w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            {form.products.map((row, index) => (
              <tr key={row.id} className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td className="px-2 py-2 text-center text-gray-900 dark:text-[rgb(var(--c-text))]">{index + 1}</td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {row.name}
                  {/* Price 0 IS the free row -- the server reads it the same
                      way (return_price = 0), so no extra flag is carried. */}
                  {Number(row.price) === 0 && (
                    <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                      ফ্রি
                    </span>
                  )}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.qty))} {row.unit}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.price))}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.qty) * Number(row.price))}
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
            {form.products.length === 0 && (
              <tr className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td colSpan={6} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
                  No item added
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
        <InputElement
          id="returnDiscount"
          name="discountAmt"
          type="number"
          step="0.01"
          label="Discount"
          value={form.discountAmt}
          onChange={(e: any) => setField('discountAmt', e.target.value)}
          className="w-full"
        />
        <InputElement
          id="returnReceived"
          name="receivedAmt"
          type="number"
          step="0.01"
          label={`Cash Payment (refund ${refundTotal.toFixed(2)})`}
          value={cashPayment}
          onChange={(e: any) => setField('receivedAmt', e.target.value)}
          disabled={isCashCustomer}
          className="w-full"
        />
        <div className="md:col-span-2">
          <InputElement
            id="returnNotes"
            name="notes"
            label="Note"
            placeholder="Optional"
            value={form.notes}
            onChange={(e: any) => setField('notes', e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <ButtonLoading
          onClick={save}
          buttonLoading={saving}
          label={saving ? 'Saving...' : editing ? 'Update Return' : 'Save Return'}
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiSave className="text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={resetForm}
          buttonLoading={false}
          label="Reset"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
        />
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        The refund is on the paid quantity. The returned goods re-enter stock at the original sale's FIFO
        cost, so the profit the sale showed is not inflated by the return. A free row (price 0) comes back
        with the paid quantity it was earned on -- the server works out how many, and the last return
        settles what is left over.
      </p>
    </div>
  );
};

export default ProductionSalesReturn;
