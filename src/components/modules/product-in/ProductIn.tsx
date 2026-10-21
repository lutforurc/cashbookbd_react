import React, { useEffect, useRef, useState } from 'react';
import { FIELD_SELECT } from '../../../theme/fieldStyles';
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
import { API_PRODUCT_IN_PARTY_URL, API_PRODUCT_IN_RATE_URL } from '../../services/apiRoutes';
import { Select } from '../../utils/fields/FormControls';
import { getDdlWarehouse } from '../warehouse/ddlWarehouseSlider';
import { getProductInReasons, resolveReasonId, storeProductIn } from './productInSlice';
import ProductInList from './ProductInList';

type Option = { value: string; label: string; label_2?: string; label_3?: string };

/**
 * Where the rate came from. `none` is what opens the box; anything else fills it
 * and locks it, so a rate the books already hold can never be overwritten from
 * this screen.
 */
type RateSource = '' | 'last_purchase' | 'master' | 'none';

type InItem = {
  id: number;
  productId: string;
  productName: string;
  unit: string;
  quantity: string;
  /** Kept as a string so the box can be empty; the server takes it as a number. */
  rate: string;
  rateSource: RateSource;
  note: string;
};

const emptyLine = {
  productId: '',
  productName: '',
  unit: '',
  quantity: '',
  rate: '',
  rateSource: '' as RateSource,
  note: '',
};

/**
 * Stock that arrived outside a purchase.
 *
 * Saving puts the stock on the shelf (owner, 2026-10-16); approval is a separate
 * sign-off in the Approval Center and does not move it.
 *
 * ⚠️ THE RATE IS NOT THE CLERK'S TO DECIDE, EXCEPT WHERE THE BOOKS ARE SILENT.
 * The server reads each product's last purchase rate -- the catalogue price if
 * there is none -- and that is what the goods join the shelf at. The box below
 * shows that figure and refuses to be typed into. Only a product the books
 * cannot price at all opens the box, and there the clerk may type one; left
 * blank it goes in at ৳0, which the owner asked to be allowed and asked to be
 * visible (see the Rate and Value columns on the line table).
 *
 * No Date field: the slip is always dated on the branch's transaction date,
 * which the server reads itself.
 */
