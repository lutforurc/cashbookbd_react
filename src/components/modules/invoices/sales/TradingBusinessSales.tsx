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
import SelectWeightVariance from '../../../utils/utils-functions/SelectWeightVariance';
import {
  tradingSalesEdit,
  tradingSalesStore,
  tradingSalesUpdate,
} from './tradingSalesSlice';
import OrderDropdown from '../../../utils/utils-functions/OrderDropdown';
import { validateProductData } from '../../../utils/utils-functions/productValidationHandler';
import { invoiceMessage } from '../../../utils/utils-functions/invoiceMessage';
import { validateForm } from '../../../utils/utils-functions/validationUtils';
import dayjs from 'dayjs';
import InputOnly from '../../../utils/fields/InputOnly';
import { hasPermission } from '../../../utils/permissionChecker';
import InputDatePicker from '../../../utils/fields/DatePicker';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { SalesType } from '../../../../common/dropdownData';
import {
  handleInputKeyDown,
  handleSelectKeyDown,
} from '../../../utils/utils-functions/handleKeyDown';

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
  // sales_type?: string;
}

const TradingBusinessSales = () => {
  const warehouse = useSelector((s: any) => s.activeWarehouse);
  const sales = useSelector((s: any) => s.trasingSales);
  const settings = useSelector((s: any) => s.settings);
  const dispatch = useDispatch();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [warehouseDdlData, setWarehouseDdlData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null); // Define state with type
  const [salesType, setSalesType] = useState('1'); // Define state with type
  const [unit, setUnit] = useState<string | null>(null); // Define state with type
  const [search, setSearch] = useState(''); // State to store the search value
  const [productData, setProductData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateId, setUpdateId] = useState<any>(null);
  const [isInvoiceUpdate, setIsInvoiceUpdate] = useState(false);
  const [isUpdateButton, setIsUpdateButton] = useState(false);
  const [isResetOrder, setIsResetOrder] = useState(true); // State to store the search value
  const [permissions, setPermissions] = useState<any>([]);
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
    receivedAmt: string;
    discountAmt: number;
    salesOrderNumber: string;
    salesOrderText: string;
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
    receivedAmt: '',
    discountAmt: 0,
    salesOrderNumber: '',
    salesOrderText: '',
    purchaseOrderNumber: '',
    purchaseOrderText: '',
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

  const salesOrderNumberHandler = (option: any) => {
    const salesOrderNumber = 'salesOrderNumber'; // This is the sales order number
    const salesOrderText = 'salesOrderText'; // This is the sales order Text+
    setFormData({
      ...formData,
      [salesOrderNumber]: option.value,
      [salesOrderText]: option.label,
    });
  };

  const purchaseOrderNumberHandler = (option: any) => {
    console.log(option.value);
    const purchaseOrderNumber = 'purchaseOrderNumber'; // Key for sales order number
    const purchaseOrderText = 'purchaseOrderText'; // Key for sales order text

    setFormData({
      ...formData,
      [purchaseOrderNumber]: option.value,
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
    setLineTotal(Number(newLineTotal.toFixed(2))); // Keep it as a string for display
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

  const handleSalesType = (e: any) => {
    setSalesType(e.target.value);
  };

  const searchInvoice = () => {
    if (!search) {
      toast.info('Please enter an invoice number');
      return;
    }
    dispatch(
      tradingSalesEdit(
        { invoiceNo: search, salesType: salesType },
        (message: string) => {
          if (message) {
            toast.error(message);
          }
        },
      ),
    );
    if (sales.isEdit === true) {
      setIsUpdateButton(true);
    }
    setFormData({ ...formData, searchInvoice: search }); // Update the state with the search value
    setIsInvoiceUpdate(true);
  };

  // Process `purchase.data` when it updates
  useEffect(() => {
    if (sales?.data?.invoice_date) {
      const parsedDate = new Date(sales.data.invoice_date);
      if (!isNaN(parsedDate.getTime())) {
        setStartDate(parsedDate);
      } else {
        console.warn(
          'Invalid date format in invoice_date:',
          sales.data.invoice_date,
        );
        setStartDate(null);
      }
    } else {
      setStartDate(null);
    }
    if (sales?.data?.products) {
      const products: Product[] = sales.data.products.map((product: any) => ({
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
      }));

      if (products && products.length > 0) {
        setFormData({
          ...sales.data,
          products,
        });
      } else {
        setFormData({
          ...sales.data,
          products: [],
        });
        toast.success('Something went wrong!');
      }
    }
  }, [sales?.data]);

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
    if (!isValid) {
      // Proceed with form submission or API call
      return;
    }
    // let products = formData.products;
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
    // products[updateId] = newItem;
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

      setLineTotal(Number(newLineTotal.toFixed(2))); // Keep it as a string for display
      return updatedProductData;
    });
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

  const handleInvoiceSave = async () => {
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
        tradingSalesStore(formData, function (message) {
          if (message) {
            toast.error(message);
          }
        }),
      );
    } catch (error) {
      console.log(error);
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
      tradingSalesUpdate(formData, function (message) {
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
    console.log(formData.products);
    const productIndex = formData.products.findIndex(
      (item) => item.id === productId,
    );

    if (productIndex === -1) {
      return;
    }

    // Retrieve the specific product
    const product = formData.products[productIndex];

    setFormData((prevState) => ({
      ...prevState,
      currentProduct: { ...product, index: productIndex }, // Store index to identify the product during save
    }));

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

  // useEffect(() => {
  //   const total = formData.products.reduce((acc, product) => {
  //     const qty = parseFloat(product.qty.toString()) || 0;
  //     const price = parseFloat(product.price.toString()) || 0;
  //     return acc + qty * price;
  //   }, 0);

  //   const discount = parseFloat(formData.discountAmt?.toString() || '0') || 0;
  //   const netTotal = total - discount;

  //   setFormData((prev) => ({
  //     ...prev,
  //     receivedAmt: netTotal.toFixed(2),
  //   }));
  // }, [formData.account, formData.products, formData.discountAmt]);

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
        salesOrderNumber: sales.data.transaction.sales_master.sales_order.id.toString() || '',
        salesOrderText: sales.data.transaction.sales_master.sales_order.order_number,
        purchaseOrderNumber: '',
        purchaseOrderText: '',
        receivedAmt:
          sales.data.transaction.sales_master.netpayment.toString() || '',
        discountAmt:
          parseFloat(sales.data.transaction.sales_master.discount) || 0,
        notes: sales.data.transaction.sales_master.notes || '',
        products: products || [],
      };

      setFormData(updatedFormData);
    }
  }, [sales.data.transaction]);

  return (
    <>
      <HelmetTitle title="Sales Invoice" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
        {sales.isLoading ? <Loader /> : null}
        <div className="self-start md:self-auto">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label htmlFor="">Select Customer</label>
                <DdlMultiline
                  onSelect={customerAccountHandler}
                  // defaultValue={formData.account ? {
                  //     value: formData.account, label: formData.accountName, //productData.accountName
                  // } : null}
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
                      }, 150);
                    }
                  }}
                  acType={'3'}
                />
              </div>
              <InputElement
                id="vehicleNumber"
                value={formData.vehicleNumber}
                name="vehicleNumber"
                placeholder={'Vehicle Number'}
                label={'Vehicle Number'}
                className={'py-1.5 -mt-1'}
                onChange={handleOnChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setTimeout(() => {
                      handleSelectKeyDown(e, '#purchaseOrderNumber');
                    }, 150);
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="relative">
                <div>
                  <label htmlFor="">Select Purchase Order</label>
                  <OrderDropdown
                    id="purchaseOrderNumber"
                    name="purchaseOrderNumber"
                    onSelect={purchaseOrderNumberHandler}
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setTimeout(() => {
                          handleSelectKeyDown(e, '#salesOrderNumber');
                        }, 150);
                      }
                    }}
                    // onKeyDown={(e) => handleInputKeyDown(e, 'salesOrderNumber')} // Pass the next field's ID
                  />
                </div>

                <ButtonLoading
                  onClick={handlePurchaseOrderReset}
                  buttonLoading={buttonLoading}
                  label=" "
                  className="whitespace-nowrap text-center mr-0 w-15 absolute right-0 top-6 h-9.5"
                  icon={<FiRefreshCcw className="text-white text-lg" />}
                />
              </div>
              <div className="relative">
                <div>
                  <label htmlFor="">Select Sales Order</label>
                  <OrderDropdown
                    id="salesOrderNumber"
                    name="salesOrderNumber"
                    onSelect={salesOrderNumberHandler}
                    // defaultValue={
                    //   formData.salesOrderNumber
                    //     ? {
                    //         value: formData.salesOrderNumber,
                    //         label: formData.salesOrderText, //productData.accountName
                    //       }
                    //     : null
                    // }
                    value={
                      formData.salesOrderNumber
                        ? {
                            value: formData.salesOrderNumber,
                            label: formData.salesOrderText, //productData.accountName
                          }
                        : null
                    }
                    onKeyDown={(e) => handleInputKeyDown(e, 'receivedAmt')} // Pass the next field's ID
                  />
                </div>
                <ButtonLoading
                  onClick={handleSalesOrderReset}
                  buttonLoading={buttonLoading}
                  label=" "
                  className="whitespace-nowrap text-center mr-0 w-15 absolute right-0 top-6 h-9.5"
                  icon={<FiRefreshCcw className="text-white text-lg" />}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InputElement
                id="receivedAmt"
                value={formData.receivedAmt}
                name="receivedAmt"
                type="number"
                placeholder={'Received Amount'}
                label={'Received Amount'}
                disabled={Number(formData.account) === 17}
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
                        '#products',
                      ) as HTMLInputElement | null;
                      if (input) input.focus();
                      if (input) input.select();
                    }, 150);
                  }
                }}
                // onKeyDown={(e) => {
                //   if (e.key === 'Enter') {
                //     setTimeout(() => {
                //       handleSelectKeyDown(e, '#products');
                //     }, 150);
                //   }
                // }}
              />
            </div>
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
                    onChange={handleSalesType}
                    defaultValue={productData?.variance_type || ''}
                    data={SalesType}
                    className="w-full h-8.5"
                  />
                </div>
                <div className="relative">
                  <div className="w-full -gap-2 mt-2 ">
                    <div className="">
                      <InputOnly
                        id="search"
                        value={search}
                        name="search"
                        placeholder={'Search Invoice'}
                        label={''}
                        className={'py-1 w-full bg-white'}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) =>
                          handleInputKeyDown(e, 'searchInvoice')
                        }
                      />
                    </div>
                    <ButtonLoading
                      id="searchInvoice"
                      name="searchInvoice"
                      onClick={searchInvoice}
                      buttonLoading={buttonLoading}
                      label=""
                      className="whitespace-nowrap !bg-transparent text-center -mr-2 py-2 absolute right-0 top-2 background-red-500 !pr-2 !pl-2"
                      icon={
                        <FiSearch className="dark:text-white text-black-2 text-lg ml-2  mr-2" />
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
                  id="products"
                  name="products"
                  onSelect={productSelectHandler}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      // Delay to allow react-select to complete selection
                      setTimeout(() => {
                        const input = document.querySelector(
                          '#bag',
                        ) as HTMLInputElement | null;
                        if (input) input.focus();
                        if (input) input.select();
                      }, 150);
                    }
                  }}
                  //   defaultValue={
                  //     productData.product_name && productData.product
                  //       ? {
                  //           label: productData.product_name,
                  //           value: productData.product,
                  //         }
                  //       : null
                  //   }
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
                {warehouse.isLoading == true ? <Loader /> : ''}
                <WarehouseDropdown
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
                value={productData.bag || ''}
                name="bag"
                type="number"
                placeholder={'Enter bag number'}
                label={'Enter Bag Number'}
                className={'py-1'}
                onChange={handleProductChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'variance')}
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
                  onKeyDown={(e) => handleInputKeyDown(e, 'qty')}
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
              <div className="block relative">
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
                  onClick={handleInvoiceSave}
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
                    {row.qty} {row.unit}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right `}
                  >
                    {row.price}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white text-right `}
                  >
                    {thousandSeparator(
                      parseFloat((row.price * row.qty).toFixed(2)),
                      2,
                    )}
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

export default TradingBusinessSales;
