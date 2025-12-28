import React, { useEffect, useMemo, useState } from "react";
import { FiSave, FiPrinter } from "react-icons/fi";
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
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import { employeeGroup } from "../../../utils/fields/DataConstant";
import LoaderDots from "../../../utils/LoaderDots";
import MonthDropdown from "../../../utils/components/MonthDropdown";

/* ================= TYPES ================= */
interface SalaryRow {
  id: number;
  serial_no: number;
  name: string;
  designation_name: string;
  basic_salary: number;
  others_allowance: number;
  loan_deduction: number;
  net_deduction: number;
}

/* ================= COMPONENT ================= */
const SalarySheetGenerate = ({ user }: any) => {
  const dispatch = useDispatch<any>();

  const { salaryEmployees, loading, error } = useSelector(
    (state: any) => state.salary
  );
  const branchDdlData = useSelector((state: any) => state.branchDdl);

  const [employees, setEmployees] = useState<SalaryRow[]>([]);
  const [branchId, setBranchId] = useState<number>(user?.branch_id ?? 8);
  const [groupId, setGroupId] = useState<string>("");
  const [monthId, setMonthId] = useState<string>("");
  const [searched, setSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  /* ================= INIT ================= */
  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  /* ================= FETCH DATA ================= */
  const handleSearchButton = () => {
    if (!branchId) return;
    setSearched(true); // ✅ important
    setSearchLoading(true);

    setEmployees([]);

    dispatch(
      salaryView({
        branch_id: branchId,
        group_id: Number(groupId),
        month_id: monthId,
      })
    );
    setTimeout(() => {
      setSearchLoading(false);
    }, 500);
  };


  /* ================= MAP API DATA ================= */
  useEffect(() => {
    const list = salaryEmployees?.data;

    // Search done + API returned empty
    if (searched && Array.isArray(list) && list.length === 0) {
      setEmployees([]);
      return;
    }

    // Search done + API returned data
    if (Array.isArray(list) && list.length > 0) {
      setEmployees(
        list.map((emp: any) => ({
          id: emp.id,
          serial_no: emp.serial_no,
          name: emp.name,
          designation_name: emp.designation_name,
          basic_salary: Number(emp.basic_salary) || 0,
          others_allowance: Number(emp.others_allowance) || 0,
          loan_deduction: Number(emp.loan_deduction) || 0,
          net_deduction: Number(emp.others_deduction) || 0,
        }))
      );
    }
  }, [salaryEmployees, searched]);


  /* ================= HANDLERS ================= */
  const handleInputChange = (
    id: number,
    field: keyof SalaryRow,
    value: string
  ) => {
    const num = Number(value);
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id ? { ...emp, [field]: isNaN(num) ? 0 : num } : emp
      )
    );
  };

  /* ================= CALCULATIONS ================= */
  const totalSalary = (emp: SalaryRow) => emp.basic_salary + emp.others_allowance;

  const netSalary = (emp: SalaryRow) => totalSalary(emp) - (emp.loan_deduction + emp.net_deduction);

  const grandTotals = useMemo(() => {
    return employees.reduce((acc, emp) => {
      acc.basic_salary += emp.basic_salary;
      acc.others_allowance += emp.others_allowance;
      acc.total_salary += totalSalary(emp);
      acc.loan_deduction += emp.loan_deduction;
      acc.net_deduction += emp.net_deduction;
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
  }, [employees]);

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
      key: "basic_salary",
      header: "Basic",
      headerClass: "text-right w-24",
      cellClass: "text-right",
      render: (row: SalaryRow) => (
        <InputElement
          type="number"
          value={row.basic_salary}
          className="text-right w-24 !md:w-20"
          onChange={(e) =>
            handleInputChange(row.id, "basic_salary", e.target.value)
          }
        />
      ),
    },
    {
      key: "others_allowance",
      header: "Allowance",
      headerClass: "text-right w-24",
      cellClass: "text-right",
      render: (row: SalaryRow) => (
        <InputElement
          type="number"
          value={row.others_allowance}
          className="text-right w-24 !md:w-20"
          onChange={(e) =>
            handleInputChange(row.id, "others_allowance", e.target.value)
          }
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
    {
      key: "loan_deduction",
      header: "Loan",
      headerClass: "text-right w-24",
      cellClass: "text-right",
      render: (row: SalaryRow) => (
        <InputElement
          type="number"
          value={row.loan_deduction}
          className="text-right w-24 !md:w-20"
          onChange={(e) =>
            handleInputChange(row.id, "loan_deduction", e.target.value)
          }
        />
      ),
    },
    {
      key: "net_deduction",
      header: "Other Ded.",
      headerClass: "text-right w-24",
      cellClass: "text-right w-24",
      render: (row: SalaryRow) => (
        <InputElement
          type="number"
          value={row.net_deduction}
          className="text-right w-24 !md:w-20"
          onChange={(e) =>
            handleInputChange(row.id, "net_deduction", e.target.value)
          }
        />
      ),
    },
    {
      key: "net_salary",
      header: "Net Salary",
      headerClass: "text-right w-28",
      cellClass: "text-right font-bold text-green-700 dark:text-green-400",
      render: (row: SalaryRow) =>
        thousandSeparator(netSalary(row), 0),
    },
  ];

  // ✅ keep your dropdown handler (same behavior)
  const handleOnSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setGroupId(value.toString());
  };
  const handleOnMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMonthId(value.toString());
  };

  const handleSalaryGenerate = async () => {
    setSaveLoading(true);
    try {
      const response = await dispatch(salaryGenerate(employees)).unwrap();

      // toast.success(response.message);
    } catch (err: any) {
      // toast.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div>
      <HelmetTitle title="Salary Sheet Generate" />

      {/* ===== Top Bar ===== */}
      <div className="flex justify-between items-center mb-2 ">
        <div className="max-w-280 flex ">
          <BranchDropdown
            defaultValue={branchId?.toString()}
            onChange={(e: any) => setBranchId(Number(e.target.value))}
            className="font-medium text-sm p-2 w-full mr-2"
            branchDdl={branchDdlData?.protectedData?.data || []}
          />
          <DropdownCommon
            id="employee_group"
            name="employee_group"
            onChange={handleOnSelectChange}
            className="h-[2.3rem] bg-transparent"
            data={employeeGroup}
          />

          <MonthDropdown
            id="month_id"
            name="month_id" 
            className="h-[2.3rem] bg-transparent ml-2 mr-2"
            onChange={handleOnMonthChange}
          />

          <ButtonLoading
            onClick={handleSearchButton}
            buttonLoading={searchLoading}
            disabled={searchLoading}
            label="Search"
            className="whitespace-nowrap p-2 ml-2"
          />

        </div>

        <div className="flex gap-2">
          <ButtonLoading
            onClick={handleSalaryGenerate}
            buttonLoading={saveLoading}
            disabled={saveLoading}
            label="Save Salary"
            icon={<FiSave className="mr-2" />}
            className="whitespace-nowrap p-2"
          />
          <ButtonLoading
            onClick={() => window.print()}
            label="Print"
            icon={<FiPrinter className="mr-2" />}
          />
        </div>
      </div>

      {loading && <Loader />}


      {/* ===== TABLE ===== */}
      <Table columns={columns} data={searched ? employees : []} />

      {/* ===== FOOTER ===== */}
      <div className="mt-2 p-3 text-sm text-gray-700 dark:text-gray-300 dark:bg-gray-800 rounded-b-sm flex justify-between items-center">
        <div>
          Total Employees:{" "}
          <span className="font-semibold">{employees.length}</span>
        </div>

        <div className="flex gap-6">
          <div>
            Total Salary:{" "}
            <span className="font-semibold">
              {thousandSeparator(grandTotals.total_salary, 0)}
            </span>
          </div>

          <div className="font-bold text-green-700 dark:text-green-400">
            Net Total:{" "}
            {thousandSeparator(grandTotals.net_salary, 0)}
          </div>
        </div>
      </div>

    </div>
  );
};

export default SalarySheetGenerate;