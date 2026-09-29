import React, { useEffect, useRef, useState } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import InputElement from '../../../utils/fields/InputElement';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { toast } from 'react-toastify';
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
  FiPrinter,
  FiRefreshCcw,
  FiSave,
  FiTrash2,
} from 'react-icons/fi';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import dayjs from 'dayjs';
import {
  purchaseStore,
  purchaseUpdate,
  tradingPurchaseEdit,
} from './tradingPurchaseSlice';
import { validateForm } from '../../../utils/utils-functions/validationUtils';
import { invoiceMessage } from '../../../utils/utils-functions/invoiceMessage';
import { validateProductData } from '../../../utils/utils-functions/productValidationHandler';

import useCtrlS from '../../../utils/hooks/useCtrlS';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import utc from 'dayjs/plugin/utc';
import QuickCustomerModal from '../sales/QuickCustomerModal';
import httpService from '../../../services/httpService';
import {
  API_TILES_PREVIOUS_BALANCE_URL,
  API_TRADING_PURCHASE_SUGGESTIONS_URL,
} from '../../../services/apiRoutes';
import useVoucherAutoEditSearch from '../../../utils/hooks/useVoucherAutoEditSearch';
import { getPurchaseTypeForVoucher } from '../../../utils/utils-functions/voucherEditNavigation';
import { VoucherPrintRegistry } from '../../vouchers/VoucherPrintRegistry';
import { useVoucherPrint } from '../../vouchers';
import TrackedProductField from '../../product-tracking/TrackedProductField';
import { useTrackedProducts } from '../../product-tracking/useTrackedProducts';
import { useNavigate } from 'react-router-dom';
import { branchLabel } from '../../../utils/userFeatureSettings';
/**
 * The Purchase Invoice for a Tiles and Sanitary shop -- the mirror of
 * TilesBusinessSales, with purchase accounting behind it.
 *
 * Reached only through PurchaseIndex's branch check, never by system id: a
 * Tiles branch runs inventory_system_id 4, which is Trading's row. Everything a
 * Trading shop needs that a tiles shop does not -- the Purchase Order box that
 * names the supplier, the invoice number and date, the vehicle, the Sales-Type
 * dropdown and its Search Invoice box -- was removed here rather than hidden
 * behind a branch, because a file that can only ever be the tiles screen has no
 * second state to keep working.
 *
 * The line panel drops the three the tiles shop does not weigh: the Bag Number,
 * the Weight Variance and its Variance Type. The columns go with them, so a line
 * is quantity and rate and nothing else. The server already treats all three as
 * optional (`?? null`), and a missing variance type short-circuits the quantity
 * adjustment it would otherwise make.
 *
 * What it saves is unchanged: the same slice, the same /trading/purchase
 * endpoints, the same voucher kinds (4 paid / 9 credit), the same discount head.
 * The four handwritten figures and the supplier's running balance are what this
 * screen adds on top.
 */
interface Product {
  id: number;
  product: number;
  product_name: string;
  unit: string;
  qty: string;
  price: string;
  warehouse: string;
}

type PurchaseSuggestionField = 'notes';

// The two handwritten dates are held as text, the way the server sends them;
// these are the pair the tiles sales screen uses for the same four figures.
const asDate = (value: string) => (value ? dayjs(value).toDate() : null);
const asText = (date: Date | null) => (date ? dayjs(date).format('YYYY-MM-DD') : '');

/** Shown as a plain nought rather than a bare dash when there is nothing to total. */
const money = (value: number) => {
  const shown = thousandSeparator(value);
  return shown === '-' ? '0' : shown;
};

const normalizeSuggestionItems = (items: any) =>
  Array.isArray(items)
    ? items
      .map((item: any) => String(item ?? '').trim())
      .filter((item: string, index: number, arr: string[]) => item && arr.indexOf(item) === index)
    : [];

