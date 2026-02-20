import React, { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiRefreshCcw, FiSearch } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import dayjs from "dayjs";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import InputElement from "../../../utils/fields/InputElement";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import Link from "../../../utils/others/Link";
import InputDatePicker from "../../../utils/fields/DatePicker";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { unitSalePaymentsList } from "./unitSalePaymentsSlice";
import Table from "../../../utils/others/Table";
import Pagination from "../../../utils/utils-functions/Pagination";
import SelectOption from "../../../utils/utils-functions/SelectOption";

/* ================= CONSTANTS ================= */

const PAYMENT_MODES = [
  { id: "", name: "All Modes" },
  { id: "CASH", name: "Cash" },
  { id: "BKASH", name: "bKash" },
  { id: "NAGAD", name: "Nagad" },
  { id: "ROCKET", name: "Rocket" },
  { id: "UPAY", name: "Upay" },
  { id: "BANK_TRANSFER", name: "Bank Transfer" },
  { id: "CHEQUE", name: "Cheque" },
  { id: "POS_CARD", name: "POS Card" },
  { id: "MOBILE_BANKING", name: "Mobile Banking" },
  { id: "OTHERS", name: "Others" },
];

// UI only (backend validation এ cheque_collect_status নাই)
const CHEQUE_STATUSES = [
  { id: "", name: "All Cheque Status" },
  { id: "PENDING", name: "Pending" },
  { id: "COLLECTED", name: "Collected" },
  { id: "BOUNCED", name: "Bounced" },
  { id: "CANCELLED", name: "Cancelled" },
];

const STATUSES = [
  { id: "", name: "All Status" },
  { id: "PENDING", name: "Pending" },
  { id: "CONFIRMED", name: "Confirmed" },
  { id: "REJECTED", name: "Rejected" },
  { id: "REVERSED", name: "Reversed" },
];

/* ================= TYPES ================= */

type Row = {
  id: number;
  serial_no?: number;

  branch_id: number;
  booking_id: number;
  receipt_no: string;
  payment_date: string;
  amount: string | number;
  payment_type: string;
  payment_mode: string;

  reference_no?: string | null;
  bank_name?: string | null;
  branch_name?: string | null;

  cheque_collect_status: string;
  cheque_deposit_due_date?: string | null;
  cheque_collect_date?: string | null;

  status: string;
};

type PaginationState = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

/* ================= COMPONENT ================= */

