import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import { FiCheckSquare, FiRotateCcw } from "react-icons/fi";

import { ButtonLoading, PrintButton } from "../../../../pages/UiElements/CustomButtons";
import InputDatePicker from "../../../utils/fields/DatePicker";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import FilterMenuShell from '../../../utils/components/FilterMenuShell';
import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import Table from "../../../utils/others/Table";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import dateRangeError from "../../../utils/utils-functions/dateRangeError";

import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import { fetchProfitLossDateWise } from "./profitLossDateWiseSlice";
import ProfitLossDateWisePrint from "./ProfitLossDateWisePrint";
import { isUserFeatureEnabled } from "../../../utils/userFeatureSettings";

const ZERO_TOTALS = { purchase: 0, sales: 0, profit: 0, loss: 0 };

/** A profit plain, a loss in brackets -- the accounting convention. */
const fmtProfitLoss = (profit: number, loss: number) => {
  if (profit > 0) return thousandSeparator(profit);
  if (loss > 0) return `(${thousandSeparator(loss)})`;
  return "-";
};

const ProfitLossDateWise = (user: any) => {
  const dispatch = useDispatch<any>();
  const branchDdlData: any = useSelector((state: any) => state.branchDdl);
  const profitLossDateWise: any = useSelector((state: any) => state.profitLossDateWise);
  const settings = useSelector((state: any) => state.settings);
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [perPage, setPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(12);
  const [filterOpen, setFilterOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(Number(user?.user?.branch_id) || null);
  }, []);

  // The month so far: its first day to the branch's transaction date, since a
  // run may not span more than 31 days.
  useEffect(() => {
    const protectedData = branchDdlData?.protectedData;
    if (!protectedData) return;

    const { data: ddl, transactionDate } = protectedData;
    if (ddl) setDropdownData(ddl);

    if (transactionDate) {
      try {
        const [day, month, year] = transactionDate
          .split("/")
          .map((str: string) => Number(str.trim()));

        if (isNaN(year) || year < 1900 || year > 2100) return;

        setStartDate(new Date(year, month - 1, 1));
        setEndDate(new Date(year, month - 1, day));
      } catch {
        /* an unreadable date leaves the pickers empty for the reader to set. */
      }
    }
  }, [branchDdlData?.protectedData?.data, branchDdlData?.protectedData?.transactionDate]);

  const handleRun = () => {
    if (!branchId) return alert("Branch select করুন");
    if (!startDate || !endDate) return alert("Start/End Date দিন");
    const rangeError = dateRangeError(startDate, endDate);
    if (rangeError) return alert(rangeError);

    dispatch(
      fetchProfitLossDateWise({
        branch_id: Number(branchId),
        start_date: dayjs(startDate).format("YYYY-MM-DD"),
        end_date: dayjs(endDate).format("YYYY-MM-DD"),
      })
    );

    setFilterOpen(false);
  };

  const handleResetFilters = () => {
    setFilterOpen(false);
  };

  const rows = useMemo(() => profitLossDateWise?.data?.rows ?? [], [profitLossDateWise?.data]);
  const totals = profitLossDateWise?.data?.totals ?? ZERO_TOTALS;
  const adjustment = profitLossDateWise?.data?.adjustment ?? null;
  const hasReport = rows.length > 0;

  const columns = [
    {
      key: "sl_no",
      header: "Sl No",
      headerClass: "text-center",
      cellClass: "text-center",
      width: "70px",
    },
    {
      key: "date_display",
      header: "Date",
      headerClass: "text-center",
      cellClass: "text-center",
      width: "140px",
    },
    {
      key: "purchase",
      header: "Total Purchase",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => (Number(row.purchase) !== 0 ? thousandSeparator(row.purchase) : "-"),
    },
    {
      key: "sales",
      header: "Total Sales",
      headerClass: "text-right",
      cellClass: "text-right",
      // `!== 0`: a day with only a sales return has negative net sales.
      render: (row: any) => (Number(row.sales) !== 0 ? thousandSeparator(row.sales) : "-"),
    },
    {
      key: "profit",
      header: "Profit or Loss",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) =>
        Number(row.profit) > 0 ? (
          thousandSeparator(row.profit)
        ) : Number(row.loss) > 0 ? (
          <span className="text-red-600 dark:text-red-400">({thousandSeparator(row.loss)})</span>
        ) : (
          "-"
        ),
    },
  ];

  // The Adjustment line: purchase return/discount, stock with no sale and
  // valuation differences the FIFO days cannot carry -- it brings the Total
  // onto the Profit & Loss Account's Gross Profit.
  const adjustmentRow = adjustment
    ? [
        [
          { label: "Adjustment (to P&L Gross Profit)", colSpan: 2, className: "text-right" },
          { label: Number(adjustment.purchase) ? thousandSeparator(adjustment.purchase) : "-", className: "text-right" },
          { label: Number(adjustment.sales) ? thousandSeparator(adjustment.sales) : "-", className: "text-right" },
          {
            label: (
              <span className={adjustment.loss > 0 ? "text-red-600 dark:text-red-400" : ""}>
                {fmtProfitLoss(adjustment.profit || 0, adjustment.loss || 0)}
              </span>
            ),
            className: "text-right",
          },
        ],
      ]
    : [];

  const footerRows = hasReport
    ? [
        ...adjustmentRow,
        [
          { label: "Total", colSpan: 2, className: "text-right" },
          { label: thousandSeparator(totals.purchase || 0), className: "text-right" },
          { label: thousandSeparator(totals.sales || 0), className: "text-right" },
          {
            label: (
              <span className={totals.loss > 0 ? "text-red-600 dark:text-red-400" : ""}>
                {fmtProfitLoss(totals.profit || 0, totals.loss || 0)}
              </span>
            ),
            className: "text-right",
          },
        ],
      ]
    : [];

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Profit & Loss (Date Wise)",
  });

  // The three filter fields, drawn inline or inside the filter menu.
  const filterFields = (
    <>
      <div className="min-w-[260px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
        {branchDdlData?.isLoading ? <Loader /> : null}
        <BranchDropdown
          defaultValue={user?.user?.branch_id}
          value={branchId == null ? "" : String(branchId)}
          onChange={(e: any) => setBranchId(Number(e.target.value) || null)}
          branchDdl={dropdownData}
          className="w-full max-w-full font-medium text-sm p-2"
        />
      </div>

      <div className="min-w-[180px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
        <InputDatePicker
          selectedDate={startDate}
          setSelectedDate={setStartDate}
          setCurrentDate={setStartDate}
          className="font-medium text-sm w-full"
        />
      </div>

      <div className="min-w-[180px] flex-1">
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
        <InputDatePicker
          selectedDate={endDate}
          setSelectedDate={setEndDate}
          setCurrentDate={setEndDate}
          className="font-medium text-sm w-full"
        />
      </div>
    </>
  );

  return (
    <div>
      <HelmetTitle title={"Profit & Loss (Date Wise)"} />

      <div className="px-0 py-3">
        <div className="flex flex-wrap items-end gap-3">
          {useFilterMenuEnabled ? (
            <FilterMenuShell
              enabled
              isOpen={filterOpen}
              onToggle={() => setFilterOpen((prev) => !prev)}
              menuWidthClassName="w-[min(92vw,320px)]"
            >
              {filterFields}
              <div className="flex justify-end gap-2 pt-1">
                <ButtonLoading
                  onClick={handleRun}
                  buttonLoading={profitLossDateWise?.isLoading}
                  label="Apply"
                  icon={<FiCheckSquare />}
                  className="px-6"
                />
                <ButtonLoading
                  onClick={handleResetFilters}
                  buttonLoading={false}
                  label="Reset"
                  icon={<FiRotateCcw />}
                  className="px-4"
                />
              </div>
            </FilterMenuShell>
          ) : (
            filterFields
          )}

          {useFilterMenuEnabled ? (
            <div className="ml-auto flex items-end gap-2">
              <PrintRowsInput
                id="perPage"
                name="perPage"
                label="Rows"
                value={perPage.toString()}
                onChange={(e) => setPerPage(Number(e.target.value))}
                type="text"
                className="w-20! text-sm text-center"
              />
              <PrintFontInput
                id="fontSize"
                name="fontSize"
                label="Font"
                value={fontSize.toString()}
                onChange={(e) => setFontSize(Number(e.target.value))}
                type="text"
                className="w-20! text-sm text-center"
              />
              <PrintButton
                onClick={handlePrint}
                label="Print"
                className="px-6"
                disabled={!hasReport}
              />
            </div>
          ) : (
            <div className="grid min-w-max grid-cols-[auto_auto_minmax(88px,0.45fr)_minmax(88px,0.45fr)_auto] items-end gap-2 overflow-x-auto max-md:ml-0 max-md:w-full xl:ml-auto">
              <ButtonLoading
                onClick={handleRun}
                buttonLoading={profitLossDateWise?.isLoading}
                label="Apply"
                icon={<FiCheckSquare />}
                className="px-6"
              />
              <ButtonLoading
                onClick={handleResetFilters}
                buttonLoading={false}
                label="Reset"
                icon={<FiRotateCcw />}
                className="px-4"
              />
              <PrintRowsInput
                id="perPage"
                name="perPage"
                label="Rows"
                value={perPage.toString()}
                onChange={(e) => setPerPage(Number(e.target.value))}
                type="text"
                className="w-20! text-sm text-center"
              />
              <PrintFontInput
                id="fontSize"
                name="fontSize"
                label="Font"
                value={fontSize.toString()}
                onChange={(e) => setFontSize(Number(e.target.value))}
                type="text"
                className="w-20! text-sm text-center"
              />
              <PrintButton
                onClick={handlePrint}
                label="Print"
                className="px-6"
                disabled={!hasReport}
              />
            </div>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-auto">
        {profitLossDateWise?.isLoading ? <Loader /> : null}
        <Table
          columns={columns}
          data={rows}
          perPage={perPage}
          footerRows={footerRows}
          noDataMessage="Click Apply to view the report. Dates with no purchase or sale are not listed."
        />
      </div>

      {/* HIDDEN PRINT COMPONENT */}
      <div className="hidden">
        <ProfitLossDateWisePrint
          ref={printRef}
          rows={rows}
          adjustment={adjustment}
          totals={totals}
          startDate={startDate ? dayjs(startDate).format("DD/MM/YYYY") : ""}
          endDate={endDate ? dayjs(endDate).format("DD/MM/YYYY") : ""}
          rowsPerPage={perPage}
          fontSize={fontSize}
          title="Profit & Loss (Date Wise)"
        />
      </div>
    </div>
  );
};

export default ProfitLossDateWise;
