import { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiCheckSquare, FiMenu, FiPlus, FiTrash2 } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Loader from "../../../../common/Loader";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import InputElement from "../../../utils/fields/InputElement";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import Table from "../../../utils/others/Table";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import { formatPaymentMonth } from "../../../utils/utils-functions/formatDate";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import routes from "../../../services/appRoutes";
import {
  festivalBonusSheetPrint,
  festivalBonusSheetUpdate,
  festivalBonusView,
} from "./bonusSlice";

type BonusHistory = {
  id?: number | string;
  employee_id?: number | string;
  serial_no?: number | string;
  name?: string;
  designation_name?: string;
};

type UpdateRow = {
  id: number;
  employee_id?: number;
  is_new?: boolean;
  serial_no?: number;
  basic_salary: number;
  bonus_percent: number;
  bonus_amount: number;
  payment_amount?: number;
  history?: string | BonusHistory;
};

type AvailableEmployee = {
  id: number;
  employee_serial?: number | string;
  name: string;
  designation_name?: string;
  basic_salary?: number | string;
};

const getHistory = (history?: string | BonusHistory): BonusHistory => {
  if (!history) return {};

  if (typeof history === "string") {
    try {
      return JSON.parse(history);
    } catch {
      return {};
    }
  }

  return history;
};

const roundUpToNearestTen = (value: number) => Math.ceil(value / 10) * 10;

const getMonthIdFromPaymentMonth = (paymentMonth?: string) => {
  if (!paymentMonth || !/^\d{6}$/.test(paymentMonth)) return "";
  return `${paymentMonth.substring(0, 2)}-${paymentMonth.substring(2)}`;
};

const pickNumber = (sources: any[], keys: string[], fallback = 0) => {
  for (const source of sources) {
    if (!source) continue;

    for (const key of keys) {
      const value = source[key];
      if (value === undefined || value === null || value === "") continue;

      const numericValue = Number(value);
      if (Number.isFinite(numericValue)) return numericValue;
    }
  }

  return fallback;
};

const withSequence = (items: UpdateRow[]) =>
  items.map((item, index) => {
    const history = getHistory(item.history);
    return {
      ...item,
      serial_no: index + 1,
      history: {
        ...history,
        serial_no: index + 1,
      },
    };
  });