const TilesBusinessPurchase = () => {
  const navigate = useNavigate();
  const warehouse = useSelector((s: any) => s.activeWarehouse);
  const purchase = useSelector((s: any) => s.tradingPurchase);
  const settings = useSelector((s: any) => s.settings);
  const fieldLabel = (key: string, fallback: string) =>
    branchLabel(settings, key, fallback);
  const dispatch = useDispatch<any>();
  const [buttonLoading, setButtonLoading] = useState(false);
  const [warehouseDdlData, setWarehouseDdlData] = useState<any[]>([]);
  const [purchaseType, setPurchaseType] = useState('2'); // Define state with type
  const [unit, setUnit] = useState<string | null>(null); // Define state with type
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [productData, setProductData] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateId, setUpdateId] = useState<any>(null);

  const [isUpdateButton, setIsUpdateButton] = useState(false);
  const [lineTotal, setLineTotal] = useState<number>(0);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isPaymentAmtManuallyEdited, setIsPaymentAmtManuallyEdited] = useState(false);
  const [noteSuggestions, setNoteSuggestions] = useState<string[]>([]);

  // What this supplier was owed before today's bill, read from the ledger when
  // a supplier is chosen and again when an old invoice is opened to be changed.
  // Account 17 -- the counter -- is not a party and carries nothing.
  const [previousBalance, setPreviousBalance] = useState(0);

  const voucherRegistryRef = useRef<any>(null);
  const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);

  dayjs.extend(utc);

  useEffect(() => {
    dispatch(userCurrentBranch());
    dispatch(getDdlWarehouse());
  }, []);

  interface FormData {
    mtmId: string;
    account: string;
    accountName: string;
    paymentAmt: string;
    discountAmt: string | number;
    purchaseOrderNumber: string;
    purchaseOrderText: string;
    invoice_no: string;
    invoice_date: string;
    notes: string;
    // The supplier's own memo number and date, and the delivery challan's pair
    // -- the four figures a Tiles and Sanitary shop writes by hand on the
    // paper, named on Branch Setup. The tiles sales screen carries the same
    // four; the Ledger prints them in brackets after a row's name, so a
    // purchase reads the way the sale beside it does.
    manual_voucher_no: string;
    manual_voucher_date: string;
    manual_challan_no: string;
    manual_challan_date: string;
    currentProduct: { index?: number } | null; // Initialize `currentProduct` with optional index
    searchInvoice: string;
    // The one product this whole invoice is against, chosen by hand. It is not
    // one of the `products` lines below and it never reaches a legacy table --
    // it only writes a row beside the invoice for the Product reports. Left
    // null, the invoice saves exactly what it saved before this field existed.
    trackedProductId: number | null;
    products: Product[];
  }

  const initialFormData = {
    mtmId: '',
    account: '',
    accountName: '',
    paymentAmt: '',
    discountAmt: '',
    purchaseOrderNumber: '',
    purchaseOrderText: '',
    invoice_no: '',
    invoice_date: '',
    notes: '',
    manual_voucher_no: '',
    manual_voucher_date: '',
    manual_challan_no: '',
    manual_challan_date: '',
    currentProduct: null, // Initialize `currentProduct` as null
    searchInvoice: '',
    trackedProductId: null,
    products: [],
  };

  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Tracking is set per party, so the list follows the supplier: the products
  // configured for that supplier plus the ones set for "all parties". With none
  // configured the list comes back empty and the field renders nothing.
  const { products: trackedProducts } = useTrackedProducts(
    'purchase',
    undefined,
    false,
    formData.account,
  );

  // Cash purchases are excluded: account 17 is the counter, not a supplier, so
  // there is no payable to report against. The field component also hides
  // itself on an empty list, but the Enter chain below needs to know too.
  const showTrackedProductField =
    trackedProducts.length > 0 && Number(formData.account) !== 17;

  useEffect(() => {
    const fetchSuggestions = async (
      field: PurchaseSuggestionField,
      query: string,
      setter: React.Dispatch<React.SetStateAction<string[]>>,
    ) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        setter([]);
        return;
      }

      try {
        const response = await httpService.get(API_TRADING_PURCHASE_SUGGESTIONS_URL, {
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
   * What the supplier is owed before the invoice being written, shown as the
   * first term under the buttons. It is the party's own legs as at the branch's
   * transaction date, so a bill already saved sits inside it; on an edit the
   * bill's own id goes along, and the server leaves that one out, or the bill
   * would count itself and its amount would show up twice.
   *
   * ⚠️ THE PARTY'S OWN BALANCE, THE ONE FIGURE EVERY SCREEN SHOWS. It used to
   * ask with `payable: 1`, which read the ledger the supplier's way -- credit
   * minus debit -- so the same party showed a positive balance on the sales
   * screen and a negative one here. One rule now, for every invoice: debit
   * minus credit, as the ledger itself keeps it.
   *
   * ⚠️ AND SO THE SIGN SAYS WHICH WAY THE ACCOUNT RUNS. A supplier we owe
   * stands at a NEGATIVE balance -- here, on the sales screen, on their ledger,
   * and on the bill's own Previous Due Tk. A negative Total Tk. under the rule
   * below is that same figure, not a mistake.
   *
   * ⚠️ THE CASH HEAD IS NOT A PARTY. Account 17's balance is the drawer, not a
   * debt, so a cash purchase asks for nothing and carries nothing into the
   * total.
   *
   * ⚠️ `allow_negative` -- the balance WITH its sign. The server floors it at
   * zero for the receipt box, where a credit is not an amount to collect; here
   * the figure is a term of the bill's own total, and a floored credit made
   * that total wrong by exactly the advance.
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
      // is honest: the invoice then shows only what this screen knows about.
      .catch(() => setPreviousBalance(0));
  };

  const supplierAccountHandler = (option: any) => {
    const key = 'account'; // Set the desired key dynamically
    const accountName = 'accountName'; // Set the desired key dynamically
    setIsPaymentAmtManuallyEdited(false);

    // ⚠️ THE BOX CAN COME BACK EMPTY -- Backspace on a picked name does it, and
    // `option` then arrives null. Reading `.value` off that threw, so the whole
    // screen went down on one keystroke. Nothing here belongs to a party any
    // more, so the party's balance and the payment against them go too, and the
    // block under the buttons reads nought until a name is picked again.
    if (!option) {
      setFormData({
        ...formData,
        [key]: '',
        [accountName]: '',
        paymentAmt: '',
        trackedProductId: null,
      });
      setPreviousBalance(0);
      return;
    }

    const isCashSupplier = Number(option?.value) === 17;
    setFormData({
      ...formData,
      [key]: option.value,
      [accountName]: option.label,
      paymentAmt: isCashSupplier ? formData.paymentAmt : '',
      // Cleared on ANY change of supplier, not only when the new one is cash.
      // Tracking is per party, so the dropdown reloads for whoever was just
      // chosen; a product tracked for the old supplier need not be tracked for
      // the new one. Kept, it would sit in state while the field itself hides
      // for want of options -- and the save would then be refused by
      // assertMappable for a product the screen never showed as chosen.
      trackedProductId: null,
    });

    // What this supplier is owed BEFORE the invoice about to be written. Asked
    // for on every pick rather than cached: it is the party that decides it.
    void loadPreviousBalance(option?.value);
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
    setLineTotal(Number(newLineTotal.toFixed(0))); // Keep it as a string for display
  };


  const resetProducts = () => {
    setFormData(initialFormData); // Reset to the initial state
    setIsUpdateButton(false);
    isUpdating && setIsUpdating(false);
    // The party is gone with the rest of the form, so its balance goes too --
    // left standing it would total into the next invoice against nobody.
    setPreviousBalance(0);
  };


  /**
   * Pulls a saved invoice up by its number. There is no box to type one into on
   * this screen -- the desk gets here from the Purchase Ledger's own Edit
   * button, which lands carrying the number -- so the number is always handed
   * in. What the box's type dropdown used to settle (is this a paid purchase or
   * a due one) is answered from the number itself instead.
   */
  const searchInvoice = (searchValue?: string) => {
    const invoiceNo = String(searchValue ?? '').trim();

    if (!invoiceNo) {
      return;
    }

    // A credit purchase is numbered 9- and was booked as a journal, so it has
    // to be looked up as a due purchase however the box above is set -- opened
    // from the Purchase Ledger nobody has touched that box at all.
    const resolvedPurchaseType = getPurchaseTypeForVoucher(invoiceNo, purchaseType);

    if (resolvedPurchaseType !== purchaseType) {
      setPurchaseType(resolvedPurchaseType);
    }

    dispatch(
      tradingPurchaseEdit(
        { invoiceNo, purchaseType: resolvedPurchaseType },
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
    setFormData({ ...formData, searchInvoice: invoiceNo }); // Update the state with the search value
  };

  useVoucherAutoEditSearch({
    triggerSearch: searchInvoice,
  });

  // Process `purchase.data` when it updates
  // useEffect(() => {
  //   if (purchase?.data?.invoice_date) {
  //     const parsedDate = new Date(purchase.data.invoice_date);
  //     if (!isNaN(parsedDate.getTime())) {
  //       setStartDate(parsedDate);
  //     } else {
  //       console.warn(
  //         'Invalid date format in invoice_date:',
  //         purchase.data.invoice_date,
  //       );
  //       setStartDate(null);
  //     }
  //   } else {
  //     setStartDate(null);
  //   }
  //   if (purchase?.data?.products) {
  //     const products: Product[] = purchase.data.products.map(
  //       (product: any) => ({
  //         id: product.id,
  //         product: product.product,
  //         product_name: product.product_name, // Replace with actual logic if available
  //         unit: product.unit, // Replace with actual logic if available
  //         qty: product.quantity,
  //         price: product.price,
  //         bag: product.bag,
  //         warehouse: product.warehouse ? product.warehouse.toString() : '',
  //         variance: product.weight_variance,
  //         variance_type: product.variance_type,
  //       }),
  //     );

  //     if (products && products.length > 0) {
  //       setFormData({
  //         ...purchase.data,
  //         products,
  //       });
  //       toast.success('Thank you for finding the invoice!');
  //     } else {
  //       setFormData({
  //         ...purchase.data,
  //         products: [],
  //       });
  //       toast.success('Something went wrong!');
  //     }
  //   }
  // }, [purchase?.data]);


	    useEffect(() => {
	      if (purchase.data.transaction) {
	        const products = purchase.data.transaction?.purchase_master.details.map((detail: any) => ({
	            id: detail.id,
	            product: detail.product.id,
	            product_name: detail.product.name,
	            serial_no: detail.serial_no,
	            unit: detail.product.unit.name,
	            qty: detail.quantity,
	            price: detail.purchase_price,
	            warehouse: detail.godown_id ? detail.godown_id.toString() : '',
	          }),
	        );
  
        // Find accountName
        let accountName = '-';
        if (purchase?.data?.transaction.acc_transaction_master?.length > 0) {
          for (const trxMaster of purchase?.data?.transaction.acc_transaction_master) {
            for (const detail of trxMaster.acc_transaction_details) {
              if (detail.coa_l4?.id === purchase?.data?.transaction?.purchase_master?.supplier_id) {
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
          mtmId: purchase.data.mtmId,
          account: purchase?.data?.transaction?.purchase_master?.supplier_id.toString() ?? '', accountName,
          purchaseOrderNumber: purchase.data.transaction.purchase_master?.purchase_order?.id.toString() || '',
          purchaseOrderText: purchase.data.transaction.purchase_master?.purchase_order?.order_number,
          invoice_no: purchase.data.transaction.purchase_master?.invoice_no || '',
          invoice_date: purchase.data.transaction.purchase_master?.invoice_date || '',
          paymentAmt: purchase.data.transaction.purchase_master.netpayment.toString() || '',
          discountAmt: parseFloat(purchase.data.transaction.purchase_master.discount) || 0,
          notes: purchase.data.transaction.purchase_master.notes || '',
          // On the voucher itself, not on the purchase master: the edit query
          // returns the row whole, so they ride along. Absent on a database the
          // patch has not reached, which reads as blank.
          manual_voucher_no: purchase.data.transaction.manual_voucher_no || '',
          manual_voucher_date: purchase.data.transaction.manual_voucher_date || '',
          manual_challan_no: purchase.data.transaction.manual_challan_no || '',
          manual_challan_date: purchase.data.transaction.manual_challan_date || '',
          // Sits beside mtmId on the edit response, not inside `transaction` --
          // it comes from the mapping table, not from the invoice itself. The
          // fallback matters: without it an untracked invoice pulled up after a
          // tracked one would inherit the previous invoice's product.
          trackedProductId: purchase.data.trackedProductId ?? null,
          products: products || [],
        };
  
        setFormData(updatedFormData);
        setIsPaymentAmtManuallyEdited(false);

        // ⚠️ THE BILL BEING EDITED IS INSIDE ITS OWN PREVIOUS BALANCE. Excluded,
        // or the invoice would count itself and its total would show twice --
        // once as Current Invoice and once as the balance it is added to.
        void loadPreviousBalance(
          updatedFormData.account,
          purchase.data.mtmId ?? '',
        );
      }
    }, [purchase.data.transaction]);



  
  const totalAmount = formData.products.reduce(
    (sum, row) => sum + Number(row.qty) * Number(row.price),
    0,
  );

  /*
   * The four terms the block under the buttons shows, and the answer under the
   * rule:
   *
   *   Total Tk. = Previous Balance - Current Invoice + Discount + Payment Amount
   *
   * 💡 THIS IS THE SUPPLIER'S LEDGER, TERM BY TERM. Saving credits the supplier
   * the bill net of discount and debits them whatever was paid, so the balance
   * they stand at -- debit minus credit, the figure the Previous Balance line
   * above is -- falls by exactly (Current Invoice - Discount - Payment), which
   * is what this takes off it. A party already in debit with us, a buy-back
   * from a customer say, starts positive and this adds to it. A cash purchase
   * carries nothing in: the counter is not a party, so its payment box is the
   * whole bill and the answer lands on nought.
   *
   * Purchase has no service charge, TDS or transportation to fold in, so the
   * Current Invoice term is the line total itself.
   */
  const billAmount = totalAmount;
  const discountAmount = Number(formData.discountAmt) || 0;
  const receivedAmount = Number(formData.paymentAmt) || 0;
  const totalTkAmount =
    previousBalance - billAmount + discountAmount + receivedAmount;

  /*
   * ⚠️ NO PARTY, NO FIGURES. An empty supplier box means the bill on screen is
   * against nobody: a running balance needs someone to run against, so every
   * term reads nought until a name is picked -- and again after a save, which
   * puts the form back to a blank bill.
   */
  const hasSupplier = Boolean(formData.account);
  const panelTerms: [string, number][] = [
    ['Previous Balance', hasSupplier ? previousBalance : 0],
    ['Current Invoice', hasSupplier ? billAmount : 0],
    ['Discount', hasSupplier ? discountAmount : 0],
    ['Payment Amount', hasSupplier ? receivedAmount : 0],
  ];
  const panelTotal = hasSupplier ? totalTkAmount : 0;


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
   * the counter, not a second purchase, and the desk cannot tell the two apart
   * by eye once the rows are printed.
   *
   * Keyed on the product's own id, so the same goods at a second rate are
   * refused too -- the rate is not what makes it a different line.
   */
  const isProductAlreadyAdded = (skipIndex: number | null = null) =>
    formData.products.some(
      (row: any, index: number) =>
        index !== skipIndex && Number(row.product) === Number(productData.product),
    );

  const addProduct = () => {
 if (!validateProductData(productData)) return;

    if (isProductAlreadyAdded()) {
      toast.info('This product is already added.');
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

    clearProductEntry();

    setTimeout(() => {
      const nextElement = document.getElementById('product');
      if (nextElement instanceof HTMLElement) {
        nextElement.focus();
      }
    }, 100);
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

    // let products = formData.products;
    let newItem: Product = {
      id: Date.now(), // Use timestamp as a unique ID
      product: productData.product || 0,
      product_name: productData.product_name || '',
      unit: productData.unit || '',
      qty: productData.qty || '',
      price: productData.price || '',
      warehouse: productData.warehouse || '',
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
    clearProductEntry();
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
    if (name === 'paymentAmt' && Number(formData.account) !== 17) {
      setIsPaymentAmtManuallyEdited(true);
    }
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  /**
   * Notes hands Enter to the optional invoice product when that field is on
   * screen, and otherwise falls through to the original jump straight to the
   * line-product dropdown -- kept here character for character, because with
   * tracking off this screen has to behave exactly as it always did.
   *
   * The line dropdown here is `#product` (singular). Trading Sales calls its
   * one `#products`, so this cannot be copied across without changing it: a
   * wrong id fails silently and just leaves focus where it was.
   */
  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') {
      return;
    }

    if (showTrackedProductField) {
      handleInputKeyDown(e, 'trackedProductId');
      return;
    }

    setTimeout(() => {
      const productInput = document.querySelector('#product');
      if (productInput instanceof HTMLElement) {
        productInput.focus();
      } else {
        console.warn('Product input not found');
      }
    }, 100);
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

  // useEffect(() => {
  //   const voucherNo = purchase?.data?.vr_no || '';
  //   if (voucherNo !== '') {
  //     toast.success(`Voucher No.: ${voucherNo}`);
  //     setFormData((prevState) => ({
  //       ...prevState, // Spread the previous state to retain all other properties
  //       products: [], // Reset only the `products` array
  //     }));
  //   }
  // }, [purchase?.data?.vr_no, purchase?.isUpdated]);

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

    const payload = {
      ...formData,
      paymentAmt: formData.paymentAmt === '' ? '0' : formData.paymentAmt,
      discountAmt: formData.discountAmt === '' ? 0 : Number(formData.discountAmt) || 0,
    };

    dispatch(
      purchaseStore(payload, function (message, success) {
 
        if (message) {
          if (success) {
            toast.success(message);
          } else {
            toast.info(message);
          }
        }
        setTimeout(() => {
          setFormData((prevFormData) => ({
            ...prevFormData,
            paymentAmt: '',
            discountAmt: '',
            notes: '',
            invoice_no: '',
            invoice_date: '',
            // The four belong to the voucher just saved as much as its invoice
            // number does, so the next supplier's paper starts clean.
            manual_voucher_no: '',
            manual_voucher_date: '',
            manual_challan_no: '',
            manual_challan_date: '',
            // This reset lists its fields by hand rather than going through
            // initialFormData, so the product has to be named here too or the
            // one picked on this invoice silently rides along to the next.
            trackedProductId: null,
            products: [],
          }));
          setIsPaymentAmtManuallyEdited(false);
          setSaveButtonLoading(false);

          // ⚠️ THE BILL JUST SAVED HAS LEFT THE SCREEN, SO ITS FIGURES GO WITH
          // IT: the block reads nought until the supplier is picked again, and
          // that pick is what re-reads their balance off the ledger.
          setPreviousBalance(0);
        }, 1000);
      }),
    );
  };

  /**
   * Prints whichever invoice the screen is currently holding: the one just
   * saved, or the one pulled up through Search Invoice. A save leaves the
   * voucher at the root of the slice, an edit nests it under `transaction`.
   */
  const handleInvoicePrint = () => {
    const voucher = purchase?.data?.transaction ?? purchase?.data;

    if (!voucher?.id || !voucher?.vr_no) {
      toast.info('Save the invoice first, or search one to print.');
      return;
    }

    handleVoucherPrint({ ...voucher, mtm_id: voucher.id });
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

    const payload = {
      ...formData,
      paymentAmt: formData.paymentAmt === '' ? '0' : formData.paymentAmt,
      discountAmt: formData.discountAmt === '' ? 0 : Number(formData.discountAmt) || 0,
    };

    // Save Invoice
    dispatch(
      purchaseUpdate(payload, function (message, _success, saved) {
        if (message) {
          toast.info(message);
        }

        // Paid off at last, so the voucher left the credit-purchase run for the
        // purchase one and came back under a new number. The form's own field
        // has to follow it, or the next lookup would go looking for a number
        // nothing holds any more.
        if (saved?.vr_no) {
          setFormData((prev) => ({ ...prev, searchInvoice: saved.vr_no }));
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

    setFormData((prevState) => ({
      ...prevState,
      currentProduct: { ...product, index: productIndex }, // Store index to identify the product during save
    }));

    setProductData(product);
    setIsUpdating(true);
    setUpdateId(productIndex);
  };

  const handleStartDate = (e: any) => {
    const startD = dayjs(e).format('YYYY-MM-DD'); // Adjust format as needed
    const key = 'invoice_date'; // Set the desired key dynamically
    setFormData({ ...formData, [key]: startD });
  };


  useCtrlS(handlePurchaseInvoiceSave);

  // const handleChangeVoucherType = (e: any) => {
  //   setVoucherType(e.target.value);
  // };

  // useEffect(() => {
  //   if (formData.account == '17') {
  //     setFormData((prevState) => ({
  //       ...prevState,
  //       paymentAmt: 
  //         totalAmount > 0
  //           ? (totalAmount - prevState.discountAmt).toString()
  //           : '0',
  //     }));
  //   } else {
  //     setFormData((prevState) => ({
  //       ...prevState,
  //       paymentAmt: '',
  //     }));
  //   }
  // }, [formData.account]);


  
  useEffect(() => {
    const total = formData.products.reduce((acc, product) => {
      const qty = parseFloat(product.qty?.toString() || '0') || 0;
      const price = parseFloat(product.price?.toString() || '0') || 0;
      return acc + qty * price;
    }, 0);
    const discount = parseFloat(formData.discountAmt?.toString() || '0') || 0;
    const isCashSupplier = Number(formData.account) === 17;
    const cashPaymentAmt = Math.max(0, total - discount).toFixed(0);
    const existingNetPayment =
      purchase.data.transaction?.purchase_master?.netpayment?.toString() || '0';

    if (isCashSupplier) {
      if (formData.paymentAmt !== cashPaymentAmt) {
        setFormData((prev) => ({
          ...prev,
          paymentAmt: cashPaymentAmt,
        }));
      }
      if (isPaymentAmtManuallyEdited) {
        setIsPaymentAmtManuallyEdited(false);
      }
    } else if (formData.account && !isPaymentAmtManuallyEdited) {
      const nextPaymentAmt = formData.mtmId ? existingNetPayment : '';
      if (formData.paymentAmt !== nextPaymentAmt) {
        setFormData((prev) => ({
          ...prev,
          paymentAmt: nextPaymentAmt,
        }));
      }
    }
  }, [
    formData.account,
    formData.discountAmt,
    formData.mtmId,
    formData.paymentAmt,
    formData.products,
    isPaymentAmtManuallyEdited,
    purchase.data.transaction,
  ]);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Purchase Invoice" screen="purchase.tiles" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
        {purchase.isLoading ? <Loader /> : null}
        <div className="self-start md:self-auto">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]" htmlFor="">
                  Select Supplier
                </label>
                <div className="flex items-start gap-1">
                  <div className="min-w-0 flex-1">
                    <DdlMultiline
                      id="account"
                      name="account"
                      onSelect={supplierAccountHandler}
                      actionOptionLabel="+ Add New Supplier"
                      onActionSelect={openCustomerModal}
                      value={
                        formData.account
                          ? {
                              value: formData.account,
                              label: formData.accountName,
                            }
                          : null
                      }
                      // The next box on this screen is the first of the four the
                      // shop writes by hand, so Enter goes there. Nothing else
                      // stands between the supplier and it any more.
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setTimeout(() => {
                            handleInputKeyDown(e, 'manual_voucher_no');
                          }, 150);
                        }
                      }}
                      acType={'3'}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* The shop's own four figures, in one line: the supplier's memo
                and the delivery challan that came with the goods, the pair the
                supplier's paper carries. The branch names them on its Invoice
                Setup; a name left blank falls back to the standard one. None of
                the four reaches the posting -- the voucher still posts on
                vr_date under vr_no -- and all four are optional.

                This screen is the tiles and sanitary shop's alone, so the four
                are unconditional here; on the trade screen they wait on a branch
                flag instead.

                Four to a row is tight, so the row is bottom-aligned -- a name
                long enough to wrap would otherwise lift its own box out of line
                with the other three. */}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InputElement
                id="paymentAmt"
                value={formData.paymentAmt}
                name="paymentAmt"
                type="number"
                placeholder={'Payment Amount'}
                label={'Payment Amount'}
                disabled={Number(formData.account) === 17}
                className={'py-1'}
                onChange={handleOnChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'discountAmt')} // Pass the next field's ID
              />
              <InputElement
                id="discountAmt"
                value={formData.discountAmt?.toString() ?? ''}
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
                list="purchase-notes-suggestions"
                autoComplete="off"
                onChange={handleOnChange}
                onKeyDown={handleNotesKeyDown}
              />
              <datalist id="purchase-notes-suggestions">
                {noteSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            {/* One product for the whole invoice, picked by hand. It sits below
                the totals rather than among the fields above because it is not
                part of entering the invoice -- it says what the invoice should
                be counted against afterwards. It never belongs in the
                line-entry panel opposite, where it would read as a line. */}
            {Number(formData.account) !== 17 && (
              <div className="mt-3">
                <TrackedProductField
                  id="trackedProductId"
                  value={formData.trackedProductId}
                  products={trackedProducts}
                  helpText="Which product this invoice is against. Left empty, the figures stay as they were."
                  onChange={(productId) =>
                    setFormData((prev) => ({ ...prev, trackedProductId: productId }))
                  }
                  onKeyDown={(e) => handleInputKeyDown(e, 'product')}
                />
              </div>
            )}
          </div>
        </div>
        <div className="">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]" htmlFor="">
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
                <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]" htmlFor="">
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
            <div className="@container grid grid-cols-5 gap-x-1 gap-y-1">
              {isUpdating ? (
                <ButtonLoading
                  onClick={editProduct}
                  buttonLoading={buttonLoading}
                  label="Update"
                  responsiveLabel
                  className="whitespace-nowrap text-center mr-0 py-1.5"
                  icon={<FiEdit2 className="text-lg ml-2 mr-2" />}
                />
              ) : (
                <ButtonLoading
                  id="addProduct"
                  name="addProduct"
                  onClick={addProduct}
                  buttonLoading={buttonLoading}
                  label="Add New"
                  responsiveLabel
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
                  buttonLoading={buttonLoading}
                  label="Update"
                  responsiveLabel
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiEdit className="text-lg ml-2 mr-2" />}
                />
              ) : (
                <ButtonLoading
                  onClick={handlePurchaseInvoiceSave}
                  buttonLoading={buttonLoading}
                  label="Save"
                  responsiveLabel
                  className="whitespace-nowrap text-center mr-0"
                  icon={<FiSave className="text-lg ml-2 mr-2" />}
                />
              )}

              <ButtonLoading
                onClick={resetProducts}
                buttonLoading={buttonLoading}
                label="Reset"
                responsiveLabel
                className="whitespace-nowrap text-center mr-0"
                icon={
                  <FiRefreshCcw className="text-white text-lg ml-2  mr-2" />
                }
              />

              <ButtonLoading
                onClick={handleInvoicePrint}
                buttonLoading={buttonLoading}
                label="Print"
                responsiveLabel
                className="whitespace-nowrap text-center mr-0"
                icon={<FiPrinter className="text-lg ml-2 mr-2" />}
              />

              <ButtonLoading
                onClick={() => navigate('/dashboard')}
                buttonLoading={false}
                label="Home"
                responsiveLabel
                className="whitespace-nowrap text-center mr-0"
                icon={<FiHome className="text-lg ml-2 mr-2" />}
              />
            </div>

            {/* Read while the bill is being written, so it stands under the
                buttons rather than up beside the supplier box.

                One term to a line, the answer under a rule:
                  Total Tk. = Previous Balance - Current Invoice + Discount +
                              Payment Amount
                Written this way the sum can be followed term by term, which a
                single worked-out figure cannot be -- and a total that cannot be
                followed cannot be checked.

                ⚠️ EVERY TERM SHOWS, nought included. A line that comes and goes
                with its amount leaves the block a different height each time,
                and a term that has vanished is the one the desk most wants to
                see was counted.

                The answer is the running figure, not the bill's own: what this
                shop still owes the supplier once the bill and whatever was paid
                against it are counted in. A cash purchase carries nothing in --
                the cash head is not a party -- so its payment box is the whole
                bill and this lands on nought. */}
            <div className="ml-auto w-full max-w-xs text-sm font-semibold text-gray-800 dark:text-[rgb(var(--c-text))]">
              {panelTerms.map(([label, amount]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span>{label}</span>
                  <span>{money(amount)}</span>
                </div>
              ))}
              <div className="my-1 border-t border-gray-400" />
              <div className="flex justify-between gap-4 text-base font-bold">
                <span>Total Tk.</span>
                <span>{money(panelTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 col-span-full overflow-x-auto ">
        {/* {cashPayment.isLoading ? <Loader /> : null} */}
        <table
          className={`w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400`}
        >
          <thead className="text-xs text-gray-700 uppercase bg-[rgb(var(--c-table-head))] dark:text-gray-200">
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
                  className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700"
                >
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-center `}
                  >
                    {++index}
                  </td>
	                  <td
	                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] `}
	                  >
	                    {row.product_name}
	                  </td>
	                  <td
	                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-right `}
	                  >
                    {thousandSeparator(Number(row.qty))} {row.unit}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-right `}
                  >
                    {thousandSeparator(Number(row.price))}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-right `}
                  >
                    {thousandSeparator(Number(row.price) * Number(row.qty))}
                  </td>
                  <td
                    className={`px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))] text-center w-20 `}
                  >
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
          rowsPerPage={12}
          fontSize={12}
        />
      </div>
      <QuickCustomerModal
        isOpen={showCustomerModal}
        onClose={closeCustomerModal}
        entityLabel="Supplier"
        defaultTypeId="2"
        onCustomerSaved={({ id, name }) => {
          const isCashSupplier = Number(id) === 17;
          setIsPaymentAmtManuallyEdited(false);
          setFormData((prev) => ({
            ...prev,
            account: id,
            accountName: name,
            paymentAmt: isCashSupplier ? prev.paymentAmt : '',
          }));
          // A supplier added from this dialog starts owing nothing, but ask
          // anyway: the new party is a real ledger the moment it is saved, and a
          // figure left standing from the last supplier would be a different
          // shop's balance sitting under this one's name.
          void loadPreviousBalance(id);
        }}
      />
    </>
  );
};

export default TilesBusinessPurchase;
