import React from 'react';
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
}: VoucherActionButtonsProps) => {
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

  return (
    <>
      {canShowApproveAction ? (
        <button
          type="button"
          onClick={withEventGuard(onApprove, () => !isApproved && approvingId !== voucherId)}
          className={`cursor-pointer ${isApproved ? 'cursor-default' : ''}`}
          title={
            isApproved
              ? `Approved${row?.approved_by ? ` by ${row.approved_by}` : ''}`
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
          onClick={withEventGuard(
            onRemoveApproval,
            () => removingApprovalId !== voucherId,
          )}
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
    </>
  );
};

export default VoucherActionButtons;
