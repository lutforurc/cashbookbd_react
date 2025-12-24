import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { fetchEmployeeById, updateEmployee, fetchEmployeeSettings } from './employeeSlice';
import dayjs from 'dayjs';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';

/* ===== SAME MODEL ===== */
class EmployeeFormModel {
  static create() {
    return {
      name: '',
      father_name: '',
      present_address: '',
      permanent_address: '',
      nid: '',
      mobile: '',
      dob: '',
      joining_date: '',
      designation: '8',
      branch: '',
      qualification: '',
      status: '',
      sex: '',
      basic_salary: '',
      house_rent: '',
      medical: '',
      others_allowance: '',
      loan_deduction: '',
      others_deduction: '',
      salary_payable: '',
      employee_group: '',
      employee_serial: '',
    };
  }
}

const EmployeeEdit = ({ user }: any) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch<any>();

  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const employeeState = useSelector((state: any) => state.employees);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [branchId, setBranchId] = useState<number | null>(null);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [designation, setDesignation] = useState<any[]>([]);
  const [sex, setSex] = useState<any[]>([]);
  const [isSelected, setIsSelected] = useState<number | string>('');
  const [saveLoading, setSaveLoading] = useState(false);

  const [formData, setFormData] = useState<any>(EmployeeFormModel.create());

  /* ================= INIT ================= */
  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(fetchEmployeeSettings());
    dispatch(fetchEmployeeById(id));
  }, [dispatch, id]);

  /* ================= LOAD SETTINGS ================= */
  useEffect(() => {
    setDropdownData(employeeState?.employeeSettings?.data?.data?.branchs || []);
    setDesignation(employeeState?.employeeSettings?.data?.data?.designation || []);
    setSex(employeeState?.employeeSettings?.data?.data?.sex || []);
  }, [employeeState]);

  /* ================= LOAD EMPLOYEE DATA ================= */
  useEffect(() => {
    const emp = employeeState?.employee;
    if (!emp) return;

    setFormData({
      name: emp.name,
      father_name: emp.father_name,
      present_address: emp.present_address,
      permanent_address: emp.permanent_address,
      nid: emp.nid,
      mobile: emp.mobile,
      dob: emp.date_of_birth,
      joining_date: emp.joning_dt,
      designation: emp.designation_id,
      qualification: emp.qualification,
      status: emp.status === 1 ? 'Active' : 'Inactive',
      sex: emp.sex_id,
      basic_salary: emp.basic_salary,
      house_rent: emp.house_rent,
      medical: emp.medical_allowance,
      others_allowance: emp.others_allowance,
      loan_deduction: emp.loan_deduction,
      others_deduction: emp.others_deduction,
      salary_payable: emp.salary_payable,
      employee_group: emp.employee_group,
      employee_serial: emp.employee_serial,
    });

    setBranchId(emp.project_id);
    setIsSelected(emp.project_id);

    setEndDate(emp.date_of_birth ? dayjs(emp.date_of_birth, 'DD/MM/YYYY').toDate() : null);
    setStartDate(emp.joning_dt ? dayjs(emp.joning_dt, 'DD/MM/YYYY').toDate() : null);
  }, [employeeState?.employee]);

  /* ================= HANDLERS ================= */
  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleOnSelectChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleEndDate = (d: Date | null) => {
    setEndDate(d);
    setFormData((p: any) => ({
      ...p,
      dob: d ? dayjs(d).format('DD/MM/YYYY') : '',
    }));
  };

  const handleStartDate = (d: Date | null) => {
    setStartDate(d);
    setFormData((p: any) => ({
      ...p,
      joining_date: d ? dayjs(d).format('DD/MM/YYYY') : '',
    }));
  };

  const handleBranchChange = (e: any) => {
    const val = Number(e.target.value);
    setBranchId(Number.isNaN(val) ? null : val);
  };

  /* ================= UPDATE ================= */
  const handleUpdate = async () => {
    setSaveLoading(true);

    const payload = {
      ...formData,
      project_id: branchId,
      status: formData.status === 'Active' ? 1 : 0,
    };

    try {
      await dispatch(updateEmployee({ id, data: payload })).unwrap();
      toast.success('Employee updated successfully');
      navigate('/hrms/employee/list');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update employee');
    } finally {
      setSaveLoading(false);
    }
  };

  if (employeeState.loading) return <Loader />;

  /* ================= JSX (UNCHANGED UI) ================= */
  return (
    <>
      <HelmetTitle title="Employee Edit" />
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <InputElement
            id="name"
            placeholder='Enter employee name'
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />

          <InputElement
            id="father_name"
            placeholder="Enter father's name"
            label="Father's Name"
            name="father_name"
            value={formData.father_name}
            onChange={handleChange}
          />

          <InputElement
            id="nid"
            placeholder='Enter NID'
            label="National ID"
            name="nid"
            value={formData.nid}
            onChange={handleChange}
          />

          <InputElement
            placeholder='Enter present address'
            id="present_address"
            label="Present Address"
            name="present_address"
            value={formData.present_address}
            onChange={handleChange}
            className="md:col-span-2 lg:col-span-2"
          />

          <InputElement
            id="permanent_address"
            placeholder='Enter permanent address'
            label="Permanent Address"
            name="permanent_address"
            value={formData.permanent_address}
            onChange={handleChange}
            className="md:col-span-2 lg:col-span-2"
          />

          <InputElement
            placeholder='Enter mobile number'
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
            placeholder='Enter Qualification'
            id="qualification"
            label="Qualification"
            name="qualification"
            value={formData.qualification}
            onChange={handleChange}
          />


          <InputElement
            placeholder='Enter basic salary'
            id="basic_salary"
            label="Basic Salary"
            name="basic_salary"
            value={formData.basic_salary}
            onChange={handleChange}
          />

          <InputElement
            placeholder='Enter house rent'
            id="house_rent"
            label="House Rent"
            name="house_rent"
            value={formData.house_rent}
            onChange={handleChange}
          />

          <InputElement
            placeholder='Enter medical allowance'
            id="medical"
            label="Medical Allowance"
            name="medical"
            value={formData.medical}
            onChange={handleChange}
          />

          <InputElement
            placeholder='Enter others allowance'
            id="others_allowance"
            label="Others Allowance"
            name="others_allowance"
            value={formData.others_allowance}
            onChange={handleChange}
          />

          <InputElement
            placeholder='Enter loan deduction'
            id="loan_deduction"
            label="Loan Deduction"
            name="loan_deduction"
            value={formData.loan_deduction}
            onChange={handleChange}
          />

          <InputElement
            placeholder='Enter others deduction'
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
                defaultValue={isSelected.toString()}
                onChange={handleBranchChange}
                className="w-full font-medium text-sm p-1.5"
                branchDdl={dropdownData}
              />
            </div>
          </div>
          <DropdownCommon
            id="sex"
            name="sex"
            label="Gender"
            onChange={handleOnSelectChange}
            className="h-[2.1rem] bg-transparent"
            value={formData.sex}
            data={sex}
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
            label="Status"
            onChange={handleOnSelectChange}
            className="h-[2.1rem] bg-transparent"
            defaultValue={formData?.status}
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
        {/* শুধু Save button → Update */}
        <div className="flex justify-end gap-2 mt-4">
          <ButtonLoading
            onClick={handleUpdate}
            buttonLoading={saveLoading}
            disabled={saveLoading}
            label="Update"
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

export default EmployeeEdit;
