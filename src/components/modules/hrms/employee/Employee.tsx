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
import { fetchEmployeeSettings } from './employeeSlice';
import dayjs from 'dayjs';

const genderList = [
  { id: 'Male', name: 'Male' },
  { id: 'Female', name: 'Female' },
];

const Employee = ({ user }: any) => {
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const employeeSettings = useSelector((state: any) => state.employees);
  const dispatch = useDispatch<any>();

  // Blade-like: dob + joining date
  const [startDate, setStartDate] = useState<Date | null>(null); // Joining Date
  const [endDate, setEndDate] = useState<Date | null>(null); // Date of Birth

  const [branchId, setBranchId] = useState<number | null>(null);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [designation, setDesignation] = useState<any[]>([]);
  const [isSelected, setIsSelected] = useState<number | string>('');

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

    designation: '',
    branch: '',
    qualification: '',
    status: 'Active',
    gender: 'Male',
    basic_salary: '',
    house_rent: '',
    medical: '',
    others_allowance: '',
    loan_deduction: '',
    others_deduction: '',

    // ✅ IMPORTANT: Use Blade field name
    salary_payable: '',

    employee_group: '',
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

  // ✅ Joining Date
  const handleStartDate = (d: Date | null) => {
    setStartDate(d);
    setFormData((prev: any) => ({
      ...prev,
      joining_date: d ? dayjs(d).format('DD/MM/YYYY') : '',
    }));
  };

  // ✅ Branch change -> numeric
  const handleBranchChange = (e: any) => {
    const val = Number(e.target.value);
    setBranchId(Number.isNaN(val) ? null : val);
  };

  /* ================= SAVE ================= */
  const handleSave = () => {
    // Minimal required fields (you can add more like Blade)
    if (!formData.name) return toast.error('Please enter name');
    if (!formData.father_name) return toast.error('Please enter father name');
    if (!formData.mobile) return toast.error('Please enter mobile number');
    // if (!branchId) return toast.error('Please select branch');
    if (!formData.designation) return toast.error('Please select designation');
    if (!formData.dob) return toast.error('Please enter date of birth');
    if (!formData.joining_date) return toast.error('Please enter date of joining');

    // ✅ Blade-style payload keys (branch is project_id in Blade)
    const payload = {
      ...formData,
      project_id: branchId,
      date_of_birth: formData.dob, // Blade key
      joning_dt: formData.joining_date, // Blade key
    };

    console.log('Employee Payload:', payload);
    toast.success('Employee saved successfully (demo)');
  };

  return (
    <>
      <HelmetTitle title="Employee Entry" />
      <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
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

          <InputElement
            id="qualification"
            label="Qualification"
            name="qualification"
            value={formData.qualification}
            onChange={handleChange}
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

          <DropdownCommon
            id="gender"
            name="gender"
            label="Gender"
            onChange={handleOnSelectChange}
            className="h-[2.1rem] bg-transparent"
            defaultValue={formData?.gender?.toString() ?? ''}
            data={genderList}
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

          <InputElement
            id="employee_serial"
            label="Employee Serial"
            name="employee_serial"
            value={formData.employee_serial}
            onChange={handleChange}
          />

        </div>

        {/* ================= BUTTONS ================= */}
        <div className="flex justify-end gap-2 mt-4">
          <Link to="/dashboard" className="h-8">
            <FiHome className="mr-2" /> Home
          </Link>

          <button
            onClick={handleSave}
            className="flex items-center h-8 px-4 bg-blue-600 text-white rounded"
          >
            <FiSave className="mr-2" /> Save
          </button>
        </div>
      </div>

    </>
  );
};

export default Employee;
