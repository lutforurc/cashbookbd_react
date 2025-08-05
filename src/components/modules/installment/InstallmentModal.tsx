import React from "react";
import { ButtonLoading } from "../../../pages/UiElements/CustomButtons";

interface InstallmentModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  amount: number | string;
  setAmount: (value: number | string) => void;
  remarks: string;
  setRemarks: (value: string) => void;
}

const InstallmentModal: React.FC<InstallmentModalProps> = ({
  open,
  onClose,
  onSave,
  amount,
  setAmount,
  remarks,
  setRemarks,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50 border">
      <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md w-96 text-gray-900 dark:text-gray-100 border-2 border-gray-900 dark:border-gray-400">
        <h2 className="text-lg font-bold mb-4">Received Installment</h2>

        <div className="mb-3">
          <label className="block text-sm mb-1">Amount</label>
          <input
            type="number"
            className="w-full border p-2 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
            value={amount}
            // onChange={(e) => setAmount(e.target.value)}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-1">Remarks</label>
          <textarea
            className="w-full border p-2 rounded bg-white dark:bg-gray-700 dark:border-gray-600"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <ButtonLoading
            onClick={onSave}
            label="Save"
            className="mt-0 md:mt-6 pt-[0.45rem] pb-[0.45rem] w-full"
          />
          <ButtonLoading
            onClick={onClose}
            label="Cancel"
            className="mt-0 md:mt-6 pt-[0.45rem] pb-[0.45rem] w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default InstallmentModal;
