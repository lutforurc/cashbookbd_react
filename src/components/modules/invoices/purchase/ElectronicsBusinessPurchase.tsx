import React, { useEffect, useState } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle.tsx';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline.tsx';
import InputElement from '../../../utils/fields/InputElement.tsx';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons.tsx';
import { toast } from 'react-toastify';
import Link from '../../../utils/others/Link.tsx';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown.tsx';
import { useDispatch, useSelector } from 'react-redux';
import { userCurrentBranch } from '../../branch/branchSlice.tsx';
import { getDdlWarehouse } from '../../warehouse/ddlWarehouseSlider.tsx';
import WarehouseDropdown from '../../../utils/utils-functions/WarehouseDropdown.tsx';
import Loader from '../../../../common/Loader/index.tsx';
import InputDatePicker from '../../../utils/fields/DatePicker.tsx';
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
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator.tsx';
import dayjs from 'dayjs';
import { validateForm } from '../../../utils/utils-functions/validationUtils.ts';
import { invoiceMessage } from '../../../utils/utils-functions/invoiceMessage.ts';
import { validateProductData } from '../../../utils/utils-functions/productValidationHandler.ts';
import InputOnly from '../../../utils/fields/InputOnly.tsx';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown.tsx';
import { hasPermission } from '../../../utils/permissionChecker.tsx';
import { electronicsPurchaseEdit, electronicsPurchaseStore, electronicsPurchaseUpdate } from './electronicsPurchaseSlice.tsx';
import useCtrlS from '../../../utils/hooks/useCtrlS.ts';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon.tsx';
import { PurchaseType } from '../../../../common/dropdownData.tsx';

interface Product {
  id: number;
  product: number;
  product_name: string;
  serial_no: string;
  unit: string;
  qty: string;
  price: string;
  warehouse: string;
}

