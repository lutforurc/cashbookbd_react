import React, { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import InputElement from "../../../utils/fields/InputElement";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import Link from "../../../utils/others/Link";
import InputDatePicker from "../../../utils/fields/DatePicker";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { CHEQUE_STATUSES, ENTRY_STATUSES, PAYMENT_MODES, PAYMENT_TYPES } from "./checkContents";
import { getCoal3ByCoal4 } from "../../chartofaccounts/levelthree/coal3Sliders";
import httpService from "../../../services/httpService";
import { toast } from "react-toastify";

const LIST_PATH = "/admin/unit-payment-list";

type FormState = {
  booking_id: string;
  receipt_no: string;
  payment_date: string;
  amount: string | number;
  payment_type: string;
  payment_mode: string;
  reference_no: string;
  bank_name: string;
  branch_name: string;
  coal4_id: string;
  cheque_collect_status: string;
  cheque_deposit_due_date: string;
  cheque_collect_date: string;
  cheque_bounce_date: string;
  cheque_return_reason: string;
  status: string;
};

const initialForm: FormState = {
  booking_id: "",
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
  cheque_bounce_date: "",
  cheque_return_reason: "",
  status: "PENDING",
};

export default function UnitSalePaymentEntry() {
  const coal3 = useSelector((s: any) => s.coal3);
  const dispatch = useDispatch<any>();

  const [form, setForm] = useState<FormState>(initialForm);
  const [ddlBankList, setDdlBankList] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [saleOptionsLoading, setSaleOptionsLoading] = useState(false);
  const [unitSaleOptions, setUnitSaleOptions] = useState<{ id: string; name: string }[]>([
    { id: "", name: "Select Unit Sale" },
  ]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [saleSummary, setSaleSummary] = useState<any>(null);

  const errMsg = (e: any, fallback: string) =>
    e?.response?.data?.message || e?.message || fallback;

  const [paymentDateObj, setPaymentDateObj] = useState<Date | null>(new Date());
  const [chequeDueDateObj, setChequeDueDateObj] = useState<Date | null>(null);
  const [chequeCollectDateObj, setChequeCollectDateObj] = useState<Date | null>(null);
  const [chequeBounceDateObj, setChequeBounceDateObj] = useState<Date | null>(null);

  const isCheque = useMemo(() => form.payment_mode === "CHEQUE", [form.payment_mode]);
  const needsBankReceivedAccount = useMemo(
    () => ["CHEQUE", "BANK_TRANSFER"].includes(form.payment_mode),
    [form.payment_mode]
  );
  const isChequeBouncedOrCancelled = useMemo(
    () => isCheque && ["BOUNCED", "CANCELLED"].includes(form.cheque_collect_status || ""),
    [isCheque, form.cheque_collect_status]
  );

  useEffect(() => {
    dispatch(getCoal3ByCoal4(2));
  }, [dispatch]);

  useEffect(() => {
    if (Array.isArray(coal3?.coal4)) {
      setDdlBankList(coal3.coal4 || []);
    }
  }, [coal3]);

  const loadUnitSaleOptions = async (q = "") => {
    try {
      setSaleOptionsLoading(true);
      let res: any;
      try {
        res = await httpService.get(`/real-estate/unit-sale/ddl`, {
          params: { q: q || undefined, page: 1, perPage: 50, per_page: 50 },
        });
      } catch {
        // fallback if backend route is registered without "real-estate" prefix
        res = await httpService.get(`/unit-sale/ddl`, {
          params: { q: q || undefined, page: 1, perPage: 50, per_page: 50 },
        });
      }

      const rows = res?.data?.data?.data ?? res?.data?.data ?? [];
      const options: { id: string; name: string }[] = [{ id: "", name: "Select Unit Sale" }];

      rows.forEach((r: any) => {
        const saleId = String(r?.id ?? "");
        if (!saleId) return;
        const customer = r?.customer_name || "Unknown Customer";
        const unit = r?.unit_label || "Unknown Unit";
        const parking = r?.parking_label || "No Parking";
        options.push({
          id: saleId,
          name: `Sale #${saleId} - ${customer} (${unit}, ${parking})`,
        });
      });

      setUnitSaleOptions(options);
    } catch (e: any) {
      setUnitSaleOptions([{ id: "", name: "Select Unit Sale" }]);
      toast.error(errMsg(e, "Failed to load unit sale list"));
    } finally {
      setSaleOptionsLoading(false);
    }
  };

  const loadSaleSummary = async (saleId: string) => {
    if (!saleId) {
      setSaleSummary(null);
      return;
    }
    try {
      setSummaryLoading(true);
      let res: any;
      try {
        res = await httpService.get(`/real-estate/unit-sale/summary/${saleId}`);
      } catch {
        res = await httpService.get(`/unit-sale/summary/${saleId}`);
      }
      const summary = res?.data?.data ?? null;
      setSaleSummary(summary);
    } catch (e: any) {
      setSaleSummary(null);
      toast.error(errMsg(e, "Failed to load sale summary"));
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    loadUnitSaleOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bankAccountOptions = useMemo(
    () => [
      { id: "", name: "Select Bank Account" },
      ...((ddlBankList ?? []).map((item: any) => ({
        id: String(item?.id ?? ""),
        name: item?.name ?? item?.label ?? "Unnamed Account",
      })) as any[]),
    ],
    [ddlBankList]
  );

  const setField = (name: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const pretty = (v?: string) =>
    v ? v.toString().replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "-";

  const resetForm = () => {
    setForm(initialForm);
    setPaymentDateObj(new Date());
    setChequeDueDateObj(null);
    setChequeCollectDateObj(null);
    setChequeBounceDateObj(null);
  };

  return (
    <>
      <HelmetTitle title="Unit Sale Payment Entry" />

      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="flex flex-wrap gap-2 items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">Unit Sale Payment Entry</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              UI Prototype: Save/Search workflow will be wired next.
            </p>
          </div>

          <div className="flex gap-2">
            <ButtonLoading
              onClick={(e: any) => {
                e?.preventDefault?.();
                resetForm();
              }}
              buttonLoading={false}
              label="Reset"
              className="h-8"
            />
            <Link to={LIST_PATH} className="h-8 p-2">
              <FiArrowLeft className="mr-2" /> Back
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 p-3 mb-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <DropdownCommon
                id="booking_id"
                name="booking_id"
                label="Unit Sale ID"
                value={form.booking_id || ""}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const id = e.target.value;
                  setField("booking_id", id);
                  loadSaleSummary(id);
                }}
                className="h-[2.1rem] bg-transparent"
                data={unitSaleOptions}
              />
            </div>
            <div>
              <InputElement
                id="customer_search"
                name="customer_search"
                label="Customer / Mobile"
                placeholder="Type customer name or mobile"
                className="h-8.5"
                value={customerSearch}
                onChange={(e: any) => setCustomerSearch(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <ButtonLoading
                onClick={(e: any) => {
                  e?.preventDefault?.();
                  loadUnitSaleOptions(customerSearch);
                }}
                buttonLoading={saleOptionsLoading}
                label="Load Sale Info"
                className="h-8.5 w-full"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 p-3 mb-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded border border-gray-200 dark:border-gray-700 p-2">
              <div className="text-xs text-gray-500">Receipt No</div>
              <div className="font-medium">{form.receipt_no || "-"}</div>
            </div>
            <div className="rounded border border-gray-200 dark:border-gray-700 p-2">
              <div className="text-xs text-gray-500">Booking</div>
              <div className="font-medium">
                {summaryLoading ? "Loading..." : saleSummary?.booking?.unit_label || "-"}
              </div>
              <div className="text-xs text-gray-500">
                {summaryLoading ? "..." : saleSummary?.booking?.parking_label || "-"}
              </div>
            </div>
            <div className="rounded border border-gray-200 dark:border-gray-700 p-2">
              <div className="text-xs text-gray-500">Customer</div>
              <div className="font-medium">
                {summaryLoading ? "Loading..." : saleSummary?.customer?.name || "-"}
              </div>
              <div className="text-xs text-gray-500">
                {summaryLoading ? "..." : saleSummary?.customer?.mobile || "-"}
              </div>
            </div>
            <div className="rounded border border-gray-200 dark:border-gray-700 p-2">
              <div className="text-xs text-gray-500">Issued Amount</div>
              <div className="font-medium">
                {saleSummary?.amounts?.due_amount !== undefined &&
                saleSummary?.amounts?.due_amount !== null
                  ? thousandSeparator(Number(saleSummary.amounts.due_amount || 0), 2)
                  : form.amount !== ""
                  ? thousandSeparator(Number(form.amount || 0), 2)
                  : "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 p-3">
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs rounded bg-gray-100 dark:bg-gray-700 px-2 py-1">
              Mode: {pretty(form.payment_mode)}
            </span>
            <span className="text-xs rounded bg-gray-100 dark:bg-gray-700 px-2 py-1">
              Payment For: {pretty(form.payment_type)}
            </span>
            <span className="text-xs rounded bg-gray-100 dark:bg-gray-700 px-2 py-1">
              Entry Status: {pretty(form.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 border-b border-gray-200 dark:border-gray-700 pb-3 mb-3">
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

            <div>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

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

            <div>
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

            <div>
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

            <div>
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

          {isCheque ? (
            <div className="mt-4 border-t border-gray-300 dark:border-gray-700 pt-3">
              <h3 className="dark:text-white text-left text-sm text-gray-900 font-semibold mb-2">
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
                  {needsBankReceivedAccount ? (
                    <DropdownCommon
                      id="coal4_id"
                      name="coal4_id"
                      label="Bank Received Account"
                      value={form.coal4_id}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setField("coal4_id", e.target.value)
                      }
                      className="h-10 bg-transparent"
                      data={bankAccountOptions}
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

          <div className="flex flex-wrap gap-2 mt-4">
            <ButtonLoading
              type="submit"
              onClick={() => {}}
              buttonLoading={false}
              label="Save"
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
