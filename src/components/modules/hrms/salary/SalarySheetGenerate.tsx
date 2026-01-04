import React, { useEffect, useMemo, useState } from "react";
import { FiSave, FiPrinter, FiTrash2 } from "react-icons/fi";
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
import MonthDropdown from "../../../utils/components/MonthDropdown";
import { toast } from 'react-toastify';
import { fetchEmployeeSettings } from "../employee/employeeSlice";

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
  const settings = useSelector((state: any) => state.settings);
  const employeeSettings = useSelector((state: any) => state.employees);

  const [employees, setEmployees] = useState<SalaryRow[]>([]);
  const [branchId, setBranchId] = useState<string | number>(user?.branch_id ?? "");
  const [designation, setDesignation] = useState<any[]>([]);
  const [designationLevel, setDesignationLevel] = useState<any[]>([]);
  const [sex, setSex] = useState<any[]>([]);
  const [groupId, setGroupId] = useState<number | undefined>(undefined);
  const [monthId, setMonthId] = useState<string>("");
  const [searched, setSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [designationId, setDesignationId] = useState<number | undefined>(undefined);
  const [designationLevelId, setDesignationLevelId] = useState<number | undefined>(undefined);


  /* ================= INIT ================= */


  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    dispatch(fetchEmployeeSettings());
  }, [dispatch, user]);

  useEffect(() => {
    setDesignation(employeeSettings?.employeeSettings?.data?.data?.designation || []);
    setDesignationLevel(employeeSettings?.employeeSettings?.data?.data?.designationLevels || []);
  }, [employeeSettings, user]);

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
          branch_id: Number(branchId) ,
          level_id: Number(designationLevelId),
          month_id: monthId,
        })
      ).unwrap();

      const list = response?.data?.data ?? [];

      setEmployees(list);

      if (list.length > 0) {
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

  const netSalary = (emp: SalaryRow) => totalSalary(emp) - (emp.loan_deduction);

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
      header: "Mobile Bill",
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
      header: "Loan Ded.",
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
      key: "net_salary",
      header: "Net Salary",
      headerClass: "text-right w-28",
      cellClass: "text-right font-bold text-green-700 dark:text-green-400",
      render: (row: SalaryRow) =>
        thousandSeparator(netSalary(row), 0),
    },
    {
      key: "actions",
      header: "Action",
      headerClass: "text-center max-w-10",
      cellClass: "text-center",
      render: (row: SalaryRow) => (
        <button
          onClick={() => {
            setEmployees((prev) => prev.filter((emp) => emp.id !== row.id));
          }}
          className="text-red-600 hover:text-red-800"
        >
          <FiTrash2 className="block w-4 h-4" />
        </button>
      ),
    }
  ];

  // ✅ keep your dropdown handler (same behavior)
  const handleOnSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numVal = value === "" ? undefined : Number(value);
    if (name === "designation") {
      setDesignationId(numVal);
    } else if (name === "designation_level") {
      setDesignationLevelId(numVal);
    }
  };

  const handleOnMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMonthId(value.toString());
  };



  const handleSalaryGenerate = async () => {
    if (!branchId || !monthId) return;

    setSaveLoading(true);
    try {
      const response = await dispatch(
        salaryGenerate({
          branch_id: Number(branchId),
          level_id: Number(designationLevelId), 
          month_id: monthId,
          employees: employees, 
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
      setSaveLoading(false);
    }
  };

  useEffect(() => {
    if (branchDdlData?.protectedData?.data) if (branchDdlData?.protectedData?.data) {

      const baseData = branchDdlData.protectedData.data;

      if (settings?.data?.branch?.branch_types_id === 1) {
        setDropdownData([
          { id: "", name: 'All Projects' },
          ...baseData,
        ]);
      } else {
        setDropdownData(baseData);
      }
    }
  }, [branchDdlData?.protectedData?.data]);

  const designationLevelAll = [
    { id: '', name: 'All Level' },
    ...designationLevel,
  ];
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
            <DropdownCommon
              id="designation_level"
              name="designation_level"
              label=""
              onChange={handleOnSelectChange}
              className="h-[2.3rem] bg-transparent"
              data={designationLevelAll}
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
            className="whitespace-nowrap p-2 ml-2 mr-2"
          />
        </div>

        <div className="flex gap-2">
          {branchId &&
            <ButtonLoading
              onClick={handleSalaryGenerate}
              buttonLoading={saveLoading}
              disabled={saveLoading}
              label="Generate Salary"
              icon={<FiSave className="mr-2" />}
              className="whitespace-nowrap p-2"
            />
          }
          <ButtonLoading
            onClick={() => window.print()}
            label="Print"
            icon={<FiPrinter className="mr-2" />}
            className="whitespace-nowrap p-2"
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