const ElectronicsBusinessPurchase = () => {
  const warehouse = useSelector((s: any) => s.activeWarehouse);
  const purchase = useSelector((s: any) => s.electronicsPurchase);
  const settings = useSelector((s: any) => s.settings);
  const dispatch = useDispatch<any>();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [warehouseDdlData, setWarehouseDdlData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null); // Define state with type
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
  const [lineTotal, setLineTotal] = useState<number>(0);
  const [purchaseType, setPurchaseType] = useState('2'); // Define state with type

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
    const qty = parseFloat(productData.qty) || 0;
    const priceValue = Number(option.label_3) || 0;
    const newLineTotal = qty * priceValue;

    // Update the lineTotal state with the new value
    setLineTotal(newLineTotal);
  };

  const resetProducts = () => {
    setFormData(initialFormData); // Reset to the initial state
  };

  // const searchInvoice = () => {
  //   if (!search) {
  //     toast.info('Please enter an invoice number');
  //     return;
  //   }
  //   dispatch(
  //     electronicsPurchaseEdit({ invoiceNo: search, purchaseType: purchaseType }, (message: string) => {
  //       if (message) {
  //         toast.error(message);
  //       }
  //     }),
  //   );
  //   setFormData({ ...formData, searchInvoice: search }); // Update the state with the search value
  //   setIsInvoiceUpdate(true);
  // };

  const searchInvoice = () => {
    if (!search) {
      toast.info('Please enter an invoice number');
      return;
    }
    dispatch(
      electronicsPurchaseEdit(
        { invoiceNo: search, purchaseType: purchaseType },
        (message: string) => {
          if (message) {
            toast.info(message);
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
    const trx = purchase?.data?.transaction;
    if (!trx){
      setFormData(initialFormData);
      return;
    } 

    // 1) products mapping (Electronics fields)
    const products = (trx.purchase_master?.details || []).map((detail: any) => ({
      id: detail.id,
      product: detail.product?.id,
      product_name: detail.product?.name,
      serial_no: detail.serial_no || '',
      unit: detail.product?.unit?.name || '',
      qty: detail.quantity ?? 0,
      price: detail.purchase_price ?? 0,
      warehouse: detail.godown_id ? detail.godown_id.toString() : '',
    }));

    // 2) accountName বের করা (supplier name)
    let accountName = '-';
    const supplierId = trx.purchase_master?.supplier_id;

    if (trx.acc_transaction_master?.length) {
      for (const m of trx.acc_transaction_master) {
        for (const d of m.acc_transaction_details || []) {
          if (d.coa_l4?.id === supplierId) {
            accountName = d.coa_l4?.name;
            break;
          }
        }
        if (accountName !== '-') break;
      }
    }

    // 3) invoice date => DatePicker state
    const invDate = trx.purchase_master?.invoice_date;
    if (invDate) {
      const parsed = new Date(invDate);
      setStartDate(!isNaN(parsed.getTime()) ? parsed : null);
    } else {
      setStartDate(null);
    }

    // 4) formData fill
    setFormData((prev) => ({
      ...prev,
      mtmId: purchase?.data?.mtmId?.toString() || '',
      account: supplierId ? supplierId.toString() : '',
      accountName: accountName,
      vehicleNumber: trx.purchase_master?.vehicle_no || '',
      invoice_no: trx.purchase_master?.invoice_no || '',
      invoice_date: trx.purchase_master?.invoice_date || '',
      paymentAmt: trx.purchase_master?.netpayment?.toString() || '',
      discountAmt: Number(trx.purchase_master?.discount || 0),
      notes: trx.purchase_master?.notes || '',
      products: products,
    }));

    toast.success('Invoice loaded successfully!');
  }, [purchase?.data?.transaction]);


  const addProduct = () => {
    const isValid = validateProductData(productData);
    if (!isValid) return;

    // Generate a unique ID for the product
    const newProduct: Product = {
      ...productData,
      id: Date.now(), // Use timestamp as a unique ID
      product: productData.product || 0,
      product_name: productData.product_name || '',
      serial_no: productData.serial_no || '',
      unit: productData.unit || '',
      qty: productData.qty || '',
      price: productData.price || '',
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
      serial_no: productData.serial_no || '',
      unit: productData.unit || '',
      qty: productData.qty || '',
      price: productData.price || '',
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

  const totalAmount = formData.products.reduce(
    (sum, row) => sum + Number(row.qty) * Number(row.price),
    0,
  );

  useEffect(() => {
    if (formData.account == '17') {
      setFormData((prevState) => ({
        ...prevState,
        paymentAmt:
          totalAmount > 0
            ? (totalAmount - prevState.discountAmt).toString()
            : '0',
      }));
    }
  }, [formData.account]);

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

  const handleProductSerialNumberChange = (e) => {
    const { name, value } = e.target;
    const updatedProduct = { ...productData, [name]: value };

    if (name === 'serial_no') {
      const barcodes = value.trim().split(/\s+/).filter(Boolean);
      updatedProduct.qty = barcodes.length;
    }

    setProductData(updatedProduct);
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
      // toast.success(`Voucher No.: ${voucherNo}`);
      setFormData((prevState) => ({
        ...prevState, // Spread the previous state to retain all other properties
        products: [], // Reset only the `products` array
      }));
    }
  }, [purchase?.data?.vr_no, purchase?.isUpdated]);

  // useEffect(() => {
  //   setFormData((prevState) => ({
  //     ...prevState, // Spread the previous state to retain all other properties
  //     products: [], // Reset only the `products` array
  //   }));
  // }, [purchase.isUpdated]);

  const handlePurchaseInvoiceSave = async () => {
    setSaveButtonLoading(true);
    // Check Required fields are not empty
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
      electronicsPurchaseStore(formData, function (message) {
        if (message) {
          toast.success(message);
        }
        setSaveButtonLoading(false);
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
      electronicsPurchaseUpdate(formData, function (message) {
        if (message) {
          toast.info(message);
        }
      }),
    );
    setIsUpdating(false);
  };

  const handleStartDate = (e: any) => {
    const startD = dayjs(e).format('YYYY-MM-DD'); // Adjust format as needed
    const key = 'invoice_date'; // Set the desired key dynamically
    setFormData({ ...formData, [key]: startD });
  };

  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProductData((prev: any) => ({ ...prev, warehouse: e.target.value }));
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
      paymentAmt: netTotal.toFixed(2),
    }));
  }, [formData.products, formData.discountAmt]);

  useEffect(() => {
    if (productData.qty) {
      const qty = parseFloat(productData.qty) || 0;
      const price = parseFloat(productData.price) || 0;
      setLineTotal(qty * price);
    }
  }, [productData.qty]);
  
