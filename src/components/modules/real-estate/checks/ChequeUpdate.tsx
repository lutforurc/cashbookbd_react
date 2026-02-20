import React, { useEffect, useState } from "react";
import { FiArrowLeft, FiRefreshCcw, FiSave } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import httpService from "../../../services/httpService";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import InputElement from "../../../utils/fields/InputElement";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import Link from "../../../utils/others/Link";

/* ================= CONSTANTS ================= */

const CHEQUE_COLLECT_STATUSES = [
    { value: "PENDING", label: "Pending" },
    { value: "COLLECTED", label: "Collected" },
    { value: "BOUNCED", label: "Bounced" },
    { value: "CANCELLED", label: "Cancelled" },
];

const PAYMENT_STATUSES = [
    { value: "PENDING", label: "Pending" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "REJECTED", label: "Rejected" },
    { value: "REVERSED", label: "Reversed" },
];

/* ================= TYPES ================= */

type ChequeUpdateForm = {
    id?: number | string;

    // readonly-ish display fields (optional)
    receipt_no?: string;
    payment_date?: string;
    amount?: string | number;
    reference_no?: string;
    bank_name?: string;
    branch_name?: string;

    // editable fields
    cheque_deposit_due_date: string;
    coal4_id: string; // dropdown
    cheque_collect_status: string;
    cheque_collect_date: string;
    cheque_bounce_date: string;
    cheque_return_reason: string;
    status: string;
    note: string;
};

const initialState: ChequeUpdateForm = {
    cheque_deposit_due_date: "",
    coal4_id: "",
    cheque_collect_status: "PENDING",
    cheque_collect_date: "",
    cheque_bounce_date: "",
    cheque_return_reason: "",
    status: "PENDING",
    note: "",
};

/* ================= COMPONENT ================= */

