import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { toast } from 'react-toastify';
import {
  FiEdit2,
  FiHome,
  FiPlus,
  FiRefreshCcw,
  FiSave,
  FiTrash2,
} from 'react-icons/fi';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import InputElement from '../../../utils/fields/InputElement';
import InputDatePicker from '../../../utils/fields/DatePicker';
import { fieldClass } from '../../../../theme/fieldStyles';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import WarehouseDropdown from '../../../utils/utils-functions/WarehouseDropdown';
import Loader from '../../../../common/Loader';
import { Button, ButtonLoading, IconButton } from '../../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { userCurrentBranch } from '../../branch/branchSlice';
import { getDdlWarehouse } from '../../warehouse/ddlWarehouseSlider';
import { useTilesWarehouseField } from '../../../utils/hooks/useTilesWarehouseField';
import { branchLabel } from '../../../utils/userFeatureSettings';
import QuickCustomerModal from '../sales/QuickCustomerModal';
import SeparateNotesModal from '../trading/SeparateNotesModal';
import NotesApplyToStrip, { NotesApplyTo } from '../trading/NotesApplyToStrip';
import httpService from '../../../services/httpService';
import {
  API_TILES_PREVIOUS_BALANCE_URL,
  API_TRADING_COMBINED_EDIT_URL,
  API_TRADING_COMBINED_STORE_URL,
  API_TRADING_COMBINED_SUGGESTIONS_URL,
  API_TRADING_COMBINED_UPDATE_URL,
} from '../../../services/apiRoutes';
import { handleInputKeyDown } from '../../../utils/utils-functions/handleKeyDown';
import useCtrlS from '../../../utils/hooks/useCtrlS';
import {
  buildVoucherAutoEditState,
  getCombinedVoucherOpenState,
  getVoucherEditTarget,
} from '../../../utils/utils-functions/voucherEditNavigation';
import { Input } from '../../../utils/fields/FormControls';

dayjs.extend(utc);

/**
 * The Combined Invoice for a Tiles and Sanitary shop: one form that buys from a
 * supplier and sells to a customer in a single save, writing a Purchase voucher
 * and then a Sales voucher that share a `combined_number` -- the Trading screen's
 * shape, reached by the branch flag because a tiles branch runs Trading's
 * inventory system row and would otherwise land on Trading's own form.
 *
 * ⚠️ TWO MONEY FIELDS, AND THAT IS THE WHOLE DIFFERENCE. Trading carries one
 * `amount` that is at once the supplier's payment and the customer's receipt,
 * with an "only sales posting" switch to strike the payment off. Here the two
 * questions are asked apart: what was paid to the supplier, and what was taken
 * from the customer. Either may be nought -- a credit purchase, a credit sale --
 * and the server picks 4-/9- and 3-/10- from them exactly as Trading does.
 *
 * The Trading-only fieldwork -- order numbers, bag number, weight variance,
 * vehicle number, tracked product -- is not here: this trade does neither. What
 * it adds is the tiles screen's own: the four hand-written figures (memo and
 * challan pairs) and the running previous balance the two totals blocks read.
 */

const asDate = (value: string) => (value ? dayjs(value).toDate() : null);
const asText = (date: Date | null) => (date ? dayjs(date).format('YYYY-MM-DD') : '');

interface CombinedProduct {
  id: number;
  product: number;
  product_name: string;
  product_code?: string;
  unit: string;
  qty: number;
  purchase_price: number;
  sales_price: number;
  warehouse: string;
}

type PartyTarget = 'supplier' | 'customer';

const initialProductData = {
  product: '',
  product_name: '',
  product_code: '',
  unit: '',
  qty: '',
  purchase_price: '',
  sales_price: '',
  warehouse: '',
};

const initialFormData = {
  supplierAccount: '',
  supplierName: '',
  customerAccount: '',
  customerName: '',
  invoice_no: '',
  invoice_date: '',
  // Paid to the supplier, and taken from the customer -- independent, either 0.
  paymentAmount: '',
  receivedAmount: '',
  purchaseDiscountAmt: '',
  salesDiscountAmt: '',
  notes: '',
  purchaseNotes: '',
  salesNotes: '',
  notesApplyTo: 'both' as NotesApplyTo,
  // The shop's own four figures on each leg: the supplier's memo and challan
  // pair on the purchase voucher, the customer's on the sales voucher. Either
  // set may be blank; neither is the other's stand-in.
  purchase_manual_voucher_no: '',
  purchase_manual_voucher_date: '',
  purchase_manual_challan_no: '',
  purchase_manual_challan_date: '',
  manual_voucher_no: '',
  manual_voucher_date: '',
  manual_challan_no: '',
  manual_challan_date: '',
  products: [] as CombinedProduct[],
};

/** Nought printed as a nought, not the separator's dash, inside a total. */
const money = (value: number) => {
  const shown = thousandSeparator(value);
  return shown === '-' ? '0' : shown;
};