const BTN = "whitespace-nowrap text-center mr-0 h-9 py-1.5 flex items-center justify-center";

  const handlePurchaseType = (e: any) => {
    setPurchaseType(e.target.value);
  };

  useCtrlS(handlePurchaseInvoiceSave);
  return (
    <>
      <HelmetTitle title="Electronics Purchase Invoice" />
      <div className="text-center font-bold">
        {/* <span className="block text-red-500">(Not Ready)</span> */}
      </div>
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
                  onSelect={supplierAccountHandler}
                  placeholder="Select Supplier"
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
                  onKeyDown={(e) =>
                    handleInputKeyDown(e, 'purchaseOrderNumber')
                  } // Pass the next field's ID
                  acType={'3'}
                />
              </div>
              <InputElement
                id="notes"
                value={formData.notes}
                name="notes"
                placeholder={'Notes'}
                label={'Notes'}
                className={'py-1.5'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'product')} // Dynamically pass the next element's ID
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InputElement
                id="invoice_no"
                value={formData.invoice_no}
                name="invoice_no"
                placeholder={'Invoice Number'}
                label={'Invoice Number'}
                className={'py-1'}
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
                className={'py-1'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'paymentAmt')} // Pass the next field's ID
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
                onKeyDown={(e) => handleInputKeyDown(e, 'notes')} // Dynamically pass the next element's ID
              />
              <InputElement
                id="paymentAmt"
                value={formData.paymentAmt}
                name="paymentAmt"
                placeholder={'Payment Amount'}
                disabled={Number(formData.account) === 17}
                label={'Payment Amount'}
                className={'py-1 text-right'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'discountAmt')} // Pass the next field's ID
              />
              <div className="flex items-end mb-2">
                <p className="text-xs font-bold dark:text-white">
                  Total Tk. {thousandSeparator(totalAmount, 0)}
                </p>
              </div>
              {hasPermission(permissions, 'purchase.edit') && (
                <>
                  <div className="relative ">
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
                    <div className="relative">
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
                  onKeyDown={(e) => handleInputKeyDown(e, 'warehouse')} // Pass the next field's ID
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="block relative">
              <InputElement
                id="qty"
                value={productData.qty}
                name="qty"
                placeholder={'Enter Quantity'}
                label={'Quantity'}
                className={'py-1'}
                type="number"
                onChange={handleProductChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'price')} // Pass the next field's ID
              />
              <span className="absolute top-7 right-3 z-50">{unit}</span>
            </div>
            <div className="block relative">
              <InputElement
                id="price"
                value={productData.price}
                name="price"
                placeholder={'Enter Price'}
                label={'Price'}
                className={'py-1'}
                type="number"
                onChange={handleProductChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'addProduct')} // Pass the next field's ID
              />
              <span className="absolute top-8 right-3 z-50">{lineTotal}</span>
            </div>
            <div></div>
          </div>
          <div className="grid grid-cols-4 gap-x-1 gap-y-1">
            {isUpdating ? (
              <ButtonLoading
                onClick={editProduct}
                buttonLoading={buttonLoading}
                label="Update"
                className="whitespace-nowrap text-center mr-0 h-9 py-1.5"
                icon={<FiEdit2 className="text-white text-lg ml-2  mr-2" />}
              />
            ) : (
              <ButtonLoading
                id="addProduct"
                onClick={addProduct}
                buttonLoading={buttonLoading}
                label="Add New"
                className="whitespace-nowrap text-center mr-0 h-9 py-1.5"
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
            {purchase.isEdit ? (
              <ButtonLoading
                onClick={handleInvoiceUpdate}
                buttonLoading={buttonLoading}
                label="Update"
                className="whitespace-nowrap text-center mr-0 h-9 py-1.5"
                icon={<FiEdit className="text-white text-lg ml-2  mr-2" />}
              />
            ) : (
              <ButtonLoading
                onClick={handlePurchaseInvoiceSave}
                buttonLoading={saveButtonLoading}
                label="Save"
                className="whitespace-nowrap text-center mr-0 h-9 py-1.5"
                icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
                disabled={saveButtonLoading}
              />
            )}

            <ButtonLoading
              onClick={resetProducts}
              buttonLoading={buttonLoading}
              label="Reset"
              className="whitespace-nowrap text-center mr-0 h-9 py-1.5"
              icon={<FiRefreshCcw className="text-white text-lg ml-2  mr-2" />}
            />
            <Link to="/dashboard" className="text-nowrap justify-center mr-0 h-9 py-1.5">
              <FiHome className="text-white text-lg ml-2  mr-2" />
              <span className="hidden md:block">{'Home'}</span>
            </Link>
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

export default ElectronicsBusinessPurchase;
