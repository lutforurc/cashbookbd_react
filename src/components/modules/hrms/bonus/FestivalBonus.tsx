import { useEffect, useRef, useState } from "react";
import { FIELD_SELECT } from '../../../../theme/fieldStyles';
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";
import { FiCheckSquare, FiRotateCcw, FiSearch } from "react-icons/fi";
import Loader from "../../../../common/Loader";
import { ButtonLoading, PrintButton } from "../../../../pages/UiElements/CustomButtons";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import YearDropdown from "../../../utils/components/YearDropdown";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import Table from "../../../utils/others/Table";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { formatPaymentMonth } from "../../../utils/utils-functions/formatDate";
import FestivalBonusPrint from "./FestivalBonusPrint";
import FestivalBonusPaymentSelectionModal from "./FestivalBonusPaymentSelectionModal";
import {
  fetchFestivalBonusSheet,
  festivalBonusPayment,
  festivalBonusSheetPrint,
} from "./bonusSlice";
import routes from "../../../services/appRoutes";
import { Button } from '../../../../pages/UiElements/CustomButtons';
import { Select } from '../../../utils/fields/FormControls';
import FilterMenuShell from '../../../utils/components/FilterMenuShell';
import { isUserFeatureEnabled } from '../../../utils/userFeatureSettings';
import { useLanguage } from '../../../../i18n/useLanguage';
import { useLocalDigits } from '../../../../i18n/useLocalDigits';

