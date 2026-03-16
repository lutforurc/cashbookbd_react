import React, { useEffect, useState } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import InputElement from '../../../utils/fields/InputElement';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { toast } from 'react-toastify';
import Link from '../../../utils/others/Link';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import { useDispatch, useSelector } from 'react-redux';
import { getDdlWarehouse } from '../../warehouse/ddlWarehouseSlider';
import WarehouseDropdown from '../../../utils/utils-functions/WarehouseDropdown';
import Loader from '../../../../common/Loader';
import {
  FiEdit,
  FiEdit2,
  FiHome,
  FiPlus,
  FiRefreshCcw,
  FiSave,
  FiSearch,
  FiTrash2,
  FiUserPlus,
} from 'react-icons/fi';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { validateProductData } from '../../../utils/utils-functions/productValidationHandler';
import { invoiceMessage } from '../../../utils/utils-functions/invoiceMessage';
import { validateForm } from '../../../utils/utils-functions/validationUtils';
import InputOnly from '../../../utils/fields/InputOnly';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import { hasPermission } from '../../../utils/permissionChecker';
import {
  generalSalesEdit,
  generalSalesStore,
  generalSalesUpdate,
} from './generalSalesSlice';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { SalesType } from '../../../../common/dropdownData';
import QuickCustomerModal from './QuickCustomerModal';

interface Product {
  id: number;
  product: number;
  product_name: string;
  unit: string;
  qty: number;
  price: number;
  bag?: string;
  warehouse: string;
  variance?: string;
  variance_type?: string;
}

