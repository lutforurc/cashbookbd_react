import React from "react";
import { FiX } from "react-icons/fi";
// import { ButtonLoading } from "../../pages/UiElements/CustomButtons";
import { ButtonLoading, DeleteButton } from "../../../pages/UiElements/CustomButtons";


interface ConfirmModalProps {
  show: boolean;
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  className?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  show,
  title = "Confirm Action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  className = "",
  onConfirm,
  onCancel,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg w-96 p-5">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>

        <div className="mb-4">{message}</div>

        <div className="flex justify-center gap-3">
          {/* Cancel Button */}
          <ButtonLoading
            onClick={onCancel}
            label={cancelLabel}
            className="whitespace-nowrap h-8 bg-gray-500 hover:bg-gray-600"
            icon={<FiX className="text-white text-lg mr-2" />}
            disabled={loading}
          />

          {/* Confirm Button */}
          <DeleteButton
            label={confirmLabel}
            onClick={onConfirm}
            loading={loading}
            disabled={loading}
            className={className}
          />
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
