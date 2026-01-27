import React, { useEffect, useState } from 'react';
import InputElement from '../../utils/fields/InputElement';
import HelmetTitle from '../../utils/others/HelmetTitle';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import {
  businessTypes,
  moneySpellFormat,
  officeTypes,
  printerSettings,
  printPadHeading,
  status,
} from '../../utils/fields/DataConstant';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { FiArrowLeft, FiHome, FiRefreshCcw, FiSave } from 'react-icons/fi';
import { useParams, useNavigate } from 'react-router-dom';
import Checkbox from '../../utils/fields/Checkbox';
import { editBranch, storeBranch, updateBranch } from './branchSlice';
import { useDispatch, useSelector } from 'react-redux';
import Loader from '../../../common/Loader';
import Link from '../../utils/others/Link';
import { getBranchSettings } from '../settings/settingsSlice';
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
  is_opening: boolean;
  use_bangla: boolean;
  report_zero_bal: boolean;
  manufactur_control: boolean;
}

const AddBranch = () => {
  const navigate = useNavigate();
  const branchEditData = useSelector((state: any) => state.branchList);
  const settings = useSelector((state: any) => state.settings);
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
    is_opening: false,
    use_bangla: false,
    report_zero_bal: false,
    manufactur_control: false,
  };
  const [buttonLoading, setButtonLoading] = useState(false);
  const dispatch = useDispatch();

  const { id } = useParams();

  useEffect(() => {
    if (id) {
      dispatch(editBranch(id));
    }
  }, [id]);

  useEffect(() => {
    dispatch(getBranchSettings());
  }, []);



  useEffect(() => {
    if (branchEditData?.editData?.branch) {
      const b = branchEditData.editData.branch;

      setFormData(prev => ({
        ...prev,
        ...b,

        // 🔑 CHECKBOX FIX
        is_opening: b.is_opening == 1 || b.is_opening === '1',
        have_is_guaranter: b.have_is_guaranter == 1 || b.have_is_guaranter === '1',
        report_zero_bal: b.report_zero_bal == 1 || b.report_zero_bal === '1',
        manufactur_control: b.manufactur_control == 1 || b.manufactur_control === '1',
        warranty_controll: b.warranty_controll == 1 || b.warranty_controll === '1',
        have_warehouse: b.have_warehouse == 1 || b.have_warehouse === '1',
        share_product_with_other_branch:
          b.share_product_with_other_branch == 1 ||
          b.share_product_with_other_branch === '1',
        share_customer_with_other_branch:
          b.share_customer_with_other_branch == 1 ||
          b.share_customer_with_other_branch === '1',
        have_customer_sl: b.have_customer_sl == 1 || b.have_customer_sl === '1',
        use_bangla: b.use_bangla == 1 || b.use_bangla === '1',
      }));
    }
  }, [branchEditData?.editData]);

  const [formData, setFormData] = useState<branchItem>(initialBranch);
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
    setFormData({ ...formData, [name]: value });
  };

  const handleBranchUpdate = () => {
    dispatch(
      updateBranch(formData, (res: any) => {
        if (res?.success) {
          navigate('/branch/branch-list');
        }
      })
    );
  };

  const handleBranchSave = async () => {
    try {
      await dispatch(storeBranch(formData)).unwrap();
      setFormData(initialBranch); // ✔ এখানে ঠিক আছে
    } catch (error) {
      console.error(error);
    }
  };
  return (
    <>
      <HelmetTitle title={formData?.id ? 'Edit Branch' : 'Add New Branch'} />
      <>
        {branchEditData.isLoading == true ? <Loader /> : ''}

        <>
          <div>
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
                className="h-[2.1rem] bg-transparent mt-1"
                data={settings?.branchSettings?.branchType}
              />
              <DropdownCommon
                id="business_type_id"
                name={'business_type_id'}
                label="Select Business Type"
                onChange={handleOnSelectChange}
                value={formData?.business_type_id || ''}
                className="h-[2.1rem] bg-transparent mt-1"
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
              <DropdownCommon
                id="pad_heading_print"
                name={'pad_heading_print'}
                label="Select Print Heading"
                onChange={handleOnSelectChange}
                className="h-[2.1rem] bg-transparent mt-1"
                defaultValue={formData?.pad_heading_print || ''}
                data={printPadHeading}
              />
              <InputElement
                id="address"
                value={formData.address || ''}
                name="address"
                placeholder={'Enter Branch Address'}
                label={'Enter Branch Address'}
                className={''}
                onChange={handleOnChange}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <DropdownCommon
                id="print_size"
                name={'print_size'}
                label="Select Printer Settings"
                onChange={handleOnSelectChange}
                className="h-[2.1rem] bg-transparent mt-1"
                defaultValue={formData?.print_size || ''}
                data={printerSettings}
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

              <DropdownCommon
                id="paper_size"
                name={'paper_size'}
                label="Select Page Size"
                onChange={handleOnSelectChange}
                className="h-[2.1rem] bg-transparent mt-1"
                defaultValue={formData?.paper_size || ''}
                data={printPadHeading}
              />
            </div>
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
                className="h-[2.1rem] bg-transparent mt-1"
                defaultValue={formData?.money_format || ''}
                data={moneySpellFormat}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
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
                className="h-[2.1rem] bg-transparent mt-1"
                defaultValue={formData?.status?.toString() ?? ''}
                data={status}
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
              <Checkbox
                id="report_zero_bal"
                name="report_zero_bal"
                checked={formData.report_zero_bal}
                onChange={handleOnChange}
                label="Stock With Zero?"
                className="mb-4 mt-3 md:mt-7" // Add any additional styling if needed
              />
              <Checkbox
                id="manufactur_control"
                name="manufactur_control"
                checked={formData.manufactur_control}
                onChange={handleOnChange}
                label="Control Manufacture?"
                className="mb-4  md:mt-7" // Add any additional styling if needed
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <Checkbox
                id="warranty_controll"
                name="warranty_controll"
                checked={formData.warranty_controll}
                onChange={handleOnChange}
                label="Warranty Control?"
                className="mb-4" // Add any additional styling if needed
              />
              <Checkbox
                id="have_warehouse"
                name="have_warehouse"
                checked={formData.have_warehouse}
                onChange={handleOnChange}
                label="Multiple Warehouse?"
                className="mb-4" // Add any additional styling if needed
              />
              <Checkbox
                id="share_product_with_other_branch"
                name="share_product_with_other_branch"
                checked={formData.share_product_with_other_branch}
                onChange={handleOnChange}
                label="Product Share?"
                className="mb-4" // Add any additional styling if needed
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <Checkbox
                id="share_customer_with_other_branch"
                name="share_customer_with_other_branch"
                checked={formData.share_customer_with_other_branch}
                onChange={handleOnChange}
                label="Customer Share?"
                className="mb-4" // Add any additional styling if needed
              />
              <Checkbox
                id="have_customer_sl"
                name="have_customer_sl"
                checked={formData.have_customer_sl}
                onChange={handleOnChange}
                label="Use Customer Serial?"
                className="mb-4" // Add any additional styling if needed
              />

              <Checkbox
                id="use_bangla"
                name="use_bangla"
                checked={formData.use_bangla}
                onChange={handleOnChange}
                label="Use Bangla?"
                className="mb-4" // Add any additional styling if needed
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <Checkbox
                id="is_opening"
                name="is_opening"
                checked={formData.is_opening}
                onChange={handleOnChange}
                label="Opening ongoing?"
                className="mb-4" // Add any additional styling if needed
              />
              <Checkbox
                id="have_is_guaranter"
                name="have_is_guaranter"
                checked={formData.have_is_guaranter}
                onChange={handleOnChange}
                label="Use Guarantor?"
                className="mb-4" // Add any additional styling if needed
              />

            </div>

          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            {branchEditData.editData?.branch ? (
              <ButtonLoading
                onClick={handleBranchUpdate}
                buttonLoading={buttonLoading}
                label="Update"
                className="whitespace-nowrap text-center mr-0 p-2"
                icon={<FiSave className="text-white text-lg ml-2  mr-2" />}
              />
            ) : (
              <ButtonLoading
                onClick={handleBranchSave}
                buttonLoading={buttonLoading}
                label="Save"
                className="whitespace-nowrap text-center mr-0 p-2"
                icon={<FiSave className="text-white text-lg ml-2  mr-2" />}
              />
            )}
            <ButtonLoading
              onClick={handleBranchSave}
              buttonLoading={buttonLoading}
              label="Reset"
              className="whitespace-nowrap text-center mr-0 p-2"
              icon={<FiRefreshCcw className="text-white text-lg ml-2  mr-2" />}
            />
            <Link to="/branch/branch-list" className="text-nowrap justify-center mr-0 P-2">
              <FiArrowLeft className="mr-2" /> Back
            </Link>
          </div>
        </>
      </>
    </>
  );
};

export default AddBranch;
