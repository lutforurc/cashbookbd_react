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

const LIST_PATH = "/admin/unit-payment-list";

type FormState = {
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
          <h2 className="text-lg font-semibold">Unit Sale Payment Entry</h2>

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

        <div className="bg-white dark:bg-gray-800 rounded border border-gray-400 p-3 mb-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
            <div>
              <div className="dark:text-white text-left text-sm text-gray-900">Receipt No</div>
              <div className="font-medium">{form.receipt_no || "-"}</div>
            </div>

            <div>
              <div className="dark:text-white text-left text-sm text-gray-900">Booking</div>
              <div className="font-medium">-</div>
              <div className="text-xs dark:text-white text-left text-gray-900">-</div>
            </div>

            <div>
              <div className="dark:text-white text-left text-sm text-gray-900">Customer</div>
              <div className="font-medium">-</div>
              <div className="text-xs dark:text-white text-left text-gray-900">-</div>
            </div>

            <div>
              <div className="dark:text-white text-left text-sm text-gray-900">Issued Amount</div>
              <div className="font-medium">
                {form.amount !== "" ? thousandSeparator(Number(form.amount || 0), 2) : "-"}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded border border-gray-400 p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
