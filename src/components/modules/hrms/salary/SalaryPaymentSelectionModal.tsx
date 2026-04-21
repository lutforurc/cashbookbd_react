import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiPrinter } from "react-icons/fi";
import { toast } from "react-toastify";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import Checkbox from "../../../utils/fields/Checkbox";
import InputElement from "../../../utils/fields/InputElement";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { formatPaymentMonth } from "../../../utils/utils-functions/formatDate";

type SalaryHistory = {
  name?: string;
  designation_name?: string;
  working_days?: number | string;
};

type SalaryPaymentRow = {
  id: number;
  serial_no?: number;
  net_salary?: number;
  payment_amount?: number;
  history?: string | SalaryHistory;
};

type PaymentSubmitRow = {
  id: number;
  pay_amount: number;
};

type Props = {
  open: boolean;
  loading?: boolean;
  rows?: SalaryPaymentRow[];
  paymentMonth?: string;
  onClose: () => void;
  onPrint: () => void;
  onSubmit: (rows: PaymentSubmitRow[]) => void;
};

const getHistory = (history?: string | SalaryHistory): SalaryHistory => {
  if (!history) return {};

  if (typeof history === "string") {
    try {
      return JSON.parse(history);
    } catch {
      return {};
    }
  }

  return history;
};

const getDueAmount = (row: SalaryPaymentRow) =>
  Math.max(Number(row.net_salary || 0) - Number(row.payment_amount || 0), 0);

