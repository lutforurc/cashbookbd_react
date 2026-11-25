import React, { useEffect, useState } from 'react';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import { FiList, FiSave } from 'react-icons/fi';
import routes from '../../../services/appRoutes';
import { toast } from 'react-toastify';
import InputElement from '../../../utils/fields/InputElement';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import { isPayable, status } from '../../../utils/fields/DataConstant';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import Loader from '../../../../common/Loader';
import { useDispatch, useSelector } from 'react-redux';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { fetchEmployeeSettings, storeEmployee } from './employeeSlice';
import { fetchAttendancePolicies, fetchAttendanceShifts } from '../attendance/attendanceSlice';
import dayjs from 'dayjs';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { StepCard, StepFooter, stepClass } from '../../../utils/components/FormSteps';
import { FIELD_LABEL } from '../../../../theme/fieldStyles';

const EMPLOYEE_STEPS = ['Personal Information', 'Employment & Attendance', 'Salary & Payroll'];
import { useNavigate } from 'react-router-dom';
import BilingualInput from '../../../utils/fields/BilingualInput';
import { useLanguage } from '../../../../i18n/useLanguage';
import { useTranslation } from 'react-i18next';
import i18n from '../../../../i18n';
import StepRail from '../../../utils/others/StepRail';
import { rl } from '../../../../i18n/reportLabel';

const employmentTypes = [
  { id: 'monthly', name: 'Monthly Employee' },
  { id: 'daily', name: 'Daily Labour' },
  { id: 'shifting', name: 'Shift Based Employee' },
];

const yesNo = [
  { id: 1, name: 'Yes' },
  { id: 0, name: 'No' },
];

class EmployeeFormModel {
  static create() {
    return {
      name: '',
      father_name: '',
      name_local: '',
      father_name_local: '',
      present_address_local: '',
      permanent_address_local: '',
      qualification_local: '',
      present_address: '',
      permanent_address: '',
      nid: '',
      card_no: '',
      department_id: '',
      mobile: '',
      dob: '',
      joining_date: '',
      designation: '8',
      branch: '',
      qualification: '',
      status: '',
      sex: '1',
      basic_salary: '',
      house_rent: '',
      medical: '',
      others_allowance: '',
      loan_deduction: '',
      others_deduction: '',
      salary_payable: '',
      employment_type: 'monthly',
      attendance_policy_id: '',
      default_shift_id: '',
      overtime_eligible: '0',
      manual_attendance: '1',
      daily_wage: '',
      ot_rate: '',
      standard_work_minutes: '480',

      employee_serial: '',
      /**
       * The id the face terminal knows this person by. Left empty, the terminal
       * has nothing to file a punch under until it is filled in on the
       * Attendance Devices screen -- see the Unmatched Punches list.
       */
      device_employee_code: '',
    };
  }
}

