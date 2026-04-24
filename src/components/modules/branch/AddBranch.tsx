import React, { useEffect, useState } from 'react';
import InputElement from '../../utils/fields/InputElement';
import HelmetTitle from '../../utils/others/HelmetTitle';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import {
  moneySpellFormat,
  printerSettings,
  printPadHeading,
  status,
} from '../../utils/fields/DataConstant';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { FiArrowLeft, FiArrowRight, FiRefreshCcw, FiSave } from 'react-icons/fi';
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
  email: string;
  pad_heading_print: string;
  address: string;
  print_size: string;
  contact_person: string;
  paper_size: string;
  print_sizeText?: string; // Add this line
  purchase_note: string;
  sales_note: string;
  money_format: string;
  phone: string;
  notes: string;
  invoice_label: string;
  decimal_places: number;
  device_identifier_text?: string;
  status: string;
  warranty_controll: boolean;
  have_warehouse: boolean;
  share_product_with_other_branch: boolean;
  share_customer_with_other_branch: boolean;
  have_customer_sl: boolean;
  have_is_guaranter: boolean;
  have_is_nominee: boolean;
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
  need_contact_person: boolean;
  need_relation_info: boolean;
  need_mother_name: boolean;
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
  const steps = ['Basic Info', 'Print Setup', 'Invoice Setup', 'Feature Controls'];
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
    email: '',
    pad_heading_print: '',
    address: '',
    print_size: '',
    contact_person: '',
    paper_size: '',
    print_sizeText: '', // Add this line
    purchase_note: '',
    sales_note: '',
    money_format: '',
    phone: '',
    notes: '',
    invoice_label: '',
    decimal_places: 0,
    device_identifier_text: '',
    status: '',
    warranty_controll: false,
    have_warehouse: false,
    share_product_with_other_branch: false,
    share_customer_with_other_branch: false,
    have_customer_sl: false,
    have_is_guaranter: false,
    have_is_nominee: false,
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
    need_contact_person: false,
    need_relation_info: false,
    need_mother_name: false,
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

        // 🔑 CHECKBOX FIX
        is_opening: toBooleanFlag(b.is_opening),
        have_is_guaranter: toBooleanFlag(b.have_is_guaranter),
        have_is_nominee: toBooleanFlag(b.have_is_nominee),
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
        need_contact_person: toBooleanFlag(b.need_contact_person),
        need_relation_info: toBooleanFlag(b.need_relation_info),
        need_mother_name: toBooleanFlag(b.need_mother_name),
        sms_service: toBooleanFlag(b.sms_service),
        received_sms: toBooleanFlag(b.received_sms),
        purchase_sms: toBooleanFlag(b.purchase_sms),
        sales_sms: toBooleanFlag(b.sales_sms),
        payment_sms: toBooleanFlag(b.payment_sms),
        pad_header_image: b.pad_header_image || b.pad_heading_image || b.letterhead_image || b.pad_image || b.header_image || '',
        show_brand_in_invoice: toBooleanFlag(b.show_brand_in_invoice),
        show_category_in_invoice: toBooleanFlag(b.show_category_in_invoice),
        show_description_in_invoice: toBooleanFlag(b.show_description_in_invoice),
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
          <div>
            <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4">
              {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;

                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setCurrentStep(index)}
                    className={`rounded border px-4 py-3 text-left transition ${isActive
                        ? 'border-blue-600 text-black-0 dark:text-white'
                        : isCompleted
                          ? 'border-green-500  text-green-700'
                          : 'border-gray-300  text-gray-600 dark:bg-transparent dark:text-gray-300'
                      }`}
                  >
                    <span className="block text-xs font-semibold uppercase tracking-wide">
                      Step {index + 1}
                    </span>
                    <span className="block text-sm font-medium">{step}</span>
                  </button>
                );
              })}
            </div>

            <div className="mb-4 rounded border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-transparent">
              <div className="mb-2">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {steps[currentStep]}
                </h2>
                <p className="text-sm text-gray-500">
                  {currentStep === 0 && 'Branch identity, contact details, and status.'}
                  {currentStep === 1 && 'Print preferences, page size, and letterhead setup.'}
                  {currentStep === 2 && 'Invoice labels, notes, formatting, and invoice display options.'}
                  {currentStep === 3 && 'Operational controls, sharing options, and SMS preferences.'}
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
                  </div>
                </>
              )}

              {currentStep === 3 && (
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
                      label="Customer Share?"
                      checked={Boolean(formData.share_customer_with_other_branch)}
                      onChange={(checked) =>
                        handleToggleFieldChange('share_customer_with_other_branch', checked)
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <FormToggleField
                      label="Use Customer Serial?"
                      checked={Boolean(formData.have_customer_sl)}
                      onChange={(checked) => handleToggleFieldChange('have_customer_sl', checked)}
                    />
                    <FormToggleField
                      label="Use Bangla?"
                      checked={Boolean(formData.use_bangla)}
                      onChange={(checked) => handleToggleFieldChange('use_bangla', checked)}
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
                      label="Use Guarantor?"
                      checked={Boolean(formData.have_is_guaranter)}
                      onChange={(checked) => handleToggleFieldChange('have_is_guaranter', checked)}
                    />
                    <FormToggleField
                      label="Use Nominee?"
                      checked={Boolean(formData.have_is_nominee)}
                      onChange={(checked) => handleToggleFieldChange('have_is_nominee', checked)}
                    />
                    <FormToggleField
                      label="Need Demo Tutorial?"
                      checked={Boolean(formData.need_demo_tutorial)}
                      onChange={(checked) =>
                        handleToggleFieldChange('need_demo_tutorial', checked)
                      }
                    />
                    <FormToggleField
                      label="Need Relation's Information?"
                      checked={Boolean(formData.need_relation_info)}
                      onChange={(checked) =>
                        handleToggleFieldChange('need_relation_info', checked)
                      }
                    />
                    <FormToggleField
                      label="Need Mother's Name?"
                      checked={Boolean(formData.need_mother_name)}
                      onChange={(checked) =>
                        handleToggleFieldChange('need_mother_name', checked)
                      }
                    />
                    <FormToggleField
                      label="Need Contact Person?"
                      checked={Boolean(formData.need_contact_person)}
                      onChange={(checked) =>
                        handleToggleFieldChange('need_contact_person', checked)
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
          </div>
          <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4">
            <ButtonLoading
              onClick={goToPreviousStep}
              buttonLoading={false}
              disabled={currentStep === 0}
              label="Previous"
              className="w-full whitespace-nowrap p-2 text-center disabled:cursor-not-allowed disabled:opacity-50"
              icon={<FiArrowLeft className="text-white text-lg ml-2 mr-2" />}
            />
            {currentStep < steps.length - 1 ? (
              <ButtonLoading
                onClick={goToNextStep}
                buttonLoading={false}
                label="Next"
                className="w-full whitespace-nowrap p-2 text-center"
                icon={<FiArrowRight className="text-white text-lg ml-2 mr-2" />}
              />
            ) : branchEditData.editData?.branch ? (
              <ButtonLoading
                onClick={handleBranchUpdate}
                buttonLoading={buttonLoading}
                label="Update"
                className="w-full whitespace-nowrap p-2 text-center"
                icon={<FiSave className="text-white text-lg ml-2  mr-2" />}
              />
            ) : (
              <ButtonLoading
                onClick={handleBranchSave}
                buttonLoading={buttonLoading}
                label="Save"
                className="w-full whitespace-nowrap p-2 text-center"
                icon={<FiSave className="text-white text-lg ml-2  mr-2" />}
              />
            )}
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
              className="w-full whitespace-nowrap p-2 text-center"
              icon={<FiRefreshCcw className="text-white text-lg ml-2  mr-2" />}
            />
            <Link
              to="/branch/branch-list"
              className="flex w-full items-center justify-center text-nowrap rounded bg-gray-700 p-2 text-white transition hover:bg-blue-400 dark:hover:bg-blue-400"
            >
              <FiArrowLeft className="mr-2" /> Back
            </Link>
          </div>
        </>
      </>
    </>
  );
};

export default AddBranch;
