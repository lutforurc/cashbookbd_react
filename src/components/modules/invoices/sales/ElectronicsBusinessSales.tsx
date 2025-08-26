import React, { useEffect, useRef, useState } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import InputElement from '../../../utils/fields/InputElement';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { toast } from 'react-toastify';
import Link from '../../../utils/others/Link';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import { useDispatch, useSelector } from 'react-redux';
import { userCurrentBranch } from '../../branch/branchSlice';
import { getDdlWarehouse } from '../../warehouse/ddlWarehouseSlider';
import WarehouseDropdown from '../../../utils/utils-functions/WarehouseDropdown';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Loader from '../../../../common/Loader';
import {
  FiEdit,
  FiEdit2,
  FiHome,
  FiPlus,
  FiRefreshCcw,
  FiSave,
  FiSearch,
  FiShare,
  FiTrash2,
} from 'react-icons/fi';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { validateProductData } from '../../../utils/utils-functions/productValidationHandler';
import { invoiceMessage } from '../../../utils/utils-functions/invoiceMessage';
import { validateForm } from '../../../utils/utils-functions/validationUtils';
import InputOnly from '../../../utils/fields/InputOnly';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import { hasPermission } from '../../../utils/permissionChecker';
import InputDatePicker from '../../../utils/fields/DatePicker';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { SalesType } from '../../../../common/dropdownData';
import {
  electronicsSalesEdit,
  electronicsSalesStore,
  electronicsSalesUpdate,
} from './electronicsSalesSlice';

interface Product {
  id: number;
  product: number;
  product_name: string;
  serial_no: string;
  unit: string;
  qty: number;
  price: number;
  warehouse: string;
}

interface InstallmentData {
  amount: number;
  startDate: Date | null;
  numberOfInstallments: number;
  isEarlyPayment?: boolean; // Optional field for early payment
  earlyPaymentDate?: Date | null; // Optional field for early payment date
  earlyDiscount?: number; // Optional field for early discount
}

interface editInstallmentData {
  id: number;
  customer_id: number;
  main_trx_id: number;
  installment_no: number;
  due_date: Date | null;
  amount: number;
  payments: [];
}