const EmployeeCreate = ({ user }: any) => {
  const navigate = useNavigate();
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const employeeSettings = useSelector((state: any) => state.employees);
  const attendance = useSelector((state: any) => state.attendance);
  const dispatch = useDispatch<any>();

  // Blade-like: dob + joining date
  const [startDate, setStartDate] = useState<Date | null>(null); // Joining Date
  const [endDate, setEndDate] = useState<Date | null>(null); // Joining Date 

  const [branchId, setBranchId] = useState<number | null>(null);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [designation, setDesignation] = useState<any[]>([]);
  const [sex, setSex] = useState<any[]>([]);
  const [isSelected, setIsSelected] = useState<number | string>('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [step, setStep] = useState(0);

  const [formData, setFormData] = useState<any>(EmployeeFormModel.create());
  const { localCode, localName } = useLanguage();
  const { t } = useTranslation('common');
  const shifts = Array.isArray(attendance?.shifts) ? attendance.shifts : [];
  const policies = Array.isArray(attendance?.policies) ? attendance.policies : [];

  /* ================= INIT ================= */
  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(fetchEmployeeSettings());
    dispatch(fetchAttendanceShifts());
    dispatch(fetchAttendancePolicies());

    const bId = user?.branch_id ?? user?.user?.branch_id ?? null;

    setIsSelected(bId ?? '');
    setBranchId(bId ?? null);
  }, [dispatch, user]);

  /* ================= SETTINGS DATA (keep your mapping) ================= */
  useEffect(() => {
    // ✅ mapping same as you wrote (not changing your structure)
    setDropdownData(employeeSettings?.employeeSettings?.data?.data?.branchs || []);
    setDesignation(employeeSettings?.employeeSettings?.data?.data?.designation || []);
    setSex(employeeSettings?.employeeSettings?.data?.data?.sex || []);

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
      setStep(0);
      return toast.error('Please enter name');
    }
    if (!formData.father_name) {
      setSaveLoading(false);
      setStep(0);
      return toast.error('Please enter father name');
    }
    // "Enable Bangla" on: what English must have, Bangla must have too.
    if (localCode && !String(formData.name_local || '').trim()) {
      setSaveLoading(false);
      setStep(0);
      return toast.error(t('data.localRequired', { field: 'Name', language: localName }));
    }
    if (localCode && !String(formData.father_name_local || '').trim()) {
      setSaveLoading(false);
      setStep(0);
      return toast.error(t('data.localRequired', { field: "Father's Name", language: localName }));
    }
    if (!formData.mobile) {
      setSaveLoading(false);
      setStep(0);
      return toast.error('Please enter mobile number');
    }
    if (!formData.designation) {
      setSaveLoading(false);
      setStep(1);
      return toast.error('Please select designation');
    }
    if (!formData.dob) {
      setSaveLoading(false);
      setStep(0);
      return toast.error('Please enter date of birth');
    }
    if (!formData.joining_date) {
      setSaveLoading(false);
      setStep(1);
      return toast.error('Please enter date of joining');
    }

    if (!formData.sex) {
      setSaveLoading(false);
      setStep(0);
      return toast.error('Please select gender');
    }

    const payload = {
      name: formData.name,
      father_name: formData.father_name,
      nid: formData.nid,
      card_no: formData.card_no || null,
      department_id: formData.department_id || null,
      designation: formData.designation,
      qualification: formData.qualification,
      date_of_birth: formData.dob,
      joning_dt: formData.joining_date,
      present_address: formData.present_address,
      permanent_address: formData.permanent_address, // ✅ typo fix
      mobile: formData.mobile,
      sex: formData.sex,
      project_id: branchId,
      status: formData.status === '' ? 0 : Number(formData.status),
      basic_salary: formData.basic_salary || '0',
      house_rent: formData.house_rent || '0',
      medical_allowance: formData.medical || '0',
      others_allowance: formData.others_allowance || '0',
      loan_deduction: formData.loan_deduction || '0',
      others_deduction: formData.others_deduction || '0',
      salary_payable: formData.salary_payable || '1',
      employment_type: formData.employment_type || 'monthly',
      attendance_policy_id: formData.attendance_policy_id || null,
      default_shift_id: formData.default_shift_id || null,
      attendance_shift_id: formData.default_shift_id || null,
      overtime_eligible: Number(formData.overtime_eligible || 0),
      manual_attendance: Number(formData.manual_attendance ?? 1),
      daily_wage: formData.daily_wage || '0',
      ot_rate: formData.ot_rate || '0',
      standard_work_minutes: formData.standard_work_minutes || '480',
      employee_serial: formData.employee_serial || '0',
      device_employee_code: formData.device_employee_code || null,
      // The Bangla copies, only where the company has a local language.
      ...(localCode ? {
        name_local: formData.name_local,
        father_name_local: formData.father_name_local,
        present_address_local: formData.present_address_local,
        permanent_address_local: formData.permanent_address_local,
        qualification_local: formData.qualification_local,
      } : {}),
    };

    try {
      const response = await dispatch(storeEmployee(payload)).unwrap();
      toast.success('Employee saved successfully');
      setFormData(EmployeeFormModel.create());
      setStep(0);
      setStartDate(null);
      setEndDate(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save employee');
    } finally {
      setSaveLoading(false); // ✅ এটা সবশেষে execute হবে
    }
  };



  return (
    <>
      <HelmetTitle title="Employee Entry" />
      <div className="p-4">
        {/* Steps down the left, as on Branch Settings. */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <StepRail steps={EMPLOYEE_STEPS} current={step} onSelect={setStep} />
        <div className="min-w-0">
        <StepCard title={EMPLOYEE_STEPS[step]}>
        <div className={stepClass(0, step)}>
            <BilingualInput
              placeholder='Enter employee name'
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              kind="name"
              localValue={formData.name_local || ''}
              onLocalChange={(value) => setFormData((prev: any) => ({ ...prev, name_local: value }))}
            />
            <BilingualInput
              placeholder="Enter father's name"
              label="Father's Name"
              name="father_name"
              value={formData.father_name}
              onChange={handleChange}
              localLabel={t('employeeLocal.father_name')}
              localValue={formData.father_name_local || ''}
              onLocalChange={(value) => setFormData((prev: any) => ({ ...prev, father_name_local: value }))}
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
              id="card_no"
              placeholder="Enter card no"
              label={rl('Card No')}
              name="card_no"
              value={formData.card_no || ''}
              onChange={handleChange}
            />
            <div>
              <label className={FIELD_LABEL}>Date of Birth</label>
              <InputDatePicker
                placeholder="Date of Birth"
                setCurrentDate={handleEndDate}
                className="font-medium text-sm w-full "
                selectedDate={endDate}
                setSelectedDate={setEndDate}
              />
            </div>
            <DropdownCommon
              id="sex"
              name="sex"
              label="Gender"
              onChange={handleOnSelectChange}
              className="bg-transparent"
              value={formData.sex}
              data={sex}
            />
            <InputElement
              placeholder='Enter mobile number'
              id="mobile"
              label="Mobile Number"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
            />
            <BilingualInput
              placeholder='Enter present address'
              label="Present Address"
              name="present_address"
              value={formData.present_address}
              onChange={handleChange}
              localLabel={t('employeeLocal.present_address')}
              localValue={formData.present_address_local || ''}
              onLocalChange={(value) => setFormData((prev: any) => ({ ...prev, present_address_local: value }))}
            />
            <BilingualInput
              placeholder='Enter permanent address'
              label="Permanent Address"
              name="permanent_address"
              value={formData.permanent_address}
              onChange={handleChange}
              localLabel={t('employeeLocal.permanent_address')}
              localValue={formData.permanent_address_local || ''}
              onLocalChange={(value) => setFormData((prev: any) => ({ ...prev, permanent_address_local: value }))}
            />
            <BilingualInput
              placeholder='Enter Qualification'
              label="Qualification"
              name="qualification"
              value={formData.qualification}
              onChange={handleChange}
              localLabel={t('employeeLocal.qualification')}
              localValue={formData.qualification_local || ''}
              onLocalChange={(value) => setFormData((prev: any) => ({ ...prev, qualification_local: value }))}
            />
        </div>
        <div className={stepClass(1, step)}>
            <div>
              <label className={FIELD_LABEL}>Joining Date</label>
              <InputDatePicker
                placeholder="Joining Date"
                setCurrentDate={handleStartDate}
                className="font-medium text-sm w-full "
                selectedDate={startDate}
                setSelectedDate={setStartDate}
              />
            </div>
            <DropdownCommon
              id="designation"
              name="designation"
              label="Select Designation"
              onChange={handleOnSelectChange}
              className="bg-transparent"
              defaultValue={formData?.designation?.toString() ?? ''}
              data={designation}
            />
            {/* Optional: an employee may sit in no department. */}
            <DropdownCommon
              id="department_id"
              name="department_id"
              label={t('department.selectLabel')}
              onChange={handleOnSelectChange}
              className="bg-transparent"
              value={formData.department_id?.toString() ?? ''}
              data={[
                { id: '', name: t('department.none') },
                ...(employeeSettings?.employeeSettings?.data?.data?.departments || []).map((d: any) => ({
                  id: d.id,
                  name: (i18n.language !== 'en' && d.name_local) || d.name,
                })),
              ]}
            />
            <div>
              <label className={FIELD_LABEL}>Select Branch</label>
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
              id="status"
              name="status"
              label="Status"
              onChange={handleOnSelectChange}
              className="bg-transparent"
              defaultValue={formData?.status.toString() ?? ''}
              data={status}
            />
            <DropdownCommon
              id="employment_type"
              name="employment_type"
              label="Attendance Type"
              onChange={handleOnSelectChange}
              className="bg-transparent"
              value={formData.employment_type}
              data={employmentTypes}
            />
            <DropdownCommon
              id="attendance_policy_id"
              name="attendance_policy_id"
              label="Attendance Policy"
              onChange={handleOnSelectChange}
              className="bg-transparent"
              value={formData.attendance_policy_id?.toString() ?? ''}
              data={[{ id: '', name: 'Select Policy' }, ...policies]}
            />
            <DropdownCommon
              id="default_shift_id"
              name="default_shift_id"
              label="Default Shift"
              onChange={handleOnSelectChange}
              className="bg-transparent"
              value={formData.default_shift_id?.toString() ?? ''}
              data={[{ id: '', name: 'Select Shift' }, ...shifts]}
            />
            <DropdownCommon
              id="manual_attendance"
              name="manual_attendance"
              label="Show in Manual Attendance"
              onChange={handleOnSelectChange}
              className="bg-transparent"
              value={formData.manual_attendance?.toString() ?? '1'}
              data={yesNo}
            />
            <DropdownCommon
              id="overtime_eligible"
              name="overtime_eligible"
              label="Overtime Eligible"
              onChange={handleOnSelectChange}
              className="bg-transparent"
              value={formData.overtime_eligible?.toString() ?? '0'}
              data={yesNo}
            />
            <InputElement
              id="standard_work_minutes"
              label="Standard Work Minutes"
              name="standard_work_minutes"
              type="number"
              value={formData.standard_work_minutes}
              onChange={handleChange}
            />
            <InputElement
              id="device_employee_code"
              label="Device Code (face terminal)"
              name="device_employee_code"
              value={formData.device_employee_code}
              onChange={handleChange}
              placeholder="The id enrolled on the terminal"
            />
        </div>
        <div className={stepClass(2, step)}>
            <DropdownCommon
              id="salary_payable"
              name="salary_payable"
              label="Is Payable?"
              onChange={handleOnSelectChange}
              className="bg-transparent"
              defaultValue={formData?.salary_payable?.toString() ?? ''}
              data={isPayable}
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
              id="daily_wage"
              label="Daily Wage"
              name="daily_wage"
              type="number"
              value={formData.daily_wage}
              onChange={handleChange}
            />
            <InputElement
              id="ot_rate"
              label="OT Rate"
              name="ot_rate"
              type="number"
              value={formData.ot_rate}
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
            <InputElement
              id="employee_serial"
              label="Salary Sheet Serial Number"
              name="employee_serial"
              value={formData.employee_serial}
              onChange={handleChange}
            />
        </div>

        {/* ================= BUTTONS ================= */}
        <StepFooter
          steps={EMPLOYEE_STEPS}
          current={step}
          onChange={setStep}
          extra={
            <ButtonLoading
              onClick={() => navigate(routes.hrms_employee_list)}
              buttonLoading={false}
              label="Employee List"
              className="whitespace-nowrap text-center mr-0"
              icon={<FiList className="text-lg mr-2" />}
            />
          }
          finish={
            <ButtonLoading
              onClick={handleSave}
              buttonLoading={saveLoading}
              disabled={saveLoading}
              label="Save"
              className="whitespace-nowrap text-center mr-0"
              icon={<FiSave className="text-lg mr-2" />}
            />
          }
        />
        </StepCard>
        </div>
        </div>
      </div>

    </>
  );
};

export default EmployeeCreate;
