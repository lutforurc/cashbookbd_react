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
  showCancelButton?: boolean;
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
  showCancelButton = true,
  loading = false,
  className = "",
  onConfirm,
  onCancel,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-96 rounded-lg bg-white p-5 text-slate-800 shadow-lg dark:bg-gray-900 dark:text-white">
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>

        <div className="mb-4">{message}</div>

        <div className="flex justify-center gap-3">
          {showCancelButton ? (
            <ButtonLoading
              onClick={onCancel}
              label={cancelLabel}
              className="h-8 whitespace-nowrap bg-slate-500 hover:bg-slate-600 dark:bg-gray-500 dark:hover:bg-gray-600"
              icon={<FiX className="text-white text-lg mr-2" />}
              disabled={loading}
            />
          ) : null}

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
