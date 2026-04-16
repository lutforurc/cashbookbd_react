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
import Checkbox from '../../utils/fields/Checkbox';
import { editBranch, storeBranch, updateBranch } from './branchSlice';
import { useDispatch, useSelector } from 'react-redux';
import Loader from '../../../common/Loader';
import Link from '../../utils/others/Link';
import { getBranchSettings } from '../settings/settingsSlice';
import { toast } from 'react-toastify';
import { API_REMOTE_URL } from '../../services/apiRoutes';

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
  status: string;
  warranty_controll: boolean;
  have_warehouse: boolean;
  share_product_with_other_branch: boolean;
  share_customer_with_other_branch: boolean;
  have_customer_sl: boolean;
  have_is_guaranter: boolean;
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
  show_spelling_of_money: boolean;
  need_demo_tutorial: boolean;
  use_filter_parameter: boolean;
  sidebar_menu: boolean;
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

const AddBranch = () => {
  const steps = ['Basic Info', 'Print Setup', 'Feature Controls'];
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
    status: '',
    warranty_controll: false,
    have_warehouse: false,
    share_product_with_other_branch: false,
    share_customer_with_other_branch: false,
    have_customer_sl: false,
    have_is_guaranter: false,
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
    show_spelling_of_money: false,
    need_demo_tutorial: false,
    use_filter_parameter: false,
    sidebar_menu: false,
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

        // 🔑 CHECKBOX FIX
        is_opening: b.is_opening == 1 || b.is_opening === '1',
        have_is_guaranter: b.have_is_guaranter == 1 || b.have_is_guaranter === '1',
        report_zero_bal: b.report_zero_bal == 1 || b.report_zero_bal === '1',
        manufactur_control: b.manufactur_control == 1 || b.manufactur_control === '1',
        warranty_controll: b.warranty_controll == 1 || b.warranty_controll === '1',
        have_warehouse: b.have_warehouse == 1 || b.have_warehouse === '1',
        share_product_with_other_branch: b.share_product_with_other_branch == 1 || b.share_product_with_other_branch === '1',
        share_customer_with_other_branch: b.share_customer_with_other_branch == 1 || b.share_customer_with_other_branch === '1',
        have_customer_sl: b.have_customer_sl == 1 || b.have_customer_sl === '1',
        stock_report_type: b.stock_report_type == 1 || b.stock_report_type === '1',
        use_bangla: b.use_bangla == 1 || b.use_bangla === '1',
        show_instalment_list: b.show_instalment_list == 1 || b.show_instalment_list === '1',
        show_spelling_of_money: b.show_spelling_of_money == 1 || b.show_spelling_of_money === '1',
        use_filter_parameter: b.use_filter_parameter == 1 || b.use_filter_parameter === '1',
        sidebar_menu: b.sidebar_menu == 1 || b.sidebar_menu === '1',
        sms_service: b.sms_service == 1 || b.sms_service === '1',
        received_sms: b.received_sms == 1 || b.received_sms === '1',
        purchase_sms: b.purchase_sms == 1 || b.purchase_sms === '1',
        sales_sms: b.sales_sms == 1 || b.sales_sms === '1',
        payment_sms: b.payment_sms == 1 || b.payment_sms === '1',
        pad_header_image: b.pad_header_image || b.pad_heading_image || b.letterhead_image || b.pad_image || b.header_image || '',
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
            <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
              {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;

                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setCurrentStep(index)}
                    className={`rounded border px-4 py-3 text-left transition ${
                      isActive
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
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {steps[currentStep]}
                </h2>
                <p className="text-sm text-gray-500">
                  {currentStep === 0 && 'Branch identity, contact details, and status.'}
                  {currentStep === 1 && 'Print preferences, invoice settings, and document notes.'}
                  {currentStep === 2 && 'Operational controls, sharing options, and SMS preferences.'}
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
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <Checkbox
                      id="report_zero_bal"
                      name="report_zero_bal"
                      checked={formData.report_zero_bal}
                      onChange={handleOnChange}
                      label="Stock With Zero?"
                      className="mb-4 mt-3 md:mt-7"
                    />
                    <Checkbox
                      id="manufactur_control"
                      name="manufactur_control"
                      checked={formData.manufactur_control}
                      onChange={handleOnChange}
                      label="Control Manufacture?"
                      className="mb-4 md:mt-7"
                    />
                    <Checkbox
                      id="warranty_controll"
                      name="warranty_controll"
                      checked={formData.warranty_controll}
                      onChange={handleOnChange}
                      label="Warranty Control?"
                      className="mb-4 md:mt-7"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <Checkbox
                      id="have_warehouse"
                      name="have_warehouse"
                      checked={formData.have_warehouse}
                      onChange={handleOnChange}
                      label="Multiple Warehouse?"
                      className="mb-4"
                    />
                    <Checkbox
                      id="share_product_with_other_branch"
                      name="share_product_with_other_branch"
                      checked={formData.share_product_with_other_branch}
                      onChange={handleOnChange}
                      label="Product Share?"
                      className="mb-4"
                    />
                    <Checkbox
                      id="share_customer_with_other_branch"
                      name="share_customer_with_other_branch"
                      checked={formData.share_customer_with_other_branch}
                      onChange={handleOnChange}
                      label="Customer Share?"
                      className="mb-4"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <Checkbox
                      id="have_customer_sl"
                      name="have_customer_sl"
                      checked={formData.have_customer_sl}
                      onChange={handleOnChange}
                      label="Use Customer Serial?"
                      className="mb-4"
                    />
                    <Checkbox
                      id="use_bangla"
                      name="use_bangla"
                      checked={formData.use_bangla}
                      onChange={handleOnChange}
                      label="Use Bangla?"
                      className="mb-4"
                    />
                    <Checkbox
                      id="is_opening"
                      name="is_opening"
                      checked={formData.is_opening}
                      onChange={handleOnChange}
                      label="Opening ongoing?"
                      className="mb-4"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <Checkbox
                      id="have_is_guaranter"
                      name="have_is_guaranter"
                      checked={formData.have_is_guaranter}
                      onChange={handleOnChange}
                      label="Use Guarantor?"
                      className="mb-4"
                    />
                    <Checkbox
                      id="stock_report_type"
                      name="stock_report_type"
                      checked={formData.stock_report_type}
                      onChange={handleOnChange}
                      label="Stock: Brand->Category->Item"
                      className="mb-4"
                    />
                    <Checkbox
                      id="show_instalment_list"
                      name="show_instalment_list"
                      checked={formData.show_instalment_list}
                      onChange={handleOnChange}
                      label="Show Instalment List in Invoice"
                      className="mb-4"
                    />
                    <Checkbox
                      id="show_spelling_of_money"
                      name="show_spelling_of_money"
                      checked={formData.show_spelling_of_money}
                      onChange={handleOnChange}
                      label="Show spelling of money in invoice?"
                      className="mb-4"
                    />
                    <Checkbox
                      id="need_demo_tutorial"
                      name="need_demo_tutorial"
                      checked={formData.need_demo_tutorial}
                      onChange={handleOnChange}
                      label="Need Demo Tutorial?"
                      className="mb-4"
                    />
                    <Checkbox
                      id="use_filter_parameter"
                      name="use_filter_parameter"
                      checked={formData.use_filter_parameter}
                      onChange={handleOnChange}
                      label="Use Filter Parameter?"
                      className="mb-4"
                    />
                  </div>

                  {settings?.data?.user?.id === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                      <Checkbox
                        id="sms_service"
                        name="sms_service"
                        checked={formData.sms_service}
                        onChange={handleOnChange}
                        label="SMS Service"
                        className="mb-4"
                      />
                      <Checkbox
                        id="received_sms"
                        name="received_sms"
                        checked={formData.received_sms}
                        onChange={handleOnChange}
                        label="Received SMS"
                        className="mb-4"
                      />
                      <Checkbox
                        id="sales_sms"
                        name="sales_sms"
                        checked={formData.sales_sms}
                        onChange={handleOnChange}
                        label="Sales SMS"
                        className="mb-4"
                      />
                      <Checkbox
                        id="purchase_sms"
                        name="purchase_sms"
                        checked={formData.purchase_sms}
                        onChange={handleOnChange}
                        label="Purchase SMS"
                        className="mb-4"
                      />
                      <Checkbox
                        id="payment_sms"
                        name="payment_sms"
                        checked={formData.payment_sms}
                        onChange={handleOnChange}
                        label="Payment SMS"
                        className="mb-4"
                      />
                      <Checkbox
                        id="sidebar_menu"
                        name="sidebar_menu"
                        checked={formData.sidebar_menu}
                        onChange={handleOnChange}
                        label="Sidebar Menu"
                        className="mb-4"
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
