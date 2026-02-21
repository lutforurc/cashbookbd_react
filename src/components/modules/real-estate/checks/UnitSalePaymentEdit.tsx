import React, { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { useDispatch } from "react-redux";
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


/* ================= CONSTANTS ================= */

const PAYMENT_MODES = [
    { id: "", name: "Select Payment Mode" },
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

const PAYMENT_TYPES = [
    { id: "", name: "Select Payment For" },
    { id: "BOOKING", name: "Booking" },
    { id: "DOWN_PAYMENT", name: "Down Payment" },
    { id: "INSTALLMENT", name: "Installment" },
    { id: "ADJUSTMENT", name: "Adjustment" },
    { id: "PENALTY", name: "Penalty" },
    { id: "REFUND", name: "Refund" },
    { id: "SECURITY_DEPOSIT", name: "Security Deposit" },
    { id: "OTHER", name: "Other" },
];

const CHEQUE_STATUSES = [
    { id: "", name: "Select Cheque Status" },
    { id: "PENDING", name: "Pending" },
    { id: "COLLECTED", name: "Collected" },
    { id: "BOUNCED", name: "Bounced" },
    { id: "CANCELLED", name: "Cancelled" },
];

const ENTRY_STATUSES = [
    { id: "", name: "Select Status" },
    { id: "PENDING", name: "Pending" },
    { id: "CONFIRMED", name: "Confirmed" },
    { id: "REJECTED", name: "Rejected" },
    { id: "REVERSED", name: "Reversed" },
];

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

    cheque_collect_status: string;
    cheque_deposit_due_date: string;
    cheque_collect_date: string;

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

    cheque_collect_status: "",
    cheque_deposit_due_date: "",
    cheque_collect_date: "",

    status: "PENDING",
};

/* ================= HELPERS ================= */

const toDateOrNull = (v?: string | null): Date | null => {
    if (!v) return null;
    const d = dayjs(v);
    return d.isValid() ? d.toDate() : null;
};

const dash = (v: any) => (v === null || v === undefined || v === "" ? "-" : v);

/* ================= COMPONENT ================= */

export default function UnitSalePaymentEdit() {
    const dispatch = useDispatch<any>();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [isPageLoading, setIsPageLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState<FormState>(initialForm);
    const [bookingPreview, setBookingPreview] = useState<BookingPreview>({});

    // DatePicker state (custom date component এর জন্য আলাদা)
    const [paymentDateObj, setPaymentDateObj] = useState<Date | null>(new Date());
    const [chequeDueDateObj, setChequeDueDateObj] = useState<Date | null>(null);
    const [chequeCollectDateObj, setChequeCollectDateObj] = useState<Date | null>(null);

    const isCheque = useMemo(() => form.payment_mode === "CHEQUE", [form.payment_mode]);

    const setField = (name: keyof FormState, value: any) => {
        setForm((prev) => ({ ...prev, [name]: value }));
    };


    console.log('====================================');
    console.log("id", id);
    console.log('====================================');


    const loadSingle = async () => {
        if (!id) {
            toast.error("Invalid payment ID");
            navigate(-1);
            return;
        }

        try {
            setIsPageLoading(true);

            // ✅ thunk নাম/params তোমার slice অনুযায়ী adjust করো
            const result = await dispatch(unitSalePaymentEdit({ id })).unwrap();

            console.log('====================================');
            console.log("result", bookingPreview);
            console.log('====================================');

            // result.data / result.row যেটা আসে সেটা মিলিয়ে নিও
            const r = result?.row ?? result?.data ?? result;

            const nextForm: FormState = {
                id: r?.id,
                branch_id: r?.branch_id,
                booking_id: r?.booking_id,

                receipt_no: r?.receipt_no ?? "",
                payment_date: r?.payment_date
                    ? dayjs(r.payment_date).format("YYYY-MM-DD")
                    : dayjs().format("YYYY-MM-DD"),
                amount: r?.amount ?? "",

                payment_type: r?.payment_type ?? "",
                payment_mode: r?.payment_mode ?? "",

                reference_no: r?.reference_no ?? "",
                bank_name: r?.bank_name ?? "",
                branch_name: r?.branch_name ?? "",

                cheque_collect_status: r?.cheque_collect_status ?? "",
                cheque_deposit_due_date: r?.cheque_deposit_due_date
                    ? dayjs(r.cheque_deposit_due_date).format("YYYY-MM-DD")
                    : "",
                cheque_collect_date: r?.cheque_collect_date
                    ? dayjs(r.cheque_collect_date).format("YYYY-MM-DD")
                    : "",

                status: r?.status ?? "PENDING",
            };

            setForm(nextForm);

            setPaymentDateObj(toDateOrNull(nextForm.payment_date));
            setChequeDueDateObj(toDateOrNull(nextForm.cheque_deposit_due_date));
            setChequeCollectDateObj(toDateOrNull(nextForm.cheque_collect_date));

            setBookingPreview({
                unitLabel: r?.booking?.payload?.unit?.label,
                parkingLabel: r?.booking?.payload?.parking?.label,
                customerLabel: r?.booking?.payload?.customer?.label,
                customerLabel2: r?.booking?.payload?.customer?.label_2,
            });
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

    // payment mode cheque না হলে cheque field auto clear (optional but cleaner)
    useEffect(() => {
        if (!isCheque) {
            setForm((prev) => ({
                ...prev,
                cheque_collect_status: "",
                cheque_deposit_due_date: "",
                cheque_collect_date: "",
                // reference/bank রেখে দিতে পারো চাইলে; নিচে clear করছি না
            }));
            setChequeDueDateObj(null);
            setChequeCollectDateObj(null);
        }
    }, [isCheque]);

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

            if (
                form.cheque_deposit_due_date &&
                form.cheque_collect_date &&
                dayjs(form.cheque_collect_date).isBefore(dayjs(form.cheque_deposit_due_date))
            ) {
                // Optional business rule. Remove if not needed.
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

                receipt_no: form.receipt_no || undefined, // যদি editable না হয় backend ignore করবে
                payment_date: form.payment_date,
                amount: Number(form.amount),

                payment_type: form.payment_type,
                payment_mode: form.payment_mode,

                reference_no: form.reference_no || undefined,
                bank_name: form.bank_name || undefined,
                branch_name: form.branch_name || undefined,

                cheque_collect_status: isCheque ? form.cheque_collect_status || undefined : undefined,
                cheque_deposit_due_date: isCheque ? form.cheque_deposit_due_date || undefined : undefined,
                cheque_collect_date: isCheque ? form.cheque_collect_date || undefined : undefined,

                status: form.status || undefined,
            };

            // ✅ thunk নাম/params adjust করো
            const res = await dispatch(unitSalePaymentUpdate(payload)).unwrap();

            toast.success(res?.message || "Payment updated successfully");

            // চাইলে list page এ ফিরে যাও
            navigate("/payment-collection");
        } catch (e: any) {
            toast.error(e?.response?.data?.message || e?.message || "Failed to update payment");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReload = () => {
        loadSingle();
    };

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
                            onClick={handleReload}
                            buttonLoading={false}
                            label="Reload"
                            className="h-8"
                        />
                        <Link to="/payment-collection" className="h-8 p-2">
                            <FiArrowLeft className="mr-2" /> Back
                        </Link>
                    </div>
                </div>

                {/* Read-only summary */}
                <div className="bg-white dark:bg-gray-800 rounded border p-3 mb-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                        <div>
                            <div className="text-gray-500">Receipt No</div>
                            <div className="font-medium">{dash(form.receipt_no)}</div>
                        </div>

                        <div>
                            <div className="text-gray-500">Booking</div>
                            <div className="font-medium">{dash(bookingPreview.unitLabel)}</div>
                            <div className="text-xs text-gray-500">{dash(bookingPreview.parkingLabel)}</div>
                        </div>

                        <div>
                            <div className="text-gray-500">Customer</div>
                            <div className="font-medium">{dash(bookingPreview.customerLabel)}</div>
                            <div className="text-xs text-gray-500">{dash(bookingPreview.customerLabel2)}</div>
                        </div>

                        <div>
                            <div className="text-gray-500">Issued Amount</div>
                            <div className="font-medium">
                                {form.amount !== "" && form.amount !== null && form.amount !== undefined
                                    ? thousandSeparator(Number(form.amount), 2)
                                    : "-"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main form */}
                <div className="bg-white dark:bg-gray-800 rounded border p-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Payment Date */}
                        <div className="w-full">
                            <label className="block text-sm mb-1">Payment Date</label>
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
                            className="h-[2.1rem] bg-transparent "
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
                        <div className="">
                            <InputElement
                                id="amount"
                                name="amount"
                                label="Amount"
                                type="number" 
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

                        {/* Receipt No (optional editable; চাইলে readOnly করে দাও) */}
                        <div className="">
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
                        <div className="mt-4 border-t pt-3">
                            <h3 className="text-sm font-semibold ">Cheque Details</h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <DropdownCommon
                                    id="cheque_collect_status"
                                    name="cheque_collect_status"
                                    label="Cheque Status"
                                    value={form.cheque_collect_status}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                        setField("cheque_collect_status", e.target.value)
                                    }
                                    className="h-8.5 bg-transparent "
                                    data={CHEQUE_STATUSES}
                                />

                                <div className="w-full">
                                    <label className="block text-sm mb-1">Cheque Deposit Due Date</label>
                                    <InputDatePicker
                                        className="font-medium text-sm w-full h-8.5"
                                        selectedDate={chequeDueDateObj}
                                        setSelectedDate={(d: Date | null) => {
                                            setChequeDueDateObj(d);
                                            setField(
                                                "cheque_deposit_due_date",
                                                d ? dayjs(d).format("YYYY-MM-DD") : ""
                                            );
                                        }}
                                        setCurrentDate={(d: Date | null) => {
                                            setChequeDueDateObj(d);
                                            setField(
                                                "cheque_deposit_due_date",
                                                d ? dayjs(d).format("YYYY-MM-DD") : ""
                                            );
                                        }}
                                    />
                                </div>

                                <div className="w-full">
                                    <label className="block text-sm mb-1">Cheque Collect Date</label>
                                    <InputDatePicker
                                        className="font-medium text-sm w-full h-8.5"
                                        selectedDate={chequeCollectDateObj}
                                        setSelectedDate={(d: Date | null) => {
                                            setChequeCollectDateObj(d);
                                            setField(
                                                "cheque_collect_date",
                                                d ? dayjs(d).format("YYYY-MM-DD") : ""
                                            );
                                        }}
                                        setCurrentDate={(d: Date | null) => {
                                            setChequeCollectDateObj(d);
                                            setField(
                                                "cheque_collect_date",
                                                d ? dayjs(d).format("YYYY-MM-DD") : ""
                                            );
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Hidden ids (debug/remove optional) */}
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
                            label="Update Payment"
                            className="h-9"
                            icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
                        />

                        <Link to="/payment-collection" className="h-9 p-2">
                            <FiArrowLeft className="mr-2" /> Cancel
                        </Link>
                    </div>
                </div>
            </form>
        </>
    );
}