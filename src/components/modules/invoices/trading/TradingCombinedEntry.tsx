import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { toast } from 'react-toastify';
import {
  FiEdit2,
  FiHome,
  FiPlus,
  FiRefreshCcw,
  FiSave,
  FiTrash2,
} from 'react-icons/fi';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import InputElement from '../../../utils/fields/InputElement';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import SelectWeightVariance from '../../../utils/utils-functions/SelectWeightVariance';
import OrderDropdown from '../../../utils/utils-functions/OrderDropdown';
import Loader from '../../../../common/Loader';
import Link from '../../../utils/others/Link';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { userCurrentBranch } from '../../branch/branchSlice';
import { getDdlWarehouse } from '../../warehouse/ddlWarehouseSlider';
import QuickCustomerModal from '../sales/QuickCustomerModal';
import httpService from '../../../services/httpService';
import {
  API_CHART_OF_ACCOUNTS_DDL_L4_URL,
  API_ORDERS_DDL_URL,
  API_TRADING_COMBINED_EDIT_URL,
  API_TRADING_COMBINED_STORE_URL,
  API_TRADING_COMBINED_SUGGESTIONS_URL,
  API_TRADING_COMBINED_UPDATE_URL,
} from '../../../services/apiRoutes';
import {
  handleInputKeyDown,
} from '../../../utils/utils-functions/handleKeyDown';
import useCtrlS from '../../../utils/hooks/useCtrlS';
import {
  buildVoucherAutoEditState,
  getCombinedVoucherOpenState,
  getVoucherEditTarget,
} from '../../../utils/utils-functions/voucherEditNavigation';

dayjs.extend(utc);

interface CombinedProduct {
  id: number;
  product: number;
  product_name: string;
  unit: string;
  qty: number;
  purchase_price: number;
  sales_price: number;
  bag?: string;
  warehouse: string;
  variance?: string;
  variance_type?: string;
}

type SuggestionField = 'vehicle_no' | 'notes';
type PartyTarget = 'supplier' | 'customer';
type NotesApplyTo = 'purchase' | 'sales' | 'both';

const normalizeSuggestionItems = (items: any) =>
  Array.isArray(items)
    ? items
      .map((item: any) => String(item ?? '').trim())
      .filter((item: string, index: number, arr: string[]) => item && arr.indexOf(item) === index)
    : [];

const normalizeLookupText = (value: any) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const toBooleanFlag = (value: unknown) => value == 1 || value === '1' || value === true;

const initialProductData = {
  product: '',
  product_name: '',
  unit: '',
  qty: '',
  purchase_price: '',
  sales_price: '',
  bag: '',
  warehouse: '',
  variance: '',
  variance_type: '',
};

const initialFormData = {
  supplierAccount: '',
  supplierName: '',
  customerAccount: '',
  customerName: '',
  purchaseOrderNumber: '',
  purchaseOrderText: '',
  salesOrderNumber: '',
  salesOrderText: '',
  invoice_no: '',
  invoice_date: '',
  amount: '',
  onlySalesPosting: false,
  purchaseDiscountAmt: '',
  salesDiscountAmt: '',
  vehicleNumber: '',
  notes: '',
  notesApplyTo: 'both' as NotesApplyTo,
  products: [] as CombinedProduct[],
};

