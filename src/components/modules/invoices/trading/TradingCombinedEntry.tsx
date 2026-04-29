import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  API_TRADING_COMBINED_STORE_URL,
  API_TRADING_COMBINED_SUGGESTIONS_URL,
} from '../../../services/apiRoutes';
import {
  handleInputKeyDown,
  handleSelectKeyDown,
} from '../../../utils/utils-functions/handleKeyDown';
import useCtrlS from '../../../utils/hooks/useCtrlS';

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

const normalizeSuggestionItems = (items: any) =>
  Array.isArray(items)
    ? items
        .map((item: any) => String(item ?? '').trim())
        .filter((item: string, index: number, arr: string[]) => item && arr.indexOf(item) === index)
    : [];

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
  purchaseDiscountAmt: '',
  salesDiscountAmt: '',
  vehicleNumber: '',
  notes: '',
  products: [] as CombinedProduct[],
};

const TradingCombinedEntry = () => {
  const dispatch = useDispatch<any>();
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

  useEffect(() => {
    dispatch(userCurrentBranch());
    dispatch(getDdlWarehouse());
  }, [dispatch]);

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

  const handleVehicleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    if (vehicleSuggestions.length > 0) {
      e.preventDefault();
      setFormData((prev) => ({
        ...prev,
        vehicleNumber: vehicleSuggestions[0],
      }));
    }

    setTimeout(() => {
      handleSelectKeyDown(e, '#salesOrderNumber');
    }, 150);
  };

  const purchaseOrderHandler = (option: any) => {
    setFormData((prev) => ({
      ...prev,
      purchaseOrderNumber: option?.value || '',
      purchaseOrderText: option?.label || '',
    }));
  };

  const salesOrderHandler = (option: any) => {
    setFormData((prev) => ({
      ...prev,
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
    setProductData((prev: any) => ({
      ...prev,
      variance_type: e.target.value,
    }));
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProductData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetProductEditor = () => {
    setProductData(initialProductData);
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
    resetProductEditor();
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

  const resetForm = () => {
    setFormData(initialFormData);
    setProductData(initialProductData);
    setSelectedSupplierOption(null);
    setSelectedCustomerOption(null);
    setVehicleSuggestions([]);
    setNoteSuggestions([]);
  };

  const handleSave = async () => {
    if (!formData.supplierAccount) {
      toast.info('Please select a supplier.');
      return;
    }
    if (!formData.customerAccount) {
      toast.info('Please select a customer.');
      return;
    }
    if (!formData.amount || Number(formData.amount) < 0) {
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
        amount: Number(formData.amount || 0),
        purchaseDiscountAmt: 0,
        salesDiscountAmt: Number(formData.salesDiscountAmt || 0),
        vehicleNumber: formData.vehicleNumber || null,
        notes: formData.notes || null,
        products: formData.products,
      };

      const response = await httpService.post(API_TRADING_COMBINED_STORE_URL, payload);
      const result = response?.data;

      if (result?.success) {
        const data = result?.data?.data || {};
        const purchaseVr = data?.purchase_vr_no ? `Purchase: ${data.purchase_vr_no}` : '';
        const salesVr = data?.sales_vr_no ? `Sales: ${data.sales_vr_no}` : '';
        toast.success([purchaseVr, salesVr].filter(Boolean).join(' | ') || result?.message || 'Saved successfully.');
        resetForm();
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
      <HelmetTitle title="Trading Combined Invoice" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
        <div className="self-start md:self-auto">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label htmlFor="">Select Supplier</label>
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
                    if (e.key === 'Enter') {
                      setTimeout(() => {
                        handleSelectKeyDown(e, '#vehicleNumber');
                      }, 150);
                    }
                  }}
                  acType={'3'}
                />
              </div>
              <div>
                <label htmlFor="">Select Customer</label>
                <DdlMultiline
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
                    if (e.key === 'Enter') {
                      setTimeout(() => {
                        handleSelectKeyDown(e, '#supplierAccount');
                      }, 150);
                    }
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
                <label htmlFor="">Select Purchase Order</label>
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
                <label htmlFor="">Select Sales Order</label>
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
              <InputElement
                id="amount"
                value={String(formData.amount ?? '')}
                name="amount"
                type="number"
                placeholder="Transaction Amount"
                label="Transaction Amount"
                className="py-1"
                onChange={handleFormChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'salesDiscountAmt')}
              />
              <InputElement
                id="salesDiscountAmt"
                value={String(formData.salesDiscountAmt ?? '')}
                name="salesDiscountAmt"
                type="number"
                placeholder="Discount Amount"
                label="Discount Amount"
                className="py-1"
                onChange={handleFormChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'notes')}
              />
              <InputElement
                id="notes"
                value={formData.notes}
                name="notes"
                placeholder="Notes"
                label="Notes"
                className="py-1"
                list="combined-notes-suggestions"
                autoComplete="off"
                onChange={handleFormChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'product')}
              />
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
                  Profit Tk. {thousandSeparator(profitAmount)}
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
              <label htmlFor="">Select Product</label>
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
                    setTimeout(() => {
                      const input = document.getElementById('warehouse');
                      input?.focus();
                    }, 150);
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
              onKeyDown={(e) => handleInputKeyDown(e, 'variance')}
            />
            <InputElement
              id="variance"
              value={productData.variance || ''}
              name="variance"
              type="number"
              placeholder="Weight Variance"
              label="Weight Variance"
              className="py-1"
              onChange={handleProductChange}
              onKeyDown={(e) => handleInputKeyDown(e, 'qty')}
            />
            <div>
              <label htmlFor="">Variance Type</label>
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
              label={saveButtonLoading ? 'Saving...' : 'Save'}
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
	                        {row.variance
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
