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
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { SalesType } from '../../../../common/dropdownData';
import utc from 'dayjs/plugin/utc';
import {
  handleInputKeyDown,
  handleSelectKeyDown,
} from '../../../utils/utils-functions/handleKeyDown';
import QuickCustomerModal from './QuickCustomerModal';
import useCtrlS from '../../../utils/hooks/useCtrlS';
import httpService from '../../../services/httpService';
import {
  API_CHART_OF_ACCOUNTS_DDL_L4_URL,
  API_ORDERS_DDL_URL,
  API_TRADING_SALES_SUGGESTIONS_URL,
} from '../../../services/apiRoutes';
import useVoucherAutoEditSearch from '../../../utils/hooks/useVoucherAutoEditSearch';
import { getDdlProduct } from '../../product/productSlice';
import { getToken } from '../../../../features/authReducer';

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

type SalesSuggestionField = 'vehicle_no' | 'notes';

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

const autofillHighlightClass =
  'border-blue-500 ring-1 ring-blue-500 bg-[#243245] dark:bg-[#243245]';

const getCashReceivedDebit = (transaction: any): string => {
  const masters = Array.isArray(transaction?.acc_transaction_master)
    ? transaction.acc_transaction_master
    : [];

  const totalDebit = masters.reduce((sum: number, master: any) => {
    const details = Array.isArray(master?.acc_transaction_details)
      ? master.acc_transaction_details
      : [];

    return (
      sum +
      details.reduce((detailSum: number, detail: any) => {
        if (Number(detail?.coa4_id) !== 17) return detailSum;
        return detailSum + (parseFloat(detail?.debit) || 0);
      }, 0)
    );
  }, 0);

  return String(totalDebit);
};