const TradingCombinedEntry = () => {
  const dispatch = useDispatch<any>();
  const location = useLocation();
  const navigate = useNavigate();
  const warehouse = useSelector((s: any) => s.activeWarehouse);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [buttonLoading] = useState(false);
  const [selectedSupplierOption, setSelectedSupplierOption] = useState<any>(null);
  const [selectedCustomerOption, setSelectedCustomerOption] = useState<any>(null);
  const [vehicleSuggestions, setVehicleSuggestions] = useState<string[]>([]);
  const [noteSuggestions, setNoteSuggestions] = useState<string[]>([]);
  const [productData, setProductData] = useState<any>(initialProductData);
  const [formData, setFormData] = useState(initialFormData);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [partyTarget, setPartyTarget] = useState<PartyTarget>('supplier');
  const [partyDraftName, setPartyDraftName] = useState('');
  const [editingCombinedNumber, setEditingCombinedNumber] = useState('');
  const settings = useSelector((state: any) => state.settings);
  const showCombinedInvoiceNote = toBooleanFlag(settings?.data?.branch?.combined_invoice_note);

  useEffect(() => {
    dispatch(userCurrentBranch());
    dispatch(getDdlWarehouse());
  }, [dispatch]);

  useEffect(() => {
    const combinedNumber = String((location.state as any)?.combinedNumber || '').trim();
    const shouldAutoEdit = Boolean((location.state as any)?.combinedAutoEdit && combinedNumber);

    if (!shouldAutoEdit) return;

    const fetchCombinedEntry = async () => {
      try {
        const response = await httpService.post(API_TRADING_COMBINED_EDIT_URL, {
          combined_number: combinedNumber,
        });
        const result = response?.data;
        const editData = result?.data?.data || {};

        if (!result?.success || !editData?.combined_number) {
          toast.error(result?.message || 'Combined entry not found.');
          return;
        }

        const combinedOpenState = getCombinedVoucherOpenState(editData);
        if (combinedOpenState.hasApprovedVoucher) {
          if (!combinedOpenState.editableVoucherNo) {
            toast.error('Approved voucher cannot be opened.');
            navigate(-1);
            return;
          }

          const editTarget = getVoucherEditTarget(combinedOpenState.editableVoucherNo);
          const editState = buildVoucherAutoEditState(combinedOpenState.editableVoucherNo);

          if (!editTarget || !editState) {
            toast.error('Edit route not found for this voucher.');
            return;
          }

          toast.info('Approved voucher is locked. Opening the editable voucher.');
          navigate(editTarget.route, { state: editState, replace: true });
          return;
        }

        setEditingCombinedNumber(String(editData.combined_number));
        setSelectedSupplierOption({
          value: editData.supplierAccount,
          label: editData.supplierName,
        });
        setSelectedCustomerOption({
          value: editData.customerAccount,
          label: editData.customerName,
        });
        setFormData({
          supplierAccount: String(editData.supplierAccount || ''),
          supplierName: editData.supplierName || '',
          customerAccount: String(editData.customerAccount || ''),
          customerName: editData.customerName || '',
          purchaseOrderNumber: editData.purchaseOrderNumber || '',
          purchaseOrderText: editData.purchaseOrderText || '',
          salesOrderNumber: editData.salesOrderNumber || '',
          salesOrderText: editData.salesOrderText || '',
          invoice_no: editData.invoice_no || '',
          invoice_date: editData.invoice_date || '',
          amount: String(editData.amount ?? ''),
          onlySalesPosting: Boolean(editData.onlySalesPosting),
          purchaseDiscountAmt: String(editData.purchaseDiscountAmt ?? ''),
          salesDiscountAmt: String(editData.salesDiscountAmt ?? ''),
          vehicleNumber: editData.vehicleNumber || '',
          notes: editData.notes || '',
          notesApplyTo: editData.notesApplyTo || editData.notes_apply_to || 'both',
          products: Array.isArray(editData.products) ? editData.products : [],
        });
        resetProductEditor();
      } catch (error: any) {
        toast.error(error?.response?.data?.message || error?.message || 'Failed to load combined entry.');
      }
    };

    void fetchCombinedEntry();
  }, [location.state, navigate]);

  useEffect(() => {
    const fetchSuggestions = async (
      field: SuggestionField,
      query: string,
      setter: React.Dispatch<React.SetStateAction<string[]>>,
    ) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        setter([]);
        return;
      }

      try {
        const response = await httpService.get(API_TRADING_COMBINED_SUGGESTIONS_URL, {
          params: { field, q: trimmedQuery },
        });
        setter(normalizeSuggestionItems(response?.data?.data?.data));
      } catch (error) {
        setter([]);
      }
    };

    const vehicleTimer = window.setTimeout(() => {
      void fetchSuggestions('vehicle_no', formData.vehicleNumber, setVehicleSuggestions);
    }, 250);

    const notesTimer = window.setTimeout(() => {
      void fetchSuggestions('notes', formData.notes, setNoteSuggestions);
    }, 250);

    return () => {
      window.clearTimeout(vehicleTimer);
      window.clearTimeout(notesTimer);
    };
  }, [formData.vehicleNumber, formData.notes]);

  const purchaseTotal = useMemo(
    () =>
      formData.products.reduce(
        (sum, row) => sum + Number(row.qty || 0) * Number(row.purchase_price || 0),
        0,
      ),
    [formData.products],
  );

  const salesTotal = useMemo(
    () =>
      formData.products.reduce(
        (sum, row) => sum + Number(row.qty || 0) * Number(row.sales_price || 0),
        0,
      ),
    [formData.products],
  );

  const profitAmount = salesTotal - purchaseTotal;
  const purchaseLineTotal =
    (parseFloat(productData.qty || '0') || 0) *
    (parseFloat(productData.purchase_price || '0') || 0);
  const salesLineTotal =
    (parseFloat(productData.qty || '0') || 0) *
    (parseFloat(productData.sales_price || '0') || 0);

  const focusField = (fieldId: string, delay = 100) => {
    window.setTimeout(() => {
      const nextElement = document.getElementById(fieldId);
      if (nextElement instanceof HTMLElement) {
        nextElement.focus();

        if (
          'select' in nextElement &&
          typeof (nextElement as HTMLInputElement).select === 'function'
        ) {
          (nextElement as HTMLInputElement).select();
        }
      }
    }, delay);
  };

  const handleEnterFocus = (
    event: React.KeyboardEvent<HTMLElement>,
    nextFieldId: string,
    delay = 100,
  ) => {
    if (event.key !== 'Enter') return;

    focusField(nextFieldId, delay);
  };

  const openPartyModal = (target: PartyTarget, typedName = '') => {
    setPartyTarget(target);
    setPartyDraftName(typedName);
    setShowPartyModal(true);
  };

  const closePartyModal = () => {
    setShowPartyModal(false);
  };

  const handlePartySaved = ({ id, name }: { id: string; name: string }) => {
    if (partyTarget === 'supplier') {
      setSelectedSupplierOption({ value: id, label: name });
      setFormData((prev) => ({
        ...prev,
        supplierAccount: id,
        supplierName: name,
      }));
    } else {
      setSelectedCustomerOption({ value: id, label: name });
      setFormData((prev) => ({
        ...prev,
        customerAccount: id,
        customerName: name,
      }));
    }
  };

  const supplierAccountHandler = (option: any) => {
    setSelectedSupplierOption(option || null);
    setFormData((prev) => ({
      ...prev,
      supplierAccount: option?.value || '',
      supplierName: option?.label || '',
    }));
  };

  const customerAccountHandler = (option: any) => {
    setSelectedCustomerOption(option || null);
    setFormData((prev) => ({
      ...prev,
      customerAccount: option?.value || '',
      customerName: option?.label || '',
    }));
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOnlySalesPostingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      onlySalesPosting: e.target.checked,
    }));
  };

  const handleNotesApplyToChange = (notesApplyTo: NotesApplyTo) => {
    setFormData((prev) => ({
      ...prev,
      notesApplyTo,
    }));
  };

  const handleVehicleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    if (vehicleSuggestions.length > 0) {
      e.preventDefault();
      setFormData((prev) => ({
        ...prev,
        vehicleNumber: vehicleSuggestions[0],
      }));
    }

    focusField('product', 150);
  };

  const purchaseOrderHandler = async (option: any) => {
    if (!option) {
      setFormData((prev) => ({
        ...prev,
        purchaseOrderNumber: '',
        purchaseOrderText: '',
      }));
      return;
    }

    let selectedOrderOption = option;

    if (!option?.label_2 && (option?.label || option?.value)) {
      try {
        const orderResponse = await httpService.get(API_ORDERS_DDL_URL, {
          params: {
            q: String(option?.label || option?.value || ''),
            order_type: '1',
          },
        });
        const orderOptions = orderResponse?.data?.data?.data;
        const matchedOrder = Array.isArray(orderOptions)
          ? orderOptions.find(
            (item: any) =>
              String(item?.value ?? '') === String(option?.value ?? '') ||
              normalizeLookupText(item?.label) === normalizeLookupText(option?.label),
          ) ?? orderOptions[0]
          : null;

        if (matchedOrder) {
          selectedOrderOption = matchedOrder;
        }
      } catch (error) {
        console.error('Failed to resolve selected purchase order details:', error);
      }
    }

    const fallbackSupplierId =
      selectedOrderOption?.supplier_id ??
      selectedOrderOption?.party_id ??
      selectedOrderOption?.order_for_id ??
      selectedOrderOption?.account_id ??
      '';
    const fallbackSupplierName = selectedOrderOption?.label_2 ?? '';

    let resolvedSupplier = {
      id: fallbackSupplierId,
      name: fallbackSupplierName,
    };

    if (fallbackSupplierName) {
      try {
        const response = await httpService.get(API_CHART_OF_ACCOUNTS_DDL_L4_URL, {
          params: {
            searchName: fallbackSupplierName,
            acType: 3,
          },
        });
        const supplierOptions = response?.data?.data?.data;
        const normalizedSupplierName = normalizeLookupText(fallbackSupplierName);
        const matchedSupplier = Array.isArray(supplierOptions)
          ? supplierOptions.find(
            (item: any) =>
              normalizeLookupText(item?.label) === normalizedSupplierName ||
              normalizeLookupText(item?.label).includes(normalizedSupplierName) ||
              normalizedSupplierName.includes(normalizeLookupText(item?.label)),
          ) ?? supplierOptions[0]
          : null;

        if (matchedSupplier) {
          resolvedSupplier = {
            id: matchedSupplier?.value ?? resolvedSupplier.id,
            name: matchedSupplier?.label ?? resolvedSupplier.name,
          };
        }
      } catch (error) {
        console.error('Failed to resolve supplier from purchase order:', error);
      }
    }

    setSelectedSupplierOption(
      resolvedSupplier.name
        ? {
          value: resolvedSupplier.id || resolvedSupplier.name,
          label: resolvedSupplier.name,
        }
        : null,
    );

    setFormData((prev) => ({
      ...prev,
      supplierAccount: resolvedSupplier.id || '',
      supplierName: resolvedSupplier.name || '',
      purchaseOrderNumber: option?.value || '',
      purchaseOrderText: option?.label || '',
    }));
  };

  const salesOrderHandler = async (option: any) => {
    if (!option) {
      setFormData((prev) => ({
        ...prev,
        salesOrderNumber: '',
        salesOrderText: '',
      }));
      return;
    }

    let selectedOrderOption = option;

    if (!option?.label_2 && (option?.label || option?.value)) {
      try {
        const orderResponse = await httpService.get(API_ORDERS_DDL_URL, {
          params: {
            q: String(option?.label || option?.value || ''),
            order_type: '2',
          },
        });
        const orderOptions = orderResponse?.data?.data?.data;
        const matchedOrder = Array.isArray(orderOptions)
          ? orderOptions.find(
            (item: any) =>
              String(item?.value ?? '') === String(option?.value ?? '') ||
              normalizeLookupText(item?.label) === normalizeLookupText(option?.label),
          ) ?? orderOptions[0]
          : null;

        if (matchedOrder) {
          selectedOrderOption = matchedOrder;
        }
      } catch (error) {
        console.error('Failed to resolve selected sales order details:', error);
      }
    }

    const fallbackCustomerId =
      selectedOrderOption?.customer_id ??
      selectedOrderOption?.party_id ??
      selectedOrderOption?.order_for_id ??
      selectedOrderOption?.customer?.id ??
      selectedOrderOption?.account_id ??
      '';
    const fallbackCustomerName = selectedOrderOption?.label_2 ?? '';

    let resolvedCustomer = {
      id: fallbackCustomerId,
      name: fallbackCustomerName,
    };

    if (fallbackCustomerName) {
      try {
        const response = await httpService.get(API_CHART_OF_ACCOUNTS_DDL_L4_URL, {
          params: {
            searchName: fallbackCustomerName,
            acType: 3,
          },
        });
        const customerOptions = response?.data?.data?.data;
        const normalizedCustomerName = normalizeLookupText(fallbackCustomerName);
        const matchedCustomer = Array.isArray(customerOptions)
          ? customerOptions.find(
            (item: any) =>
              normalizeLookupText(item?.label) === normalizedCustomerName ||
              normalizeLookupText(item?.label).includes(normalizedCustomerName) ||
              normalizedCustomerName.includes(normalizeLookupText(item?.label)),
          ) ?? customerOptions[0]
          : null;

        if (matchedCustomer) {
          resolvedCustomer = {
            id: matchedCustomer?.value ?? resolvedCustomer.id,
            name: matchedCustomer?.label ?? resolvedCustomer.name,
          };
        }
      } catch (error) {
        console.error('Failed to resolve customer from sales order:', error);
      }
    }

    setSelectedCustomerOption(
      resolvedCustomer.name
        ? {
          value: resolvedCustomer.id || resolvedCustomer.name,
          label: resolvedCustomer.name,
        }
        : null,
    );

    setFormData((prev) => ({
      ...prev,
      customerAccount: resolvedCustomer.id || '',
      customerName: resolvedCustomer.name || '',
      salesOrderNumber: option?.value || '',
      salesOrderText: option?.label || '',
    }));
  };

  const productSelectHandler = (option: any) => {
    setProductData((prev: any) => ({
      ...prev,
      product: option?.value || '',
      product_name: option?.label || '',
      unit: option?.label_5 || '',
      purchase_price: String(option?.label_3 ?? ''),
      sales_price: String(option?.label_4 ?? ''),
    }));
  };

  const handleVarianceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextVarianceType = e.target.value;
    setProductData((prev: any) => ({
      ...prev,
      variance_type: nextVarianceType,
      variance:
        nextVarianceType && nextVarianceType !== 'Not Applicable'
          ? prev.variance
          : '',
    }));
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProductData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetProductEditor = ({ keepProduct = false } = {}) => {
    setProductData((prev: any) => ({
      ...initialProductData,
      ...(keepProduct
        ? {
          product: prev.product,
          product_name: prev.product_name,
          unit: prev.unit,
          purchase_price: prev.purchase_price,
          sales_price: prev.sales_price,
        }
        : {}),
    }));
    setEditingProductId(null);
  };

  const addProduct = () => {
    if (!productData.product) {
      toast.info('Please select a product.');
      return;
    }
    if (!(Number(productData.qty) > 0)) {
      toast.info('Please enter a valid quantity.');
      return;
    }
    if (!(Number(productData.purchase_price) >= 0)) {
      toast.info('Please enter a valid purchase price.');
      return;
    }
    if (!(Number(productData.sales_price) >= 0)) {
      toast.info('Please enter a valid sales price.');
      return;
    }

    const newProduct: CombinedProduct = {
      id: editingProductId ?? Date.now(),
      product: Number(productData.product),
      product_name: productData.product_name || '',
      unit: productData.unit || '',
      qty: Number(productData.qty) || 0,
      purchase_price: Number(productData.purchase_price) || 0,
      sales_price: Number(productData.sales_price) || 0,
      bag: productData.bag || '',
      warehouse: productData.warehouse || '',
      variance: productData.variance || '',
      variance_type: productData.variance_type || '',
    };

    setFormData((prev) => ({
      ...prev,
      products: editingProductId
        ? prev.products.map((item) => (item.id === editingProductId ? newProduct : item))
        : [...prev.products, newProduct],
    }));
    resetProductEditor({ keepProduct: true });
  };

  const handleEdit = (row: CombinedProduct) => {
    setEditingProductId(row.id);
    setProductData({
      product: String(row.product || ''),
      product_name: row.product_name || '',
      unit: row.unit || '',
      qty: String(row.qty || ''),
      purchase_price: String(row.purchase_price || ''),
      sales_price: String(row.sales_price || ''),
      bag: row.bag || '',
      warehouse: row.warehouse || '',
      variance: row.variance || '',
      variance_type: row.variance_type || '',
    });
  };

  const handleDelete = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((item) => item.id !== id),
    }));
    if (editingProductId === id) {
      resetProductEditor();
    }
  };

  const resetForm = ({
    keepParties = false,
    keepProduct = false,
    keepOrders = false,
    keepNotesApplyTo = false,
  } = {}) => {
    setFormData((prev) => ({
      ...initialFormData,
      ...(keepParties
        ? {
          supplierAccount: prev.supplierAccount,
          supplierName: prev.supplierName,
          customerAccount: prev.customerAccount,
          customerName: prev.customerName,
        }
        : {}),
      ...(keepOrders
        ? {
          purchaseOrderNumber: prev.purchaseOrderNumber,
          purchaseOrderText: prev.purchaseOrderText,
          salesOrderNumber: prev.salesOrderNumber,
          salesOrderText: prev.salesOrderText,
        }
        : {}),
      ...(keepNotesApplyTo ? { notesApplyTo: prev.notesApplyTo } : {}),
    }));
    resetProductEditor({ keepProduct });
    if (!keepParties) {
      setSelectedSupplierOption(null);
      setSelectedCustomerOption(null);
    }
    setVehicleSuggestions([]);
    setNoteSuggestions([]);
    setEditingCombinedNumber('');
  };

  const handleSave = async () => {
    const amount = Number(formData.amount || 0);

    if (!formData.supplierAccount) {
      toast.info('Please select Supplier');
      focusField('supplierAccount');
      return;
    }
    if (!formData.customerAccount) {
      toast.info('Please select Customer');
      focusField('customerAccount');
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      toast.info('Please enter the trading amount.');
      return;
    }
    if (formData.products.length === 0) {
      toast.info('Please add some products.');
      return;
    }

    setSaveButtonLoading(true);

    try {
      const payload = {
        supplierAccount: formData.supplierAccount,
        supplierName: formData.supplierName,
        customerAccount: formData.customerAccount,
        customerName: formData.customerName,
        purchaseOrderNumber: formData.purchaseOrderNumber || null,
        salesOrderNumber: formData.salesOrderNumber || null,
        invoice_no: formData.invoice_no || null,
        invoice_date: formData.invoice_date || null,
        amount,
        onlySalesPosting: Boolean(formData.onlySalesPosting),
        purchaseDiscountAmt: 0,
        salesDiscountAmt: Number(formData.salesDiscountAmt || 0),
        vehicleNumber: formData.vehicleNumber || null,
        notes: formData.notes || null,
        notesApplyTo: showCombinedInvoiceNote ? formData.notesApplyTo || 'both' : 'both',
        products: formData.products,
        ...(editingCombinedNumber ? { combined_number: editingCombinedNumber } : {}),
      };

      const response = await httpService.post(
        editingCombinedNumber ? API_TRADING_COMBINED_UPDATE_URL : API_TRADING_COMBINED_STORE_URL,
        payload,
      );
      const result = response?.data;

      if (result?.success) {
        const data = result?.data?.data || {};
        const purchaseVr = data?.purchase_vr_no ? `Purchase: ${data.purchase_vr_no}` : '';
        const salesVr = data?.sales_vr_no ? `Sales: ${data.sales_vr_no}` : '';
        toast.success([purchaseVr, salesVr].filter(Boolean).join(' | ') || result?.message || 'Saved successfully.');
        resetForm({
          keepParties: true,
          keepProduct: true,
          keepOrders: true,
          keepNotesApplyTo: true,
        });
        focusField('product');
      } else {
        toast.error(result?.message || 'Failed to save combined trading entry.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to save combined trading entry.');
    } finally {
      setSaveButtonLoading(false);
    }
  };

  useCtrlS(handleSave);

  return (
    <>
      <HelmetTitle title={editingCombinedNumber ? 'Edit Combined Invoice' : 'Combined Invoice'} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
        <div className="self-start md:self-auto">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label htmlFor="" className='text-black dark:text-white'>Select Supplier</label>
                <DdlMultiline
                  id="supplierAccount"
                  className="h-9.5"
                  onSelect={supplierAccountHandler}
                  actionOptionLabel="+ Add New Supplier"
                  onActionSelect={(typedName: string) => openPartyModal('supplier', typedName)}
                  value={
                    selectedSupplierOption ||
                    (formData.supplierAccount
                      ? { value: formData.supplierAccount, label: formData.supplierName }
                      : null)
                  }
                  onKeyDown={(e) => {
                    handleEnterFocus(e, 'customerAccount', 150);
                  }}
                  acType={'3'}
                />
              </div>
              <div>
                <label htmlFor="" className='text-black dark:text-white'>Select Customer</label>
                <DdlMultiline
                  id="customerAccount"
                  className="h-9.5"
                  onSelect={customerAccountHandler}
                  actionOptionLabel="+ Add New Customer"
                  onActionSelect={(typedName: string) => openPartyModal('customer', typedName)}
                  value={
                    selectedCustomerOption ||
                    (formData.customerAccount
                      ? { value: formData.customerAccount, label: formData.customerName }
                      : null)
                  }
                  onKeyDown={(e) => {
                    handleEnterFocus(e, 'vehicleNumber', 150);
                  }}
                  acType={'3'}
                />
              </div>

              <div>
                <InputElement
                  id="vehicleNumber"
                  value={formData.vehicleNumber}
                  name="vehicleNumber"
                  placeholder="Vehicle Number"
                  label="Vehicle Number"
                  className="py-1 h-9.5"
                  list="combined-vehicle-suggestions"
                  autoComplete="off"
                  onChange={handleFormChange}
                  onKeyDown={handleVehicleNumberKeyDown}
                />
                <datalist id="combined-vehicle-suggestions">
                  {vehicleSuggestions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="relative">
                <div>
                  <label htmlFor="" className='text-black dark:text-white'>Select Purchase Order</label>
                  <OrderDropdown
                    id="purchaseOrderNumber"
                    name="purchaseOrderNumber"
                    onSelect={purchaseOrderHandler}
                    value={
                      formData.purchaseOrderNumber
                        ? { value: formData.purchaseOrderNumber, label: formData.purchaseOrderText }
                        : null
                    }
                    orderType="1"
                    onKeyDown={(e) => handleInputKeyDown(e, 'salesOrderNumber')}
                  />
                </div>
              </div>
              <div className="relative">
                <div>
                  <label htmlFor="" className='text-black dark:text-white'>Select Sales Order</label>
                  <OrderDropdown
                    id="salesOrderNumber"
                    name="salesOrderNumber"
                    onSelect={salesOrderHandler}
                    value={
                      formData.salesOrderNumber
                        ? { value: formData.salesOrderNumber, label: formData.salesOrderText }
                        : null
                    }
                    orderType="2"
                    onKeyDown={(e) => handleInputKeyDown(e, 'amount')}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label htmlFor="amount" className='text-black dark:text-white'>Amount Tk.</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                      <span className='font-semibold'> {formData.onlySalesPosting ? 'Sales' : 'Both'}</span>
                    </span>
                    <label
                      htmlFor="onlySalesPosting"
                      className="relative inline-flex cursor-pointer items-center"
                      title="It helps to identify whether the transaction amount is for sales only or includes both purchase and sales."
                    >
                      <input
                        id="onlySalesPosting"
                        name="onlySalesPosting"
                        type="checkbox"
                        checked={Boolean(formData.onlySalesPosting)}
                        onChange={handleOnlySalesPostingChange}
                        className="peer sr-only"
                      />
                      <span
                        className={`relative h-5 w-10 rounded-full border border-blue-500/70 transition-colors ${formData.onlySalesPosting ? 'bg-blue-600' : 'bg-slate-700'
                          }`}
                      >
                        <span
                          className={`absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition duration-200 ${formData.onlySalesPosting ? 'translate-x-[18px]' : 'translate-x-0'
                            }`}
                        />
                      </span>
                    </label>
                  </div>
                </div>
                <InputElement
                  id="amount"
                  value={String(formData.amount ?? '')}
                  name="amount"
                  type="number"
                  placeholder="Transaction Amount"
                  label=""
                  className="py-1"
                  onChange={handleFormChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'salesDiscountAmt')}
                />
              </div>
              <InputElement
                id="salesDiscountAmt"
                value={String(formData.salesDiscountAmt ?? '')}
                name="salesDiscountAmt"
                type="number"
                placeholder="Discount Amount"
                label="Discount Amount"
                className="py-1 mt-1"
                onChange={handleFormChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'notes')}
              />
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label htmlFor="notes" className="text-black dark:text-white">
                    Notes
                  </label>

                  {showCombinedInvoiceNote && (
                    <div className="inline-flex h-5 overflow-hidden rounded border border-slate-500 bg-slate-100 text-[10px] font-semibold leading-none dark:border-slate-600 dark:bg-slate-800">
                      {[
                        { value: 'both', label: 'Both' },
                        { value: 'purchase', label: 'Purchase' },
                        { value: 'sales', label: 'Sales' }
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => handleNotesApplyToChange(item.value as NotesApplyTo)}
                          className={`px-2 transition ${formData.notesApplyTo === item.value
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  id="notes"
                  value={formData.notes}
                  name="notes"
                  placeholder="Notes"
                  list="combined-notes-suggestions"
                  autoComplete="off"
                  onChange={handleFormChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'product')}
                  className="w-full form-input rounded-xs border bg-white px-3 py-1 text-gray-600 outline-none focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-transparent dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                />
              </div>
              <datalist id="combined-notes-suggestions">
                {noteSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-0">
              <div className="mt-4">
                <p className="text-sm font-bold dark:text-white">
                  Purchase Tk. {thousandSeparator(purchaseTotal)}
                </p>
              </div>
              <div className="mt-4">
                <p className="text-sm font-bold dark:text-white">
                  Sales Tk. {thousandSeparator(salesTotal)}
                </p>
              </div>

              <div className="mt-4">
                <p className={`text-sm font-bold ${profitAmount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {profitAmount > 0 ? 'Profit Tk.' : profitAmount < 0 ? 'Loss Tk.' : ''} {thousandSeparator(Math.abs(profitAmount))}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="">
          {warehouse.isLoading ? <Loader /> : null}
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label htmlFor="" className='text-black dark:text-white'>
                  Select Product
                </label>
                <ProductDropdown
                  id="product"
                  name="product"
                  className="h-9"
                  onSelect={productSelectHandler}
                  value={
                    productData.product_name && productData.product
                      ? { label: productData.product_name, value: productData.product }
                      : null
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      focusField('bag', 150);
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InputElement
                id="bag"
                value={productData.bag || ''}
                name="bag"
                type="number"
                placeholder="Bag Number"
                label="Bag Number"
                className="py-1"
                onChange={handleProductChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'qty')}
              />
              <InputElement
                id="variance"
                value={productData.variance || ''}
                name="variance"
                type="number"
                placeholder="Weight Variance"
                label="Weight Variance"
                className="py-1"
                disabled={!productData.variance_type || productData.variance_type === 'Not Applicable'}
                onChange={handleProductChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'qty')}
              />
              <div>
                <label htmlFor="" className='text-black dark:text-white'>
                  Variance Type
                </label>
                <SelectWeightVariance
                  value={productData.variance_type}
                  onChange={handleVarianceTypeChange}
                  defaultValue={productData?.variance_type || ''}
                  className="w-full h-8.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="relative">
                <InputElement
                  id="qty"
                  value={productData.qty || ''}
                  name="qty"
                  type="number"
                  placeholder="Quantity"
                  label="Quantity"
                  className="py-1"
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'purchase_price')}
                />
                <span className="absolute right-3 top-8 z-50 text-xs">{productData.unit || ''}</span>
              </div>
              <div className="relative">
                <InputElement
                  id="purchase_price"
                  value={productData.purchase_price || ''}
                  name="purchase_price"
                  type="number"
                  placeholder="Enter Purchase Rate"
                  label="Purchase Rate"
                  className="py-1"
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'sales_price')}
                />
                <span className="absolute right-3 top-8 z-50 text-xs">
                  {thousandSeparator(purchaseLineTotal)}
                </span>
              </div>
              <div className="relative">
                <InputElement
                  id="sales_price"
                  value={productData.sales_price || ''}
                  name="sales_price"
                  type="number"
                  placeholder="Sales Rate"
                  label="Sales Rate"
                  className="py-1"
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'addProduct')}
                />
                <span className="absolute right-3 top-8 z-50 text-xs">
                  {thousandSeparator(salesLineTotal)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-x-1 gap-y-1 mt-2">
              <ButtonLoading
                id="addProduct"
                onClick={addProduct}
                buttonLoading={buttonLoading}
                label={editingProductId ? 'Update Item' : 'Add New'}
                className="whitespace-nowrap text-center mr-0 py-1.5"
                icon={
                  editingProductId ? (
                    <FiEdit2 className="text-white text-lg ml-2 mr-2" />
                  ) : (
                    <FiPlus className="text-white text-lg ml-2 mr-2" />
                  )
                }
              />
              <ButtonLoading
                onClick={handleSave}
                buttonLoading={saveButtonLoading}
                label={saveButtonLoading ? 'Saving...' : editingCombinedNumber ? 'Update' : 'Save'}
                className="whitespace-nowrap text-center mr-0"
                icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
                disabled={saveButtonLoading}
              />
              <ButtonLoading
                onClick={resetForm}
                buttonLoading={buttonLoading}
                label="Reset"
                className="whitespace-nowrap text-center mr-0"
                icon={<FiRefreshCcw className="text-white text-lg ml-2 mr-2" />}
              />
              <Link to="/dashboard" className="text-nowrap justify-center mr-0">
                <FiHome className="text-white text-lg ml-2 mr-2" />
                <span className="hidden md:block">Home</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 col-span-2 overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-300 dark:bg-gray-700 dark:text-gray-200">
              <tr>
                <th className="px-2 py-2 text-center">SL. NO.</th>
                <th className="px-2 py-2">PRODUCT NAME</th>
                <th className="px-2 py-2 text-right">WEIGHT VARIANCE</th>
                <th className="px-2 py-2 text-right">QUANTITY</th>
                <th className="px-2 py-2 text-right">PURCHASE RATE</th>
                <th className="px-2 py-2 text-right">PURCHASE</th>
                <th className="px-2 py-2 text-right">SALES RATE</th>
                <th className="px-2 py-2 text-right">TOTAL</th>
                <th className="px-2 py-2 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {formData.products.map((row, index) => {
                const rowPurchaseTotal = Number(row.qty) * Number(row.purchase_price);
                const rowSalesTotal = Number(row.qty) * Number(row.sales_price);
                return (
                  <tr
                    key={row.id}
                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                  >
                    <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-white">
                      {index + 1}
                    </td>
                    <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">
                      {row.product_name}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-white">
                      {row.variance && row.variance_type && row.variance_type !== 'Not Applicable'
                        ? `(${row.variance_type || '-'}) ${thousandSeparator(Number(row.variance))}`
                        : '-'}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-white">
                      {thousandSeparator(Number(row.qty))} {row.unit}
                    </td>

                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-white">
                      {thousandSeparator(Number(row.purchase_price))}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-white">
                      {thousandSeparator(rowPurchaseTotal)}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-white">
                      {thousandSeparator(Number(row.sales_price))}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-white">
                      {thousandSeparator(rowSalesTotal)}
                    </td>
                    <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-white">
                      <button
                        onClick={() => handleEdit(row)}
                        className="text-blue-500 text-center"
                        type="button"
                      >
                        <FiEdit2 className="cursor-pointer text-center" />
                      </button>
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="text-red-500 ml-2 text-center"
                        type="button"
                      >
                        <FiTrash2 className="cursor-pointer text-center" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <QuickCustomerModal
        isOpen={showPartyModal}
        onClose={closePartyModal}
        initialName={partyDraftName}
        entityLabel={partyTarget === 'supplier' ? 'Supplier' : 'Customer'}
        defaultTypeId={partyTarget === 'supplier' ? '2' : undefined}
        onCustomerSaved={handlePartySaved}
      />
    </>
  );
};

export default TradingCombinedEntry;
