import React, { useEffect, useMemo, useState } from "react";
import { FiGift, FiSave, FiSearch } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import Loader from "../../../../common/Loader";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { fetchEmployeeSettings } from "../employee/employeeSlice";
import { festivalBonusGenerate, festivalBonusView } from "./bonusSlice";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import MonthDropdown from "../../../utils/components/MonthDropdown";
import MultiSelectDropdown from "../../../utils/utils-functions/MultiSelectDropdown";
import InputElement from "../../../utils/fields/InputElement";
import Table from "../../../utils/others/Table";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import ConfirmModal from "../../../utils/components/ConfirmModalProps";

const BONUS_TEMPLATES = [
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

    setSaveButtonLoading(true);
    try {
      const response = await dispatch(
        festivalBonusGenerate({
          branch_id: Number(branchId),
          month_id: monthId,
          bonus_title: resolvedBonusTitle,
          bonus_percent: resolvedPercent,
          level_ids: selectedLevels.map((item: any) => item.value),
          employees: employees.map((row) => ({
            employee_id: row.id,
            basic_salary: Number(row.basic_salary || 0),
            bonus_percent: Number(row.bonus_percent || 0),
            bonus_amount: Number(row.bonus_amount || 0),
            name: row.name,
            designation_name: row.designation_name || "",
          })),
        })
      ).unwrap();

      toast.success(response?.message || "Festival bonus generated successfully");
      setShowConfirm(false);
      setEmployees([]);
    } catch (error: any) {
      toast.error(typeof error === "string" ? error : error?.message || "Bonus generation failed");
    } finally {
      setSaveButtonLoading(false);
    }
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
      cellClass: "text-right font-semibold text-emerald-700",
      render: (row: any) => thousandSeparator(row.bonus_amount, 0),
    },
  ];

  return (
    <>
      <HelmetTitle title="Festival Bonus Generate" />
      {(loading || searchLoading) && <Loader />}

      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-emerald-50 shadow-sm">
          <div className="flex flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 shadow-sm">
                <FiGift className="h-4 w-4" />
                Bangladesh HRM
              </div>
              <h1 className="mt-3 text-2xl font-bold text-slate-900">Festival Bonus Generate</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Basic salary-এর নির্দিষ্ট percentage অনুযায়ী Eid, Boishakh বা special bonus batch তৈরি করুন।
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm md:min-w-[320px]">
              <div className="rounded-xl border border-white/70 bg-white/90 px-4 py-3 shadow-sm">
                <div className="text-slate-500">Eligible Employees</div>
                <div className="mt-1 text-2xl font-bold text-slate-900">{totalEmployees}</div>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/90 px-4 py-3 shadow-sm">
                <div className="text-slate-500">Projected Bonus</div>
                <div className="mt-1 text-2xl font-bold text-emerald-700">
                  {thousandSeparator(totalBonus, 0)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Branch</label>
              <BranchDropdown branches={dropdownData} value={branchId} onChange={(e: any) => setBranchId(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Bonus Month</label>
              <MonthDropdown
                id="bonus_month_id"
                name="bonus_month_id"
                value={monthId}
                onChange={handleMonthChange}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Bonus Title</label>
              <select value={bonusTitle} onChange={(e) => setBonusTitle(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none">
                {BONUS_TEMPLATES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Bonus % of Basic</label>
              <InputElement value={bonusPercent} onChange={(e) => setBonusPercent(e.target.value)} type="number" inputMode="decimal" className="w-full" />
            </div>
          </div>

          {bonusTitle === "Other" && (
            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">Custom Bonus Title</label>
              <InputElement value={customBonusTitle} onChange={(e) => setCustomBonusTitle(e.target.value)} className="w-full" />
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Designation Level</label>
              <MultiSelectDropdown options={designationLevelOptions} selected={selectedLevels} setSelected={setSelectedLevels} placeholder="All levels" />
            </div>
            <div className="flex items-end">
              <ButtonLoading onClick={handleSearch} label="Load Employees" icon={<FiSearch className="h-4 w-4" />} className="w-full whitespace-nowrap bg-amber-600 px-5 py-2 hover:bg-amber-700 xl:w-auto" />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-dashed border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-slate-700">
            <span className="font-semibold">{resolvedBonusTitle || "Bonus title"}</span>
            {" | "}Month: <span className="font-semibold">{monthText || "Not selected"}</span>
            {" | "}Rate: <span className="font-semibold">{resolvedPercent.toFixed(2)}%</span>
          </div>
        </div>

        {employees.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="text-sm text-slate-500">Total Basic Salary</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{thousandSeparator(totalBasic, 0)}</div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
                <div className="text-sm text-emerald-700">Total Bonus Amount</div>
                <div className="mt-2 text-2xl font-bold text-emerald-700">{thousandSeparator(totalBonus, 0)}</div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
                <div className="text-sm text-amber-700">Employees in Batch</div>
                <div className="mt-2 text-2xl font-bold text-amber-700">{totalEmployees}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Table columns={columns} data={employees} perPage={20} />
              <div className="mt-5 flex justify-end">
                <ButtonLoading onClick={() => setShowConfirm(true)} buttonLoading={saveButtonLoading} label="Generate Bonus Sheet" icon={<FiSave className="h-4 w-4" />} className="bg-emerald-600 px-5 py-2 hover:bg-emerald-700" />
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
        className="bg-emerald-600 hover:bg-emerald-700"
      />
    </>
  );
};

export default FestivalBonusGenerate;
