import React, { useEffect, useRef, useState } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import ToggleSwitch from '../../../utils/utils-functions/ToggleSwitch';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import InputElement from '../../../utils/fields/InputElement';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import { Button, ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import { toast } from 'react-toastify';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import { useDispatch, useSelector } from 'react-redux';
import { userCurrentBranch } from '../../branch/branchSlice';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Loader from '../../../../common/Loader';
import { FiEdit, FiEdit2, FiHome, FiPlus, FiRefreshCcw, FiSave, FiShare, FiTrash2 } from 'react-icons/fi';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { formatDayMonthYear } from '../../../utils/utils-functions/formatDate';
import { FIELD_HEIGHT } from '../../../../theme/fieldStyles';
import { validateProductData } from '../../../utils/utils-functions/productValidationHandler';
import { invoiceMessage } from '../../../utils/utils-functions/invoiceMessage';
import { validateForm } from '../../../utils/utils-functions/validationUtils';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import InputDatePicker from '../../../utils/fields/DatePicker';
import {
  electronicsSalesEdit,
  electronicsSalesStore,
  electronicsSalesUpdate,
} from './electronicsSalesSlice';
import { getServiceList } from '../../settings/settingsSlice'; 
import { VoucherPrintRegistry } from '../../vouchers/VoucherPrintRegistry';
import { useVoucherPrint } from '../../vouchers';
import QuickCustomerModal from './QuickCustomerModal';
import httpService from '../../../services/httpService';
import {
  API_COMPANY_SCHEME_SALE_EDIT_URL,
  API_COMPANY_SCHEME_SALE_STORE_URL,
  API_COMPANY_SCHEME_SALE_UPDATE_URL,
  API_ELECTRONICS_SALES_INVOICE_PRINT_URL,
  API_TRADING_SALES_SUGGESTIONS_URL,
} from '../../../services/apiRoutes';
import { useReactToPrint } from 'react-to-print';
import CompanySchemeInvoicePrint from './CompanySchemeInvoicePrint';
import CompanySchemeImeiModal, { ImeiConflict } from './CompanySchemeImeiModal';
import useVoucherAutoEditSearch from '../../../utils/hooks/useVoucherAutoEditSearch';
import { getSalesTypeForVoucher } from '../../../utils/utils-functions/voucherEditNavigation';
import StockShortageModal, {
  StockShortage,
} from '../../../utils/components/StockShortageModal';
import { Input, Textarea } from '../../../utils/fields/FormControls';

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

type SalesSuggestionField = 'notes';

/** Local date as YYYY-MM-DD. toISOString() converts to UTC, which in GMT+6 slips a day back. */
const toIsoDate = (d: Date | null): string | null =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    : null;

/** A date the API sends as YYYY-MM-DD or DD/MM/YYYY, as a local Date. */
const parseApiDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(value.trim());
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  return null;
};

/** IMEIs in a serial box: spaces, new lines and commas all separate them, as on the server. */
const splitSerials = (value: string): string[] =>
  String(value ?? '').trim().split(/[,\s]+/).filter(Boolean);

const normalizeSuggestionItems = (items: any) =>
  Array.isArray(items)
    ? items
      .map((item: any) => String(item ?? '').trim())
      .filter(
        (item: string, index: number, arr: string[]) =>
          item && arr.indexOf(item) === index,
      )
    : [];

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

/**
 * The Sales screen of an electronics branch that sells on brands' schemes
 * (Branch Setup -> Company Scheme; SalesIndex picks it).
 *
 * A copy of ElectronicsBusinessSales -- that file is left exactly as it was --
 * with one more switch beside Installment Sale:
 *
 *   - neither switch: an ordinary sale, through the Electronics endpoints,
 *     exactly as before;
 *   - Installment Sale: the Electronics installment sale, as before;
 *   - Company Scheme: the account is the brand's scheme account, the buyer is
 *     a name, mobile and address on the invoice, and the sale goes to
 *     company-scheme/sale/*, which also writes one receivable row per IMEI
 *     the brand owes.
 *
 * An invoice loaded for editing keeps its kind: the scheme switch cannot be
 * turned on or off while editing, or the brand's receivable rows would be
 * left behind (or never made).
 */
