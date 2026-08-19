import React, { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiEdit2, FiPlus, FiRefreshCcw, FiSearch } from "react-icons/fi";
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
import { humanizeEnumText } from "../../../utils/hooks/humanizeEnumText";
import { useNavigate, useSearchParams } from "react-router-dom";
import ActionButtons from "../../../utils/fields/ActionButton";
import { CHEQUE_STATUSES, PAYMENT_MODES } from "./checkContents";
import { Button } from '../../../../pages/UiElements/CustomButtons';


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
  const navigate = useNavigate();

  const [pagination, setPagination] = useState<PaginationState>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  // filters
  //
  // The search box opens on ?q= when there is one. ?customer_id= is the other
  // way in -- the sales summary sends a buyer here by their account id, which
  // gathers every receipt against them however many flats they hold. The name
  // rides along only to be shown; nothing is filtered on it.
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [customerId, setCustomerId] = useState(searchParams.get("customer_id") ?? "");
  const customerName = searchParams.get("customer_name") ?? "";
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

  // âœ… backend keys only
  const params = useMemo(() => {
    return {
      q: q || undefined,
      customer_id: customerId ? Number(customerId) : undefined,
      payment_mode: paymentMode || undefined,
      status: status || undefined,
      date_from: dateFromStr || undefined,
      date_to: dateToStr || undefined,

      // âœ… add this
      cheque_collect_status: chequeStatus || undefined,
    };
  }, [q, customerId, paymentMode, status, dateFromStr, dateToStr, chequeStatus]);

  /**
   * `overrides` is for the callers that change a filter and load in the same
   * breath -- Reset, and dropping the buyer. `params` above is the value from
   * the render they were called in, so a setState made a line earlier is not in
   * it yet and the old filter would be sent one last time.
   */
  const loadData = async (
    page = 1,
    perPageOverride?: number,
    overrides?: Record<string, any>
  ) => {
    try {
      setIsLoading(true);

      const perPageNum = perPageOverride ?? Number(perPage) ?? 20;

      const result = await dispatch(
        unitSalePaymentsList({
          ...params,
          ...(overrides ?? {}),
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

  /* âœ… Only ONE effect for initial load + perPage change */
  useEffect(() => {
    setPagination((p) => ({ ...p, current_page: 1 }));
    loadData(1, Number(perPage) || 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perPage]);

  const handleSearch = () => {
    setPagination((p) => ({ ...p, current_page: 1 }));
    loadData(1);
  };

  const handleAddNew = () => {
    navigate("/admin/unit-payment/entry");
  };
  const handleHome = () => {
    navigate("/dashboard");
  };

  const handleReset = () => {
    setQ("");
    setCustomerId("");
    setPaymentMode("");
    setChequeStatus("");
    setStatus("");
    setDateFrom(null);
    setDateTo(null);
    setPerPage("20");
    setPagination((p) => ({ ...p, current_page: 1 }));
    loadData(1, 20, {
      q: undefined,
      customer_id: undefined,
      payment_mode: undefined,
      status: undefined,
      date_from: undefined,
      date_to: undefined,
      cheque_collect_status: undefined,
    });
  };

  /** Off the one buyer, back to the whole register, other filters left alone. */
  const clearCustomer = () => {
    setCustomerId("");
    setPagination((p) => ({ ...p, current_page: 1 }));
    loadData(1, undefined, { customer_id: undefined });
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

  /* âœ… Pagination variables */
  const currentPage = pagination.current_page || 1;
  const totalPages = pagination.last_page || 1;

  const handlePageChange = (page: number) => {
    goPage(page);
  };

  /* âœ… UI-only filtering (Cheque Status) */
  const filteredRows = useMemo(() => {
    if (!chequeStatus) return rows;
    return rows.filter((r) => (r?.cheque_collect_status || "") === chequeStatus);
  }, [rows, chequeStatus]);

  const handlePaymentEdit = (row: any) => {
    if (!row?.id) return;
    navigate(`/admin/unit-payment/edit/${row.id}`);
  };

  const columns = [
    {
      key: "serial_no",
      header: "#",
      width: "80px",
      headerClass: "text-center",
      cellClass: "text-center",
      render: (row: Row) => <div>{row?.serial_no ? row.serial_no : "-"}</div>,
    },
    {
      key: "payment_date",
      header: (
        <div>
          <div>Payment Date</div>
          <div>Receipt No</div>
        </div>
      ),
      width: "140px",
      headerClass: "text-left",
      cellClass: "text-left",
      render: (row: any) => (
        <div>

          <div>{row?.payment_date ? dayjs(row.payment_date).format("DD/MM/YYYY") : "-"}</div>
          <div>{row?.receipt_no ? row.receipt_no : "-"}</div>
        </div>
      ),
    },

    {
      key: "booking_id",
      header: "Booking",
      width: "120px",
      headerClass: "text-left",
      cellClass: "text-left",
      render: (row: any) =>
        <div>
          <span className="block">{row?.booking?.payload?.unit?.label}</span>
          <span className="block">{row?.booking?.payload?.parking?.label}</span>
        </div>,
    },
    {
      key: "payment_type",
      header: "Payment For",
      width: "140px",
      headerClass: "text-left",
      cellClass: "text-left",
      render: (row: any) => (
        <>
          <div>{humanizeEnumText(row?.payment_type)}</div>
          <span className="block">{row?.booking?.payload?.customer?.label}</span>
          <span className="block">{row?.booking?.payload?.customer?.label_2}</span>
        </>
      ),
    },
    {
      key: "payment_mode",
      header: (
        <div>
          <div>Payment Mode</div>
          <div>Check/Ref No</div>
        </div>
      ),
      width: "130px",
      headerClass: "text-left",
      cellClass: "text-left",
      render: (row: any) => (
        <>
          <div>{humanizeEnumText(row?.payment_mode)}</div>
          <div>{row?.reference_no ? row.reference_no : "-"}</div>
        </>
      ),
    },

    {
      key: "bank_name",
      // header: "Bank Name",
      header: (
        <div>
          <div>Bank Name</div>
          <div>Branch Name</div>
        </div>
      ),
      width: "160px",
      headerClass: "text-left",
      cellClass: "text-left",
      render: (row: any) =>
        <>
          <div>{row?.bank_name ? row.bank_name : "-"}</div>
          <div>{row?.branch_name ? row.branch_name : "-"}</div>
        </>
    },
    {
      key: "amount",
      header: "Amount",
      width: "140px",
      headerClass: "text-right",
      cellClass: "text-right",
      render: (row: any) => (
        <div>{row?.amount ? thousandSeparator(Number(row.amount)) : "-"}</div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      headerClass: "text-left",
      cellClass: "text-left",
      render: (row: any) => <div>
        {row.status === "CONFIRMED" ? "Collected" : humanizeEnumText(row?.cheque_collect_status)}
      </div>,
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <>
          <div>
            <ActionButtons
              row={row}
              showEdit={true}
              handleEdit={handlePaymentEdit}
              showDelete={false}
            // handleDelete={handleBranchDelete}
            // showToggle={true}
            // handleToggle={() => handleToggle(row)}

            // showConfirmId={showConfirmId}
            // setShowConfirmId={setShowConfirmId}
            />
          </div>
        </>
      ),
    },
  ];

  return (
    <>
      <HelmetTitle title="Cheque / Receive Register" />
      {isLoading ? <Loader /> : null}

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2 ">
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
        <div className="mt-1">
          <InputElement
            id="q"
            name="q"
            label={
              <>
                {/* xs/sm */}
                <span className="block 2xl:hidden">Search</span>

                {/* md only */}
                {/* <span className="hidden md:block lg:hidden">Search (Receipt, Name)</span> */}

                {/* lg and up */}
                <span className="hidden 2xl:block">Search (Receipt, Name, Mobile)</span>
              </>
            }
            placeholder="Type receipt no or reference no"
            className="h-8.5"
            value={q}
            onChange={(e: any) => setQ(e.target.value)}
          />
        </div>
        <div className="w-full mt-0 md:mt-2">
          <label className="block text-sm">Date From</label>
          <InputDatePicker
 setCurrentDate={handleStartDate}
 className="font-medium text-sm w-full "
 selectedDate={dateFrom}
 setSelectedDate={setDateFrom}
          />
        </div>

        <div className="w-full mt-0 md:mt-2">
          <label className="block text-sm">Date To</label>
          <InputDatePicker
 setCurrentDate={handleEndDate}
 className="font-medium text-sm w-full "
 selectedDate={dateTo}
 setSelectedDate={setDateTo}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-2">
        <SelectOption
          className="h-8.5 bg-transparent "
          onChange={onPerPageChange}
          value={perPage}
        />

        <ButtonLoading
          onClick={handleSearch}
          buttonLoading={false}
          label="Search"
          className="whitespace-nowrap text-center mr-0  h-8.5"
          icon={<FiSearch className="text-lg ml-2 mr-2" />}
        />

        <ButtonLoading
          onClick={handleReset}
          buttonLoading={false}
          label="Reset"
          className="whitespace-nowrap text-center mr-0  h-8.5"
          icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
        />


 
          <ButtonLoading
            onClick={handleAddNew}
            buttonLoading={false}
            label="Add New"
            className="whitespace-nowrap text-center mr-0  h-8.5 w-full"
            icon={<FiPlus className="text-lg ml-2 mr-2" />}
          />

          <ButtonLoading
            onClick={handleHome}
            buttonLoading={false}
            label="Home"
            className="whitespace-nowrap text-center mr-0  h-8.5 w-full"
            icon={<FiArrowLeft className="text-lg ml-2 mr-2" />}
          />
      
      </div>

      {/* Whose register this is, when one buyer was asked for. Said out loud
          because the filter is an id in the address bar and nothing else on
          the page would show that the list has been narrowed. */}
      {customerId ? (
        <div className="mb-2 flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
            Showing all transactions of
            <strong>{customerName || `Customer #${customerId}`}</strong>
            <Button
              type="button"
              onClick={clearCustomer}
              title="Show every customer"
              aria-label="Show every customer"
              className="font-bold"
            >
              ×
            </Button>
          </span>
        </div>
      ) : null}

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800">
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
