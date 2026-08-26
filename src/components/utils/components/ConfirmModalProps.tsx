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
  /**
   * Take the confirm button away while the message itself explains why.
   *
   * Separate from `loading`, which means "wait" -- this means "not from here".
   * A dialog whose own text says the thing cannot be done, above a button that
   * still offers to do it, asks the reader to believe the button over the words.
   * The way out is Cancel, which stays live.
   */
  disabled?: boolean;
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
  disabled = false,
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
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-[rgb(var(--c-border))] bg-white text-slate-800 shadow-2xl dark:bg-graydark dark:text-[rgb(var(--c-text))]">
        <h3 className="border-b border-[rgb(var(--c-border))] px-5 py-3 text-lg font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
          {title}
        </h3>

        <div className="px-5 py-4">{message}</div>

        <div className="flex justify-center gap-3 border-t border-[rgb(var(--c-border))] px-5 py-4">
          {showCancelButton ? (
            <ButtonLoading
              onClick={onCancel}
              label={cancelLabel}
              className="whitespace-nowrap bg-slate-500 hover:bg-slate-600 dark:bg-gray-500 dark:hover:bg-gray-600"
              icon={<FiX className="text-lg mr-2" />}
              disabled={loading}
            />
          ) : null}

          <DeleteButton
            label={confirmLabel}
            onClick={onConfirm}
            loading={loading}
            disabled={loading || disabled}
            className={className}
          />
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