const CompanySchemeSales = () => {
  const sales = useSelector((s: any) => s.electronicsSales);
  const settings = useSelector((s: any) => s.settings);
  const dispatch = useDispatch();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [updateButtonLoading, setUpdateButtonLoading] = useState(false);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  // The invoice waiting on an answer, held with the question so Continue can
  // send exactly what was refused rather than whatever the form holds by then.
  const [stockWarning, setStockWarning] = useState<(StockShortage & { payload: any }) | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [earlyPaymentDate, setEarlyPaymentDate] = useState<Date | null>(null);
  const [salesType, setSalesType] = useState('1');
  const [unit, setUnit] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [productData, setProductData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateId, setUpdateId] = useState<any>(null);
  const [isUpdateButton, setIsUpdateButton] = useState(false);
  const [isInstallment, setIsInstallment] = useState(false);
  // Company Scheme: the brand pays the balance later, tracked IMEI by IMEI.
  const [isCompanyScheme, setIsCompanyScheme] = useState(false);
  const [schemeDueDate, setSchemeDueDate] = useState<Date | null>(null);
  // The last scheme invoice saved or opened, for Print; null for an ordinary one.
  const [schemeInvoice, setSchemeInvoice] = useState<{ id: number; vr_no: string } | null>(null);
  const [schemePrintData, setSchemePrintData] = useState<any>(null);
  // An IMEI already on another scheme invoice: the question, and the sale to send again.
  const [imeiQuestion, setImeiQuestion] = useState<{ conflicts: ImeiConflict[]; payload: any } | null>(null);
  const schemePrintRef = useRef<HTMLDivElement>(null);
  const printSchemeInvoice = useReactToPrint({ contentRef: schemePrintRef });
  const [isEarlyPayment, setIsEarlyPayment] = useState(false);
  const [showInstallmentPopup, setShowInstallmentPopup] = useState(false);
  const [lineTotal, setLineTotal] = useState<number>(0);
  const [editedInstallments, setEditedInstallments] = useState<editInstallmentData[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerDraftName, setCustomerDraftName] = useState('');
  const [isReceivedAmtManuallyEdited, setIsReceivedAmtManuallyEdited] = useState(false);
  const previousReceivedBeforeCashRef = useRef('');
  const printRef = useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(12);
  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);
  const [noteSuggestions, setNoteSuggestions] = useState<string[]>([]);
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
    dispatch(getServiceList());
  }, []);


  useEffect(() => {
    if (productData.qty) {
      const qty = parseFloat(productData.qty) || 0;
      const price = parseFloat(productData.price) || 0;
      setLineTotal(qty * price);
    }
  }, [productData.qty]);



  const handlePerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setPerPage(value);
    } else {
      setPerPage(0); // cleared box = All
    }
  };
  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);

    if (!isNaN(value)) {
      setFontSize(value);
    } else {
      setFontSize(10); // Reset if input is invalid
    }
  };

  interface FormData {
    mtmId: string;
    account: string;
    accountName: string;
    receivedAmt: string;
    discountAmt: number;
    notes: string;
    serviceCharge: number;
    tdsAmount: number;
    transportationAmt: number;
    currentProduct: { index?: number } | null;
    searchInvoice: string;
    products: Product[];
    editInstallmentData: editInstallmentData[];
    // The end buyer on a Company Scheme sale -- text, not a ledger party.
    name: string;
    mobile: string;
    address: string;
  }

  const initialFormData = {
    mtmId: '',
    account: '',
    accountName: '',
    receivedAmt: '',
    discountAmt: 0,
    notes: '',
    serviceCharge: 0,
    tdsAmount: 0,
    transportationAmt: 0,
    currentProduct: null,
    searchInvoice: '',
    products: [],
    editInstallmentData: [],
    name: '',
    mobile: '',
    address: '',
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const getInvoicePayableAmount = (data: FormData = formData) => {
    const productsTotal = data.products.reduce((acc, product) => {
      const qty = parseFloat(product.qty?.toString() || '0') || 0;
      const price = parseFloat(product.price?.toString() || '0') || 0;
      return acc + qty * price;
    }, 0);

    return Math.max(
      0,
      productsTotal +
      (Number(data.serviceCharge) || 0) +
      (Number(data.tdsAmount) || 0) +
      (Number(data.transportationAmt) || 0) -
      (Number(data.discountAmt) || 0),
    ).toFixed(0);
  };

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
        const response = await httpService.get(
          API_TRADING_SALES_SUGGESTIONS_URL,
          {
            params: {
              field,
              q: trimmedQuery,
            },
          },
        );
        setter(normalizeSuggestionItems(response?.data?.data?.data));
      } catch (error) {
        setter([]);
      }
    };

    const notesTimer = window.setTimeout(() => {
      void fetchSuggestions('notes', formData.notes, setNoteSuggestions);
    }, 250);

    return () => {
      window.clearTimeout(notesTimer);
    };
  }, [formData.notes]);

  const customerAccountHandler = (option: any) => {
    const key = 'account';
    const accountName = 'accountName';
    const previousAccount = Number(formData.account);
    const nextAccount = Number(option?.value);
    const isCashCustomer = nextAccount === 17;
    let receivedAmt = formData.receivedAmt;

    if (isCashCustomer) {
      if (previousAccount !== 17) {
        previousReceivedBeforeCashRef.current = formData.receivedAmt;
      }
      receivedAmt = getInvoicePayableAmount();
    } else if (previousAccount === 17) {
      receivedAmt = previousReceivedBeforeCashRef.current || formData.receivedAmt;
    } else if (Number(formData.receivedAmt || 0) <= 0) {
      receivedAmt = '0';
    }

    setIsReceivedAmtManuallyEdited(false);
    setFormData({
      ...formData,
      [key]: option.value,
      [accountName]: option.label,
      receivedAmt,
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
      [price]: Number(option.label_4),
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
    setIsCompanyScheme(false);
    setSchemeDueDate(null);
    setIsReceivedAmtManuallyEdited(false);
    setFormData(initialFormData);
    setInstallmentData({ amount: 0, startDate: null, numberOfInstallments: 0 }); // Reset installment data
  };

  const openCustomerModal = (typedName = '') => {
    setCustomerDraftName(typedName);
    setShowCustomerModal(true);
  };

  const closeCustomerModal = () => {
    setShowCustomerModal(false);
  };


  const searchInvoice = (searchValue?: string) => {
    const invoiceNo = typeof searchValue === 'string' ? searchValue.trim() : search.trim();

    if (!invoiceNo) {
      toast.info('Please enter an invoice number');
      return;
    }

    // A credit sale is numbered 10- and was booked as a journal, so it has to
    // be looked up as one however the box above is set -- opened from the Sales
    // Ledger nobody has touched that box at all.
    const resolvedSalesType = getSalesTypeForVoucher(invoiceNo, salesType);

    if (resolvedSalesType !== salesType) {
      setSalesType(resolvedSalesType);
    }

    dispatch(
      electronicsSalesEdit(
        { invoiceNo, salesType: resolvedSalesType },
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

  useVoucherAutoEditSearch({
    setSearch,
    triggerSearch: searchInvoice,
  });


  function findCoaCredit(items: any[], target = 41, fallback = 23) {
    const found =
      items.find(item => item.coa4_id === target) ||
      items.find(item => item.coa4_id === fallback);

    if (!found) return null;
    return Number(found.credit);
  }


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

      const details = sales?.data?.transaction?.acc_transaction_master?.[0]?.acc_transaction_details || [];


      // Update formData using previous state to maintain integrity
      const updatedFormData = {
        ...formData,
        mtmId: sales.data.mtmId,
        account: sales?.data?.transaction?.sales_master?.customer_id.toString() ?? '',
        accountName,
        receivedAmt: getCashReceivedDebit(sales.data.transaction),
        discountAmt: parseFloat(sales.data.transaction.sales_master.discount) || 0,
        notes: sales.data.transaction.sales_master.notes || '',
        tdsAmount: findCoaCredit(details, 41),
        serviceCharge: findCoaCredit(details, 42),
        transportationAmt: findCoaCredit(details, 198),
        products: products || [],
        name: sales.data.transaction.sales_master.name || '',
        mobile: sales.data.transaction.sales_master.mobile || '',
        address: sales.data.transaction.sales_master.address || '',
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

      // Is it a scheme invoice? The scheme endpoint answers only for one, and
      // with its due date; anything else opens as the ordinary sale it is.
      const loaded = sales.data.transaction;
      setIsCompanyScheme(false);
      setSchemeDueDate(null);
      setSchemeInvoice(null);
      httpService
        .post(API_COMPANY_SCHEME_SALE_EDIT_URL, { invoiceNo: loaded?.vr_no })
        .then((res) => {
          if (!res?.data?.success) return;
          setIsCompanyScheme(true);
          setSchemeDueDate(parseApiDate(res.data.data?.data?.due_date));
          setSchemeInvoice({ id: Number(loaded?.id), vr_no: String(loaded?.vr_no ?? '') });
        })
        .catch(() => undefined);
      previousReceivedBeforeCashRef.current = updatedFormData.receivedAmt;
      setIsReceivedAmtManuallyEdited(false);
    }
  }, [sales.data.transaction]);




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
    if (name === 'receivedAmt') {
      setIsReceivedAmtManuallyEdited(true);
    }
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
      setSchemeInvoice(null);
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



  /** What a Company Scheme sale still lacks, or null when it is complete. */
  const companySchemeProblem = (): string | null => {
    if (!isCompanyScheme) return null;
    if (Number(formData.account) === 17) return "Select the brand's scheme account, not Cash.";
    if (!formData.name.trim() || !formData.mobile.trim()) return "Enter the buyer's name and mobile number.";
    if (formData.products.some((p) => splitSerials(p.serial_no).length === 0)) {
      return 'Every line of a Company Scheme sale needs its IMEI / serial number.';
    }
    return null;
  };

  /**
   * The Company Scheme part of a save. An ordinary sale sends none of it, so
   * it reaches the Electronics endpoint exactly as that form's sale does.
   */
  const companySchemePayload = () =>
    isCompanyScheme
      ? {
          isCompanyScheme: true,
          name: formData.name.trim(),
          mobile: formData.mobile.trim(),
          address: formData.address.trim(),
        }
      : {};

  /**
   * A scheme sale goes to its own endpoint. A refusal keeps the form as it
   * is, so the one thing wrong can be corrected rather than all of it typed
   * again.
   */
  const sendSchemeInvoice = (payload: any, allowNegative = false) => {
    const isUpdate = Boolean(payload.mtmId);
    // The answers already given travel with the sale, so a second question
    // does not undo the first.
    const body = allowNegative ? { ...payload, allow_negative: true } : payload;
    setSaveButtonLoading(true);
    httpService
      .post(isUpdate ? API_COMPANY_SCHEME_SALE_UPDATE_URL : API_COMPANY_SCHEME_SALE_STORE_URL, body)
      .then((res) => {
        const answer = res?.data;
        if (answer?.imei_conflict) {
          setImeiQuestion({ conflicts: Array.isArray(answer?.conflicts) ? answer.conflicts : [], payload: body });
          return;
        }
        if (answer?.stock_shortage) {
          setStockWarning({
            rows: Array.isArray(answer?.shortage_rows) ? answer.shortage_rows : [],
            shortages: Array.isArray(answer?.shortages) ? answer.shortages : [],
            message: answer?.message || 'Not enough stock.',
            blocked: Boolean(answer?.stock_blocked),
            payload: body,
          });
          return;
        }
        if (!answer?.success) {
          toast.info(answer?.message || answer?.error?.message || 'Not saved.');
          return;
        }
        const saved = answer?.data?.data ?? {};
        toast.success(answer.message || `Voucher No.: ${saved.vr_no}`);
        setSchemeInvoice(saved.id ? { id: Number(saved.id), vr_no: String(saved.vr_no ?? '') } : null);
        if (saved.vr_no) setSearch(saved.vr_no);
        resetProducts();
        setEditedInstallments([]);
        setIsUpdateButton(false);
        // Scheme sales tend to come one after another: stay on the scheme,
        // with a fresh due date, rather than drop back to an ordinary sale.
        handleCompanySchemeChange(true);
      })
      .catch((e) => toast.error(e?.response?.data?.message ?? 'Not saved.'))
      .finally(() => setSaveButtonLoading(false));
  };

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

    const schemeProblem = companySchemeProblem();
    if (schemeProblem) {
      toast.info(schemeProblem);
      setSaveButtonLoading(false);
      return;
    }

    const formattedInstallmentData = isInstallment
      ? {
        ...installmentData,
        startDate: installmentData.startDate
          ? dayjs(installmentData.startDate)
            .tz('Asia/Dhaka')
            .format('YYYY-MM-DD')
          : null,
        earlyPaymentDate: installmentData.earlyPaymentDate
          ? dayjs(installmentData.earlyPaymentDate)
            .tz('Asia/Dhaka')
            .format('YYYY-MM-DD')
          : null,
      }
      : null;

    const payload = {
      ...formData,
      isInstallment,
      installmentData: formattedInstallmentData,
      ...companySchemePayload(),
    };

    sendInvoice(payload);
  };

  /**
   * The save itself, kept apart from the validation so the shortage question
   * can send the very same invoice a second time -- with allow_negative -- once
   * the operator has said to go on.
   */
  const sendInvoice = (payload: any, allowNegative = false) => {
    if (payload?.isCompanyScheme) {
      sendSchemeInvoice(payload, allowNegative);
      return;
    }
    setSaveButtonLoading(true);
    const finalPayload = allowNegative ? { ...payload, allow_negative: true } : payload;

    try {
      dispatch(
        electronicsSalesStore(finalPayload, (message: string, response?: any) => {
          // Not enough stock: nothing saved, nothing wrong. Hold the invoice
          // and put the question.
          if (response?.stock_shortage) {
            setStockWarning({
              rows: Array.isArray(response?.shortage_rows) ? response.shortage_rows : [],
              shortages: Array.isArray(response?.shortages) ? response.shortages : [],
              message: response?.message || 'Not enough stock.',
              blocked: Boolean(response?.stock_blocked),
              payload,
            });
            setSaveButtonLoading(false);
            return;
          }

          // Only a real failure is worth a toast; a saved invoice announces
          // itself through the voucher number.
          if (message && !(response?.success ?? false)) {
            toast.error(message);
          }

          setTimeout(() => {
            setSaveButtonLoading(false);
            resetProducts();
            setIsEarlyPayment(false);
          }, 2000);
        }),
      );
    } catch (error) {
      toast.error('Failed to save invoice!');
      setSaveButtonLoading(false);
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

    const schemeProblem = companySchemeProblem();
    if (schemeProblem) {
      toast.info(schemeProblem);
      return;
    }

    if (isCompanyScheme) {
      sendSchemeInvoice({ ...formData, ...companySchemePayload() });
      return;
    }

    const payload = {
      ...formData,
      isInstallment,
      installments: editedInstallments,
      installmentData: isInstallment ? installmentData : null,
      ...companySchemePayload(),
    };
    // try{
    dispatch(
      electronicsSalesUpdate(payload, (message, saved) => {
        if (message) {
          toast.info(message);
        }

        // Settled at last, so the voucher left the credit-sales run for the
        // receipt one and came back under a new number. The box has to follow
        // it, or the next search would look for a number nothing holds.
        if (saved?.vr_no) {
          setSearch(saved.vr_no);
          setFormData((prevState: any) => ({ ...prevState, searchInvoice: saved.vr_no }));
        }
      }),
    );
    setTimeout(() => {
      resetProducts();
      setEditedInstallments([]);
      setUpdateButtonLoading(false);
      setIsUpdateButton(false);
    }, 2000);
 

    setIsUpdating(false);
  };

  useEffect(() => {
    if (sales.isEdit) setIsUpdateButton(true);
    else setIsUpdateButton(false);
  }, [sales.isEdit]);

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

  const handleEarlyPayment = (checked: boolean) => {
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

  // Handle installment toggle change
  const handleInstallmentChange = (checked: boolean) => {
    setIsInstallment(checked);

    if (checked) {
      setIsCompanyScheme(false);
      setSchemeDueDate(null);
      setShowInstallmentPopup(true);
      setInstallmentData((prev) => ({
        ...prev,
      }));
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
    setInstallmentData((prev) => ({
      ...prev,
      earlyPaymentDate: selectedDate.toDate(),
    }));
  };

  /**
   * Company Scheme on: the due date starts where Branch Setup says the brand
   * pays -- the first Scheme Due Weekday after the day's transaction date when
   * one is set, else that date plus Scheme Due Days (CompanySchemeService::
   * defaultDueDate does the same) -- and can be changed. Installment Sale
   * goes off -- an invoice is one or the other.
   */
  const handleCompanySchemeChange = (checked: boolean) => {
    setIsCompanyScheme(checked);

    if (checked) {
      if (isInstallment) handleInstallmentChange(false);
      const base = parseApiDate(settings?.data?.trx_dt) ?? new Date();
      const days = Number(settings?.data?.branch?.company_scheme_due_days) || 30;
      const weekdayMeta = settings?.data?.branch?.company_scheme_due_weekday;
      const weekday = weekdayMeta === null || weekdayMeta === undefined || weekdayMeta === '' ? NaN : Number(weekdayMeta);
      const ahead = weekday >= 0 && weekday <= 6 ? (7 + weekday - base.getDay()) % 7 || 7 : days;
      setSchemeDueDate(new Date(base.getFullYear(), base.getMonth(), base.getDate() + ahead));
    } else {
      setSchemeDueDate(null);
    }
  };

  // What the invoice comes to -- lines, plus charges, less discount: the sum
  // the Total Tk. line showed, now inside the Received Amount box.
  const invoiceTotal =
    formData.products.reduce((sum, row) => sum + Number(row.qty) * Number(row.price), 0) +
    (Number(formData?.serviceCharge) || 0) +
    (Number(formData?.tdsAmount) || 0) +
    (Number(formData?.transportationAmt) || 0) -
    (Number(formData?.discountAmt) || 0);

  /** Scheme invoices print with the buyer's own address; everything else as before. */
  const printInvoice = () => {
    if (!schemeInvoice) {
      handleVoucherPrint({ ...sales.data, mtm_id: sales.data.id });
      return;
    }
    httpService
      .post(API_ELECTRONICS_SALES_INVOICE_PRINT_URL, { mt: schemeInvoice.id })
      .then((res) => {
        if (res?.data?.success) setSchemePrintData({ ...res.data.data.data });
        else toast.info(res?.data?.message || 'Nothing to print.');
      })
      .catch(() => toast.error('Nothing to print.'));
  };

  // Print once the payload is in the hidden paper.
  useEffect(() => {
    if (schemePrintData) printSchemeInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemePrintData]);

  const handleCloseInstallmentPopup = () => {
    setShowInstallmentPopup(false);
  };

  const handleProductSerialNumberChange = (e) => {
    const { name, value } = e.target;
    const updatedProduct = { ...productData, [name]: value };

    if (name === 'serial_no') {
      const barcodes = splitSerials(value);
      updatedProduct.qty = barcodes.length;
    }
    setProductData(updatedProduct);
  };

  useEffect(() => {
    const isCashCustomer = Number(formData.account) === 17;
    const cashReceivedAmt = getInvoicePayableAmount();

    if (isCashCustomer && !isReceivedAmtManuallyEdited) {
      if (formData.receivedAmt !== cashReceivedAmt) {
        setFormData((prev) => ({
          ...prev,
          receivedAmt: cashReceivedAmt,
        }));
      }
    }
  }, [
    formData.account,
    formData.discountAmt,
    formData.serviceCharge,
    formData.tdsAmount,
    formData.transportationAmt,
    formData.products,
    formData.receivedAmt,
    isReceivedAmtManuallyEdited,
  ]);


  const serviceList = (id: number, list: any[]) => {
    return list.find((item) => item.id === id)?.name || "";
  };


  // const handlePrint = useReactToPrint({
  //   content: () => {
  //     if (!printRef.current) {
  //       toast.info('Invoice data not ready');
  //       return null;
  //     }
  //     return printRef.current;
  //   },

  //   documentTitle: `Invoice-${sales?.data?.vr_no ?? ''}`,
  // });






  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Sales Invoice" screen="sales.electronics" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
        {sales.isLoading ? <Loader /> : null}
        <div className="self-start md:self-auto">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label htmlFor="">{isCompanyScheme ? 'Company (scheme account)' : 'Select Customer'}</label>
                <div className="mt-1 flex items-start gap-1">
                  <div className="min-w-0 flex-1">
                    <DdlMultiline
                      onSelect={customerAccountHandler}
                      placeholder="Select Customer"
                      actionOptionLabel="+ Add New Customer"
                      onActionSelect={openCustomerModal}
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
                </div>
              </div>
              <div>
                {/* The switch the branch settings use, rather than the
                    hand-drawn tick box this screen carried -- a box with its
                    own blues, its own hover ring and an inline SVG check,
                    which matched nothing else in the app. */}
                <div className="mt-8 ml-0 flex flex-wrap gap-4">
                  <ToggleSwitch
                    label="Installment Sale"
                    checked={isInstallment}
                    onChange={handleInstallmentChange}
                    disabled={isUpdateButton && isCompanyScheme}
                  />
                  {/* Locked while editing: a saved invoice keeps its kind. */}
                  <ToggleSwitch
                    label="Company Scheme"
                    checked={isCompanyScheme}
                    onChange={handleCompanySchemeChange}
                    disabled={isUpdateButton}
                    preserveCheckedColorWhenDisabled
                  />
                </div>
                {/*
                  The dimming behind this dialog used to be `bg-opacity-50` with
                  no colour to be half-opaque OF, so it painted nothing: the
                  dialog floated over a live, undimmed page. Tailwind 4 dropped
                  the utility outright, so it is not even a class any more.
                  Every other dialog in the app writes `bg-black/NN`.

                  ⚠️ pt, not mt. Margin on an inset-0 element moves its top edge
                  down, so a backdrop that finally has a colour would have left
                  the top 200px of the page undimmed. Padding puts the dialog
                  where the margin used to and still covers the screen, which is
                  what the sibling dialogs do.
                */}
                {showInstallmentPopup && (
                  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 pt-50">
                    <div className="bg-white dark:bg-black p-6 rounded border-solid border-2 border-black dark:border-white shadow-lg w-96 max-w-full">
                      <h3 className="text-lg font-bold mb-4 text-gray-700 dark:text-[rgb(var(--c-text))]">
                        Installment Details
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <InputElement
                          id="installmentAmount"
                          value={installmentData.amount.toString()}
                          name="amount"
                          placeholder="Installment Amount"
                          label="Installment Amount"
                          className="py-1 w-full"
                          onChange={handleInstallmentDataChange}
                        />
                        <div className="w-full">
                          <label
                            className="dark:text-[rgb(var(--c-text))] text-gray-900"
                            htmlFor=""
                          >
                            Installment Start Date
                          </label>
                          <InputDatePicker
 setCurrentDate={handleInstallmentDateChange}
 className="font-medium text-sm w-full "
 selectedDate={startDate}
 setSelectedDate={setStartDate}
 placeholderText="Select Start Date" // Ã Â¦Â«Ã Â¦Â¾Ã Â¦ÂÃ Â¦â€¢Ã Â¦Â¾ Ã Â¦Â¥Ã Â¦Â¾Ã Â¦â€¢Ã Â¦Â²Ã Â§â€¡ Ã Â¦ÂªÃ Â§ÂÃ Â¦Â²Ã Â§â€¡Ã Â¦Â¸Ã Â¦Â¹Ã Â§â€¹Ã Â¦Â²Ã Â§ÂÃ Â¦Â¡Ã Â¦Â¾Ã Â¦Â° Ã Â¦Â¦Ã Â§â€¡Ã Â¦â€“Ã Â¦Â¾Ã Â¦Â¬Ã Â§â€¡
                          />
                        </div>

                        <InputElement
                          id="numberOfInstallments"
                          value={installmentData.numberOfInstallments.toString()}
                          name="numberOfInstallments"
                          placeholder="Installments No."
                          label="Installments No."
                          className="py-1 w-full"
                          onChange={handleInstallmentDataChange}
                        />
                        <div className="flex items-end pb-1">
                          <ToggleSwitch
                            label="Early Payment"
                            checked={isEarlyPayment}
                            onChange={handleEarlyPayment}
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
                              className="py-1 w-full"
                              onChange={handleInstallmentDataChange}
                            />

                            <div className="w-full">
                              <label
                                className="dark:text-[rgb(var(--c-text))] text-gray-900"
                                htmlFor=""
                              >
                                Early Payment Date
                              </label>

                              <InputDatePicker
 setCurrentDate={handleEarlyPaymentDateChange}
 className="font-medium text-sm w-full "
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

            {isCompanyScheme && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="w-full">
                  {/* Shown, not edited: Branch Setup's rule decides it, the
                      server computes it, and an exception is Set Due Date on
                      the Receivable screen (owner, 2026-09-23). */}
                  <InputElement
                    id="companyDueDate"
                    name="companyDueDate"
                    label="Company Due Date"
                    value={schemeDueDate ? formatDayMonthYear(toIsoDate(schemeDueDate)) : ''}
                    placeholder="From Branch Setup"
                    className="w-full"
                    disabled
                    onChange={() => undefined}
                  />
                </div>
                <InputElement
                  id="name"
                  value={formData.name}
                  name="name"
                  placeholder="Buyer Name"
                  label="Buyer Name"
                  className="py-1 w-full"
                  onChange={handleOnChange}
                />
                <InputElement
                  id="mobile"
                  value={formData.mobile}
                  name="mobile"
                  placeholder="Buyer Mobile"
                  label="Buyer Mobile"
                  className="py-1 w-full"
                  onChange={handleOnChange}
                />
                <InputElement
                  id="address"
                  value={formData.address}
                  name="address"
                  placeholder="Buyer Address"
                  label="Buyer Address"
                  className="py-1 w-full"
                  onChange={handleOnChange}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* The invoice's total sits inside this box, the way Enter Price
                  shows its line total (owner, 2026-09-23) -- it took the place
                  of the Total Tk. line. */}
              <div className="block relative">
                <InputElement
                  id="receivedAmt"
                  value={formData.receivedAmt ?? ""}
                  name="receivedAmt"
                  placeholder="Received Amount"
                  label="Received / Total Amount"
                  className="py-1 w-full"
                  onChange={handleOnChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'discountAmt')}
                />
                {/* Pinned to the input itself -- the bottom of this box, one
                    control high, centred -- not to a fixed top offset, which
                    left it a few pixels low under this label. */}
                <span className={`pointer-events-none absolute bottom-0 right-3 z-50 flex items-center ${FIELD_HEIGHT}`}>
                  {thousandSeparator(invoiceTotal)}
                </span>
              </div>
              <InputElement
                id="discountAmt"
                value={formData.discountAmt ?? ""}
                name="discountAmt"
                placeholder="Discount Amount"
                label="Discount Amount"
                className="py-1 text-right w-full"
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'notes')}
              />
              <InputElement
                id="notes"
                value={formData.notes ?? ""}
                name="notes"
                placeholder="Notes"
                label="Notes"
                className="py-1 w-full"
                list="sales-notes-suggestions"
                autoComplete="off"
                onChange={handleOnChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setTimeout(() => {
                      // `#products` -- the box is `product`, so this has been
                      // finding nothing and leaving the cursor in Notes.
                      const input = document.querySelector(
                        '#product',
                      ) as HTMLInputElement | null;
                      if (input) input.focus();
                      if (input) input.select();
                    }, 150);
                  }
                }}
              />
              <datalist id="sales-notes-suggestions">
                {noteSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InputElement
                id="serviceCharge"
                value={formData.serviceCharge ?? ""}
                
                name="serviceCharge"
                placeholder={serviceList(42, settings?.serviceList)}
                label={serviceList(42, settings?.serviceList)}
                className="py-1 text-right w-full"
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'discountAmt')}
              />
              <InputElement
                id="tdsAmount"
                value={formData.tdsAmount ?? ""}
                name="tdsAmount"
                placeholder={serviceList(41, settings?.serviceList)}
                label={serviceList(41, settings?.serviceList)}
                className="py-1 text-right w-full"
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'discountAmt')}
              />
              <InputElement
                id="transportationAmt"
                value={formData.transportationAmt ?? ""}
                name="transportationAmt"
                placeholder={serviceList(198, settings?.serviceList)}
                label={serviceList(198, settings?.serviceList)}
                className="py-1 text-right w-full"
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'discountAmt')}
              />

            </div>
          </div>
          {/* Installment Popup */}

          {/* No total / sale type / Search Invoice row on this form (owner,
              2026-09-23). An invoice is still opened for editing from Global
              Search, Cash Book, Ledger and the other voucher lists:
              useVoucherAutoEditSearch below runs searchInvoice for them. */}
        </div>
        <div className="">
          <div className="grid grid-cols-1 gap-y-1">
            {/* No warehouse on this form (owner, 2026-09-23): a line goes out
                with none, as on a branch that keeps no warehouses. An invoice
                loaded for editing keeps the one it was saved with. */}
            <div className="grid grid-cols-1 gap-2">
              <div>
                <label htmlFor="">Select Product</label>
                <ProductDropdown
                  id="product"
                  name="product"
                  onSelect={productSelectHandler}
                  onKeyDown={(e) => handleInputKeyDown(e, 'serial_no')}
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
                  className=''
                />
              </div>
            </div>
            <div className="grid grid-cols-1">
              <div className="block relative">
                <label
                  htmlFor="serial_no"
                  className="block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))] mb-1"
                >
                  Enter Serial Number
                </label>
                <Textarea
 id="serial_no"
 name="serial_no"
 placeholder="Enter Serial Number"
 className={`w-full px-3 py-1 text-gray-600 bg-white border  
 outline-none dark:bg-transparent dark:border-gray-600 dark:text-[rgb(var(--c-text))] 
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
                  className="py-1 w-full"
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'price')}
                />
                <span className={`pointer-events-none absolute bottom-0 right-3 z-50 flex items-center ${FIELD_HEIGHT}`}>{unit}</span>
              </div>
              <div className="block relative">
                <InputElement
                  id="price"
                  value={productData.price}
                  name="price"
                  placeholder="Enter Price"
                  label="Enter Price"
                  className="py-1 w-full"
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'addProduct')}
                />
                <span className={`pointer-events-none absolute bottom-0 right-3 z-50 flex items-center ${FIELD_HEIGHT}`}>{lineTotal}</span>
              </div>
            </div>
            <div className="flex gap-x-1 gap-y-1">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editProduct}
                  buttonLoading={buttonLoading}
                  label="Update"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={<FiEdit2 className="text-lg ml-2 mr-2" />}
                />
              ) : (
                <ButtonLoading
                  id="addProduct"
                  onClick={addProduct}
                  buttonLoading={buttonLoading}
                  label="Add New"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={<FiPlus className="text-lg ml-2 mr-2" />}
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
                  icon={<FiEdit className="text-lg ml-2 mr-2" />}
                  disabled={updateButtonLoading}
                />
              ) : (
                <ButtonLoading
                  onClick={handleInvoiceSave}
                  buttonLoading={saveButtonLoading}
                  label={saveButtonLoading ? 'Saving...' : 'Save'}
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiSave className="text-lg ml-2 mr-2" />}
                  disabled={saveButtonLoading}
                />
              )}

              <ButtonLoading
                onClick={resetProducts}
                buttonLoading={buttonLoading}
                label="Reset"
                className="whitespace-nowrap text-center mr-0"
                icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
              />
              <div className="flex w-full">
                <div className="mr-2">
                  <PrintRowsInput
 id="perPage"
 name="perPage"
                    // label="Rows"
 title="Rows per page"
 value={perPage.toString()}
 onChange={handlePerPageChange}
 type='text'
 className="font-medium text-sm w-12"
                  />
                </div>
                <div className="mr-2">
                  <PrintFontInput
 id="fontSize"
 name="fontSize"
                    // label="Font"
 title="Font Size"
 value={fontSize.toString()}
 onChange={handleFontSizeChange}
 type='text'
 className="font-medium text-sm w-12"
                  />
                </div>

                <PrintButton
                  onClick={printInvoice}
                  label=""
                  className="pt-[0.45rem] pb-[0.45rem]"
                />
              </div>
            </div>

          </div>
        </div>
      </div>
      <div className="mt-4 col-span-full overflow-x-auto">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-[rgb(var(--c-table-head))] dark:text-gray-200">
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
                  className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700"
                >
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-center">
                    {++index}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))]">
                    {row.product_name}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-right">
                    {row.qty} {row.unit}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-right">
                    {row.price}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-right">
                    {thousandSeparator(
                      parseFloat((row.price * row.qty).toFixed(2)))}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-center w-20">
                    <Button
                      onClick={() => handleDelete(row.id)}
                      className="text-red-500 ml-2 text-center"
                    >
                      <FiTrash2 className="cursor-pointer text-center" />
                    </Button>
                    <Button
                      onClick={() => editProductItem(row.id)}
                      className="text-green-500 ml-2 text-center"
                    >
                      <FiEdit2 className="cursor-pointer text-center" />
                    </Button>
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
                className="whitespace-nowrap text-center pt-1.5 pb-1.5 pr-4 ml-6 pl-3!"
                icon={<FiPlus className="text-lg mr-2" />}
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
                    <Input
                      value={installment.installment_no}
                      readOnly
                      className={`form-input text-gray-600 outline-none border rounded-xs bg-white dark:bg-transparent 
 dark:border-gray-600 dark:text-[rgb(var(--c-text))] dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 
 dark:focus:ring-blue-400 dark:focus:border-blue-400 mt-1 block w-10 text-center`}
                      style={{
                        appearance: 'textfield', // for Firefox
                        MozAppearance: 'textfield', // for older Firefox
                        WebkitAppearance: 'none', // for Chrome/Safari
                      }}
                    />
                  </div>

                  <div>
                    <Input
                      type="number"
                      value={Number(installment.amount)}
                      onChange={(e) => {
                        const updated = [...editedInstallments];
                        updated[index].amount = parseFloat(e.target.value);
                        setEditedInstallments(updated);
                      }}
                      className={`form-input px-3 py-1 text-gray-600 outline-none border rounded-xs bg-white dark:bg-transparent 
                    dark:border-gray-600 dark:text-[rgb(var(--c-text))] dark:placeholder-gray-500 focus:outline-none  focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 mt-1 block w-26 text-right`}
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
                      <Button
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
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
      <div className="hidden">
        <CompanySchemeInvoicePrint ref={schemePrintRef} data={schemePrintData} />
      </div>
      <div className="hidden">
        <VoucherPrintRegistry
          ref={voucherRegistryRef}
          rowsPerPage={Number(perPage)}
          fontSize={Number(fontSize)}
        />
      </div>
      <QuickCustomerModal
        isOpen={showCustomerModal}
        onClose={closeCustomerModal}
        initialName={customerDraftName}
        onCustomerSaved={({ id, name }) => {
            const isCashCustomer = Number(id) === 17;
            const previousAccount = Number(formData.account);
            let receivedAmt = formData.receivedAmt;

            if (isCashCustomer) {
              if (previousAccount !== 17) {
                previousReceivedBeforeCashRef.current = formData.receivedAmt;
              }
              receivedAmt = getInvoicePayableAmount();
            } else if (previousAccount === 17) {
              receivedAmt = previousReceivedBeforeCashRef.current || formData.receivedAmt;
            } else if (Number(formData.receivedAmt || 0) <= 0) {
              receivedAmt = '0';
            }

            setIsReceivedAmtManuallyEdited(false);
            setFormData((prev) => ({
              ...prev,
              account: id,
              accountName: name,
              receivedAmt,
            }));
          }}
        />

      <CompanySchemeImeiModal
        conflicts={imeiQuestion?.conflicts ?? null}
        saving={saveButtonLoading}
        onCancel={() => setImeiQuestion(null)}
        onContinue={() => {
          const pending = imeiQuestion;
          setImeiQuestion(null);
          if (pending) {
            sendSchemeInvoice({ ...pending.payload, allow_duplicate_imei: true }, Boolean(pending.payload?.allow_negative));
          }
        }}
      />

      <StockShortageModal
        warning={stockWarning}
        action="sell"
        saving={saveButtonLoading}
        onCancel={() => {
          setStockWarning(null);
          setSaveButtonLoading(false);
        }}
        onContinue={() => {
          const pending = stockWarning;
          setStockWarning(null);
          if (pending) sendInvoice(pending.payload, true);
        }}
      />
    </>
  );
};
export default CompanySchemeSales;
