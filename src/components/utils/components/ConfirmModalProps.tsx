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
    // A dialog has to sit above the cards, not among them. Dark mode used to
    // paint it gray-900 (#111827) on a page of boxdark-2 (#171D25) with no
    // border -- the same colour, so the panel had no edge and its shadow was
    // invisible against the dark behind it.
    //
    // The surfaces now climb: page #171D25, cards #212932, this #313945
    // (graydark), so the dialog is the lightest thing on screen and reads as
    // the nearest. form-strokedark (#3A4451) draws the edge, a heavier and
    // blurred backdrop pushes the page away, and the divider under the title
    // gives the box a structure to be seen by.
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-stroke bg-white text-slate-800 shadow-2xl dark:border-form-strokedark dark:bg-graydark dark:text-white">
        <h3 className="border-b border-stroke px-5 py-3 text-lg font-semibold text-black dark:border-form-strokedark dark:text-white">
          {title}
        </h3>

        <div className="px-5 py-4">{message}</div>

        <div className="flex justify-center gap-3 border-t border-stroke px-5 py-4 dark:border-form-strokedark">
          {showCancelButton ? (
            <ButtonLoading
              onClick={onCancel}
              label={cancelLabel}
              className="h-8 whitespace-nowrap bg-slate-500 hover:bg-slate-600 dark:bg-gray-500 dark:hover:bg-gray-600"
              icon={<FiX className="text-lg mr-2" />}
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
