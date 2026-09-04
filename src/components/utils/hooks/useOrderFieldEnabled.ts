import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { userCurrentBranch } from '../../modules/branch/branchSlice';

/**
 * Does this branch's cash screen carry the "Select Order (Optional)" box?
 *
 * Cash Received and Cash Payment are three screens behind one route, chosen by
 * the branch (see CashReceivedIndex and CashPaymentIndex): head office and the
 * real-estate project branches get their own, everyone else is Trading or
 * General by inventory system. Only the Trading pair has an order field.
 *
 * The bank screens are single components, so they showed the order box to every
 * branch -- a General branch had one on Bank Received and none on Cash Received,
 * for the same voucher against the same order. This is that rule written once,
 * so the two sides answer the same question the same way.
 */
export const branchUsesOrderField = (branch: any): boolean => {
  if (!branch) {
    return false;
  }

  // Head office, spelled two ways by the two indexes, and the project-expense
  // branches. None of their screens offers an order.
  if (Number(branch.business_type_id) === 1) {
    return false;
  }

  if (Number(branch.branch_types_id) === 1) {
    return false;
  }

  if (Number(branch.business_type_id) === 9) {
    return false;
  }

  // inventory_system 4 = trading.
  return Number(branch.inventory_system_id) === 4;
};

const useOrderFieldEnabled = (): boolean => {
  const dispatch = useDispatch();
  const currentBranch = useSelector((state: any) => state.branchList?.currentBranch);

  useEffect(() => {
    if (!currentBranch?.inventory_system_id) {
      dispatch(userCurrentBranch());
    }
  }, [currentBranch?.inventory_system_id, dispatch]);

  return branchUsesOrderField(currentBranch);
};

export default useOrderFieldEnabled;