const TilesCombinedEntry = () => {
  const dispatch = useDispatch<any>();
  const location = useLocation();
  const navigate = useNavigate();
  const warehouse = useSelector((s: any) => s.activeWarehouse);
  const settings = useSelector((s: any) => s.settings);
  const { showWarehouse, defaultWarehouseId, branchWarehouseIds } = useTilesWarehouseField();
  const fieldLabel = (key: string, fallback: string) => branchLabel(settings, key, fallback);

  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [buttonLoading] = useState(false);
  const [selectedSupplierOption, setSelectedSupplierOption] = useState<any>(null);
  const [selectedCustomerOption, setSelectedCustomerOption] = useState<any>(null);
  const [warehouseDdlData, setWarehouseDdlData] = useState<any[]>([]);
  const [productData, setProductData] = useState<any>(initialProductData);
  const [formData, setFormData] = useState(initialFormData);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [partyTarget, setPartyTarget] = useState<PartyTarget>('supplier');
  const [partyDraftName, setPartyDraftName] = useState('');
  const [editingCombinedNumber, setEditingCombinedNumber] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesModeBeforeSeparate, setNotesModeBeforeSeparate] = useState<NotesApplyTo>('both');
  // What each party owed before the bill being written -- the first term of the
  // two blocks under the buttons. Zero means nothing owing, or a cash party.
  const [purchasePreviousPayable, setPurchasePreviousPayable] = useState(0);
  const [salesPreviousBalance, setSalesPreviousBalance] = useState(0);

  const showCombinedInvoiceNote = settings?.data?.branch?.combined_invoice_note == 1
    || settings?.data?.branch?.combined_invoice_note === '1'
    || settings?.data?.branch?.combined_invoice_note === true;

  // Earlier entries' own words for the notes box, shared with the Separate
  // Notes popup. An empty query asks for nothing.
  const loadNoteSuggestions = useCallback(async (query: string): Promise<string[]> => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    try {
      const response = await httpService.get(API_TRADING_COMBINED_SUGGESTIONS_URL, {
        params: { field: 'notes', q: trimmedQuery },
      });
      const items = response?.data?.data?.data;
      return Array.isArray(items)
        ? items
          .map((item: any) => String(item ?? '').trim())
          .filter((item: string, index: number, arr: string[]) => item && arr.indexOf(item) === index)
        : [];
    } catch (error) {
      return [];
    }
  }, []);

  useEffect(() => {
    dispatch(userCurrentBranch());
    dispatch(getDdlWarehouse());
  }, [dispatch]);

  useEffect(() => {
    if (warehouse?.data && warehouse.data.length > 0) {
      setWarehouseDdlData(warehouse.data);
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

  /**
   * What the supplier is owed before this bill, or what the customer owes --
   * the figure the two blocks show above Total Tk. Read as at the branch's
   * transaction date, so a bill already saved sits inside it; on an edit the
   * leg's own id goes along and the server leaves it out, or the bill would
   * count itself and its amount would show up twice.
   *
   * ⚠️ `payable` ON THE PURCHASE SIDE: the supplier's own ledger read the
   * supplier's way (credit minus debit), so what we owe shows positive rather
   * than as the negative the sales reading would give the same party. The sales
   * side takes the plain figure (debit minus credit, as the ledger keeps it).
   *
   * ⚠️ THE CASH HEAD IS NOT A PARTY: account 17's balance is the drawer, not a
   * due, so a cash purchase or sale carries nothing into its total.
   */
  const loadPurchasePreviousPayable = (account: string | number, excludeMtmId: string | number = '') => {
    if (!account || Number(account) === 17) {
      setPurchasePreviousPayable(0);
      return;
    }

    httpService
      .get(API_TILES_PREVIOUS_BALANCE_URL, {
        params: { account, exclude_mtm_id: excludeMtmId, payable: 1, allow_negative: 1 },
      })
      .then((response: any) =>
        setPurchasePreviousPayable(Number(response?.data?.data?.data?.balance ?? 0)),
      )
      .catch(() => setPurchasePreviousPayable(0));
  };

  const loadSalesPreviousBalance = (account: string | number, excludeMtmId: string | number = '') => {
    if (!account || Number(account) === 17) {
      setSalesPreviousBalance(0);
      return;
    }

    httpService
      .get(API_TILES_PREVIOUS_BALANCE_URL, {
        params: { account, exclude_mtm_id: excludeMtmId, allow_negative: 1 },
      })
      .then((response: any) =>
        setSalesPreviousBalance(Number(response?.data?.data?.data?.balance ?? 0)),
      )
      .catch(() => setSalesPreviousBalance(0));
  };

  useEffect(() => {
    const combinedNumber = String((location.state as any)?.combinedNumber || '').trim();
    const shouldAutoEdit = Boolean((location.state as any)?.combinedAutoEdit && combinedNumber);

    if (!shouldAutoEdit) return;

    const fetchCombinedEntry = async () => {
      try {
        const response = await httpService.post(API_TRADING_COMBINED_EDIT_URL, {
          combined_number: combinedNumber,
        });
        const result = response?.data;
        const editData = result?.data?.data || {};

        if (!result?.success || !editData?.combined_number) {
          toast.error(result?.message || 'Combined entry not found.');
          return;
        }

        const combinedOpenState = getCombinedVoucherOpenState(editData);
        if (combinedOpenState.hasApprovedVoucher) {
          if (!combinedOpenState.editableVoucherNo) {
            toast.error('Approved voucher cannot be opened.');
            navigate(-1);
            return;
          }

          const editTarget = getVoucherEditTarget(combinedOpenState.editableVoucherNo);
          const editState = buildVoucherAutoEditState(combinedOpenState.editableVoucherNo);

          if (!editTarget || !editState) {
            toast.error('Edit route not found for this voucher.');
            return;
          }

          toast.info('Approved voucher is locked. Opening the editable voucher.');
          navigate(editTarget.route, { state: editState, replace: true });
          return;
        }

        setEditingCombinedNumber(String(editData.combined_number));
        setSelectedSupplierOption({
          value: editData.supplierAccount,
          label: editData.supplierName,
        });
        setSelectedCustomerOption({
          value: editData.customerAccount,
          label: editData.customerName,
        });

        const products: CombinedProduct[] = Array.isArray(editData.products)
          ? editData.products.map((row: any) => ({
            id: Number(row.id),
            product: Number(row.product),
            product_name: row.product_name || '',
            unit: row.unit || '',
            qty: Number(row.qty || 0),
            purchase_price: Number(row.purchase_price || 0),
            sales_price: Number(row.sales_price || 0),
            warehouse: row.warehouse ? String(row.warehouse) : '',
          }))
          : [];

        setFormData({
          supplierAccount: String(editData.supplierAccount || ''),
          supplierName: editData.supplierName || '',
          customerAccount: String(editData.customerAccount || ''),
          customerName: editData.customerName || '',
          invoice_no: editData.invoice_no || '',
          invoice_date: editData.invoice_date || '',
          paymentAmount: String(editData.payment_amount ?? ''),
          receivedAmount: String(editData.received_amount ?? ''),
          purchaseDiscountAmt: String(editData.purchaseDiscountAmt ?? ''),
          salesDiscountAmt: String(editData.salesDiscountAmt ?? ''),
          notes: editData.notes || '',
          purchaseNotes: editData.purchaseNotes || '',
          salesNotes: editData.salesNotes || '',
          notesApplyTo: editData.notesApplyTo || editData.notes_apply_to || 'both',
          purchase_manual_voucher_no: editData.purchase_manual_voucher_no || '',
          purchase_manual_voucher_date: editData.purchase_manual_voucher_date || '',
          purchase_manual_challan_no: editData.purchase_manual_challan_no || '',
          purchase_manual_challan_date: editData.purchase_manual_challan_date || '',
          manual_voucher_no: editData.manual_voucher_no || '',
          manual_voucher_date: editData.manual_voucher_date || '',
          manual_challan_no: editData.manual_challan_no || '',
          manual_challan_date: editData.manual_challan_date || '',
          products,
        });
        resetProductEditor();

        // The bill being edited is inside its own previous figure, so each leg's
        // own id travels along to be left out of the sum.
        void loadPurchasePreviousPayable(editData.supplierAccount, editData.purchase_mtm_id ?? '');
        void loadSalesPreviousBalance(editData.customerAccount, editData.sales_mtm_id ?? '');
      } catch (error: any) {
        toast.error(error?.response?.data?.message || error?.message || 'Failed to load combined entry.');
      }
    };

    void fetchCombinedEntry();
  }, [location.state, navigate]);

  const purchaseTotal = useMemo(
    () =>
      formData.products.reduce(
        (sum, row) => sum + Number(row.qty || 0) * Number(row.purchase_price || 0),
        0,
      ),
    [formData.products],
  );

  const salesTotal = useMemo(
    () =>
      formData.products.reduce(
        (sum, row) => sum + Number(row.qty || 0) * Number(row.sales_price || 0),
        0,
      ),
    [formData.products],
  );

  const purchaseDiscount = Number(formData.purchaseDiscountAmt || 0) || 0;
  const salesDiscount = Number(formData.salesDiscountAmt || 0) || 0;
  const paymentAmount = Number(formData.paymentAmount || 0) || 0;
  const receivedAmount = Number(formData.receivedAmount || 0) || 0;

  // The two blocks, one term to a line, every term shown nought included:
  //   Purchase: Previous Payable + Current Purchase − Discount − Payment Amount
  //   Sales:    Previous Balance + Current Invoice − Discount − Received Amount
  const purchaseTotalTk =
    purchasePreviousPayable + purchaseTotal - purchaseDiscount - paymentAmount;
  const salesTotalTk =
    salesPreviousBalance + salesTotal - salesDiscount - receivedAmount;

  const purchaseTerms: [string, number][] = [
    ['Previous Payable', purchasePreviousPayable],
    ['Current Purchase', purchaseTotal],
    ['Discount', purchaseDiscount],
    ['Pmt Amt Tk.', paymentAmount],
  ];
  const salesTerms: [string, number][] = [
    ['Previous Balance', salesPreviousBalance],
    ['Current Invoice', salesTotal],
    ['Discount', salesDiscount],
    ['Rcvd Amt Tk.', receivedAmount],
  ];

  const focusField = (fieldId: string, delay = 100) => {
    window.setTimeout(() => {
      const nextElement = document.getElementById(fieldId);
      if (nextElement instanceof HTMLElement) {
        nextElement.focus();

        if (
          'select' in nextElement &&
          typeof (nextElement as HTMLInputElement).select === 'function'
        ) {
          (nextElement as HTMLInputElement).select();
        }
      }
    }, delay);
  };

  const handleEnterFocus = (
    event: React.KeyboardEvent<HTMLElement>,
    nextFieldId: string,
    delay = 100,
  ) => {
    if (event.key !== 'Enter') return;

    focusField(nextFieldId, delay);
  };

  const openPartyModal = (target: PartyTarget, typedName = '') => {
    setPartyTarget(target);
    setPartyDraftName(typedName);
    setShowPartyModal(true);
  };

  const closePartyModal = () => {
    setShowPartyModal(false);
  };

  const handlePartySaved = ({ id, name }: { id: string; name: string }) => {
    if (partyTarget === 'supplier') {
      setSelectedSupplierOption({ value: id, label: name });
      setFormData((prev) => ({
        ...prev,
        supplierAccount: id,
        supplierName: name,
      }));
      // A supplier added here starts owing nothing, but ask anyway: the new
      // party is a real ledger the moment it is saved.
      void loadPurchasePreviousPayable(id);
    } else {
      setSelectedCustomerOption({ value: id, label: name });
      setFormData((prev) => ({
        ...prev,
        customerAccount: id,
        customerName: name,
      }));
      void loadSalesPreviousBalance(id);
    }
  };

  const supplierAccountHandler = (option: any) => {
    setSelectedSupplierOption(option || null);
    setFormData((prev) => ({
      ...prev,
      supplierAccount: option?.value || '',
      supplierName: option?.label || '',
      // A credit purchase has paid nothing yet, and the last supplier's figure
      // is not this one's -- kept only for the cash party, whose box is shut.
      paymentAmount: Number(option?.value) === 17 ? prev.paymentAmount : '',
    }));

    void loadPurchasePreviousPayable(option?.value || '');
  };

  const customerAccountHandler = (option: any) => {
    setSelectedCustomerOption(option || null);
    setFormData((prev) => ({
      ...prev,
      customerAccount: option?.value || '',
      customerName: option?.label || '',
      receivedAmount: Number(option?.value) === 17 ? prev.receivedAmount : '',
    }));

    void loadSalesPreviousBalance(option?.value || '');
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNotesApplyToChange = (notesApplyTo: NotesApplyTo) => {
    if (notesApplyTo === 'separate') {
      if (formData.notesApplyTo !== 'separate') setNotesModeBeforeSeparate(formData.notesApplyTo);
      setFormData((prev) => ({
        ...prev,
        notesApplyTo: 'separate',
        purchaseNotes: prev.notesApplyTo === 'separate' ? prev.purchaseNotes : prev.notes,
        salesNotes: prev.notesApplyTo === 'separate' ? prev.salesNotes : prev.notes,
      }));
      setShowNotesModal(true);
      return;
    }

    if (formData.notesApplyTo === 'separate') {
      const purchase = formData.purchaseNotes.trim();
      const sales = formData.salesNotes.trim();
      if (purchase && sales && purchase !== sales) {
        toast.info(`Kept the Purchase note; the Sales note ("${sales}") was dropped.`);
      }
      setFormData((prev) => ({
        ...prev,
        notesApplyTo,
        notes: purchase || sales,
        purchaseNotes: '',
        salesNotes: '',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      notesApplyTo,
    }));
  };

  const handleSeparateNotesSave = (purchaseNotes: string, salesNotes: string) => {
    setFormData((prev) => ({ ...prev, purchaseNotes, salesNotes }));
    setShowNotesModal(false);
    focusField('product', 150);
  };

  const handleSeparateNotesCancel = () => {
    setShowNotesModal(false);
    if (!formData.purchaseNotes.trim() && !formData.salesNotes.trim()) {
      setFormData((prev) => ({ ...prev, notesApplyTo: notesModeBeforeSeparate }));
    }
  };

  const productSelectHandler = (option: any) => {
    setProductData((prev: any) => ({
      ...prev,
      product: option?.value || '',
      product_name: option?.label || '',
      product_code: option?.code || '',
      unit: option?.label_5 || '',
      purchase_price: String(option?.label_3 ?? ''),
      sales_price: String(option?.label_4 ?? ''),
    }));
  };

  /**
   * The box keeps exactly what was typed. Parsing here is what stopped a
   * decimal from ever being entered: the dot of a half-typed "26." reads back
   * as 26, the box re-renders without it, and 26.22 can never be reached. Every
   * reader of these figures parses them itself -- addProduct below.
   */
  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProductData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProductData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetProductEditor = ({ keepProduct = false } = {}) => {
    setProductData((prev: any) => ({
      ...initialProductData,
      // The warehouse is one store for the whole bill, so it stays put between
      // lines rather than being re-picked for every one.
      warehouse: prev.warehouse || defaultWarehouseId || '',
      ...(keepProduct
        ? {
          product: prev.product,
          product_name: prev.product_name,
          product_code: prev.product_code,
          unit: prev.unit,
          purchase_price: prev.purchase_price,
          sales_price: prev.sales_price,
        }
        : {}),
    }));
    setEditingProductId(null);
  };

  /** One line per product id -- a second line is a typing slip, not a second sale. */
  const isProductAlreadyAdded = (skipId: number | null = null) =>
    formData.products.some(
      (row) => row.id !== skipId && Number(row.product) === Number(productData.product),
    );

  const addProduct = () => {
    if (!productData.product) {
      toast.info('Please select a product.');
      return;
    }
    if (!(Number(productData.qty) > 0)) {
      toast.info('Please enter a valid quantity.');
      return;
    }
    if (!(Number(productData.purchase_price) >= 0)) {
      toast.info('Please enter a valid purchase price.');
      return;
    }
    if (!(Number(productData.sales_price) >= 0)) {
      toast.info('Please enter a valid sales price.');
      return;
    }
    if (isProductAlreadyAdded(editingProductId)) {
      toast.info('This product is already added.');
      return;
    }

    const newProduct: CombinedProduct = {
      id: editingProductId ?? Date.now(),
      product: Number(productData.product),
      product_name: productData.product_name || '',
      product_code: productData.product_code || '',
      unit: productData.unit || '',
      qty: Number(productData.qty) || 0,
      purchase_price: Number(productData.purchase_price) || 0,
      sales_price: Number(productData.sales_price) || 0,
      warehouse: productData.warehouse || defaultWarehouseId || '',
    };

    setFormData((prev) => ({
      ...prev,
      products: editingProductId
        ? prev.products.map((item) => (item.id === editingProductId ? newProduct : item))
        : [...prev.products, newProduct],
    }));
    resetProductEditor({ keepProduct: true });
    focusField('product');
  };

  const handleEdit = (row: CombinedProduct) => {
    setEditingProductId(row.id);
    setProductData({
      product: String(row.product || ''),
      product_name: row.product_name || '',
      product_code: row.product_code || '',
      unit: row.unit || '',
      qty: String(row.qty || ''),
      purchase_price: String(row.purchase_price || ''),
      sales_price: String(row.sales_price || ''),
      warehouse: row.warehouse || defaultWarehouseId || '',
    });
  };

  const handleDelete = (id: number) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((item) => item.id !== id),
    }));
    if (editingProductId === id) {
      resetProductEditor();
    }
  };

  const resetForm = ({
    keepParties = false,
    keepProduct = false,
    keepNotesApplyTo = false,
  } = {}) => {
    setFormData((prev) => ({
      ...initialFormData,
      ...(keepParties
        ? {
          supplierAccount: prev.supplierAccount,
          supplierName: prev.supplierName,
          customerAccount: prev.customerAccount,
          customerName: prev.customerName,
        }
        : {}),
      ...(keepNotesApplyTo ? { notesApplyTo: prev.notesApplyTo } : {}),
    }));
    resetProductEditor({ keepProduct });
    if (!keepParties) {
      setSelectedSupplierOption(null);
      setSelectedCustomerOption(null);
      // The parties are gone with the rest of the form, so their balances go
      // too -- left standing they would total into the next bill against nobody.
      setPurchasePreviousPayable(0);
      setSalesPreviousBalance(0);
    }
    setEditingCombinedNumber('');
  };

  const handleSave = async () => {
    const payment = Number(formData.paymentAmount || 0);
    const received = Number(formData.receivedAmount || 0);

    if (!formData.supplierAccount) {
      toast.info('Please select Supplier');
      focusField('supplierAccount');
      return;
    }
    if (!formData.customerAccount) {
      toast.info('Please select Customer');
      focusField('customerAccount');
      return;
    }
    if (!Number.isFinite(payment) || payment < 0) {
      toast.info('Please enter a valid payment amount.');
      return;
    }
    if (!Number.isFinite(received) || received < 0) {
      toast.info('Please enter a valid received amount.');
      return;
    }
    if (formData.products.length === 0) {
      toast.info('Please add some products.');
      return;
    }

    setSaveButtonLoading(true);

    const notesApplyTo = showCombinedInvoiceNote ? formData.notesApplyTo || 'both' : 'both';
    const legNotes =
      notesApplyTo === 'separate'
        ? { purchaseNotes: formData.purchaseNotes || null, salesNotes: formData.salesNotes || null }
        : {
          purchaseNotes: notesApplyTo !== 'sales' ? formData.notes || null : null,
          salesNotes: notesApplyTo !== 'purchase' ? formData.notes || null : null,
        };

    const keptSupplierAccount = formData.supplierAccount;
    const keptCustomerAccount = formData.customerAccount;

    try {
      const payload = {
        supplierAccount: formData.supplierAccount,
        supplierName: formData.supplierName,
        customerAccount: formData.customerAccount,
        customerName: formData.customerName,
        invoice_no: formData.invoice_no || null,
        invoice_date: formData.invoice_date || null,
        paymentAmount: payment,
        receivedAmount: received,
        purchaseDiscountAmt: Number(formData.purchaseDiscountAmt || 0),
        salesDiscountAmt: Number(formData.salesDiscountAmt || 0),
        notes: formData.notes || null,
        notesApplyTo: showCombinedInvoiceNote ? formData.notesApplyTo || 'both' : 'both',
        ...legNotes,
        purchase_manual_voucher_no: formData.purchase_manual_voucher_no || null,
        purchase_manual_voucher_date: formData.purchase_manual_voucher_date || null,
        purchase_manual_challan_no: formData.purchase_manual_challan_no || null,
        purchase_manual_challan_date: formData.purchase_manual_challan_date || null,
        manual_voucher_no: formData.manual_voucher_no || null,
        manual_voucher_date: formData.manual_voucher_date || null,
        manual_challan_no: formData.manual_challan_no || null,
        manual_challan_date: formData.manual_challan_date || null,
        products: formData.products,
        ...(editingCombinedNumber ? { combined_number: editingCombinedNumber } : {}),
      };

      const response = await httpService.post(
        editingCombinedNumber ? API_TRADING_COMBINED_UPDATE_URL : API_TRADING_COMBINED_STORE_URL,
        payload,
      );
      const result = response?.data;

      if (result?.success) {
        const data = result?.data?.data || {};
        const purchaseVr = data?.purchase_vr_no ? `Purchase: ${data.purchase_vr_no}` : '';
        const salesVr = data?.sales_vr_no ? `Sales: ${data.sales_vr_no}` : '';
        toast.success([purchaseVr, salesVr].filter(Boolean).join(' | ') || result?.message || 'Saved successfully.');
        resetForm({
          keepParties: true,
          keepProduct: true,
          keepNotesApplyTo: true,
        });
        // The parties stay, so their running balances are re-read for the next
        // bill -- the one just saved now sits inside both figures.
        void loadPurchasePreviousPayable(keptSupplierAccount);
        void loadSalesPreviousBalance(keptCustomerAccount);
        focusField('product');
      } else {
        toast.error(result?.message || 'Failed to save combined entry.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to save combined entry.');
    } finally {
      setSaveButtonLoading(false);
    }
  };

  useCtrlS(handleSave);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title={editingCombinedNumber ? 'Edit Combined Invoice' : 'Combined Invoice'} screen="combined-entry.tiles" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-8">
        <div className="min-w-0 self-start md:self-auto">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label htmlFor="" className='text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]'>Select Supplier</label>
                <DdlMultiline
                  id="supplierAccount"
                  className=""
                  onSelect={supplierAccountHandler}
                  actionOptionLabel="+ Add New Supplier"
                  onActionSelect={(typedName: string) => openPartyModal('supplier', typedName)}
                  value={
                    selectedSupplierOption ||
                    (formData.supplierAccount
                      ? { value: formData.supplierAccount, label: formData.supplierName }
                      : null)
                  }
                  onKeyDown={(e) => {
                    handleEnterFocus(e, 'customerAccount', 150);
                  }}
                  acType={'3'}
                />
              </div>
              <div>
                <label htmlFor="" className='text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]'>Select Customer</label>
                <DdlMultiline
                  id="customerAccount"
                  className=""
                  onSelect={customerAccountHandler}
                  actionOptionLabel="+ Add New Customer"
                  onActionSelect={(typedName: string) => openPartyModal('customer', typedName)}
                  value={
                    selectedCustomerOption ||
                    (formData.customerAccount
                      ? { value: formData.customerAccount, label: formData.customerName }
                      : null)
                  }
                  onKeyDown={(e) => {
                    handleEnterFocus(e, 'paymentAmount', 150);
                  }}
                  acType={'3'}
                />
              </div>
            </div>

            {/* The two money boxes, and the date. Paid to the supplier on the
                left, taken from the customer on the right -- independent, and
                either may be nought. A cash party's box is shut: a cash
                purchase is settled in full, and so is a cash sale. */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InputElement
                id="paymentAmount"
                value={formData.paymentAmount ?? ''}
                name="paymentAmount"
                type="number"
                placeholder="Payment Amount"
                label="Pmt Amt Tk."
                disabled={Number(formData.supplierAccount) === 17}
                className="py-1"
                onChange={handleFormChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'receivedAmount')}
              />
              <InputElement
                id="receivedAmount"
                value={formData.receivedAmount ?? ''}
                name="receivedAmount"
                type="number"
                placeholder="Received Amount"
                label="Rcvd Amt Tk."
                disabled={Number(formData.customerAccount) === 17}
                className="py-1"
                onChange={handleFormChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'invoice_date')}
              />
              <InputDatePicker
                id="invoice_date"
                name="invoice_date"
                label="Date"
                className="font-medium text-sm w-full"
                selectedDate={asDate(formData.invoice_date)}
                setSelectedDate={(date: Date | null) =>
                  setFormData((prev) => ({ ...prev, invoice_date: asText(date) }))
                }
                setCurrentDate={() => undefined}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <InputElement
                id="purchaseDiscountAmt"
                value={String(formData.purchaseDiscountAmt ?? '')}
                name="purchaseDiscountAmt"
                type="number"
                placeholder="Purchase Discount"
                label="Purchase Discount"
                className="py-1"
                onChange={handleFormChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'salesDiscountAmt')}
              />
              <InputElement
                id="salesDiscountAmt"
                value={String(formData.salesDiscountAmt ?? '')}
                name="salesDiscountAmt"
                type="number"
                placeholder="Sales Discount"
                label="Sales Discount"
                className="py-1"
                onChange={handleFormChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'notes')}
              />
            </div>

            {/* The shop's own figures, one set per leg: the memo pair and the
                delivery challan's, written on the purchase voucher and on the
                sales voucher. None reaches the posting -- the vouchers post on
                vr_date under vr_no -- and all eight are optional. */}
            <div className="grid grid-cols-1 gap-2">
              <div>
                <p className="mb-1 text-xs uppercase text-gray-500 dark:text-gray-400">Purchase</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                  <InputElement
                    id="purchase_manual_voucher_no"
                    value={formData.purchase_manual_voucher_no ?? ''}
                    name="purchase_manual_voucher_no"
                    placeholder={fieldLabel('manual_voucher_no_label', 'Memo No.')}
                    label={fieldLabel('manual_voucher_no_label', 'Memo No.')}
                    className="py-1 w-full"
                    onChange={handleFormChange}
                    onKeyDown={(e) => handleInputKeyDown(e, 'purchase_manual_voucher_date')}
                  />
                  <InputDatePicker
                    id="purchase_manual_voucher_date"
                    name="purchase_manual_voucher_date"
                    label={fieldLabel('manual_voucher_date_label', 'Memo Date')}
                    className="font-medium text-sm w-full"
                    selectedDate={asDate(formData.purchase_manual_voucher_date)}
                    setSelectedDate={(date: Date | null) =>
                      setFormData((prev) => ({ ...prev, purchase_manual_voucher_date: asText(date) }))
                    }
                    setCurrentDate={() => undefined}
                  />
                  <InputElement
                    id="purchase_manual_challan_no"
                    value={formData.purchase_manual_challan_no ?? ''}
                    name="purchase_manual_challan_no"
                    placeholder={fieldLabel('manual_challan_no_label', 'Challan No')}
                    label={fieldLabel('manual_challan_no_label', 'Challan No')}
                    className="py-1 w-full"
                    onChange={handleFormChange}
                    onKeyDown={(e) => handleInputKeyDown(e, 'purchase_manual_challan_date')}
                  />
                  <InputDatePicker
                    id="purchase_manual_challan_date"
                    name="purchase_manual_challan_date"
                    label={fieldLabel('manual_challan_date_label', 'Challan Date')}
                    className="font-medium text-sm w-full"
                    selectedDate={asDate(formData.purchase_manual_challan_date)}
                    setSelectedDate={(date: Date | null) =>
                      setFormData((prev) => ({ ...prev, purchase_manual_challan_date: asText(date) }))
                    }
                    setCurrentDate={() => undefined}
                  />
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase text-gray-500 dark:text-gray-400">Sales</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                  <InputElement
                    id="manual_voucher_no"
                    value={formData.manual_voucher_no ?? ''}
                    name="manual_voucher_no"
                    placeholder={fieldLabel('manual_voucher_no_label', 'Memo No.')}
                    label={fieldLabel('manual_voucher_no_label', 'Memo No.')}
                    className="py-1 w-full"
                    onChange={handleFormChange}
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
                    value={formData.manual_challan_no ?? ''}
                    name="manual_challan_no"
                    placeholder={fieldLabel('manual_challan_no_label', 'Challan No')}
                    label={fieldLabel('manual_challan_no_label', 'Challan No')}
                    className="py-1 w-full"
                    onChange={handleFormChange}
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
            <div>
              <div className="@container mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <label htmlFor="notes" className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Notes
                </label>

                {showCombinedInvoiceNote && (
                  <NotesApplyToStrip value={formData.notesApplyTo} onChange={handleNotesApplyToChange} />
                )}
              </div>
              {formData.notesApplyTo === 'separate' ? (
                <div className="relative">
                  <Input
                    id="notes"
                    value={`P: ${formData.purchaseNotes || '-'} | S: ${formData.salesNotes || '-'}`}
                    name="notes"
                    readOnly
                    title={`Purchase: ${formData.purchaseNotes || '-'}\nSales: ${formData.salesNotes || '-'}`}
                    onFocus={() => setShowNotesModal(true)}
                    onKeyDown={(e) => handleInputKeyDown(e, 'product')}
                    className={fieldClass(undefined, 'w-full cursor-pointer pr-9')}
                  />
                  <IconButton
                    icon={<FiEdit2 className="h-4 w-4" />}
                    title="Edit the two notes"
                    tone="primary"
                    onClick={() => setShowNotesModal(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  />
                </div>
              ) : (
                <Input
                  id="notes"
                  value={formData.notes}
                  name="notes"
                  placeholder="Notes"
                  autoComplete="off"
                  onChange={handleFormChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'product')}
                  className={fieldClass(undefined, 'w-full')}
                />
              )}
            </div>
          </div>
        </div>
        <div className="min-w-0">
          {warehouse.isLoading ? <Loader /> : null}
          <div className="grid grid-cols-1 gap-y-1">
            <div className={`grid grid-cols-1 gap-2 ${showWarehouse ? 'md:grid-cols-2' : ''}`}>
              <div>
                <label htmlFor="" className='text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]'>
                  Select Product
                </label>
                <ProductDropdown
                  id="product"
                  name="product"
                  className=""
                  onSelect={productSelectHandler}
                  value={
                    productData.product_name && productData.product
                      ? { label: productData.product_name, value: productData.product }
                      : null
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      focusField(showWarehouse ? 'warehouse' : 'qty', 150);
                    }
                  }}
                />
              </div>
              {showWarehouse ? (
                <div>
                  <label htmlFor="" className='text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]'>
                    Select Warehouse
                  </label>
                  <WarehouseDropdown
                    id="warehouse"
                    onChange={handleWarehouseChange}
                    className="font-medium text-sm"
                    warehouseDdl={warehouseDdlData}
                    defaultValue={productData?.warehouse || ''}
                  />
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="relative">
                <InputElement
                  id="qty"
                  value={productData.qty || ''}
                  name="qty"
                  type="number"
                  placeholder="Quantity"
                  label="Quantity"
                  className="py-1"
                  onChange={handleProductChange}
                  onKeyDown={(e) => handleInputKeyDown(e, 'purchase_price')}
                />
                <span className="absolute right-3 top-8 z-50 text-xs">{productData.unit || ''}</span>
              </div>
              <InputElement
                id="purchase_price"
                value={productData.purchase_price || ''}
                name="purchase_price"
                type="number"
                placeholder="Enter Purchase Rate"
                label="Purchase Rate"
                className="py-1"
                onChange={handleProductChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'sales_price')}
              />
              <InputElement
                id="sales_price"
                value={productData.sales_price || ''}
                name="sales_price"
                type="number"
                placeholder="Sales Rate"
                label="Sales Rate"
                className="py-1"
                onChange={handleProductChange}
                onKeyDown={(e) => handleInputKeyDown(e, 'addProduct')}
              />
            </div>

            <div className="@container grid grid-cols-2 sm:grid-cols-4 gap-x-1 gap-y-1 mt-2">
              <ButtonLoading
                id="addProduct"
                onClick={addProduct}
                buttonLoading={buttonLoading}
                label={editingProductId ? 'Update Item' : 'Add New'}
                responsiveLabel="xl"
                className="whitespace-nowrap text-center mr-0 py-1.5"
                icon={
                  editingProductId ? (
                    <FiEdit2 className="text-white text-lg ml-2 mr-2" />
                  ) : (
                    <FiPlus className="text-white text-lg ml-2 mr-2" />
                  )
                }
              />
              <ButtonLoading
                onClick={handleSave}
                buttonLoading={saveButtonLoading}
                label={saveButtonLoading ? 'Saving...' : editingCombinedNumber ? 'Update' : 'Save'}
                responsiveLabel="xl"
                className="whitespace-nowrap text-center mr-0"
                icon={<FiSave className="text-lg ml-2 mr-2" />}
                disabled={saveButtonLoading}
              />
              <ButtonLoading
                onClick={resetForm}
                buttonLoading={buttonLoading}
                label="Reset"
                responsiveLabel="xl"
                className="whitespace-nowrap text-center mr-0"
                icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
              />
              <ButtonLoading
                onClick={() => navigate('/dashboard')}
                buttonLoading={false}
                label="Home"
                responsiveLabel="xl"
                className="whitespace-nowrap text-center mr-0"
                icon={<FiHome className="text-lg ml-2 mr-2" />}
              />
            </div>

            {/* The two running figures, side by side, one term to a line with
                the answer under a rule. Every term shows, nought included: a
                line that comes and goes leaves the block a different height and
                hides the very term the desk wants to see was counted. */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="ml-auto w-full max-w-xs text-sm font-semibold text-gray-800 dark:text-[rgb(var(--c-text))]">
                <p className="mb-1 text-xs uppercase text-gray-500 dark:text-gray-400">Purchase</p>
                {purchaseTerms.map(([label, amount]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span>{label}</span>
                    <span>{money(amount)}</span>
                  </div>
                ))}
                <div className="my-1 border-t border-gray-400" />
                <div className="flex justify-between gap-4 text-base font-bold">
                  <span>Total Tk.</span>
                  <span>{money(purchaseTotalTk)}</span>
                </div>
              </div>
              <div className="ml-auto w-full max-w-xs text-sm font-semibold text-gray-800 dark:text-[rgb(var(--c-text))]">
                <p className="mb-1 text-xs uppercase text-gray-500 dark:text-gray-400">Sales</p>
                {salesTerms.map(([label, amount]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span>{label}</span>
                    <span>{money(amount)}</span>
                  </div>
                ))}
                <div className="my-1 border-t border-gray-400" />
                <div className="flex justify-between gap-4 text-base font-bold">
                  <span>Total Tk.</span>
                  <span>{money(salesTotalTk)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 col-span-full overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-[rgb(var(--c-table-head))] dark:text-gray-200">
              <tr>
                <th className="px-2 py-2 text-center">SL. NO.</th>
                <th className="px-2 py-2">PRODUCT NAME</th>
                <th className="px-2 py-2 text-right">QUANTITY</th>
                <th className="px-2 py-2 text-right">PURCHASE RATE</th>
                <th className="px-2 py-2 text-right">PURCHASE</th>
                <th className="px-2 py-2 text-right">SALES RATE</th>
                <th className="px-2 py-2 text-right">TOTAL</th>
                <th className="px-2 py-2 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {formData.products.map((row, index) => {
                const rowPurchaseTotal = Number(row.qty) * Number(row.purchase_price);
                const rowSalesTotal = Number(row.qty) * Number(row.sales_price);
                return (
                  <tr
                    key={row.id}
                    className="bg-[rgb(var(--c-table-body))] border-b dark:border-gray-700"
                  >
                    <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
                      {index + 1}
                    </td>
                    <td className="px-2 py-2 font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
                      {row.product_code
                        ? `${row.product_code} - ${row.product_name}`
                        : row.product_name}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
                      {thousandSeparator(Number(row.qty))} {row.unit}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
                      {thousandSeparator(Number(row.purchase_price))}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
                      {thousandSeparator(rowPurchaseTotal)}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
                      {thousandSeparator(Number(row.sales_price))}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
                      {thousandSeparator(rowSalesTotal)}
                    </td>
                    <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
                      <Button
                        onClick={() => handleEdit(row)}
                        className="text-blue-500 text-center"
                        type="button"
                      >
                        <FiEdit2 className="cursor-pointer text-center" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(row.id)}
                        className="text-red-500 ml-2 text-center"
                        type="button"
                      >
                        <FiTrash2 className="cursor-pointer text-center" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <SeparateNotesModal
        isOpen={showNotesModal}
        purchaseNotes={formData.purchaseNotes}
        salesNotes={formData.salesNotes}
        fetchSuggestions={loadNoteSuggestions}
        onSave={handleSeparateNotesSave}
        onCancel={handleSeparateNotesCancel}
      />
      <QuickCustomerModal
        isOpen={showPartyModal}
        onClose={closePartyModal}
        initialName={partyDraftName}
        entityLabel={partyTarget === 'supplier' ? 'Supplier' : 'Customer'}
        defaultTypeId={partyTarget === 'supplier' ? '2' : undefined}
        onCustomerSaved={handlePartySaved}
      />
    </>
  );
};

export default TilesCombinedEntry;
