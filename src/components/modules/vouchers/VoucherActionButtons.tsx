import React, { useState } from 'react';
import {
  FiCheckCircle,
  FiEdit,
  FiLogIn,
  FiPrinter,
  FiXCircle,
} from 'react-icons/fi';

interface VoucherActionButtonsProps {
  row: any;
  voucherId: number;
  isApproved: boolean;
  approvingId?: number | null;
  removingApprovalId?: number | null;
  canShowApproveAction?: boolean;
  canShowRemoveApprovalAction?: boolean;
  canShowEditAction?: boolean;
  canShowPrintAction?: boolean;
  onApprove?: (row: any) => void;
  onRemoveApproval?: (row: any) => void;
  onEdit?: (row: any) => void;
  onPrint?: (row: any) => void;
  stopPropagation?: boolean;
  printTitle?: string;
  editTitle?: string;
  /** Show a compact confirm right beside the button instead of a centered modal. */
  confirmInline?: boolean;
}

const VoucherActionButtons = ({
  row,
  voucherId,
  isApproved,
  approvingId = null,
  removingApprovalId = null,
  canShowApproveAction = false,
  canShowRemoveApprovalAction = false,
  canShowEditAction = false,
  canShowPrintAction = false,
  onApprove,
  onRemoveApproval,
  onEdit,
  onPrint,
  stopPropagation = false,
  printTitle = 'Print Voucher',
  editTitle = 'Edit Voucher',
  confirmInline = false,
}: VoucherActionButtonsProps) => {
  const [pending, setPending] = useState<null | 'approve' | 'remove'>(null);
  // `fixed` position so the confirm escapes the table cell's overflow:hidden.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  if (!row?.vr_no) {
    return null;
  }

  const withEventGuard = (
    callback?: (row: any) => void,
    guard?: () => boolean,
  ) => (event: React.MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (guard && !guard()) {
      return;
    }

    callback?.(row);
  };

  const openConfirm = (type: 'approve' | 'remove') => (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (stopPropagation) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (type === 'approve' && (isApproved || approvingId === voucherId)) return;
    if (type === 'remove' && removingApprovalId === voucherId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    setPos({ top: rect.top + rect.height / 2, left: rect.left - 8 });
    setPending(type);
  };

  const closeConfirm = () => {
    setPending(null);
    setPos(null);
  };

  const confirmAction = () => {
    if (pending === 'approve') {
      onApprove?.(row);
    } else if (pending === 'remove') {
      onRemoveApproval?.(row);
    }
    closeConfirm();
  };

  const approvedByName = String(
    row?.approved_user?.name ??
    row?.approved_by_name ??
    row?.approved_by ??
    '',
  ).trim();

  return (
    <>
      {canShowApproveAction ? (
        <button
          type="button"
          onClick={
            confirmInline
              ? openConfirm('approve')
              : withEventGuard(onApprove, () => !isApproved && approvingId !== voucherId)
          }
          className={`cursor-pointer ${isApproved ? 'cursor-default' : ''}`}
          title={
            isApproved
              ? `Approved${approvedByName ? ` by ${approvedByName}` : ''}`
              : 'Approve voucher'
          }
          disabled={isApproved || approvingId === voucherId}
        >
          {isApproved ? (
            <FiCheckCircle className="font-bold text-green-500" />
          ) : (
            <FiLogIn
              className={`${approvingId === voucherId ? 'text-amber-500' : 'text-red-500'}`}
            />
          )}
        </button>
      ) : null}

      {canShowRemoveApprovalAction ? (
        <button
          type="button"
          onClick={
            confirmInline
              ? openConfirm('remove')
              : withEventGuard(onRemoveApproval, () => removingApprovalId !== voucherId)
          }
          className="ml-2 text-amber-600"
          title="Remove approval"
          disabled={removingApprovalId === voucherId}
        >
          <FiXCircle className="cursor-pointer" />
        </button>
      ) : null}

      {canShowPrintAction ? (
        <button
          type="button"
          onClick={withEventGuard(onPrint)}
          className="ml-2 text-blue-500"
          title={printTitle}
        >
          <FiPrinter className="cursor-pointer" width="30" height="30" />
        </button>
      ) : null}

      {canShowEditAction ? (
        <button
          type="button"
          onClick={withEventGuard(onEdit)}
          className="ml-2 text-blue-500"
          title={editTitle}
        >
          <FiEdit className="cursor-pointer" />
        </button>
      ) : null}

      {/* Inline confirm — shown right beside the clicked button */}
      {confirmInline && pending && pos ? (
        <div
          className="fixed z-50 flex items-center gap-1 whitespace-nowrap rounded-md border border-gray-300 bg-white px-2 py-1 shadow-md dark:border-gray-700 dark:bg-gray-800"
          style={{
            top: pos.top,
            left: pos.left,
            transform: 'translate(-100%, -50%)',
          }}
        >
          <span className="text-xs text-gray-600 dark:text-gray-300">
            {pending === 'approve' ? 'Approve?' : 'Remove?'}
          </span>
          <button
            type="button"
            onClick={confirmAction}
            className={`rounded px-2 py-0.5 text-xs text-white ${
              pending === 'approve'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={closeConfirm}
            className="rounded bg-gray-500 px-2 py-0.5 text-xs text-white hover:bg-gray-600"
          >
            No
          </button>
        </div>
      ) : null}
    </>
  );
};

export default VoucherActionButtons;