const FestivalBonus = ({ user }: any) => {
  const dispatch: any = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, bonusSheet, bonusPrintSheet } = useSelector((state: any) => state.festivalBonus);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);
  // The user's own filter-panel choice (Settings -> User Feature Settings).
  // Off, the fields sit inline above the table, the way the other reports do.
  const useFilterMenuEnabled = isUserFeatureEnabled(settings, 'use_filter_parameter');

  const [branchId, setBranchId] = useState<string | number>(user?.branch_id ?? "");
  const [yearId, setYearId] = useState<string>("");
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [fontSize, setFontSize] = useState<number>(11);
  const [rowsPerPage, setRowsPerPage] = useState<number>(0);
  const [shouldPrint, setShouldPrint] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const { code: languageCode } = useLanguage();
  const digitsRef = useRef<HTMLDivElement>(null);
  // The year options and the figures read in Bangla digits while the screen is
  // in Bangla, the way the other reports do.
  useLocalDigits(digitsRef, languageCode !== 'en');
  const [filterOpen, setFilterOpen] = useState(false);
  const restoredYearId = location.state?.yearId ? String(location.state.yearId) : "";

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  useEffect(() => {
    if (!restoredYearId) return;
    setYearId(restoredYearId);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, navigate, restoredYearId]);

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

  useEffect(() => {
    setTableData(
      Array.isArray(bonusSheet?.data?.data)
        ? bonusSheet.data.data
        : Array.isArray(bonusSheet?.data)
          ? bonusSheet.data
          : []
    );
  }, [bonusSheet]);

  useEffect(() => {
    if (!filterOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterOpen]);

  const handleSearch = async (e?: any) => {
    if (e?.preventDefault) e.preventDefault();
    if (!yearId) {
      toast.info("Please select year");
      return;
    }

    try {
      await dispatch(fetchFestivalBonusSheet({ branch_id: branchId, year_id: yearId })).unwrap();
    } catch (error: any) {
      toast.error(typeof error === "string" ? error : error?.message || "Bonus sheet load failed");
    }
  };

  const handleApplyFilters = async (e?: any) => {
    await handleSearch(e);
    setFilterOpen(false);
  };

  const handleResetFilters = () => {
    setBranchId(user?.branch_id ?? "");
    setYearId("");
    setFontSize(11);
    setFilterOpen(false);
  };

  useEffect(() => {
    if (shouldPrint && bonusPrintSheet?.data?.length > 0 && printRef.current) {
      handlePrintAction();
      setShouldPrint(false);
    }
  }, [shouldPrint, bonusPrintSheet]);

  const handlePrintAction = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Bonus Sheet",
  });

  const handleHeaderPrint = () => {
    if (bonusPrintSheet?.data?.length > 0 && printRef.current) {
      handlePrintAction();
      return;
    }

    toast.info("Print করতে আগে নিচের Bonus Title থেকে detail sheet open করুন।");
  };

  const handleOpenDetails = async (row: any, mode: "print" | "payment") => {
    try {
      await dispatch(festivalBonusSheetPrint(row)).unwrap();
      setSelectedRow(row);

      if (mode === "print") {
        setShouldPrint(true);
      } else {
        setShowPaymentModal(true);
      }
    } catch (error: any) {
      toast.error(typeof error === "string" ? error : error?.message || "Bonus details load failed");
    }
  };

  const handleActionChange = async (row: any, action: string) => {
    if (action === "update") {
      navigate(routes.hrms_festival_bonus_update, {
        state: {
          row,
          yearId,
        },
      });
      return;
    }

    if (action === "payment") {
      await handleOpenDetails(row, "payment");
    }
  };

  const handlePaymentSubmit = async (rows: { id: number; pay_amount: number }[]) => {
    if (!selectedRow) return;

    setPaymentLoading(true);
    try {
      const totalPayAmount = rows.reduce((sum, row) => sum + Number(row.pay_amount || 0), 0);
      const response = await dispatch(
        festivalBonusPayment({
          data: {
            ...selectedRow,
            bonus_payment_ids: rows.map((row) => row.id),
            payment_rows: rows,
            pay_amount: totalPayAmount,
          },
        })
      ).unwrap();

      toast.success(response?.message || "Festival bonus payment completed successfully");
      setShowPaymentModal(false);
      if (yearId) {
        await dispatch(fetchFestivalBonusSheet({ branch_id: branchId, year_id: yearId })).unwrap();
      }
    } catch (error: any) {
      toast.error(typeof error === "string" ? error : error?.message || "Festival bonus payment failed");
    } finally {
      setPaymentLoading(false);
    }
  };

  const columns = [
    { key: "serial_no", header: "SL", headerClass: "text-center", cellClass: "text-center" },
    ...(!branchId
      ? [
          {
            key: "branch_name",
            header: "Branch",
            render: (row: any) => row.main_trx?.branch?.name ?? "",
          },
        ]
      : []),
    {
      key: "bonus_title",
      header: "Bonus Title",
      render: (row: any) => (
        <Button type="button" onClick={() => handleOpenDetails(row, "print")} className="cursor-pointer text-left font-semibold text-blue-600 hover:underline dark:text-blue-400">
          {row.bonus_title}
        </Button>
      ),
    },
    { key: "payment_month", header: "Month", render: (row: any) => formatPaymentMonth(row.payment_month) },
    { key: "total_employee", header: "Employees", headerClass: "text-right", cellClass: "text-right" },
    {
      key: "bonus_amount",
      header: "Bonus Amount",
      headerClass: "text-right",
      cellClass: "text-right font-medium text-slate-700 dark:text-slate-200",
      render: (row: any) => thousandSeparator(Number(row.bonus_amount || 0)),
    },
    {
      key: "payment_amount",
      header: "Paid",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => {
        const value = Number(row.payment_amount || 0);
        return value > 0 ? (
          <span className="font-medium text-emerald-600 dark:text-emerald-400">{thousandSeparator(value)}</span>
        ) : (
          <span className="text-slate-400 dark:text-slate-600">-</span>
        );
      },
    },
    {
      key: "due",
      header: "Due",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => {
        const due = Number(row.bonus_amount || 0) - Number(row.payment_amount || 0);
        return due > 0 ? (
          <span className="font-semibold text-rose-600 dark:text-rose-400">{thousandSeparator(due)}</span>
        ) : (
          <span className="text-slate-400 dark:text-slate-600">-</span>
        );
      },
    },
    {
      key: "action",
      header: "Action",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => {
        const dueAmount = Number(row.bonus_amount || 0) - Number(row.payment_amount || 0);
        if (dueAmount <= 0) {
          return <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Paid</span>;
        }

        return (
          <Select
            defaultValue=""
            onChange={(e) => {
              const value = e.target.value;
              e.target.value = "";
              void handleActionChange(row, value);
            }}
            className={`${FIELD_SELECT} min-w-28 px-2 py-1 text-sm`}
          >
            <option value="">Select</option>
            <option value="update">Update</option>
            <option value="payment">Payment</option>
          </Select>
        );
      },
    },
  ];

  const handlePerPageChange = (e: any) => {
    const value = e.target.value;
    const numericValue = Number(value);
    if (!isNaN(numericValue) && numericValue > 0) {
      setRowsPerPage(numericValue);
    }
  };


  return (
    <>
      <HelmetTitle title="Bonus Reports" />
      {loading && <Loader />}

      <div className="space-y-6" ref={digitsRef}>
        <div className="px-0 py-3">
         
          <div className="flex flex-wrap items-start justify-between gap-3">
            {/* The user's filter-panel switch (use_filter_parameter), the same
                shell the other reports use: a panel when it is on, the fields
                inline above the table when it is off. */}
            <FilterMenuShell
              enabled={useFilterMenuEnabled}
              isOpen={filterOpen}
              onToggle={() => setFilterOpen((prev) => !prev)}
              containerRef={filterMenuRef}
              menuWidthClassName="w-[min(92vw,320px)]"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Branch</label>
                <BranchDropdown
                  defaultValue={branchId?.toString()}
                  onChange={(e: any) => {
                    const value = e.target.value;
                    setBranchId(value === "" ? "" : Number(value));
                  }}
                  className="w-full p-2 text-sm font-medium"
                  branchDdl={dropdownData}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Select Year</label>
                <YearDropdown
                  className="w-full text-sm"
                  name="year"
                  value={yearId}
                  onChange={(e: any) => setYearId(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <ButtonLoading
                  onClick={handleApplyFilters}
                  buttonLoading={loading}
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

            <div className="ml-auto flex items-end gap-2">
              <div>
                  
                  <PrintRowsInput
                    id="perPage"
                    name="perPage"
                    label=""
                    value={rowsPerPage.toString()}
                    // onChange={handlePerPageChange}
                    onChange={(e) => setRowsPerPage(Number(e.target.value) || 0)}
                    type='text'
                    className="mt-0 w-20! text-center"
                  />
              </div>

              
              <div className="">
                <PrintFontInput
 id="print_font_size_inline"
 value={String(fontSize)}
 name="print_font_size_inline"
 placeholder="Font Size"
 label=""
 className="mt-0 w-20! text-center"
 type="number"
 onChange={(e) => setFontSize(Number(e.target.value) || 11)}
                />
              </div>
              <ButtonLoading onClick={handleSearch} label="Search" icon={<FiSearch size={15} />} className="px-6 bg-meta-4 hover:bg-graydark" />
              <PrintButton
                onClick={handleHeaderPrint}
                label="Print"
                className="px-6 bg-meta-4 hover:bg-graydark"
              />
            </div>
          </div>
        </div>

        <div className="border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))]">
          <Table columns={columns} data={tableData} perPage={10} />
        </div>
      </div>

      <div className="hidden">
        <div ref={printRef}>
          <FestivalBonusPrint rows={bonusPrintSheet?.data || []} meta={bonusPrintSheet?.meta} vr_no={bonusPrintSheet?.vr_no} vr_date={bonusPrintSheet?.vr_date} rowsPerPage={rowsPerPage} fontSize={fontSize} />
        </div>
      </div>

      <FestivalBonusPaymentSelectionModal
        open={showPaymentModal}
        loading={paymentLoading}
        rows={bonusPrintSheet?.data || []}
        paymentMonth={selectedRow?.payment_month}
        bonusTitle={selectedRow?.bonus_title}
        onClose={() => setShowPaymentModal(false)}
        onPrint={() => setShouldPrint(true)}
        onSubmit={handlePaymentSubmit}
      />
    </>
  );
};

export default FestivalBonus;