const ProductIn = () => {
  const dispatch = useDispatch<any>();
  const productIn = useSelector((s: any) => s.productIn);
  const warehouseState = useSelector((s: any) => s.activeWarehouse);
  const warehouseOptions = Array.isArray(warehouseState?.data) ? warehouseState.data : [];
  const reasons: any[] = Array.isArray(productIn?.reasons) ? productIn.reasons : [];

  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [isUpdatingLine, setIsUpdatingLine] = useState(false);
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [lineItem, setLineItem] = useState({ ...emptyLine });
  const [party, setParty] = useState<Option | null>(null);
  const [formData, setFormData] = useState({
    warehouseId: '',
    reasonId: '',
    note: '',
    items: [] as InItem[],
  });
  // The product the newest rate lookup is for.
  const rateFor = useRef('');

  useEffect(() => {
    dispatch(getDdlWarehouse());
    dispatch(getProductInReasons());
  }, [dispatch]);

  // Open a new receipt on the shop's own default reason, so the Reason field is
  // never blank. It only fills an empty field -- a reason already chosen is left
  // exactly as it is.
  useEffect(() => {
    setFormData((prev) => {
      const next = resolveReasonId(prev.reasonId, reasons);
      return next === prev.reasonId ? prev : { ...prev, reasonId: next };
    });
  }, [reasons]);

  // The reason itself says whether a name is owed -- goods handed back by a
  // customer have somebody at the other end of them, a stock-count discovery
  // does not. Read off the chosen row so a reason the shop adds later behaves
  // without a code change.
  const selectedReason = reasons.find((r) => String(r.id) === String(formData.reasonId));
  const needsParty = Boolean(selectedReason?.needs_party);

  // Party lookup for the reasons that ask for one. Same shape as the write-off
  // screen's picker: type to search, answers cust_party_infos.id.
  const findParties = async (typed: string): Promise<Option[]> => {
    const res: any = await httpService.get(API_PRODUCT_IN_PARTY_URL, { params: { q: typed } });
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

  /**
   * Ask what this product should be received at.
   *
   * ⚠️ THE FORM CANNOT WORK THIS OUT FOR ITSELF. Whether the books hold a rate
   * is a question about the stock ledger, which the browser has no access to.
   * `source: 'none'` is the answer that opens the box; anything else fills it and
   * locks it. A lookup that fails is treated as 'none' -- the box opens, and the
   * server still applies the book rate if it has one, so the worst a failure
   * costs is a box nobody needed to use.
   */
  const loadRate = async (productId: string) => {
    if (!productId) return;

    rateFor.current = productId;
    setRateLoading(true);
    try {
      const res: any = await httpService.get(`${API_PRODUCT_IN_RATE_URL}/${productId}`);
      const payload = res?.data?.data?.data ?? res?.data?.data ?? null;

      // A slower answer for a product the clerk has already moved on from
      // must not land on the line now showing.
      if (rateFor.current !== productId) return;

      if (payload) {
        setLineItem((prev) => ({
          ...prev,
          rate: payload.rate ? String(payload.rate) : '',
          rateSource: payload.source === 'none' ? 'none' : (payload.source as RateSource),
        }));
      } else {
        setLineItem((prev) => ({ ...prev, rate: '', rateSource: 'none' }));
      }
    } catch {
      if (rateFor.current !== productId) return;
      setLineItem((prev) => ({ ...prev, rate: '', rateSource: 'none' }));
    }
    setRateLoading(false);
  };

  const handleProductSelect = (option: Option | null) => {
    if (!option) {
      rateFor.current = '';
      setRateLoading(false);
      setLineItem((prev) => ({
        ...prev,
        productId: '',
        productName: '',
        unit: '',
        rate: '',
        rateSource: '',
      }));
      return;
    }

    setLineItem((prev) => ({
      ...prev,
      productId: option.value || '',
      productName: option.label || '',
      unit: option.label_3 || '',
      // Cleared until the lookup answers, so a figure from the previous product
      // can never be read as this one's.
      rate: '',
      rateSource: '',
    }));

    loadRate(option.value);
  };

  /** May the clerk type in the rate box for this line? */
  const rateIsEditable = (source: RateSource) => source === 'none';

  const clearLineForm = () => {
    rateFor.current = '';
    setRateLoading(false);
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
    // Added before the lookup answered, the line showed ৳0 and was flagged as
    // unpriced while the server went on to price it from the books.
    if (lineItem.rateSource === '') {
      toast.error('Wait for the rate to load');
      return false;
    }
    // A typed rate has to be a number, and not a negative one. Blank is a real
    // answer -- it means ৳0 -- so it is not an error.
    if (rateIsEditable(lineItem.rateSource) && lineItem.rate !== '') {
      const typed = Number(lineItem.rate);
      if (Number.isNaN(typed) || typed < 0) {
        toast.error('The rate has to be a number, and not a negative one');
        return false;
      }
    }
    return true;
  };

  const lineValue = (item: { quantity: string; rate: string }) =>
    (Number(item.quantity) || 0) * (Number(item.rate) || 0);

  const handleAddProduct = () => {
    if (!validateLineItem()) return;
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), ...lineItem }],
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
      rate: found.rate,
      rateSource: found.rateSource,
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
        item.id === editingLineId ? { ...item, ...lineItem } : item,
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

  const buildPayload = () => {
    // ⚠️ ONLY THE LINES THE BOOKS COULD NOT PRICE, and only where the clerk
    // actually answered. The server consults this map LAST -- after the book and
    // the catalogue -- so sending more could not override a rate that exists,
    // but sending less keeps the request honest about what it is claiming.
    const rates: Record<string, number> = {};

    formData.items.forEach((item) => {
      if (rateIsEditable(item.rateSource) && item.rate !== '') {
        rates[item.productId] = Number(item.rate);
      }
    });

    return {
      to_warehouse_id: formData.warehouseId ? Number(formData.warehouseId) : null,
      reason_id: Number(formData.reasonId),
      // Only while the reason still asks for one: a name picked under one
      // reason and left behind by switching to another would be saved anyway.
      party_id: needsParty && party ? Number(party.value) : null,
      note: formData.note || null,
      rates,
      items: formData.items.map((item) => ({
        product_id: Number(item.productId),
        quantity: Number(item.quantity),
        note: item.note || null,
      })),
    };
  };

  const handleSave = () => {
    if (!formData.reasonId) {
      toast.error('Please pick a reason');
      return;
    }
    if (needsParty && !party) {
      toast.error('This reason has to say who it came from');
      return;
    }
    if (!formData.items.length) {
      toast.error('Please add at least one product');
      return;
    }

    // ⚠️ Names are read BEFORE the form is reset, because the warning below is
    // the only place a ৳0 line is named after the fact. On the form it is the
    // Rate column that says so; once saved, this is what says it.
    const nameOf: Record<string, string> = {};
    formData.items.forEach((item) => {
      nameOf[item.productId] = item.productName;
    });

    setSaveButtonLoading(true);
    dispatch(
      storeProductIn(buildPayload(), (response: any) => {
        if (response?.success) {
          toast.success(response?.message || 'Receipt saved');

          // ⚠️ data.data: foundData() wraps the payload one level deeper than it
          // looks. Read at data.unpriced, the list was never found and the ৳0
          // warning below never fired.
          const unpriced: string[] = Array.isArray(response?.data?.data?.unpriced)
            ? response.data.data.unpriced
            : [];

          if (unpriced.length) {
            // Not a refusal and not a question -- the owner's ruling is that an
            // unanswered rate is ৳0. It is said out loud because ৳0 stock raises
            // the quantity and not the value, and will read as pure profit when
            // it is later sold.
            toast.warn(
              `${unpriced.length} line(s) went in at ৳0 -- no purchase price on the books: ` +
                unpriced.map((id) => nameOf[String(id)] || `#${id}`).join(', '),
              { autoClose: 8000 },
            );
          }

          resetForm();
          setListRefreshKey((prev) => prev + 1);
        } else {
          toast.error(response?.message || 'Failed to save receipt');
        }
        setSaveButtonLoading(false);
      }),
    );
  };

  const rateHint = (source: RateSource) => {
    if (source === '') return rateLoading ? 'Looking up the rate…' : '';
    if (source === 'none') return 'No purchase price on the books — type one, or leave blank for ৳0';
    if (source === 'master') return 'Product catalogue price';
    return 'Last purchase rate';
  };

  return (
    <div>
      <HelmetTitle title="Product In" />

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
            <option value="">Where did it come from?</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">To Warehouse</label>
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

        {/* Only the reasons that owe a name show a picker. Who it came from --
            a customer handing something back. */}
        {needsParty && (
          <div>
            <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
              Came from
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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
            <div className="md:col-span-5">
              <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Select Product</label>
              <RequisitionItemsDropdown
                id="inProduct"
                name="inProduct"
                onSelect={handleProductSelect}
                defaultValue={
                  lineItem.productId ? { value: lineItem.productId, label: lineItem.productName } : null
                }
                value={
                  lineItem.productId ? { value: lineItem.productId, label: lineItem.productName } : null
                }
              />
            </div>
            <div className="md:col-span-2">
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
            <div className="md:col-span-2">
              {/* ⚠️ Locked where the books hold a rate, and the lock is real:
                  the server consults the clerk's figure last, so even a request
                  built by hand cannot talk over it (owner, 2026-10-16). */}
              <InputElement
                id="rate"
                name="rate"
                className=""
                type="number"
                label="Rate"
                value={lineItem.rate}
                placeholder={rateIsEditable(lineItem.rateSource) ? '0' : ''}
                disabled={!rateIsEditable(lineItem.rateSource)}
                onChange={handleLineItemChange}
                description={rateHint(lineItem.rateSource)}
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
              <th className="px-2 py-2 text-right">Rate</th>
              <th className="px-2 py-2 text-right">Value</th>
              <th className="px-2 py-2">Note</th>
              <th className="px-2 py-2 text-center w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            {formData.items.map((row, index) => {
              // ⚠️ A ৳0 line is called out here, BEFORE Save is pressed. It is
              // not blocked -- the owner ruled that a shop may mean it -- but it
              // must not go unnoticed: ৳0 stock raises the quantity and not the
              // value, and reads as pure profit when it is later sold.
              const zeroRated = lineValue(row) <= 0;

              return (
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
                  <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">
                    {thousandSeparator(Number(row.rate) || 0)}
                  </td>
                  <td
                    className={`px-2 py-2 text-right ${
                      zeroRated ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-[rgb(var(--c-text))]'
                    }`}
                    title={zeroRated ? 'No rate on this line — it adds quantity and no value' : undefined}
                  >
                    {thousandSeparator(lineValue(row))}
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
              );
            })}
            {formData.items.length === 0 && (
              <tr className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td colSpan={7} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
                  No product added
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ProductInList refreshKey={listRefreshKey} />
    </div>
  );
};

export default ProductIn;
