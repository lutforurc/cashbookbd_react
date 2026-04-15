import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";
import { FiFilter, FiX } from "react-icons/fi";
import Loader from "../../../../common/Loader";
import { ButtonLoading, PrintButton } from "../../../../pages/UiElements/CustomButtons";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import YearDropdown from "../../../utils/components/YearDropdown";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
import InputElement from "../../../utils/fields/InputElement";
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

const FestivalBonus = ({ user }: any) => {
  const dispatch: any = useDispatch();
  const { loading, bonusSheet, bonusPrintSheet } = useSelector((state: any) => state.festivalBonus);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings);

  const [branchId, setBranchId] = useState<string | number>(user?.branch_id ?? "");
  const [yearId, setYearId] = useState<string>("");
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [fontSize, setFontSize] = useState<number>(11);
  const [shouldPrint, setShouldPrint] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

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
    content: () => printRef.current,
    documentTitle: "Bonus Sheet",
    removeAfterPrint: true,
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
        <button type="button" onClick={() => handleOpenDetails(row, "print")} className="text-left font-semibold text-blue-600 hover:text-blue-700">
          {row.bonus_title}
        </button>
      ),
    },
    { key: "payment_month", header: "Month", render: (row: any) => formatPaymentMonth(row.payment_month) },
    { key: "total_employee", header: "Employees", headerClass: "text-right", cellClass: "text-right" },
    {
      key: "bonus_amount",
      header: "Bonus Amount",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => thousandSeparator(Number(row.bonus_amount || 0), 0),
    },
    {
      key: "payment_amount",
      header: "Paid",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => thousandSeparator(Number(row.payment_amount || 0), 0),
    },
    {
      key: "due",
      header: "Due",
      headerClass: "text-right",
      cellClass: "text-right font-semibold",
      render: (row: any) => thousandSeparator(Number(row.bonus_amount || 0) - Number(row.payment_amount || 0), 0),
    },
    {
      key: "action",
      header: "Action",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => {
        const dueAmount = Number(row.bonus_amount || 0) - Number(row.payment_amount || 0);
        if (dueAmount <= 0) {
          return <span className="text-green-600">Paid</span>;
        }

        return (
          <div className="flex justify-end gap-2">
            <ButtonLoading onClick={() => handleOpenDetails(row, "print")} label="Print" className="bg-slate-600 px-3 py-1 text-xs hover:bg-slate-700" />
            <ButtonLoading onClick={() => handleOpenDetails(row, "payment")} label="Payment" className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700" />
          </div>
        );
      },
    },
  ];

  return (
    <>
      <HelmetTitle title="Bonus Reports" />
      {loading && <Loader />}

      <div className="space-y-6">
        <div className="px-0 py-3">
         
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="relative" ref={filterMenuRef}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterOpen((prev) => !prev)}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded border text-sm transition ${
                    filterOpen
                      ? "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
                      : "border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-boxdark dark:text-blue-300 dark:hover:bg-boxdark-2"
                  }`}
                  aria-label="Open filters"
                >
                  <FiFilter size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setFilterOpen((prev) => !prev)}
                  className="text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-bodydark dark:hover:text-white"
                >
                  Use the filter
                </button>
              </div>

              {filterOpen && (
                <form
                  onSubmit={handleApplyFilters}
                  className="absolute left-0 top-full z-30 mt-2 w-[min(320px,calc(100vw-2rem))] rounded-md border border-stroke bg-white p-4 shadow-2xl dark:border-form-strokedark dark:bg-boxdark"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">Filter Menu</span>
                    <button
                      type="button"
                      onClick={() => setFilterOpen(false)}
                      className="rounded-sm p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-boxdark-2 dark:hover:text-bodydark1"
                      aria-label="Close filter menu"
                    >
                      <FiX />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-bodydark1">Select Branch</label>
                      <BranchDropdown
                        defaultValue={branchId?.toString()}
                        onChange={(e: any) => {
                          const value = e.target.value;
                          setBranchId(value === "" ? "" : Number(value));
                        }}
                        className="h-10 w-full border-form-strokedark bg-boxdark font-medium text-sm"
                        branchDdl={dropdownData}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-bodydark1">Select Year</label>
                      <YearDropdown
                        className="h-10 w-full border-form-strokedark bg-boxdark text-sm"
                        name="year"
                        value={yearId}
                        onChange={(e: any) => setYearId(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-bodydark1">Font Size</label>
                      <InputElement
                        id="print_font_size"
                        value={String(fontSize)}
                        name="print_font_size"
                        placeholder="Enter Print Font Size"
                        label=""
                        className="mt-0 h-10 border-form-strokedark bg-boxdark text-white"
                        type="number"
                        onChange={(e) => setFontSize(Number(e.target.value) || 11)}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <ButtonLoading onClick={handleApplyFilters} label="Apply" className="h-10 px-6 bg-meta-4 hover:bg-graydark" />
                      <ButtonLoading onClick={handleResetFilters} buttonLoading={false} label="Reset" icon="" className="h-10 px-4 bg-meta-4 hover:bg-graydark" />
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="ml-auto flex items-end gap-2">
              <div className="w-28">
                
                <InputElement
                  id="print_font_size_inline"
                  value={String(fontSize)}
                  name="print_font_size_inline"
                  placeholder="Font Size"
                  label=""
                  className="mt-0 h-10 !w-full border-form-strokedark bg-boxdark text-center text-white"
                  type="number"
                  onChange={(e) => setFontSize(Number(e.target.value) || 11)}
                />
              </div>
              <ButtonLoading onClick={handleSearch} label="Search" className="h-10 px-6 bg-meta-4 hover:bg-graydark" />
              <PrintButton
                onClick={handleHeaderPrint}
                label="Print"
                className="h-10 px-6 bg-meta-4 hover:bg-graydark"
              />
            </div>
          </div>
        </div>

        <div className="">
          <Table columns={columns} data={tableData} perPage={10} />
        </div>
      </div>

      <div className="hidden">
        <div ref={printRef}>
          <FestivalBonusPrint rows={bonusPrintSheet?.data || []} meta={bonusPrintSheet?.meta} vr_no={bonusPrintSheet?.vr_no} vr_date={bonusPrintSheet?.vr_date} fontSize={fontSize} />
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
