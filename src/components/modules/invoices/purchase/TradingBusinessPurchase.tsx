import React, { useEffect, useState } from 'react';
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
import Loader from '../../../../common/Loader';
import InputDatePicker from '../../../utils/fields/DatePicker';
import {
  FiEdit,
  FiEdit2,
  FiHome,
  FiPlus,
  FiRefreshCcw,
  FiSave,
  FiSearch,
  FiTrash2,
} from 'react-icons/fi';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import dayjs from 'dayjs';
import SelectWeightVariance from '../../../utils/utils-functions/SelectWeightVariance';
import {
  purchaseStore,
  purchaseUpdate,
  tradingPurchaseEdit,
} from './tradingPurchaseSlice';
import OrderDropdown from '../../../utils/utils-functions/OrderDropdown';
import { validateForm } from '../../../utils/utils-functions/validationUtils';
import { invoiceMessage } from '../../../utils/utils-functions/invoiceMessage';
import { validateProductData } from '../../../utils/utils-functions/productValidationHandler';
import InputOnly from '../../../utils/fields/InputOnly';

import { hasPermission } from '../../../utils/permissionChecker';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { voucherTypes } from '../../../utils/fields/DataConstant';
import { PurchaseType, SalesType } from '../../../../common/dropdownData';
import useCtrlS from '../../../utils/hooks/useCtrlS';
import {
  handleInputKeyDown,
  handleSelectKeyDown,
} from '../../../utils/utils-functions/handleKeyDown';

interface Product {
  id: number;
  product: number;
  product_name: string;
  unit: string;
  qty: string;
  price: string;
  bag: string;
  warehouse: string;
  variance?: string;
  variance_type?: string;
}