const ElectronicsBusinessSales = () => {
  const warehouse = useSelector((s: any) => s.activeWarehouse);
  const sales = useSelector((s: any) => s.electronicsSales);
  const settings = useSelector((s: any) => s.settings);
  const dispatch = useDispatch();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [updateButtonLoading, setUpdateButtonLoading] = useState(false);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [warehouseDdlData, setWarehouseDdlData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [earlyPaymentDate, setEarlyPaymentDate] = useState<Date | null>(null);
  const [salesType, setSalesType] = useState('1');
  const [unit, setUnit] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [productData, setProductData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateId, setUpdateId] = useState<any>(null);
  const [isUpdateButton, setIsUpdateButton] = useState(false);
  const [permissions, setPermissions] = useState<any>([]);
  const [isInstallment, setIsInstallment] = useState(false);
  const [isEarlyPayment, setIsEarlyPayment] = useState(false);
  const [showInstallmentPopup, setShowInstallmentPopup] = useState(false);
  const [lineTotal, setLineTotal] = useState<number>(0);
  const [editedInstallments, setEditedInstallments] = useState<
    editInstallmentData[]
  >([]);
  const [installmentData, setInstallmentData] = useState<InstallmentData>({
    amount: 0,
    startDate: null,
    numberOfInstallments: 0,
    isEarlyPayment: false,
    earlyPaymentDate: null,
    earlyDiscount: 0,
  });

  dayjs.extend(utc);
  dayjs.extend(timezone);

  useEffect(() => {
    dispatch(userCurrentBranch());
    dispatch(getDdlWarehouse());
    setPermissions(settings.data.permissions);
  }, []);

  useEffect(() => {
    if (productData.qty) {
      const qty = parseFloat(productData.qty) || 0;
      const price = parseFloat(productData.price) || 0;
      setLineTotal(qty * price);
    }
  }, [productData.qty]);

  interface FormData {
    mtmId: string;
    account: string;
    accountName: string;
    receivedAmt: string;
    discountAmt: number;
    notes: string;
    currentProduct: { index?: number } | null;
    searchInvoice: string;
    products: Product[];
    editInstallmentData: editInstallmentData[];
  }

  const initialFormData = {
    mtmId: '',
    account: '',
    accountName: '',
    receivedAmt: '',
    discountAmt: 0,
    notes: '',
    currentProduct: null,
    searchInvoice: '',
    products: [],
    editInstallmentData: [],
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    if (warehouse?.data && warehouse?.data.length > 0) {
      setWarehouseDdlData(warehouse?.data);
    }
  }, [warehouse?.data]);

  const customerAccountHandler = (option: any) => {
    const key = 'account';
    const accountName = 'accountName';
    setFormData({
      ...formData,
      [key]: option.value,
      [accountName]: option.label,
    });
  };

  const productSelectHandler = (option: any) => {
    const key = 'product';
    const accountName = 'product_name';
    const unit = 'unit';
    const price = 'price'; // Set the desired key dynamically
    setUnit(option.label_5);
    setProductData({
      ...productData,
      [key]: option.value,
      [accountName]: option.label,
      [unit]: option.label_5,
      [price]: Number(option.label_3),
    });

    // After setting product data, recalculate line total
    const qty = parseFloat(productData.qty) || 0;
    const priceValue = Number(option.label_3) || 0;
    const newLineTotal = qty * priceValue;

    // Update the lineTotal state with the new value
    setLineTotal(newLineTotal);
  };

  const resetProducts = () => {
    setIsUpdateButton(false);
    isUpdating && setIsUpdating(false);
    setIsInstallment(false); // Reset installment checkbox
    setFormData(initialFormData);
    setInstallmentData({ amount: 0, startDate: null, numberOfInstallments: 0 }); // Reset installment data
  };

  const handleSalesType = (e: any) => {
    setSalesType(e.target.value);
  };

  const searchInvoice = () => {
    if (!search) {
      toast.info('Please enter an invoice number');
      return;
    }

    dispatch(
      electronicsSalesEdit(
        { invoiceNo: search, salesType: salesType },
        (message: string) => {
          if (message) {
            toast.error(message);
          } else {
            toast.success('Invoice loaded successfully');
          }
        },
      ),
    );
  };

  useEffect(() => {
    if (sales.data.transaction) {
      const products = sales.data.transaction?.sales_master.details.map(
        (detail: any) => ({
          id: detail.id,
          product: detail.product.id,
          product_name: detail.product.name,
          serial_no: detail.serial_no,
          unit: detail.product.unit.name,
          qty: detail.quantity,
          price: detail.sales_price,
          warehouse: detail.godown_id ? detail.godown_id.toString() : '',
        }),
      );

      // Find accountName
      let accountName = '-';
      if (sales?.data?.transaction.acc_transaction_master?.length > 0) {
        for (const trxMaster of sales?.data?.transaction
          .acc_transaction_master) {
          for (const detail of trxMaster.acc_transaction_details) {
            if (
              detail.coa_l4?.id ===
              sales?.data?.transaction?.sales_master?.customer_id
            ) {
              accountName = detail.coa_l4.name;
              break;
            }
          }
          if (accountName !== '-') break;
        }
      }

      // Update formData using previous state to maintain integrity
      const updatedFormData = {
        ...formData,
        mtmId: sales.data.mtmId,
        account:
          sales?.data?.transaction?.sales_master?.customer_id.toString() ?? '',
        accountName,
        receivedAmt:
          sales.data.transaction.sales_master.netpayment.toString() || '',
        discountAmt:
          parseFloat(sales.data.transaction.sales_master.discount) || 0,
        notes: sales.data.transaction.sales_master.notes || '',
        products: products || [],
        editInstallmentData: sales.data.transaction.installments.map(
          (installment: any) => ({
            id: installment.id,
            customer_id: installment.customer_id,
            main_trx_id: installment.main_trx_id,
            installment_no: installment.installment_no,
            due_date: installment.due_date
              ? new Date(installment.due_date.split('/').reverse().join('-'))
              : null,
            amount: parseFloat(installment.amount) || 0,
            payments: installment.payments || [],
          }),
        ),
      };

      setFormData(updatedFormData);
      setEditedInstallments(updatedFormData.editInstallmentData);
    }
  }, [sales.data.transaction]);

  useEffect(() => {
    console.log('Updated formData:', formData);
  }, [formData]);
  const totalAmount = formData.products.reduce(
    (sum, row) => sum + Number(row.qty) * Number(row.price),
    0,
  );

  const addProduct = () => {
    const isValid = validateProductData(productData);
    if (!isValid) return;
    const newProduct: Product = {
      ...productData,
      id: Date.now(),
      product: productData.product || 0,
      product_name: productData.product_name || '',
      serial_no: productData.serial_no || '',
      unit: productData.unit || '',
      qty: Number(productData.qty) || 0,
      price: Number(productData.price) || 0,
    };
    setFormData((prevFormData) => ({
      ...prevFormData,
      products: [...prevFormData.products, newProduct],
    }));
  };

  const editProduct = () => {
    const isValid = validateProductData(productData);
    if (!isValid) return;

    const newItem: Product = {
      id: Date.now(),
      product: productData.product || 0,
      product_name: productData.product_name || '',
      serial_no: productData.serial_no || '',
      unit: productData.unit || '',
      qty: Number(productData.qty) || 0,
      price: Number(productData.price) || 0,
      warehouse: productData.warehouse || '',
    };

    setFormData((prevFormData) => ({
      ...prevFormData,
      products: prevFormData.products.map((item, index) =>
        index === updateId ? newItem : item,
      ),
    }));

    setIsUpdating(false);
    setUpdateId(null);
  };

  const handleDelete = (id: number) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      products: prevFormData.products.filter(
        (product: any) => product.id !== id,
      ),
    }));
  };

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newValue = value ? parseFloat(value) : 0;
    setProductData((prevState: any) => ({
      ...prevState,
      [name]: value,
    }));
    // Update product data state
    setProductData((prevState: any) => {
      const updatedProductData = { ...prevState, [name]: newValue };

      // Calculate line total after updating product data
      const qty = parseFloat(updatedProductData.qty) || 0;
      const price = parseFloat(updatedProductData.price) || 0;
      const newLineTotal = qty * price;
      setLineTotal(newLineTotal); // Update lineTotal state here
      return updatedProductData;
    });
  };

  useEffect(() => {
    const voucherNo = sales?.data?.vr_no || '';
    if (voucherNo !== '') {
      toast.success(`Voucher No.: ${voucherNo}`);
      setFormData((prevState) => ({
        ...prevState,
        products: [],
      }));
    }
  }, [sales?.data?.vr_no]);

  useEffect(() => {
    setFormData((prevState) => ({
      ...prevState,
      products: [],
    }));
  }, [sales.isUpdated]);

  const handleInvoiceSave = async () => {
    setSaveButtonLoading(true);
    const validationMessages = validateForm(formData, invoiceMessage);
    if (validationMessages) {
      toast.info(validationMessages);
      setSaveButtonLoading(false);
      return;
    }
    if (formData.receivedAmt === '') {
      toast.info('Please enter received amount');
      setSaveButtonLoading(false);
      return;
    }
    if (formData.products.length === 0) {
      toast.info('Please add some products.');
      setSaveButtonLoading(false);
      return;
    }

    if (
      isInstallment &&
      (!installmentData.amount || !installmentData.numberOfInstallments)
    ) {
      toast.info('Please fill all installment details.');
      return;
    }

    const formattedInstallmentData = isInstallment
      ? {
          ...installmentData,
          startDate: installmentData.startDate? dayjs(installmentData.startDate).tz('Asia/Dhaka').format('YYYY-MM-DD'): null,
          earlyPaymentDate: installmentData.earlyPaymentDate? dayjs(installmentData.earlyPaymentDate).tz('Asia/Dhaka').format('YYYY-MM-DD'): null,
        }
      : null;

    const payload = {
      ...formData,
      isInstallment,
      installmentData: formattedInstallmentData,
    };

    try {
      dispatch(
        electronicsSalesStore(
          payload,
          // (message) => message && toast.success(message),
        ),
      );
      setTimeout(() => {
        setSaveButtonLoading(false);
        resetProducts();
        setIsEarlyPayment(false);
      }, 2000);
    } catch (error) {
      toast.error('Failed to save invoice!');
    }
  };

  const handleInvoiceUpdate = async () => {
    // setUpdateButtonLoading(true);

    const validationMessages = validateForm(formData, invoiceMessage);
    if (validationMessages) {
      toast.info(validationMessages);
      return;
    }
    if (!formData.account || formData.products.length === 0) {
      toast.error('Please add products information!');
      return;
    }
    if (
      isInstallment &&
      (!installmentData.amount ||
        !installmentData.startDate ||
        !installmentData.numberOfInstallments)
    ) {
      toast.info('Please fill all installment details.');
      return;
    }

    const payload = {
      ...formData,
      isInstallment,
      installments: editedInstallments,
      installmentData: isInstallment ? installmentData : null,
    };
    // try{
    dispatch(
      electronicsSalesUpdate(
        payload,
        (message) => message && toast.info(message),
      ),
    );
    setTimeout(() => {
      resetProducts();
      setEditedInstallments([]);
      setUpdateButtonLoading(false);
      setIsUpdateButton(false);
    }, 2000);
    // }catch( error ){
    //   console.log(error);
    //   toast.error('Failed to Update invoice!');
    // }

    setIsUpdating(false);
  };

  useEffect(() => {
    if (sales.isEdit) setIsUpdateButton(true);
    else setIsUpdateButton(false);
  }, [sales.isEdit]);

  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProductData({ ...productData, [e.target.name]: e.target.value });
  };

  const editProductItem = (productId: number) => {
    const productIndex = formData.products.findIndex(
      (item) => item.id === productId,
    );
    if (productIndex === -1) return;
    const product = formData.products[productIndex];
    setFormData((prevState) => ({
      ...prevState,
      currentProduct: { ...product, index: productIndex },
    }));
    setProductData(product);
    setIsUpdating(true);
    setUpdateId(productIndex);
  };

  const handleEarlyPayment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsEarlyPayment(checked);

    if (checked) {
      const today = new Date();
      const eligibleUntil = new Date(today);
      eligibleUntil.setDate(today.getDate() + 90);

      setInstallmentData((prev) => ({
        ...prev,
        isEarlyPayment: true,
        earlyPaymentDate: eligibleUntil,
        earlyDiscount: prev.earlyDiscount ?? 0,
      }));
    } else {
      setInstallmentData((prev) => ({
        ...prev,
        isEarlyPayment: false,
        earlyPaymentDate: null,
        earlyDiscount: 0,
      }));
      setEarlyPaymentDate(null);
    }
  };

  // Handle installment checkbox change
  const handleInstallmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsInstallment(checked);

    if (checked) {
      setShowInstallmentPopup(true);
      setInstallmentData((prev) => ({
        ...prev,
        // startDate: new Date(),
      }));
      // console.log(installmentData);
    } else {
      setShowInstallmentPopup(false);
      setIsEarlyPayment(false); // Reset early payment state
      setInstallmentData({
        amount: 0,
        startDate: null,
        numberOfInstallments: 0,
        isEarlyPayment: false,
        earlyPaymentDate: null,
        earlyDiscount: 0,
      });
    }
  };

  // Handle installment data changes
  const handleInstallmentDataChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target;
    setInstallmentData((prev) => ({
      ...prev,
      [name]:
        name === 'amount' || name === 'numberOfInstallments'
          ? Number(value)
          : value,
    }));
  };

  // Handle date change for installment start date

  const handleInstallmentDateChange = (date: Date | null) => {
    if (date) {
      const selectedDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      const newEarlyPaymentDate = isEarlyPayment
        ? new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate() + 90,
          )
        : null;


      setStartDate(selectedDate);
      setEarlyPaymentDate(newEarlyPaymentDate);

      setInstallmentData((prev) => ({
        ...prev,
        startDate: selectedDate,
        earlyPaymentDate: newEarlyPaymentDate,
      }));
    } else {
      setStartDate(null);
      setEarlyPaymentDate(null);
      setInstallmentData((prev) => ({
        ...prev,
        startDate: null,
        earlyPaymentDate: null,
      }));
    }
  };

  const handleEarlyPaymentDateChange = (date: Date | null) => {
    const selectedDate = dayjs(date).tz('Asia/Dhaka').startOf('day');
    setEarlyPaymentDate(selectedDate.toDate());
    console.log('Early Payment Date:', selectedDate.toDate());
    setInstallmentData((prev) => ({
      ...prev,
      earlyPaymentDate: selectedDate.toDate(),
    }));
  };

  const handleCloseInstallmentPopup = () => {
    setShowInstallmentPopup(false);
  };

  const handleProductSerialNumberChange = (e) => {
    const { name, value } = e.target;
    const updatedProduct = { ...productData, [name]: value };

    if (name === 'serial_no') {
      const barcodes = value.trim().split(/\s+/).filter(Boolean);
      updatedProduct.qty = barcodes.length;
    }

    setProductData(updatedProduct);
  };

  // useEffect(() => {
  //   const total = formData.products.reduce((acc, product) => {
  //     const qty = parseFloat(product.qty?.toString() || '0') || 0;
  //     const price = parseFloat(product.price?.toString() || '0') || 0;
  //     return acc + qty * price;
  //   }, 0);

  //   const discount = parseFloat(formData.discountAmt?.toString() || '0') || 0;
  //   let netTotal = 0;
  //   if( total > 0){
  //     netTotal = total - discount;
  //   }

  //   setFormData((prev) => ({
  //     ...prev,
  //     receivedAmt: netTotal.toFixed(2),
  //   }));
  // }, [formData.products, formData.discountAmt]);

  // console.log('formData?.editInstallmentData', formData?.editInstallmentData);

  return (
    <>
      <HelmetTitle title="Installment Sales Invoice" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
        {sales.isLoading ? <Loader /> : null}
        <div className="self-start md:self-auto">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label htmlFor="">Select Customer</label>
                <DdlMultiline
                  onSelect={customerAccountHandler}
                  placeholder="Select Customer"
                  defaultValue={
                    formData.account
                      ? { value: formData.account, label: formData.accountName }
                      : null
                  }
                  value={
                    formData.account
                      ? { value: formData.account, label: formData.accountName }
                      : null
                  }
                  acType={'3'}
                />
              </div>
              <div>
                <div className="mt-8 ml-5">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInstallment}
                      onChange={handleInstallmentChange}
                      className="hidden"
                      aria-label="Enable installment sale"
                    />
                    <span
                      className={`relative inline-block w-6 h-6 mr-2 rounded border-2 transition-all duration-200
                                                ${isInstallment ? 'bg-blue-500 border-blue-500 dark:bg-blue-600 dark:border-blue-600' : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600'}
                                                hover:border-blue-400 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600`}
                    >
                      {isInstallment && (
                        <svg
                          className="absolute w-5 h-5 text-white top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      Installment Sale
                    </span>
                  </label>
                </div>
                {showInstallmentPopup && (
                  <div className="fixed inset-0 bg-opacity-50 flex mt-50 items-start justify-center z-50">
                    <div className="bg-white dark:bg-black p-6 rounded border-solid border-2 border-black dark:border-white shadow-lg w-96">
                      <h3 className="text-lg font-bold mb-4 text-gray-700 dark:text-white">
                        Installment Details
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <InputElement
                          id="installmentAmount"
                          value={installmentData.amount.toString()}
                          name="amount"
                          placeholder="Installment Amount"
                          label="Installment Amount"
                          className="py-1"
                          onChange={handleInstallmentDataChange}
                        />
                        <div className="w-full">
                          <label
                            className="dark:text-white text-gray-900"
                            htmlFor=""
                          >
                            Installment Start Date
                          </label>
                          <InputDatePicker
                            setCurrentDate={handleInstallmentDateChange}
                            className="font-medium text-sm w-full h-8"
                            selectedDate={startDate}
                            setSelectedDate={setStartDate}
                            placeholderText="Select Start Date" // ফাঁকা থাকলে প্লেসহোল্ডার দেখাবে
                          />
                        </div>

                        <InputElement
                          id="numberOfInstallments"
                          value={installmentData.numberOfInstallments.toString()}
                          name="numberOfInstallments"
                          placeholder="Installments No."
                          label="Installments No."
                          className="py-1"
                          onChange={handleInstallmentDataChange}
                        />
                        {/* isEarlyPayment, setIsEarlyPayment */}
                        <div className="grid grid-cols-1 gap-1">
                          <label className="dark:text-white">
                            {' '}
                            Early Payment{' '}
                          </label>
                          <input
                            type="checkbox"
                            checked={isEarlyPayment}
                            onChange={handleEarlyPayment}
                            className="w-4 h-4"
                            aria-label="Enable installment sale"
                          />
                        </div>
                        {isEarlyPayment && (
                          <>
                            <InputElement
                              id="earlyDiscount"
                              value={(
                                installmentData.earlyDiscount ?? 0
                              ).toString()}
                              name="earlyDiscount"
                              placeholder="Early Discount"
                              label="Early Discount"
                              className="py-1"
                              onChange={handleInstallmentDataChange}
                            />

                            <div className="w-full">
                              <label
                                className="dark:text-white text-gray-900"
                                htmlFor=""
                              >
                                Early Payment Date
                              </label>

                              <InputDatePicker
                                setCurrentDate={handleEarlyPaymentDateChange}
                                className="font-medium text-sm w-full h-8"
                                selectedDate={earlyPaymentDate ?? null}
                                setSelectedDate={setEarlyPaymentDate}
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <ButtonLoading
                        onClick={handleCloseInstallmentPopup}
                        buttonLoading={buttonLoading}
                        label="Close"
                        className="whitespace-nowrap text-center mr-0 mt-5 py-2"
                        icon={
                          <FiShare className="text-white text-lg ml-2 mr-2" />
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InputElement
                id="receivedAmt"
                value={formData.receivedAmt}
                name="receivedAmt"
                placeholder="Received Amount"
                disabled={Number(formData.account) === 17}
                label="Received Amount"
                className="py-1"
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'discountAmt')}
              />
              <InputElement
                id="discountAmt"
                value={formData.discountAmt.toString()}
                name="discountAmt"
                placeholder="Discount Amount"
                label="Discount Amount"
                className="py-1"
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'notes')}
              />
              <InputElement
                id="notes"
                value={formData.notes}
                name="notes"
                placeholder="Notes"
                label="Notes"
                className="py-1"
                onChange={handleOnChange}
              />
            </div>
          </div>
          {/* Installment Popup */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-0">
            <div className="mt-4">
              <p className="text-sm font-bold dark:text-white">
                Total Tk. {thousandSeparator(totalAmount, 0)}
              </p>
            </div>
            {hasPermission(permissions, 'sales.edit') && (
              <>
                <div className="mt-2">
                  <DropdownCommon
                    id="saleType"
                    name="saleType"
                    onChange={handleSalesType}
                    defaultValue={productData?.variance_type || ''}
                    data={SalesType}
                    className="w-full h-8.5"
                  />
                </div>
                <div className="relative">
                  <div className="w-full -gap-2 mt-2">
                    <InputOnly
                      id="search"
                      value={search}
                      name="search"
                      placeholder="Search Invoice"
                      label=""
                      className="py-1 w-full bg-white"
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => handleInputKeyDown(e, 'searchInvoice')}
                    />
                    <ButtonLoading
                      id="searchInvoice"
                      name="searchInvoice"
                      onClick={searchInvoice}
                      buttonLoading={buttonLoading}
                      label=""
                      className="whitespace-nowrap !bg-transparent text-center -mr-2 py-2 absolute right-0 top-2 !pr-2 !pl-2"
                      icon={
                        <FiSearch className="dark:text-white text-black-2 text-lg ml-2 mr-2" />
                      }
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label htmlFor="">Select Product</label>
                <ProductDropdown
                  onSelect={productSelectHandler}
                  onKeyDown={(e) => handleInputKeyDown(e, 'bag')}
                  defaultValue={
                    productData.product_name && productData.product
                      ? {
                          label: productData.product_name,
                          value: productData.product,
                        }
                      : null
                  }
                  value={
                    productData.product_name && productData.product
                      ? {
                          label: productData.product_name,
                          value: productData.product,
                        }
                      : null
                  }
                />
              </div>
              <div>
                <label htmlFor="">Select Warehouse</label>
                {warehouse.isLoading === true ? <Loader /> : ''}
                <WarehouseDropdown
                  onChange={handleWarehouseChange}
                  className="w-60 font-medium text-sm p-2"
                  warehouseDdl={warehouseDdlData}
                  defaultValue={productData?.warehouse || ''}
                />
              </div>
            </div>
            <div className="grid grid-cols-1">
              <div className="block relative">
                <label
                  htmlFor="serial_no"
                  className="block text-sm font-medium text-black dark:text-white mb-1"
                >
                  Enter Serial Number
                </label>
                <textarea
                  id="serial_no"
                  name="serial_no"
                  placeholder="Enter Serial Number"
                  className={`w-full px-3 py-1 text-gray-600 bg-white border rounded-xs 
                                            outline-none dark:bg-transparent dark:border-gray-600 dark:text-white 
                                            dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 
                                            dark:focus:ring-blue-400 dark:focus:border-blue-400`}
                  value={productData.serial_no}
                  onChange={handleProductSerialNumberChange}
                  rows={1}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="block relative">
                <InputElement
                  id="qty"
                  value={productData.qty}
                  name="qty"
                  placeholder="Enter Quantity"
                  label="Quantity"
                  type="number"
                  className="py-1"
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'price')}
                />
                <span className="absolute top-8 right-3 z-50">{unit}</span>
              </div>
              <div className="block relative">
                <InputElement
                  id="price"
                  value={productData.price}
                  name="price"
                  placeholder="Enter Price"
                  label="Enter Price"
                  className="py-1"
                  onChange={handleProductChange}
                  // onKeyDown={(e) => handleInputKeyDown(e, 'addProduct')}
                />
                <span className="absolute top-8 right-3 z-50">{lineTotal}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-x-1 gap-y-1">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editProduct}
                  buttonLoading={buttonLoading}
                  label="Update"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={<FiEdit2 className="text-white text-lg ml-2 mr-2" />}
                />
              ) : (
                <ButtonLoading
                  id="addProduct"
                  onClick={addProduct}
                  buttonLoading={buttonLoading}
                  label="Add New"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={<FiPlus className="text-white text-lg ml-2 mr-2" />}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addProduct();
                      setTimeout(() => {
                        const product = document.getElementById('product');
                        product?.focus();
                      }, 100);
                    }
                  }}
                />
              )}
              {isUpdateButton ? (
                <ButtonLoading
                  onClick={handleInvoiceUpdate}
                  buttonLoading={updateButtonLoading}
                  label={updateButtonLoading ? 'Updating...' : 'Update'}
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiEdit className="text-white text-lg ml-2 mr-2" />}
                  disabled={updateButtonLoading}
                />
              ) : (
                <ButtonLoading
                  onClick={handleInvoiceSave}
                  buttonLoading={saveButtonLoading}
                  label={saveButtonLoading ? 'Saving...' : 'Save'}
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
                  disabled={saveButtonLoading}
                />
              )}

              <ButtonLoading
                onClick={resetProducts}
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
      </div>
      <div className="mt-4 col-span-2 overflow-x-auto">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-300 dark:bg-gray-700 dark:text-gray-200">
            <tr className="bg-black-700">
              <th scope="col" className="px-2 py-2 text-center">
                Sl. No.
              </th>
              <th scope="col" className="px-2 py-2">
                Product Name
              </th>
              <th scope="col" className="px-2 py-2 text-right">
                Quantity
              </th>
              <th scope="col" className="px-2 py-2 text-right">
                Rate
              </th>
              <th scope="col" className="px-2 py-2 text-right">
                Total
              </th>
              <th scope="col" className="px-2 py-2 text-center w-20">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {formData.products.length > 0 &&
              formData.products.map((row, index) => (
                <tr
                  key={index}
                  className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                >
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-center">
                    {++index}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                    {row.product_name}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right">
                    {row.qty} {row.unit}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right">
                    {row.price}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right">
                    {thousandSeparator(
                      parseFloat((row.price * row.qty).toFixed(2)),
                      2,
                    )}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-center w-20">
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="text-red-500 ml-2 text-center"
                    >
                      <FiTrash2 className="cursor-pointer text-center" />
                    </button>
                    <button
                      onClick={() => editProductItem(row.id)}
                      className="text-green-500 ml-2 text-center"
                    >
                      <FiEdit2 className="cursor-pointer text-center" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {editedInstallments.length > 0 && (
        <div className="space-y-1 w-100 shadow-lg mt-4 pt-1 pb-1 bg-white dark:bg-gray-800 rounded-lg">
          {/* Heading displayed only once */}
          {editedInstallments.length > 0 && (
            <div className="mt-4">
              <ButtonLoading
                onClick={() => {
                  const nextInstallmentNo =
                    editedInstallments.length > 0
                      ? editedInstallments[editedInstallments.length - 1]
                          .installment_no + 1
                      : 1;
                  const lastDueDate =
                    editedInstallments.length > 0
                      ? editedInstallments[editedInstallments.length - 1]
                          .due_date
                      : new Date();
                  const nextDueDate = lastDueDate
                    ? dayjs(lastDueDate).add(1, 'month').toDate()
                    : dayjs().add(1, 'month').toDate();

                  setEditedInstallments((prev) => {
                    const nextInstallmentNo =
                      prev.length > 0
                        ? prev[prev.length - 1].installment_no + 1
                        : 1;
                    const lastDueDate =
                      prev.length > 0
                        ? prev[prev.length - 1].due_date
                        : new Date();
                    const nextDueDate = lastDueDate
                      ? dayjs(lastDueDate).add(1, 'month').toDate()
                      : dayjs().add(1, 'month').toDate();

                    return [
                      ...prev,
                      {
                        id: Date.now(),
                        customer_id: 0,
                        main_trx_id: 0,
                        installment_no: nextInstallmentNo,
                        amount: 0,
                        due_date: nextDueDate,
                      },
                    ];
                  });
                }}
                buttonLoading={buttonLoading}
                label="Add"
                className="whitespace-nowrap text-center pt-1.5 pb-1.5 pr-4 ml-6 !pl-3"
                icon={<FiPlus className="text-white text-lg mr-2" />}
              />
            </div>
          )}

          {/* Render Installment Details */}
          {sales.isLoading && <Loader />}
          {editedInstallments.length > 0 &&
            editedInstallments.map((installment, index) => {
              return (
                <div
                  key={installment.id}
                  className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-1 items-center shadow-sm"
                >
                  <div className="flex justify-center">
                    <input
                      value={installment.installment_no}
                      readOnly
                      className={`form-input text-gray-600 outline-none border rounded-xs bg-white dark:bg-transparent 
                    dark:border-gray-600 dark:text-white dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 
                    dark:focus:ring-blue-400 dark:focus:border-blue-400 mt-1 block w-10 h-8.5 text-center`}
                      style={{
                        appearance: 'textfield', // for Firefox
                        MozAppearance: 'textfield', // for older Firefox
                        WebkitAppearance: 'none', // for Chrome/Safari
                      }}
                    />
                  </div>

                  <div>
                    <input
                      type="number"
                      value={Number(installment.amount)}
                      onChange={(e) => {
                        const updated = [...editedInstallments];
                        updated[index].amount = parseFloat(e.target.value);
                        setEditedInstallments(updated);
                      }}
                      className={`form-input px-3 py-1 text-gray-600 outline-none border rounded-xs bg-white dark:bg-transparent 
                    dark:border-gray-600 dark:text-white dark:placeholder-gray-500 focus:outline-none  focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 mt-1 block w-26 text-right`}
                      style={{
                        appearance: 'textfield', // for Firefox
                        MozAppearance: 'textfield', // for older Firefox
                        WebkitAppearance: 'none', // for Chrome/Safari
                      }}
                    />
                  </div>

                  <div>
                    <InputDatePicker
                      selectedDate={installment.due_date ?? null}
                      setSelectedDate={(date) => {
                        const updated = [...editedInstallments];
                        updated[index].due_date = date;
                        setEditedInstallments(updated);
                      }}
                      className="font-medium text-sm h-[34px] mt-1 w-26 ml-5"
                      placeholderText="Select Due Date"
                    />
                  </div>

                  <div className="pt-2 w-10 ml-10">
                    {installment?.payments?.length <= 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editedInstallments.filter(
                            (_, i) => i !== index,
                          );
                          setEditedInstallments(updated);
                        }}
                        className="text-red-500 hover:underline"
                      >
                        {/* Remove */}
                        <FiTrash2 className="text-red-500 text-lg mr-2" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </>
  );
};
export default ElectronicsBusinessSales;
