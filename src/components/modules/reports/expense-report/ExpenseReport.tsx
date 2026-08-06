import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { useReactToPrint } from "react-to-print";
import { FiCheckSquare, FiFilter, FiRotateCcw } from "react-icons/fi";

import {
  ButtonLoading,
  PrintButton,
} from "../../../../pages/UiElements/CustomButtons";
import InputDatePicker from "../../../utils/fields/DatePicker";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import InputElement from "../../../utils/fields/InputElement";
import Table from "../../../utils/others/Table";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import httpService from "../../../services/httpService";
import { API_REPORT_EXPENSE_DETAILS_URL } from "../../../services/apiRoutes";

import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { fetchExpenseReport } from "./expenseReportSlice";
import ExpenseReportPrint from "./ExpenseReportPrint";
import { isUserFeatureEnabled } from "../../../utils/userFeatureSettings";

type ExpenseRow = {
  key: string;
  code: string;
  name: string;
  openingDebit: number;
  openingCredit: number;
  movementDebit: number;
  movementCredit: number;
  closingDebit: number;
  closingCredit: number;
};

/**
 * `coa3Id` is the only link a detail row keeps back to its group — every
 * group's accounts arrive in one flat array and are sorted into place here.
 */
type ExpenseDetailRow = ExpenseRow & {
  coa3Id: number;
};

/**
 * Which of the two readings of the same figures is on screen.
 *
 * 'group' totals each expense head; 'details' lists the accounts inside every
 * head at once. Both are drawn from what one Apply already fetched, so the
 * choice costs nothing and the two can never disagree.
 */
type ViewMode = "group" | "details";

const VIEW_MODES = [
  { id: "group", name: "Group Report" },
  { id: "details", name: "Details Report" },
];

const toNum = (value: any) => {
  const numericValue = Number(
    typeof value === "string" ? value.replace(/,/g, "") : value,
  );
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const pickFirst = (obj: any, keys: string[]) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
};

const findArrayCollection = (raw: any): any[] => {
  if (Array.isArray(raw)) return raw;

  const directKeys = [
    "rows",
    "data",
    "list",
    "items",
    "expenses",
    "expense",
    "accounts",
    "result",
  ];

  for (const key of directKeys) {
    if (Array.isArray(raw?.[key])) {
      return raw[key];
    }
  }

  if (raw?.data) {
    return findArrayCollection(raw.data);
  }

  return [];
};

/**
 * The server already drops any head whose six figures are all zero, so nothing
 * is filtered out here. The trial balance screen suppresses on the closing
 * figure alone, which would hide an expense head that was spent on and then
 * reversed inside the period — exactly the row an expense report exists to show.
 */
const normalizeRows = (items: any[]): ExpenseRow[] => {
  return items.map((item: any, index: number) => ({
    key: `${pickFirst(item, ["id", "code", "head_code"]) || index}`,
    code: String(
      pickFirst(item, ["id", "code", "head_code", "account_code", "coa_code"]) ||
        "",
    ),
    name: String(
      pickFirst(item, [
        "coal3_name",
        "name",
        "head_name",
        "account_name",
        "title",
        "particulars",
      ]) || "Unnamed Head",
    ),
    openingDebit: toNum(
      pickFirst(item, ["opening_debit_bal", "opening_debit", "opening_dr"]),
    ),
    openingCredit: toNum(
      pickFirst(item, ["opening_credit_bal", "opening_credit", "opening_cr"]),
    ),
    movementDebit: toNum(
      pickFirst(item, ["movement_debit_bal", "movement_debit", "movement_dr"]),
    ),
    movementCredit: toNum(
      pickFirst(item, ["movement_credit_bal", "movement_credit", "movement_cr"]),
    ),
    closingDebit: toNum(
      pickFirst(item, ["debit_bal", "closing_debit_bal", "debit"]),
    ),
    closingCredit: toNum(
      pickFirst(item, ["credit_bal", "closing_credit_bal", "credit"]),
    ),
  }));
};

