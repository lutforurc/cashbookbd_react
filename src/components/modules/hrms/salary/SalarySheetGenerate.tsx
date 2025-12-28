import React, { useEffect, useState } from "react";
import { FiSave, FiPrinter } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { salaryView } from "./salarySlice";

const SalarySheetGenerate = ({ user }: any) => {
  const dispatch = useDispatch<any>();

  const { salaryEmployees, loading, error } = useSelector(
    (state: any) => state.salary
  );

  const branchDdlData = useSelector((state: any) => state.branchDdl);

  const [employees, setEmployees] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(user?.branch_id || 8);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    if (!branchId) return;

    dispatch(
      salaryView({
        branch_id: branchId,
        group_id: undefined,
        month_id: "12-2025",
      })
    );
  }, [dispatch, branchId]);

  /* ================= MAP DATA ================= */
  useEffect(() => {
    const list = salaryEmployees?.data;

    if (Array.isArray(list)) {
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
    } else {
      setEmployees([]);
    }
  }, [salaryEmployees]);

  /* ================= HANDLERS ================= */
  const handleInputChange = (id: number, field: string, value: string) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id ? { ...emp, [field]: Number(value) || 0 } : emp
      )
    );
  };

  const totalSalary = (emp: any) =>
    emp.basic_salary + emp.others_allowance;

  const netSalary = (emp: any) =>
    totalSalary(emp) - (emp.loan_deduction + emp.net_deduction);

  const grandTotals = employees.reduce(
    (acc, emp) => {
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

  /* ================= UI ================= */
  return (
    <div>
      <HelmetTitle title="Salary Sheet Generate" />

      {/* ===== Top Filter Bar (Employees style) ===== */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2">
          <BranchDropdown
            defaultValue={branchId}
            onChange={(e: any) => setBranchId(Number(e.target.value))}
            className="w-60 font-medium text-sm p-2"
            branchDdl={branchDdlData?.protectedData?.data || []}
          />
        </div>

        <div className="flex gap-2">
          <ButtonLoading
            onClick={() => {}}
            buttonLoading={false}
            label="Save Salary"
            icon={<FiSave />}
            className="whitespace-nowrap p-2"
          />
          <ButtonLoading
            onClick={() => window.print()}
            buttonLoading={false}
            label="Print"
            icon={<FiPrinter />}
            className="whitespace-nowrap p-2"
          />
        </div>
      </div>

      {/* ===== Content ===== */}
      <div className="relative overflow-x-auto bg-white rounded shadow">
        {loading && <Loader />}

        {error && (
          <div className="p-4 text-center text-red-600 font-semibold">
            {error}
          </div>
        )}

        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="border px-3 py-2 text-center">Sl</th>
              <th className="border px-3 py-2">Employee</th>
              <th className="border px-3 py-2 text-right">Basic</th>
              <th className="border px-3 py-2 text-right">Allowance</th>
              <th className="border px-3 py-2 text-right">Total</th>
              <th className="border px-3 py-2 text-right">Loan</th>
              <th className="border px-3 py-2 text-right">Other Ded.</th>
              <th className="border px-3 py-2 text-right">Net Salary</th>
            </tr>
          </thead>

          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="border px-3 py-2 text-center">
                  {emp.serial_no}
                </td>
                <td className="border px-3 py-2">
                  <div className="font-semibold">{emp.name}</div>
                  <div className="text-xs text-gray-600">
                    {emp.designation_name}
                  </div>
                </td>

                <td className="border px-2 py-2">
                  <input
                    type="number"
                    value={emp.basic_salary}
                    onChange={(e) =>
                      handleInputChange(
                        emp.id,
                        "basic_salary",
                        e.target.value
                      )
                    }
                    className="w-full text-right border rounded px-2 py-1 text-black-2"
                  />
                </td>

                <td className="border px-2 py-2">
                  <input
                    type="number"
                    value={emp.others_allowance}
                    onChange={(e) =>
                      handleInputChange(
                        emp.id,
                        "others_allowance",
                        e.target.value
                      )
                    }
                    className="w-full text-right border rounded px-2 py-1"
                  />
                </td>

                <td className="border px-3 py-2 text-right font-semibold bg-blue-50">
                  {thousandSeparator(totalSalary(emp), 0)}
                </td>

                <td className="border px-2 py-2">
                  <input
                    type="number"
                    value={emp.loan_deduction}
                    onChange={(e) =>
                      handleInputChange(
                        emp.id,
                        "loan_deduction",
                        e.target.value
                      )
                    }
                    className="w-full text-right border rounded px-2 py-1"
                  />
                </td>

                <td className="border px-2 py-2">
                  <input
                    type="number"
                    value={emp.net_deduction}
                    onChange={(e) =>
                      handleInputChange(
                        emp.id,
                        "net_deduction",
                        e.target.value
                      )
                    }
                    className="w-full text-right border rounded px-2 py-1"
                  />
                </td>

                <td className="border px-3 py-2 text-right font-bold bg-green-50">
                  {thousandSeparator(netSalary(emp), 0)}
                </td>
              </tr>
            ))}

            {/* ===== Grand Total ===== */}
            <tr className="bg-gray-900 text-white font-bold">
              <td colSpan={2} className="border px-3 py-3 text-center">
                Total
              </td>
              <td className="border px-3 py-3 text-right">
                {thousandSeparator(grandTotals.basic_salary, 0)}
              </td>
              <td className="border px-3 py-3 text-right">
                {thousandSeparator(grandTotals.others_allowance, 0)}
              </td>
              <td className="border px-3 py-3 text-right">
                {thousandSeparator(grandTotals.total_salary, 0)}
              </td>
              <td className="border px-3 py-3 text-right">
                {thousandSeparator(grandTotals.loan_deduction, 0)}
              </td>
              <td className="border px-3 py-3 text-right">
                {thousandSeparator(grandTotals.net_deduction, 0)}
              </td>
              <td className="border px-3 py-3 text-right">
                {thousandSeparator(grandTotals.net_salary, 0)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="p-3 text-sm bg-gray-100">
          Total Employees:{" "}
          <span className="font-semibold">{employees.length}</span>
        </div>
      </div>
    </div>
  );
};

export default SalarySheetGenerate;
