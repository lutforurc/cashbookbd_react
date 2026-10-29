import { hasPermission, type Permission } from '../../Sidebar/permissionUtils';
import { getEditableVoucherNo, getVoucherTypePrefix } from './voucherEditNavigation';

/**
 * The edit permission a row's voucher type demands.
 *
 * ⚠️ THIS IS THE CLIENT'S MIRROR OF THE SERVER'S voucherEditPermission(). The
 * same voucher type must answer the same permission on both sides, or a button
 * shows for an edit the API will refuse -- or, worse, hides one it would allow.
 * The type is read the same way the Edit navigation already reads it: the
 * number's prefix, and for the 1-/2- pair whether the money moved through the
 * bank (is_bank_voucher), exactly the two facts the API asks the voucher for.
 *
 * Null when the number names no type this table knows. Such a row gets no Edit
 * button here, and the server REFUSES it (fail closed) rather than leaving it to
 * its own screen.
 */
export const getVoucherEditPermission = (row: any): string | null => {
  const prefix = getVoucherTypePrefix(getEditableVoucherNo(row));
  const isBank = row?.is_bank_voucher === true;

  switch (prefix) {
    case '1':
      return isBank ? 'bank.received.edit' : 'cash.received.edit';
    case '2':
      return isBank ? 'bank.payment.edit' : 'cash.payment.edit';
    case '3':
    case '10':
      return 'sales.edit';
    case '4':
    case '9':
      return 'purchase.edit';
    case '5':
      return 'journal.edit';
    case '12':
      return 'purchase.return.edit';
    case '13':
      return 'sales.return.edit';
    default:
      return null;
  }
};

/**
 * Voucher types the report can actually edit -- an update endpoint exists for
 * each (see the server's denyUnlessVoucherEditable callers).
 *
 * ⚠️ A JOURNAL HAS NO UPDATE ENDPOINT (`accounts/journal/store` is a create
 * only), so 5- is deliberately absent: its pencil would open a form whose save
 * cannot land on the voucher the desk opened. The server still classifies it as
 * journal.edit, and that mapping is kept -- it is this list, not the permission,
 * that withholds the button until an update path is built.
 */
const EDITABLE_VOUCHER_PREFIXES = ['1', '2', '3', '4', '9', '10', '12', '13'];

/**
 * Whether the caller may edit this row's voucher.
 *
 * ⚠️ ONE PERMISSION DOES NOT COVER EVERY KIND. A clerk trusted with sales is not
 * thereby trusted with purchases, cash or journals -- the server enforces each
 * type's own permission, and this asks the same one so the button agrees. A
 * kind with no update endpoint gets no button, however its permission is
 * assigned.
 */
export const canEditVoucherRow = (
  permissions: Permission[] | undefined | null,
  row: any,
): boolean => {
  const prefix = getVoucherTypePrefix(getEditableVoucherNo(row));

  if (!EDITABLE_VOUCHER_PREFIXES.includes(prefix)) {
    return false;
  }

  const permission = getVoucherEditPermission(row);

  return permission ? hasPermission(permissions, permission) : false;
};
