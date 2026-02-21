import React, { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
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
import { unitSalePaymentEdit, unitSalePaymentUpdate } from "./unitSalePaymentsSlice";
import { getCoal3ByCoal4 } from "../../chartofaccounts/levelthree/coal3Sliders";
import { CHEQUE_STATUSES, ENTRY_STATUSES, PAYMENT_MODES, PAYMENT_TYPES } from "./checkContents";

/* ================= CONSTANTS ================= */

const LIST_PATH = "/admin/unit-payment-list"; // ✅ change here only if your actual list route differs

/* ================= TYPES ================= */

type FormState = {
  id?: number;
  branch_id?: number | string;
  booking_id?: number | string;

  receipt_no: string;
  payment_date: string; // YYYY-MM-DD
  amount: string | number;

  payment_type: string;
  payment_mode: string;

  reference_no: string;
  bank_name: string;
  branch_name: string;

  // receiver account for cheque + bank transfer
  coal4_id: string;

  cheque_collect_status: string;
  cheque_deposit_due_date: string;
  cheque_collect_date: string;

  // ✅ NEW
  cheque_bounce_date: string;
  cheque_return_reason: string;

  status: string;
};

type BookingPreview = {
  unitLabel?: string;
  parkingLabel?: string;
  customerLabel?: string;
  customerLabel2?: string;
};

const initialForm: FormState = {
  receipt_no: "",
  payment_date: dayjs().format("YYYY-MM-DD"),
  amount: "",

  payment_type: "",
  payment_mode: "",

  reference_no: "",
  bank_name: "",
  branch_name: "",

  coal4_id: "",

  cheque_collect_status: "",
  cheque_deposit_due_date: "",
  cheque_collect_date: "",

  // ✅ NEW
  cheque_bounce_date: "",
  cheque_return_reason: "",

  status: "PENDING",
};

/* ================= HELPERS ================= */

// Laravel date cast may return ISO UTC string; slice first 10 chars to avoid timezone shift
const toYmd = (v?: string | null): string => {
  if (!v) return "";
  if (typeof v === "string" && v.length >= 10) return v.slice(0, 10);

  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
};

// build local Date from YYYY-MM-DD (prevents timezone shifting)
const ymdToDateOrNull = (v?: string | null): Date | null => {
  if (!v) return null;
  const ymd = toYmd(v);
  if (!ymd) return null;

  const parts = ymd.split("-");
  if (parts.length !== 3) return null;

  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);

  if (!y || !m || !d) return null;

  return new Date(y, m - 1, d);
};

const dash = (v: any) => (v === null || v === undefined || v === "" ? "-" : v);

const getBookingPreview = (r: any): BookingPreview => {
  const payload = r?.booking?.payload || {};
  const booking = r?.booking || {};

  return {
    unitLabel:
      payload?.unit?.label ||
      (booking?.unit_id ? `Unit ID: ${booking.unit_id}` : undefined),

    parkingLabel:
      payload?.parking?.label ||
      (booking?.parking_id ? `Parking ID: ${booking.parking_id}` : undefined),

    customerLabel:
      payload?.customer?.label ||
      (booking?.customer_id ? `Customer ID: ${booking.customer_id}` : undefined),

    customerLabel2: payload?.customer?.label_2 || undefined,
  };
};

/* ================= COMPONENT ================= */

