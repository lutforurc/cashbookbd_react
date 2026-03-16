import React, { useEffect, useMemo, useState } from "react";
import { FiGift, FiSave, FiSearch, FiTrash2 } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import Loader from "../../../../common/Loader";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { fetchEmployeeSettings } from "../employee/employeeSlice";
import { festivalBonusGenerate, festivalBonusView } from "./bonusSlice";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import MonthDropdown from "../../../utils/components/MonthDropdown";
import MultiSelectDropdown from "../../../utils/utils-functions/MultiSelectDropdown";
import InputElement from "../../../utils/fields/InputElement";
import Table from "../../../utils/others/Table";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import ConfirmModal from "../../../utils/components/ConfirmModalProps";

const BONUS_TEMPLATES = [
  { value: "Durga-puja Bonus", label: "Durga-puja Bonus" },
  { value: "Eid-ul-Fitr Bonus", label: "Eid-ul-Fitr Bonus" },
  { value: "Eid-ul-Adha Bonus", label: "Eid-ul-Adha Bonus" },
  { value: "Pohela Boishakh Bonus", label: "Pohela Boishakh Bonus" },
  { value: "Special Festival Bonus", label: "Special Festival Bonus" },
  { value: "Other", label: "Other" },
];

const FestivalBonusGenerate = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const { loading } = useSelector((state: any) => state.festivalBonus);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const employeeSettings = useSelector((state: any) => state.employees);

  const [employees, setEmployees] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<string | number>(user?.branch_id ?? "");
  const [monthId, setMonthId] = useState<string>("");
  const [monthText, setMonthText] = useState<string>("");
  const [bonusTitle, setBonusTitle] = useState<string>("Eid-ul-Fitr Bonus");
  const [customBonusTitle, setCustomBonusTitle] = useState<string>("");
  const [bonusPercent, setBonusPercent] = useState<string>("50");
  const [designationLevel, setDesignationLevel] = useState<any[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<any[]>([]);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDeleteEmployee, setSelectedDeleteEmployee] = useState<any | null>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(fetchEmployeeSettings());
  }, [dispatch]);

  useEffect(() => {
    setDesignationLevel(
      employeeSettings?.employeeSettings?.data?.data?.designationLevels || []
    );
  }, [employeeSettings]);

  useEffect(() => {
    if (branchDdlData?.protectedData?.data) {
      const baseData = branchDdlData.protectedData.data;
      if (settings?.data?.branch?.branch_types_id === 1) {
        setDropdownData([{ id: "", name: "All Projects" }, ...baseData]);
      } else {
        setDropdownData(baseData);
      }
    }
  }, [branchDdlData?.protectedData?.data, settings?.data?.branch?.branch_types_id]);

  const designationLevelOptions = designationLevel.map((item: any) => ({
    value: item.id,
    label: item.name,
  }));
  const bonusTitleOptions = BONUS_TEMPLATES.map((item) => ({
    id: item.value,
    name: item.label,
  }));

  const resolvedBonusTitle =
    bonusTitle === "Other" ? customBonusTitle.trim() : bonusTitle.trim();
  const resolvedPercent = Number(bonusPercent || 0);

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setMonthId(event.target.value);
    setMonthText(event.target.selectedOptions[0]?.text || "");
  };

  const handleSearch = async () => {
    if (!monthId) {
      toast.info("Please select bonus month");
      return;
    }

    if (!resolvedBonusTitle) {
      toast.info("Please select bonus title");
      return;
    }

    if (resolvedPercent <= 0) {
      toast.info("Bonus percent must be greater than 0");
      return;
    }

    setSearchLoading(true);
    setEmployees([]);

    try {
      const response = await dispatch(
        festivalBonusView({
          branch_id: Number(branchId),
          month_id: monthId,
          bonus_title: resolvedBonusTitle,
          level_ids: selectedLevels.map((item: any) => item.value),
        })
      ).unwrap();

      const mapped = (response?.data?.data || []).map((employee: any, index: number) => {
        const basicSalary = Number(employee.basic_salary) || 0;
        const percent = Number(bonusPercent) || 0;
        return {
          ...employee,
          serial_no: index + 1,
          designation_name: employee.designations?.name || employee.designation_name || "",
          basic_salary: basicSalary,
          bonus_percent: percent,
          bonus_amount: Math.round((basicSalary * percent) / 100),
        };
      });

      setEmployees(mapped);
      if (mapped.length > 0) {
        toast.success(response?.message || "Eligible employees loaded successfully");
      } else {
        toast.info("No eligible employee found for this bonus");
      }
    } catch (error: any) {
      toast.error(typeof error === "string" ? error : error?.message || "Bonus data load failed");
    } finally {
      setSearchLoading(false);
    }
  };

  const totalEmployees = employees.length;
  const totalBasic = useMemo(
    () => employees.reduce((sum, row) => sum + Number(row.basic_salary || 0), 0),
    [employees]
  );
  const totalBonus = useMemo(
    () => employees.reduce((sum, row) => sum + Number(row.bonus_amount || 0), 0),
    [employees]
  );

  const handleGenerate = async () => {
    if (employees.length === 0) {
      toast.info("Please load employee list first");
      return;
    }

    const payloadEmployees = employees
      .map((row) => {
        const employeeId = Number(row?.id ?? row?.employee_id ?? 0);

        if (!employeeId) {
          return null;
        }

        return {
          ...row,
          id: employeeId,
          employee_id: employeeId,
          basic_salary: Number(row?.basic_salary || 0),
          bonus_percent: Number(row?.bonus_percent || 0),
          bonus_amount: Number(row?.bonus_amount || 0),
          name: row?.name || "",
          designation_name: row?.designation_name || row?.designations?.name || "",
        };
      })
      .filter(Boolean);

    if (payloadEmployees.length === 0) {
      toast.info("No valid employee found to generate bonus");
      return;
    }

    setSaveButtonLoading(true);
    try {
      const response = await dispatch(
        festivalBonusGenerate({
          branch_id: Number(branchId),
          month_id: monthId,
          bonus_title: resolvedBonusTitle,
          bonus_percent: resolvedPercent,
          level_ids: selectedLevels.map((item: any) => item.value),
          employees: payloadEmployees,
        })
      ).unwrap();

      toast.success(response?.message || "Bonus generated successfully");
      setShowConfirm(false);
      setEmployees([]);
    } catch (error: any) {
      toast.error(typeof error === "string" ? error : error?.message || "Bonus generation failed");
    } finally {
      setSaveButtonLoading(false);
    }
  };

  const handleDeleteClick = (employee: any) => {
    setSelectedDeleteEmployee(employee);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirmed = () => {
    if (!selectedDeleteEmployee) return;

    setEmployees((prev) =>
      prev
        .filter((row) => row.id !== selectedDeleteEmployee.id)
        .map((row, index) => ({
          ...row,
          serial_no: index + 1,
        }))
    );

    toast.success("Employee removed from bonus list");
    setShowDeleteConfirm(false);
    setSelectedDeleteEmployee(null);
  };

  const columns = [
    { key: "serial_no", header: "SL", headerClass: "text-center", cellClass: "text-center font-semibold" },
    {
      key: "name",
      header: "Employee",
      render: (row: any) => (
        <>
          <div className="font-semibold">{row.name}</div>
          <div className="text-xs text-slate-500">{row.designation_name || "-"}</div>
        </>
      ),
    },
    {
      key: "basic_salary",
      header: "Basic Salary",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => thousandSeparator(row.basic_salary, 0),
    },
    {
      key: "bonus_percent",
      header: "Bonus %",
      headerClass: "text-center",
      cellClass: "text-center",
      render: (row: any) => `${Number(row.bonus_percent || 0).toFixed(2)}%`,
    },
    {
      key: "bonus_amount",
      header: "Bonus Amount",
      headerClass: "text-right",
      cellClass: "text-right font-semibold text-blue-600 dark:text-blue-400",
      render: (row: any) => thousandSeparator(row.bonus_amount, 0),
    },
    {
      key: "action",
      header: "Action",
      headerClass: "text-center",
      cellClass: "text-center",
      render: (row: any) => (
        <button
          type="button"
          onClick={() => handleDeleteClick(row)}
          className="inline-flex items-center justify-center text-red-600 transition hover:text-red-700"
          title="Remove from bonus list"
        >
          <FiTrash2 className="text-lg" />
        </button>
      ),
    },
  ];

  return (
    <>
      <HelmetTitle title="Bonus Generate" />
      {(loading || searchLoading) && <Loader />}

      <div className="space-y-2">
        <div className="rounded-sm border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                <FiGift className="h-4 w-4" />
                HRM Bonus Module
              </div>
              <p className="mt-0 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Generate festival bonus batches based on a fixed percentage of basic salary.
              </p>
              <p className="hidden">
                Basic salary-এর নির্দিষ্ট percentage অনুযায়ী Eid, Boishakh বা special bonus batch তৈরি করুন।
              </p>
              <p className="hidden">
                Basic salary-এর নির্দিষ্ট percentage অনুযায়ী Eid, Boishakh বা special bonus batch তৈরি করুন।
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-sm border-slate-200  dark:border-slate-700 ">
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white">Bonus % of Basic</label>
                  <InputElement
                    value={bonusPercent}
                    onChange={(e) => setBonusPercent(e.target.value)}
                    type="number"
                    inputMode="decimal"
                    className="w-full h-8.5"
                  />
                </div>
                <div className="flex items-end">
                  <ButtonLoading
                    onClick={handleSearch}
                    label="Load Employees"
                    icon={<FiSearch className="h-4 w-4" />}
                    className="w-full whitespace-nowrap h-8.5  xl:w-auto"
                  />
                </div>
              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 text-sm md:min-w-[320px]">
              <div className="rounded-sm border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-slate-500 dark:text-slate-400">Eligible Employees</div>
                <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{totalEmployees}</div>
              </div>
              <div className="rounded-sm border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="text-slate-500 dark:text-slate-400">Projected Bonus</div>
                <div className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {thousandSeparator(totalBonus, 0)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-sm border-slate-200  dark:border-slate-700 ">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white">Branch</label>
              <BranchDropdown
                defaultValue={branchId?.toString()}
                onChange={(e: any) => {
                  const value = e.target.value;
                  setBranchId(value === "" ? "" : Number(value));
                }}
                className="w-60 font-medium text-sm p-2 mr-2"
                branchDdl={dropdownData}
              />
            </div>

            <div className="rounded-sm border-slate-200  dark:border-slate-700 ">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-white">Bonus Month</label>
              <MonthDropdown
                id="bonus_month_id"
                name="bonus_month_id"
                value={monthId}
                onChange={handleMonthChange}
                className="h-8.5 bg-transparent min-w-35"
              />
            </div>

            <div className="rounded-sm border-slate-200  dark:border-slate-700 ">
              <DropdownCommon
                id="bonus_title"
                name="bonus_title"
                label="Bonus Title"
                onChange={(e) => setBonusTitle(e.target.value)}
                value={bonusTitle}
                className="h-9 bg-transparent"
                data={bonusTitleOptions}
              />
            </div>
            <div className="rounded-sm border-slate-200  dark:border-slate-700 ">
              <label className="mb-1block text-sm font-medium text-slate-700 dark:text-white">Designation Level</label>
              <MultiSelectDropdown
                options={designationLevelOptions}
                value={selectedLevels}
                onChange={setSelectedLevels}
                placeholder="All levels"
                className="h-8"
              />
            </div>

          </div>

          {bonusTitle === "Other" && (
            <div className="rounded-sm border-slate-200  dark:border-slate-700 ">
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-white">Custom Bonus Title</label>
              <InputElement value={customBonusTitle} onChange={(e) => setCustomBonusTitle(e.target.value)} className="w-full" />
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto]">



          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 rounded-sm border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 md:grid-cols-3">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Bonus Title</span>
              <div className="font-semibold text-slate-900 dark:text-slate-100">{resolvedBonusTitle || "Not selected"}</div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Bonus Month</span>
              <div className="font-semibold text-slate-900 dark:text-slate-100">{monthText || "Not selected"}</div>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Rate</span>
              <div className="font-semibold text-slate-900 dark:text-slate-100">{resolvedPercent.toFixed(2)}%</div>
            </div>
          </div>
        </div>

        {employees.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-sm border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="text-sm text-slate-500 dark:text-slate-400">Total Basic Salary</div>
                <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{thousandSeparator(totalBasic, 0)}</div>
              </div>
              <div className="rounded-sm border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="text-sm text-slate-500 dark:text-slate-400">Total Bonus Amount</div>
                <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">{thousandSeparator(totalBonus, 0)}</div>
              </div>
              <div className="rounded-sm border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="text-sm text-slate-500 dark:text-slate-400">Employees in Batch</div>
                <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{totalEmployees}</div>
              </div>
            </div>

            <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
              <Table columns={columns} data={employees} perPage={20} />
              <div className="mt-5 flex justify-end">
                <ButtonLoading onClick={() => setShowConfirm(true)} buttonLoading={saveButtonLoading} label="Generate Bonus Sheet" icon={<FiSave className="h-4 w-4" />} className="bg-blue-600 px-5 py-2 hover:bg-blue-700" />
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        show={showConfirm}
        title="Confirm Festival Bonus"
        message={
          <>
            Create bonus batch
            <span className="mt-1 block font-bold">{resolvedBonusTitle}</span>
            <span className="mt-1 block text-sm font-normal text-slate-600">
              Month: {monthText || "-"} | Employees: {totalEmployees} | Amount: {thousandSeparator(totalBonus, 0)}
            </span>
          </>
        }
        loading={saveButtonLoading}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleGenerate}
        className="bg-blue-600 hover:bg-blue-700"
      />

      <ConfirmModal
        show={showDeleteConfirm}
        title="Remove Employee"
        message={
          <>
            Remove from bonus list
            <span className="mt-1 block font-bold">{selectedDeleteEmployee?.name || "-"}</span>
            <span className="mt-1 block text-sm font-normal text-slate-600">
              {selectedDeleteEmployee?.designation_name || "Employee"}
            </span>
          </>
        }
        loading={false}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedDeleteEmployee(null);
        }}
        onConfirm={handleDeleteConfirmed}
        className="bg-red-600 hover:bg-red-700"
      />
    </>
  );
};

export default FestivalBonusGenerate;
