import React, { useEffect, useState } from 'react';
import InputElement from '../../utils/fields/InputElement';
import RichTextEditor from '../../utils/fields/RichTextEditor';
import HelmetTitle from '../../utils/others/HelmetTitle';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import {
  moneySpellFormat,
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
import { getBranchSettings } from '../settings/settingsSlice';
import { toast } from 'react-toastify';
import { API_REMOTE_URL } from '../../services/apiRoutes';
import FormToggleField from '../../utils/utils-functions/FormToggleField';

const shouldStripPublicPrefix = /^(https?:\/\/)?(localhost|127\.0\.0\.1|cashbook_api\.test)(:\d+)?$/i.test(
  API_REMOTE_URL,
);

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

const AddBranch = () => {
  const steps = [
    'Basic Info',
    'Print Setup',
    'Invoice Setup',
    'Customer & Supplier Setup',
    'Feature Controls',
  ];
  const navigate = useNavigate();
  const branchEditData = useSelector((state: any) => state.branchList);
  const settings = useSelector((state: any) => state.settings);
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
    letter_signature: '',
    need_customer_date_of_birth: false,
    need_customer_occupation: false,
    need_customer_permanent_address: false,
    need_customer_photo: false,
    need_nominee_photo: false,
    need_customer_area: false,
    show_voucher_image: false,
  };
  const [buttonLoading, setButtonLoading] = useState(false);
  const [padHeaderFile, setPadHeaderFile] = useState<File | null>(null);
  const [padHeaderPreview, setPadHeaderPreview] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const dispatch = useDispatch();

  const { id } = useParams();




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
        letter_signature: b.letter_signature ? String(b.letter_signature) : '',
        need_customer_date_of_birth: toBooleanFlag(b.need_customer_date_of_birth),
        need_customer_occupation: toBooleanFlag(b.need_customer_occupation),
        need_customer_permanent_address: toBooleanFlag(b.need_customer_permanent_address),
        need_customer_photo: toBooleanFlag(b.need_customer_photo),
        need_nominee_photo: toBooleanFlag(b.need_nominee_photo),
        need_customer_area: toBooleanFlag(b.need_customer_area),
        show_voucher_image: toBooleanFlag(b.show_voucher_image),
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

  const handleOnSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
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
              <div className="mb-2">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {steps[currentStep]}
                </h2>
                <p className="text-sm text-gray-500">
                  {currentStep === 0 && 'Branch identity, contact details, and status.'}
                  {currentStep === 1 && 'Print preferences, page size, and letterhead setup.'}
                  {currentStep === 2 && 'Invoice labels, notes, formatting, and invoice display options.'}
                  {currentStep === 3 && 'Customer and supplier related options for this branch.'}
                  {currentStep === 4 && 'Operational controls, sharing options, and SMS preferences.'}
                </p>
              </div>

              {currentStep === 0 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <InputElement
                      id="name"
                      value={formData.name || ''}
                      name="name"
                      placeholder={'Enter Branch Name'}
                      label={'Enter Branch Name'}
                      className={''}
                      onChange={handleOnChange}
                    />
                    <DropdownCommon
                      id="branch_types_id"
                      name={'branch_types_id'}
                      label="Select Branch Type"
                      onChange={handleOnSelectChange}
                      value={formData?.branch_types_id || ''}
                      className="h-[2.1rem] bg-transparent"
                      data={settings?.branchSettings?.branchType}
                    />
                    <DropdownCommon
                      id="business_type_id"
                      name={'business_type_id'}
                      label="Select Business Type"
                      onChange={handleOnSelectChange}
                      value={formData?.business_type_id || ''}
                      className="h-[2.1rem] bg-transparent"
                      data={settings?.branchSettings?.businessType}
                    />
                    <DropdownCommon
                      id="inventory_system_id"
                      name={'inventory_system_id'}
                      label="Select Inventory System"
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
                      className={''}
                      onChange={handleOnChange}
                    />
                    <InputElement
                      id="phone"
                      value={formData.phone || ''}
                      name="phone"
                      placeholder={'Enter Branch Phone'}
                      label={'Enter Branch Phone'}
                      className={''}
                      onChange={handleOnChange}
                    />
                    <InputElement
                      id="contact_person"
                      value={formData.contact_person || ''}
                      name="contact_person"
                      placeholder={'Enter Contact Person'}
                      label={'Enter Contact Person'}
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
                      className={''}
                      onChange={handleOnChange}
                    />
                    <InputElement
                      id="notes"
                      value={formData.notes || ''}
                      name="notes"
                      placeholder={'Enter notes'}
                      label={'Enter notes'}
                      className={''}
                      onChange={handleOnChange}
                    />
                    <DropdownCommon
                      id="status"
                      name={'status'}
                      label="Select Status"
                      onChange={handleOnSelectChange}
                      className="h-[2.1rem] bg-transparent"
                      value={formData?.status?.toString() ?? ''}
                      data={status}
                    />
                  </div>
                </>
              )}

              {currentStep === 1 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <DropdownCommon
                      id="pad_heading_print"
                      name={'pad_heading_print'}
                      label="Select Print Heading"
                      onChange={handleOnSelectChange}
                      value={formData?.pad_heading_print || ''}
                      className="h-[2.1rem] bg-transparent"
                      data={printPadHeading}
                    />
                    <DropdownCommon
                      id="print_size"
                      name={'print_size'}
                      label="Select Printer Settings"
                      onChange={handleOnSelectChange}
                      className="h-[2.1rem] bg-transparent"
                      value={formData?.print_size || ''}
                      data={printerSettings}
                    />
                    <DropdownCommon
                      id="paper_size"
                      name={'paper_size'}
                      label="Invoice Page Size"
                      onChange={handleOnSelectChange}
                      className="h-[2.1rem] bg-transparent"
                      value={formData?.paper_size || ''}
                      data={paperSizeOptions}
                    />
                  </div>

                  {Number(formData?.pad_heading_print) === 3 && (
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
                      className={''}
                      onChange={handleOnChange}
                    />
                    <InputElement
                      id="salutation_female"
                      name="salutation_female"
                      value={formData.salutation_female || ''}
                      placeholder={'Dear Madam,'}
                      label={'Salutation (Female)'}
                      className={''}
                      onChange={handleOnChange}
                    />
                    <InputElement
                      id="salutation_other"
                      name="salutation_other"
                      value={formData.salutation_other || ''}
                      placeholder={'Dear Sir/Madam,'}
                      label={'Salutation (Other / Not Set)'}
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
                      the letter signs off with the company name.
                    </span>
                  </div>

                </>
              )}

              {currentStep === 2 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <InputElement
                      id="purchase_note"
                      value={formData.purchase_note || ''}
                      name="purchase_note"
                      placeholder={'Purchase Invoice Note'}
                      label={'Purchase Invoice Note'}
                      className={''}
                      onChange={handleOnChange}
                    />
                    <InputElement
                      id="sales_note"
                      value={formData.sales_note || ''}
                      name="sales_note"
                      placeholder={'Sales Invoice Note'}
                      label={'Sales Invoice Note'}
                      className={''}
                      onChange={handleOnChange}
                    />
                    <DropdownCommon
                      id="money_format"
                      name={'money_format'}
                      label="Select Money Format"
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
                      className={''}
                      onChange={handleOnChange}
                    />
                    <InputElement
                      id="device_identifier_text"
                      value={formData.device_identifier_text || ''}
                      name="device_identifier_text"
                      placeholder={'Device Identifier Text'}
                      label={'Device Identifier Text'}
                      className={''}
                      onChange={handleOnChange}
                    />
                    <InputElement
                      id="decimal_places"
                      value={formData.decimal_places || 0}
                      name="decimal_places"
                      placeholder={'Enter Decimal Places'}
                      label={'Decimal Places'}
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
                      className={''}
                      onChange={handleOnChange}
                    />
                    
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <FormToggleField
                      label="Show spelling of money in invoice?"
                      checked={Boolean(formData.show_spelling_of_money)}
                      onChange={(checked) =>
                        handleToggleFieldChange('show_spelling_of_money', checked)
                      }
                    />
                    <FormToggleField
                      label="Show Instalment List in Invoice"
                      checked={Boolean(formData.show_instalment_list)}
                      onChange={(checked) =>
                        handleToggleFieldChange('show_instalment_list', checked)
                      }
                    />
                    <FormToggleField
                      label="Show description in invoice?"
                      checked={Boolean(formData.show_description_in_invoice)}
                      onChange={(checked) =>
                        handleToggleFieldChange('show_description_in_invoice', checked)
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <FormToggleField
                      label="Show Brand in Invoice?"
                      checked={Boolean(formData.show_brand_in_invoice)}
                      onChange={(checked) =>
                        handleToggleFieldChange('show_brand_in_invoice', checked)
                      }
                    />
                    <FormToggleField
                      label="Show Category in Invoice?"
                      checked={Boolean(formData.show_category_in_invoice)}
                      onChange={(checked) =>
                        handleToggleFieldChange('show_category_in_invoice', checked)
                      }
                    />
                    <FormToggleField
                      label="Show combined invoice note?"
                      checked={Boolean(formData.combined_invoice_note)}
                      onChange={(checked) =>
                        handleToggleFieldChange('combined_invoice_note', checked)
                      }
                    />
                  </div>
                </>
              )}

              {currentStep === 3 && (
                <>
                  {/* ---------- Customer ---------- */}
                  <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Customer
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <FormToggleField
                      label="Use Customer Serial?"
                      checked={Boolean(formData.have_customer_sl)}
                      onChange={(checked) => handleToggleFieldChange('have_customer_sl', checked)}
                    />
                    <FormToggleField
                      label="Need Customer Area?"
                      checked={Boolean(formData.need_customer_area)}
                      onChange={(checked) => handleToggleFieldChange('need_customer_area', checked)}
                    />
                    <FormToggleField
                      label="Customer Share with Other branch?"
                      checked={Boolean(formData.share_customer_with_other_branch)}
                      onChange={(checked) =>
                        handleToggleFieldChange('share_customer_with_other_branch', checked)
                      }
                    />
                    <FormToggleField
                      label="Need Relation's Information?"
                      checked={Boolean(formData.need_relation_info)}
                      onChange={(checked) => handleToggleFieldChange('need_relation_info', checked)}
                    />
                    <FormToggleField
                      label="Need Customer Mother's Name?"
                      checked={Boolean(formData.need_customer_mother_name)}
                      onChange={(checked) => handleToggleFieldChange('need_customer_mother_name', checked)}
                    />
                    <FormToggleField
                      label="Need Customer Sex?"
                      checked={Boolean(formData.need_customer_sex)}
                      onChange={(checked) => handleToggleFieldChange('need_customer_sex', checked)}
                    />
                    <FormToggleField
                      label="Need Customer Contact Person?"
                      checked={Boolean(formData.need_customer_contact_person)}
                      onChange={(checked) => handleToggleFieldChange('need_customer_contact_person', checked)}
                    />
                    <FormToggleField
                      label="Need Customer Date of Birth?"
                      checked={Boolean(formData.need_customer_date_of_birth)}
                      onChange={(checked) => handleToggleFieldChange('need_customer_date_of_birth', checked)}
                    />
                    <FormToggleField
                      label="Need Customer Occupation?"
                      checked={Boolean(formData.need_customer_occupation)}
                      onChange={(checked) => handleToggleFieldChange('need_customer_occupation', checked)}
                    />
                    <FormToggleField
                      label="Need Customer Permanent Address?"
                      checked={Boolean(formData.need_customer_permanent_address)}
                      onChange={(checked) => handleToggleFieldChange('need_customer_permanent_address', checked)}
                    />
                    <FormToggleField
                      label="Need Customer Photo?"
                      checked={Boolean(formData.need_customer_photo)}
                      onChange={(checked) => handleToggleFieldChange('need_customer_photo', checked)}
                    />
                    <FormToggleField
                      label="Use Bangla?"
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
                        checked={Boolean(formData.have_customer_nominee)}
                        onChange={(checked) => handleToggleFieldChange('have_customer_nominee', checked)}
                      />
                      <FormToggleField
                        label="Need Nominee Photo?"
                        checked={Boolean(formData.need_nominee_photo)}
                        onChange={(checked) => handleToggleFieldChange('need_nominee_photo', checked)}
                      />
                      <FormToggleField
                        label="Use Guarantor?"
                        checked={Boolean(formData.have_is_guaranter)}
                        onChange={(checked) => handleToggleFieldChange('have_is_guaranter', checked)}
                      />
                    </div>
                  </div>
                </>
              )}

              {currentStep === 4 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <FormToggleField
                      label="Stock With Zero?"
                      checked={Boolean(formData.report_zero_bal)}
                      onChange={(checked) => handleToggleFieldChange('report_zero_bal', checked)}
                      className="mb-4 mt-3 md:mt-7"
                    />
                    <FormToggleField
                      label="Control Manufacture?"
                      checked={Boolean(formData.manufactur_control)}
                      onChange={(checked) => handleToggleFieldChange('manufactur_control', checked)}
                      className="mb-4 md:mt-7"
                    />
                    <FormToggleField
                      label="Warranty Control?"
                      checked={Boolean(formData.warranty_controll)}
                      onChange={(checked) => handleToggleFieldChange('warranty_controll', checked)}
                      className="mb-4 md:mt-7"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <FormToggleField
                      label="Multiple Warehouse?"
                      checked={Boolean(formData.have_warehouse)}
                      onChange={(checked) => handleToggleFieldChange('have_warehouse', checked)}
                    />
                    <FormToggleField
                      label="Product Share?"
                      checked={Boolean(formData.share_product_with_other_branch)}
                      onChange={(checked) =>
                        handleToggleFieldChange('share_product_with_other_branch', checked)
                      }
                    />
                    <FormToggleField
                      label="Opening ongoing?"
                      checked={Boolean(formData.is_opening)}
                      onChange={(checked) => handleToggleFieldChange('is_opening', checked)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <FormToggleField
                      label="Stock: Brand->Category->Item"
                      checked={Boolean(formData.stock_report_type)}
                      onChange={(checked) => handleToggleFieldChange('stock_report_type', checked)}
                    />
                    <FormToggleField
                      label="Need Demo Tutorial?"
                      checked={Boolean(formData.need_demo_tutorial)}
                      onChange={(checked) =>
                        handleToggleFieldChange('need_demo_tutorial', checked)
                      }
                    />
                    <FormToggleField
                      label="Report Due List with Address?"
                      checked={Boolean(formData.due_list_with_address)}
                      onChange={(checked) =>
                        handleToggleFieldChange('due_list_with_address', checked)
                      }
                    />
                    <FormToggleField
                      label="Show Voucher Image?"
                      checked={Boolean(formData.show_voucher_image)}
                      onChange={(checked) =>
                        handleToggleFieldChange('show_voucher_image', checked)
                      }
                    />
                  </div>
                  {settings?.data?.user?.id === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                      <FormToggleField
                        label="SMS Service"
                        checked={Boolean(formData.sms_service)}
                        onChange={(checked) => handleToggleFieldChange('sms_service', checked)}
                      />
                      <FormToggleField
                        label="Received SMS"
                        checked={Boolean(formData.received_sms)}
                        onChange={(checked) => handleToggleFieldChange('received_sms', checked)}
                      />
                      <FormToggleField
                        label="Sales SMS"
                        checked={Boolean(formData.sales_sms)}
                        onChange={(checked) => handleToggleFieldChange('sales_sms', checked)}
                      />
                      <FormToggleField
                        label="Purchase SMS"
                        checked={Boolean(formData.purchase_sms)}
                        onChange={(checked) => handleToggleFieldChange('purchase_sms', checked)}
                      />
                      <FormToggleField
                        label="Payment SMS"
                        checked={Boolean(formData.payment_sms)}
                        onChange={(checked) => handleToggleFieldChange('payment_sms', checked)}
                      />
                    </div>
                  )}

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
        </>
      </>
    </>
  );
};

export default AddBranch;