const TradingBusinessSales = () => {
  const warehouse = useSelector((s: any) => s.activeWarehouse);
  const sales = useSelector((s: any) => s.trasingSales);
  const userPermissions = useSelector((s: any) => s.settings?.data?.permissions || []);
  const dispatch = useDispatch();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [warehouseDdlData, setWarehouseDdlData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null); // Define state with type
  const [salesType, setSalesType] = useState('1'); // Define state with type
  const [unit, setUnit] = useState<string | null>(null); // Define state with type
  const [search, setSearch] = useState(''); // State to store the search value
  const [productData, setProductData] = useState<any>({});
  const [selectedCustomerOption, setSelectedCustomerOption] = useState<any>(null);
  const [autofillHighlights, setAutofillHighlights] = useState({
    customer: false,
    product: false,
    qty: false,
    price: false,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateId, setUpdateId] = useState<any>(null);
  const [isInvoiceUpdate, setIsInvoiceUpdate] = useState(false);
  const [isUpdateButton, setIsUpdateButton] = useState(false);
  const [isResetOrder, setIsResetOrder] = useState(true); // State to store the search value
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [lineTotal, setLineTotal] = useState<number>(0);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerDraftName, setCustomerDraftName] = useState('');
  const [isReceivedAmtManuallyEdited, setIsReceivedAmtManuallyEdited] = useState(false);
  const [vehicleSuggestions, setVehicleSuggestions] = useState<string[]>([]);
  const [noteSuggestions, setNoteSuggestions] = useState<string[]>([]);
  dayjs.extend(utc);


  useEffect(() => {
    dispatch(userCurrentBranch());
    dispatch(getDdlWarehouse());
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
    currentProduct: null,
    searchInvoice: '',
    products: [],
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    const fetchSuggestions = async (
      field: SalesSuggestionField,
      query: string,
      setter: React.Dispatch<React.SetStateAction<string[]>>,
    ) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        setter([]);
        return;
      }

      try {
        const response = await httpService.get(API_TRADING_SALES_SUGGESTIONS_URL, {
          params: {
            field,
            q: trimmedQuery,
          },
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

  useEffect(() => {
    if (warehouse?.data && warehouse?.data.length > 0) {
      setWarehouseDdlData(warehouse?.data);
    }
  }, [warehouse?.data]);

  const customerAccountHandler = (option: any) => {
    const key = 'account'; // Set the desired key dynamically
    const accountName = 'accountName'; // Set the desired key dynamically
    const isCashCustomer = Number(option?.value) === 17;
    setSelectedCustomerOption(option || null);
    setAutofillHighlights((prev) => ({ ...prev, customer: false }));
    setIsReceivedAmtManuallyEdited(false);
    setFormData({
      ...formData,
      [key]: option.value,
      [accountName]: option.label,
      receivedAmt: isCashCustomer ? formData.receivedAmt : '0',
    });
  };

  const openCustomerModal = (typedName = '') => {
    setCustomerDraftName(typedName);
    setShowCustomerModal(true);
  };

  const closeCustomerModal = () => {
    setShowCustomerModal(false);
  };

  const productSelectHandler = (option: any) => {
    const key = 'product'; // Set the desired key dynamically
    const accountName = 'product_name'; // Set the desired key dynamically
    const unit = 'unit'; // Set the desired key dynamically
    const price = 'price'; // Set the desired key dynamically
    setUnit(option.label_5);
    setAutofillHighlights((prev) => ({ ...prev, product: false, price: false }));

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
    setLineTotal(Number(newLineTotal.toFixed(0))); // Keep it as a string for display
  };
  const resetProducts = () => {
    setFormData(initialFormData); // Reset to the initial state
    setIsUpdateButton(false);
    isUpdating && setIsUpdating(false);
  };

  const handleSalesType = (e: any) => {
    setSalesType(e.target.value);
  };



  const searchInvoice = (searchValue?: string) => {
    const invoiceNo = typeof searchValue === 'string' ? searchValue.trim() : search.trim();

    if (!invoiceNo) {
      toast.info('Please enter an invoice number');
      return;
    }
    dispatch(
      tradingSalesEdit(
        { invoiceNo, salesType: salesType },
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
    setFormData({ ...formData, searchInvoice: invoiceNo }); // Update the state with the search value
    setIsInvoiceUpdate(true);
  };

  useVoucherAutoEditSearch({
    setSearch,
    triggerSearch: searchInvoice,
  });

  // Process `purchase.data` when it updates
  useEffect(() => {
    if (sales.data.transaction) {
      const products = sales.data.transaction?.sales_master.details.map((detail: any) => ({
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
        receivedAmt: getCashReceivedDebit(sales.data.transaction),
        discountAmt:
          parseFloat(sales.data.transaction.sales_master.discount) || 0,
        notes: sales.data.transaction.sales_master.notes || '',
        products: products || [],
      };

      setFormData(updatedFormData);
      setIsReceivedAmtManuallyEdited(false);
    }
  }, [sales.data.transaction]);

  const totalAmount = formData.products.reduce(
    (sum, row) => sum + Number(row.qty) * Number(row.price),
    0,
  );

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
    if (name === 'receivedAmt' && Number(formData.account) !== 17) {
      setIsReceivedAmtManuallyEdited(true);
    }
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleVehicleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') {
      return;
    }

    if (vehicleSuggestions.length > 0) {
      e.preventDefault();
      const [matchedVehicleNumber] = vehicleSuggestions;
      setFormData((prevState) => ({
        ...prevState,
        vehicleNumber: matchedVehicleNumber,
      }));
    }

    setTimeout(() => {
      handleSelectKeyDown(e, '#purchaseOrderNumber');
    }, 150);
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newValue = value ? parseFloat(value) : 0;
    if (name === 'qty' || name === 'price') {
      setAutofillHighlights((prev) => ({
        ...prev,
        qty: name === 'qty' ? false : prev.qty,
        price: name === 'price' ? false : prev.price,
      }));
    }
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

  // useEffect(() => {
  //   const voucherNo = sales?.data?.vr_no || '';
  //   if (voucherNo !== '') {
  //     toast.success(`Voucher No.: ${voucherNo}`);
  //     setFormData((prevState) => ({
  //       ...prevState, // Spread the previous state to retain all other properties
  //       products: [], // Reset only the `products` array
  //     }));
  //   }
  // }, [sales?.data?.vr_no]);

  useEffect(() => {
    setFormData((prevState) => ({
      ...prevState, // Spread the previous state to retain all other properties
      products: [], // Reset only the `products` array
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
    if (formData.receivedAmt == '') {
      toast.info('Please enter received amount');
      setSaveButtonLoading(false);
      return;
    }
    if (formData.products.length == 0) {
      toast.info('Please add some products.');
      setSaveButtonLoading(false);
      return;
    }

    try {
      dispatch(
        tradingSalesStore(formData, function (message) {
          if (message) {
            toast.success(message);
            setTimeout(() => {
              setSaveButtonLoading(false);
              setFormData((prevFormData) => ({
                ...prevFormData,
                receivedAmt: '',
                discountAmt: 0,
                vehicleNumber: '',
                notes: '',
                invoice_no: '',
                invoice_date: '',
                products: [],
              }));
              setSaveButtonLoading(false);
            }, 1000);
          } else {
            toast.info(message);
          }
        }),
      );
    } catch (error) {
      toast.error('Failed to save invoice!');
    }
  };


  //   const initialFormData = {
  //   mtmId: '',
  //   account: '',
  //   accountName: '',
  //   receivedAmt: '',
  //   discountAmt: 0,
  //   salesOrderNumber: '',
  //   salesOrderText: '',
  //   purchaseOrderNumber: '',
  //   purchaseOrderText: '',
  //   vehicleNumber: '',
  //   notes: '',
  //   currentProduct: null,
  //   searchInvoice: '',
  //   products: [],
  // };

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
          setFormData((prevState) => ({
            ...prevState,
            discountAmt: 0,
            products: [],
          }));
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
    setProductData((prevState: any) => ({
      ...prevState,
      product: '',
      product_name: '',
      qty: '',
      price: '',
      unit: '',
    }));
    setSelectedCustomerOption(null);
    setAutofillHighlights({
      customer: false,
      product: false,
      qty: false,
      price: false,
    });
    setUnit(null);
    setLineTotal(0);
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
        account: sales?.data?.transaction?.sales_master?.customer_id.toString() ?? '',
        accountName,
        vehicleNumber: sales.data.transaction.sales_master?.vehicle_no || '',
        salesOrderNumber: sales.data.transaction.sales_master?.sales_order?.id.toString() || '',
        salesOrderText: sales.data.transaction.sales_master?.sales_order?.order_number,
        purchaseOrderNumber: sales.data.transaction.sales_master?.purchase_order?.id.toString() || '',
        purchaseOrderText: sales.data.transaction.sales_master?.purchase_order?.order_number,
        receivedAmt: getCashReceivedDebit(sales.data.transaction),
        discountAmt:
          parseFloat(sales.data.transaction.sales_master.discount) || 0,
        notes: sales.data.transaction.sales_master.notes || '',
        products: products || [],
      };

      setSelectedCustomerOption(
        updatedFormData.account
          ? {
            value: updatedFormData.account,
            label: updatedFormData.accountName,
          }
          : null,
      );
      setFormData(updatedFormData);
    }
  }, [sales.data.transaction]);

  const salesOrderNumberHandler = async (option: any) => {
    setSelectedCustomerOption(null);
    const salesOrderNumber = 'salesOrderNumber'; // This is the sales order number
    const salesOrderText = 'salesOrderText'; // This is the sales order Text+
    let selectedOrderOption = option;

    if (!option?.label_2 && (option?.label || option?.value)) {
      try {
        const token = getToken();
        const params = new URLSearchParams();
        params.set('q', String(option?.label || option?.value || ''));
        params.set('order_type', '2');

        const orderResponse = await fetch(`${API_ORDERS_DDL_URL}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const orderResponseData = await orderResponse.json();
        const orderOptions = orderResponseData?.data?.data;
        const matchedOrder = Array.isArray(orderOptions)
          ? orderOptions.find(
            (item: any) =>
              String(item?.value ?? '') === String(option?.value ?? '') ||
              String(item?.label ?? '').trim().toLowerCase() ===
              String(option?.label ?? '').trim().toLowerCase(),
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
    const fallbackCustomerName =
      selectedOrderOption?.label_2 ??
      '';
    const fallbackProductId =
      selectedOrderOption?.product_id ??
      selectedOrderOption?.item_id ??
      selectedOrderOption?.stock_item_id ??
      selectedOrderOption?.product?.id ??
      '';
    const fallbackProductName =
      selectedOrderOption?.product_name ??
      selectedOrderOption?.item_name ??
      selectedOrderOption?.product ??
      selectedOrderOption?.label_3 ??
      '';
    const unitName =
      selectedOrderOption?.unit ??
      selectedOrderOption?.unit_name ??
      selectedOrderOption?.qty_unit ??
      '';
    const orderQty = Number(
      selectedOrderOption?.remaining_qty ??
      selectedOrderOption?.remaining_quantity ??
      selectedOrderOption?.label_8 ??
      (
        Number(
          selectedOrderOption?.order_qty ??
          selectedOrderOption?.total_order ??
          selectedOrderOption?.quantity ??
          selectedOrderOption?.qty ??
          selectedOrderOption?.label_7 ??
          0,
        ) -
        Number(
          selectedOrderOption?.trx_quantity ??
          selectedOrderOption?.delivery_qty ??
          selectedOrderOption?.linked_quantity ??
          selectedOrderOption?.base_qty ??
          0,
        )
      ),
    );
    const orderRate = Number(
      selectedOrderOption?.order_rate ??
      selectedOrderOption?.rate ??
      selectedOrderOption?.unit_rate ??
      selectedOrderOption?.unit_price ??
      selectedOrderOption?.price ??
      selectedOrderOption?.label_5 ??
      0,
    );

    let resolvedProduct = {
      id: fallbackProductId,
      name: fallbackProductName,
      unit:
        selectedOrderOption?.unit ??
        selectedOrderOption?.unit_name ??
        selectedOrderOption?.qty_unit ??
        '',
      price: orderRate,
    };
    let resolvedCustomer = {
      id: fallbackCustomerId,
      name: fallbackCustomerName,
    };

    const fallbackCustomerOption = fallbackCustomerName
      ? {
        value: fallbackCustomerId || fallbackCustomerName,
        label: fallbackCustomerName,
      }
      : null;

    if (fallbackCustomerOption) {
      setSelectedCustomerOption(fallbackCustomerOption);
    }

    if (fallbackCustomerName) {
      try {
        const token = getToken();
        const response = await fetch(
          `${API_CHART_OF_ACCOUNTS_DDL_L4_URL}?searchName=${encodeURIComponent(fallbackCustomerName)}&acType=3`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const responseData = await response.json();
        const customerOptions = responseData?.data?.data;
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

    if (fallbackProductName) {
      try {
        const response: any = await dispatch(getDdlProduct(fallbackProductName));
        const matchedProduct = Array.isArray(response?.payload)
          ? response.payload.find(
            (item: any) =>
              String(item?.label || '').trim().toLowerCase() ===
              String(fallbackProductName).trim().toLowerCase(),
          ) ?? response.payload[0]
          : null;

        if (matchedProduct) {
          resolvedProduct = {
            id: matchedProduct?.value ?? resolvedProduct.id,
            name: matchedProduct?.label ?? resolvedProduct.name,
            unit: matchedProduct?.label_5 ?? resolvedProduct.unit,
            // Keep the selected sales order rate instead of replacing it with
            // the product dropdown default price.
            price: resolvedProduct.price,
          };
        }
      } catch (error) {
        console.error('Failed to resolve product from sales order:', error);
      }
    }

    const resolvedCustomerOption = resolvedCustomer.name
      ? {
        value: resolvedCustomer.id || resolvedCustomer.name,
        label: resolvedCustomer.name,
      }
      : fallbackCustomerOption;

    setFormData((prevState) => ({
      ...prevState,
      account: resolvedCustomer.id || '',
      accountName: resolvedCustomer.name || fallbackCustomerName,
      [salesOrderNumber]: option.value,
      [salesOrderText]: option.label,
    }));

    setSelectedCustomerOption(resolvedCustomerOption);
    setAutofillHighlights({
      customer: Boolean(resolvedCustomerOption),
      product: Boolean(resolvedProduct.name),
      qty: orderQty > 0,
      price: Number(resolvedProduct.price) > 0,
    });

    setProductData((prevState: any) => ({
      ...prevState,
      product: resolvedProduct.id,
      product_name: resolvedProduct.name,
      qty: orderQty > 0 ? orderQty.toString() : '',
      price: resolvedProduct.price > 0 ? resolvedProduct.price.toString() : '',
      unit: resolvedProduct.unit || unitName,
    }));

    setUnit(resolvedProduct.unit || unitName || null);
    setLineTotal(
      Number(
        (Math.max(orderQty, 0) * Math.max(Number(resolvedProduct.price || 0), 0)).toFixed(0),
      ),
    );
  };


  useEffect(() => {
    if (isUpdateButton || sales.data.transaction) {
      return;
    }

    const total = formData.products.reduce((acc, product) => {
      const qty = parseFloat(product.qty?.toString() || '0') || 0;
      const price = parseFloat(product.price?.toString() || '0') || 0;
      return acc + qty * price;
    }, 0);
    const discount = parseFloat(formData.discountAmt?.toString() || '0') || 0;
    const isCashCustomer = Number(formData.account) === 17;
    const cashReceivedAmt = Math.max(0, total - discount).toFixed(0);

    if (isCashCustomer) {
      if (formData.receivedAmt !== cashReceivedAmt) {
        setFormData((prev) => ({
          ...prev,
          receivedAmt: cashReceivedAmt,
        }));
      }
      if (isReceivedAmtManuallyEdited) {
        setIsReceivedAmtManuallyEdited(false);
      }
    } else if (!isReceivedAmtManuallyEdited && formData.receivedAmt !== '0') {
      setFormData((prev) => ({
        ...prev,
        receivedAmt: '0',
      }));
    }
  }, [
    formData.account,
    formData.discountAmt,
    formData.products,
    formData.receivedAmt,
    isReceivedAmtManuallyEdited,
    isUpdateButton,
    sales.data.transaction,
  ]);


  const purchaseOrderNumberHandler = (option: any) => {
    const purchaseOrderNumber = 'purchaseOrderNumber'; // Key for sales order number
    const purchaseOrderText = 'purchaseOrderText'; // Key for sales order text

    setFormData({
      ...formData,
      [purchaseOrderNumber]: option.value,
      [purchaseOrderText]: option.label,
    });
  };

  const weightVarianceType = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const variance_type = 'variance_type'; // Set the desired key dynamically
    setProductData({ ...productData, [variance_type]: e.target.value });
  };


  useCtrlS(handleInvoiceSave);

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
                <div className="flex items-start gap-1">
                  <div className="min-w-0 flex-1">
                    <DdlMultiline
                      key={`${selectedCustomerOption?.value || 'empty'}-${selectedCustomerOption?.label || 'empty'}`}
                      className={`h-9.5 ${autofillHighlights.customer ? autofillHighlightClass : ''}`}
                      onSelect={customerAccountHandler}
                      actionOptionLabel="+ Add New Customer"
                      onActionSelect={openCustomerModal}
                      value={selectedCustomerOption}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
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
                </div>
              </div>
              <InputElement
                id="vehicleNumber"
                value={formData.vehicleNumber}
                name="vehicleNumber"
                placeholder={'Vehicle Number'}
                label={'Vehicle Number'}
                className={'py-1.5'}
                list="sales-vehicle-suggestions"
                autoComplete="off"
                onChange={handleOnChange}
                onKeyDown={handleVehicleNumberKeyDown}
              />
              <datalist id="sales-vehicle-suggestions">
                {vehicleSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
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
                    orderType="1"
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
                    value={
                      formData.salesOrderNumber
                        ? {
                          value: formData.salesOrderNumber,
                          label: formData.salesOrderText,
                        }
                        : null
                    }
                    orderType="2"
                    onKeyDown={(e) => handleInputKeyDown(e, 'receivedAmt')}
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
                list="sales-notes-suggestions"
                autoComplete="off"
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
              <datalist id="sales-notes-suggestions">
                {noteSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-0">
            <div className="mt-4 ">
              <p className="text-sm font-bold dark:text-white">
                Total Tk. {thousandSeparator(totalAmount, 0)}
              </p>
            </div>
            {hasPermission(userPermissions, 'sales.edit') && (
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
                  className={`h-9 ${autofillHighlights.product ? autofillHighlightClass : ''}`}
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
                  className={`py-1 ${autofillHighlights.qty ? autofillHighlightClass : ''}`}
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
                  className={`py-1 ${autofillHighlights.price ? autofillHighlightClass : ''}`}
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
      <QuickCustomerModal
        isOpen={showCustomerModal}
        onClose={closeCustomerModal}
        initialName={customerDraftName}
        onCustomerSaved={({ id, name }) => {
          const isCashCustomer = Number(id) === 17;
          setIsReceivedAmtManuallyEdited(false);
          setFormData((prev) => ({
            ...prev,
            account: id,
            accountName: name,
            receivedAmt: isCashCustomer ? prev.receivedAmt : '0',
          }));
        }}
      />
    </>
  );
};

export default TradingBusinessSales;
