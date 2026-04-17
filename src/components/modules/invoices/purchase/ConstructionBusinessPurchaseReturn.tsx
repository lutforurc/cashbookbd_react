import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { FiEdit2, FiHome, FiPlus, FiRefreshCcw, FiSave, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { getDdlWarehouse } from '../../warehouse/ddlWarehouseSlider';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import InputElement from '../../../utils/fields/InputElement';
import Link from '../../../utils/others/Link';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import WarehouseDropdown from '../../../utils/utils-functions/WarehouseDropdown';
import InputDatePicker from '../../../utils/fields/DatePicker';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import { validateForm } from '../../../utils/utils-functions/validationUtils';
import { invoiceMessage } from '../../../utils/utils-functions/invoiceMessage';
import { validateProductData } from '../../../utils/utils-functions/productValidationHandler';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import useCtrlS from '../../../utils/hooks/useCtrlS';
import QuickCustomerModal from '../sales/QuickCustomerModal';
import httpService from '../../../services/httpService';
import {
  API_TRADING_PURCHASE_SUGGESTIONS_URL,
  WEB_PURCHASE_RETURN_STORE_URL,
} from '../../../services/apiRoutes';

interface Product {
  id: number;
  product: number;
  product_name: string;
  unit: string;
  qty: string;
  price: string;
  warehouse: string;
}

interface FormData {
  account: string;
  accountName: string;
  invoice_no: string;
  invoice_date: string;
  paymentAmt: string;
  discountAmt: number;
  vehicleNumber: string;
  notes: string;
  products: Product[];
}

const normalizeSuggestionItems = (items: any) =>
  Array.isArray(items)
    ? items
        .map((item: any) => String(item ?? '').trim())
        .filter((item: string, index: number, arr: string[]) => item && arr.indexOf(item) === index)
    : [];

const initialFormData: FormData = {
  account: '',
  accountName: '',
  invoice_no: '',
  invoice_date: '',
  paymentAmt: '',
  discountAmt: 0,
  vehicleNumber: '',
  notes: '',
  products: [],
};

const ConstructionBusinessPurchaseReturn = () => {
  const dispatch = useDispatch<any>();
  const warehouse = useSelector((s: any) => s.activeWarehouse);
  const [warehouseDdlData, setWarehouseDdlData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [unit, setUnit] = useState<string | null>(null);
  const [lineTotal, setLineTotal] = useState<number>(0);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [productData, setProductData] = useState<any>({});
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateId, setUpdateId] = useState<number | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerDraftName, setCustomerDraftName] = useState('');
  const [noteSuggestions, setNoteSuggestions] = useState<string[]>([]);
  const [isPaymentAmtManuallyEdited, setIsPaymentAmtManuallyEdited] = useState(false);

  useEffect(() => {
    dispatch(getDdlWarehouse());
  }, [dispatch]);

  useEffect(() => {
    if (warehouse?.data && warehouse.data.length > 0) {
      setWarehouseDdlData(warehouse.data);
    }
  }, [warehouse?.data]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      const trimmedQuery = formData.notes.trim();
      if (!trimmedQuery) {
        setNoteSuggestions([]);
        return;
      }

      try {
        const response = await httpService.get(API_TRADING_PURCHASE_SUGGESTIONS_URL, {
          params: { field: 'notes', q: trimmedQuery },
        });
        setNoteSuggestions(normalizeSuggestionItems(response?.data?.data?.data));
      } catch (error) {
        setNoteSuggestions([]);
      }
    };

    const timer = window.setTimeout(() => {
      void fetchSuggestions();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [formData.notes]);

  useEffect(() => {
    const total = formData.products.reduce((acc, product) => {
      const qty = parseFloat(product.qty || '0') || 0;
      const price = parseFloat(product.price || '0') || 0;
      return acc + qty * price;
    }, 0);

    const discount = parseFloat(formData.discountAmt?.toString() || '0') || 0;
    const nextPaymentAmt = Math.max(0, total - discount).toString();
    const isCashSupplier = Number(formData.account) === 17;

    if (isCashSupplier || !isPaymentAmtManuallyEdited) {
      setFormData((prev) =>
        prev.paymentAmt === nextPaymentAmt ? prev : { ...prev, paymentAmt: nextPaymentAmt },
      );
    }
  }, [formData.account, formData.discountAmt, formData.products, isPaymentAmtManuallyEdited]);

  const supplierAccountHandler = (option: any) => {
    const isCashSupplier = Number(option?.value) === 17;
    setIsPaymentAmtManuallyEdited(false);
    setFormData((prev) => ({
      ...prev,
      account: option?.value || '',
      accountName: option?.label || '',
      paymentAmt: isCashSupplier ? prev.paymentAmt : '0',
    }));
  };

  const productSelectHandler = (option: any) => {
    const price = Number(option?.label_3 || 0);
    const qty = parseFloat(productData.qty || '0') || 0;
    setUnit(option?.label_5 || null);
    setProductData((prev: any) => ({
      ...prev,
      product: option?.value || 0,
      product_name: option?.label || '',
      unit: option?.label_5 || '',
      price: price.toString(),
    }));
    setLineTotal(Number((qty * price).toFixed(2)));
  };

  const handleStartDate = (date: Date | null) => {
    setStartDate(date);
    setFormData((prev) => ({
      ...prev,
      invoice_date: date ? dayjs(date).format('YYYY-MM-DD') : '',
    }));
  };

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'paymentAmt' && Number(formData.account) !== 17) {
      setIsPaymentAmtManuallyEdited(true);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'discountAmt' ? (isNaN(parseFloat(value)) ? 0 : parseFloat(value)) : value,
    }));
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProductData((prev: any) => {
      const next = { ...prev, [name]: value };
      const qty = parseFloat(next.qty || '0') || 0;
      const price = parseFloat(next.price || '0') || 0;
      setLineTotal(Number((qty * price).toFixed(2)));
      return next;
    });
  };

  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProductData((prev: any) => ({ ...prev, warehouse: e.target.value }));
  };

  const addProduct = () => {
    if (!validateProductData(productData)) return;

    const newProduct: Product = {
      id: Date.now(),
      product: productData.product || 0,
      product_name: productData.product_name || '',
      unit: productData.unit || '',
      qty: productData.qty || '',
      price: productData.price || '',
      warehouse: productData.warehouse || '',
    };

    setFormData((prev) => ({ ...prev, products: [...prev.products, newProduct] }));
    setProductData({});
    setUnit(null);
    setLineTotal(0);
  };

  const editProduct = () => {
    if (!validateProductData(productData) || updateId === null) return;

    const updatedProduct: Product = {
      id: formData.products[updateId]?.id ?? Date.now(),
      product: productData.product || 0,
      product_name: productData.product_name || '',
      unit: productData.unit || '',
      qty: productData.qty || '',
      price: productData.price || '',
      warehouse: productData.warehouse || '',
    };

    setFormData((prev) => ({
      ...prev,
      products: prev.products.map((item, index) => (index === updateId ? updatedProduct : item)),
    }));
    setProductData({});
    setUnit(null);
    setLineTotal(0);
    setUpdateId(null);
    setIsUpdating(false);
  };

  const editProductItem = (productId: number) => {
    const productIndex = formData.products.findIndex((item) => item.id === productId);
    if (productIndex === -1) return;

    const product = formData.products[productIndex];
    setProductData(product);
    setUnit(product.unit);
    setLineTotal(Number(product.qty) * Number(product.price));
    setUpdateId(productIndex);
    setIsUpdating(true);
  };

  const handleDelete = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((product) => product.id !== id),
    }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setProductData({});
    setStartDate(null);
    setUnit(null);
    setLineTotal(0);
    setUpdateId(null);
    setIsUpdating(false);
    setIsPaymentAmtManuallyEdited(false);
  };

  const handleSave = async () => {
    const validationMessages = validateForm(formData, invoiceMessage);
    if (validationMessages) {
      toast.info(validationMessages);
      return;
    }
    if (!formData.paymentAmt) {
      toast.info('Please enter payment amount');
      return;
    }
    if (formData.products.length === 0) {
      toast.info('Please add some products.');
      return;
    }

    const payload = {
      supplier_id: formData.account,
      purchase_invoice_number: formData.invoice_no,
      purchase_invoice_date: formData.invoice_date,
      total: formData.products.reduce((sum, row) => sum + Number(row.qty) * Number(row.price), 0),
      discount: formData.discountAmt,
      netpayment: formData.paymentAmt,
      notes: formData.notes,
      vehicle_no: formData.vehicleNumber,
      table_data: formData.products.map((row) => ({
        code: row.product,
        qty: row.qty,
        price: row.price,
        godown: row.warehouse || '',
      })),
    };

    setButtonLoading(true);
    try {
      const response = await httpService.post(WEB_PURCHASE_RETURN_STORE_URL, payload);
      const voucherNo = response?.data?.vr_no || response?.data?.challan || 'Saved successfully';
      toast.success(`Purchase return saved. ${voucherNo}`);
      resetForm();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to save purchase return');
    } finally {
      setButtonLoading(false);
    }
  };

  useCtrlS(handleSave);

  const totalAmount = formData.products.reduce(
    (sum, row) => sum + Number(row.qty) * Number(row.price),
    0,
  );

  return (
    <>
      <HelmetTitle title="Construction Purchase Return" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
        {buttonLoading ? <Loader /> : null}
        <div className="self-start md:self-auto">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-black dark:text-white" htmlFor="">
                  Select Supplier
                </label>
                <div className="flex items-start gap-1">
                  <div className="min-w-0 flex-1">
                    <DdlMultiline
                      id="account"
                      name="account"
                      onSelect={supplierAccountHandler}
                      actionOptionLabel="+ Add New Supplier"
                      onActionSelect={(typedName?: string) => {
                        setCustomerDraftName(typedName || '');
                        setShowCustomerModal(true);
                      }}
                      value={
                        formData.account
                          ? { value: formData.account, label: formData.accountName }
                          : null
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setTimeout(() => {
                            const input = document.querySelector('#notes') as HTMLInputElement | null;
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
                id="notes"
                value={formData.notes}
                name="notes"
                placeholder={'Notes'}
                label={'Notes'}
                className={'py-1'}
                list="purchase-return-notes-suggestions"
                autoComplete="off"
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'invoice_no')}
              />
              <datalist id="purchase-return-notes-suggestions">
                {noteSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InputElement
                id="invoice_no"
                value={formData.invoice_no}
                name="invoice_no"
                placeholder={'Purchase Invoice Number'}
                label={'Purchase Invoice Number'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'invoice_date')}
              />
              <div className="w-full">
                <label className="text-black dark:text-white" htmlFor="">
                  Purchase Invoice Date
                </label>
                <InputDatePicker
                  id="invoice_date"
                  name="invoice_date"
                  setCurrentDate={handleStartDate}
                  className="w-full p-1 "
                  selectedDate={startDate}
                  setSelectedDate={setStartDate}
                  onKeyDown={(e) => handleInputKeyDown(e, 'vehicleNumber')}
                />
              </div>
              <InputElement
                id="vehicleNumber"
                value={formData.vehicleNumber}
                name="vehicleNumber"
                placeholder={'Vehicle Number'}
                label={'Vehicle Number'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'discountAmt')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InputElement
                id="discountAmt"
                value={formData.discountAmt.toString()}
                name="discountAmt"
                placeholder={'Discount Amount'}
                label={'Discount Amount'}
                className={'py-1 text-right'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'paymentAmt')}
              />
              <InputElement
                id="paymentAmt"
                value={formData.paymentAmt}
                name="paymentAmt"
                placeholder={'Cash Received'}
                disabled={Number(formData.account) === 17}
                label={'Cash Received'}
                className={'py-1 text-right'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'product')}
              />
              <div className="grid grid-cols-1 md:gap-x-1 -mb-1">
                <span>Total Tk.</span>
                <span className="text-xs font-bold dark:text-white">
                  {thousandSeparator(Math.floor(totalAmount), 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-black dark:text-white" htmlFor="">
                  Select Product
                </label>
                <ProductDropdown
                  id="product"
                  name="product"
                  onSelect={productSelectHandler}
                  defaultValue={
                    productData.product_name && productData.product
                      ? { label: productData.product_name, value: productData.product }
                      : null
                  }
                  value={
                    productData.product_name && productData.product
                      ? { label: productData.product_name, value: productData.product }
                      : null
                  }
                />
              </div>
              <div>
                <label className="text-black dark:text-white" htmlFor="">
                  Select Warehouse
                </label>
                {warehouse.isLoading === true ? <Loader /> : ''}
                <WarehouseDropdown
                  id="warehouse"
                  onChange={handleWarehouseChange}
                  className="w-60 font-medium text-sm p-2 "
                  warehouseDdl={warehouseDdlData}
                  defaultValue={productData?.warehouse || ''}
                  onKeyDown={(e) => handleInputKeyDown(e, 'qty')}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="block relative">
                <InputElement
                  id="qty"
                  value={productData.qty || ''}
                  name="qty"
                  placeholder={'Enter Quantity'}
                  label={'Quantity'}
                  type="number"
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'price')}
                />
                <span className="absolute top-7 right-3 z-50">{unit}</span>
              </div>
              <div className="block relative">
                <InputElement
                  id="price"
                  value={productData.price || ''}
                  name="price"
                  type="number"
                  placeholder={'Enter Price'}
                  label={'Price'}
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'addProduct')}
                />
                <span className="absolute top-7 right-3 z-50">{lineTotal}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-x-1 gap-y-1">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editProduct}
                  buttonLoading={buttonLoading}
                  label="Update"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={<FiEdit2 className="text-white text-lg ml-2  mr-2" />}
                />
              ) : (
                <ButtonLoading
                  id="addProduct"
                  onClick={addProduct}
                  buttonLoading={buttonLoading}
                  label="Add New"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={<FiPlus className="text-white text-lg ml-2  mr-2" />}
                />
              )}
              <ButtonLoading
                onClick={handleSave}
                buttonLoading={buttonLoading}
                label="Save"
                className="whitespace-nowrap text-center mr-0"
                icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
              />
              <ButtonLoading
                onClick={resetForm}
                buttonLoading={buttonLoading}
                label="Reset"
                className="whitespace-nowrap text-center mr-0"
                icon={<FiRefreshCcw className="text-white text-lg ml-2  mr-2" />}
              />
              <Link to="/dashboard" className="text-nowrap justify-center mr-0">
                <FiHome className="text-white text-lg ml-2  mr-2" />
                <span className="hidden md:block">{'Home'}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 col-span-2 overflow-x-auto ">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-300 dark:bg-gray-700 dark:text-gray-200">
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
              <tr key={row.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-center">
                  {index + 1}
                </td>
                <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                  {row.product_name}
                </td>
                <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right">
                  {thousandSeparator(Number(row.qty), 2)} {row.unit}
                </td>
                <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right">
                  {thousandSeparator(Number(row.price), 2)}
                </td>
                <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right">
                  {thousandSeparator(Math.floor(Number(row.price) * Number(row.qty)), 2)}
                </td>
                <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-center w-20">
                  <button onClick={() => handleDelete(row.id)} className="text-red-500 ml-2 text-center">
                    <FiTrash2 className="cursor-pointer text-center" />
                  </button>
                  <button onClick={() => editProductItem(row.id)} className="text-green-500 ml-2 text-center">
                    <FiEdit2 className="cursor-pointer text-center" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <QuickCustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        entityLabel="Supplier"
        defaultTypeId="2"
        initialName={customerDraftName}
        onCustomerSaved={({ id, name }) => {
          const isCashSupplier = Number(id) === 17;
          setIsPaymentAmtManuallyEdited(false);
          setFormData((prev) => ({
            ...prev,
            account: id,
            accountName: name,
            paymentAmt: isCashSupplier ? prev.paymentAmt : '0',
          }));
        }}
      />
    </>
  );
};

export default ConstructionBusinessPurchaseReturn;