const TradingBusinessPurchase = () => {
  const warehouse = useSelector((s: any) => s.activeWarehouse);
  const purchase = useSelector((s: any) => s.tradingPurchase);
  const settings = useSelector((s: any) => s.settings);
  const dispatch = useDispatch<any>();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [warehouseDdlData, setWarehouseDdlData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null); // Define state with type
  const [purchaseType, setPurchaseType] = useState('2'); // Define state with type
  const [unit, setUnit] = useState<string | null>(null); // Define state with type
  const [search, setSearch] = useState(''); // State to store the search value
  const [productData, setProductData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateId, setUpdateId] = useState<any>(null);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);

  const [isUpdateButton, setIsUpdateButton] = useState(false);
  const [isInvoiceUpdate, setIsInvoiceUpdate] = useState(false);
  const [isResetOrder, setIsResetOrder] = useState(true); // State to store the search value
  const [permissions, setPermissions] = useState<any>([]);
  const [voucherType, setVoucherType] = useState('');
  const [lineTotal, setLineTotal] = useState<number>(0);

  useEffect(() => {
    dispatch(userCurrentBranch());
    dispatch(getDdlWarehouse());
    setPermissions(settings.data.permissions);
  }, []);

  interface FormData {
    mtmId: string;
    account: string;
    accountName: string;
    invoice_no: string;
    invoice_date: string;
    paymentAmt: string;
    discountAmt: number;
    purchaseOrderNumber: string;
    purchaseOrderText: string;
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
    invoice_no: '',
    invoice_date: '',
    paymentAmt: '',
    discountAmt: 0,
    vehicleNumber: '',
    purchaseOrderNumber: '',
    purchaseOrderText: '',
    notes: '',
    currentProduct: null, // Initialize `currentProduct` as null
    searchInvoice: '',
    products: [],
  };

  const [formData, setFormData] = useState<FormData>({
    mtmId: '',
    account: '',
    accountName: '',
    invoice_no: '',
    invoice_date: '',
    paymentAmt: '',
    discountAmt: 0,
    vehicleNumber: '',
    purchaseOrderNumber: '',
    purchaseOrderText: '',
    notes: '',
    currentProduct: null, // Initialize `currentProduct` as null
    searchInvoice: '',
    products: [],
  });

  useEffect(() => {
    if (warehouse?.data && warehouse?.data.length > 0) {
      setWarehouseDdlData(warehouse?.data);
    }
  }, [warehouse?.data]);

  const supplierAccountHandler = (option: any) => {
    const key = 'account'; // Set the desired key dynamically
    const accountName = 'accountName'; // Set the desired key dynamically
    setFormData({
      ...formData,
      [key]: option.value,
      [accountName]: option.label,
    });
  };

  const orderHandler = (option: any) => {
    const key = 'purchaseOrderNumber'; // Set the desired key dynamically
    const purchaseOrderText = 'purchaseOrderText'; // Set the desired key dynamically
    setFormData({
      ...formData,
      [key]: option.value,
      [purchaseOrderText]: option.label,
    });
  };

  const productSelectHandler = (option: any) => {
    const key = 'product'; // Set the desired key dynamically
    const accountName = 'product_name'; // Set the desired key dynamically
    const unit = 'unit'; // Set the desired key dynamically
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
    const qty = parseFloat(productData.qty) || 0; // Use the latest qty
    const priceValue = Number(option.label_3) || 0; // Use the price from the selected product
    const newLineTotal = qty * priceValue;

    // Update the lineTotal state with the new value
    setLineTotal(newLineTotal);
  };

  const resetProducts = () => {
    setFormData(initialFormData); // Reset to the initial state
    setIsUpdateButton(false);
    isUpdating && setIsUpdating(false);
  };

  const weightVarianceType = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const variance_type = 'variance_type'; // Set the desired key dynamically
    setProductData({ ...productData, [variance_type]: e.target.value });
  };

  const searchInvoice = () => {
    if (!search) {
      toast.info('Please enter an invoice number');
      return;
    }
    dispatch(
      tradingPurchaseEdit(
        { invoiceNo: search, purchaseType: purchaseType },
        (message: string) => {
          if (message) {
            toast.error(message);
          }
        },
      ),
    );
    if (purchase.isEdit === true) {
      setIsUpdateButton(true);
    }
    setFormData({ ...formData, searchInvoice: search }); // Update the state with the search value
    setIsInvoiceUpdate(true);
  };

  // Process `purchase.data` when it updates
  useEffect(() => {
    if (purchase?.data?.invoice_date) {
      const parsedDate = new Date(purchase.data.invoice_date);
      if (!isNaN(parsedDate.getTime())) {
        setStartDate(parsedDate);
      } else {
        console.warn(
          'Invalid date format in invoice_date:',
          purchase.data.invoice_date,
        );
        setStartDate(null);
      }
    } else {
      setStartDate(null);
    }
    if (purchase?.data?.products) {
      const products: Product[] = purchase.data.products.map(
        (product: any) => ({
          id: product.id,
          product: product.product,
          product_name: product.product_name, // Replace with actual logic if available
          unit: product.unit, // Replace with actual logic if available
          qty: product.quantity,
          price: product.price,
          bag: product.bag,
          warehouse: product.warehouse ? product.warehouse.toString() : '',
          variance: product.weight_variance,
          variance_type: product.variance_type,
        }),
      );

      if (products && products.length > 0) {
        setFormData({
          ...purchase.data,
          products,
        });
        toast.success('Thank you for finding the invoice!');
      } else {
        setFormData({
          ...purchase.data,
          products: [],
        });
        toast.success('Something went wrong!');
      }
    }
  }, [purchase?.data]);

  const addProduct = () => {
    const isValid = validateProductData(productData);
    if (!isValid) {
      // Proceed with form submission or API call
      return;
    }

    // Generate a unique ID for the product
    const newProduct: Product = {
      ...productData,
      id: Date.now(), // Use timestamp as a unique ID
      product: productData.product || 0,
      product_name: productData.product_name || '',
      unit: productData.unit || '',
      qty: productData.qty || '',
      price: productData.price || '',
    };

    // Add the product to the formData.products array
    setFormData((prevFormData) => ({
      ...prevFormData,
      products: [...prevFormData.products, newProduct],
    }));

    setTimeout(() => {
      const nextElement = document.getElementById('product');
      if (nextElement instanceof HTMLElement) {
        nextElement.focus();
      }
    }, 100);
  };

  const editProduct = () => {
    const isValid = validateProductData(productData);
    if (!isValid) {
      // Proceed with form submission or API call
      return;
    }
    let products = formData.products;
    let newItem: Product = {
      id: Date.now(), // Use timestamp as a unique ID
      product: productData.product || 0,
      product_name: productData.product_name || '',
      unit: productData.unit || '',
      qty: productData.qty || '',
      price: productData.price || '',
      bag: productData.bag || '',
      warehouse: productData.warehouse || '',
      variance: productData.variance || '',
      variance_type: productData.variance_type || '',
    };
    products[updateId] = newItem;
    // Add the product to the formData.products array
    setFormData((prevFormData) => ({
      ...prevFormData,
      products: products,
    }));
    setIsUpdating(false);
    setUpdateId(null);
  };

  const totalAmount = formData.products.reduce(
    (sum, row) => sum + Number(row.qty) * Number(row.price),
    0,
  );

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
    const voucherNo = purchase?.data?.vr_no || '';
    if (voucherNo !== '') {
      toast.success(`Voucher No.: ${voucherNo}`);
      setFormData((prevState) => ({
        ...prevState, // Spread the previous state to retain all other properties
        products: [], // Reset only the `products` array
      }));
    }
  }, [purchase?.data?.vr_no, purchase?.isUpdated]);

  useEffect(() => {
    setFormData((prevState) => ({
      ...prevState, // Spread the previous state to retain all other properties
      products: [], // Reset only the `products` array
    }));
  }, [purchase.isUpdated]);

  const handlePurchaseInvoiceSave = async () => {
    setSaveButtonLoading(true);
    const validationMessages = validateForm(formData, invoiceMessage);
    if (validationMessages) {
      toast.info(validationMessages);
      setSaveButtonLoading(false);
      return;
    }

    if (!formData.account || formData.products.length === 0) {
      toast.error('Please add products information!');
      setSaveButtonLoading(false);
      return;
    }

    dispatch(
      purchaseStore(formData, function (message) {
        if (message) {
          toast.error(message);
        }
        setTimeout(() => {
          setFormData((prevFormData) => ({
            ...prevFormData,
            paymentAmt: '',
            discountAmt: 0,
            notes: '',
            invoice_no: '',
            invoice_date: '',
            vehicleNumber: '',
            purchaseOrderNumber: '',
            purchaseOrderText: '',
            products: [],
          }));
          setSaveButtonLoading(false);
        }, 1000);
      }),
    );
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

    // Save Invoice
    dispatch(
      purchaseUpdate(formData, function (message) {
        if (message) {
          toast.info(message);
        }
      }),
    );
    setIsUpdateButton(false);
    setIsUpdating(false);
  };

  useEffect(() => {
    if (purchase.isEdit) {
      setIsUpdateButton(true);
    } else {
      setIsUpdateButton(false);
    }
  }, [purchase.isEdit]);

  const handleStartDate = (e: any) => {
    const startD = dayjs(e).format('YYYY-MM-DD'); // Adjust format as needed
    const key = 'invoice_date'; // Set the desired key dynamically
    setFormData({ ...formData, [key]: startD });
  };

  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProductData({ ...productData, [e.target.name]: e.target.value });
  };

  const editProductItem = (productId: number) => {
    // Find the product by its unique id
    const productIndex = formData.products.findIndex(
      (item) => item.id === productId,
    );

    if (productIndex === -1) {
      // console.error("Product not found");
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

  const handleOrderReset = () => {
    setFormData((prevState) => ({
      ...prevState,
      purchaseOrderNumber: '', // Clear this field
      purchaseOrderText: '', // Clear this field
    }));
    setIsResetOrder(false);
  };

  const handlePurchaseType = (e: any) => {
    setPurchaseType(e.target.value);
  };

  useCtrlS(handlePurchaseInvoiceSave);

  const handleChangeVoucherType = (e: any) => {
    setVoucherType(e.target.value);
  };

  useEffect(() => {
    const total = formData.products.reduce((acc, product) => {
      const qty = parseFloat(product.qty) || 0;
      const price = parseFloat(product.price) || 0;
      return acc + qty * price;
    }, 0);

    const discount = formData.discountAmt || 0;
    const netTotal = total - discount;

    setFormData((prev) => ({
      ...prev,
      paymentAmt: netTotal.toFixed(2), // Keep as string
    }));
  }, [formData.account, formData.products, formData.discountAmt]);

  return (
    <>
      <HelmetTitle title="Purchase Invoice" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
        {purchase.isLoading ? <Loader /> : null}
        <div className="self-start md:self-auto">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-black dark:text-white" htmlFor="">
                  Select Supplier
                </label>
                <DdlMultiline
                  id="account"
                  name="account"
                  onSelect={supplierAccountHandler}
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
                      setTimeout(() => {
                        handleSelectKeyDown(e, '#purchaseOrderNumber');
                      }, 150);
                    }
                  }}
                  acType={'3'}
                />
              </div>
              <div className="relative">
                <div>
                  <label className="text-black dark:text-white" htmlFor="">
                    Select Purchase Order
                  </label>
                  <OrderDropdown
                    id="purchaseOrderNumber"
                    name="purchaseOrderNumber"
                    onSelect={orderHandler}
                    // defaultValue={
                    //   formData.purchaseOrderNumber
                    //     ? {
                    //         value: formData.purchaseOrderNumber,
                    //         label: formData.purchaseOrderText, //productData.accountName
                    //       }
                    //     : null
                    // }
                    value={
                      formData.purchaseOrderNumber
                        ? {
                            value: formData.purchaseOrderNumber,
                            label: formData.purchaseOrderText, //productData.accountName
                          }
                        : null
                    }
                    onKeyDown={(e) => handleInputKeyDown(e, 'invoice_no')} // Pass the next field's ID
                  />
                </div>
                <ButtonLoading
                  onClick={handleOrderReset}
                  buttonLoading={buttonLoading}
                  label=" "
                  className="whitespace-nowrap text-center mr-0 w-15 absolute right-0 top-6 h-9.5"
                  icon={<FiRefreshCcw className="text-white text-lg" />}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InputElement
                id="invoice_no"
                value={formData.invoice_no}
                name="invoice_no"
                placeholder={'Enter Invoice Number'}
                label={'Invoice Number'}
                className={'py-1 -mt-1'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'invoice_date')} // Pass the next field's ID
              />
              <div className="w-full">
                <label className="text-black dark:text-white" htmlFor="">
                  Invoice Date
                </label>
                <InputDatePicker
                  id="invoice_date"
                  name="invoice_date"
                  setCurrentDate={handleStartDate}
                  className="w-full p-1"
                  selectedDate={startDate}
                  setSelectedDate={setStartDate}
                  onKeyDown={(e) => handleInputKeyDown(e, 'vehicleNumber')} // Pass the next field's ID
                />
              </div>
              <InputElement
                id="vehicleNumber"
                value={formData.vehicleNumber}
                name="vehicleNumber"
                placeholder={'Vehicle Number'}
                label={'Vehicle Number'}
                className={'py-1 -mt-1'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'paymentAmt')} // Pass the next field's ID
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InputElement
                id="paymentAmt"
                value={formData.paymentAmt}
                name="paymentAmt"
                placeholder={'Payment Amount'}
                disabled={Number(formData.account) === 17}
                label={'Payment Amount'}
                type="number"
                className={'py-1'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'discountAmt')} // Pass the next field's ID
              />
              <InputElement
                id="discountAmt"
                value={formData.discountAmt.toString()}
                name="discountAmt"
                type="number"
                placeholder={'Discount Amount'}
                label={'Discount Amount'}
                className={'py-1 text-right'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'notes')} // Dynamically pass the next element's ID
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
                    setTimeout(() => {
                      const productInput = document.querySelector('#product');
                      if (productInput instanceof HTMLElement) {
                        productInput.focus();
                      } else {
                        console.warn('Product input not found');
                      }
                    }, 100);
                  }
                }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-0">
              <div className="mt-4 ">
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
                      onChange={handlePurchaseType}
                      defaultValue={productData?.variance_type || ''}
                      data={PurchaseType}
                      className="w-full h-8.5"
                    />
                  </div>
                  <>
                    <div className="relative mt-2">
                      <div className="w-full ">
                        <InputOnly
                          id="search"
                          value={search}
                          name="search"
                          placeholder={'Search Invoice'}
                          label={''}
                          className={'py-1 w-full bg-white'}
                          onChange={(e) => setSearch(e.target.value)}
                          onKeyDown={(e) => handleInputKeyDown(e, 'btnSearch')} // Pass the next field's ID
                        />
                      </div>
                      <ButtonLoading
                        id="btnSearch"
                        name="btnSearch"
                        onClick={searchInvoice}
                        buttonLoading={buttonLoading}
                        label=""
                        className="whitespace-nowrap !bg-transparent text-center mr-0 py-2 -mt-6 absolute -right-2 top-6 background-red-500 !pr-2 !pl-2"
                        icon={
                          <FiSearch className="dark:text-white text-black-2 text-lg ml-2  mr-2" />
                        }
                      />
                    </div>
                  </>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-black dark:text-white" htmlFor="">
                  Select Product
                </label>
                <ProductDropdown
                  id="product"
                  name="product"
                  onSelect={productSelectHandler}
                  // defaultValue={
                  //   productData.product_name && productData.product
                  //     ? {
                  //         label: productData.product_name,
                  //         value: productData.product,
                  //       }
                  //     : null
                  // }
                  value={
                    productData.product_name && productData.product
                      ? {
                          label: productData.product_name,
                          value: productData.product,
                        }
                      : null
                  }
                  // onKeyDown={(e) => handleInputKeyDown(e, 'warehouse')} // Pass the next field's ID
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const nextElement = document.getElementById('warehouse');
                      if (nextElement) {
                        nextElement.focus();
                      }
                    }
                  }}
                />
              </div>
              <div>
                <label className="text-black dark:text-white" htmlFor="">
                  Select Warehouse
                </label>
                {warehouse.isLoading == true ? <Loader /> : ''}
                <WarehouseDropdown
                  id="warehouse"
                  onChange={handleWarehouseChange}
                  className="w-60 font-medium text-sm p-2 "
                  warehouseDdl={warehouseDdlData}
                  defaultValue={productData?.warehouse || ''}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InputElement
                id="bag"
                value={productData.bag}
                name="bag"
                type="number"
                placeholder={'Enter bag number'}
                label={'Bag Number'}
                className={'py-1'}
                onChange={handleProductChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'variance')} // Pass the next field's ID
              />
              <div className="block relative">
                <InputElement
                  id="variance"
                  value={productData.variance}
                  name="variance"
                  type="number"
                  placeholder={'Weight Variance'}
                  label={'Weight Variance'}
                  className={'py-1'}
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'qty')} // Pass the next field's ID
                />
                <span className="absolute top-7 right-3 z-50">{unit}</span>
              </div>
              <div>
                <label htmlFor="" className="text-black dark:text-white">
                  {'Variance Type'}
                </label>
                <SelectWeightVariance
                  value={productData.variance_type}
                  onChange={weightVarianceType}
                  defaultValue={productData?.variance_type || ''}
                  className="w-full h-8.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2">
              <div className="block relative">
                <InputElement
                  id="qty"
                  value={productData.qty}
                  name="qty"
                  placeholder={'Enter Quantity'}
                  type="number"
                  label={'Quantity'}
                  className={'py-1'}
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'price')} // Pass the next field's ID
                />
                <span className="absolute top-8 right-3 z-50">{unit}</span>
              </div>
              <div className="block relative">
                <InputElement
                  id="price"
                  value={productData.price}
                  name="price"
                  type="number"
                  placeholder={'Enter Price'}
                  label={'Price'}
                  className={'py-1'}
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'addProduct')} // Pass the next field's ID
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
                  icon={<FiEdit2 className="text-white text-lg ml-2  mr-2" />}
                />
              ) : (
                <ButtonLoading
                  id="addProduct"
                  name="addProduct"
                  onClick={addProduct}
                  buttonLoading={buttonLoading}
                  label="Add New"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
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
                  icon={<FiEdit className="text-white text-lg ml-2  mr-2" />}
                />
              ) : (
                <ButtonLoading
                  onClick={handlePurchaseInvoiceSave}
                  buttonLoading={buttonLoading}
                  label="Save"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
                />
              )}

              <ButtonLoading
                onClick={resetProducts}
                buttonLoading={buttonLoading}
                label="Reset"
                className="whitespace-nowrap text-center mr-0"
                icon={
                  <FiRefreshCcw className="text-white text-lg ml-2  mr-2" />
                }
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
                    {thousandSeparator(Number(row.qty), 2)} {row.unit}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right `}
                  >
                    {thousandSeparator(Number(row.price), 2)}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right `}
                  >
                    {thousandSeparator(Number(row.price) * Number(row.qty), 2)}
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
    </>
  );
};

export default TradingBusinessPurchase;