const FestivalBonusUpdate = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, bonusPrintSheet, bonusEmployees } = useSelector((state: any) => state.festivalBonus);

  const sourceRow = location.state?.row;
  const returnYearId = location.state?.yearId ? String(location.state.yearId) : "";
  const [rows, setRows] = useState<UpdateRow[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [availableEmployees, setAvailableEmployees] = useState<AvailableEmployee[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [addEmployeeLoading, setAddEmployeeLoading] = useState(false);
  const [draggingRowId, setDraggingRowId] = useState<number | null>(null);

  const getSourceBranchId = () =>
    Number(
      sourceRow?.branch_id ||
      sourceRow?.main_trx?.branch_id ||
      sourceRow?.main_trx?.branch?.id ||
      user?.branch_id ||
      0
    );

  useEffect(() => {
    if (!sourceRow) {
      toast.info("No festival bonus sheet selected");
      navigate(routes.hrms_festival_bonus_list, {
        state: {
          yearId: returnYearId,
        },
      });
      return;
    }

    void dispatch(festivalBonusSheetPrint(sourceRow)).unwrap();
  }, [dispatch, navigate, returnYearId, sourceRow]);

  useEffect(() => {
    if (!sourceRow?.payment_month || !sourceRow?.bonus_title) return;

    const branchId = getSourceBranchId();
    const monthId = getMonthIdFromPaymentMonth(sourceRow.payment_month);
    if (!branchId || !monthId) return;

    setAddEmployeeLoading(true);
    dispatch(
      festivalBonusView({
        branch_id: branchId,
        level_ids: [],
        month_id: monthId,
        bonus_title: sourceRow.bonus_title,
      })
    )
      .unwrap()
      .then((response: any) => {
        setAvailableEmployees(response?.data?.data || []);
      })
      .catch(() => {
        setAvailableEmployees([]);
      })
      .finally(() => {
        setAddEmployeeLoading(false);
      });
  }, [dispatch, sourceRow?.payment_month, sourceRow?.bonus_title, sourceRow?.branch_id, sourceRow?.main_trx?.branch_id]);

  useEffect(() => {
    const data = bonusPrintSheet?.data;
    if (!Array.isArray(data)) return;

    const mapped: UpdateRow[] = data.map((row: any, index: number) => {
      const history = getHistory(row.history);
      const employeeId = pickNumber(
        [row, history, row.employee, row.employee_info],
        ["employee_id", "hrms_employee_id", "employee_master_id", "id"],
        0
      );

      return {
        id: Number(row.id),
        employee_id: employeeId,
        serial_no: Number(row.serial_no ?? index + 1),
        basic_salary: Number(row.basic_salary || 0),
        bonus_percent: Number(row.bonus_percent || 0),
        bonus_amount: Number(row.bonus_amount || 0),
        payment_amount: Number(row.payment_amount || 0),
        history: row.history,
      };
    });

    setRows(withSequence(mapped));
  }, [bonusPrintSheet]);

  useEffect(() => {
    if (Array.isArray(bonusEmployees)) {
      setAvailableEmployees(bonusEmployees);
    }
  }, [bonusEmployees]);

  const existingEmployeeKeys = useMemo(() => {
    const ids = new Set<number>();
    const names = new Set<string>();

    rows.forEach((row) => {
      const history = getHistory(row.history);
      const employeeId = Number(row.employee_id || history.employee_id || history.id || 0);
      if (employeeId) ids.add(employeeId);
      if (history.name) names.add(history.name.trim().toLowerCase());
    });

    return { ids, names };
  }, [rows]);

  const employeeOptions = useMemo(() => {
    const options = availableEmployees
      .filter((employee) => {
        const employeeId = Number(employee.id || 0);
        const employeeName = employee.name?.trim().toLowerCase();

        if (employeeId && existingEmployeeKeys.ids.has(employeeId)) return false;
        if (employeeName && existingEmployeeKeys.names.has(employeeName)) return false;

        return true;
      })
      .map((employee) => ({
        id: employee.id,
        name: `${employee.name}${employee.designation_name ? ` - ${employee.designation_name}` : ""}`,
      }));

    return [{ id: "", name: "Select Employee" }, ...options];
  }, [availableEmployees, existingEmployeeKeys]);

  const handleInputChange = (id: number, field: keyof UpdateRow, value: string) => {
    const numericValue = Number(value) || 0;

    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: numericValue,
              ...(field === "bonus_percent"
                ? { bonus_amount: roundUpToNearestTen((Number(row.basic_salary || 0) * numericValue) / 100) }
                : {}),
            }
          : row
      )
    );
  };

  const handleAddEmployee = () => {
    const employee = availableEmployees.find((item) => String(item.id) === String(selectedEmployeeId));
    if (!employee) {
      toast.info("Please select employee");
      return;
    }

    const defaultPercent = Number(sourceRow?.bonus_percent || rows[0]?.bonus_percent || 0);
    const basicSalary = Number(employee.basic_salary || 0);

    setRows((prev) =>
      withSequence([
        ...prev,
        {
          id: -Date.now(),
          employee_id: Number(employee.id),
          is_new: true,
          serial_no: prev.length + 1,
          basic_salary: basicSalary,
          bonus_percent: defaultPercent,
          bonus_amount: roundUpToNearestTen((basicSalary * defaultPercent) / 100),
          payment_amount: 0,
          history: {
            id: employee.id,
            employee_id: employee.id,
            employee_serial: employee.employee_serial,
            name: employee.name,
            designation_name: employee.designation_name,
          },
        },
      ])
    );

    setSelectedEmployeeId("");
  };

  const moveRow = (draggedId: number, targetId: number) => {
    if (draggedId === targetId) return;

    setRows((prev) => {
      const fromIndex = prev.findIndex((row) => row.id === draggedId);
      const toIndex = prev.findIndex((row) => row.id === targetId);

      if (fromIndex < 0 || toIndex < 0) return prev;

      const nextRows = [...prev];
      const [movedRow] = nextRows.splice(fromIndex, 1);
      nextRows.splice(toIndex, 0, movedRow);

      return withSequence(nextRows);
    });
  };

  const handleRemoveRow = (row: UpdateRow) => {
    if (Number(row.payment_amount || 0) > 0) {
      toast.info("Paid bonus row cannot be removed");
      return;
    }

    setRows((prev) => withSequence(prev.filter((item) => item.id !== row.id)));
  };

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          acc.basic += Number(row.basic_salary || 0);
          acc.bonus += Number(row.bonus_amount || 0);
          acc.paid += Number(row.payment_amount || 0);
          return acc;
        },
        { basic: 0, bonus: 0, paid: 0 }
      ),
    [rows]
  );

  const handleUpdate = async () => {
    if (!sourceRow) return;
    if (rows.length === 0) {
      toast.info("No bonus rows found for update");
      return;
    }

    setSaveLoading(true);

    try {
      const payload = {
        row: sourceRow,
        employees: rows.map((row) => ({
          id: row.is_new ? row.employee_id : row.id,
          bonus_payment_id: row.is_new ? null : row.id,
          employee_id: row.employee_id || getHistory(row.history).employee_id || getHistory(row.history).id || row.id,
          is_new: row.is_new === true,
          serial_no: Number(row.serial_no || 0),
          sequence: Number(row.serial_no || 0),
          sort_order: Number(row.serial_no || 0),
          history: {
            ...getHistory(row.history),
            serial_no: Number(row.serial_no || 0),
          },
          basic_salary: Number(row.basic_salary || 0),
          bonus_percent: Number(row.bonus_percent || 0),
          bonus_amount: Number(row.bonus_amount || 0),
        })),
      };

      const response = await dispatch(festivalBonusSheetUpdate(payload)).unwrap();
      toast.success(response?.message || "Festival bonus sheet updated successfully");
      navigate(routes.hrms_festival_bonus_list, {
        state: {
          yearId: returnYearId,
        },
      });
    } catch (error: any) {
      toast.error(typeof error === "string" ? error : error?.message || "Festival bonus update failed");
    } finally {
      setSaveLoading(false);
    }
  };

  const columns = [
    {
      key: "serial_no",
      header: "Sl",
      headerClass: "text-center",
      cellClass: "text-center",
      render: (row: UpdateRow) => (
        <div className="flex items-center justify-center gap-2">
          <FiMenu className="h-4 w-4 cursor-grab text-slate-400 active:cursor-grabbing" />
          <span>{row.serial_no}</span>
        </div>
      ),
    },
    {
      key: "employee",
      header: "Employee",
      render: (row: UpdateRow) => {
        const history = getHistory(row.history);
        return (
          <>
            <div className="font-semibold">{history.name || "-"}</div>
            <div className="text-xs text-slate-500">{history.designation_name || "-"}</div>
          </>
        );
      },
    },
    {
      key: "basic_salary",
      header: "Basic",
      headerClass: "text-right w-40",
      cellClass: "text-right",
      render: (row: UpdateRow) => (
        <div className="flex justify-end">
          <InputElement
            id={`bonus_basic_salary_${row.id}`}
            name={`bonus_basic_salary_${row.id}`}
            value={row.basic_salary}
            onChange={(e) => handleInputChange(row.id, "basic_salary", e.target.value)}
            type="number"
            className="w-28 text-right"
            disabled={Number(row.payment_amount || 0) > 0}
          />
        </div>
      ),
    },
    {
      key: "bonus_percent",
      header: "Percent",
      headerClass: "text-right w-36",
      cellClass: "text-right",
      render: (row: UpdateRow) => (
        <div className="flex justify-end">
          <InputElement
            id={`bonus_percent_${row.id}`}
            name={`bonus_percent_${row.id}`}
            value={row.bonus_percent}
            onChange={(e) => handleInputChange(row.id, "bonus_percent", e.target.value)}
            type="number"
            className="w-24 text-right"
            disabled={Number(row.payment_amount || 0) > 0}
          />
        </div>
      ),
    },
    {
      key: "bonus_amount",
      header: "Bonus",
      headerClass: "text-right w-40",
      cellClass: "text-right",
      render: (row: UpdateRow) => (
        <div className="flex justify-end">
          <InputElement
            id={`bonus_amount_${row.id}`}
            name={`bonus_amount_${row.id}`}
            value={row.bonus_amount}
            onChange={(e) => handleInputChange(row.id, "bonus_amount", e.target.value)}
            type="number"
            className="w-28 text-right"
            disabled={Number(row.payment_amount || 0) > 0}
          />
        </div>
      ),
    },
    {
      key: "payment_amount",
      header: "Paid",
      headerClass: "text-right w-36",
      cellClass: "text-right",
      render: (row: UpdateRow) => thousandSeparator(Number(row.payment_amount || 0)),
    },
    {
      key: "action",
      header: "Action",
      headerClass: "text-center",
      cellClass: "text-center",
      render: (row: UpdateRow) => (
        <button
          type="button"
          onClick={() => handleRemoveRow(row)}
          disabled={saveLoading || Number(row.payment_amount || 0) > 0}
          className="inline-flex items-center justify-center text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          title={Number(row.payment_amount || 0) > 0 ? "Paid bonus cannot be removed" : "Remove bonus row"}
        >
          <FiTrash2 className="text-lg" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title="Festival Bonus Update" />

      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xl font-semibold text-slate-600 dark:text-slate-100">
            {sourceRow?.bonus_title || "Festival Bonus"}{" "}
            {sourceRow?.payment_month ? formatPaymentMonth(sourceRow.payment_month) : ""}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <div className="min-w-64">
            <DropdownCommon
              id="add_bonus_employee_id"
              name="add_bonus_employee_id"
              value={selectedEmployeeId}
              data={employeeOptions}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="h-9"
            />
          </div>
          <ButtonLoading
            onClick={handleAddEmployee}
            buttonLoading={addEmployeeLoading}
            disabled={addEmployeeLoading || !selectedEmployeeId}
            label="Add Employee"
            icon={<FiPlus className="mr-1 font-bold dark:text-white" />}
            className="h-9 whitespace-nowrap bg-emerald-600 px-5 py-1 hover:bg-emerald-700"
          />
          <ButtonLoading
            onClick={() =>
              navigate(routes.hrms_festival_bonus_list, {
                state: {
                  yearId: returnYearId,
                },
              })
            }
            label="Back"
            className="h-9 whitespace-nowrap bg-slate-500 px-6 py-1 hover:bg-slate-600"
            icon={<FiArrowLeft className="mr-1" />}
          />
          <ButtonLoading
            onClick={handleUpdate}
            buttonLoading={saveLoading}
            disabled={saveLoading || rows.length === 0}
            label="Update Bonus"
            className="h-9 whitespace-nowrap bg-blue-600 px-6 py-1 hover:bg-blue-700"
            icon={<FiCheckSquare />}
          />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="border bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs text-slate-700 dark:text-slate-300">Basic</div>
          <div className="font-semibold">{thousandSeparator(totals.basic)}</div>
        </div>
        <div className="border bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs text-slate-700 dark:text-slate-300">Bonus</div>
          <div className="font-semibold">{thousandSeparator(totals.bonus)}</div>
        </div>
        <div className="border bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div className="text-xs text-slate-700 dark:text-slate-300">Paid</div>
          <div className="font-semibold">{thousandSeparator(totals.paid)}</div>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {loading ? <Loader /> : null}
        <Table
          columns={columns}
          data={rows}
          getRowKey={(row) => row.id}
          rowClassName={(row) =>
            draggingRowId === row.id ? " bg-indigo-50 opacity-70 dark:bg-slate-700" : ""
          }
          getRowProps={(row) => ({
            draggable: true,
            onDragStart: (event) => {
              setDraggingRowId(row.id);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", String(row.id));
            },
            onDragOver: (event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            },
            onDrop: (event) => {
              event.preventDefault();
              const draggedId = Number(event.dataTransfer.getData("text/plain"));
              moveRow(draggedId, row.id);
              setDraggingRowId(null);
            },
            onDragEnd: () => setDraggingRowId(null),
          })}
        />
      </div>
    </div>
  );
};

export default FestivalBonusUpdate;
