import React, { useEffect, useRef, useState } from 'react';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import RichTextEditor from '../../utils/fields/RichTextEditor';
import HelmetTitle from '../../utils/others/HelmetTitle';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import {
  downPaymentBases,
  moneySpellFormat,
  padPrintModes,
  printerSettings,
  printPadHeading,
  status,
} from '../../utils/fields/DataConstant';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { FiArrowLeft, FiArrowRight, FiCheck, FiRefreshCcw, FiSave } from 'react-icons/fi';
import { useParams, useNavigate } from 'react-router-dom';
import { editBranch, storeBranch, updateBranch } from './branchSlice';
import { useDispatch, useSelector } from 'react-redux';
import Loader from '../../../common/Loader';
import Link from '../../utils/others/Link';
import { getBranchSettings, getSettings } from '../settings/settingsSlice';
import { toast } from 'react-toastify';
import {
  API_BRANCH_CLEAR_OPENING_URL,
  API_BRANCH_CLEAR_TRANSACTION_URL,
  API_REMOTE_URL,
} from '../../services/apiRoutes';
import FormToggleField from '../../utils/utils-functions/FormToggleField';
import ConfirmModal from '../../utils/components/ConfirmModalProps';
import httpService from '../../services/httpService';
import { hasPermission } from '../../utils/permissionChecker';

const shouldStripPublicPrefix = /^(https?:\/\/)?(localhost|127\.0\.0\.1|cashbook_api\.test)(:\d+)?$/i.test(
  API_REMOTE_URL,
);

/**
 * What a number field holds: the number itself, never the text the box happens
 * to show. Empty is its own state -- a cleared box, or a decimal mid-typing --
 * so the field can be retyped without snapping back to zero.
 */
type NumberField = number | '';

interface branchItem {
  id: string | number;
  branch_id?: string | number;
  name: string;
  branch_types_id: string;
  branchTypeText?: string; // Add this line
  business_type_id: string;
  inventory_system_id: string | number;
  email: string;
  pad_heading_print: string;
  /** Whether a print draws its own pad head or leaves room for a printed one. */
  pad_print_mode: string;
  /** How much of the page top a pre-printed pad head takes, in px. */
  preprinted_pad_height: NumberField;
  address: string;
  print_size: string;
  contact_person: string;
  paper_size: string;
  print_sizeText?: string; // Add this line
  purchase_note: string;
  sales_note: string;
  combined_invoice_note: boolean;
  money_format: string;
  phone: string;
  notes: string;
  invoice_label: string;
  decimal_places: number;
  dashboard_top_sales_days: number;
  device_identifier_text?: string;
  status: string;
  warranty_controll: boolean;
  have_warehouse: boolean;
  share_product_with_other_branch: boolean;
  share_customer_with_other_branch: boolean;
  have_customer_sl: boolean;
  have_is_guaranter: boolean;
  have_customer_nominee: boolean;
  stock_report_type: boolean;
  is_opening: boolean;
  use_bangla: boolean;
  report_zero_bal: boolean;
  manufactur_control: boolean;
  sms_service: boolean;
  received_sms: boolean;
  purchase_sms: boolean;
  sales_sms: boolean;
  payment_sms: boolean;
  pad_header_image?: string;
  show_instalment_list: boolean;
  show_brand_in_invoice: boolean;
  show_category_in_invoice: boolean;
  show_description_in_invoice: boolean;
  show_spelling_of_money: boolean;
  need_demo_tutorial: boolean;
  need_customer_contact_person: boolean;
  due_list_with_address: boolean;
  need_relation_info: boolean;
  need_customer_mother_name: boolean;
  need_customer_sex: boolean;
  salutation_male: string;
  salutation_female: string;
  salutation_other: string;
  letter_signature: string;
  need_customer_date_of_birth: boolean;
  need_customer_occupation: boolean;
  need_customer_permanent_address: boolean;
  need_customer_photo: boolean;
  need_nominee_photo: boolean;
  need_customer_area: boolean;
  show_voucher_image: boolean;
  multi_product_order: boolean;
  /** Share of the property value the allotment letter asks for up front, as a percentage. */
  down_payment_percent: NumberField;
  /** What that share is taken on: 'total' or 'net_payable'. */
  down_payment_base: string;
  /** Yearly late-payment rate the allotment letter quotes, as a percentage. */
  delay_charge_percent: NumberField;
  /**
   * What an allotment letter's reference number starts with, e.g. 'BST/ALLOT'.
   * The year and the sale's serial are added to it to suggest a number, which
   * the clerk issuing the letter can still overwrite.
   */
  letter_ref_prefix: string;
  /**
   * The date the branch's allotment letters carry, as YYYY-MM-DD. Left empty,
   * the screen issuing a letter offers today. Either way it is only what the
   * clerk is shown -- they can write another date over it before issuing.
   */
  letter_ref_date: string;
  /** Announce a new company registration to this branch. */
  registration_alert: boolean;
  /** Also text the numbers below when one registers. */
  registration_alert_sms: boolean;
  /** Comma-separated mobile numbers the alert texts. */
  registration_alert_mobile: string;
}

const resolveImageUrl = (path?: string) => {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const normalizedPath = path
    .replace(/^\/+/, '')
    .replace(shouldStripPublicPrefix ? /^public\//i : /$^/, '');
  return `${API_REMOTE_URL}/${normalizedPath}`;
};

const buildBranchFormData = (data: branchItem, file: File | null) => {
  const payload = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'pad_header_image') return;

    if (typeof value === 'boolean') {
      payload.append(key, value ? '1' : '0');
      return;
    }

    payload.append(key, String(value));
  });

  if (file) {
    payload.append('pad_header_image', file);
  }

  return payload;
};

const toBooleanFlag = (value: unknown) => value == 1 || value === '1' || value === true;

/**
 * What the allotment letter signs off with when a branch has saved nothing —
 * seeded into the editor so it can be reworded rather than typed from scratch.
 * Kept in step with the fallback in pdf/allotment-letter.blade.php.
 */
const defaultSignatureBlock = (companyName = '') =>
  '<p><strong>Authorized Signatory and Company Seal</strong></p>' +
  '<p>Managing Director / Chief Executive Officer</p>' +
  (companyName ? `<p>${companyName}</p>` : '');

/**
 * How much of the page top a pre-printed pad head is assumed to take when a
 * branch has saved no measurement -- about the depth of the software one.
 */
const defaultPreprintedPadHeight = 150;

/**
 * The rates the allotment letter has always quoted, kept as the values a branch
 * starts from. Match the fallbacks in UnitSaleController.
 */
const defaultDownPaymentPercent = 30;
const defaultDownPaymentBase = 'total';
const defaultDelayChargePercent = 10;

/**
 * A saved choice as the form's own text. Unset metas come back false, so only
 * a real answer is kept.
 */
const metaTextOr = (value: unknown, fallback: string) =>
  value === null || value === undefined || value === '' || value === false
    ? fallback
    : String(value);

/**
 * A stored 'YYYY-MM-DD' as a date on the calendar.
 *
 * Read out by hand rather than handed to `new Date`, which reads that shape as
 * UTC midnight — east of Greenwich that is still the day before, and the picker
 * would open on it.
 */
const parseIsoDate = (value: string): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  if (!parts) {
    return null;
  }

  const date = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  return Number.isNaN(date.getTime()) ? null : date;
};