const GeneralBusinessSales = () => {
  const warehouse = useSelector((s: any) => s.activeWarehouse);
  const sales = useSelector((s: any) => s.generalSales);
  const settings = useSelector((s: any) => s.settings);
  const dispatch = useDispatch();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [warehouseDdlData, setWarehouseDdlData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null); // Define state with type
  const [unit, setUnit] = useState<string | null>(null); // Define state with type
  const [search, setSearch] = useState(''); // State to store the search value
  const [productData, setProductData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateId, setUpdateId] = useState<any>(null);
  const [isInvoiceUpdate, setIsInvoiceUpdate] = useState(false);
  const [isUpdateButton, setIsUpdateButton] = useState(false);
  const [salesType, setSalesType] = useState('1');
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [permissions, setPermissions] = useState<any>([]);

  useEffect(() => {
    // dispatch(userCurrentBranch());
    dispatch(getDdlWarehouse());
    setPermissions(settings.data.permissions);
  }, []);

  interface FormData {
    mtmId: string;
    account: string;
    accountName: string;
    receivedAmt: string;
    discountAmt: number;
    vehicleNumber: string;
    notes: string;
    currentProduct: { index?: number } | null; // Initialize `currentProduct` with optional index
    searchInvoice: string;
    products: Product[];
  }

  const initialFormData = {
    mtmId: '',
    account: '',
    accountName: '',
    receivedAmt: '',
    discountAmt: 0,
    vehicleNumber: '',
    notes: '',
    currentProduct: null, // Initialize `currentProduct` as null
    searchInvoice: '',
    products: [],
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    if (warehouse?.data && warehouse?.data.length > 0) {
      setWarehouseDdlData(warehouse?.data);
    }
  }, [warehouse?.data]);

  const customerAccountHandler = (option: any) => {
    const key = 'account'; // Set the desired key dynamically
    const accountName = 'accountName'; // Set the desired key dynamically
    setFormData({
      ...formData,
      [key]: option.value,
      [accountName]: option.label,
    });
  };

  const openCustomerModal = () => {
    setShowCustomerModal(true);
  };

  const closeCustomerModal = () => {
    setShowCustomerModal(false);
  };

  const productSelectHandler = (option: any) => {
    const key = 'product'; // Set the desired key dynamically
    const accountName = 'product_name'; // Set the desired key dynamically
    const unit = 'unit'; // Set the desired key dynamically
    setUnit(option.label_5);

    setProductData({
      ...productData,
      [key]: option.value,
      [accountName]: option.label,
      [unit]: option.label_5,
    });
  };

  const resetProducts = () => {
    setFormData(initialFormData); // Reset to the initial state
    setIsUpdateButton(false);
    isUpdating && setIsUpdating(false);
  };

  const searchInvoice = () => {
    if (!search) {
      toast.info('Please enter an invoice number');
      return;
    }
    dispatch(
      generalSalesEdit({ invoiceNo: search, salesType: salesType }, (message: string) => {
        if (message) {
          toast.error(message);
        }
      }),
    );
    if (sales.isEdit === true) {
      setIsUpdateButton(true);
    }
    setFormData({ ...formData, searchInvoice: search }); // Update the state with the search value
    setIsInvoiceUpdate(true);
  };

  const totalAmount = formData.products.reduce(
    (sum, row) => sum + Number(row.qty) * Number(row.price),
    0,
  );



  console.log('====================================');
  console.log("sales", sales);
  console.log('====================================');


  useEffect(() => {
    if (!sales?.data?.transaction) {
      setStartDate(null);
      return;
    }

    const transaction = sales.data.transaction;
    const salesMaster = transaction.sales_master;

    if (salesMaster?.transact_date) {
      const parsedDate = new Date(salesMaster.transact_date);
      setStartDate(!isNaN(parsedDate.getTime()) ? parsedDate : null);
    } else {
      setStartDate(null);
    }

    const products: Product[] =
      salesMaster?.details?.map((detail: any) => ({
        id: detail.id,
        product: detail.product?.id || detail.product_id || 0,
        product_name: detail.product?.name || '',
        unit: detail.product?.unit?.name || '',
        qty: Number(detail.quantity) || 0,
        price: Number(detail.sales_price) || 0,
        bag: detail.bag || '',
        warehouse: detail.godown_id ? detail.godown_id.toString() : '',
        variance: detail.weight_variance || '',
        variance_type: detail.variance_type || '',
      })) || [];

    let accountName = '-';
    if (transaction?.acc_transaction_master?.length > 0) {
      for (const trxMaster of transaction.acc_transaction_master) {
        for (const detail of trxMaster.acc_transaction_details || []) {
          if (detail.coa_l4?.id === salesMaster?.customer_id) {
            accountName = detail.coa_l4.name;
            break;
          }
        }
        if (accountName !== '-') break;
      }
    }

    setFormData((prevState) => ({
      ...prevState,
      mtmId: sales.data.mtmId || '',
      account: salesMaster?.customer_id?.toString() || '',
      accountName,
      receivedAmt: salesMaster?.netpayment?.toString() || '',
      discountAmt: parseFloat(salesMaster?.discount || '0') || 0,
      vehicleNumber: salesMaster?.vehicle_no || '',
      notes: salesMaster?.notes || '',
      products,
    }));
  }, [sales?.data?.transaction, sales?.data?.mtmId]);

  const addProduct = () => {
    if (!validateProductData(productData)) return;

    // Generate a unique ID for the product
    const newProduct: Product = {
      ...productData,
      id: Date.now(), // Use timestamp as a unique ID
      product: productData.product || 0,
      product_name: productData.product_name || '',
      unit: productData.unit || '',
      qty: Number(productData.qty) || 0,
      price: Number(productData.price) || 0,
    };

    // Add the product to the formData.products array
    setFormData((prevFormData) => ({
      ...prevFormData,
      products: [...prevFormData.products, newProduct],
    }));
  };

  const editProduct = () => {
    const isValid = validateProductData(productData);
    if (!isValid) return;

    let newItem: Product = {
      id: Date.now(), // Use timestamp as a unique ID
      product: productData.product || 0,
      product_name: productData.product_name || '',
      unit: productData.unit || '',
      qty: productData.qty || '',
      price: productData.price || '',
      bag: productData.bag || '',
      warehouse: productData.warehouse || '',
    };

    // Add the product to the formData.products array
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
    // Filter out the product with the matching id
    const updatedProducts = formData.products.filter(
      (product: any) => product.id !== id,
    );

    // Update the state with the new products array
    setFormData((prevFormData) => ({
      ...prevFormData,
      products: updatedProducts,
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
    setProductData((prevState: any) => ({
      ...prevState,
      [name]: value,
    }));
  };

  useEffect(() => {
    const voucherNo = sales?.data?.vr_no || '';
    if (voucherNo !== '') {
      toast.success(`Voucher No.: ${voucherNo}`);
      setFormData((prevState) => ({
        ...prevState, // Spread the previous state to retain all other properties
        products: [], // Reset only the `products` array
      }));
    }
  }, [sales?.data?.vr_no]);

  useEffect(() => {
    setFormData((prevState) => ({
      ...prevState, // Spread the previous state to retain all other properties
      products: [], // Reset only the `products` array
    }));
  }, [sales.isUpdated]);

  const handleSalesInvoiceSave = async () => {
    const validationMessages = validateForm(formData, invoiceMessage);
    if (validationMessages) {
      toast.info(validationMessages);
      return;
    }
    if (formData.receivedAmt == '') {
      toast.info('Please enter received amount');
      return;
    }
    if (formData.products.length == 0) {
      toast.info('Please add some products.');
      return;
    }

    try {
      dispatch(
        generalSalesStore(formData, function (message) {
          if (message) {
            toast.error(message);
          }
        }),
      );
    } catch (error) {
      toast.error('Failed to save invoice!');
    }
  };

  const handleInvoiceUpdate = async () => {
    // Check Required fields are not empty
    const validationMessages = validateForm(formData, invoiceMessage);
    if (validationMessages) {
      toast.info(validationMessages);
      return;
    }

    if (!formData.account || formData.products.length === 0) {
      toast.error('Please add products information!');
      return;
    }

    // Save Invoice Update
    dispatch(
      generalSalesUpdate(formData, function (message) {
        if (message) {
          toast.info(message);
        }
      }),
    );

    setIsUpdateButton(false);
    setIsUpdating(false);
  };

  useEffect(() => {
    if (sales.isEdit) {
      setIsUpdateButton(true);
    } else {
      setIsUpdateButton(false);
    }
  }, [sales.isEdit]);

  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProductData({ ...productData, [e.target.name]: e.target.value });
  };

  const editProductItem = (productId: number) => {
    // Find the product by its unique id
    const productIndex = formData.products.findIndex(
      (item) => item.id === productId,
    );

    if (productIndex === -1) {
      return;
    }

    // Retrieve the specific product
    const product = formData.products[productIndex];

    // Populate the form with product details for editing
    setFormData((prevState) => ({
      ...prevState,
      currentProduct: { ...product, index: productIndex }, // Store index to identify the product during save
    }));

    //setWarehouseDdlData(productData.warehouse);
    setProductData(product);
    setIsUpdating(true);
    setUpdateId(productIndex);
  };

  const handlePurchaseOrderReset = () => {
    setFormData((prevState) => ({
      ...prevState,
      purchaseOrderNumber: '', // Clear this field
      purchaseOrderText: '', // Clear this field
    }));
    setIsResetOrder(false);
  };
  const handleSalesOrderReset = () => {
    setFormData((prevState) => ({
      ...prevState,
      salesOrderNumber: '', // Clear this field
      salesOrderText: '', // Clear this field
    }));
    setIsResetOrder(false);
  };

  useEffect(() => {
    if (formData.account == '17') {
      setFormData((prevState) => ({
        ...prevState,
        receivedAmt:
          totalAmount > 0
            ? (totalAmount - prevState.discountAmt).toString()
            : '0',
      }));
    } else {
      setFormData((prevState) => ({
        ...prevState,
        receivedAmt: '',
      }));
    }
  }, [formData.account]);


  useEffect(() => {
    const total = formData.products.reduce((acc, product) => {
      const qty = parseFloat(product.qty?.toString() || '0') || 0;
      const price = parseFloat(product.price?.toString() || '0') || 0;
      return acc + qty * price;
    }, 0);

    const discount = parseFloat(formData.discountAmt?.toString() || '0') || 0;

    let netTotal = 0;
    if (total > 0) {
      netTotal = total - discount;
    }

    setFormData((prev) => ({
      ...prev,
      receivedAmt: netTotal.toFixed(2), // Keep as string
    }));
  }, [formData.products, formData.discountAmt]);

  const handleSalesType = (e: any) => {
    setSalesType(e.target.value);
  };

  return (
    <>
      <HelmetTitle title="General Sales Invoice" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
        {sales.isLoading ? <Loader /> : null}
        <div className="self-start md:self-auto">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="">Select Customer</label>

                </div>
                <DdlMultiline
                  onSelect={customerAccountHandler}
                  defaultValue={
                    formData.account
                      ? {
                        value: formData.account,
                        label: formData.accountName, //productData.accountName
                      }
                      : null
                  }
                  value={
                    formData.account
                      ? {
                        value: formData.account,
                        label: formData.accountName, //productData.accountName
                      }
                      : null
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      // Delay to allow react-select to complete selection
                      setTimeout(() => {
                        const input = document.querySelector(
                          '#vehicleNumber',
                        ) as HTMLInputElement | null;
                        if (input) input.focus();
                        if (input) input.select();
                      }, 150);
                    }
                  }}
                  acType={'3'}
                />
              </div>
              <div className="flex gap-2">
                <div className='mt-6 -ml-2.5 mr-2 '>
                  <button
                    type="button"
                    onClick={openCustomerModal}
                    title="Add New Supplier"
                    aria-label="Add New Supplier"
                    className="inline-flex h-9.5 w-6 items-center justify-center rounded-sm border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                  >
                    <FiUserPlus className="text-sm" />
                  </button>
                </div>
                <div className='w-full'>
                  <InputElement
                    id="vehicleNumber"
                    value={formData.vehicleNumber}
                    name="vehicleNumber"
                    placeholder={'Vehicle Number'}
                    label={'Vehicle Number'}
                    className={'py-1.5 '}
                    onChange={handleOnChange}
                    onKeyDown={(e) => handleInputKeyDown(e, 'receivedAmt')} // Pass the next field's ID
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InputElement
                id="receivedAmt"
                value={formData.receivedAmt}
                name="receivedAmt"
                placeholder={'Received Amount'}
                disabled={Number(formData.account) === 17}
                label={'Received Amount'}
                className={'py-1'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'discountAmt')} // Pass the next field's ID
              />
              <InputElement
                id="discountAmt"
                value={formData.discountAmt.toString()}
                name="discountAmt"
                placeholder={'Discount Amount'}
                label={'Discount Amount'}
                className={'py-1'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'notes')} // Pass the next field's ID
              />
              <InputElement
                id="notes"
                value={formData.notes}
                name="notes"
                placeholder={'Notes'}
                label={'Notes'}
                className={'py-1'}
                onChange={handleOnChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Delay to allow react-select to complete selection
                    setTimeout(() => {
                      const input = document.querySelector(
                        '#product',
                      ) as HTMLInputElement | null;
                      if (input) input.focus();
                      if (input) input.select();
                    }, 150);
                  }
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-1">
            <div className="grid grid-cols-2 md:gap-x-1 mt-3 ">
              <p className="text-sm font-bold dark:text-white">Total Tk.</p>
              <span className="text-sm font-bold dark:text-white">
                {' '}
                {thousandSeparator(totalAmount, 0)}
              </span>
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
                <div className="relative mt-2">
                  <div className="w-full ">
                    <InputOnly
                      id="search"
                      value={search}
                      name="search"
                      placeholder={'Search Invoice'}
                      label={''}
                      className={'py-1 w-full'}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => handleInputKeyDown(e, 'searchInvoice')}
                    />
                  </div>
                  <ButtonLoading
                    id="searchInvoice"
                    name="searchInvoice"
                    onClick={searchInvoice}
                    buttonLoading={buttonLoading}
                    label=""
                    className="whitespace-nowrap !bg-transparent text-center mr-0 py-2 absolute right-0 top-0 background-red-500 !pr-2 !pl-2"
                    icon={
                      <FiSearch className="dark:text-white text-black-2 text-lg ml-2  mr-2" />
                    }
                  />
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
                  id="product"
                  name="product"
                  onSelect={productSelectHandler}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      // Delay to allow react-select to complete selection
                      setTimeout(() => {
                        const input = document.querySelector(
                          '#qty',
                        ) as HTMLInputElement | null;
                        if (input) input.focus();
                        if (input) input.select();
                      }, 150);
                    }
                  }}
                />
              </div>
              <div>
                <label htmlFor="">Select Warehouse</label>
                {warehouse.isLoading == true ? <Loader /> : ''}
                <WarehouseDropdown
                  onChange={handleWarehouseChange}
                  className="w-60 font-medium text-sm p-2 "
                  warehouseDdl={warehouseDdlData}
                  defaultValue={productData?.warehouse || ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="block relative">
                <InputElement
                  id="qty"
                  value={productData.qty}
                  name="qty"
                  placeholder={'Enter Quantity'}
                  label={'Enter Quantity'}
                  type="number"
                  className={'py-1 '}
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'price')}
                />
                <span className="absolute top-7 right-3 z-50">{unit}</span>
              </div>
              <InputElement
                id="price"
                value={productData.price}
                name="price"
                type="number"
                placeholder={'Enter Price'}
                label={'Enter Price'}
                className={'py-1'}
                onChange={handleProductChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'addProduct')}
              />
            </div>
            <div className="grid grid-cols-4 gap-x-1 gap-y-1">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editProduct}
                  buttonLoading={buttonLoading}
                  label="Update"
                  className="whitespace-nowrap text-center mr-0 py-1.5 h-8"
                  icon={<FiEdit2 className="text-white text-lg ml-2  mr-2" />}
                />
              ) : (
                <ButtonLoading
                  id="addProduct"
                  onClick={addProduct}
                  buttonLoading={buttonLoading}
                  label="Add New"
                  className="whitespace-nowrap text-center mr-0 h-8"
                  icon={<FiPlus className="text-white text-lg ml-2  mr-2" />}
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
                  buttonLoading={buttonLoading}
                  label="Update"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiEdit className="text-white text-lg ml-2 mr-2  h-8" />}
                />
              ) : (
                <ButtonLoading
                  onClick={handleSalesInvoiceSave}
                  buttonLoading={buttonLoading}
                  label="Save"
                  className="whitespace-nowrap text-center mr-0 h-8"
                  icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
                />
              )}

              <ButtonLoading
                onClick={resetProducts}
                buttonLoading={buttonLoading}
                label="Reset"
                className="whitespace-nowrap text-center mr-0"
                icon={
                  <FiRefreshCcw className="text-white text-lg ml-2  mr-2  h-8" />
                }
              />
              <Link to="/dashboard" className="text-nowrap justify-center mr-0  h-8">
                <FiHome className="text-white text-lg ml-2  mr-2" />
                <span className="hidden md:block">{'Home'}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 col-span-2 overflow-x-auto ">
        {/* {cashPayment.isLoading ? <Loader /> : null} */}
        <table
          className={`w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400`}
        >
          <thead className="text-xs text-gray-700 uppercase bg-gray-300 dark:bg-gray-700 dark:text-gray-200">
            <tr className="bg-black-700">
              <th scope="col" className={`px-2 py-2 text-center `}>
                {' '}
                Sl. No.{' '}
              </th>
              <th scope="col" className={`px-2 py-2 `}>
                {' '}
                Product Name{' '}
              </th>
              <th scope="col" className={`px-2 py-2 text-right`}>
                {' '}
                Quantity{' '}
              </th>
              <th scope="col" className={`px-2 py-2 text-right`}>
                {' '}
                Rate{' '}
              </th>
              <th scope="col" className={`px-2 py-2 text-right`}>
                {' '}
                Total{' '}
              </th>
              <th scope="col" className={`px-2 py-2 text-center w-20 `}>
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
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-center `}
                  >
                    {++index}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white `}
                  >
                    {row.product_name}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right `}
                  >
                    {thousandSeparator(row.qty, 2)} {row.unit}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right `}
                  >
                    {thousandSeparator(row.price, 2)}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right `}
                  >
                    {thousandSeparator(row.price * row.qty, 0)}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-center w-20 `}
                  >
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
      <QuickCustomerModal
        isOpen={showCustomerModal}
        onClose={closeCustomerModal}
        onCustomerSaved={({ id, name }) => {
          setFormData((prev) => ({
            ...prev,
            account: id,
            accountName: name,
          }));
        }}
      />
    </>
  );
};

export default GeneralBusinessSales;