const normalizeDetailRows = (items: any[]): ExpenseDetailRow[] => {
  return items.map((item: any, index: number) => ({
    key: `${pickFirst(item, ["coa4_id", "id", "code", "head_code"]) || index}`,
    code: String(
      pickFirst(item, [
        "coa4_id",
        "id",
        "code",
        "head_code",
        "account_code",
        "coa_code",
      ]) || "",
    ),
    coa3Id: toNum(pickFirst(item, ["coa3_id", "coal3_id", "acc_coa_level3_id"])),
    name: String(
      pickFirst(item, [
        "coal4_name",
        "NAME",
        "name",
        "head_name",
        "account_name",
        "title",
        "particulars",
      ]) || "Unnamed Head",
    ),
    openingDebit: toNum(
      pickFirst(item, ["opening_debit_bal", "opening_debit", "opening_dr"]),
    ),
    openingCredit: toNum(
      pickFirst(item, ["opening_credit_bal", "opening_credit", "opening_cr"]),
    ),
    movementDebit: toNum(
      pickFirst(item, ["movement_debit_bal", "movement_debit", "movement_dr"]),
    ),
    movementCredit: toNum(
      pickFirst(item, ["movement_credit_bal", "movement_credit", "movement_cr"]),
    ),
    closingDebit: toNum(
      pickFirst(item, ["debit_bal", "closing_debit_bal", "debit"]),
    ),
    closingCredit: toNum(
      pickFirst(item, ["credit_bal", "closing_credit_bal", "credit"]),
    ),
  }));
};

const sumBalances = (rows: ExpenseRow[]) => {
  return rows.reduce(
    (acc, row) => {
      acc.openingDebit += row.openingDebit;
      acc.openingCredit += row.openingCredit;
      acc.movementDebit += row.movementDebit;
      acc.movementCredit += row.movementCredit;
      acc.closingDebit += row.closingDebit;
      acc.closingCredit += row.closingCredit;
      return acc;
    },
    {
      openingDebit: 0,
      openingCredit: 0,
      movementDebit: 0,
      movementCredit: 0,
      closingDebit: 0,
      closingCredit: 0,
    },
  );
};