export default function UnitSalePaymentEdit() {
  const coal3 = useSelector((s: any) => s.coal3);
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<FormState>(initialForm);
  const [bookingPreview, setBookingPreview] = useState<BookingPreview>({});

  // DatePicker state
  const [paymentDateObj, setPaymentDateObj] = useState<Date | null>(null);
  const [chequeDueDateObj, setChequeDueDateObj] = useState<Date | null>(null);
  const [chequeCollectDateObj, setChequeCollectDateObj] = useState<Date | null>(null);
  const [chequeBounceDateObj, setChequeBounceDateObj] = useState<Date | null>(null); // ✅ NEW

  const [ddlBankList, setDdlBankList] = useState<any[]>([]);

  const isCheque = useMemo(() => form.payment_mode === "CHEQUE", [form.payment_mode]);

  // ✅ Bank Received Account required for both CHEQUE and BANK_TRANSFER
  const needsBankReceivedAccount = useMemo(
    () => ["CHEQUE", "BANK_TRANSFER"].includes(form.payment_mode),
    [form.payment_mode]
  );

  // ✅ NEW
  const isChequeBouncedOrCancelled = useMemo(
    () =>
      isCheque &&
      ["BOUNCED", "CANCELLED"].includes(form.cheque_collect_status || ""),
    [isCheque, form.cheque_collect_status]
  );

  const setField = (name: keyof FormState, value: any) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    dispatch(getCoal3ByCoal4(2));
  }, [dispatch]);

  useEffect(() => {
    if (Array.isArray(coal3?.coal4)) {
      setDdlBankList(coal3?.coal4 || []);
    }
  }, [coal3]);

  const loadSingle = async () => {
    if (!id) {
      toast.error("Invalid payment ID");
      navigate(-1);
      return;
    }

    try {
      setIsPageLoading(true);

      const result = await dispatch(unitSalePaymentEdit({ id })).unwrap();
      const r = result?.row;

      const nextForm: FormState = {
        id: r?.id,
        branch_id: r?.branch_id,
        booking_id: r?.booking_id,

        receipt_no: r?.receipt_no ?? "",
        payment_date: toYmd(r?.payment_date) || dayjs().format("YYYY-MM-DD"),
        amount: r?.amount ?? "",

        payment_type: r?.payment_type ?? "",
        payment_mode: r?.payment_mode ?? "",

        reference_no: r?.reference_no ?? "",
        bank_name: r?.bank_name ?? "",
        branch_name: r?.branch_name ?? "",

        // ✅ normalize to string for dropdown value
        coal4_id: r?.coal4_id !== null && r?.coal4_id !== undefined ? String(r.coal4_id) : "",

        cheque_collect_status: r?.cheque_collect_status ?? "",
        cheque_deposit_due_date: toYmd(r?.cheque_deposit_due_date),
        cheque_collect_date: toYmd(r?.cheque_collect_date),

        // ✅ NEW
        cheque_bounce_date: toYmd(r?.cheque_bounce_date),
        cheque_return_reason: r?.cheque_return_reason ?? "",

        status: r?.status ?? "PENDING",
      };

      setForm(nextForm);

      setPaymentDateObj(ymdToDateOrNull(nextForm.payment_date));
      setChequeDueDateObj(ymdToDateOrNull(nextForm.cheque_deposit_due_date));
      setChequeCollectDateObj(ymdToDateOrNull(nextForm.cheque_collect_date));
      setChequeBounceDateObj(ymdToDateOrNull(nextForm.cheque_bounce_date)); // ✅ NEW

      setBookingPreview(getBookingPreview(r));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to load payment");
    } finally {
      setIsPageLoading(false);
    }
  };

  useEffect(() => {
    loadSingle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Cheque mode off হলে cheque-only fields clear
  useEffect(() => {
    if (!isCheque) {
      setForm((prev) => ({
        ...prev,
        cheque_collect_status: "",
        cheque_deposit_due_date: "",
        cheque_collect_date: "",
        // ✅ NEW
        cheque_bounce_date: "",
        cheque_return_reason: "",
      }));
      setChequeDueDateObj(null);
      setChequeCollectDateObj(null);
      setChequeBounceDateObj(null); // ✅ NEW
    }
  }, [isCheque]);

  // ✅ NEW: Bounce/Cancelled না হলে bounce fields clear
  useEffect(() => {
    if (!isChequeBouncedOrCancelled) {
      setForm((prev) => ({
        ...prev,
        cheque_bounce_date: "",
        cheque_return_reason: "",
      }));
      setChequeBounceDateObj(null);
    }
  }, [isChequeBouncedOrCancelled]);

  // ✅ Bank received account not needed হলে clear করে দিচ্ছি
  useEffect(() => {
    if (!needsBankReceivedAccount) {
      setForm((prev) => ({
        ...prev,
        coal4_id: "",
      }));
    }
  }, [needsBankReceivedAccount]);

  const validate = () => {
    if (!form.payment_date) {
      toast.warning("Payment date is required");
      return false;
    }

    if (!form.payment_mode) {
      toast.warning("Payment mode is required");
      return false;
    }

    if (!form.payment_type) {
      toast.warning("Payment type is required");
      return false;
    }

    if (form.amount === "" || form.amount === null || form.amount === undefined) {
      toast.warning("Amount is required");
      return false;
    }

    const amountNum = Number(form.amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      toast.warning("Amount must be greater than 0");
      return false;
    }

    // ✅ cheque + bank transfer both require receiver bank account
    if (needsBankReceivedAccount && !form.coal4_id) {
      toast.warning("Bank received account is required");
      return false;
    }

    if (isCheque) {
      if (!form.reference_no) {
        toast.warning("Cheque / Reference No is required for cheque payment");
        return false;
      }
      if (!form.bank_name) {
        toast.warning("Bank name is required for cheque payment");
        return false;
      }
      if (!form.cheque_collect_status) {
        toast.warning("Cheque status is required for cheque payment");
        return false;
      }

      // ✅ NEW
      if (["BOUNCED", "CANCELLED"].includes(form.cheque_collect_status)) {
        if (!form.cheque_bounce_date) {
          toast.warning("Cheque bounce / return date is required");
          return false;
        }
        if (!form.cheque_return_reason?.trim()) {
          toast.warning("Cheque return reason is required");
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id) {
      toast.error("Invalid payment ID");
      return;
    }

    if (!validate()) return;

    try {
      setIsSubmitting(true);

      const payload = {
        id: Number(id),

        // backend required ids
        branch_id: form.branch_id,
        booking_id: form.booking_id,

        // editable fields
        receipt_no: form.receipt_no || undefined,
        payment_date: form.payment_date,
        amount: Number(form.amount),

        payment_type: form.payment_type,
        payment_mode: form.payment_mode,

        reference_no: form.reference_no || undefined,
        bank_name: form.bank_name || undefined,
        branch_name: form.branch_name || undefined,

        // ✅ send only when needed, normalize to number
        coal4_id:
          needsBankReceivedAccount && form.coal4_id
            ? Number(form.coal4_id)
            : undefined,

        cheque_collect_status: isCheque ? form.cheque_collect_status || undefined : undefined,
        cheque_deposit_due_date: isCheque ? form.cheque_deposit_due_date || undefined : undefined,
        cheque_collect_date: isCheque ? form.cheque_collect_date || undefined : undefined,

        // ✅ NEW
        cheque_bounce_date:
          isCheque && isChequeBouncedOrCancelled
            ? form.cheque_bounce_date || undefined
            : undefined,
        cheque_return_reason:
          isCheque && isChequeBouncedOrCancelled
            ? form.cheque_return_reason || undefined
            : undefined,

        status: form.status || undefined,
      };

      const res = await dispatch(unitSalePaymentUpdate(payload)).unwrap();

      toast.success(res?.message || "Payment updated successfully");
      navigate(LIST_PATH);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReload = () => {
    loadSingle();
  };

  const optionsWithAll = useMemo(
    () => [
      { id: "", name: "Select Bank Account" },
      ...((ddlBankList ?? []).map((item: any) => ({
        id: String(item?.id ?? ""),
        name: item?.name ?? item?.label ?? "Unnamed Account",
      })) as any[]),
    ],
    [ddlBankList]
  );

  return (
    <>
      <HelmetTitle title="Edit Unit Sale Payment" />

      {isPageLoading ? <Loader /> : null}

      <form onSubmit={handleSubmit}>
        {/* Top bar */}
        <div className="flex flex-wrap gap-2 items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Edit Unit Sale Payment</h2>

          <div className="flex gap-2">
            <ButtonLoading
              onClick={(e: any) => {
                e?.preventDefault?.();
                handleReload();
              }}
              buttonLoading={false}
              label="Reload"
              className="h-8"
            />
            <Link to={LIST_PATH} className="h-8 p-2">
              <FiArrowLeft className="mr-2" /> Back
            </Link>
          </div>
        </div>

        {/* Read-only summary */}
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-400 p-3 mb-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
            <div>
              <div className="dark:text-white text-left text-sm text-gray-900">Receipt No</div>
              <div className="font-medium">{dash(form.receipt_no)}</div>
            </div>

            <div>
              <div className="dark:text-white text-left text-sm text-gray-900">Booking</div>
              <div className="font-medium">{dash(bookingPreview.unitLabel)}</div>
              <div className="text-xs dark:text-white text-left text-gray-900">
                {dash(bookingPreview.parkingLabel)}
              </div>
            </div>

            <div>
              <div className="dark:text-white text-left text-sm text-gray-900">Customer</div>
              <div className="font-medium">{dash(bookingPreview.customerLabel)}</div>
              <div className="text-xs dark:text-white text-left text-gray-900">
                {dash(bookingPreview.customerLabel2)}
              </div>
            </div>

            <div>
              <div className="dark:text-white text-left text-sm text-gray-900">Issued Amount</div>
              <div className="font-medium">
                {form.amount !== "" && form.amount !== null && form.amount !== undefined
                  ? thousandSeparator(Number(form.amount), 2)
                  : "-"}
              </div>
            </div>
          </div>
        </div>

        {/* Main form */}
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-400 p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Payment Date */}
            <div className="w-full">
              <label className="dark:text-white text-left text-sm text-gray-900 block mb-1">
                Payment Date
              </label>
              <InputDatePicker
                className="font-medium text-sm w-full h-8.5"
                selectedDate={paymentDateObj}
                setSelectedDate={(d: Date | null) => {
                  setPaymentDateObj(d);
                  setField("payment_date", d ? dayjs(d).format("YYYY-MM-DD") : "");
                }}
                setCurrentDate={(d: Date | null) => {
                  setPaymentDateObj(d);
                  setField("payment_date", d ? dayjs(d).format("YYYY-MM-DD") : "");
                }}
              />
            </div>

            {/* Payment Mode */}
            <DropdownCommon
              id="payment_mode"
              name="payment_mode"
              label="Payment Mode"
              value={form.payment_mode}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setField("payment_mode", e.target.value)
              }
              className="h-[2.1rem] bg-transparent"
              data={PAYMENT_MODES}
            />

            {/* Payment Type */}
            <DropdownCommon
              id="payment_type"
              name="payment_type"
              label="Payment For"
              value={form.payment_type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setField("payment_type", e.target.value)
              }
              className="h-[2.1rem] bg-transparent"
              data={PAYMENT_TYPES}
            />

            {/* Amount */}
            <div>
              <InputElement
                id="amount"
                name="amount"
                label="Amount"
                type="number"
                step="0.01"
                placeholder="Enter amount"
                className="h-8.5"
                value={form.amount as any}
                onChange={(e: any) => setField("amount", e.target.value)}
              />
            </div>

            {/* Status */}
            <DropdownCommon
              id="status"
              name="status"
              label="Entry Status"
              value={form.status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setField("status", e.target.value)
              }
              className="h-[2.1rem] bg-transparent"
              data={ENTRY_STATUSES}
            />

            {/* Receipt No */}
            <div>
              <InputElement
                id="receipt_no"
                name="receipt_no"
                label="Receipt No"
                placeholder="Receipt No"
                className="h-8.5"
                value={form.receipt_no}
                onChange={(e: any) => setField("receipt_no", e.target.value)}
              />
            </div>

            {/* Ref / Cheque No */}
            <div className="mt-1">
              <InputElement
                id="reference_no"
                name="reference_no"
                label={isCheque ? "Cheque No / Ref No" : "Reference No"}
                placeholder="Enter reference no"
                className="h-8.5"
                value={form.reference_no}
                onChange={(e: any) => setField("reference_no", e.target.value)}
              />
            </div>

            {/* Bank Name */}
            <div className="mt-1">
              <InputElement
                id="bank_name"
                name="bank_name"
                label="Bank Name"
                placeholder="Enter bank name"
                className="h-8.5"
                value={form.bank_name}
                onChange={(e: any) => setField("bank_name", e.target.value)}
              />
            </div>

            {/* Branch Name */}
            <div className="mt-1">
              <InputElement
                id="branch_name"
                name="branch_name"
                label="Branch Name"
                placeholder="Enter branch name"
                className="h-8.5"
                value={form.branch_name}
                onChange={(e: any) => setField("branch_name", e.target.value)}
              />
            </div>
          </div>

          {/* Cheque-specific fields */}
          {isCheque ? (
            <div className="mt-4 border-t border-gray-400 pt-3">
              <h3 className="dark:text-white text-left text-sm text-gray-900 font-semibold">
                Cheque Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <DropdownCommon
                  id="cheque_collect_status"
                  name="cheque_collect_status"
                  label="Cheque Status"
                  value={form.cheque_collect_status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setField("cheque_collect_status", e.target.value)
                  }
                  className="h-10 bg-transparent"
                  data={CHEQUE_STATUSES}
                />
                <div>
                  {/* ✅ Bank Received Account (CHEQUE + BANK_TRANSFER) */}
                  {needsBankReceivedAccount ? (
                    <DropdownCommon
                      id="coal4_id"
                      name="coal4_id"
                      label="Bank Received Account"
                      value={String(form.coal4_id || "")}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setField("coal4_id", e.target.value)
                      }
                      className="h-10 bg-transparent"
                      data={optionsWithAll}
                    />
                  ) : null}
                </div>
                <div className="w-full">
                  <label className="dark:text-white text-left text-sm text-gray-900 block mb-1">
                    Cheque Deposit Due Date
                  </label>
                  <InputDatePicker
                    className="font-medium text-sm w-full h-10"
                    selectedDate={chequeDueDateObj}
                    setSelectedDate={(d: Date | null) => {
                      setChequeDueDateObj(d);
                      setField("cheque_deposit_due_date", d ? dayjs(d).format("YYYY-MM-DD") : "");
                    }}
                    setCurrentDate={(d: Date | null) => {
                      setChequeDueDateObj(d);
                      setField("cheque_deposit_due_date", d ? dayjs(d).format("YYYY-MM-DD") : "");
                    }}
                  />
                </div>

                <div className="w-full">
                  <label className="dark:text-white text-left text-sm text-gray-900 block mb-1">
                    Cheque Collect Date
                  </label>
                  <InputDatePicker
                    className="font-medium text-sm w-full h-10"
                    selectedDate={chequeCollectDateObj}
                    setSelectedDate={(d: Date | null) => {
                      setChequeCollectDateObj(d);
                      setField("cheque_collect_date", d ? dayjs(d).format("YYYY-MM-DD") : "");
                    }}
                    setCurrentDate={(d: Date | null) => {
                      setChequeCollectDateObj(d);
                      setField("cheque_collect_date", d ? dayjs(d).format("YYYY-MM-DD") : "");
                    }}
                  />
                </div>
              </div>

              {/* ✅ NEW: show only when BOUNCED / CANCELLED */}
              {isChequeBouncedOrCancelled ? (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="w-full col-span-1">
                    <label className="dark:text-white text-left text-sm text-gray-900 block mb-1">
                      Cheque Bounce / Return Date
                    </label>
                    <InputDatePicker
                      className="font-medium text-sm w-full h-10"
                      selectedDate={chequeBounceDateObj}
                      setSelectedDate={(d: Date | null) => {
                        setChequeBounceDateObj(d);
                        setField("cheque_bounce_date", d ? dayjs(d).format("YYYY-MM-DD") : "");
                      }}
                      setCurrentDate={(d: Date | null) => {
                        setChequeBounceDateObj(d);
                        setField("cheque_bounce_date", d ? dayjs(d).format("YYYY-MM-DD") : "");
                      }}
                    />
                  </div>
                  <div className="w-full col-span-3">
                    <InputElement
                      id="cheque_return_reason"
                      name="cheque_return_reason"
                      label="Cheque Return Reason"
                      placeholder="Enter return / cancel reason"
                      className="h-10"
                      value={form.cheque_return_reason}
                      onChange={(e: any) => setField("cheque_return_reason", e.target.value)}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Hidden ids (optional) */}
          <div className="hidden">
            <InputElement
              id="booking_id"
              name="booking_id"
              label="Booking ID"
              value={String(form.booking_id ?? "")}
              onChange={() => { }}
            />
            <InputElement
              id="branch_id"
              name="branch_id"
              label="Branch ID"
              value={String(form.branch_id ?? "")}
              onChange={() => { }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            <ButtonLoading
              type="submit"
              onClick={() => { }}
              buttonLoading={isSubmitting}
              label="Update"
              className="h-9"
              icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
            />

            <Link to={LIST_PATH} className="h-9 p-2">
              <FiArrowLeft className="mr-2" /> Cancel
            </Link>
          </div>
        </div>
      </form>
    </>
  );
}