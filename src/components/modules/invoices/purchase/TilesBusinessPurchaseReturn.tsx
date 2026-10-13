import React, { useEffect, useRef, useState } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import InputElement from '../../../utils/fields/InputElement';
import { Button, ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import { toast } from 'react-toastify';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import { useDispatch, useSelector } from 'react-redux';
import { userCurrentBranch } from '../../branch/branchSlice';
import { useTilesWarehouseField } from '../../../utils/hooks/useTilesWarehouseField';
import { getDdlWarehouse } from '../../warehouse/ddlWarehouseSlider';
import WarehouseDropdown from '../../../utils/utils-functions/WarehouseDropdown';
import dayjs from 'dayjs';
import Loader from '../../../../common/Loader';
import { FiEdit, FiEdit2, FiHome, FiPlus, FiRefreshCcw, FiSave, FiTrash2 } from 'react-icons/fi';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { validateProductData } from '../../../utils/utils-functions/productValidationHandler';
import { invoiceMessage } from '../../../utils/utils-functions/invoiceMessage';
import { validateForm } from '../../../utils/utils-functions/validationUtils';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import InputDatePicker from '../../../utils/fields/DatePicker';
import { VoucherPrintRegistry } from '../../vouchers/VoucherPrintRegistry';
import { useVoucherPrint } from '../../vouchers';
import QuickCustomerModal from '../sales/QuickCustomerModal';
import httpService from '../../../services/httpService';
import {
  API_TILES_PREVIOUS_BALANCE_URL,
  API_TRADING_PURCHASE_SUGGESTIONS_URL,
  API_PURCHASE_RETURN_STORE_URL,
  API_PURCHASE_RETURN_EDIT_URL,
  API_PURCHASE_RETURN_UPDATE_URL,
} from '../../../services/apiRoutes';
import useVoucherAutoEditSearch from '../../../utils/hooks/useVoucherAutoEditSearch';
import useCtrlS from '../../../utils/hooks/useCtrlS';
import { useNavigate } from 'react-router-dom';

/**
 * The two dates this screen holds are 'YYYY-MM-DD' strings -- the shape the API
 * and the paper both read -- while the app's date box speaks Date objects.
 * These do the translation in one place, through dayjs rather than new Date(),
 * which reads a bare date as UTC and can hand back yesterday.
 */
const asDate = (value: string) => (value ? dayjs(value).toDate() : null);
const asText = (date: Date | null) => (date ? dayjs(date).format('YYYY-MM-DD') : '');

interface Product {
  id: number;
  product: number;
  product_name: string;
  /** Shown in front of the name on the row, blank when the product has no
      code -- same shape the paper prints. */
  product_code?: string;
  unit: string;
  qty: number | string;
  price: number | string;
  warehouse: string;
}

const normalizeSuggestionItems = (items: any) =>
  Array.isArray(items)
    ? items
      .map((item: any) => String(item ?? '').trim())
      .filter(
        (item: string, index: number, arr: string[]) =>
          item && arr.indexOf(item) === index,
      )
    : [];

/**
 * A Purchase Return for a Tiles and Sanitary branch -- the purchase invoice's
 * twin, read the other way round, and the sales return's mirror.
 *
 * ⚠️ FOUR TERMS, AND THE THIRD AND FOURTH TAKE MONEY OFF.
 *   Total Tk. = Previous Balance + Current Invoice − Discount − Received Amount
 * The money moves the same way the goods did: the return puts the bill back on
 * the account and takes off whatever the supplier hands us, so a supplier who
 * refunds 200 ends LOWER than one who refunds nothing. The purchase invoice's
 * own block is this same expression with every sign turned round, and this
 * screen was copied from that one -- so it is the likeliest line here to be
 * "corrected" into a wrong one.
 *
 * ⚠️ PREVIOUS BALANCE IS THE PARTY'S OWN FIGURE, read the ledger's way and no
 * other: debit − credit, exactly what the purchase invoice and every sales
 * screen reads, so one party has one balance wherever it is opened. A supplier
 * we owe therefore stands at a NEGATIVE balance -- a fact about the account,
 * not a figure the server floors to nought.
 *
 * Print goes through VoucherPrintRegistry's `12` case to the `purchase_return`
 * doc type -- its own paper, NOT the Purchase Invoice's, so a branch that
 * redraws its invoice does not thereby redraw what it sends goods back on.
 */
const TilesBusinessPurchaseReturn = () => {
  const warehouse = useSelector((s: any) => s.activeWarehouse);
  const settings = useSelector((s: any) => s.settings);
  const { showWarehouse, defaultWarehouseId, branchWarehouseIds } = useTilesWarehouseField();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  /**
   * What this branch calls its four handwritten figures -- set on the branch's
   * Invoice Setup and read here. ⚠️ THE FALLBACK LIVES HERE AND NOWHERE ELSE:
   * the server stores only what the branch typed, so a blank setting means the
   * standard name, and clearing one in the branch form gets you back to it.
   */
  const fieldLabel = (key: string, fallback: string) =>
    settings?.data?.branch?.[key] || fallback;

  const [buttonLoading, setButtonLoading] = useState(false);
  const [updateButtonLoading, setUpdateButtonLoading] = useState(false);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [warehouseDdlData, setWarehouseDdlData] = useState<any[]>([]);
  const [unit, setUnit] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [productData, setProductData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateId, setUpdateId] = useState<any>(null);
  const [isUpdateButton, setIsUpdateButton] = useState(false);
  const [lineTotal, setLineTotal] = useState<number>(0);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerDraftName, setCustomerDraftName] = useState('');
  const [isReceivedAmtManuallyEdited, setIsReceivedAmtManuallyEdited] = useState(false);
  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);
  const [noteSuggestions, setNoteSuggestions] = useState<string[]>([]);
  // What this branch already owed the supplier before the return being written.
  // Zero means nothing owing, or a cash supplier -- see loadPreviousBalance.
  const [previousBalance, setPreviousBalance] = useState(0);
  // The voucher this screen last stored or opened, kept OUTSIDE the form: saving
  // clears the form, and the paper is printed from the number. See the sales
  // return's twin for the long version.
  const [lastVrNo, setLastVrNo] = useState('');

  useEffect(() => {
    dispatch(userCurrentBranch());
    dispatch(getDdlWarehouse());
  }, []);

  useEffect(() => {
    if (warehouse?.data && warehouse?.data.length > 0) {
      setWarehouseDdlData(warehouse?.data);
    }
  }, [warehouse?.data]);

  /**
   * With the picker hidden a line still has to say which store it moved, and on
   * a single-warehouse tiles branch that store is the branch's own godown.
   */
  useEffect(() => {
    if (showWarehouse || !defaultWarehouseId) return;

    setProductData((prev: any) =>
      prev?.warehouse && branchWarehouseIds.has(String(prev.warehouse))
        ? prev
        : { ...(prev ?? {}), warehouse: defaultWarehouseId },
    );
  }, [showWarehouse, defaultWarehouseId, branchWarehouseIds]);

  interface FormData {
    mtmId: string;
    account: string;
    accountName: string;
    paymentAmt: string;
    discountAmt: number;
    invoice_no: string;
    invoice_date: string;
    notes: string;
    products: Product[];
    // The four figures the shop writes by hand. Dates travel as 'YYYY-MM-DD',
    // which is what the API stores and what the paper formats.
    manual_voucher_no: string;
    manual_voucher_date: string;
    manual_challan_no: string;
    manual_challan_date: string;
  }

  const initialFormData: FormData = {
    mtmId: '',
    account: '',
    accountName: '',
    paymentAmt: '',
    discountAmt: 0,
    invoice_no: '',
    invoice_date: '',
    notes: '',
    products: [],
    manual_voucher_no: '',
    manual_voucher_date: '',
    manual_challan_no: '',
    manual_challan_date: '',
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  /**
   * What this branch owed the supplier before this return.
   *
   * ⚠️ NO DIRECTION FLAG -- see the note at the head of this file. The balance
   * is the party's own, the same figure the purchase invoice and every sales
   * screen reads, so one party cannot show two balances.
   *
   * ⚠️ THE CASH HEAD IS NOT A PARTY. Account 17's balance is the drawer, not a
   * due, so a cash return asks for nothing and carries nothing into the total.
   *
   * ⚠️ `allow_negative` -- the balance WITH its sign. The server floors it at
   * zero for the receipt box, where a credit is not an amount to collect; here
   * the figure is a term of the return's own total, and a floored credit made
   * that total wrong by exactly the advance.
   */
  const loadPreviousBalance = (account: string | number, excludeMtmId = '') => {
    if (!account || Number(account) === 17) {
      setPreviousBalance(0);
      return;
    }

    httpService
      .get(API_TILES_PREVIOUS_BALANCE_URL, {
        params: { account, exclude_mtm_id: excludeMtmId, allow_negative: 1 },
      })
      .then((response: any) =>
        setPreviousBalance(Number(response?.data?.data?.data?.balance ?? 0)),
      )
      // A figure that could not be read is not a figure to total up.
      .catch(() => setPreviousBalance(0));
  };

  useEffect(() => {
    const trimmedQuery = formData.notes.trim();
    if (!trimmedQuery) {
      setNoteSuggestions([]);
      return;
    }

    const timer = window.setTimeout(() => {
      httpService
        .get(API_TRADING_PURCHASE_SUGGESTIONS_URL, {
          params: { field: 'notes', q: trimmedQuery },
        })
        .then((response: any) =>
          setNoteSuggestions(normalizeSuggestionItems(response?.data?.data?.data)),
        )
        .catch(() => setNoteSuggestions([]));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [formData.notes]);

  const supplierAccountHandler = (option: any) => {
    const isCashSupplier = Number(option?.value) === 17;

    setIsReceivedAmtManuallyEdited(false);
    setFormData((prev) => ({
      ...prev,
      account: option?.value || '',
      accountName: option?.label || '',
      // Kept for a cash supplier -- the effect below then forces it onto the
      // receipt. Cleared for anyone else.
      paymentAmt: isCashSupplier ? prev.paymentAmt : '',
    }));

    void loadPreviousBalance(option?.value);
  };

  const productSelectHandler = (option: any) => {
    setUnit(option?.label_5 || null);
    setProductData((prev: any) => ({
      ...prev,
      product: option?.value || 0,
      product_name: option?.label || '',
      // The code the picker carried down with the name, so the row can read
      // "GI-106 - 2 Tangki Nipple" the way the paper does.
      product_code: option?.code || '',
      unit: option?.label_5 || '',
      // The dropdown carries the purchase price (label_3) beside the name, as
      // the purchase invoice reads it. `|| ''` because Number(null) is 0, and a
      // product with no price yet should leave the box empty, not read 0.
      price: Number(option?.label_3) || '',
    }));
  };

  const handleInvoiceDate = (date: Date | null) => {
    setFormData((prev) => ({ ...prev, invoice_date: asText(date) }));
  };

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'paymentAmt' && Number(formData.account) !== 17) {
      setIsReceivedAmtManuallyEdited(true);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // The box keeps exactly what was typed -- see the sales return's twin for
    // why parsing here stops a decimal from ever being entered.
    setProductData((prev: any) => {
      const next = { ...prev, [name]: value };
      setLineTotal((parseFloat(next.qty) || 0) * (parseFloat(next.price) || 0));
      return next;
    });
  };

  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProductData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const clearProductEntry = () => {
    setProductData((prev: any) => ({ warehouse: prev.warehouse }));
    setUnit(null);
    setLineTotal(0);
  };

  const isProductAlreadyAdded = (skipIndex: number | null = null) =>
    formData.products.some(
      (row, index) => index !== skipIndex && Number(row.product) === Number(productData.product),
    );

  const addProduct = () => {
    if (!validateProductData(productData)) return;

    if (isProductAlreadyAdded()) {
      toast.info('This product is already added.');
      return;
    }

    const newProduct: Product = {
      id: Date.now(),
      product: productData.product || 0,
      product_name: productData.product_name || '',
      product_code: productData.product_code || '',
      unit: productData.unit || '',
      qty: Number(productData.qty) || 0,
      price: Number(productData.price) || 0,
      warehouse: productData.warehouse || '',
    };

    setFormData((prev) => ({ ...prev, products: [...prev.products, newProduct] }));
    clearProductEntry();
  };

  const editProduct = () => {
    if (!validateProductData(productData)) return;

    if (isProductAlreadyAdded(updateId)) {
      toast.info('This product is already added.');
      return;
    }

    const newItem: Product = {
      id: formData.products[updateId]?.id ?? Date.now(),
      product: productData.product || 0,
      product_name: productData.product_name || '',
      product_code: productData.product_code || '',
      unit: productData.unit || '',
      qty: Number(productData.qty) || 0,
      price: Number(productData.price) || 0,
      warehouse: productData.warehouse || '',
    };

    setFormData((prev) => ({
      ...prev,
      products: prev.products.map((item, index) => (index === updateId ? newItem : item)),
    }));

    setIsUpdating(false);
    setUpdateId(null);
    clearProductEntry();
  };

  const editProductItem = (productId: number) => {
    const productIndex = formData.products.findIndex((item) => item.id === productId);
    if (productIndex === -1) return;

    const product = formData.products[productIndex];
    setProductData(product);
    setUnit(product.unit);
    setLineTotal(Number(product.qty) * Number(product.price));
    setIsUpdating(true);
    setUpdateId(productIndex);
  };

  const handleDelete = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((product) => product.id !== id),
    }));
  };

  const resetProducts = () => {
    setIsUpdateButton(false);
    if (isUpdating) setIsUpdating(false);
    setIsReceivedAmtManuallyEdited(false);
    setUpdateId(null);
    setFormData(initialFormData);

    // ⚠️ THE PREVIOUS BALANCE BELONGS TO THE SUPPLIER THIS RESET JUST DROPPED.
    setPreviousBalance(0);
    clearProductEntry();
  };

  const openCustomerModal = (typedName = '') => {
    setCustomerDraftName(typedName);
    setShowCustomerModal(true);
  };

  const searchInvoice = (searchValue?: string) => {
    const invoiceNo = typeof searchValue === 'string' ? searchValue.trim() : search.trim();

    if (!invoiceNo) {
      toast.info('Please enter a Vr. No.');
      return;
    }

    // ⚠️ LOOKED UP BY VOUCHER TYPE, NOT BY RUN -- the server does that ruling.
    httpService
      .post(API_PURCHASE_RETURN_EDIT_URL, { invoiceNo })
      .then((response: any) => {
        const payload = response?.data?.data?.data;
        const message = response?.data?.message;

        if (!payload?.vr_no) {
          toast.error(message || "Don't find purchase return!");
          return;
        }

        setFormData({
          mtmId: payload.mtmId,
          account: String(payload.account ?? ''),
          accountName: payload.accountName || '',
          paymentAmt: String(payload.netpayment ?? ''),
          discountAmt: Number(payload.discount) || 0,
          invoice_no: payload.invoice_no || '',
          invoice_date: payload.invoice_date ? String(payload.invoice_date).slice(0, 10) : '',
          notes: payload.notes || '',
          // The return's stored lines carry no warehouse -- see the note on the
          // warehouse box below.
          products: (payload.products || []).map((row: any) => ({
            id: row.id,
            product: row.product,
            product_name: row.product_name,
            product_code: row.product_code || '',
            unit: row.unit || '',
            qty: row.qty,
            price: row.price,
            warehouse: '',
          })),
          manual_voucher_no: payload.manual_voucher_no || '',
          manual_voucher_date: payload.manual_voucher_date || '',
          manual_challan_no: payload.manual_challan_no || '',
          manual_challan_date: payload.manual_challan_date || '',
        });

        setLastVrNo(payload.vr_no);
        setIsUpdateButton(true);
        setIsReceivedAmtManuallyEdited(false);
        // The return's own id rides along: it is already in the ledger, and what
        // it posted is not part of what we owed before it.
        void loadPreviousBalance(payload.account, payload.mtmId || '');

        toast.success(`${payload.vr_no} loaded`);
      })
      .catch((error: any) =>
        toast.error(error?.response?.data?.message || error?.message || 'Failed to load purchase return'),
      );
  };

  useVoucherAutoEditSearch({
    setSearch,
    triggerSearch: searchInvoice,
  });

  const totalAmount = formData.products.reduce(
    (sum, row) => sum + Number(row.qty) * Number(row.price),
    0,
  );

  // The return's own Total Tk., kept as its four separate terms so the screen
  // can show the arithmetic it is doing:
  //   Total Tk. = Previous Balance + Current Invoice − Discount − Received Amount
  const billAmount = totalAmount;
  const discountAmount = Number(formData.discountAmt) || 0;
  const receivedAmount = Number(formData.paymentAmt) || 0;
  const totalTkAmount = previousBalance + billAmount - discountAmount - receivedAmount;

  // thousandSeparator draws a nought as '-', which inside the formula below
  // reads as a minus sign -- so the one place that shows its working spells a
  // nought out.
  const money = (value: number) => {
    const shown = thousandSeparator(value);
    return shown === '-' ? '0' : shown;
  };

  useEffect(() => {
    // ⚠️ NEVER WHILE EDITING -- a saved return's figure is history, and running
    // this rule over it again would overwrite it before anything was touched.
    if (isUpdateButton || formData.mtmId) return;

    const isCashSupplier = Number(formData.account) === 17;
    // A cash return takes the whole worth of the goods back over the counter.
    const cashReceipt = Math.max(0, totalAmount - discountAmount).toFixed(2);

    if (isCashSupplier) {
      if (formData.paymentAmt !== cashReceipt) {
        setFormData((prev) => ({ ...prev, paymentAmt: cashReceipt }));
      }
      if (isReceivedAmtManuallyEdited) setIsReceivedAmtManuallyEdited(false);
    } else if (formData.account && !isReceivedAmtManuallyEdited && formData.paymentAmt !== '') {
      // A return that takes nothing back carries no receipt -- carrying the
      // figure over from whichever supplier was chosen before would post money
      // that never moved. The desk can type one in; the flag records it.
      setFormData((prev) => ({ ...prev, paymentAmt: '' }));
    }
  }, [
    formData.account,
    formData.discountAmt,
    formData.products,
    formData.paymentAmt,
    formData.mtmId,
    isReceivedAmtManuallyEdited,
    isUpdateButton,
    totalAmount,
  ]);

  /**
   * The one payload, whether the return is being stored or corrected. Keys are
   * the return's own; `netpayment` is what the supplier handed back.
   */
  const buildPayload = () => ({
    supplier_id: formData.account,
    purchase_invoice_number: formData.invoice_no,
    purchase_invoice_date: formData.invoice_date,
    total: totalAmount,
    discount: formData.discountAmt,
    // A whole return on credit is normal in this trade, so an untouched box
    // saves as 0, not ''.
    netpayment: formData.paymentAmt === '' ? '0' : formData.paymentAmt,
    notes: formData.notes,
    manual_voucher_no: formData.manual_voucher_no,
    manual_voucher_date: formData.manual_voucher_date,
    manual_challan_no: formData.manual_challan_no,
    manual_challan_date: formData.manual_challan_date,
    table_data: formData.products.map((row) => ({
      code: row.product,
      qty: row.qty,
      price: row.price,
      // ponytail: the return writers store no godown, so this is carried for the
      // API's sake and lands nowhere. Add the column when a return must go back
      // to the store it came out of.
      godown: row.warehouse || '',
    })),
  });

  const validate = () => {
    const validationMessages = validateForm(formData, invoiceMessage);
    if (validationMessages) {
      toast.info(validationMessages);
      return false;
    }
    if (formData.products.length === 0) {
      toast.info('Please add some products.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaveButtonLoading(true);
    try {
      const response = await httpService.post(API_PURCHASE_RETURN_STORE_URL, buildPayload());
      if (response?.data?.success) {
        toast.success(response?.data?.message || 'Purchase return saved successfully.');
        setLastVrNo(response?.data?.data?.data?.vr_no || '');
        resetProducts();
      } else {
        toast.error(response?.data?.message || 'Failed to save purchase return');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to save purchase return');
    } finally {
      setSaveButtonLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!validate()) return;

    setUpdateButtonLoading(true);
    try {
      const response = await httpService.post(API_PURCHASE_RETURN_UPDATE_URL, {
        ...buildPayload(),
        // Hashed by the server when the return was handed out; it goes back
        // exactly as it came.
        mtmId: formData.mtmId,
      });

      if (response?.data?.success) {
        toast.success(response?.data?.message || 'Purchase return updated successfully.');
        resetProducts();
      } else {
        toast.error(response?.data?.message || 'Failed to update purchase return');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update purchase return');
    } finally {
      setUpdateButtonLoading(false);
    }
  };

  useCtrlS(formData.mtmId ? handleUpdate : handleSave);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Purchase Return" screen="purchase-return.tiles" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
        {buttonLoading ? <Loader /> : null}
        <div className="self-start md:self-auto">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
              <div>
                <label htmlFor="">Select Supplier</label>
                <div className="mt-1 flex items-start gap-1">
                  <div className="min-w-0 flex-1">
                    <DdlMultiline
                      onSelect={supplierAccountHandler}
                      placeholder="Select Supplier"
                      actionOptionLabel="+ Add New Supplier"
                      onActionSelect={openCustomerModal}
                      value={
                        formData.account
                          ? { value: formData.account, label: formData.accountName }
                          : null
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setTimeout(() => {
                            const input = document.querySelector('#invoice_no') as HTMLInputElement | null;
                            input?.focus();
                            input?.select();
                          }, 150);
                        }
                      }}
                      acType={'3'}
                    />
                  </div>
                </div>
              </div>
              <InputElement
                id="invoice_no"
                value={formData.invoice_no}
                name="invoice_no"
                placeholder="Purchase Invoice Number"
                label="Purchase Invoice Number"
                className="py-1 w-full"
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'invoice_date')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
              <InputDatePicker
                id="invoice_date"
                name="invoice_date"
                label="Purchase Invoice Date"
                className="font-medium text-sm w-full"
                selectedDate={asDate(formData.invoice_date)}
                setSelectedDate={handleInvoiceDate}
                setCurrentDate={() => undefined}
                onKeyDown={(e) => handleInputKeyDown(e, 'paymentAmt')}
              />
              <InputElement
                id="paymentAmt"
                value={formData.paymentAmt ?? ''}
                name="paymentAmt"
                placeholder="Received Amount"
                label="Received Amount"
                // 17 is the Cash head. A cash return is settled in full by
                // definition, so the box is shut and the effect above keeps it
                // on the receipt.
                disabled={Number(formData.account) === 17}
                className="py-1 text-right w-full"
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'discountAmt')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
              <InputElement
                id="discountAmt"
                value={formData.discountAmt ?? ''}
                name="discountAmt"
                placeholder="Discount Amount"
                label="Discount Amount"
                className="py-1 text-right w-full"
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'notes')}
              />
              <InputElement
                id="notes"
                value={formData.notes ?? ''}
                name="notes"
                placeholder="Notes"
                label="Notes"
                className="py-1 w-full"
                list="purchase-return-notes-suggestions"
                autoComplete="off"
                onChange={handleOnChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setTimeout(() => {
                      const input = document.querySelector('#product') as HTMLInputElement | null;
                      input?.focus();
                      input?.select();
                    }, 150);
                  }
                }}
              />
              <datalist id="purchase-return-notes-suggestions">
                {noteSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            {/* The shop's own four figures, one line at the lower left -- the
                papers the goods went back on. The branch names them on its
                Invoice Setup; a name left blank falls back to the standard one.

                ⚠️ Four to a row inside a half-width column is tight, so the row
                is bottom-aligned. */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
              <InputElement
                id="manual_voucher_no"
                value={formData.manual_voucher_no ?? ''}
                name="manual_voucher_no"
                placeholder={fieldLabel('manual_voucher_no_label', 'Memo No.')}
                label={fieldLabel('manual_voucher_no_label', 'Memo No.')}
                className="py-1 w-full"
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'manual_voucher_date')}
              />
              <InputDatePicker
                id="manual_voucher_date"
                name="manual_voucher_date"
                label={fieldLabel('manual_voucher_date_label', 'Memo Date')}
                className="font-medium text-sm w-full"
                selectedDate={asDate(formData.manual_voucher_date)}
                setSelectedDate={(date: Date | null) =>
                  setFormData((prev) => ({ ...prev, manual_voucher_date: asText(date) }))
                }
                setCurrentDate={() => undefined}
              />
              <InputElement
                id="manual_challan_no"
                value={formData.manual_challan_no ?? ''}
                name="manual_challan_no"
                placeholder={fieldLabel('manual_challan_no_label', 'Challan No')}
                label={fieldLabel('manual_challan_no_label', 'Challan No')}
                className="py-1 w-full"
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'manual_challan_date')}
              />
              <InputDatePicker
                id="manual_challan_date"
                name="manual_challan_date"
                label={fieldLabel('manual_challan_date_label', 'Challan Date')}
                className="font-medium text-sm w-full"
                selectedDate={asDate(formData.manual_challan_date)}
                setSelectedDate={(date: Date | null) =>
                  setFormData((prev) => ({ ...prev, manual_challan_date: asText(date) }))
                }
                setCurrentDate={() => undefined}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className={showWarehouse ? undefined : 'md:col-span-2'}>
                <label htmlFor="">Select Product</label>
                <ProductDropdown
                  id="product"
                  name="product"
                  onSelect={productSelectHandler}
                  // With the warehouse box hidden the next stop is Quantity.
                  onKeyDown={(e) => handleInputKeyDown(e, showWarehouse ? 'warehouse' : 'qty')}
                  value={
                    productData.product_name && productData.product
                      ? { label: productData.product_name, value: productData.product }
                      : null
                  }
                />
              </div>
              {showWarehouse ? (
                <div>
                  {/* ponytail: the return writers store no godown, so this box
                      decides nothing today. Kept so the line matches the invoice
                      the desk already knows; wire it to the detail table when a
                      return must come back out of the store it left. */}
                  <label htmlFor="">Select Warehouse</label>
                  {warehouse.isLoading === true ? <Loader /> : ''}
                  <WarehouseDropdown
                    id="warehouse"
                    name="warehouse"
                    onChange={handleWarehouseChange}
                    className="w-60 font-medium text-sm p-2 "
                    warehouseDdl={warehouseDdlData}
                    defaultValue={productData?.warehouse || ''}
                  />
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="block relative">
                <InputElement
                  id="qty"
                  value={productData.qty || ''}
                  name="qty"
                  placeholder="Enter Quantity"
                  label="Quantity"
                  type="number"
                  className="py-1 w-full"
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'price')}
                />
                <span className="absolute top-8 right-3 z-50">{unit}</span>
              </div>
              <div className="block relative">
                <InputElement
                  id="price"
                  value={productData.price || ''}
                  name="price"
                  placeholder="Enter Price"
                  label="Enter Price"
                  className="py-1 w-full"
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'addProduct')}
                />
                <span className="absolute top-8 right-3 z-50">{lineTotal}</span>
              </div>
            </div>

            <div className="@container flex flex-wrap gap-x-1 gap-y-1">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editProduct}
                  buttonLoading={buttonLoading}
                  label="Update"
                  responsiveLabel="xl"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={<FiEdit2 className="text-lg ml-2 mr-2" />}
                />
              ) : (
                <ButtonLoading
                  id="addProduct"
                  onClick={addProduct}
                  buttonLoading={buttonLoading}
                  label="Add New"
                  responsiveLabel="xl"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={<FiPlus className="text-lg ml-2 mr-2" />}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addProduct();
                      setTimeout(() => {
                        document.getElementById('product')?.focus();
                      }, 100);
                    }
                  }}
                />
              )}

              {isUpdateButton ? (
                <ButtonLoading
                  onClick={handleUpdate}
                  buttonLoading={updateButtonLoading}
                  label={updateButtonLoading ? 'Updating...' : 'Update'}
                  responsiveLabel="xl"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiEdit className="text-lg ml-2 mr-2" />}
                  disabled={updateButtonLoading}
                />
              ) : (
                <ButtonLoading
                  onClick={handleSave}
                  buttonLoading={saveButtonLoading}
                  label={saveButtonLoading ? 'Saving...' : 'Save'}
                  responsiveLabel="xl"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiSave className="text-lg ml-2 mr-2" />}
                  disabled={saveButtonLoading}
                />
              )}

              <ButtonLoading
                onClick={resetProducts}
                buttonLoading={buttonLoading}
                label="Reset"
                responsiveLabel="xl"
                className="whitespace-nowrap text-center mr-0"
                icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
              />

              <ButtonLoading
                onClick={() => navigate('/dashboard')}
                buttonLoading={false}
                label="Home"
                responsiveLabel="xl"
                className="whitespace-nowrap text-center mr-0"
                icon={<FiHome className="text-lg ml-2 mr-2" />}
              />

              <div className="flex shrink-0 ml-auto">
                <PrintButton
                  onClick={() => handleVoucherPrint({ vr_no: lastVrNo })}
                  label="Print"
                  responsiveLabel="xl"
                  disabled={!lastVrNo}
                />
              </div>
            </div>

            {/* Read while the return is being written.

                One term to a line, the answer under a rule:
                  Total Tk. = Previous Balance + Current Invoice − Discount −
                              Received Amount

                ⚠️ EVERY TERM SHOWS, nought included -- a line that comes and
                goes with its amount leaves the block a different height each
                time, and a term that has vanished is the one the desk most
                wants to see was counted.

                ⚠️ THE ANSWER RUNS THE OTHER WAY FROM THE INVOICE'S. A return
                takes the bill off what we owe and puts back whatever the
                supplier hands over, so the last two terms are ADDED here where
                the invoice subtracts them. Getting one of these round the wrong
                way still balances as arithmetic and is wrong as a ledger. */}
            <div className="ml-auto w-full max-w-xs text-sm font-semibold text-gray-800 dark:text-[rgb(var(--c-text))]">
              {(
                [
                  ['Previous Balance', previousBalance],
                  ['Current Invoice', billAmount],
                  ['Discount', discountAmount],
                  ['Received Amount', receivedAmount],
                ] as [string, number][]
              ).map(([label, amount]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span>{label}</span>
                  <span>{money(amount)}</span>
                </div>
              ))}
              <div className="my-1 border-t border-gray-400" />
              <div className="flex justify-between gap-4 text-base font-bold">
                <span>Total Tk.</span>
                <span>{money(totalTkAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 col-span-full overflow-x-auto">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-[rgb(var(--c-table-head))] dark:text-gray-200">
            <tr className="bg-black-700">
              <th scope="col" className="px-2 py-2 text-center">Sl. No.</th>
              <th scope="col" className="px-2 py-2">Product Name</th>
              <th scope="col" className="px-2 py-2 text-right">Quantity</th>
              <th scope="col" className="px-2 py-2 text-right">Rate</th>
              <th scope="col" className="px-2 py-2 text-right">Total</th>
              <th scope="col" className="px-2 py-2 text-center w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            {formData.products.map((row, index) => (
              <tr key={row.id} className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700">
                <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-center">
                  {index + 1}
                </td>
                <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))]">
                  {row.product_code
                      ? `${row.product_code} - ${row.product_name}`
                      : row.product_name}
                </td>
                <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-right">
                  {row.qty} {row.unit}
                </td>
                <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-right">
                  {row.price}
                </td>
                <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-right">
                  {thousandSeparator(parseFloat((Number(row.price) * Number(row.qty)).toFixed(2)))}
                </td>
                <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-center w-20">
                  <Button onClick={() => handleDelete(row.id)} className="text-red-500 ml-2 text-center">
                    <FiTrash2 className="cursor-pointer text-center" />
                  </Button>
                  <Button onClick={() => editProductItem(row.id)} className="text-green-500 ml-2 text-center">
                    <FiEdit2 className="cursor-pointer text-center" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hidden">
        <VoucherPrintRegistry ref={voucherRegistryRef} rowsPerPage={0} fontSize={12} />
      </div>

      <QuickCustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        entityLabel="Supplier"
        defaultTypeId="2"
        initialName={customerDraftName}
        onCustomerSaved={({ id, name }) => {
          const isCashSupplier = Number(id) === 17;
          setIsReceivedAmtManuallyEdited(false);
          setFormData((prev) => ({
            ...prev,
            account: id,
            accountName: name,
            paymentAmt: isCashSupplier ? prev.paymentAmt : '',
          }));
          // A party created a moment ago owes nothing, so this asks for nought
          // and gets nought -- but it is asked, or the previous supplier's
          // figure would stand against a name it never belonged to.
          void loadPreviousBalance(id);
        }}
      />
    </>
  );
};

export default TilesBusinessPurchaseReturn;
