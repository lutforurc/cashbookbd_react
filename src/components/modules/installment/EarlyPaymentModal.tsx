import React from 'react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

dayjs.extend(customParseFormat);

type EarlyPaymentSummary = {
  invoiceNo: string;
  deadline: string;
  invoiceTotalAmount: number;
  discount: number;
  earlyPaymentAmount: number;
  totalPaidBeforeDeadline: number;
  remainingAfterDiscount: number;
  canApply: boolean;
  message: string;
};

interface EarlyPaymentModalProps {
  open: boolean;
  onClose: () => void;
  summary: EarlyPaymentSummary | null;
  onApply?: () => void;
}

const formatAmount = (value: number) => {
  if (value === 0) return '0';
  return thousandSeparator(value, 0);
};

const formatDisplayDate = (value: string) => {
  const parsed = dayjs(value, ['YYYY-MM-DD', 'DD/MM/YYYY', 'YYYY-MM-DD HH:mm:ss', 'DD/MM/YYYY HH:mm:ss'], true);
  if (parsed.isValid()) return parsed.format('DD/MM/YYYY');

  const fallback = dayjs(value);
  return fallback.isValid() ? fallback.format('DD/MM/YYYY') : value;
};

const SummaryRow = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) => (
  <div
    className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${
      highlight
        ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-100'
        : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
    }`}
  >
    <span className="text-sm font-medium">{label}</span>
    <span className="text-sm font-semibold">{value}</span>
  </div>
);

const EarlyPaymentModal: React.FC<EarlyPaymentModalProps> = ({
  open,
  onClose,
  summary,
  onApply,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-4">
      <div className="w-full max-w-xl rounded-lg border-2 border-gray-900 bg-white p-6 text-gray-900 shadow-md dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100">
        <h2 className="mb-1 text-lg font-bold">Early Payment</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          This shows whether the early payment discount can be applied.
        </p>

        {summary ? (
          <div className="space-y-3">
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="text-sm">
                <span className="font-medium">Invoice:</span> {summary.invoiceNo || '-'}
              </div>
              <div className="text-sm">
                <span className="font-medium">Early Payment Date:</span>{' '}
                {summary.deadline ? formatDisplayDate(summary.deadline) : '-'}
              </div>
            </div>

            <SummaryRow
              label="Installment Total Amount"
              value={formatAmount(summary.invoiceTotalAmount)}
            />
            <SummaryRow
              label="Early Payment Amount"
              value={formatAmount(summary.earlyPaymentAmount)}
            />
            <SummaryRow
              label="Paid Before Deadline"
              value={formatAmount(summary.totalPaidBeforeDeadline)}
            />
            <SummaryRow
              label="Early Payment Discount"
              value={formatAmount(summary.discount)}
            />
            <SummaryRow
              label="Remaining After Discount"
              value={formatAmount(summary.remainingAfterDiscount)}
              highlight
            />

            <div
              className={`rounded-md border px-3 py-3 text-sm font-medium ${
                summary.canApply
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100'
                  : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100'
              }`}
            >
              {summary.message}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100">
            Early payment data is not available.
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          {summary?.canApply ? (
            <ButtonLoading
              onClick={onApply}
              label="Apply Now"
              className="mt-0 pt-[0.45rem] pb-[0.45rem] w-full"
            />
          ) : null}
          <ButtonLoading
            onClick={onClose}
            label="Close"
            className="mt-0 pt-[0.45rem] pb-[0.45rem] w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default EarlyPaymentModal;