export default function UnitSalePaymentList() {
  const dispatch = useDispatch<any>();

  const [isLoading, setIsLoading] = useState(false);

  // local render state
  const [rows, setRows] = useState<Row[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  // filters
  const [q, setQ] = useState("");
  const [paymentMode, setPaymentMode] = useState<string>("");
  const [chequeStatus, setChequeStatus] = useState<string>(""); // UI only
  const [status, setStatus] = useState<string>("");

  // DatePicker
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  // per page
  const [perPage, setPerPage] = useState<string>("10");

  // Date -> string
  const dateFromStr = useMemo(
    () => (dateFrom ? dayjs(dateFrom).format("YYYY-MM-DD") : ""),
    [dateFrom]
  );

  const dateToStr = useMemo(
    () => (dateTo ? dayjs(dateTo).format("YYYY-MM-DD") : ""),
    [dateTo]
  );

  // ✅ backend keys only
  const params = useMemo(() => {
    return {
      q: q || undefined,
      payment_mode: paymentMode || undefined,
      status: status || undefined,
      date_from: dateFromStr || undefined,
      date_to: dateToStr || undefined,

      // ✅ add this
      cheque_collect_status: chequeStatus || undefined,
    };
  }, [q, paymentMode, status, dateFromStr, dateToStr, chequeStatus]);

  const loadData = async (page = 1, perPageOverride?: number) => {
    try {
      setIsLoading(true);

      const perPageNum = perPageOverride ?? Number(perPage) ?? 20;

      const result = await dispatch(
        unitSalePaymentsList({
          ...params,
          page,
          perPage: perPageNum,
        })
      ).unwrap();

      const p = result?.paginator;

      const current = Number(p?.current_page ?? page);
      const per = Number(p?.per_page ?? perPageNum);
      const start = (current - 1) * per;

      const list: Row[] = (result?.rows ?? []).map((r: any, idx: number) => ({
        ...r,
        serial_no: r?.serial_no ?? start + idx + 1,
      }));

      setRows(list);
      setPagination({
        current_page: current,
        last_page: Number(p?.last_page ?? 1),
        per_page: per,
        total: Number(p?.total ?? list.length),
      });
    } catch (e: any) {
      toast.info(
        e?.response?.data?.message || e?.message || "Failed to load list"
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* ✅ Only ONE effect for initial load + perPage change */
  useEffect(() => {
    setPagination((p) => ({ ...p, current_page: 1 }));
    loadData(1, Number(perPage) || 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perPage]);

  const handleSearch = () => {
    setPagination((p) => ({ ...p, current_page: 1 }));
    loadData(1);
  };

  const handleReset = () => {
    setQ("");
    setPaymentMode("");
    setChequeStatus("");
    setStatus("");
    setDateFrom(null);
    setDateTo(null);
    setPerPage("20");
    setPagination((p) => ({ ...p, current_page: 1 }));
    loadData(1, 20);
  };

  const goPage = (page: number) => {
    if (page < 1 || page > pagination.last_page) return;
    setPagination((p) => ({ ...p, current_page: page }));
    loadData(page);
  };

  const onPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPerPage(e.target.value);
  };

  const handleStartDate = (d: Date | null) => setDateFrom(d);
  const handleEndDate = (d: Date | null) => setDateTo(d);

  /* ✅ Pagination variables */
  const currentPage = pagination.current_page || 1;
  const totalPages = pagination.last_page || 1;

  const handlePageChange = (page: number) => {
    goPage(page);
  };

  /* ✅ UI-only filtering (Cheque Status) */
  const filteredRows = useMemo(() => {
    if (!chequeStatus) return rows;
    return rows.filter((r) => (r?.cheque_collect_status || "") === chequeStatus);
  }, [rows, chequeStatus]);

  const PAYMENT_TYPE_LABEL: Record<string, string> = {
    BOOKING: "Booking",
    DOWN_PAYMENT: "Down Payment",
    INSTALLMENT: "Installment",
    ADJUSTMENT: "Adjustment",
    PENALTY: "Penalty",
    REFUND: "Refund",
    SECURITY_DEPOSIT: "Security Deposit",
    OTHER: "Other",
  };

  const formatPaymentType = (v?: string | null) => {
    if (!v) return "-";
    return PAYMENT_TYPE_LABEL[v] ?? v; // fallback to original
  };

  const columns = [
    {
      key: "serial_no",
      header: "#",
      width: "80px",
      headerClass: "text-center",
      cellClass: "text-center",
      render: (row: any) => <div>{row?.serial_no ? row.serial_no : "-"}</div>,
    },
    {
      key: "payment_date",
      header: "Date",
      width: "140px",
      headerClass: "text-left",
      cellClass: "text-left",
      render: (row: any) => (
        <div>
          {row?.payment_date
            ? dayjs(row.payment_date).format("YYYY-MM-DD")
            : "-"}
        </div>
      ),
    },
    {
      key: "receipt_no",
      header: "Receipt No",
      width: "140px",
      headerClass: "text-left",
      cellClass: "text-left",
      render: (row: any) => <div>{row?.receipt_no ? row.receipt_no : "-"}</div>,
    },
    {
      key: "booking_id",
      header: "Booking ID",
      width: "120px",
      headerClass: "text-left",
      cellClass: "text-left",
      render: (row: any) => <div>{row?.booking_id ? row.booking_id : "-"}</div>,
    },
    {
      key: "payment_mode",
      header: "Payment Mode",
      width: "130px",
      headerClass: "text-left",
      cellClass: "text-left",
      render: (row: any) => (
        <div>{row?.payment_mode ? row.payment_mode : "-"}</div>
      ),
    },
    {
      key: "payment_type",
      header: "Payment For",
      width: "140px",
      headerClass: "text-left",
      cellClass: "text-left",
      render: (row: any) => (
        <div>{formatPaymentType(row?.payment_type)}</div>
      ),
    },
    {
      key: "reference_no",
      header: "Check/Ref No",
      width: "160px",
      headerClass: "text-left",
      cellClass: "text-left",
      render: (row: any) => (
        <div>{row?.reference_no ? row.reference_no : "-"}</div>
      ),
    },
    {
      key: "bank_name",
      header: "Bank Name",
      width: "160px",
      headerClass: "text-left",
      cellClass: "text-left",
      render: (row: any) => <div>{row?.bank_name ? row.bank_name : "-"}</div>,
    },
    {
      key: "branch_name",
      header: "Branch Name",
      width: "160px",
      headerClass: "text-left",
      cellClass: "text-left",
      render: (row: any) => (
        <div>{row?.branch_name ? row.branch_name : "-"}</div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      width: "140px",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => (
        <div>{row?.amount ? thousandSeparator(Number(row.amount), 2) : "-"}</div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      headerClass: "text-left",
      cellClass: "text-left",
      render: (row: any) => <div>{row?.cheque_collect_status ? row.cheque_collect_status : "-"}</div>,
    },
    {
      key: "action",
      header: "Action",
      width: "120px",
    }
  ];

  return (
    <>
      <HelmetTitle title="Cheque / Receive Register" />
      {isLoading ? <Loader /> : null}

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2">
        <div className="mt-1">
          <InputElement
            id="q"
            name="q"
            label="Search (Receipt / Ref)"
            placeholder="Type receipt no or reference no"
            value={q}
            onChange={(e: any) => setQ(e.target.value)}
          />
        </div>

        <DropdownCommon
          id="payment_mode"
          name="payment_mode"
          label="Payment Mode"
          value={paymentMode}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setPaymentMode(e.target.value)
          }
          className="h-[2.1rem] bg-transparent mt-1"
          data={PAYMENT_MODES}
        />

        <DropdownCommon
          id="cheque_collect_status"
          name="cheque_collect_status"
          label="Cheque Status"
          value={chequeStatus}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setChequeStatus(e.target.value)
          }
          className="h-[2.1rem] bg-transparent mt-1"
          data={CHEQUE_STATUSES}
        />
        <div className="w-full mt-0 md:mt-2">
          <label className="block text-sm">Date From</label>
          <InputDatePicker
            setCurrentDate={handleStartDate}
            className="font-medium text-sm w-full h-9"
            selectedDate={dateFrom}
            setSelectedDate={setDateFrom}
          />
        </div>

        <div className="w-full mt-0 md:mt-2">
          <label className="block text-sm">Date To</label>
          <InputDatePicker
            setCurrentDate={handleEndDate}
            className="font-medium text-sm w-full h-9"
            selectedDate={dateTo}
            setSelectedDate={setDateTo}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* <div className="md:-mt-1">
          <label>Overall Status</label>
          <DropdownCommon
            id="status"
            name="status"
            label=""
            value={status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setStatus(e.target.value)
            }
            className="h-9 bg-transparent"
            data={STATUSES}
          />
        </div> */}


      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <SelectOption
          className="h-[2.1rem] bg-transparent mt-3"
          onChange={onPerPageChange}
          value={perPage}
        />

        <ButtonLoading
          onClick={handleSearch}
          buttonLoading={false}
          label="Search"
          className="whitespace-nowrap text-center mr-0 mt-0 md:mt-3 h-8"
          icon={<FiSearch className="text-white text-lg ml-2 mr-2" />}
        />

        <ButtonLoading
          onClick={handleReset}
          buttonLoading={false}
          label="Reset"
          className="whitespace-nowrap text-center mr-0 mt-0 md:mt-3 h-8"
          icon={<FiRefreshCcw className="text-white text-lg ml-2 mr-2" />}
        />

        <Link
          to="/dashboard"
          className="text-nowrap justify-center mr-0 p-2 h-8 mt-0 md:mt-3"
        >
          <FiArrowLeft className="mr-2" /> Home
        </Link>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800">
        {/* ✅ rows না, filteredRows */}
        <Table columns={columns} data={filteredRows || []} className="" />
      </div>

      {/* PAGINATION */}
      {totalPages > 1 ? (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          handlePageChange={handlePageChange}
        />
      ) : null}
    </>
  );
}