const ChequeUpdate = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    const [isLoading, setIsLoading] = useState(false);
    const [buttonLoading, setButtonLoading] = useState(false);

    const [formData, setFormData] = useState<ChequeUpdateForm>(initialState);

    // ✅ আপনার COA Level 4 Bank list এখানে আসবে
    const [coa4Banks, setCoa4Banks] = useState<any[]>([]);

    /* ================= LOAD ================= */

    useEffect(() => {
        if (!id) return;
        loadPayment();
        loadCoa4Banks();
    }, [id]);

    const loadPayment = async () => {
        try {
            setIsLoading(true);

            // ✅ adjust URL to your API route
            const res: any = await httpService.get(`/unit-sale-payments/${id}`);

            const p = res?.data?.data ?? res?.data ?? null;

            if (!p) {
                toast.info("Payment not found.");
                return;
            }

            // ✅ Only CHEQUE allowed (UI guard)
            if (p.payment_mode !== "CHEQUE") {
                toast.info("This payment is not CHEQUE. Update screen not applicable.");
                navigate(-1);
                return;
            }

            setFormData((prev) => ({
                ...prev,
                id: p.id,
                receipt_no: p.receipt_no,
                payment_date: p.payment_date,
                amount: p.amount,
                reference_no: p.reference_no,
                bank_name: p.bank_name,
                branch_name: p.branch_name,

                cheque_deposit_due_date: p.cheque_deposit_due_date ?? "",
                coal4_id: p.coal4_id ? String(p.coal4_id) : "",
                cheque_collect_status: p.cheque_collect_status ?? "PENDING",
                cheque_collect_date: p.cheque_collect_date ?? "",
                cheque_bounce_date: p.cheque_bounce_date ?? "",
                cheque_return_reason: p.cheque_return_reason ?? "",
                status: p.status ?? "PENDING",
                note: p.note ?? "",
            }));
        } catch (e: any) {
            toast.info(e?.message || "Failed to load payment.");
        } finally {
            setIsLoading(false);
        }
    };

    const loadCoa4Banks = async () => {
        try {
            // ✅ adjust API url (আপনার COA4 bank list endpoint যেটা আছে)
            // expected: [{value: 12, label: "Dutch Bangla Bank - Gulshan"}, ...]
            const res: any = await httpService.get(`/acc/coa4/banks`);
            const list = res?.data?.data ?? res?.data ?? [];
            setCoa4Banks(list);
        } catch (e) {
            // fallback empty
            setCoa4Banks([]);
        }
    };

    /* ================= HANDLERS ================= */

    const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((p) => ({ ...p, [name]: value }));
    };

    const handleOnSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;

        setFormData((p) => ({ ...p, [name]: value }));

        // ✅ auto clear bounce/collect fields based on status (UX)
        if (name === "cheque_collect_status") {
            if (value !== "COLLECTED") {
                setFormData((p) => ({ ...p, cheque_collect_date: "" }));
            }
            if (value !== "BOUNCED") {
                setFormData((p) => ({ ...p, cheque_bounce_date: "", cheque_return_reason: "" }));
            }
        }
    };

    const resetForm = () => {
        setFormData((prev) => ({
            ...initialState,
            // keep readonly display values
            id: prev.id,
            receipt_no: prev.receipt_no,
            payment_date: prev.payment_date,
            amount: prev.amount,
            reference_no: prev.reference_no,
            bank_name: prev.bank_name,
            branch_name: prev.branch_name,
        }));
    };

    /* ================= SUBMIT ================= */

    const submitUpdate = async () => {
        if (!id) return;

        // ✅ basic validation aligned with your rules
        if (!formData.cheque_collect_status) {
            toast.info("Please select cheque status.");
            return;
        }

        if (formData.cheque_collect_status === "COLLECTED" && !formData.cheque_collect_date) {
            toast.info("Cheque collect date is required when status is COLLECTED.");
            return;
        }

        if (formData.cheque_collect_status === "BOUNCED") {
            if (!formData.cheque_bounce_date) {
                toast.info("Cheque bounce date is required when status is BOUNCED.");
                return;
            }
            if (!formData.cheque_return_reason?.trim()) {
                toast.info("Return reason is required when status is BOUNCED.");
                return;
            }
        }

        // deposit schedule + bank selection recommended (আপনি চাইলে required করতে পারেন)
        // if (!formData.cheque_deposit_due_date) { toast.info("Deposit due date required."); return; }
        // if (!formData.coal4_id) { toast.info("Please select deposit bank."); return; }

        try {
            setButtonLoading(true);

            const payload = {
                cheque_deposit_due_date: formData.cheque_deposit_due_date || null,
                coal4_id: formData.coal4_id ? Number(formData.coal4_id) : null,
                cheque_collect_status: formData.cheque_collect_status,
                cheque_collect_date: formData.cheque_collect_date || null,
                cheque_bounce_date: formData.cheque_bounce_date || null,
                cheque_return_reason: formData.cheque_return_reason || null,
                status: formData.status,
                note: formData.note || null,
            };

            // ✅ adjust route to your backend
            const res: any = await httpService.patch(`/unit-sale-payments/${id}/cheque-update`, payload);

            toast.success(res?.data?.message || "Cheque updated successfully");
            navigate("/real-estate/cheque-register"); // আপনার list route অনুযায়ী দিন
        } catch (e: any) {
            toast.info(e?.response?.data?.message || e?.message || "Failed to update cheque.");
        } finally {
            setButtonLoading(false);
        }
    };

    /* ================= UI ================= */

    const showCollectedFields = formData.cheque_collect_status === "COLLECTED";
    const showBouncedFields = formData.cheque_collect_status === "BOUNCED";

    return (
        <>
            <HelmetTitle title="Cheque Update" />

            {isLoading ? <Loader /> : null}

            <div>
                {/* Top read-only summary (same theme) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <InputElement
                        id="receipt_no_display"
                        name="receipt_no_display"
                        label="Money Receipt No."
                        value={formData.receipt_no || ""}
                        placeholder=""
                        className=""
                        onChange={() => { }}
                    // readOnly
                    />
                    <InputElement
                        id="payment_date_display"
                        name="payment_date_display"
                        label="Payment Date"
                        value={formData.payment_date || ""}
                        placeholder=""
                        className=""
                        onChange={() => { }}
                    // readOnly
                    />
                    <InputElement
                        id="amount_display"
                        name="amount_display"
                        label="Amount"
                        value={formData.amount?.toString() || ""}
                        placeholder=""
                        className=""
                        onChange={() => { }}
                    // readOnly
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <InputElement
                        id="reference_no_display"
                        name="reference_no_display"
                        label="Check/Ref. Number"
                        value={formData.reference_no || ""}
                        placeholder=""
                        className=""
                        onChange={() => { }}
                    // readOnly
                    />
                    <InputElement
                        id="bank_name_display"
                        name="bank_name_display"
                        label="Issuing Bank"
                        value={formData.bank_name || ""}
                        placeholder=""
                        className=""
                        onChange={() => { }}
                    // readOnly
                    />
                    <InputElement
                        id="branch_name_display"
                        name="branch_name_display"
                        label="Issuing Branch"
                        value={formData.branch_name || ""}
                        placeholder=""
                        className=""
                        onChange={() => { }}
                    // readOnly
                    />
                </div>

                {/* Editable cheque processing fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <InputElement
                        id="cheque_deposit_due_date"
                        name="cheque_deposit_due_date"
                        label="Deposit Due Date"
                        type="date"
                        value={formData.cheque_deposit_due_date || ""}
                        placeholder="Select deposit due date"
                        className=""
                        onChange={handleOnChange}
                    />

                    <DropdownCommon
                        id="coal4_id"
                        name="coal4_id"
                        label="Deposit Bank (COA4)"
                        onChange={handleOnSelectChange}
                        value={formData.coal4_id || ""}
                        className="h-[2.1rem] bg-transparent mt-1"
                        data={coa4Banks}
                    />

                    <DropdownCommon
                        id="cheque_collect_status"
                        name="cheque_collect_status"
                        label="Cheque Status"
                        onChange={handleOnSelectChange}
                        value={formData.cheque_collect_status || "PENDING"}
                        className="h-[2.1rem] bg-transparent mt-1"
                        data={CHEQUE_COLLECT_STATUSES}
                    />
                </div>

                {showCollectedFields && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                        <InputElement
                            id="cheque_collect_date"
                            name="cheque_collect_date"
                            label="Collect Date"
                            type="date"
                            value={formData.cheque_collect_date || ""}
                            placeholder="Select collect date"
                            className=""
                            onChange={handleOnChange}
                        />
                    </div>
                )}

                {showBouncedFields && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                            <InputElement
                                id="cheque_bounce_date"
                                name="cheque_bounce_date"
                                label="Bounce Date"
                                type="date"
                                value={formData.cheque_bounce_date || ""}
                                placeholder="Select bounce date"
                                className=""
                                onChange={handleOnChange}
                            />
                            <InputElement
                                id="cheque_return_reason"
                                name="cheque_return_reason"
                                label="Return Reason"
                                type="text"
                                value={formData.cheque_return_reason || ""}
                                placeholder="Enter return reason"
                                className=""
                                onChange={handleOnChange}
                            />
                        </div>
                    </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <DropdownCommon
                        id="status"
                        name="status"
                        label="Overall Status"
                        onChange={handleOnSelectChange}
                        value={formData.status || "PENDING"}
                        className="h-[2.1rem] bg-transparent mt-1"
                        data={PAYMENT_STATUSES}
                    />

                    <InputElement
                        id="note"
                        name="note"
                        label="Note"
                        type="text"
                        value={formData.note || ""}
                        placeholder="Optional note"
                        className=""
                        onChange={handleOnChange}
                    />
                </div>

                {/* Buttons row (same theme) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                    <ButtonLoading
                        onClick={submitUpdate}
                        buttonLoading={buttonLoading}
                        label="Update"
                        className="whitespace-nowrap text-center mr-0 p-2"
                        icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
                    />

                    <ButtonLoading
                        onClick={resetForm}
                        buttonLoading={false}
                        label="Reset"
                        className="whitespace-nowrap text-center mr-0 p-2"
                        icon={<FiRefreshCcw className="text-white text-lg ml-2 mr-2" />}
                    />

                    <Link to="/real-estate/cheque-register" className="text-nowrap justify-center mr-0 P-2">
                        <FiArrowLeft className="mr-2" /> Back
                    </Link>
                </div>
            </div>
        </>
    );
};

export default ChequeUpdate;