const ExpenseReport = (user: any) => {
  const dispatch = useDispatch();

  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const expenseReportState: any = useSelector(
    (state: any) => state.expenseReport,
  );
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(
    settings,
    "use_filter_parameter",
  );

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [perPage, setPerPage] = useState<number>(40);
  const [fontSize, setFontSize] = useState<number>(10);
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedL3Id, setExpandedL3Id] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("group");
  const [detailRows, setDetailRows] = useState<ExpenseDetailRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    setBranchId(Number(user?.user?.branch_id) || null);
  }, []);

  useEffect(() => {
    const protectedData = branchDdlData?.protectedData;
    if (!protectedData) return;

    const { data: ddl, transactionDate: trxDate } = protectedData;

    if (ddl) {
      setDropdownData(ddl);
    }

    if (trxDate) {
      try {
        const [day, month, year] = trxDate
          .split("/")
          .map((str: string) => Number(str.trim()));

        if (!year || year < 1900 || year > 2100) return;

        setStartDate(new Date(year, 0, 1));
        setEndDate(new Date(year, month - 1, day));
      } catch (error) {
        console.warn("Failed to parse transactionDate:", trxDate, error);
      }
    }
  }, [
    branchDdlData?.protectedData?.data,
    branchDdlData?.protectedData?.transactionDate,
  ]);

  const rawReportData = useMemo(() => {
    const raw = expenseReportState?.data;

    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    if (raw?.data?.data) return raw.data.data;
    if (raw?.data) return raw.data;
    return raw;
  }, [expenseReportState?.data]);

  const rows = useMemo(() => {
    return normalizeRows(findArrayCollection(rawReportData));
  }, [rawReportData]);

  const tableData = useMemo(() => {
    return rows.map((row, index) => ({
      sl_number: index + 1,
      ...row,
    }));
  }, [rows]);

  const totals = useMemo(() => {
    const totalsSource = rawReportData?.totals || rawReportData?.summary || {};

    return {
      openingDebit:
        toNum(pickFirst(totalsSource, ["opening_debit_bal", "opening_debit"])) ||
        rows.reduce((sum, row) => sum + row.openingDebit, 0),
      openingCredit:
        toNum(
          pickFirst(totalsSource, ["opening_credit_bal", "opening_credit"]),
        ) || rows.reduce((sum, row) => sum + row.openingCredit, 0),
      movementDebit:
        toNum(
          pickFirst(totalsSource, ["movement_debit_bal", "movement_debit"]),
        ) || rows.reduce((sum, row) => sum + row.movementDebit, 0),
      movementCredit:
        toNum(
          pickFirst(totalsSource, ["movement_credit_bal", "movement_credit"]),
        ) || rows.reduce((sum, row) => sum + row.movementCredit, 0),
      closingDebit:
        toNum(pickFirst(totalsSource, ["debit_bal", "closing_debit_bal"])) ||
        rows.reduce((sum, row) => sum + row.closingDebit, 0),
      closingCredit:
        toNum(pickFirst(totalsSource, ["credit_bal", "closing_credit_bal"])) ||
        rows.reduce((sum, row) => sum + row.closingCredit, 0),
    };
  }, [rawReportData, rows]);

  const hasReportData = rows.length > 0;

  const selectedDetailRows = useMemo(() => {
    if (!expandedL3Id) return [];
    return detailRows.filter(
      (row) => Number(row.coa3Id) === Number(expandedL3Id),
    );
  }, [expandedL3Id, detailRows]);

  const selectedDetailTotals = useMemo(() => {
    return sumBalances(selectedDetailRows);
  }, [selectedDetailRows]);

  const branchName = useMemo(() => {
    const selected = dropdownData.find(
      (branch: any) => Number(branch.id) === Number(branchId),
    );
    return selected?.name || "Selected Branch";
  }, [dropdownData, branchId]);

  const handleBranchChange = (e: any) => {
    const value = Number(e.target.value);
    setBranchId(Number.isFinite(value) ? value : null);
  };

  /**
   * One request brings back the level 4 rows for every expense group at once,
   * so the screen never has to ask again while the same report is on display.
   */
  const loadDetailRows = async (
    branch: number,
    from: Date,
    to: Date,
  ) => {
    try {
      setDetailLoading(true);
      setDetailError(null);

      const res = await httpService.get(API_REPORT_EXPENSE_DETAILS_URL, {
        params: {
          branch_id: Number(branch),
          start_date: dayjs(from).format("YYYY-MM-DD"),
          end_date: dayjs(to).format("YYYY-MM-DD"),
        },
      });

      setDetailRows(normalizeDetailRows(findArrayCollection(res.data)));
    } catch (error: any) {
      setDetailError(
        error?.response?.data?.message || error.message || "Details load failed",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleActionButtonClick = async () => {
    if (!branchId) return alert("Please select a branch");
    if (!startDate || !endDate) return alert("Please choose a start and end date");

    setButtonLoading(true);
    setExpandedL3Id(null);
    setDetailRows([]);
    setDetailError(null);

    const action = await dispatch(
      fetchExpenseReport({
        branch_id: Number(branchId),
        start_date: dayjs(startDate).format("YYYY-MM-DD"),
        end_date: dayjs(endDate).format("YYYY-MM-DD"),
      }) as any,
    );

    setButtonLoading(false);

    if (action?.meta?.requestStatus !== "fulfilled") {
      alert(action?.payload || "Expense Report load failed");
      return;
    }

    setFilterOpen(false);

    // The printout carries every group with its accounts beneath it, so the
    // detail set has to be in hand before Print is worth pressing. Fetching it
    // here also means the first row a user opens costs nothing.
    loadDetailRows(Number(branchId), startDate, endDate);
  };

  const handleGroupRowClick = async (row: any) => {
    const coa3Id = Number(row.key || row.code);
    if (!Number.isFinite(coa3Id) || !branchId || !startDate || !endDate) return;

    if (expandedL3Id === coa3Id) {
      setExpandedL3Id(null);
      return;
    }

    setExpandedL3Id(coa3Id);

    // Already loaded, or on its way in from Apply — nothing to ask for.
    if (detailLoading || detailRows.length > 0) return;

    await loadDetailRows(Number(branchId), startDate, endDate);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "Expense Report",
    removeAfterPrint: true,
  });

  const handleResetFilters = () => {
    setFilterOpen(false);
  };

  const columns = [
    {
      key: "sl_number",
      header: "Sl. No",
      headerClass: "text-center",
      cellClass: "text-center w-20",
      render: (row: any) => <div>{row.sl_number}</div>,
    },
    {
      key: "name",
      header: "Description",
      cellClass: "w-80",
      render: (row: any) => <div className="whitespace-normal">{row.name}</div>,
    },
    {
      key: "openingDebit",
      header: "Dr",
      headerClass: "text-right",
      cellClass: "text-right w-32",
      render: (row: any) => <div>{row.openingDebit ? thousandSeparator(row.openingDebit) : '-'}</div>,
    },
    {
      key: "openingCredit",
      header: "Cr",
      headerClass: "text-right",
      cellClass: "text-right w-32",
      render: (row: any) => <div>{row.openingCredit ? thousandSeparator(row.openingCredit) : '-'}</div>,
    },
    {
      key: "movementDebit",
      header: "Dr",
      headerClass: "text-right",
      cellClass: "text-right w-32",
      render: (row: any) => <div>{row.movementDebit ? thousandSeparator(row.movementDebit) : '-'}</div>,
    },
    {
      key: "movementCredit",
      header: "Cr",
      headerClass: "text-right",
      cellClass: "text-right w-32",
      render: (row: any) => <div>{row.movementCredit ? thousandSeparator(row.movementCredit) : '-'}</div>,
    },
    {
      key: "closingDebit",
      header: "Dr",
      headerClass: "text-right",
      cellClass: "text-right w-32",
      render: (row: any) => <div>{row.closingDebit ? thousandSeparator(row.closingDebit) : '-'}</div>,
    },
    {
      key: "closingCredit",
      header: "Cr",
      headerClass: "text-right",
      cellClass: "text-right w-32",
      render: (row: any) => <div>{row.closingCredit ? thousandSeparator(row.closingCredit) : '-'}</div>,
    },
  ];

  const headerRows = [
    [
      { label: "Sl. No", rowSpan: 2, className: "text-center" },
      { label: "Description", rowSpan: 2 },
      { label: "Opening", colSpan: 2, className: "text-center" },
      { label: "Movement", colSpan: 2, className: "text-center" },
      { label: "Closing", colSpan: 2, className: "text-center" },
    ],
    [
      { label: "Dr", className: "text-center" },
      { label: "Cr", className: "text-center" },
      { label: "Dr", className: "text-center" },
      { label: "Cr", className: "text-center" },
      { label: "Dr", className: "text-center" },
      { label: "Cr", className: "text-center" },
    ],
  ];

  // The details view's header, which is the group header with the extra Group
  // column spliced in beside Description.
  const detailHeaderRows = [
    [
      { label: "Sl. No", rowSpan: 2, className: "text-center" },
      { label: "Group", rowSpan: 2 },
      { label: "Description", rowSpan: 2 },
      { label: "Opening", colSpan: 2, className: "text-center" },
      { label: "Movement", colSpan: 2, className: "text-center" },
      { label: "Closing", colSpan: 2, className: "text-center" },
    ],
    headerRows[1],
  ];

  const footerRows = [
    [
      { label: "Grand Total", colSpan: 2, className: "text-right" },
      { label: totals.openingDebit ? thousandSeparator(totals.openingDebit) : '-', className: "text-right" },
      { label: totals.openingCredit ? thousandSeparator(totals.openingCredit) : '-', className: "text-right" },
      { label: totals.movementDebit ? thousandSeparator(totals.movementDebit) : '-', className: "text-right" },
      { label: totals.movementCredit ? thousandSeparator(totals.movementCredit) : '-', className: "text-right" },
      { label: totals.closingDebit ? thousandSeparator(totals.closingDebit) : '-', className: "text-right" },
      { label: totals.closingCredit ? thousandSeparator(totals.closingCredit) : '-', className: "text-right" },
    ],
  ];

  /**
   * The details view: every expense account of every group in one list, ordered
   * by group so the accounts of a head stay together. It reuses the rows the
   * Apply already fetched, so choosing it costs no request -- and because both
   * views are cut from the same rows, the group totals and these lines are the
   * same figures read at two depths.
   */
  const detailTableData = useMemo(() => {
    const groupName = new Map<number, string>(
      rows.map((row: any) => [Number(row.key), String(row.name)]),
    );

    return [...detailRows]
      .sort((a, b) => {
        const byGroup = (groupName.get(Number(a.coa3Id)) ?? "").localeCompare(
          groupName.get(Number(b.coa3Id)) ?? "",
        );
        return byGroup !== 0 ? byGroup : String(a.name).localeCompare(String(b.name));
      })
      .map((row, index) => ({
        sl_number: index + 1,
        groupName: groupName.get(Number(row.coa3Id)) ?? "",
        ...row,
      }));
  }, [detailRows, rows]);

  const detailTotals = useMemo(() => sumBalances(detailRows), [detailRows]);

  // The group column is what tells one head's accounts from the next; the rest
  // of the columns are the group table's, so the two read identically.
  const detailColumns = [
    columns[0],
    {
      key: "groupName",
      header: "Group",
      cellClass: "w-56",
      render: (row: any) => (
        <div className="whitespace-normal text-slate-500 dark:text-slate-400">
          {row.groupName}
        </div>
      ),
    },
    ...columns.slice(1),
  ];

  const detailFooterRows = [
    [
      { label: "Grand Total", colSpan: 3, className: "text-right" },
      { label: detailTotals.openingDebit ? thousandSeparator(detailTotals.openingDebit) : '-', className: "text-right" },
      { label: detailTotals.openingCredit ? thousandSeparator(detailTotals.openingCredit) : '-', className: "text-right" },
      { label: detailTotals.movementDebit ? thousandSeparator(detailTotals.movementDebit) : '-', className: "text-right" },
      { label: detailTotals.movementCredit ? thousandSeparator(detailTotals.movementCredit) : '-', className: "text-right" },
      { label: detailTotals.closingDebit ? thousandSeparator(detailTotals.closingDebit) : '-', className: "text-right" },
      { label: detailTotals.closingCredit ? thousandSeparator(detailTotals.closingCredit) : '-', className: "text-right" },
    ],
  ];

  const showingDetails = viewMode === "details";

  /**
   * The accounts behind one group, shown directly under the group they belong
   * to. Putting them at the foot of the table instead would leave the reader
   * scrolling to work out whose accounts they were looking at.
   */
  const renderGroupDetails = (row: any) => {
    if (Number(row.key) !== Number(expandedL3Id)) return null;

    return (
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/30">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="font-semibold text-slate-900 dark:text-white">
            {row.name} — Level 4 Details
          </h4>
          <div className="rounded-sm bg-white px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Accounts: {detailLoading ? "Loading..." : selectedDetailRows.length}
          </div>
        </div>

        {detailError && (
          <div className="pt-3 text-sm text-red-600 dark:text-red-300">
            {detailError}
          </div>
        )}

        {!detailLoading && !detailError && selectedDetailRows.length === 0 && (
          <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No Level 4 details found
          </div>
        )}

        {selectedDetailRows.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full table-fixed text-left text-sm text-slate-700 dark:text-slate-200">
              <thead className="bg-gray-300 text-xs uppercase text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="w-16 px-3 py-3 text-center">Sl. No</th>
                  <th className="w-80 px-3 py-3">Account</th>
                  <th className="w-32 px-3 py-3 text-right">Opening Dr</th>
                  <th className="w-32 px-3 py-3 text-right">Opening Cr</th>
                  <th className="w-32 px-3 py-3 text-right">Movement Dr</th>
                  <th className="w-32 px-3 py-3 text-right">Movement Cr</th>
                  <th className="w-32 px-3 py-3 text-right">Closing Dr</th>
                  <th className="w-32 px-3 py-3 text-right">Closing Cr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-gray-800">
                {selectedDetailRows.map((detailRow, index) => (
                  <tr key={detailRow.key}>
                    <td className="px-3 py-2 text-center">{index + 1}</td>
                    <td className="px-3 py-2">{detailRow.name}</td>
                    <td className="px-3 py-2 text-right">{thousandSeparator(detailRow.openingDebit)}</td>
                    <td className="px-3 py-2 text-right">{thousandSeparator(detailRow.openingCredit)}</td>
                    <td className="px-3 py-2 text-right">{thousandSeparator(detailRow.movementDebit)}</td>
                    <td className="px-3 py-2 text-right">{thousandSeparator(detailRow.movementCredit)}</td>
                    <td className="px-3 py-2 text-right">{thousandSeparator(detailRow.closingDebit)}</td>
                    <td className="px-3 py-2 text-right">{thousandSeparator(detailRow.closingCredit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-semibold text-slate-800 dark:bg-slate-900 dark:text-slate-100">
                <tr>
                  <td colSpan={2} className="px-3 py-3 text-right">Total</td>
                  <td className="px-3 py-3 text-right">{thousandSeparator(selectedDetailTotals.openingDebit)}</td>
                  <td className="px-3 py-3 text-right">{thousandSeparator(selectedDetailTotals.openingCredit)}</td>
                  <td className="px-3 py-3 text-right">{thousandSeparator(selectedDetailTotals.movementDebit)}</td>
                  <td className="px-3 py-3 text-right">{thousandSeparator(selectedDetailTotals.movementCredit)}</td>
                  <td className="px-3 py-3 text-right">{thousandSeparator(selectedDetailTotals.closingDebit)}</td>
                  <td className="px-3 py-3 text-right">{thousandSeparator(selectedDetailTotals.closingCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <HelmetTitle title="Expense Report" />
      <div className="mx-auto space-y-2">
        <div className="pl-0 pr-1 py-3">
          <div className={`gap-3 ${useFilterMenuEnabled ? "flex flex-wrap items-center gap-3" : "flex flex-wrap items-end"}`}>
            <div className={useFilterMenuEnabled ? "relative shrink-0" : "min-w-[320px] flex-1 md:max-xl:w-full md:max-xl:min-w-0 md:max-xl:flex-none xl:max-[1880px]:w-full xl:max-[1880px]:min-w-0 xl:max-[1880px]:flex-none"}>
              {useFilterMenuEnabled && (
                <button
                  type="button"
                  onClick={() => setFilterOpen((prev) => !prev)}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded border text-sm transition ${
                    filterOpen
                      ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                      : "border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700"
                  }`}
                  title="Open filters"
                  aria-label="Open filters"
                >
                  <FiFilter size={16} />
                </button>
              )}

              {(useFilterMenuEnabled ? filterOpen : true) && (
                <div
                  className={
                    useFilterMenuEnabled
                      ? "absolute left-0 top-full z-[1000] mt-2 w-[min(92vw,340px)] rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800"
                      : "w-full"
                  }
                >
                  <div
                    className={
                      useFilterMenuEnabled
                        ? "space-y-3"
                        : "grid grid-cols-1 items-end gap-3 md:grid-cols-3 xl:grid-cols-4 min-[1881px]:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]"
                    }
                  >
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Select Branch
                      </label>
                      <BranchDropdown
                        branchDdl={dropdownData}
                        onChange={handleBranchChange}
                        defaultValue={branchId ? String(branchId) : ""}
                        value={branchId ? String(branchId) : ""}
                        className="h-10 rounded-sm px-3"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Start Date
                      </label>
                      <InputDatePicker
                        selectedDate={startDate}
                        setSelectedDate={setStartDate}
                        setCurrentDate={setStartDate}
                        className="h-10 w-full rounded-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        End Date
                      </label>
                      <InputDatePicker
                        selectedDate={endDate}
                        setSelectedDate={setEndDate}
                        setCurrentDate={setEndDate}
                        className="h-10 w-full rounded-sm"
                      />
                    </div>

                    {/* Group or details, chosen up here rather than by opening one
                        row at a time. Both views are cut from the figures a single
                        Apply already fetched, so switching is instant and the two
                        can never show different totals. */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                        Report Type
                      </label>
                      <DropdownCommon
                        id="view_mode"
                        name="view_mode"
                        className="h-10"
                        value={viewMode}
                        data={VIEW_MODES}
                        onChange={(e) => setViewMode(e.target.value as ViewMode)}
                      />
                    </div>

                    <div
                      className={`flex gap-2 pt-1 ${
                        useFilterMenuEnabled
                          ? "justify-end"
                          : "hidden"
                      } ${useFilterMenuEnabled ? "" : "md:col-span-2 xl:col-span-1"}`}
                    >
                      <ButtonLoading
                        label="Apply"
                        onClick={handleActionButtonClick}
                        buttonLoading={buttonLoading}
                        className="h-10 px-6"
                        icon={<FiCheckSquare />}
                      />
                      <ButtonLoading
                        label="Reset"
                        onClick={handleResetFilters}
                        buttonLoading={false}
                        className="h-10 px-4"
                        icon={<FiRotateCcw />}
                      />

                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              className={`${
                useFilterMenuEnabled
                  ? "hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300"
                  : "hidden"
              }`}
            >
              Use the filter
            </div>

            {useFilterMenuEnabled ? (
              <div className="ml-auto flex items-end gap-2">
                <InputElement
                  type="number"
                  id="exp-per-page"
                  label=""
                  value={perPage}
                  onChange={(e: any) => setPerPage(Number(e.target.value) || 1)}
                  className="h-10 !w-20 text-center"
                />
                <InputElement
                  type="number"
                  id="exp-font-size"
                  label=""
                  value={fontSize}
                  onChange={(e: any) => setFontSize(Number(e.target.value) || 12)}
                  className="h-10 !w-20 text-center"
                />
                <PrintButton
                  label="Print"
                  onClick={handlePrint}
                  className="h-10 px-6"
                  disabled={!hasReportData}
                />
              </div>
            ) : (
              <div className="flex flex-nowrap items-end justify-between gap-3 overflow-x-auto xl:ml-auto">
                <div className="flex flex-nowrap items-end gap-2">
                  <ButtonLoading
                    label="Apply"
                    onClick={handleActionButtonClick}
                    buttonLoading={buttonLoading}
                    className="h-10 px-6"
                    icon={<FiCheckSquare />}
                  />

                  <ButtonLoading
                    label="Reset"
                    onClick={handleResetFilters}
                    buttonLoading={false}
                    className="h-10 px-4"
                    icon={<FiRotateCcw />}
                  />
                </div>
                <div className="flex flex-nowrap items-end gap-2">
                  <InputElement
                    type="number"
                    id="exp-per-page"
                    label=""
                    value={perPage}
                    onChange={(e: any) => setPerPage(Number(e.target.value) || 1)}
                    className="h-10 !w-20 text-center"
                  />
                  <InputElement
                    type="number"
                    id="exp-font-size"
                    label=""
                    value={fontSize}
                    onChange={(e: any) => setFontSize(Number(e.target.value) || 12)}
                    className="h-10 !w-20 text-center"
                  />
                  <PrintButton
                    label="Print"
                    onClick={handlePrint}
                    className="h-10 px-6"
                    disabled={!hasReportData}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {expenseReportState?.loading && (
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <Loader />
          </div>
        )}

        {!expenseReportState?.loading && !hasReportData && (
          <div className="rounded-sm border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-default dark:border-slate-700 dark:bg-boxdark">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
              No expense report loaded yet
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Select a branch and date range, then click Apply.
            </p>
          </div>
        )}

        {!expenseReportState?.loading && hasReportData && (
          <>
            {/* An expense report only ever runs one way, so the three cards read
                as a story — what was carried in, what was spent, what stands now
                — rather than the trial balance's Dr against Cr. */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SummaryCard
                title="Opening Expense"
                value={totals.openingDebit - totals.openingCredit}
                tone="slate"
              />
              <SummaryCard
                title="Expense This Period"
                value={totals.movementDebit - totals.movementCredit}
                tone="emerald"
              />
              <SummaryCard
                title="Closing Expense"
                value={totals.closingDebit - totals.closingCredit}
                tone="blue"
              />
            </div>

            <div className="overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-5 py-4 dark:border-strokedark">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {showingDetails ? "Expense Details" : "Expense Groups"}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {branchName}, {startDate ? dayjs(startDate).format("DD/MM/YYYY") : "-"} to{" "}
                      {endDate ? dayjs(endDate).format("DD/MM/YYYY") : "-"}
                    </p>
                  </div>
                  <div className="rounded-sm bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    Rows: {showingDetails ? detailTableData.length : rows.length}
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-5" style={{ fontSize: `${fontSize}px` }}>
	                {detailError && showingDetails ? (
                    <p className="rounded-sm bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                      {detailError}
                    </p>
                  ) : null}

                  {/* Two tables rather than one with a swapped column set: the
                      details view has no row to open, so it carries none of the
                      click, highlight and expansion wiring the group view needs. */}
                  {showingDetails ? (
                    <Table
                      columns={detailColumns}
                      data={detailTableData || []}
                      perPage={perPage}
                      headerRows={detailHeaderRows}
                      footerRows={detailFooterRows}
                      noDataMessage={
                        detailLoading ? "Loading details..." : "No expense data found"
                      }
                    />
                  ) : (
                    <Table
                      columns={columns}
                      data={tableData || []}
                      perPage={perPage}
                      headerRows={headerRows}
                      footerRows={footerRows}
                      noDataMessage="No expense data found"
                      onRowClick={handleGroupRowClick}
                      rowClassName={(row: any) =>
                        Number(row.key) === Number(expandedL3Id)
                          ? "bg-indigo-100 dark:bg-indigo-500/20"
                          : ""
                      }
                      renderRowExpansion={renderGroupDetails}
                    />
                  )}
	              </div>
            </div>
          </>
        )}
      </div>

      {/* The ref goes on the print component itself, not on a wrapper: it cuts
          its own pages now, and react-to-print has to be handed the element
          that carries them. rowsPerPage is the same Rows setting the screen
          uses, so what is on display and what comes off the printer break in
          the same places. */}
      <div className="hidden">
        <ExpenseReportPrint
          ref={printRef}
          branchName={branchName}
          startDate={startDate ? dayjs(startDate).format("DD/MM/YYYY") : "-"}
          endDate={endDate ? dayjs(endDate).format("DD/MM/YYYY") : "-"}
          title="Expense Report"
          rows={rows}
          detailRows={detailRows}
          showDetails={showingDetails}
          rowsPerPage={Number(perPage)}
          fontSize={Number(fontSize)}
          totals={totals}
        />
      </div>
    </>
  );
};

const SummaryCard = ({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "emerald" | "blue" | "amber" | "slate";
}) => {
  const toneMap: Record<string, string> = {
    emerald:
      "border-slate-200 bg-white text-slate-900 dark:border-strokedark dark:bg-boxdark dark:text-white",
    blue:
      "border-slate-200 bg-white text-slate-900 dark:border-strokedark dark:bg-boxdark dark:text-white",
    amber:
      "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100",
    slate:
      "border-slate-200 bg-white text-slate-900 dark:border-strokedark dark:bg-boxdark dark:text-white",
  };

  return (
    <div className={`rounded border px-4 py-4 shadow-sm ${toneMap[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
        {title}
      </p>
      <p className="mt-3 text-2xl font-semibold">{thousandSeparator(value)}</p>
    </div>
  );
};

export default ExpenseReport;
