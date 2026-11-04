import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { FiEdit2, FiPlus, FiRefreshCcw, FiSave, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import DdlMultiline from '../../utils/utils-functions/DdlMultiline';
import RequisitionItemsDropdown from '../../utils/utils-functions/RequisitionItemsDropdown';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { storeProductionSalesReturn } from './productionSlice';

type Option = { value: string; label: string; label_3?: string };

type ReturnLine = {
  id: number;
  code: string;
  name: string;
  unit: string;
  qty: string;
  price: string;
};

const emptyLine = { code: '', name: '', unit: '', qty: '', price: '' };

const today = () => new Date().toISOString().slice(0, 10);

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

  const setField = (name: string, value: any) => setForm((p) => ({ ...p, [name]: value }));

  const total = form.products.reduce((sum, r) => sum + Number(r.qty) * Number(r.price), 0);
  const netpayment = Math.max(0, total - (Number(form.discountAmt) || 0));

  const handleCustomer = (option: any) =>
    setForm((p) => ({ ...p, account: option?.value || '', accountName: option?.label || '' }));

  const handleLineProduct = (option: Option | null) =>
    setLine((p) => ({ ...p, code: option?.value || '', name: option?.label || '', unit: option?.label_3 || '' }));

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

  const resetForm = () =>
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

  const save = () => {
    if (!form.account) return toast.error('Select the customer');
    if (!form.invoiceNo) return toast.error('The original sale invoice is required -- the cost is read from it');
    if (!form.products.length) return toast.error('Add at least one returned item');

    setSaving(true);
    const payload = {
      supplier_id: form.account,
      sales_invoice_number: form.invoiceNo,
      sales_invoice_date: form.invoiceDate,
      total,
      discount: Number(form.discountAmt) || 0,
      netpayment,
      notes: form.notes || null,
      table_data: form.products.map((r) => ({
        code: Number(r.code),
        qty: Number(r.qty),
        price: Number(r.price),
      })),
    };

    dispatch(
      storeProductionSalesReturn(payload, (response: any) => {
        setSaving(false);
        if (response?.success) {
          toast.success(`Return saved — ${response?.data?.data?.vr_no || ''}`.trim());
          resetForm();
        } else {
          toast.error(response?.message || 'Could not save the return');
        }
      }) as any,
    );
  };

  return (
    <div>
      <HelmetTitle title="Production Sales Return" />

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
        <InputElement
          id="productionReturnInvoiceDate"
          name="invoiceDate"
          type="date"
          label="Original Sale Date"
          value={form.invoiceDate}
          onChange={(e: any) => setField('invoiceDate', e.target.value)}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end mb-3">
        <div className="md:col-span-5">
          <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Returned product</label>
          <RequisitionItemsDropdown
            id="returnProduct"
            name="returnProduct"
            onSelect={handleLineProduct}
            defaultValue={line.code ? { value: line.code, label: line.name } : null}
            value={line.code ? { value: line.code, label: line.name } : null}
          />
        </div>
        <InputElement
          id="returnQty"
          name="returnQty"
          type="number"
          step="0.01"
          label={`Quantity ${line.unit ? `(${line.unit})` : ''}`}
          value={line.qty}
          onChange={(e: any) => setLine((p) => ({ ...p, qty: e.target.value }))}
          className="w-full md:col-span-3"
        />
        <InputElement
          id="returnPrice"
          name="returnPrice"
          type="number"
          step="0.01"
          label="Refund price"
          value={line.price}
          onChange={(e: any) => setLine((p) => ({ ...p, price: e.target.value }))}
          className="w-full md:col-span-2"
        />
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
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">{row.name}</td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.qty), 2)} {row.unit}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.price), 2)}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.qty) * Number(row.price), 2)}
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
          label="Refund (paid quantity only)"
          value={netpayment.toFixed(2)}
          onChange={() => undefined}
          disabled
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
          label={saving ? 'Saving...' : 'Save Return'}
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
        cost, so the profit the sale showed is not inflated by the return. The free-goods row comes in a
        later phase.
      </p>
    </div>
  );
};

export default ProductionSalesReturn;
