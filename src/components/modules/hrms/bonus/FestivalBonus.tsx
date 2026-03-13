import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";
import Loader from "../../../../common/Loader";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import YearDropdown from "../../../utils/components/YearDropdown";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider";
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

  useEffect(() => {
    if (shouldPrint && bonusPrintSheet?.data?.length > 0 && printRef.current) {
      handlePrintAction();
      setShouldPrint(false);
    }
  }, [shouldPrint, bonusPrintSheet]);

  const handlePrintAction = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "Festival Bonus Sheet",
    removeAfterPrint: true,
  });

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
        <button type="button" onClick={() => handleOpenDetails(row, "print")} className="text-left font-semibold text-amber-700 hover:text-amber-800">
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
            <ButtonLoading onClick={() => handleOpenDetails(row, "payment")} label="Payment" className="bg-emerald-600 px-3 py-1 text-xs hover:bg-emerald-700" />
          </div>
        );
      },
    },
  ];

  return (
    <>
      <HelmetTitle title="Festival Bonus Reports" />
      {loading && <Loader />}

      <div className="space-y-6">
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-emerald-50 px-6 py-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Festival Bonus Reports</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            বছরভিত্তিক bonus batch, payment status, print view এবং partial payment এখান থেকে manage করতে পারবেন।
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form onSubmit={handleSearch} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Branch</label>
              <BranchDropdown branches={dropdownData} value={branchId} onChange={(e: any) => setBranchId(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Year</label>
              <YearDropdown value={yearId} onChange={(e: any) => setYearId(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Print Font Size</label>
              <input value={fontSize} onChange={(e) => setFontSize(Number(e.target.value) || 11)} type="number" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none" />
            </div>
            <div className="flex items-end">
              <ButtonLoading onClick={handleSearch} label="Search" className="w-full bg-amber-600 px-5 py-2 hover:bg-amber-700" />
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