/** And back again, off the local parts for the same reason. */
const toIsoDate = (date: Date | null) =>
  date && !Number.isNaN(date.getTime())
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`
    : '';

/**
 * A saved rate as the number it is. Unset metas come back false, but a saved 0
 * is a real answer -- a branch that asks for nothing -- so it stays.
 */
const metaNumberOr = (value: unknown, fallback: number): number => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const AddBranch = () => {
  const navigate = useNavigate();
  const branchEditData = useSelector((state: any) => state.branchList);
  const settings = useSelector((state: any) => state.settings);

  /**
   * The SaaS step belongs to whoever runs the platform, not to a branch.
   *
   * Listed rather than tested once, because this step is expected to grow: the
   * next setting brings its own permission, and the step should appear for
   * anyone who can reach at least one of the things on it.
   *
   * Hiding it is only tidiness — anyone reading the bundle can see the test.
   * The permission is what decides: BranchController drops each platform
   * setting from the save for a caller who lacks its permission, so a request
   * posted straight at the endpoint changes nothing.
   */
  const SAAS_PERMISSIONS = ['registration.alert.manage'];
  const isPlatformOwner = SAAS_PERMISSIONS.some((permission) =>
    hasPermission(settings?.data?.permissions || [], permission),
  );

  // Built rather than fixed, so the step numbering and the "of N" count stay
  // right for everyone who does not see the extra one.
  const steps = [
    'Basic Info',
    'Print Setup',
    'Invoice Setup',
    'Customer Setup',
    'Product Setup',
    'Real Estate Setup',
    'Feature Controls',
    ...(isPlatformOwner ? ['SaaS Setup'] : []),
  ];

  /**
   * Which panel to show, asked by name.
   *
   * The panels used to be keyed by the number they happened to sit at, so
   * inserting a step in the middle silently renamed every one after it --
   * Real Estate's fields appearing under the Feature Controls heading and so
   * on. Names do not shift when the list grows.
   */
  const stepIndex = (title: string) => steps.indexOf(title);
  const SAAS_STEP = stepIndex('SaaS Setup');
  const paperSizeOptions = [
    { id: '', name: 'Select Invoice Page Size' },
    ...((settings?.branchSettings?.paperSize || []).map((item: any) => ({
      id: String(item?.id ?? ''),
      name: item?.name ?? '',
    })) as { id: string; name: string }[]),
  ];
  const initialBranch: branchItem = {
    id: '',
    branch_id: '',
    name: '',
    branch_types_id: '',
    branchTypeText: '', // Add this line
    business_type_id: '',
    inventory_system_id: 1, // default: General Inventory
    email: '',
    pad_heading_print: '',
    pad_print_mode: 'software',
    preprinted_pad_height: defaultPreprintedPadHeight,
    address: '',
    print_size: '',
    contact_person: '',
    paper_size: '',
    print_sizeText: '', // Add this line
    purchase_note: '',
    sales_note: '',
    combined_invoice_note: false,
    money_format: '',
    phone: '',
    notes: '',
    invoice_label: '',
    decimal_places: 0,
    dashboard_top_sales_days: 0,
    device_identifier_text: '',
    status: '',
    warranty_controll: false,
    have_warehouse: false,
    share_product_with_other_branch: false,
    share_customer_with_other_branch: false,
    have_customer_sl: false,
    have_is_guaranter: false,
    have_customer_nominee: false,
    stock_report_type: false,
    is_opening: false,
    use_bangla: false,
    report_zero_bal: false,
    manufactur_control: false,
    sms_service: false,
    received_sms: false,
    purchase_sms: false,
    sales_sms: false,
    payment_sms: false,
    pad_header_image: '',
    show_instalment_list: false,
    show_brand_in_invoice: false,
    show_category_in_invoice: false,
    show_description_in_invoice: false,
    show_spelling_of_money: false,
    need_demo_tutorial: false,
    need_customer_contact_person: false,
    due_list_with_address: false,
    need_relation_info: false,
    need_customer_mother_name: false,
    need_customer_sex: false,
    salutation_male: '',
    salutation_female: '',
    salutation_other: '',
    letter_signature: defaultSignatureBlock(settings?.data?.company?.name || ''),
    need_customer_date_of_birth: false,
    need_customer_occupation: false,
    need_customer_permanent_address: false,
    need_customer_photo: false,
    need_nominee_photo: false,
    need_customer_area: false,
    show_voucher_image: false,
    multi_product_order: false,
    down_payment_percent: defaultDownPaymentPercent,
    down_payment_base: defaultDownPaymentBase,
    delay_charge_percent: defaultDelayChargePercent,
    letter_ref_prefix: '',
    letter_ref_date: '',
    registration_alert: false,
    registration_alert_sms: false,
    registration_alert_mobile: '',
  };
  const [buttonLoading, setButtonLoading] = useState(false);
  const [padHeaderFile, setPadHeaderFile] = useState<File | null>(null);
  const [padHeaderPreview, setPadHeaderPreview] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const dispatch = useDispatch();

  const { id } = useParams();

  // Clearing an opening is only meaningful for a branch that already exists,
  // and only for those trusted with it. The branch must also still be taking
  // its openings -- see showClearOpening below.
  const canClearOpening =
    Boolean(id) &&
    hasPermission(settings?.data?.permissions || [], 'branch.opening.clear');
  const [confirmClearOpening, setConfirmClearOpening] = useState(false);
  const [clearingOpening, setClearingOpening] = useState(false);

  // Clearing a branch's transactions takes every voucher it holds out of the
  // books, so it carries a permission of its own rather than riding along on
  // the one that clears openings.
  const canClearTransactions =
    Boolean(id) &&
    hasPermission(settings?.data?.permissions || [], 'branch.transaction.clear');
  const [confirmClearTransactions, setConfirmClearTransactions] = useState(false);
  const [clearingTransactions, setClearingTransactions] = useState(false);

  // null while nothing is being cleared, 0-100 while the bar is on screen.
  const [clearProgress, setClearProgress] = useState<number | null>(null);
  // What the bar says while it runs and once it is done. Only one clear can be
  // in flight at a time, so a single pair covers both buttons.
  const [clearLabel, setClearLabel] = useState({ running: '', done: '' });
  const clearProgressTick = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearProgressHide = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Leaving the page mid-clear would otherwise leave both timers running against
  // a component that no longer exists.
  useEffect(
    () => () => {
      if (clearProgressTick.current) clearInterval(clearProgressTick.current);
      if (clearProgressHide.current) clearTimeout(clearProgressHide.current);
    },
    [],
  );

  /**
   * A clear destroys or withdraws figures that are kept nowhere else, so it
   * should not feel like a button that does nothing. The bar is deliberately
   * unhurried: it creeps up while the request is in flight, easing off so it
   * never reaches the end on its own, and a fast answer is still held for
   * MIN_VISIBLE_MS before it completes. What the user reads is "this took some
   * doing", which is the truth of what just happened to their data.
   *
   * Both clears run this way, so the choreography lives here once and each
   * caller supplies only the endpoint and the words.
   */
  const runClear = async (options: {
    url: string;
    setBusy: (busy: boolean) => void;
    closeDialog: () => void;
    running: string;
    done: string;
    successFallback: string;
    errorFallback: string;
  }) => {
    if (!id) return;

    const MIN_VISIBLE_MS = 2600;
    const startedAt = Date.now();

    options.setBusy(true);
    // The dialog goes first, so the bar it would otherwise dim is in plain view.
    options.closeDialog();
    setClearLabel({ running: options.running, done: options.done });
    setClearProgress(4);

    if (clearProgressHide.current) clearTimeout(clearProgressHide.current);
    if (clearProgressTick.current) clearInterval(clearProgressTick.current);

    clearProgressTick.current = setInterval(() => {
      setClearProgress((current) => {
        const value = current ?? 0;
        if (value >= 92) return value;
        // Each step covers a twelfth of what is left, so it slows as it goes.
        return Math.min(92, value + Math.max(1, (92 - value) / 12));
      });
    }, 320);

    try {
      const response = await httpService.post(options.url, {
        branch_id: id,
      });

      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_VISIBLE_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_VISIBLE_MS - elapsed),
        );
      }

      toast.success(response?.data?.message || options.successFallback);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          options.errorFallback,
      );
    } finally {
      if (clearProgressTick.current) {
        clearInterval(clearProgressTick.current);
        clearProgressTick.current = null;
      }

      setClearProgress(100);
      options.setBusy(false);

      // Long enough for the bar to visibly reach the end before it disappears.
      clearProgressHide.current = setTimeout(() => setClearProgress(null), 700);
    }
  };

  const handleClearOpening = () => {
    if (clearingOpening || clearingTransactions) return;

    return runClear({
      url: API_BRANCH_CLEAR_OPENING_URL,
      setBusy: setClearingOpening,
      closeDialog: () => setConfirmClearOpening(false),
      running: 'Clearing opening balances...',
      done: 'Opening cleared',
      successFallback: 'Opening cleared',
      errorFallback: 'Could not clear the opening',
    });
  };

  const handleClearTransactions = () => {
    if (clearingOpening || clearingTransactions) return;

    return runClear({
      url: API_BRANCH_CLEAR_TRANSACTION_URL,
      setBusy: setClearingTransactions,
      closeDialog: () => setConfirmClearTransactions(false),
      running: 'Clearing transactions...',
      done: 'Transactions cleared',
      successFallback: 'Transactions cleared',
      errorFallback: 'Could not clear the transactions',
    });
  };

  useEffect(() => {
    if (id) {
      dispatch(editBranch(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (
      settings?.branchSettings?.branchType?.length &&
      settings?.branchSettings?.businessType?.length &&
      settings?.branchSettings?.paperSize?.length
    ) {
      return;
    }

    dispatch(getBranchSettings(undefined) as any);
  }, [
    dispatch,
    settings?.branchSettings?.branchType?.length,
    settings?.branchSettings?.businessType?.length,
    settings?.branchSettings?.paperSize?.length,
  ]);

  useEffect(() => {
    const branch = branchEditData?.editData?.branch;
    if (branch) {
      const b = branch;

      setFormData(prev => ({
        ...prev,
        ...b,
        pad_heading_print: b.pad_heading_print != null ? String(b.pad_heading_print) : '',
        pad_print_mode: metaTextOr(b.pad_print_mode, 'software'),
        preprinted_pad_height: metaNumberOr(b.preprinted_pad_height, defaultPreprintedPadHeight),
        paper_size: b.paper_size != null ? String(b.paper_size) : '',
        device_identifier_text:
          b.device_identifier_text == null ||
          b.device_identifier_text === '' ||
          b.device_identifier_text === 0 ||
          b.device_identifier_text === '0'
            ? ''
            : String(b.device_identifier_text),
        dashboard_top_sales_days: b.dashboard_top_sales_days != null ? b.dashboard_top_sales_days : 0,

        // 🔑 CHECKBOX FIX
        is_opening: toBooleanFlag(b.is_opening),
        have_is_guaranter: toBooleanFlag(b.have_is_guaranter),
        have_customer_nominee: toBooleanFlag(b.have_customer_nominee),
        report_zero_bal: toBooleanFlag(b.report_zero_bal),
        manufactur_control: toBooleanFlag(b.manufactur_control),
        warranty_controll: toBooleanFlag(b.warranty_controll),
        have_warehouse: toBooleanFlag(b.have_warehouse),
        share_product_with_other_branch: toBooleanFlag(b.share_product_with_other_branch),
        share_customer_with_other_branch: toBooleanFlag(b.share_customer_with_other_branch),
        have_customer_sl: toBooleanFlag(b.have_customer_sl),
        stock_report_type: toBooleanFlag(b.stock_report_type),
        use_bangla: toBooleanFlag(b.use_bangla),
        show_instalment_list: toBooleanFlag(b.show_instalment_list),
        show_spelling_of_money: toBooleanFlag(b.show_spelling_of_money),
        need_demo_tutorial: toBooleanFlag(b.need_demo_tutorial),
        need_customer_contact_person: toBooleanFlag(b.need_customer_contact_person),
        due_list_with_address: toBooleanFlag(b.due_list_with_address),
        need_relation_info: toBooleanFlag(b.need_relation_info),
        need_customer_mother_name: toBooleanFlag(b.need_customer_mother_name),
        need_customer_sex: toBooleanFlag(b.need_customer_sex),
        salutation_male: b.salutation_male ? String(b.salutation_male) : '',
        salutation_female: b.salutation_female ? String(b.salutation_female) : '',
        salutation_other: b.salutation_other ? String(b.salutation_other) : '',
        letter_signature: b.letter_signature
          ? String(b.letter_signature)
          : defaultSignatureBlock(settings?.data?.company?.name || ''),
        need_customer_date_of_birth: toBooleanFlag(b.need_customer_date_of_birth),
        need_customer_occupation: toBooleanFlag(b.need_customer_occupation),
        need_customer_permanent_address: toBooleanFlag(b.need_customer_permanent_address),
        need_customer_photo: toBooleanFlag(b.need_customer_photo),
        need_nominee_photo: toBooleanFlag(b.need_nominee_photo),
        need_customer_area: toBooleanFlag(b.need_customer_area),
        show_voucher_image: toBooleanFlag(b.show_voucher_image),
        multi_product_order: toBooleanFlag(b.multi_product_order),
        down_payment_percent: metaNumberOr(b.down_payment_percent, defaultDownPaymentPercent),
        down_payment_base: metaTextOr(b.down_payment_base, defaultDownPaymentBase),
        delay_charge_percent: metaNumberOr(b.delay_charge_percent, defaultDelayChargePercent),
        letter_ref_prefix: metaTextOr(b.letter_ref_prefix, ''),
        // Held as YYYY-MM-DD whatever the picker shows, so a stored value that
        // came with a time on it is cut back to the day.
        letter_ref_date: metaTextOr(b.letter_ref_date, '').slice(0, 10),
        registration_alert: toBooleanFlag(b.registration_alert),
        registration_alert_sms: toBooleanFlag(b.registration_alert_sms),
        registration_alert_mobile: metaTextOr(b.registration_alert_mobile, ''),
        sms_service: toBooleanFlag(b.sms_service),
        received_sms: toBooleanFlag(b.received_sms),
        purchase_sms: toBooleanFlag(b.purchase_sms),
        sales_sms: toBooleanFlag(b.sales_sms),
        payment_sms: toBooleanFlag(b.payment_sms),
        pad_header_image: b.pad_header_image || b.pad_heading_image || b.letterhead_image || b.pad_image || b.header_image || '',
        show_brand_in_invoice: toBooleanFlag(b.show_brand_in_invoice),
        show_category_in_invoice: toBooleanFlag(b.show_category_in_invoice),
        show_description_in_invoice: toBooleanFlag(b.show_description_in_invoice),
        combined_invoice_note: toBooleanFlag(b.combined_invoice_note),
      }));

      setPadHeaderFile(null);
      setPadHeaderPreview(
        resolveImageUrl(
          b.pad_header_image ||
          b.pad_heading_image ||
          b.letterhead_image ||
          b.pad_image ||
          b.header_image ||
          '',
        ),
      );
    }
  }, [branchEditData?.editData?.branch]);

  const [formData, setFormData] = useState<branchItem>(initialBranch);

  // Stationery that already carries the letterhead: nothing here draws one, so
  // the heading choice and its image have nothing to say.
  const usesPreprintedPad = formData?.pad_print_mode === 'preprinted';

  // Both conditions, not either: the permission says who may clear an opening,
  // and "Opening ongoing?" says the branch is still in the period where an
  // opening is being entered. Once that is switched off the figures have been
  // settled and traded against, so wiping them is no longer a correction.
  const showClearOpening = canClearOpening && Boolean(formData.is_opening);

  // Gated on the same two conditions as Clear Opening. Withdrawing every
  // voucher a branch holds belongs to the period where its books are still
  // being set up; once "Opening ongoing?" is switched off the branch is trading
  // for real and a wholesale clear is no longer a correction.
  const showClearTransactions = canClearTransactions && Boolean(formData.is_opening);

  // One bar serves both buttons, and it spins while either is working.
  const clearInFlight = clearingOpening || clearingTransactions;

  useEffect(() => {
    return () => {
      if (padHeaderPreview.startsWith('blob:')) {
        URL.revokeObjectURL(padHeaderPreview);
      }
    };
  }, [padHeaderPreview]);

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target;

    // If the input is a checkbox, use the 'checked' property, otherwise use 'value'
    const inputValue = type === 'checkbox' ? checked : value;

    // Update formData with the new value
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: inputValue,
    }));
  };

  /**
   * For the rates and measurements: what lands in state is the number, not the
   * text the box holds. A number input reports an empty string both for a
   * cleared box and for a half-typed decimal, and that empty is kept as it is
   * -- rounding it to 0 would swallow the keystroke and make "1.5" untypable.
   */
  const handleOnNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const parsed = Number(value);

    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value === '' || !Number.isFinite(parsed) ? '' : parsed,
    }));
  };

  const handleOnSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  /**
   * The picker deals in dates, the meta in text. Cleared, it saves nothing —
   * which is what makes each letter offer the day it is issued.
   */
  const handleRefDateChange = (date: Date | null) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      letter_ref_date: toIsoDate(date),
    }));
  };

  const handleToggleFieldChange = (name: keyof branchItem, checked: boolean) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: checked,
    }));
  };

  const handlePadImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (padHeaderPreview.startsWith('blob:')) {
      URL.revokeObjectURL(padHeaderPreview);
    }

    setPadHeaderFile(file);

    if (!file) {
      setPadHeaderPreview(resolveImageUrl(formData.pad_header_image));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPadHeaderPreview(previewUrl);
  };

  const handleBranchUpdate = () => {
    setButtonLoading(true);
    dispatch(
      updateBranch(buildBranchFormData(formData, padHeaderFile), (res: any) => {
        setButtonLoading(false);
        if (res?.success) {
          toast.success(res?.message || 'Branch updated successfully');
          // Several of these switches (multi-product orders, voucher image, …)
          // are read from the session settings, which are otherwise only loaded
          // at login. Refetch them so a saved switch takes effect at once
          // instead of after the next sign-in.
          dispatch(getSettings(undefined) as any);
          navigate('/branch/branch-list');
          return;
        }

        toast.info(res?.error?.message || res?.message || 'Failed to update branch');
      })
    );
  };

  const handleBranchSave = () => {
    setButtonLoading(true);
    dispatch(
      storeBranch(buildBranchFormData(formData, padHeaderFile), (res: any) => {
        setButtonLoading(false);
        if (res?.success) {
          toast.success(res?.message || 'Branch saved successfully');
          setFormData(initialBranch);
          setPadHeaderFile(null);
          setPadHeaderPreview('');
          return;
        }
        toast.info(res?.error?.message || res?.message || 'Failed to save branch');
      })
    );
  };

  const goToNextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };
  return (
    <>
      <HelmetTitle title={formData?.id ? 'Edit Branch' : 'Add New Branch'} />

      {/* Pinned to the top of the window rather than to the form, so it stays in
          view wherever the page happens to be scrolled. Above the modal layer,
          because the dialog is still fading out as the bar starts moving. */}
      {clearProgress !== null && (
        <div
          className="fixed inset-x-0 top-0 z-999999 h-1 bg-danger/20"
          role="progressbar"
          aria-label="Clearing opening balances"
          aria-valuenow={Math.round(clearProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-danger transition-all duration-500 ease-out"
            style={{ width: `${clearProgress}%` }}
          />
        </div>
      )}
      <>
        {branchEditData.isLoading == true ? <Loader /> : ''}

        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            {/* Step rail: a scrollable strip on phones, a sticky column from md up. */}
            <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:sticky md:top-24 md:flex-col md:self-start md:overflow-visible md:px-0 md:pb-0">
              {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;

                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setCurrentStep(index)}
                    className={`flex w-52 shrink-0 items-center gap-3 rounded border px-3 py-2.5 text-left transition md:w-full ${isActive
                      ? 'border-blue-600 bg-blue-50 text-gray-900 dark:bg-blue-500/10 dark:text-white'
                      : isCompleted
                        ? 'border-green-500 text-green-700 dark:text-green-400'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:bg-transparent dark:text-gray-300'
                      }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${isActive
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : isCompleted
                          ? 'border-green-500 text-green-600 dark:text-green-400'
                          : 'border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400'
                        }`}
                    >
                      {isCompleted ? <FiCheck /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-70">
                        Step {index + 1}
                      </span>
                      <span className="block text-sm font-medium leading-tight">{step}</span>
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Viewport-tall column so the action bar lands in the same spot on
                every step, however short that step's content is. */}
            <div className="flex min-h-[calc(100vh-7rem)] min-w-0 flex-col">
              <div className="mb-4 rounded border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-transparent">
              {/* Ruled off, so the step's own heading reads apart from the
                  fields under it rather than as the first line of them. */}
              <div className="mb-3 border-b border-gray-200 pb-1.5 dark:border-strokedark">
                <h2 className="text-base font-semibold leading-tight text-gray-800 dark:text-white">
                  {steps[currentStep]}
                </h2>
                <p className="mt-0.5 text-xs leading-snug text-gray-500">
                  {currentStep === stepIndex('Basic Info') && 'Branch identity, contact details, and status.'}
                  {currentStep === stepIndex('Print Setup') && 'Print preferences, page size, and letterhead setup.'}
                  {currentStep === stepIndex('Invoice Setup') && 'Invoice labels, notes, formatting, and invoice display options.'}
                  {currentStep === stepIndex('Customer Setup') && 'Customer and supplier related options for this branch.'}
                  {currentStep === stepIndex('Product Setup') && 'How products are ordered and priced in this branch.'}
                  {currentStep === stepIndex('Real Estate Setup') && 'Real estate options for this branch.'}
                  {currentStep === stepIndex('Feature Controls') && 'Operational controls, sharing options, and SMS preferences.'}
                  {currentStep === SAAS_STEP &&
                    'Platform settings. Only this account sees them.'}
                </p>
              </div>

              {currentStep === stepIndex('Basic Info') && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <InputElement
                      id="name"
                      value={formData.name || ''}
                      name="name"
                      placeholder={'Enter Branch Name'}
                      label={'Enter Branch Name'}
                      description="How the branch is named everywhere it is listed, and on its printed papers."
                      className={''}
                      onChange={handleOnChange}
                    />
                    <DropdownCommon
                      id="branch_types_id"
                      name={'branch_types_id'}
                      label="Select Branch Type"
                      description="Head office or an ordinary branch. The head office sees company-wide figures and lists the others do not."
                      onChange={handleOnSelectChange}
                      value={formData?.branch_types_id || ''}
                      className="h-[2.1rem] bg-transparent"
                      data={settings?.branchSettings?.branchType}
                    />
                    <DropdownCommon
                      id="business_type_id"
                      name={'business_type_id'}
                      label="Select Business Type"
                      description="The trade the branch is in. It decides which dashboard the branch opens on."
                      onChange={handleOnSelectChange}
                      value={formData?.business_type_id || ''}
                      className="h-[2.1rem] bg-transparent"
                      data={settings?.branchSettings?.businessType}
                    />
                    <DropdownCommon
                      id="inventory_system_id"
                      name={'inventory_system_id'}
                      label="Select Inventory System"
                      description="Which purchase and sales screens the branch works with -- electronics, construction or trading."
                      onChange={handleOnSelectChange}
                      value={formData?.inventory_system_id || ''}
                      className="h-[2.1rem] bg-transparent"
                      data={settings?.branchSettings?.inventorySystem}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <InputElement
                      id="email"
                      value={formData.email || ''}
                      name="email"
                      placeholder={'Enter Branch Email'}
                      label={'Enter Branch Email'}
                      description="The branch's own address, printed on its papers so customers can write back."
                      className={''}
                      onChange={handleOnChange}
                    />
                    <InputElement
                      id="phone"
                      value={formData.phone || ''}
                      name="phone"
                      placeholder={'Enter Branch Phone'}
                      label={'Enter Branch Phone'}
                      description="The number printed on invoices and letters from this branch."
                      className={''}
                      onChange={handleOnChange}
                    />
                    <InputElement
                      id="contact_person"
                      value={formData.contact_person || ''}
                      name="contact_person"
                      placeholder={'Enter Contact Person'}
                      label={'Enter Contact Person'}
                      description="Who to ask for at this branch -- the manager or whoever answers for it."
                      className={''}
                      onChange={handleOnChange}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <InputElement
                      id="address"
                      value={formData.address || ''}
                      name="address"
                      placeholder={'Enter Branch Address'}
                      label={'Enter Branch Address'}
                      description="Where the branch sits. It goes under the heading on its printed papers."
                      className={''}
                      onChange={handleOnChange}
                    />
                    <InputElement
                      id="notes"
                      value={formData.notes || ''}
                      name="notes"
                      placeholder={'Enter notes'}
                      label={'Enter notes'}
                      description="For the office's own remarks about this branch. Nothing here is printed."
                      className={''}
                      onChange={handleOnChange}
                    />
                    <DropdownCommon
                      id="status"
                      name={'status'}
                      label="Select Status"
                      description="An inactive branch stays on record with all its figures, but nobody can work in it."
                      onChange={handleOnSelectChange}
                      className="h-[2.1rem] bg-transparent"
                      value={formData?.status?.toString() ?? ''}
                      data={status}
                    />
                  </div>
                </>
              )}

              {currentStep === stepIndex('Print Setup') && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <DropdownCommon
                      id="pad_heading_print"
                      name={'pad_heading_print'}
                      label="Select Print Heading"
                      description="Whose letterhead the software draws at the top -- this branch's, the company's, or an uploaded image."
                      onChange={handleOnSelectChange}
                      value={formData?.pad_heading_print || ''}
                      className="h-[2.1rem] bg-transparent"
                      data={printPadHeading}
                    />
                    <DropdownCommon
                      id="print_size"
                      name={'print_size'}
                      label="Select Printer Settings"
                      description="A normal printer prints a full page; a POS printer prints the narrow roll used at a counter."
                      onChange={handleOnSelectChange}
                      className="h-[2.1rem] bg-transparent"
                      value={formData?.print_size || ''}
                      data={printerSettings}
                    />
                    <DropdownCommon
                      id="paper_size"
                      name={'paper_size'}
                      label="Invoice Page Size"
                      description="The paper an invoice is laid out for, so it fills the sheet the branch actually prints on."
                      onChange={handleOnSelectChange}
                      className="h-[2.1rem] bg-transparent"
                      value={formData?.paper_size || ''}
                      data={paperSizeOptions}
                    />
                  </div>

                  {/* ---------- Pad Head ---------- */}
                  <h4 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Pad Head
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <div>
                      <DropdownCommon
                        id="pad_print_mode"
                        name={'pad_print_mode'}
                        label="Pad Head Printing"
                        onChange={handleOnSelectChange}
                        value={formData?.pad_print_mode || ''}
                        className="h-[2.1rem] bg-transparent"
                        data={padPrintModes}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Software generated draws the heading chosen above.
                        Pre-printed draws none, for paper that comes from the
                        press with the letterhead already on it.
                      </p>
                    </div>
                    {/* Always on show, so the paper can be measured before the
                        branch switches over -- it just has nothing to do while
                        the software draws the heading itself. */}
                    <div>
                      <InputElement
                        id="preprinted_pad_height"
                        value={formData.preprinted_pad_height ?? ''}
                        name="preprinted_pad_height"
                        type="number"
                        min={0}
                        max={600}
                        step="1"
                        placeholder={'Enter Blank Space (px)'}
                        label={'Blank Space at Top (px)'}
                        className={''}
                        onChange={handleOnNumberChange}
                        disabled={!usesPreprintedPad}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {usesPreprintedPad
                          ? 'How deep the printed pad head is, so nothing prints on top of it. 96 px is about an inch of paper.'
                          : 'Used only when Pre-printed Pad is chosen.'}
                      </p>
                    </div>
                  </div>

                  {Number(formData?.pad_heading_print) === 3 && !usesPreprintedPad && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                      <div className="flex flex-col">
                        <label
                          htmlFor="pad_header_image"
                          className="text-black dark:text-white"
                        >
                          Pad Header Image
                        </label>
                        <input
                          id="pad_header_image"
                          name="pad_header_image"
                          type="file"
                          accept="image/*"
                          onChange={handlePadImageChange}
                          className="form-input px-3 py-1 text-gray-600 outline-none border rounded-xs bg-white dark:bg-transparent dark:border-gray-600 dark:text-white"
                        />
                        <span className="mt-1 text-xs text-gray-500">
                          This image will print when `Custom Image Pad` is selected.
                        </span>
                      </div>
                      <div className="md:col-span-2">
                        {padHeaderPreview ? (
                          <div className="rounded border border-gray-300 p-2">
                            <img
                              src={padHeaderPreview}
                              alt="Pad header preview"
                              className="max-h-28 w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="flex h-full min-h-28 items-center justify-center rounded border border-dashed border-gray-300 text-sm text-gray-500">
                            No image selected
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Letter greetings, picked by the customer's sex when a
                      document is printed. Blank falls back to the wording
                      built into the software. */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <InputElement
                      id="salutation_male"
                      name="salutation_male"
                      value={formData.salutation_male || ''}
                      placeholder={'Dear Sir,'}
                      label={'Salutation (Male)'}
                      description="How a letter greets a male customer. Left blank, the software's own wording is used."
                      className={''}
                      onChange={handleOnChange}
                    />
                    <InputElement
                      id="salutation_female"
                      name="salutation_female"
                      value={formData.salutation_female || ''}
                      placeholder={'Dear Madam,'}
                      label={'Salutation (Female)'}
                      description="How a letter greets a female customer. Left blank, the software's own wording is used."
                      className={''}
                      onChange={handleOnChange}
                    />
                    <InputElement
                      id="salutation_other"
                      name="salutation_other"
                      value={formData.salutation_other || ''}
                      placeholder={'Dear Sir/Madam,'}
                      label={'Salutation (Other / Not Set)'}
                      description="Used when the customer's sex is not recorded, so a letter never goes out addressed wrongly."
                      className={''}
                      onChange={handleOnChange}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="text-black dark:text-white">
                      Letter Signature Block
                    </label>
                    <RichTextEditor
                      value={formData.letter_signature || ''}
                      placeholder="Authorized Signatory and Company Seal"
                      onChange={(html) =>
                        setFormData((prev) => ({ ...prev, letter_signature: html }))
                      }
                    />
                    <span className="mt-1 block text-xs text-gray-500">
                      Prints at the foot of the allotment letter. Leave it empty and
                      the letter signs off with the company name. The table button
                      lays three signatories across the page; each row is a line,
                      so add a row for the name under a signature, and add or drop
                      a column to sign with more or fewer than three.
                    </span>
                  </div>

                </>
              )}

              {currentStep === stepIndex('Invoice Setup') && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <InputElement
                      id="purchase_note"
                      value={formData.purchase_note || ''}
                      name="purchase_note"
                      placeholder={'Purchase Invoice Note'}
                      label={'Purchase Invoice Note'}
                      description="Standing wording printed at the foot of every purchase invoice -- terms, conditions, whatever the branch always says."
                      className={''}
                      onChange={handleOnChange}
                    />
                    <InputElement
                      id="sales_note"
                      value={formData.sales_note || ''}
                      name="sales_note"
                      placeholder={'Sales Invoice Note'}
                      label={'Sales Invoice Note'}
                      description="The same, printed at the foot of every sales invoice."
                      className={''}
                      onChange={handleOnChange}
                    />
                    <DropdownCommon
                      id="money_format"
                      name={'money_format'}
                      label="Select Money Format"
                      description="Where the word Taka sits when the amount is written out -- before the words, after them, or wrapped in Only."
                      onChange={handleOnSelectChange}
                      className="h-[2.1rem] bg-transparent"
                      value={formData?.money_format || ''}
                      data={moneySpellFormat}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <InputElement
                      id="invoice_label"
                      value={formData.invoice_label || ''}
                      name="invoice_label"
                      placeholder={'Enter Invoice Label'}
                      label={'Enter Invoice Label'}
                      description="What the paper calls itself at the top -- Invoice, Cash Memo, Bill, whatever the branch issues."
                      className={''}
                      onChange={handleOnChange}
                    />
                    <InputElement
                      id="device_identifier_text"
                      value={formData.device_identifier_text || ''}
                      name="device_identifier_text"
                      placeholder={'Device Identifier Text'}
                      label={'Device Identifier Text'}
                      description="The word printed before a serial number on the invoice, such as IMEI or Engine No. Left blank, the number stands alone."
                      className={''}
                      onChange={handleOnChange}
                    />
                    <InputElement
                      id="decimal_places"
                      value={formData.decimal_places || 0}
                      name="decimal_places"
                      placeholder={'Enter Decimal Places'}
                      label={'Decimal Places'}
                      description="How many digits after the point every amount is shown with. 0 rounds to whole Taka."
                      className={''}
                      onChange={handleOnChange}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <InputElement
                      id="dashboard_top_sales_days"
                      value={formData.dashboard_top_sales_days || ''}
                      name="dashboard_top_sales_days"
                      placeholder={'Dashboard Top Sales Days'}
                      label={'Dashboard Top Sales Days'}
                      description="How many days back the dashboard's top-selling list counts. 1 means today alone; left empty it looks back 7 days."
                      className={''}
                      onChange={handleOnChange}
                    />
                    
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <FormToggleField
                      label="Show spelling of money in invoice?"
                      description="Prints the invoice total in words beneath the figure."
                      checked={Boolean(formData.show_spelling_of_money)}
                      onChange={(checked) =>
                        handleToggleFieldChange('show_spelling_of_money', checked)
                      }
                    />
                    <FormToggleField
                      label="Show Instalment List in Invoice"
                      description="Prints the instalment schedule, with its dates and amounts, on an instalment sale."
                      checked={Boolean(formData.show_instalment_list)}
                      onChange={(checked) =>
                        handleToggleFieldChange('show_instalment_list', checked)
                      }
                    />
                    <FormToggleField
                      label="Show description in invoice?"
                      description="Prints each item's description line under its name."
                      checked={Boolean(formData.show_description_in_invoice)}
                      onChange={(checked) =>
                        handleToggleFieldChange('show_description_in_invoice', checked)
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <FormToggleField
                      label="Show Brand in Invoice?"
                      description="Prints the brand of each item beside its name."
                      checked={Boolean(formData.show_brand_in_invoice)}
                      onChange={(checked) =>
                        handleToggleFieldChange('show_brand_in_invoice', checked)
                      }
                    />
                    <FormToggleField
                      label="Show Category in Invoice?"
                      description="Prints the category of each item beside its name."
                      checked={Boolean(formData.show_category_in_invoice)}
                      onChange={(checked) =>
                        handleToggleFieldChange('show_category_in_invoice', checked)
                      }
                    />
                    <FormToggleField
                      label="Show combined invoice note?"
                      description="Offers a note box on the combined trading entry, so one remark covers the whole invoice."
                      checked={Boolean(formData.combined_invoice_note)}
                      onChange={(checked) =>
                        handleToggleFieldChange('combined_invoice_note', checked)
                      }
                    />
                  </div>
                </>
              )}

              {currentStep === stepIndex('Customer Setup') && (
                <>
                  {/* ---------- Customer ---------- */}
                  <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Customer
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    {/* The "Need ..." switches all do the same thing: each one
                        puts its field on the Add and Edit Customer forms. Said
                        once here would be missed, so each says it for itself. */}
                    <FormToggleField
                      label="Use Customer Serial?"
                      description="Gives every customer a serial number of its own on the customer form."
                      checked={Boolean(formData.have_customer_sl)}
                      onChange={(checked) => handleToggleFieldChange('have_customer_sl', checked)}
                    />
                    <FormToggleField
                      label="Need Customer Area?"
                      description="Adds the area field to the customer form, so customers can be grouped by locality."
                      checked={Boolean(formData.need_customer_area)}
                      onChange={(checked) => handleToggleFieldChange('need_customer_area', checked)}
                    />
                    <FormToggleField
                      label="Customer Share with Other branch?"
                      description="Customers entered anywhere in the company can be picked here. Off, this branch sees only its own."
                      checked={Boolean(formData.share_customer_with_other_branch)}
                      onChange={(checked) =>
                        handleToggleFieldChange('share_customer_with_other_branch', checked)
                      }
                    />
                    <FormToggleField
                      label="Need Relation's Information?"
                      description="Adds the father's/husband's name and relation fields to the customer form."
                      checked={Boolean(formData.need_relation_info)}
                      onChange={(checked) => handleToggleFieldChange('need_relation_info', checked)}
                    />
                    <FormToggleField
                      label="Need Customer Mother's Name?"
                      description="Adds the mother's name field to the customer form."
                      checked={Boolean(formData.need_customer_mother_name)}
                      onChange={(checked) => handleToggleFieldChange('need_customer_mother_name', checked)}
                    />
                    <FormToggleField
                      label="Need Customer Sex?"
                      description="Adds the sex field, which also decides which salutation a letter uses for the customer."
                      checked={Boolean(formData.need_customer_sex)}
                      onChange={(checked) => handleToggleFieldChange('need_customer_sex', checked)}
                    />
                    <FormToggleField
                      label="Need Customer Contact Person?"
                      description="Adds a contact person and their number, for customers reached through someone else."
                      checked={Boolean(formData.need_customer_contact_person)}
                      onChange={(checked) => handleToggleFieldChange('need_customer_contact_person', checked)}
                    />
                    <FormToggleField
                      label="Need Customer Date of Birth?"
                      description="Adds the date of birth field to the customer form."
                      checked={Boolean(formData.need_customer_date_of_birth)}
                      onChange={(checked) => handleToggleFieldChange('need_customer_date_of_birth', checked)}
                    />
                    <FormToggleField
                      label="Need Customer Occupation?"
                      description="Adds the occupation field to the customer form."
                      checked={Boolean(formData.need_customer_occupation)}
                      onChange={(checked) => handleToggleFieldChange('need_customer_occupation', checked)}
                    />
                    <FormToggleField
                      label="Need Customer Permanent Address?"
                      description="Adds a permanent address alongside the present one, as deeds and letters usually want both."
                      checked={Boolean(formData.need_customer_permanent_address)}
                      onChange={(checked) => handleToggleFieldChange('need_customer_permanent_address', checked)}
                    />
                    <FormToggleField
                      label="Need Customer Photo?"
                      description="Adds the photo upload to the customer form."
                      checked={Boolean(formData.need_customer_photo)}
                      onChange={(checked) => handleToggleFieldChange('need_customer_photo', checked)}
                    />
                    <FormToggleField
                      label="Use Bangla?"
                      description="Adds Bangla name fields beside the English ones, for papers that have to carry both."
                      checked={Boolean(formData.use_bangla)}
                      onChange={(checked) => handleToggleFieldChange('use_bangla', checked)}
                    />
                  </div>

                  {/* ---------- Nominee & Guarantor ---------- */}
                  <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-700">
                    <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Nominee &amp; Guarantor
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                      <FormToggleField
                        label="Use Customer Nominee?"
                        description="Opens the nominee section on the customer form -- who inherits the customer's claim."
                        checked={Boolean(formData.have_customer_nominee)}
                        onChange={(checked) => handleToggleFieldChange('have_customer_nominee', checked)}
                      />
                      <FormToggleField
                        label="Need Nominee Photo?"
                        description="Asks for the nominee's photograph as well as their particulars."
                        checked={Boolean(formData.need_nominee_photo)}
                        onChange={(checked) => handleToggleFieldChange('need_nominee_photo', checked)}
                      />
                      <FormToggleField
                        label="Use Guarantor?"
                        description="Opens the guarantor section on the customer form -- who stands behind the customer's dues."
                        checked={Boolean(formData.have_is_guaranter)}
                        onChange={(checked) => handleToggleFieldChange('have_is_guaranter', checked)}
                      />
                    </div>
                  </div>
                </>
              )}

              {currentStep === stepIndex('Product Setup') && (
                <>
                  {/* ---------- Order ---------- */}
                  <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Order
                  </h4>
                  {/* Each note sits in its own column, directly under the control
                      it explains -- never spilling under a neighbouring field. */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <div>
                      <FormToggleField
                        label="Multi Product Order?"
                        checked={Boolean(formData.multi_product_order)}
                        onChange={(checked) =>
                          handleToggleFieldChange('multi_product_order', checked)
                        }
                        className=""
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <strong>On:</strong> one order can carry several products.
                        <br/>
                        <strong>Off:</strong> the original single-product order form.
                      </p>
                    </div>
                  </div>

                  {/* ---------- Stock ---------- */}
                  <h4 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Stock
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <FormToggleField
                      label="Stock With Zero?"
                      description="Keeps items with no balance on the stock report, so what has run out is still visible."
                      checked={Boolean(formData.report_zero_bal)}
                      onChange={(checked) => handleToggleFieldChange('report_zero_bal', checked)}
                    />
                    <FormToggleField
                      label="Stock: Brand->Category->Item"
                      description="Groups the stock report by brand, then category, then item, instead of listing items straight."
                      checked={Boolean(formData.stock_report_type)}
                      onChange={(checked) => handleToggleFieldChange('stock_report_type', checked)}
                    />
                    <FormToggleField
                      label="Warranty Control?"
                      description="Products carry a warranty period, asked for when the product is set up and tracked from the sale."
                      checked={Boolean(formData.warranty_controll)}
                      onChange={(checked) => handleToggleFieldChange('warranty_controll', checked)}
                    />
                    <FormToggleField
                      label="Product Share?"
                      description="Products entered anywhere in the company can be picked here. Off, this branch sees only its own."
                      checked={Boolean(formData.share_product_with_other_branch)}
                      onChange={(checked) =>
                        handleToggleFieldChange('share_product_with_other_branch', checked)
                      }
                    />
                  </div>
                </>
              )}

              {currentStep === stepIndex('Real Estate Setup') && (
                <>
                  {/* ---------- Allotment Letter ---------- */}
                  <h4 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Allotment Letter
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <div>
                      <DropdownCommon
                        id="down_payment_base"
                        name={'down_payment_base'}
                        label="Down Payment Calculated On"
                        onChange={handleOnSelectChange}
                        value={formData?.down_payment_base || ''}
                        className="h-[2.1rem] bg-transparent"
                        data={downPaymentBases}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        On the net payable balance the booking money is already
                        out, so it is not adjusted against the down payment again.
                      </p>
                    </div>
                    <div>
                      <InputElement
                        id="down_payment_percent"
                        value={formData.down_payment_percent ?? ''}
                        name="down_payment_percent"
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        placeholder={'Enter Down Payment (%)'}
                        label={'Down Payment (%)'}
                        className={''}
                        onChange={handleOnNumberChange}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        What the payment terms ask for when the sale itself
                        records no down payment.
                      </p>
                    </div>
                    
                    <div>
                      <InputElement
                        id="delay_charge_percent"
                        value={formData.delay_charge_percent ?? ''}
                        name="delay_charge_percent"
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        placeholder={'Enter Delay Charge (%)'}
                        label={'Delay Charge (% per annum)'}
                        className={''}
                        onChange={handleOnNumberChange}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        The yearly rate the letter states on an overdue amount,
                        charged for the actual number of days of delay.
                      </p>
                    </div>

                    <div>
                      <InputElement
                        id="letter_ref_prefix"
                        value={formData.letter_ref_prefix ?? ''}
                        name="letter_ref_prefix"
                        type="text"
                        placeholder={'e.g. BST/ALLOT'}
                        label={'Reference No Prefix'}
                        className={''}
                        onChange={handleOnChange}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Offered as written when a letter is issued — nothing is
                        added to it. Left blank, the letter falls back to the
                        project's initials. The clerk issuing a letter finishes
                        or replaces it against the register.
                      </p>
                    </div>

                    <div>
                      <InputDatePicker
                        id="letter_ref_date"
                        name="letter_ref_date"
                        label="Reference Date"
                        className="h-[2.1rem] w-full text-sm"
                        selectedDate={parseIsoDate(formData.letter_ref_date)}
                        setSelectedDate={handleRefDateChange}
                        setCurrentDate={handleRefDateChange}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        The date letters are dated with. Left blank, each letter
                        is offered the day it is issued — which is the safer of
                        the two, since a date set here stays until it is changed.
                      </p>
                    </div>
                  </div>

                </>
              )}

              {currentStep === stepIndex('Feature Controls') && (
                <>
                  {/* One grid, not four. Four of them each broke into rows of
                      their own, which left a toggle stranded on a row with two
                      empty cells beside it whenever a group did not divide by
                      three. Flowing them together fills every column in turn. */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <FormToggleField
                      label="Control Manufacture?"
                      description="Opens the production side, so an item can be built from other items instead of only bought and sold."
                      checked={Boolean(formData.manufactur_control)}
                      onChange={(checked) => handleToggleFieldChange('manufactur_control', checked)}
                    />
                    <FormToggleField
                      label="Multiple Warehouse?"
                      description="Vouchers say which warehouse stock moved in or out of. Off, everything sits in one."
                      checked={Boolean(formData.have_warehouse)}
                      onChange={(checked) => handleToggleFieldChange('have_warehouse', checked)}
                    />
                    <FormToggleField
                      label="Opening ongoing?"
                      description="The branch is still entering its opening figures, so products and parties can take an opening balance. Switch off once the books are settled."
                      checked={Boolean(formData.is_opening)}
                      onChange={(checked) => handleToggleFieldChange('is_opening', checked)}
                    />

                    {/* Sits in a grid cell of its own, so it lines up with the
                        toggles rather than interrupting their rhythm. Red,
                        because it destroys figures that are kept nowhere else. */}
                    {showClearOpening && (
                      <div className="flex items-center">
                        <ButtonLoading
                          type="button"
                          label="Clear Opening"
                          title="Set every opening balance in this branch back to zero"
                          icon={<FiRefreshCcw size={15} />}
                          buttonLoading={clearingOpening}
                          disabled={clearInFlight}
                          onClick={() => setConfirmClearOpening(true)}
                          className="h-8.5 whitespace-nowrap rounded bg-danger hover:bg-opacity-90"
                        />
                      </div>
                    )}

                    {/* Its own cell beside Clear Opening, and red for the same
                        reason: it takes every voucher the branch holds out of
                        the books in one stroke. */}
                    {showClearTransactions && (
                      <div className="flex items-center">
                        <ButtonLoading
                          type="button"
                          label="Transaction Clear"
                          title="Withdraw every voucher in this branch from the books"
                          icon={<FiRefreshCcw size={15} />}
                          buttonLoading={clearingTransactions}
                          disabled={clearInFlight}
                          onClick={() => setConfirmClearTransactions(true)}
                          className="h-8.5 whitespace-nowrap rounded bg-danger hover:bg-opacity-90"
                        />
                      </div>
                    )}

                    {/* The bar pinned to the top of the window is easy to miss
                        from down here, where the eye already is. This one spans
                        the row directly under the button that started the work,
                        and says what is being cleared while it runs. */}
                    {clearProgress !== null && (
                      <div className="col-span-1 md:col-span-3">
                        <div className="rounded border border-danger/30 bg-danger/5 px-3 py-2.5">
                          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-medium text-danger">
                            <span className="flex items-center gap-1.5">
                              <FiRefreshCcw
                                size={13}
                                className={clearInFlight ? 'animate-spin' : ''}
                              />
                              {clearInFlight ? clearLabel.running : clearLabel.done}
                            </span>
                            <span>{Math.round(clearProgress)}%</span>
                          </div>
                          <div
                            className="h-1.5 w-full overflow-hidden rounded-full bg-danger/20"
                            role="progressbar"
                            aria-label={clearLabel.running}
                            aria-valuenow={Math.round(clearProgress)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="h-full rounded-full bg-danger transition-all duration-500 ease-out"
                              style={{ width: `${clearProgress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <FormToggleField
                      label="Need Demo Tutorial?"
                      description="Offers the guided walkthrough to users of this branch. Turn off once the staff know their way around."
                      checked={Boolean(formData.need_demo_tutorial)}
                      onChange={(checked) =>
                        handleToggleFieldChange('need_demo_tutorial', checked)
                      }
                    />
                    <FormToggleField
                      label="Report Due List with Address?"
                      description="Prints each party's address and mobile beside the name on the Due List, so the sheet can be worked from in the field."
                      checked={Boolean(formData.due_list_with_address)}
                      onChange={(checked) =>
                        handleToggleFieldChange('due_list_with_address', checked)
                      }
                    />
                    <FormToggleField
                      label="Show Voucher Image?"
                      description="Shows the image attached to a voucher in the Cash Book, Sales Ledger and Purchase Ledger."
                      checked={Boolean(formData.show_voucher_image)}
                      onChange={(checked) =>
                        handleToggleFieldChange('show_voucher_image', checked)
                      }
                    />

                    {/* A fragment, so these stay children of the grid above and
                        flow on from the last toggle instead of starting a row. */}
                    {settings?.data?.user?.id === 1 && (
                      <>
                        <FormToggleField
                          label="SMS Service"
                          description="The master switch for this branch. Off, none of the messages below go out however they are set."
                          checked={Boolean(formData.sms_service)}
                          onChange={(checked) => handleToggleFieldChange('sms_service', checked)}
                        />
                        <FormToggleField
                          label="Received SMS"
                          description="Texts the party when money received from them is posted."
                          checked={Boolean(formData.received_sms)}
                          onChange={(checked) => handleToggleFieldChange('received_sms', checked)}
                        />
                        <FormToggleField
                          label="Sales SMS"
                          description="Texts the customer when a sale is invoiced to them."
                          checked={Boolean(formData.sales_sms)}
                          onChange={(checked) => handleToggleFieldChange('sales_sms', checked)}
                        />
                        <FormToggleField
                          label="Purchase SMS"
                          description="Texts the supplier when a purchase is posted against them."
                          checked={Boolean(formData.purchase_sms)}
                          onChange={(checked) => handleToggleFieldChange('purchase_sms', checked)}
                        />
                        <FormToggleField
                          label="Payment SMS"
                          description="Texts the party when money paid to them is posted."
                          checked={Boolean(formData.payment_sms)}
                          onChange={(checked) => handleToggleFieldChange('payment_sms', checked)}
                        />
                      </>
                    )}
                  </div>
                </>
              )}

              {/* SaaS Setup — the platform operator's own step. Guarded on the
                  index rather than a number, so it stays right if a step is
                  ever added above it. */}
              {SAAS_STEP >= 0 && currentStep === SAAS_STEP && (
                <>
                  <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    New Company Registration
                  </h4>
                  <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                    What happens when someone signs up for a new company. These
                    belong to the branch that runs the platform — setting them on
                    a customer's branch does nothing.
                  </p>

                  <div className="grid grid-cols-1 gap-2 mb-2 md:grid-cols-3">
                    <div>
                      <FormToggleField
                        label="Notify on registration?"
                        checked={Boolean(formData.registration_alert)}
                        onChange={(checked) =>
                          handleToggleFieldChange('registration_alert', checked)
                        }
                        className=""
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Puts a notice in this branch's bell, on the web and in the
                        app. Costs nothing and cannot fail.
                      </p>
                    </div>

                    <div>
                      <FormToggleField
                        label="Also send SMS?"
                        checked={Boolean(formData.registration_alert_sms)}
                        onChange={(checked) =>
                          handleToggleFieldChange('registration_alert_sms', checked)
                        }
                        className=""
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Reaches you without opening anything, and is charged per
                        message.
                      </p>
                    </div>

                    <div>
                      <InputElement
                        id="registration_alert_mobile"
                        value={formData.registration_alert_mobile ?? ''}
                        name="registration_alert_mobile"
                        type="text"
                        placeholder={'01712345678, 01911111111'}
                        label={'Alert Mobile Number(s)'}
                        className={''}
                        onChange={handleOnChange}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Separate several with commas. Left empty, no SMS is sent
                        however the switch is set.
                      </p>
                    </div>
                  </div>
                </>
              )}
              </div>

              {/* Kept within reach on the long steps, so Save needs no scrolling back. */}
              <div className="sticky bottom-0 z-20 mt-auto mb-2 rounded border border-gray-200 bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur dark:border-strokedark dark:bg-boxdark/95">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-1 whitespace-nowrap text-xs font-medium text-gray-500 dark:text-gray-400">
                      Step {currentStep + 1} of {steps.length}
                    </span>
                    <Link
                      to="/branch/branch-list"
                      className="inline-flex items-center whitespace-nowrap rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition hover:border-blue-400 hover:text-blue-500 dark:border-gray-600 dark:text-gray-300"
                    >
                      <FiArrowLeft className="mr-2" /> Back
                    </Link>
                    <ButtonLoading
                      onClick={() => {
                        if (padHeaderPreview.startsWith('blob:')) {
                          URL.revokeObjectURL(padHeaderPreview);
                        }
                        setFormData(initialBranch);
                        setPadHeaderFile(null);
                        setPadHeaderPreview('');
                        setCurrentStep(0);
                      }}
                      buttonLoading={buttonLoading}
                      label="Reset"
                      className="whitespace-nowrap rounded px-4 py-1.5"
                      icon={<FiRefreshCcw className="text-white text-base mr-2" />}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <ButtonLoading
                      onClick={goToPreviousStep}
                      buttonLoading={false}
                      disabled={currentStep === 0}
                      label="Previous"
                      className="whitespace-nowrap rounded px-4 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                      icon={<FiArrowLeft className="text-white text-base mr-2" />}
                    />
                    {currentStep < steps.length - 1 ? (
                      <ButtonLoading
                        onClick={goToNextStep}
                        buttonLoading={false}
                        label="Next"
                        className="whitespace-nowrap rounded !bg-blue-600 px-6 py-1.5 hover:!bg-blue-700"
                        icon={<FiArrowRight className="text-white text-base mr-2" />}
                      />
                    ) : branchEditData.editData?.branch ? (
                      <ButtonLoading
                        onClick={handleBranchUpdate}
                        buttonLoading={buttonLoading}
                        label="Update"
                        className="whitespace-nowrap rounded !bg-blue-600 px-6 py-1.5 hover:!bg-blue-700"
                        icon={<FiSave className="text-white text-base mr-2" />}
                      />
                    ) : (
                      <ButtonLoading
                        onClick={handleBranchSave}
                        buttonLoading={buttonLoading}
                        label="Save"
                        className="whitespace-nowrap rounded !bg-blue-600 px-6 py-1.5 hover:!bg-blue-700"
                        icon={<FiSave className="text-white text-base mr-2" />}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Named plainly, because the figures cannot be recovered from here --
              they have to be typed in again. What is left alone is said too, so
              nobody expects the accounts to move. */}
          <ConfirmModal
            show={confirmClearOpening}
            title="Clear Opening Balances"
            message={
              <>
                Set every opening balance in this branch back to zero?
                <span className="mt-2 block text-xs text-body dark:text-bodydark">
                  Products and customers/suppliers both. The figures are not kept
                  anywhere else, so they will have to be entered again.
                </span>
                <span className="mt-2 block text-xs text-body dark:text-bodydark">
                  The journal and stock entries already posted are left as they
                  are.
                </span>
              </>
            }
            confirmLabel="Clear Opening"
            className="bg-danger hover:bg-opacity-90"
            loading={clearingOpening}
            onCancel={() => setConfirmClearOpening(false)}
            onConfirm={handleClearOpening}
          />

          {/* Says plainly what survives: the vouchers are not erased, they stop
              counting. That is the difference between this and a deletion, and
              it is the thing somebody approving it needs to know. */}
          <ConfirmModal
            show={confirmClearTransactions}
            title="Clear Transactions"
            message={
              <>
                Withdraw every voucher in this branch from the books?
                <span className="mt-2 block text-xs text-body dark:text-bodydark">
                  Every voucher this branch holds is marked inactive at once, so
                  it stops showing in reports, ledgers and balances.
                </span>
                <span className="mt-2 block text-xs text-body dark:text-bodydark">
                  Nothing is deleted -- the entries stay on record -- but there
                  is no button here to bring them back.
                </span>
              </>
            }
            confirmLabel="Transaction Clear"
            className="bg-danger hover:bg-opacity-90"
            loading={clearingTransactions}
            onCancel={() => setConfirmClearTransactions(false)}
            onConfirm={handleClearTransactions}
          />
        </>
      </>
    </>
  );
};

export default AddBranch;

