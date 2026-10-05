import React, { useEffect, useRef, useState } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import InputElement from '../../../utils/fields/InputElement';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import { Button, ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import { toast } from 'react-toastify';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import { useDispatch, useSelector } from 'react-redux';
import { userCurrentBranch } from '../../branch/branchSlice';
import { useTilesWarehouseField } from '../../../utils/hooks/useTilesWarehouseField';
import { getDdlWarehouse } from '../../warehouse/ddlWarehouseSlider';
import WarehouseDropdown from '../../../utils/utils-functions/WarehouseDropdown';
import dayjs from 'dayjs';
import Loader from '../../../../common/Loader';
import { FiEdit, FiEdit2, FiHome, FiPlus, FiRefreshCcw, FiSave, FiTrash2 } from 'react-icons/fi';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { validateProductData } from '../../../utils/utils-functions/productValidationHandler';
import { invoiceMessage } from '../../../utils/utils-functions/invoiceMessage';
import { validateForm } from '../../../utils/utils-functions/validationUtils';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import { hasPermission } from '../../../utils/permissionChecker';
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
import ReferrerPickerModal from './ReferrerPickerModal';
import ToggleSwitch from '../../../utils/utils-functions/ToggleSwitch';
import httpService from '../../../services/httpService';
import {
  API_TILES_PREVIOUS_BALANCE_URL,
  API_TRADING_SALES_SUGGESTIONS_URL,
} from '../../../services/apiRoutes';
import useVoucherAutoEditSearch from '../../../utils/hooks/useVoucherAutoEditSearch';
import { getSalesTypeForVoucher } from '../../../utils/utils-functions/voucherEditNavigation';
import StockShortageModal, {
  StockShortage,
} from '../../../utils/components/StockShortageModal';

/**
 * The two dates this screen holds are 'YYYY-MM-DD' strings -- the shape the API
 * and the paper both read -- while the app's date box speaks Date objects.
 * These do the translation in one place, through dayjs rather than new Date(),
 * which reads a bare date as UTC and can hand back yesterday.
 */
const asDate = (value: string) => (value ? dayjs(value).toDate() : null);
const asText = (date: Date | null) => (date ? dayjs(date).format('YYYY-MM-DD') : '');

interface Product {
  id: number;
  product: number;
  product_name: string;
  /** Shown in front of the name on the row -- see rowName(). Blank for a
      product that has no code, and then the row is just the name. */
  product_code?: string;
  serial_no: string;
  unit: string;
  qty: number;
  price: number;
  warehouse: string;
}

type SalesSuggestionField = 'notes';

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

const TilesBusinessSales = () => {
  const warehouse = useSelector((s: any) => s.activeWarehouse);
  const sales = useSelector((s: any) => s.electronicsSales);
  const settings = useSelector((s: any) => s.settings);
  const { showWarehouse, defaultWarehouseId, branchWarehouseIds } = useTilesWarehouseField();
  const dispatch = useDispatch();

  /**
   * What this branch calls its four handwritten figures -- set on the branch's
   * Invoice Setup and read here. ⚠️ THE FALLBACK LIVES HERE AND NOWHERE ELSE:
   * the server stores only what the branch typed, so a blank setting means the
   * standard name, and clearing one in the branch form gets you back to it.
   */
  const fieldLabel = (key: string, fallback: string) =>
    settings?.data?.branch?.[key] || fallback;

  const [buttonLoading, setButtonLoading] = useState(false);
  const [updateButtonLoading, setUpdateButtonLoading] = useState(false);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  // The invoice waiting on an answer, held with the question so Continue can
  // send exactly what was refused rather than whatever the form holds by then.
  const [stockWarning, setStockWarning] = useState<(StockShortage & { payload: any }) | null>(null);
  const [warehouseDdlData, setWarehouseDdlData] = useState<any[]>([]);
  const [salesType, setSalesType] = useState('1');
  const [unit, setUnit] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [productData, setProductData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateId, setUpdateId] = useState<any>(null);
  const [isUpdateButton, setIsUpdateButton] = useState(false);
  const [permissions, setPermissions] = useState<any>([]);
  const [lineTotal, setLineTotal] = useState<number>(0);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showReferrerModal, setShowReferrerModal] = useState(false);
  const [customerDraftName, setCustomerDraftName] = useState('');
  const [isReceivedAmtManuallyEdited, setIsReceivedAmtManuallyEdited] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [perPage, setPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(12);
  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);
  const [noteSuggestions, setNoteSuggestions] = useState<string[]>([]);
  // What the chosen party already owed this branch before the bill being
  // written. Zero means nothing owing, or a cash sale -- see loadPreviousBalance.
  const [previousBalance, setPreviousBalance] = useState(0);

  useEffect(() => {
    dispatch(userCurrentBranch());
    dispatch(getServiceList());
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
    // The four figures the shop writes by hand. Dates travel as 'YYYY-MM-DD',
    // which is what the API stores and what the paper formats.
    manual_voucher_no: string;
    manual_voucher_date: string;
    manual_challan_no: string;
    manual_challan_date: string;
    // Who recommended this sale -- the id alone. ⚠️ The name is deliberately
    // never held in the form: the customer reads this screen, and the owner
    // asked for the reference to be kept from them. It shows in the popup and
    // nowhere else.
    referrer_id: string;
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
    manual_voucher_no: '',
    manual_voucher_date: '',
    manual_challan_no: '',
    manual_challan_date: '',
    referrer_id: '',
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

  /**
   * What the party owed this branch before this bill -- the figure the invoice
   * shows above Total Tk. It is the party's own debit minus credit as at the
   * branch's transaction date, so a bill already saved sits inside it; on an
   * edit the bill's own id goes along, and the server leaves that one out, or
   * the bill would count itself and its amount would show up twice.
   *
   * ⚠️ THE CASH HEAD IS NOT A PARTY. Account 17's balance is the drawer, not a
   * due, so a cash sale asks for nothing and carries nothing into the total.
   *
   * ⚠️ `allow_negative` -- the party's balance WITH its sign. The server floors
   * it at zero for the receipt box, where a credit is not an amount to collect;
   * here the figure is a term of the bill's own total, and a floored credit
   * made that total wrong by exactly the advance.
   */
  const loadPreviousBalance = (account: string | number, excludeMtmId = '') => {
    if (!account || Number(account) === 17) {
      setPreviousBalance(0);
      return;
    }

    httpService
      .get(API_TILES_PREVIOUS_BALANCE_URL, {
        params: { account, exclude_mtm_id: excludeMtmId, allow_negative: 1 },
      })
      .then((response: any) =>
        setPreviousBalance(Number(response?.data?.data?.data?.balance ?? 0)),
      )
      // A figure that could not be read is not a figure to total up. Zero here
      // is honest: the bill then shows only what this screen knows about.
      .catch(() => setPreviousBalance(0));
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

  useEffect(() => {
    if (warehouse?.data && warehouse?.data.length > 0) {
      setWarehouseDdlData(warehouse?.data);
    }
  }, [warehouse?.data]);

  /**
   * With the picker hidden a line still has to say which store it moved, and on
   * a single-warehouse tiles branch that store is the branch's own godown. A
   * line already holding one of this branch's godowns is left alone, so an
   * edited bill keeps the store it was written against rather than being moved.
   */
  useEffect(() => {
    if (showWarehouse || !defaultWarehouseId) return;

    setProductData((prev: any) =>
      prev?.warehouse && branchWarehouseIds.has(String(prev.warehouse))
        ? prev
        : { ...(prev ?? {}), warehouse: defaultWarehouseId },
    );
  }, [showWarehouse, defaultWarehouseId, branchWarehouseIds]);

  const customerAccountHandler = (option: any) => {
    const key = 'account';
    const accountName = 'accountName';
    const isCashCustomer = Number(option?.value) === 17;

    setIsReceivedAmtManuallyEdited(false);
    setFormData({
      ...formData,
      [key]: option.value,
      [accountName]: option.label,
      // Kept for a cash customer -- the effect below then forces it onto the
      // payable. Cleared for anyone else, because a credit sale has received
      // nothing yet and the last customer's figure is not this one's. Trading
      // and General do it exactly this way.
      receivedAmt: isCashCustomer ? formData.receivedAmt : '',
    });

    // A new bill has no id yet, so nothing is left out of the sum.
    void loadPreviousBalance(option.value);
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
      // The code the picker carried down with the name, so the stored line can
      // read "GI-106 - 2 Tangki Nipple" the way the paper does.
      product_code: option.code || '',
      [unit]: option.label_5,
      [price]: Number(option.label_4),
      // The cost, kept beside the rate: the line may not be sold under it.
      purchase_price: Number(option.label_3) || 0,
    });

    // After setting product data, recalculate line total
    const qty = parseFloat(productData.qty) || 0;
    // The same figure the box was just filled with -- the sales price (label_4),
    // not the cost sitting beside it in the dropdown.
    const priceValue = Number(option.label_4) || 0;
    const newLineTotal = qty * priceValue;

    // Update the lineTotal state with the new value
    setLineTotal(newLineTotal);
  };

  const resetProducts = () => {
    setIsUpdateButton(false);
    isUpdating && setIsUpdating(false);
    setIsReceivedAmtManuallyEdited(false);
    // initialFormData carries the four manual figures as '', so they clear too.
    setFormData(initialFormData);

    // ⚠️ THE PREVIOUS BALANCE BELONGS TO THE CUSTOMER THIS RESET JUST DROPPED.
    // It is the last party's own ledger figure, and nothing on the empty form
    // answers to it any more -- left standing it would be counted into the next
    // bill's Total Tk. as though the new customer owed it. The receipt screen
    // clears its own the same way when a voucher is stored.
    setPreviousBalance(0);

    // And the line the desk had half-typed goes with it, for the same reason:
    // it is a draft of a bill that is no longer on screen. The warehouse stays
    // -- one store all day -- exactly as it does between two lines of one bill.
    clearProductEntry();
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
        product_code: detail.product.code,
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
        // The model hands a DATE column back as a raw 'YYYY-MM-DD', so these go
        // straight in -- asDate() reads them correctly on the way to the box.
        manual_voucher_no: sales.data.transaction.manual_voucher_no || '',
        manual_voucher_date: sales.data.transaction.manual_voucher_date || '',
        manual_challan_no: sales.data.transaction.manual_challan_no || '',
        manual_challan_date: sales.data.transaction.manual_challan_date || '',
        // Read from the response's own key, not from the voucher model: the
        // link lives on its own table, so nothing about it is on the voucher.
        referrer_id: sales.data.referrer_id ? String(sales.data.referrer_id) : '',
      };
      setFormData(updatedFormData);
      setIsReceivedAmtManuallyEdited(false);
      // The bill's own id rides along: it is already in the ledger, and what it
      // posted is not part of what the party owed before it.
      void loadPreviousBalance(updatedFormData.account, sales.data.mtmId || '');
    }
  }, [sales.data.transaction]);



  const totalAmount = formData.products.reduce(
    (sum, row) => sum + Number(row.qty) * Number(row.price),
    0,
  );

  // The invoice's own Total Tk., kept as its four separate terms so the screen
  // can show the arithmetic it is doing:
  //   Total Tk. = Previous Balance + Current Invoice − Discount − Received Amount
  // The bill here is the one before the discount -- discount is a term of the
  // sum, not something already taken out of it.
  const billAmount =
    totalAmount +
    (Number(formData.serviceCharge) || 0) +
    (Number(formData.tdsAmount) || 0) +
    (Number(formData.transportationAmt) || 0);
  const discountAmount = Number(formData.discountAmt) || 0;
  const receivedAmount = Number(formData.receivedAmt) || 0;
  const totalTkAmount =
    previousBalance + billAmount - discountAmount - receivedAmount;

  // thousandSeparator draws a nought as '-', which inside the formula below
  // reads as a minus sign -- so the one place that shows its working spells a
  // nought out. Everywhere else keeps the dash it has always had.
  const money = (value: number) => {
    const shown = thousandSeparator(value);
    return shown === '-' ? '0' : shown;
  };

  /**
   * Clears the three boxes the desk fills for one line -- product, quantity,
   * price -- together with the two things that belonged to the line just
   * stored: the unit shown in the quantity box and the running line total.
   *
   * The warehouse is deliberately kept. A bill is written against one store, so
   * asking for it again on every line would be busywork, and the dropdown would
   * have to be re-picked for no decision anybody actually makes per line.
   */
  const clearProductEntry = () => {
    setProductData((prevState: any) => ({ warehouse: prevState.warehouse }));
    setUnit(null);
    setLineTotal(0);
  };

  /**
   * One line per product. A second line of the same product is a typing slip at
   * the counter, not a second sale, and the desk cannot tell the two apart by
   * eye once the rows are printed.
   *
   * Keyed on the product's own id, so the same tiles at a second rate are
   * refused too -- the rate is not what makes it a different line.
   */
  const isProductAlreadyAdded = (skipIndex: number | null = null) =>
    formData.products.some(
      (row: any, index: number) =>
        index !== skipIndex && Number(row.product) === Number(productData.product),
    );

  /**
   * ⚠️ NOTHING GOES OUT UNDER WHAT IT COST. The dropdown carries each product's
   * purchase price beside its name (label_3) and that figure rides along in
   * productData while the line is being written, so the rate the desk types can
   * be measured against it. Haggling the rate down is the desk's business;
   * selling at a loss is not.
   *
   * A purchase price we do not have is not a refusal -- a line pulled back out
   * of a saved invoice brings no cost with it, and a rule that cannot be
   * checked must not stop the desk.
   */
  const refuseBelowPurchasePrice = () => {
    const cost = Number(productData.purchase_price) || 0;
    if (cost <= 0 || Number(productData.price) >= cost) return false;

    toast.info(`Sales price cannot be below the purchase price (${cost}).`);
    return true;
  };

  const addProduct = () => {
    const isValid = validateProductData(productData);
    if (!isValid) return;

    if (isProductAlreadyAdded()) {
      toast.info('This product is already added.');
      return;
    }

    if (refuseBelowPurchasePrice()) return;

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
    clearProductEntry();
  };

  const editProduct = () => {
    const isValid = validateProductData(productData);
    if (!isValid) return;

    // The same rule as adding, with the line being edited left out of the count
    // -- otherwise changing only its rate would refuse itself.
    if (isProductAlreadyAdded(updateId)) {
      toast.info('This product is already added.');
      return;
    }

    if (refuseBelowPurchasePrice()) return;

    const newItem: Product = {
      id: Date.now(),
      product: productData.product || 0,
      product_name: productData.product_name || '',
      product_code: productData.product_code || '',
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
    clearProductEntry();
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
    // Only a typed figure on a credit sale is the desk's own. For a cash
    // customer the box is shut and the payable is the answer, so nothing the
    // box could carry is allowed to look like a decision.
    if (name === 'receivedAmt' && Number(formData.account) !== 17) {
      setIsReceivedAmtManuallyEdited(true);
    }
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // The box keeps exactly what was typed. Parsing here is what stopped a
    // decimal from ever being entered: the dot of a half-typed "26." reads back
    // as 26, the box re-renders without it, and 26.22 can never be reached.
    // Every reader of these two figures parses them itself -- the line total
    // below, and addProduct / editProduct before the row is stored.
    setProductData((prevState: any) => {
      const updatedProductData = { ...prevState, [name]: value };

      const qty = parseFloat(updatedProductData.qty) || 0;
      const price = parseFloat(updatedProductData.price) || 0;
      setLineTotal(qty * price);
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
    if (formData.products.length === 0) {
      toast.info('Please add some products.');
      setSaveButtonLoading(false);
      return;
    }

    // A whole invoice on credit is normal in this trade, so an untouched
    // received box saves as 0 rather than blocking the sale. The server reads
    // the key either way, and '' would only reach it as null.
    const payload = {
      ...formData,
      receivedAmt: formData.receivedAmt === '' ? '0' : formData.receivedAmt,
    };

    sendInvoice(payload);
  };

  /**
   * The save itself, kept apart from the validation so the shortage question
   * can send the very same invoice a second time -- with allow_negative -- once
   * the operator has said to go on.
   */
  const sendInvoice = (payload: any, allowNegative = false) => {
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

    const payload = {
      ...formData,
      receivedAmt: formData.receivedAmt === '' ? '0' : formData.receivedAmt,
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
      setUpdateButtonLoading(false);
      setIsUpdateButton(false);
    }, 2000);
 

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

  useEffect(() => {
    // ⚠️ NEVER WHILE EDITING, and that guard is the whole point of this line.
    // This rule decides what the customer is paying today, on a bill being
    // written. A saved bill's figure is history -- it was read off the ledger
    // when the invoice was opened, and running the rule over it again declared a
    // bill that had been paid on the spot to have received nothing, blanking the
    // box on screen before anything was touched. Trading has always skipped its
    // own copy during an edit; this screen was copied without that guard.
    if (isUpdateButton || sales.data.transaction) {
      return;
    }

    const isCashCustomer = Number(formData.account) === 17;
    const cashReceivedAmt = getInvoicePayableAmount();

    if (isCashCustomer) {
      // Forced, not merely filled: a cash sale is settled in full, so a figure
      // typed before the customer was chosen does not survive the choice, and
      // no later edit can win either -- the flag is cleared on the way past.
      if (formData.receivedAmt !== cashReceivedAmt) {
        setFormData((prev) => ({
          ...prev,
          receivedAmt: cashReceivedAmt,
        }));
      }
      if (isReceivedAmtManuallyEdited) {
        setIsReceivedAmtManuallyEdited(false);
      }
    } else if (formData.account && !isReceivedAmtManuallyEdited && formData.receivedAmt !== '') {
      // A credit sale has received nothing, and carrying the figure over from
      // whichever customer was chosen before would post money the shop never
      // took. The desk can type one in; that is what the flag above records.
      setFormData((prev) => ({
        ...prev,
        receivedAmt: '',
      }));
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
    // Both are what the guard at the top reads, so the effect has to see them
    // change: the edit's own data arrives a tick after the screen mounts.
    isUpdateButton,
    sales.data.transaction,
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
        <HelmetTitle title="Sales Invoice" screen="sales.tiles" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
        {sales.isLoading ? <Loader /> : null}
        <div className="self-start md:self-auto">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
              <div>
                <label htmlFor="">Select Customer</label>
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

              {/* Who recommended this sale, in the empty half beside the customer
                  box -- the customer never sees this screen, but whoever does is
                  standing at the counter with them, so it is read alongside the
                  name it belongs to.

                  ⚠️ NOTHING BUT THE SWITCH SHOWS: the referrer's name lives in
                  the popup and nowhere else on this screen, and the switch is
                  left uncaptioned too (owner's word) -- any word beside it would
                  give the thing away to whoever is reading over the shoulder.
                  It keeps a name for screen readers, which say nothing aloud.

                  ⚠️ IT ALWAYS OPENS THE POPUP, on or off. Flipping a switch to
                  take a reference off would erase last week's account with one
                  careless click and leave no sign it had gone. Taking one off is
                  a choice inside the popup, where it is said out loud.

                  ⚠️ Boxed to the theme's control height so it centres on the
                  customer box beside it -- the height is a theme setting, so no
                  fixed padding would line the two up on every theme. */}
              <div className="flex h-[var(--control-height)] items-center">
                <ToggleSwitch
                  label=""
                  ariaLabel="Reference"
                  checked={!!formData.referrer_id}
                  onChange={() => setShowReferrerModal(true)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InputElement
                id="receivedAmt"
                value={formData.receivedAmt ?? ""}
                name="receivedAmt"
                placeholder="Received Amount"
                label="Received Amount"
                // 17 is the Cash head. A cash sale is settled in full by
                // definition, so the box is shut and the effect above keeps it
                // on the payable. Trading and General disable theirs the same
                // way; Electronics, which this screen was copied from, does
                // not -- and that is the only reason it was missing here.
                disabled={Number(formData.account) === 17}
                className="py-1 text-right w-full"
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'discountAmt')}
              />
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

            {/* The shop's own four figures, in one line at the lower left --
                read together, because they are the two papers the goods went
                out on and the counter's own two. The branch names them on its
                Invoice Setup; a name left blank falls back to the standard one.
                Neither reaches the ledger: the voucher posts on vr_date under
                vr_no as it always did. All four are optional -- Tiles and
                Sanitary's whole reason for this screen.

                ⚠️ Four to a row inside a half-width column is tight, so the row
                is bottom-aligned -- a name long enough to wrap would otherwise
                lift its own box out of line with the other three. */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
              <InputElement
                id="manual_voucher_no"
                value={formData.manual_voucher_no ?? ""}
                name="manual_voucher_no"
                placeholder={fieldLabel('manual_voucher_no_label', 'Memo No.')}
                label={fieldLabel('manual_voucher_no_label', 'Memo No.')}
                className="py-1 w-full"
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'manual_voucher_date')}
              />
              <InputDatePicker
                id="manual_voucher_date"
                name="manual_voucher_date"
                label={fieldLabel('manual_voucher_date_label', 'Memo Date')}
                className="font-medium text-sm w-full"
                selectedDate={asDate(formData.manual_voucher_date)}
                setSelectedDate={(date: Date | null) =>
                  setFormData((prev) => ({ ...prev, manual_voucher_date: asText(date) }))
                }
                setCurrentDate={() => undefined}
              />
              <InputElement
                id="manual_challan_no"
                value={formData.manual_challan_no ?? ""}
                name="manual_challan_no"
                placeholder={fieldLabel('manual_challan_no_label', 'Challan No')}
                label={fieldLabel('manual_challan_no_label', 'Challan No')}
                className="py-1 w-full"
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'manual_challan_date')}
              />
              <InputDatePicker
                id="manual_challan_date"
                name="manual_challan_date"
                label={fieldLabel('manual_challan_date_label', 'Challan Date')}
                className="font-medium text-sm w-full"
                selectedDate={asDate(formData.manual_challan_date)}
                setSelectedDate={(date: Date | null) =>
                  setFormData((prev) => ({ ...prev, manual_challan_date: asText(date) }))
                }
                setCurrentDate={() => undefined}
              />
            </div>

          </div>

        </div>
        <div className="">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className={showWarehouse ? undefined : 'md:col-span-2'}>
                <label htmlFor="">Select Product</label>
                <ProductDropdown
                  id="product"
                  name="product"
                  onSelect={productSelectHandler}
                  // With the warehouse box hidden the next stop is Quantity.
                  onKeyDown={(e) => handleInputKeyDown(e, showWarehouse ? 'warehouse' : 'qty')}
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
              {showWarehouse ? (
                <div>
                  <label htmlFor="">Select Warehouse</label>
                  {warehouse.isLoading === true ? <Loader /> : ''}
                  <WarehouseDropdown
 id="warehouse"
 onChange={handleWarehouseChange}
 className="w-60 font-medium text-sm p-2 "
 warehouseDdl={warehouseDdlData}
 defaultValue={productData?.warehouse || ''}
                  />
                </div>
              ) : null}
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
                <span className="absolute top-8 right-3 z-50">{unit}</span>
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
                <span className="absolute top-8 right-3 z-50">{lineTotal}</span>
              </div>
            </div>
            <div className="@container flex flex-wrap gap-x-1 gap-y-1">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editProduct}
                  buttonLoading={buttonLoading}
                  label="Update"
                  responsiveLabel="xl"
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={<FiEdit2 className="text-lg ml-2 mr-2" />}
                />
              ) : (
                <ButtonLoading
                  id="addProduct"
                  onClick={addProduct}
                  buttonLoading={buttonLoading}
                  label="Add New"
                  responsiveLabel="xl"
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
                  responsiveLabel="xl"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiEdit className="text-lg ml-2 mr-2" />}
                  disabled={updateButtonLoading}
                />
              ) : (
                <ButtonLoading
                  onClick={handleInvoiceSave}
                  buttonLoading={saveButtonLoading}
                  label={saveButtonLoading ? 'Saving...' : 'Save'}
                  responsiveLabel="xl"
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiSave className="text-lg ml-2 mr-2" />}
                  disabled={saveButtonLoading}
                />
              )}

              <ButtonLoading
                onClick={resetProducts}
                buttonLoading={buttonLoading}
                label="Reset"
                responsiveLabel="xl"
                className="whitespace-nowrap text-center mr-0"
                icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
              />
              <div className="flex shrink-0 ml-auto">
                <div className="mr-2">
                  <PrintRowsInput
 id="perPage"
 name="perPage"
                    // label="Rows"
 title="Rows per page"
 value={perPage.toString()}
 onChange={handlePerPageChange}
 type='text'
 className="font-medium text-sm w-12!"
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
 className="font-medium text-sm w-12!"
                  />
                </div>

                <PrintButton
                  onClick={() =>
                    handleVoucherPrint({
                      ...sales.data,
                      mtm_id: sales.data.id,
                    })
                  }
                  label="Print"
                  responsiveLabel="xl"
                />
              </div>
            </div>

            {/* Read while the bill is being written, so it stands under the
                buttons rather than up beside the customer box.

                One term to a line, the answer under a rule:
                  Total Tk. = Previous Balance + Current Invoice − Discount −
                              Received Amount
                Written this way the sum can be followed term by term, which a
                single worked-out figure cannot be -- and a total that cannot be
                followed cannot be checked.

                ⚠️ EVERY TERM SHOWS, nought included. A line that comes and goes
                with its amount leaves the block a different height each time,
                and a term that has vanished is the one the desk most wants to
                see was counted.

                The answer is the running figure, not the bill's own: what the
                party owes once this bill and whatever was taken are counted in.
                A cash sale carries nothing in -- the cash head is not a party --
                so its received box is the whole bill and this lands on nought. */}
            <div className="ml-auto w-full max-w-xs text-sm font-semibold text-gray-800 dark:text-[rgb(var(--c-text))]">
              {(
                [
                  ['Previous Balance', previousBalance],
                  ['Current Invoice', billAmount],
                  ['Discount', discountAmount],
                  ['Received Amount', receivedAmount],
                ] as [string, number][]
              ).map(([label, amount]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span>{label}</span>
                  <span>{money(amount)}</span>
                </div>
              ))}
              <div className="my-1 border-t border-gray-400" />
              <div className="flex justify-between gap-4 text-base font-bold">
                <span>Total Tk.</span>
                <span>{money(totalTkAmount)}</span>
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
                    {/* "CODE - NAME" when the product has a code, the bare name
                        when it has none -- the same shape the paper prints. */}
                    {row.product_code
                      ? `${row.product_code} - ${row.product_name}`
                      : row.product_name}
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

            setIsReceivedAmtManuallyEdited(false);
            setFormData((prev) => ({
              ...prev,
              account: id,
              accountName: name,
              // Same rule as picking a customer from the dropdown: kept for
              // cash (the effect forces it), cleared for anyone else.
              receivedAmt: isCashCustomer ? prev.receivedAmt : '',
            }));
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

      <ReferrerPickerModal
        isOpen={showReferrerModal}
        onClose={() => setShowReferrerModal(false)}
        selectedId={formData.referrer_id}
        onPick={(referrerId) => setFormData((prev) => ({ ...prev, referrer_id: referrerId }))}
      />
    </>
  );
};
export default TilesBusinessSales;
