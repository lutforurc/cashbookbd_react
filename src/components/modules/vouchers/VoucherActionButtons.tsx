import React, { useEffect, useRef, useState } from 'react';
import {
  FiCheckCircle,
  FiEdit,
  FiLock,
  FiLogIn,
  FiPrinter,
  FiTruck,
  FiXCircle,
} from 'react-icons/fi';
import { Button } from '../../../pages/UiElements/CustomButtons';

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
  /**
   * A second paper off the same voucher -- the delivery challan. Off unless a
   * screen asks for it, so the four other ledgers that share these buttons keep
   * the row of icons they have.
   */
  canShowChallanAction?: boolean;
  /**
   * Whether this user may edit vouchers at all. Callers hide the edit button on
   * approved rows, which leaves an empty cell that reads like "nothing to do
   * here". With this on, such a row shows a lock instead: editing is blocked by
   * the approval, not missing. Someone with no edit rights sees nothing extra.
   */
  canEditVoucher?: boolean;
  onApprove?: (row: any) => void;
  onRemoveApproval?: (row: any) => void;
  onEdit?: (row: any) => void;
  onPrint?: (row: any) => void;
  onChallan?: (row: any) => void;
  stopPropagation?: boolean;
  printTitle?: string;
  editTitle?: string;
  challanTitle?: string;
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
  canShowChallanAction = false,
  canEditVoucher = false,
  onApprove,
  onRemoveApproval,
  onEdit,
  onPrint,
  onChallan,
  stopPropagation = false,
  printTitle = 'Print Voucher',
  editTitle = 'Edit Voucher',
  challanTitle = 'Print Delivery Challan',
  confirmInline = false,
}: VoucherActionButtonsProps) => {
  const [pending, setPending] = useState<null | 'approve' | 'remove'>(null);
  // `fixed` position so the confirm escapes the table cell's overflow:hidden.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const yesRef = useRef<HTMLButtonElement>(null);

  // Focus the "Yes" button when the confirm opens, so Enter executes it.
  useEffect(() => {
    if (pending && pos) {
      yesRef.current?.focus();
    }
  }, [pending, pos]);

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
    setPos({ top: rect.bottom + 10, left: rect.left + rect.width / 2 });
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

  // The lock already says "approved", so the approve button's green tick would
  // be a second badge for the same fact. Drop it and keep the row to two icons.
  const showApprovedLock = canEditVoucher && isApproved && !canShowEditAction;

  return (
    <div className="flex items-center justify-center gap-2">
      {canShowApproveAction && !showApprovedLock ? (
        <Button
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
        </Button>
      ) : null}

      {canShowRemoveApprovalAction ? (
        <Button
          type="button"
          onClick={
            confirmInline
              ? openConfirm('remove')
              : withEventGuard(onRemoveApproval, () => removingApprovalId !== voucherId)
          }
          className="text-amber-600"
          title="Remove approval"
          disabled={removingApprovalId === voucherId}
        >
          <FiXCircle className="cursor-pointer" />
        </Button>
      ) : null}

      {canShowPrintAction ? (
        <Button
          type="button"
          onClick={withEventGuard(onPrint)}
          className="text-blue-500"
          title={printTitle}
        >
          <FiPrinter className="cursor-pointer" width="30" height="30" />
        </Button>
      ) : null}

      {/* The challan sits beside the invoice rather than replacing it: they are
          two papers off one sale, and a driver leaving the gate needs the one
          the printer icon does not give him. A lorry, not a second printer --
          two printers side by side say nothing about which prints what. */}
      {canShowChallanAction ? (
        <Button
          type="button"
          onClick={withEventGuard(onChallan)}
          className="text-emerald-600 dark:text-emerald-400"
          title={challanTitle}
        >
          <FiTruck className="cursor-pointer" />
        </Button>
      ) : null}

      {canShowEditAction ? (
        <Button
          type="button"
          onClick={withEventGuard(onEdit)}
          className="text-blue-500"
          title={editTitle}
        >
          <FiEdit className="cursor-pointer" />
        </Button>
      ) : null}

      {showApprovedLock ? (
        <span
          className="inline-flex cursor-help text-amber-600 dark:text-amber-400"
          title={
            canShowRemoveApprovalAction
              ? 'Approved, so editing is locked. Remove the approval to edit it.'
              : `Approved${approvedByName ? ` by ${approvedByName}` : ''}, so editing is locked.`
          }
        >
          <FiLock />
          <span className="sr-only">Approved — locked for editing</span>
        </span>
      ) : null}

      {/* Confirm — box popover right below the clicked button */}
      {confirmInline && pending && pos ? (
        <div
          className="fixed z-50"
          style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              confirmAction();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              closeConfirm();
            }
          }}
        >
          <div className="relative bg-white dark:bg-gray-800 border border-[rgb(var(--c-border))] shadow-md rounded-md px-4 py-3">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-l border-t border-[rgb(var(--c-border))] rotate-45"></div>
            <p className="text-sm text-black-900 dark:text-gray-200 mb-3 text-center whitespace-nowrap">
              {pending === 'approve' ? 'Approve this voucher?' : 'Remove approval?'}
            </p>
            <div className="flex justify-center gap-3">
              <Button
                type="button"
                ref={yesRef}
                onClick={confirmAction}
                className={`px-4 py-1.5 text-sm text-white rounded ${
                  pending === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Yes
              </Button>
              <Button
                type="button"
                onClick={closeConfirm}
                className="px-4 py-1.5 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded"
              >
                No
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default VoucherActionButtons;
