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
import useTooltip from '../../utils/others/useTooltip';

/**
 * The app's own tooltip, put round one button.
 *
 * ⚠️ A COMPONENT RATHER THAN A HOOK CALL PER BUTTON, and it has to be: the
 * buttons below are rendered conditionally, and a hook called inside a
 * conditional runs in a different order from one render to the next -- the one
 * thing hooks may not do. Each button gets its own small component instead, so
 * the hook inside it is unconditional.
 *
 * The browser's own title= is not left in place beside it: two bubbles would
 * open over each other about half a second apart, one styled like the app and
 * one not.
 */
const Hint = ({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) => {
  const { anchorProps, tooltip } = useTooltip<HTMLSpanElement>(label);

  return (
    <>
      <span {...anchorProps} className="inline-flex">
        {children}
      </span>
      {tooltip}
    </>
  );
};

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

  const approvedByRaw = String(
    row?.approved_user?.name ??
    row?.approved_by_name ??
    row?.approved_by ??
    '',
  ).trim();

  /**
   * ⚠️ A BARE NUMBER IS NOT A NAME. Some endpoints resolve the approver before
   * sending -- the sales and purchase ledgers put the name in approved_by --
   * and others send the column as it stands, which is the user's id. "Approved
   * by 5" tells a reader less than "Approved" does, so an all-digit value is
   * dropped rather than printed.
   */
  const approvedByName = /^\d+$/.test(approvedByRaw) ? '' : approvedByRaw;

  /**
   * Who approved it, in one phrase.
   *
   * The tick, the cross and the lock all report the same fact and each used to
   * word it for itself -- the cross did not name the approver at all, which is
   * the icon an approved row actually shows. One phrase, so a row cannot answer
   * the same question three ways.
   */
  const approvedBy = approvedByName ? `Approved by ${approvedByName}` : 'Approved';

  // The lock already says "approved", so the approve button's green tick would
  // be a second badge for the same fact. Drop it and keep the row to two icons.
  const showApprovedLock = canEditVoucher && isApproved && !canShowEditAction;

  return (
    <div className="flex items-center justify-center gap-2">
      {canShowApproveAction && !showApprovedLock ? (
        <Hint label={isApproved ? approvedBy : 'Approve voucher'}>
          <Button
            type="button"
            onClick={
              confirmInline
                ? openConfirm('approve')
                : withEventGuard(onApprove, () => !isApproved && approvingId !== voucherId)
            }
            className={`cursor-pointer ${isApproved ? 'cursor-default' : ''}`}
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
        </Hint>
      ) : null}

      {canShowRemoveApprovalAction ? (
        <Hint label={approvedBy}>
          <Button
            type="button"
            onClick={
              confirmInline
                ? openConfirm('remove')
                : withEventGuard(onRemoveApproval, () => removingApprovalId !== voucherId)
            }
            className="text-amber-600"
            disabled={removingApprovalId === voucherId}
          >
            <FiXCircle className="cursor-pointer" />
          </Button>
        </Hint>
      ) : null}

      {canShowPrintAction ? (
        <Hint label={printTitle}>
          <Button
            type="button"
            onClick={withEventGuard(onPrint)}
            className="text-blue-500"
          >
            <FiPrinter className="cursor-pointer" width="30" height="30" />
          </Button>
        </Hint>
      ) : null}

      {/* The challan sits beside the invoice rather than replacing it: they are
          two papers off one sale, and a driver leaving the gate needs the one
          the printer icon does not give him. A lorry, not a second printer --
          two printers side by side say nothing about which prints what. */}
      {canShowChallanAction ? (
        <Hint label={challanTitle}>
          <Button
            type="button"
            onClick={withEventGuard(onChallan)}
            className="text-emerald-600 dark:text-emerald-400"
          >
            <FiTruck className="cursor-pointer" />
          </Button>
        </Hint>
      ) : null}

      {canShowEditAction ? (
        <Hint label={editTitle}>
          <Button
            type="button"
            onClick={withEventGuard(onEdit)}
            className="text-blue-500"
          >
            <FiEdit className="cursor-pointer" />
          </Button>
        </Hint>
      ) : null}

      {showApprovedLock ? (
        <Hint
          label={`${approvedBy}, so editing is locked.${
            canShowRemoveApprovalAction ? ' Remove the approval to edit it.' : ''
          }`}
        >
          <span className="inline-flex cursor-help text-amber-600 dark:text-amber-400">
            <FiLock />
            <span className="sr-only">{approvedBy} — locked for editing</span>
          </span>
        </Hint>
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
