import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { FiEdit2, FiRefreshCcw, FiSave, FiSlash } from 'react-icons/fi';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { FIELD_LABEL } from '../../../theme/fieldStyles';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import ProductDropdown from '../../utils/utils-functions/ProductDropdown';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import {
  destroyProductionScheme,
  getProductionSchemes,
  storeProductionScheme,
  updateProductionScheme,
} from './productionSlice';

type Pick = { value: string; label: string };

const dateFromIso = (value: string): Date | null => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};

const isoFromDate = (date: Date | null): string =>
  date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` : '';

const emptyForm = {
  id: 0,
  name: '',
  product: '',
  productName: '',
  freeProduct: '',
  freeProductName: '',
  sameProduct: true,
  threshold: '',
  freeQty: '',
  repeatable: false,
  from: '',
  to: '',
  note: '',
};

/**
 * Scheme — the rule that grants free goods on a Production Sales form
 * (v4 খ-৯). "Buy 100, get 2" is a row here; the sales form asks it what a line
 * earns and adds that free row itself.
 *
 * ⚠️ RETIRE, NEVER DELETE. Invoices already written point at the scheme row
 * (production_free_lines.scheme_id), so a retired rule keeps answering for the
 * bills it made and simply stops matching new ones.
 */
const ProductionScheme = () => {
  const dispatch = useDispatch<any>();

  const [form, setForm] = useState({ ...emptyForm });
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const setField = (name: string, value: any) => setForm((p) => ({ ...p, [name]: value }));

  const load = () => {
    setLoading(true);
    dispatch(
      getProductionSchemes({}, (response: any) => {
        setLoading(false);
        if (!response?.success) return toast.error(response?.message || 'Could not load the schemes');
        const data = response?.data?.data;
        setRows(Array.isArray(data) ? data : []);
      }) as any,
    );
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProduct = (field: 'product' | 'productName', option: any) =>
    setForm((p) => ({
      ...p,
      product: option?.value || '',
      productName: option?.label || '',
      // The free product starts as the same one; picking a paid product never
      // silently overwrites a different free product already chosen.
      freeProduct: field === 'product' && p.sameProduct ? option?.value || '' : p.freeProduct,
      freeProductName: field === 'product' && p.sameProduct ? option?.label || '' : p.freeProductName,
    }));

  const resetForm = () => setForm({ ...emptyForm });

  const editRow = (row: any) => {
    setForm({
      id: Number(row.id),
      name: row.name || '',
      product: String(row.product_id),
      productName: row.product_name || '',
      freeProduct: row.free_product_id ? String(row.free_product_id) : String(row.product_id),
      freeProductName: row.free_product_name || row.product_name || '',
      sameProduct: !row.free_product_id,
      threshold: String(Number(row.threshold_qty)),
      freeQty: String(Number(row.free_qty)),
      repeatable: Number(row.repeatable) === 1,
      from: row.from_date ? String(row.from_date).slice(0, 10) : '',
      to: row.to_date ? String(row.to_date).slice(0, 10) : '',
      note: row.note || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = () => {
    if (!form.name.trim()) return toast.error('Give the scheme a name');
    if (!form.product) return toast.error('Pick the product the scheme is on');
    if (!(Number(form.threshold) > 0) || !(Number(form.freeQty) > 0)) {
      return toast.error('The threshold and the free quantity must both be above 0');
    }

    const payload: any = {
      name: form.name.trim(),
      product_id: Number(form.product),
      free_product_id: form.sameProduct || !form.freeProduct ? null : Number(form.freeProduct),
      threshold_qty: Number(form.threshold),
      free_qty: Number(form.freeQty),
      repeatable: form.repeatable ? 1 : 0,
      from_date: form.from || null,
      to_date: form.to || null,
      note: form.note || null,
    };

    if (form.id) payload.id = form.id;

    setSaving(true);
    dispatch(
      (form.id ? updateProductionScheme : storeProductionScheme)(payload, (response: any) => {
        setSaving(false);
        if (!response?.success) return toast.error(response?.message || 'Could not save the scheme');
        toast.success(response?.message || 'Scheme saved');
        resetForm();
        load();
      }) as any,
    );
  };

  const retire = (row: any) => {
    if (!window.confirm(`Retire "${row.name}"? The bills it already made keep it; it stops matching new sales.`)) return;

    dispatch(
      destroyProductionScheme({ id: row.id }, (response: any) => {
        if (!response?.success) return toast.error(response?.message || 'Could not retire the scheme');
        toast.success('Scheme retired');
        load();
      }) as any,
    );
  };

  return (
    <div>
      <HelmetTitle title="Scheme" />

      {/* ⚠️ A field's span lives on a wrapper, never on InputElement's own
          className -- that one lands on the <input> and a grid span there does
          nothing, which left the quantity boxes a finger wide. */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end mb-3">
        <div className="md:col-span-4">
          <InputElement
            id="schemeName"
            name="name"
            label="Scheme name"
            placeholder="e.g. Buy 100 get 2"
            value={form.name}
            onChange={(e: any) => setField('name', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="md:col-span-4">
          <label className={FIELD_LABEL}>Product</label>
          <ProductDropdown
            id="schemeProduct"
            name="schemeProduct"
            onSelect={(option: any) => handleProduct('product', option)}
            defaultValue={form.product ? { value: form.product, label: form.productName } : null}
            value={form.product ? { value: form.product, label: form.productName } : null}
          />
        </div>
        <div className="md:col-span-4">
          <label className={FIELD_LABEL}>Free item</label>

          {form.sameProduct ? (
            <InputElement
              id="schemeFreeProductSame"
              name="schemeFreeProductSame"
              placeholder="Same as the product"
              value={form.productName}
              onChange={() => undefined}
              disabled
              className="w-full"
            />
          ) : (
            <ProductDropdown
              id="schemeFreeProduct"
              name="schemeFreeProduct"
              onSelect={(option: any) =>
                setForm((p) => ({
                  ...p,
                  freeProduct: option?.value || '',
                  freeProductName: option?.label || '',
                }))
              }
              defaultValue={form.freeProduct ? { value: form.freeProduct, label: form.freeProductName } : null}
              value={form.freeProduct ? { value: form.freeProduct, label: form.freeProductName } : null}
            />
          )}

          <label className="mt-1 flex items-center gap-2 whitespace-nowrap text-xs text-[rgb(var(--c-text))]">
            <input
              type="checkbox"
              checked={form.sameProduct}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  sameProduct: e.target.checked,
                  freeProduct: e.target.checked ? p.product : p.freeProduct,
                  freeProductName: e.target.checked ? p.productName : p.freeProductName,
                }))
              }
            />
            Same as the product above
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end mb-3">
        <div className="md:col-span-2">
          <InputElement
            id="schemeThreshold"
            name="threshold"
            type="number"
            step="0.01"
            label="Buy quantity"
            value={form.threshold}
            onChange={(e: any) => setField('threshold', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="md:col-span-2">
          <InputElement
            id="schemeFreeQty"
            name="freeQty"
            type="number"
            step="0.01"
            label="Free quantity"
            value={form.freeQty}
            onChange={(e: any) => setField('freeQty', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="md:col-span-2">
          <InputDatePicker
            id="schemeFrom"
            name="from"
            label="From"
            selectedDate={dateFromIso(form.from)}
            setSelectedDate={(date) => setField('from', isoFromDate(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>
        <div className="md:col-span-2">
          <InputDatePicker
            id="schemeTo"
            name="to"
            label="To"
            selectedDate={dateFromIso(form.to)}
            setSelectedDate={(date) => setField('to', isoFromDate(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>
        <div className="md:col-span-4">
          <InputElement
            id="schemeNote"
            name="note"
            label="Note"
            placeholder="Optional"
            value={form.note}
            onChange={(e: any) => setField('note', e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 whitespace-nowrap text-sm text-[rgb(var(--c-text))]">
          <input
            type="checkbox"
            checked={form.repeatable}
            onChange={(e) => setField('repeatable', e.target.checked)}
          />
          Repeat (every {form.threshold || '—'} buys {form.freeQty || '—'} more)
        </label>
        <ButtonLoading
          onClick={save}
          buttonLoading={saving}
          label={saving ? 'Saving...' : form.id ? 'Update' : 'Save'}
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
        <span className="text-xs text-gray-500 dark:text-gray-400">
          From and To left empty: the scheme runs until it is retired.
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-[rgb(var(--c-table-head))] dark:text-gray-200">
            <tr>
              <th className="px-2 py-2">Name</th>
              <th className="px-2 py-2">Product</th>
              <th className="px-2 py-2 text-right">Buy</th>
              <th className="px-2 py-2 text-right">Free</th>
              <th className="px-2 py-2">Free item</th>
              <th className="px-2 py-2">Dates</th>
              <th className="px-2 py-2 text-center">Repeat</th>
              <th className="px-2 py-2 text-center">Status</th>
              <th className="px-2 py-2 text-center w-28">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">{row.name}</td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {row.product_name || ''} {row.product_code ? `(${row.product_code})` : ''}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.threshold_qty))}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.free_qty))}
                </td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {row.free_product_name || row.product_name || ''}
                </td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {String(row.from_date || '').slice(0, 10) || '-'} → {String(row.to_date || '').slice(0, 10) || '-'}
                </td>
                <td className="px-2 py-2 text-center text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {Number(row.repeatable) === 1 ? 'Yes' : 'No'}
                </td>
                <td className="px-2 py-2 text-center">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      row.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-2 py-2 text-center">
                  <Button onClick={() => editRow(row)} className="text-green-500 ml-2 text-center">
                    <FiEdit2 className="cursor-pointer text-center" />
                  </Button>
                  {row.status === 'active' && (
                    <Button onClick={() => retire(row)} className="text-red-500 ml-2 text-center" title="Retire">
                      <FiSlash className="cursor-pointer text-center" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td colSpan={9} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
                  {loading ? 'Loading...' : 'No scheme yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductionScheme;
