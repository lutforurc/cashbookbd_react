import React, { useEffect, useRef, useState } from 'react';
import { FIELD_FILE_BUTTON, FIELD_SELECT } from '../../../theme/fieldStyles';
import { useDispatch, useSelector } from 'react-redux';
import { FiEdit2, FiPlus, FiRefreshCcw, FiSave, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import RequisitionItemsDropdown from '../../utils/utils-functions/RequisitionItemsDropdown';
import DdlMultiline from '../../utils/utils-functions/DdlMultiline';
import WarehouseDropdown from '../../utils/utils-functions/WarehouseDropdown';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import httpService from '../../services/httpService';
import { API_IMAGE_UPLOAD_URL, API_PRODUCT_OUT_PARTY_URL } from '../../services/apiRoutes';
import { Select } from '../../utils/fields/FormControls';
import { getDdlWarehouse } from '../warehouse/ddlWarehouseSlider';
import {
  getProductOutDetails,
  getProductOutReasons,
  resolveReasonId,
  storeProductOut,
  updateProductOut,
} from './productOutSlice';
import ProductOutList from './ProductOutList';
import StockShortageModal, { StockShortage } from '../../utils/components/StockShortageModal';

type Option = { value: string; label: string; label_2?: string; label_3?: string };

type OutItem = {
  id: number;
  productId: string;
  productName: string;
  unit: string;
  quantity: string;
  note: string;
};

const emptyLine = { productId: '', productName: '', unit: '', quantity: '', note: '' };

/**
 * Write off stock that left outside a purchase or a sale.
 *
 * Saving takes the stock off the shelf (owner, 2026-10-15); approval is a
 * separate sign-off in the Approval Center and no longer moves stock.
 *
 * No Date field: the slip is always dated on the branch's transaction date,
 * which the server reads itself (owner, 2026-10-16).
 */
const ProductOut = () => {
  const dispatch = useDispatch<any>();
  const productOut = useSelector((s: any) => s.productOut);
  const warehouseState = useSelector((s: any) => s.activeWarehouse);
  const warehouseOptions = Array.isArray(warehouseState?.data) ? warehouseState.data : [];
  const reasons: any[] = Array.isArray(productOut?.reasons) ? productOut.reasons : [];

  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  // The shortage the server came back with, waiting on the clerk's answer.
  const [stockWarning, setStockWarning] = useState<StockShortage | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [isUpdatingLine, setIsUpdatingLine] = useState(false);
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [lineItem, setLineItem] = useState({ ...emptyLine });
  const [party, setParty] = useState<Option | null>(null);
  const [formData, setFormData] = useState({
    warehouseId: '',
    reasonId: '',
    note: '',
    items: [] as OutItem[],
  });
  // The saved slip open in the form for changing; null for a new one.
  const [editing, setEditing] = useState<{ id: number; outNo: string } | null>(null);
  // Photos of the damage, uploaded to the slip's voucher after it saves.
  const [photos, setPhotos] = useState<File[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  /**
   * Attach the chosen photos to the slip's voucher, through the same endpoint
   * the Image Upload screen uses. Resolves either way: the slip is already
   * saved, so a failed upload is reported, never thrown.
   */
  const uploadPhotos = async (mainTrxId: number) => {
    if (!photos.length || !mainTrxId) return;

    const data = new FormData();
    photos.forEach((file) => data.append('images[]', file));
    data.append('voucher_id', String(mainTrxId));

    try {
      const res: any = await httpService.post(`${API_IMAGE_UPLOAD_URL}${mainTrxId}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res?.data?.success) {
        toast.success(`${photos.length} photo(s) attached`);
      } else {
        toast.error(res?.data?.message || 'The photos could not be attached');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'The photos could not be attached');
    }
  };

  useEffect(() => {
    dispatch(getDdlWarehouse());
    dispatch(getProductOutReasons());
  }, [dispatch]);

  /**
   * Open a saved slip in the form. Everything the save sends is filled back from
   * the slip's own details, so Update sends exactly what the clerk sees.
   */
  const handleEditSlip = (id: number) => {
    dispatch(
      getProductOutDetails(id, (response: any) => {
        if (!response?.success) {
          toast.error(response?.message || 'Could not open the write-off');
          return;
        }

        const master = response.data?.master ?? {};
        const details: any[] = Array.isArray(response.data?.details) ? response.data.details : [];

        if (master.is_approved) {
          toast.error(`${master.out_no} is approved. Take the approval off first, then change it.`);
          return;
        }

        setFormData({
          warehouseId: master.warehouse_id ? String(master.warehouse_id) : '',
          reasonId: master.reason_id ? String(master.reason_id) : '',
          note: master.note || '',
          items: details.map((line, index) => ({
            id: Date.now() + index,
            productId: String(line.product_id),
            productName: line.product_name || '',
            unit: line.unit_name || '',
            quantity: String(Number(line.quantity)),
            note: line.note || '',
          })),
        });
        setParty(master.party_id ? { value: String(master.party_id), label: master.party_name || '' } : null);
        clearLineForm();
        setEditing({ id: Number(master.id), outNo: master.out_no || '' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }),
    );
  };

  // Open a new slip on the shop's own default reason, so the Reason field is
  // never blank. It only fills an empty field -- a reason already chosen (an
  // existing slip, or one the clerk picked) is left exactly as it is.
  useEffect(() => {
    setFormData((prev) => {
      const next = resolveReasonId(prev.reasonId, reasons);
      return next === prev.reasonId ? prev : { ...prev, reasonId: next };
    });
  }, [reasons]);

  // The reason itself says whether a name is owed -- a piece swapped back to a
  // customer has somebody at the other end of it, a breakage does not. Read off
  // the chosen row so a reason the shop adds later behaves without a code
  // change.
  const selectedReason = reasons.find((r) => String(r.id) === String(formData.reasonId));
  const needsParty = Boolean(selectedReason?.needs_party);

  // Party lookup for the reasons that ask for one. Same shape as the hotel's
  // picker: type to search, answers cust_party_infos.id.
  const findParties = async (typed: string): Promise<Option[]> => {
    const res: any = await httpService.get(API_PRODUCT_OUT_PARTY_URL, { params: { q: typed } });
    const root = res?.data?.data?.data ?? res?.data?.data ?? [];
    const rows = Array.isArray(root) ? root : [];

    return rows.map((row: any) => ({
      value: String(row.id),
      label: row.name,
      label_2: row.mobile || '',
      label_3: row.idfr_code || '',
    }));
  };

  const handleFormInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLineItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLineItem((prev) => ({ ...prev, [name]: value }));
  };

  const handleProductSelect = (option: Option | null) => {
    if (!option) {
      setLineItem((prev) => ({ ...prev, productId: '', productName: '', unit: '' }));
      return;
    }
    setLineItem((prev) => ({
      ...prev,
      productId: option.value || '',
      productName: option.label || '',
      unit: option.label_3 || '',
    }));
  };

  const clearLineForm = () => {
    setLineItem({ ...emptyLine });
    setIsUpdatingLine(false);
    setEditingLineId(null);
  };

  const resetForm = () => {
    setFormData({
      warehouseId: '',
      reasonId: resolveReasonId('', reasons),
      note: '',
      items: [],
    });
    setParty(null);
    clearLineForm();
    setEditing(null);
    setPhotos([]);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const validateLineItem = () => {
    if (!lineItem.productId) {
      toast.error('Please select product');
      return false;
    }
    if (!lineItem.quantity || Number(lineItem.quantity) <= 0) {
      toast.error('Please enter valid quantity');
      return false;
    }
    return true;
  };

  const handleAddProduct = () => {
    if (!validateLineItem()) return;
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: Date.now(),
          productId: lineItem.productId,
          productName: lineItem.productName,
          unit: lineItem.unit,
          quantity: lineItem.quantity,
          note: lineItem.note,
        },
      ],
    }));
    clearLineForm();
  };

  const handleEditProduct = (lineId: number) => {
    const found = formData.items.find((item) => item.id === lineId);
    if (!found) return;
    setLineItem({
      productId: found.productId,
      productName: found.productName,
      unit: found.unit,
      quantity: found.quantity,
      note: found.note,
    });
    setIsUpdatingLine(true);
    setEditingLineId(lineId);
  };

  const handleUpdateProduct = () => {
    if (!validateLineItem() || editingLineId === null) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === editingLineId
          ? {
              ...item,
              productId: lineItem.productId,
              productName: lineItem.productName,
              unit: lineItem.unit,
              quantity: lineItem.quantity,
              note: lineItem.note,
            }
          : item,
      ),
    }));
    clearLineForm();
  };

  const handleDeleteProduct = (lineId: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== lineId),
    }));
    if (editingLineId === lineId) clearLineForm();
  };

  const buildPayload = (allowNegative: boolean) => ({
    from_warehouse_id: formData.warehouseId ? Number(formData.warehouseId) : null,
    reason_id: Number(formData.reasonId),
    // Only while the reason still asks for one: a name picked under one reason
    // and left behind by switching to another would be saved anyway.
    party_id: needsParty && party ? Number(party.value) : null,
    note: formData.note || null,
    allow_negative: allowNegative,
    items: formData.items.map((item) => ({
      product_id: Number(item.productId),
      quantity: Number(item.quantity),
      note: item.note || null,
    })),
  });

  const submit = (allowNegative: boolean) => {
    setSaveButtonLoading(true);
    const payload = buildPayload(allowNegative);
    // A slip open for changing goes to update; anything else is a new slip.
    const send = (callback: (response: any) => void) =>
      editing ? updateProductOut(editing.id, payload, callback) : storeProductOut(payload, callback);

    dispatch(
      send((response: any) => {
        // ⚠️ The shortage refusal is success:FALSE and carries a list, and the
        // clerk is asked ONCE. Sending it again with allow_negative is the
        // house shape for every stock document here (see the branch transfer
        // screen): warn, and let whoever is looking at the shelf decide.
        //
        // Asked in StockShortageModal, the dialog the invoice and the delivery
        // ask the same question with. Never blocked: a write-off is how a shop
        // corrects a book that has drifted from the shelf.
        if (!response?.success && Array.isArray(response?.shortages) && response.shortages.length) {
          setStockWarning({
            rows: response.shortages.map((s: any) => ({
              name: s.name,
              available: Number(s.available),
              requested: Number(s.requested),
            })),
            shortages: [],
            message: response?.message || 'Not enough stock on the book.',
            blocked: false,
          });
          setSaveButtonLoading(false);
          return;
        }

        if (response?.success) {
          toast.success(response?.message || (editing ? 'Write-off updated' : 'Write-off saved'));

          // The photos go on once the slip has a voucher to hang them on. A
          // failed upload is said but does not undo the write-off -- the slip
          // is saved, and the photos can be added again from Edit.
          const mainTrxId = Number(response?.data?.data?.main_trx_id || 0);
          uploadPhotos(mainTrxId).finally(() => {
            resetForm();
            setListRefreshKey((prev) => prev + 1);
            setSaveButtonLoading(false);
          });
          return;
        }

        toast.error(response?.message || 'Failed to save write-off');
        setSaveButtonLoading(false);
      }),
    );
  };

  const handleSave = () => {
    if (!formData.reasonId) {
      toast.error('Please pick a reason');
      return;
    }
    if (needsParty && !party) {
      toast.error('This reason has to say who it went back to');
      return;
    }
    if (!formData.items.length) {
      toast.error('Please add at least one product');
      return;
    }
    submit(false);
  };

  return (
    <div>
      <HelmetTitle title="Product Out" />

      {/* Said out loud, so a change is never mistaken for a new slip. */}
      {editing && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-500/10 dark:text-amber-300">
          <span>
            Editing <strong>{editing.outNo}</strong> — Update saves the change and moves the stock with it.
          </span>
          <button type="button" onClick={resetForm} className="font-medium underline">
            Cancel edit
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-2 mb-4">
        <div>
          <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Reason</label>
          <Select
            id="reasonId"
            name="reasonId"
            value={formData.reasonId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFormData((prev) => ({ ...prev, reasonId: e.target.value }))
            }
            className={`${FIELD_SELECT} block w-full p-2 text-sm`}
          >
            <option value="">Why did it go?</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">From Warehouse</label>
          <WarehouseDropdown
            id="warehouseId"
            name="warehouseId"
            className="p-2"
            warehouseDdl={warehouseOptions}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFormData((prev) => ({ ...prev, warehouseId: e.target.value }))
            }
            defaultValue={formData.warehouseId}
          />
        </div>

        {/* Only the reasons that owe a name show a picker. Who it went back to
            -- a customer's broken piece being swapped. */}
        {needsParty && (
          <div>
            <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
              Went back to
            </label>
            <DdlMultiline
              id="partyId"
              name="partyId"
              fetchOptions={findParties}
              defaultOptions={false}
              value={party}
              onSelect={(chosen: any) => setParty(chosen)}
              placeholder="Search a customer by name, mobile or code"
            />
          </div>
        )}

        <InputElement
          id="note"
          name="note"
          label="Note"
          placeholder="Anything worth writing down"
          value={formData.note}
          onChange={handleFormInput}
          className="w-full "
        />

        {/* Photos of the damage, attached to the slip's voucher on save -- the
            same store every voucher's attachments use, so they show wherever
            voucher images are shown. */}
        <div>
          <label htmlFor="outPhotos" className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
            Photos {editing ? '(added to the ones already on the slip)' : ''}
          </label>
          <input
            ref={photoInputRef}
            id="outPhotos"
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={(e) => setPhotos(Array.from(e.target.files || []))}
            className={`block w-full text-sm text-slate-600 dark:text-[rgb(var(--c-text))] ${FIELD_FILE_BUTTON}`}
          />
          {photos.length > 0 && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {photos.length} file(s) will be attached on {editing ? 'Update' : 'Save'}.
            </p>
          )}
        </div>

        <div className="md:col-span-2 mt-2 border-t border-[rgb(var(--c-border))] pt-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-6">
              <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Select Product</label>
              <RequisitionItemsDropdown
                id="outProduct"
                name="outProduct"
                onSelect={handleProductSelect}
                defaultValue={
                  lineItem.productId ? { value: lineItem.productId, label: lineItem.productName } : null
                }
                value={
                  lineItem.productId ? { value: lineItem.productId, label: lineItem.productName } : null
                }
              />
            </div>
            <div className="md:col-span-3">
              <InputElement
                id="quantity"
                name="quantity"
                className=""
                type="number"
                label={`Quantity ${lineItem.unit ? `(${lineItem.unit})` : ''}`}
                value={lineItem.quantity}
                placeholder="0"
                onChange={handleLineItemChange}
              />
            </div>
            <div className="md:col-span-3">
              <InputElement
                id="lineNote"
                name="note"
                className=""
                label="Line Note"
                value={lineItem.note}
                placeholder="Optional"
                onChange={handleLineItemChange}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
        {isUpdatingLine ? (
          <ButtonLoading
            onClick={handleUpdateProduct}
            buttonLoading={false}
            label="Update Item"
            className="whitespace-nowrap text-center mr-0 py-2"
            icon={<FiEdit2 className="text-lg ml-2 mr-2" />}
          />
        ) : (
          <ButtonLoading
            onClick={handleAddProduct}
            buttonLoading={false}
            label="Add Item"
            className="whitespace-nowrap text-center mr-0 py-2"
            icon={<FiPlus className="text-lg ml-2 mr-2" />}
          />
        )}
        <ButtonLoading
          onClick={clearLineForm}
          buttonLoading={false}
          label="Clear Item"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={handleSave}
          buttonLoading={saveButtonLoading}
          label={saveButtonLoading ? 'Saving...' : editing ? 'Update' : 'Save'}
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiSave className="text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={resetForm}
          buttonLoading={false}
          label={editing ? 'Cancel Edit' : 'Reset All'}
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
        />
      </div>

      <div className="mt-3 overflow-x-auto mb-5">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-[rgb(var(--c-table-head))] dark:text-gray-200">
            <tr>
              <th className="px-2 py-2 text-center">Sl</th>
              <th className="px-2 py-2">Product</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2">Note</th>
              <th className="px-2 py-2 text-center w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            {formData.items.map((row, index) => (
              <tr key={row.id} className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td className="px-2 py-2 text-center text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {index + 1}
                </td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {row.productName}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.quantity))} {row.unit}
                </td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {row.note || '-'}
                </td>
                <td className="px-2 py-2 text-center text-gray-900 dark:text-[rgb(var(--c-text))]">
                  <Button onClick={() => handleDeleteProduct(row.id)} className="text-red-500 ml-2 text-center">
                    <FiTrash2 className="cursor-pointer text-center" />
                  </Button>
                  <Button onClick={() => handleEditProduct(row.id)} className="text-green-500 ml-2 text-center">
                    <FiEdit2 className="cursor-pointer text-center" />
                  </Button>
                </td>
              </tr>
            ))}
            {formData.items.length === 0 && (
              <tr className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td colSpan={5} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
                  No product added
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ProductOutList refreshKey={listRefreshKey} onEdit={handleEditSlip} />

      <StockShortageModal
        warning={stockWarning}
        action="write it off"
        saving={saveButtonLoading}
        onCancel={() => setStockWarning(null)}
        onContinue={() => {
          setStockWarning(null);
          submit(true);
        }}
      />
    </div>
  );
};

export default ProductOut;
