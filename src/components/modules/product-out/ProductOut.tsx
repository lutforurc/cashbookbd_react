import React, { useEffect, useState } from 'react';
import { FIELD_SELECT } from '../../../theme/fieldStyles';
import { useDispatch, useSelector } from 'react-redux';
import { FiEdit2, FiPlus, FiRefreshCcw, FiSave, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import RequisitionItemsDropdown from '../../utils/utils-functions/RequisitionItemsDropdown';
import DdlMultiline from '../../utils/utils-functions/DdlMultiline';
import WarehouseDropdown from '../../utils/utils-functions/WarehouseDropdown';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import httpService from '../../services/httpService';
import { API_PRODUCT_OUT_PARTY_URL } from '../../services/apiRoutes';
import { Select } from '../../utils/fields/FormControls';
import { getDdlWarehouse } from '../warehouse/ddlWarehouseSlider';
import { getProductOutReasons, storeProductOut } from './productOutSlice';
import ProductOutList from './ProductOutList';

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
 * ⚠️ NOTHING IS TAKEN OFF THE SHELF BY THIS SCREEN. The slip saves as pending
 * and the stock moves when the owner approves it in the Approval Center --
 * which is stated on the screen, because a clerk who believes they have just
 * emptied the shelf of 40 tiles will not go and approve anything.
 */
const ProductOut = () => {
  const dispatch = useDispatch<any>();
  const productOut = useSelector((s: any) => s.productOut);
  const warehouseState = useSelector((s: any) => s.activeWarehouse);
  const warehouseOptions = Array.isArray(warehouseState?.data) ? warehouseState.data : [];
  const reasons: any[] = Array.isArray(productOut?.reasons) ? productOut.reasons : [];

  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [outDate, setOutDate] = useState<Date | null>(dayjs().toDate());
  const [isUpdatingLine, setIsUpdatingLine] = useState(false);
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [lineItem, setLineItem] = useState({ ...emptyLine });
  const [party, setParty] = useState<Option | null>(null);
  const [formData, setFormData] = useState({
    outDate: dayjs().format('YYYY-MM-DD'),
    warehouseId: '',
    reasonId: '',
    note: '',
    items: [] as OutItem[],
  });

  useEffect(() => {
    dispatch(getDdlWarehouse());
    dispatch(getProductOutReasons());
  }, [dispatch]);

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

  const handleOutDateChange = (date: Date | null) => {
    setOutDate(date);
    setFormData((prev) => ({
      ...prev,
      outDate: date ? dayjs(date).format('YYYY-MM-DD') : '',
    }));
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
      outDate: dayjs().format('YYYY-MM-DD'),
      warehouseId: '',
      reasonId: '',
      note: '',
      items: [],
    });
    setOutDate(dayjs().toDate());
    setParty(null);
    clearLineForm();
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
    out_date: formData.outDate || null,
    from_warehouse_id: formData.warehouseId ? Number(formData.warehouseId) : null,
    reason_id: Number(formData.reasonId),
    party_id: party ? Number(party.value) : null,
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
    dispatch(
      storeProductOut(buildPayload(allowNegative), (response: any) => {
        // ⚠️ The shortage refusal is success:FALSE and carries a list, and the
        // clerk is asked ONCE. Sending it again with allow_negative is the
        // house shape for every stock document here (see the branch transfer
        // screen): warn, and let whoever is looking at the shelf decide.
        if (!response?.success && Array.isArray(response?.shortages) && response.shortages.length) {
          const lines = response.shortages
            .map((s: any) => `${s.name}: book ${s.available}, asked ${s.requested}`)
            .join('\n');

          const goAhead = window.confirm(
            `Not enough stock on the book:\n\n${lines}\n\n` +
              `Write it off anyway? The shelf is the truth for a breakage -- ` +
              `check it, then say yes.`,
          );

          if (goAhead) {
            submit(true);
          } else {
            setSaveButtonLoading(false);
          }
          return;
        }

        if (response?.success) {
          toast.success(response?.message || 'Write-off saved');
          resetForm();
          setListRefreshKey((prev) => prev + 1);
        } else {
          toast.error(response?.message || 'Failed to save write-off');
        }
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

      <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        Saving this slip does <b>not</b> take the stock off the shelf. It moves when the
        write-off is approved in the Approval Center.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-2 mb-4">
        <InputDatePicker
          id="outDate"
          name="outDate"
          label="Date"
          selectedDate={outDate}
          setSelectedDate={setOutDate}
          setCurrentDate={handleOutDateChange}
          className="w-full "
        />
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
          label={saveButtonLoading ? 'Saving...' : 'Save'}
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiSave className="text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={resetForm}
          buttonLoading={false}
          label="Reset All"
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

      <ProductOutList refreshKey={listRefreshKey} />
    </div>
  );
};

export default ProductOut;