const SalaryPaymentSelectionModal = ({
  open,
  loading = false,
  rows = [],
  paymentMonth,
  onClose,
  onPrint,
  onSubmit,
}: Props) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [paymentValues, setPaymentValues] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!open) return;

    const nextValues: Record<number, string> = {};
    rows.forEach((row) => {
      nextValues[row.id] = getDueAmount(row).toString();
    });

    setSelectedIds([]);
    setPaymentValues(nextValues);
  }, [open, rows]);

  const payableRows = useMemo(
    () => rows.filter((row) => getDueAmount(row) > 0),
    [rows]
  );

  const isAllSelected =
    payableRows.length > 0 &&
    payableRows.every((row) => selectedIds.includes(row.id));

  const selectedSummary = useMemo(() => {
    return selectedIds.reduce(
      (acc, id) => {
        const row = rows.find((item) => item.id === id);
        if (!row) return acc;

        const payAmount = Number(paymentValues[id] || 0);
        if (!payAmount || Number.isNaN(payAmount) || payAmount <= 0) return acc;

        acc.count += 1;
        acc.amount += payAmount;
        return acc;
      },
      { count: 0, amount: 0 }
    );
  }, [paymentValues, rows, selectedIds]);

  const hasInvalidSelection = useMemo(() => {
    return selectedIds.some((id) => {
      const row = rows.find((item) => item.id === id);
      if (!row) return true;

      const dueAmount = getDueAmount(row);
      const payAmount = Number(paymentValues[id] || 0);

      return !payAmount || Number.isNaN(payAmount) || payAmount <= 0 || payAmount > dueAmount;
    });
  }, [paymentValues, rows, selectedIds]);

  if (!open) return null;

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? payableRows.map((row) => row.id) : []);
  };

  const toggleRow = (rowId: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, rowId] : prev.filter((id) => id !== rowId)
    );
  };

  const handleSubmit = () => {
    if (selectedIds.length === 0) {
      toast.info("Please select Employee select");
      return;
    }

    const payload = selectedIds
      .map((id) => {
        const row = rows.find((item) => item.id === id);
        if (!row) return null;

        const dueAmount = getDueAmount(row);
        const payAmount = Number(paymentValues[id] || 0);

        if (!payAmount || Number.isNaN(payAmount) || payAmount <= 0) return null;
        if (payAmount > dueAmount) return null;

        return {
          id,
          pay_amount: payAmount,
        };
      })
      .filter(Boolean) as PaymentSubmitRow[];

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/55 px-4 py-6 backdrop-blur-[2px] md:px-6 md:py-8">
      <div className="h-full w-full max-w-6xl overflow-y-auto border border-slate-200 bg-slate-50 p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-start justify-between gap-4  border border-slate-200 bg-white/95 px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/95">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Salary Payment
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {paymentMonth
                ? `Month: ${formatPaymentMonth(paymentMonth)}`
                : "Select employees and adjust payment amount if needed."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ButtonLoading
              onClick={onPrint}
              label="Print List"
              icon={<FiPrinter className="h-4 w-4" />}
              className="whitespace-nowrap bg-slate-600 px-4 py-2 hover:bg-slate-700"
            />
            <ButtonLoading
              onClick={onClose}
              label="Back"
              icon={<FiArrowLeft className="h-4 w-4" />}
              className="whitespace-nowrap bg-blue-600 px-4 py-2 hover:bg-blue-700"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <Checkbox
            id="salary_select_all"
            name="salary_select_all"
            checked={isAllSelected}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              toggleAll(e.target.checked)
            }
            label={`Select All Payable (${payableRows.length})`}
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          />

          <div className="text-sm text-slate-700 dark:text-slate-200">
            Selected: <span className="font-semibold">{selectedSummary.count}</span>
            {" | "}
            Amount:{" "}
            <span className="font-semibold">
              {thousandSeparator(selectedSummary.amount)}
            </span>
          </div>
        </div>

        {hasInvalidSelection && (
          <div className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            Selected row payment amount must be greater than 0 and cannot exceed due amount.
          </div>
        )}

        <div className="overflow-x-auto border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100">
              <tr>
                <th className="px-3 py-3 text-center w-6">Mark</th>
                <th className="px-3 py-3 text-center w-6">SL</th>
                <th className="px-3 py-3 text-left">Employee</th>
                <th className="px-3 py-3 text-center">Days</th>
                <th className="px-3 py-3 text-right">Net Salary</th>
                <th className="px-3 py-3 text-right">Paid</th>
                <th className="px-3 py-3 text-right">Due</th>
                <th className="px-3 py-3 text-right">Pay Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const history = getHistory(row.history);
                const dueAmount = getDueAmount(row);
                const isChecked = selectedIds.includes(row.id);

                return (
                  <tr
                    key={row.id}
                    className="border-t border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/40"
                  >
                    <td className="px-3 py-2 align-top item-center ">
                      <Checkbox
                        id={`salary_row_${row.id}`}
                        name={`salary_row_${row.id}`}
                        checked={isChecked}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          dueAmount > 0 && toggleRow(row.id, e.target.checked)
                        }
                        label=""
                        inputClassName="h-4 w-4"
                        className={dueAmount <= 0 ? "opacity-50" : ""}
                      />
                    </td>
                    <td className="px-3 py-2 align-top">{row.serial_no}</td>
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {history.name || "-"}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {history.designation_name || "-"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center align-top">
                      {history.working_days || "-"}
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      {thousandSeparator(Number(row.net_salary || 0))}
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      {thousandSeparator(Number(row.payment_amount || 0))}
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      <span
                        className={dueAmount > 0 ? "font-semibold text-amber-700" : "text-green-600"}
                      >
                        {thousandSeparator(dueAmount)}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      <InputElement
                        id={`pay_amount_${row.id}`}
                        name={`pay_amount_${row.id}`}
                        value={paymentValues[row.id] ?? ""}
                        onChange={(e) =>
                          setPaymentValues((prev) => ({
                            ...prev,
                            [row.id]: e.target.value,
                          }))
                        }
                        type="number"
                        inputMode="decimal"
                        disabled={dueAmount <= 0}
                        className="ml-auto w-32 border-slate-300 bg-white text-right dark:border-slate-600 dark:bg-slate-900"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Select specific employees using the tick mark, or use ‘Select All Payable’.
          </div>

          <div className="flex gap-2">
            <ButtonLoading
              onClick={onClose}
              label="Back"
              icon={<FiArrowLeft className="h-4 w-4" />}
              className="whitespace-nowrap bg-slate-500 px-4 py-2 hover:bg-slate-600"
            />
            <ButtonLoading
              onClick={handleSubmit}
              buttonLoading={loading}
              disabled={loading || hasInvalidSelection}
              label="Pay Selected"
              className="whitespace-nowrap bg-emerald-600 px-4 py-2 hover:bg-emerald-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalaryPaymentSelectionModal;
