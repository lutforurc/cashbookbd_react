import React, { useEffect, useMemo, useState } from "react";
import { FiSave, FiPrinter, FiTrash2, FiSearch } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { salaryGenerate, salaryView } from "./salarySlice";
import InputElement from "../../../utils/fields/InputElement";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import Table from "../../../utils/others/Table";
import MonthDropdown from "../../../utils/components/MonthDropdown";
import { toast } from "react-toastify";
import { fetchEmployeeSettings } from "../employee/employeeSlice";
import ConfirmModal from "../../../utils/components/ConfirmModalProps";
import MultiSelectDropdown from "../../../utils/utils-functions/MultiSelectDropdown";

/* ================= TYPES ================= */
interface SalaryRow {
  id: number;
  serial_no: number;
  name: string;
  designation_name: string;

  basic_salary: number;
  others_allowance: number;

  // ✅ API ডাটায় আসল টাকাটা এখানে আছে (string/number হতে পারে)
  loan_balance: number;

  // optional: API তে আছে কিন্তু আপাতত ব্যবহার করছি না
  loan_deduction: number;

  net_deduction: number;
  working_days: number;
}

/* ================= COMPONENT ================= */
const SalarySheetGenerate = ({ user }: any) => {
  const dispatch = useDispatch<any>();

  const { loading } = useSelector((state: any) => state.salary);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  const employeeSettings = useSelector((state: any) => state.employees);

  const [employees, setEmployees] = useState<SalaryRow[]>([]);
  const [branchId, setBranchId] = useState<string | number>(user?.branch_id ?? "");
  const [designationLevel, setDesignationLevel] = useState<any[]>([]);
  const [monthId, setMonthId] = useState<string>("");
  const [monthText, setMonthText] = useState<string>("");
  const [selectedMonthDays, setSelectedMonthDays] = useState<number>(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  );

  const [searched, setSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [designationLevels, setDesignationLevels] = useState<any[]>([]);
  const roundUpToNearestTen = (value: number) => Math.ceil(value / 10) * 10;

  /* ================= INIT ================= */
  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(fetchEmployeeSettings());
  }, [dispatch, user]);

  useEffect(() => {
    setDesignationLevel(
      employeeSettings?.employeeSettings?.data?.data?.designationLevels || []
    );
  }, [employeeSettings]);

  const designationLevelOptions = designationLevel.map((d: any) => ({
    value: d.id,
    label: d.name,
  }));

  /* ================= FETCH DATA ================= */
  const handleSearchButton = async () => {
    if (!monthId) {
      toast.info("Please select month");
      return;
    }

    setSearched(true);
    setSearchLoading(true);
    setEmployees([]);

    try {
      const response = await dispatch(
        salaryView({
          branch_id: Number(branchId),
          level_ids: designationLevels.map((l: any) => l.value),
          month_id: monthId,
        })
      ).unwrap();

      const list = response?.data?.data ?? [];

      // ✅ IMPORTANT: API shape -> SalaryRow shape
      const mapped: SalaryRow[] = list.map((emp: any) => ({
        id: emp.id,
        serial_no: Number(emp.serial_no ?? emp.employee_serial) || 0,
        name: emp.name,
        designation_name: emp.designation_name,

        basic_salary: roundUpToNearestTen(Number(emp.basic_salary) || 0),
        others_allowance: roundUpToNearestTen(Number(emp.others_allowance) || 0),

        // ✅ loan_balance sometimes string ("3000") so force Number
        loan_balance: Number(emp.loan_balance) || 0,

        // keep it (API has it but is 0 now)
        loan_deduction: Number(emp.loan_deduction) || 0,

        net_deduction: Number(emp.others_deduction) || 0,
        working_days: selectedMonthDays,
      }));

      setEmployees(mapped);

      if (mapped.length > 0) {
        toast.success(response.message || "Salary data fetched successfully");
      } else {
        toast.info("No salary data found");
      }
    } catch (error: any) {
      toast.info(error);
    } finally {
      setSearchLoading(false);
    }
  };

  /* ================= HANDLERS ================= */
  const handleInputChange = (id: number, field: keyof SalaryRow, value: string) => {
    const num = Number(value);
    setEmployees((prev) =>
      prev.map((emp) =>
        String(emp.id) === String(id) ? { ...emp, [field]: isNaN(num) ? 0 : num } : emp
      )
    );
  };

  /* ================= CALCULATIONS ================= */
  const proratedAmount = (amount: number, days: number) => {
    const monthDays = selectedMonthDays > 0 ? selectedMonthDays : 30;
    if (days <= 0 || monthDays <= 0) return 0;
    return roundUpToNearestTen((amount / monthDays) * days);
  };

  const proratedBasicSalary = (emp: SalaryRow) =>
    proratedAmount(Number(emp.basic_salary) || 0, Number(emp.working_days) || 0);

  const proratedOtherAllowance = (emp: SalaryRow) =>
    proratedAmount(Number(emp.others_allowance) || 0, Number(emp.working_days) || 0);

  const totalSalary = (emp: SalaryRow) => {
    return proratedBasicSalary(emp) + proratedOtherAllowance(emp);
  };

  const netSalary = (emp: SalaryRow) => {
    const days = Number(emp.working_days) || 0;
    const monthDays = selectedMonthDays > 0 ? selectedMonthDays : 30;
    if (days <= 0 || monthDays <= 0) return 0;
    const roundedGross = totalSalary(emp);
    const loanDed = Number(emp.loan_balance) || 0;
    return Math.max(0, roundedGross - loanDed);
  };

  const grandTotals = useMemo(() => {
    return employees.reduce(
      (acc, emp) => {
        acc.basic_salary += proratedBasicSalary(emp);
        acc.others_allowance += proratedOtherAllowance(emp);
        acc.total_salary += totalSalary(emp);
        acc.loan_deduction += Number(emp.loan_balance) || 0; // ✅ total loan ded = sum loan_balance
        acc.net_deduction += Number(emp.net_deduction) || 0;
        acc.net_salary += netSalary(emp);
        return acc;
      },
      {
        basic_salary: 0,
        others_allowance: 0,
        total_salary: 0,
        loan_deduction: 0,
        net_deduction: 0,
        net_salary: 0,
      }
    );
  }, [employees, selectedMonthDays]);

  /* ================= TABLE COLUMNS ================= */
  const columns = [
    {
      key: "serial_no",
      header: "Sl",
      headerClass: "text-center",
      cellClass: "text-center font-semibold",
    },
    {
      key: "name",
      header: "Employee",
      render: (row: SalaryRow) => (
        <>
          <div className="font-semibold">{row.name}</div>
          <div className="text-xs text-gray-800 dark:text-gray-200">
            {row.designation_name}
          </div>
        </>
      ),
    },
    {
      key: "days",
      header: "Working Day",
      headerClass: "text-right w-24",
      cellClass: "text-right",
      render: (row: SalaryRow) => (
        <InputElement
          type="text"
          value={String(Math.max(0, Number(row.working_days) || 0))}
          className="text-right w-24 !md:w-20"
          inputMode="numeric"
          pattern="[0-9]*"
          onChange={(e) => {
            const rawValue = e.target.value;
            const digitsOnly = rawValue.replace(/\D/g, "");
            const normalizedValue = digitsOnly.replace(/^0+(?=\d)/, "");
            const inputDays = normalizedValue === "" ? 0 : Number(normalizedValue);
            const safeDays = Math.max(
              0,
              Math.min(selectedMonthDays, Number.isFinite(inputDays) ? inputDays : 0)
            );
            setEmployees((prev) =>
              prev.map((emp) =>
                String(emp.id) === String(row.id) ? { ...emp, working_days: safeDays } : emp
              )
            );
          }}
        />
      ),
    },
    {
      key: "basic_salary",
      header: "Basic",
      headerClass: "text-right w-24",
      cellClass: "text-right",
      render: (row: SalaryRow) => (
        <InputElement
          type="number"
          value={proratedBasicSalary(row)}
          className="text-right w-24 !md:w-20"
          onChange={(e) => handleInputChange(row.id, "basic_salary", e.target.value)}
          disabled={true} 
        />
      ),
    },

    {
      key: "others_allowance",
      header: "Mobile Bill",
      headerClass: "text-right w-24",
      cellClass: "text-right",
      render: (row: SalaryRow) => (
        <InputElement
          type="number"
          value={proratedOtherAllowance(row)}
          className="text-right w-24 !md:w-20"
          onChange={(e) => handleInputChange(row.id, "others_allowance", e.target.value)}
          disabled={true} 
        />
      ),
    },
    {
      key: "total",
      header: "Total",
      headerClass: "text-right w-24",
      cellClass: "text-right font-semibold text-green-700 dark:text-green-400 w-24",
      render: (row: SalaryRow) =>
        thousandSeparator(totalSalary(row), 0),
    },

    // ✅ Loan Ded. input এখন loan_balance edit করবে
    {
      key: "loan_balance",
      header: "Loan Ded.",
      headerClass: "text-right w-24",
      cellClass: "text-right",
      render: (row: SalaryRow) => (
        <InputElement
          type="number"
          value={row.loan_balance}
          className="text-right w-24 !md:w-20 font-semibold text-red-600 dark:text-red-400"
          onChange={(e) => handleInputChange(row.id, "loan_balance", e.target.value)}
        />
      ),
    },

    // ✅ Net Salary = Total - loan_balance
    {
      key: "net_salary",
      header: "Net Salary",
      headerClass: "text-right w-28",
      cellClass: "text-right font-bold text-green-700 dark:text-green-400",
      render: (row: SalaryRow) => thousandSeparator(netSalary(row), 0),
    },

    {
      key: "actions",
      header: "Action",
      headerClass: "text-center max-w-10",
      cellClass: "text-center",
      render: (row: SalaryRow) => (
        <button
          onClick={() => setEmployees((prev) => prev.filter((emp) => emp.id !== row.id))}
          className="text-red-600 hover:text-red-800"
        >
          <FiTrash2 className="block w-4 h-4" />
        </button>
      ),
    },
  ];

  /* ================= GENERATE ================= */
  const handleSalaryGenerate = async () => {
    if (!branchId || !monthId) return;

    setSaveButtonLoading(true);

    try {
      // ✅ Backend যদি loan_deduction ফিল্ড চায়,
      // তাহলে loan_balance কে loan_deduction হিসেবে পাঠিয়ে দিন (safe mapping)
      const payloadEmployees = employees.map((e) => ({
        ...e,
        basic_salary: proratedBasicSalary(e),
        others_allowance: proratedOtherAllowance(e),
        loan_balance: Number(e.loan_balance) || 0,

        // ✅ IMPORTANT: save loan_deduction = loan_balance
        loan_deduction: Number(e.loan_balance) || 0,

        net_deduction: Number(e.net_deduction) || 0,
        working_days: Number(e.working_days) || 0,
      }));

      const response = await dispatch(
        salaryGenerate({
          branch_id: Number(branchId),
          level_ids: designationLevels.map((l: any) => Number(l.value)),
          month_id: monthId,
          employees: payloadEmployees,
        })
      ).unwrap();

      if (response.success) {
        toast.success(response.message || "Salary generated successfully");
        setEmployees([]);
        setSearched(false);
      } else {
        toast.error(response.message || "Something went wrong");
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate salary");
    } finally {
      setSaveButtonLoading(false);
      setShowConfirm(false);
    }
  };

  /* ================= BRANCH DDL ================= */
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

  const handleOnMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    setMonthId(value.toString());
    setMonthText(e.target.selectedOptions[0]?.text || "");

    const [monthPart, yearPart] = String(value).split("-");
    const parsedMonth = Number(monthPart);
    const parsedYear = Number(yearPart);

    const now = new Date();
    const fallbackDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysInMonth =
      Number.isFinite(parsedMonth) &&
      parsedMonth >= 1 &&
      parsedMonth <= 12 &&
      Number.isFinite(parsedYear) &&
      parsedYear >= 1900
        ? new Date(parsedYear, parsedMonth, 0).getDate()
        : fallbackDays;

    setSelectedMonthDays(daysInMonth);
    setEmployees((prev) => prev.map((emp) => ({ ...emp, working_days: daysInMonth })));
  };

  /* ================= UI ================= */
  return (
    <div>
      <HelmetTitle title="Salary Generate" />

      {/* ===== Top Bar ===== */}
      <div className="flex justify-between items-center mb-2 ">
        <div className="max-w-280 flex ">
          <BranchDropdown
            defaultValue={branchId?.toString()}
            onChange={(e: any) => {
              const value = e.target.value;
              setBranchId(value === "" ? "" : Number(value));
            }}
            className="w-60 font-medium text-sm p-2 mr-2 "
            branchDdl={dropdownData}
          />

          <div className="mr-2 w-full">
            <MultiSelectDropdown
              options={designationLevelOptions}
              value={designationLevels}
              onChange={setDesignationLevels}
              className="w-60"
            />
          </div>

          <div className="mr-2">
            <MonthDropdown
              id="month_id"
              name="month_id"
              className="h-[2.3rem] bg-transparent ml-2 mr-2 min-w-35"
              onChange={handleOnMonthChange}
            />
          </div>

          <ButtonLoading
            onClick={handleSearchButton}
            buttonLoading={searchLoading}
            disabled={searchLoading}
            label="Search"
            icon={<FiSearch className="mr-2" />}
            className="whitespace-nowrap p-2 ml-2 mr-2"
          />
        </div>

        <div className="flex gap-2">
          {branchId && (
            <ButtonLoading
              onClick={() => {
                if (!branchId || !monthId) {
                  toast.info(!branchId ? "Please select branch" : "Please select month");
                  return;
                }
                setShowConfirm(true);
              }}
              buttonLoading={saveButtonLoading}
              label="Generate Salary"
              className="whitespace-nowrap h-9"
              icon={<FiSave className="mr-2" />}
            />
          )}
        </div>
      </div>

      {loading && <Loader />}

      {/* ===== TABLE ===== */}
      <Table columns={columns} data={searched ? employees : []} />

      {/* ===== FOOTER ===== */}
      <div className="mt-2 p-3 text-sm text-gray-700 dark:text-gray-300 dark:bg-gray-800 rounded-b-sm flex justify-between items-center">
        <div>
          Total Employees: <span className="font-semibold">{employees.length}</span>
        </div>

        <div className="flex gap-6">
          <div>
            Total Salary:{" "}
            <span className="font-semibold">{thousandSeparator(grandTotals.total_salary, 0)}</span>
          </div>
          <div>
            Total Deduction:{" "}
            <span className="font-semibold">{thousandSeparator(grandTotals?.loan_deduction, 0)}</span>
          </div>
          <div className="font-bold text-green-700 dark:text-green-400">
            Net Total: {thousandSeparator(grandTotals.net_salary, 0)}
          </div>
        </div>
      </div>

      <ConfirmModal
        show={showConfirm}
        title="Confirm Salary Generation"
        message={
          <>
            Proceed with salary for <span className="font-bold mt-1">{monthText}</span>
          </>
        }
        loading={saveButtonLoading}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleSalaryGenerate}
        className="bg-blue-400 hover:bg-blue-500"
      />
    </div>
  );
};

export default SalarySheetGenerate;
