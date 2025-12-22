import React, { useEffect, useState } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Link from '../../../utils/others/Link';
import { FiHome, FiSave } from 'react-icons/fi';
import { toast } from 'react-toastify';
import InputElement from '../../../utils/fields/InputElement';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { employeeGroup, isPayable, status } from '../../../utils/fields/DataConstant';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import Loader from '../../../../common/Loader';
import { useDispatch, useSelector } from 'react-redux';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { fetchEmployeeSettings, storeEmployee } from './employeeSlice';
import dayjs from 'dayjs';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';

const Employee = ({ user }: any) => {
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const employeeSettings = useSelector((state: any) => state.employees);
  const dispatch = useDispatch<any>();

  // Blade-like: dob + joining date
  const [startDate, setStartDate] = useState<Date | null>(null); // Joining Date
  const [endDate, setEndDate] = useState<Date | null>(null); // Joining Date 

  const [branchId, setBranchId] = useState<number | null>(null);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [designation, setDesignation] = useState<any[]>([]);
  const [gender, setGender] = useState<any[]>([]);
  const [isSelected, setIsSelected] = useState<number | string>('');
  const [saveLoading, setSaveLoading] = useState(false);

  const [formData, setFormData] = useState<any>({
    name: '',
    father_name: '',
    present_address: '',
    permanent_address: '',
    nid: '',
    mobile: '',

    // keep these as string fields (Blade sends string)
    dob: '',
    joining_date: '',

    designation: '8',
    branch: '',
    qualification: '',
    status: '1',
    gender: '1',
    basic_salary: '',
    house_rent: '',
    medical: '',
    others_allowance: '',
    loan_deduction: '',
    others_deduction: '',

    // ✅ IMPORTANT: Use Blade field name
    salary_payable: '1',

    employee_group: '2',
    employee_serial: '',
  });

  /* ================= INIT ================= */
  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(fetchEmployeeSettings());

    const bId = user?.branch_id ?? user?.user?.branch_id ?? null;

    setIsSelected(bId ?? '');
    setBranchId(bId ?? null);
  }, [dispatch, user]);

  /* ================= SETTINGS DATA (keep your mapping) ================= */
  useEffect(() => {
    // ✅ mapping same as you wrote (not changing your structure)
    setDropdownData(employeeSettings?.employeeSettings?.data?.data?.branchs || []);
    setDesignation(employeeSettings?.employeeSettings?.data?.data?.designation || []);
    setGender(employeeSettings?.employeeSettings?.data?.data?.sex || []);

    const bId = user?.branch_id ?? user?.user?.branch_id ?? null;
    setBranchId(bId ?? null);
  }, [employeeSettings, user]);


  /* ================= HANDLERS ================= */

  // ✅ One handler works for InputElement + DropdownCommon (if they emit event)
  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  // ✅ keep your dropdown handler (same behavior)
  const handleOnSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  // ✅ Date of Birth
  const handleEndDate = (d: Date | null) => {
    setEndDate(d);

    setFormData((prev: any) => ({
      ...prev,
      dob: d ? dayjs(d).format('DD/MM/YYYY') : '',
    }));
  };

  const handleStartDate = (d: Date | null) => {
    setStartDate(d);

    setFormData((prev: any) => ({
      ...prev,
      joining_date: d ? dayjs(d).format('DD/MM/YYYY') : '',
    }));
  }

  // ✅ Branch change -> numeric
  const handleBranchChange = (e: any) => {
    const val = Number(e.target.value);
    setBranchId(Number.isNaN(val) ? null : val);
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {
    setSaveLoading(true);

    // Validation
    if (!formData.name) {
      setSaveLoading(false);
      return toast.error('Please enter name');
    }
    if (!formData.father_name) {
      setSaveLoading(false);
      return toast.error('Please enter father name');
    }
    if (!formData.mobile) {
      setSaveLoading(false);
      return toast.error('Please enter mobile number');
    }
    if (!formData.designation) {
      setSaveLoading(false);
      return toast.error('Please select designation');
    }
    if (!formData.dob) {
      setSaveLoading(false);
      return toast.error('Please enter date of birth');
    }
    if (!formData.joining_date) {
      setSaveLoading(false);
      return toast.error('Please enter date of joining');
    }

    const payload = {
      name: formData.name,
      father_name: formData.father_name,
      nid: formData.nid,
      designation: formData.designation,
      qualification: formData.qualification,
      date_of_birth: formData.dob,
      joning_dt: formData.joining_date,
      present_address: formData.present_address,
      permanent_address: formData.permanent_address, // ✅ typo fix
      mobile: formData.mobile,
      sex: formData.gender,
      project_id: branchId,
      status: formData.status === 'Active' ? 1 : 0,
      basic_salary: formData.basic_salary || '0',
      house_rent: formData.house_rent || '0',
      medical_allowance: formData.medical || '0',
      others_allowance: formData.others_allowance || '0',
      loan_deduction: formData.loan_deduction || '0',
      others_deduction: formData.others_deduction || '0',
      salary_payable: formData.salary_payable || '1',
      employee_group: formData.employee_group || '1',
      employee_serial: formData.employee_serial || '0',
    };

    try {
      await dispatch(storeEmployee(payload)).unwrap();
      toast.success('Employee saved successfully');

      // ✅ Reset form after success
      setFormData({
        name: '',
        father_name: '',
        present_address: '',
        permanent_address: '',
        nid: '',
        mobile: '',
        dob: '',
        joining_date: '',
        designation: '',
        branch: '',
        qualification: '',
        status: 'Active',
        gender: '1',
        basic_salary: '',
        house_rent: '',
        medical: '',
        others_allowance: '',
        loan_deduction: '',
        others_deduction: '',
        salary_payable: '',
        employee_group: '',
        employee_serial: '',
      });
      setStartDate(null);
      setEndDate(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save employee');
      console.error('Error:', err);
    } finally {
      setSaveLoading(false); // ✅ এটা সবশেষে execute হবে
    }
  };



  return (
    <>
      <HelmetTitle title="Employee Entry" />
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <InputElement
            id="name"
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />

          <InputElement
            id="father_name"
            label="Father's Name"
            name="father_name"
            value={formData.father_name}
            onChange={handleChange}
          />

          <InputElement
            id="nid"
            label="National ID"
            name="nid"
            value={formData.nid}
            onChange={handleChange}
          />

          <InputElement
            id="present_address"
            label="Present Address"
            name="present_address"
            value={formData.present_address}
            onChange={handleChange}
            className="md:col-span-2 lg:col-span-2"
          />

          <InputElement
            id="permanent_address"
            label="Permanent Address"
            name="permanent_address"
            value={formData.permanent_address}
            onChange={handleChange}
            className="md:col-span-2 lg:col-span-2"
          />

          <InputElement
            id="mobile"
            label="Mobile Number"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
          />

          <div>
            <label>Date of Birth</label>
            <InputDatePicker
              placeholder="Date of Birth"
              setCurrentDate={handleEndDate}
              className="font-medium text-sm w-full h-9"
              selectedDate={endDate}
              setSelectedDate={setEndDate}
            />
          </div>

          <div>
            <label>Joining Date</label>
            <InputDatePicker
              placeholder="Joining Date"
              setCurrentDate={handleStartDate}
              className="font-medium text-sm w-full h-9"
              selectedDate={startDate}
              setSelectedDate={setStartDate}
            />
          </div>
          <InputElement
            id="qualification"
            label="Qualification"
            name="qualification"
            value={formData.qualification}
            onChange={handleChange}
          />
          

          <InputElement
            id="basic_salary"
            label="Basic Salary"
            name="basic_salary"
            value={formData.basic_salary}
            onChange={handleChange}
          />

          <InputElement
            id="house_rent"
            label="House Rent"
            name="house_rent"
            value={formData.house_rent}
            onChange={handleChange}
          />

          <InputElement
            id="medical"
            label="Medical Allowance"
            name="medical"
            value={formData.medical}
            onChange={handleChange}
          />

          <InputElement
            id="others_allowance"
            label="Others Allowance"
            name="others_allowance"
            value={formData.others_allowance}
            onChange={handleChange}
          />

          <InputElement
            id="loan_deduction"
            label="Loan Deduction"
            name="loan_deduction"
            value={formData.loan_deduction}
            onChange={handleChange}
          />

          <InputElement
            id="others_deduction"
            label="Others Deduction"
            name="others_deduction"
            value={formData.others_deduction}
            onChange={handleChange}
          />
<DropdownCommon
            id="designation"
            name="designation"
            label="Select Designation"
            onChange={handleOnSelectChange}
            className="h-[2.1rem] bg-transparent"
            defaultValue={formData?.designation?.toString() ?? ''}
            data={designation}
          />

          <div>
            <label>Select Branch</label>
            <div className="w-full">
              {branchDdlData.isLoading === true ? <Loader /> : null}
              <BranchDropdown
                id="branch"
                name="branch"
                defaultValue={isSelected}
                onChange={handleBranchChange}
                className="w-full font-medium text-sm p-1.5"
                branchDdl={dropdownData}
              />
            </div>
          </div>




          <DropdownCommon
            id="gender"
            name="gender"
            label="Gender"
            onChange={handleOnSelectChange}
            className="h-[2.1rem] bg-transparent"
            defaultValue={formData?.gender?.toString() ?? ''}
            data={gender}
          />
          <DropdownCommon
            id="salary_payable"
            name="salary_payable"
            label="Is Payable?"
            onChange={handleOnSelectChange}
            className="h-[2.1rem] bg-transparent"
            defaultValue={formData?.salary_payable?.toString() ?? ''}
            data={isPayable}
          />

          <DropdownCommon
            id="employee_group"
            name="employee_group"
            label="Employee Group"
            onChange={handleOnSelectChange}
            className="h-[2.1rem] bg-transparent"
            defaultValue={formData?.employee_group?.toString() ?? ''}
            data={employeeGroup}
          />

          <DropdownCommon
            id="status"
            name="status"
            label="Select Status"
            onChange={handleOnSelectChange}
            className="h-[2.1rem] bg-transparent"
            defaultValue={formData?.status?.toString() ?? ''}
            data={status}
          />
          <InputElement
            id="employee_serial"
            label="Salary Sheet Serial Number"
            name="employee_serial"
            value={formData.employee_serial}
            onChange={handleChange}
          />

        </div>

        {/* ================= BUTTONS ================= */}
        <div className="flex justify-end gap-2 mt-4">


          <ButtonLoading
            onClick={handleSave}
            buttonLoading={saveLoading}
            disabled={saveLoading}
            label="Save"
            className="whitespace-nowrap text-center mr-0 h-8"
            icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
          />
          <Link to="/dashboard" className="h-8">
            <FiHome className="mr-2" /> Home
          </Link>
        </div>
      </div>

    </>
  );
};

export default Employee;
