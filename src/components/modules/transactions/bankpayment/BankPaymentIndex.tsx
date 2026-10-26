import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';

import BankPayment from './BankPayment';
import TilesBankPayment from './TilesBankPayment';
import { userCurrentBranch } from '../../branch/branchSlice';
import Loader from '../../../../common/Loader';
import { branchFormVariant } from '../../../utils/userFeatureSettings';

const BankPaymentIndex = () => {
  const dispatch = useDispatch();
  const currentBranch = useSelector((state: any) => state.branchList.currentBranch);
  const settings = useSelector((state: any) => state.settings);

  useEffect(() => {
    if (!currentBranch?.inventory_system_id) {
      dispatch(userCurrentBranch());
    }
  }, [currentBranch?.inventory_system_id, dispatch]);

  // ⚠️ Waited on, not defaulted past -- the same reason as BankReceivedIndex:
  // the tiles flag arrives in the /user/current-branch answer, and without the
  // wait the generic screen would mount first and then be thrown away.
  if (!currentBranch?.inventory_system_id) {
    return <Loader />;
  }

  // Branch Setup -> Forms Setup: the branch's own choice, when it has made one,
  // opens before anything here would decide. An empty preference is Automatic
  // and falls through to the logic below, unchanged. Under the unified Payment
  // Entry mode this screen is no longer the branch's way in, so its saved form
  // preference is ignored and the screen keeps its own choice.
  const preferred = branchFormVariant(settings, 'payment_entry_mode') === 'unified'
    ? ''
    : branchFormVariant(settings, 'form_variant_bank_payment');
  if (preferred === 'tiles') return <TilesBankPayment />;
  if (preferred === 'general') return <BankPayment />;

  // The trade is recognised by NAME, server-side, and arrives as this flag --
  // never by business_type_id, which differs from install to install.
  if (currentBranch?.is_tiles_and_sanitary) {
    return <TilesBankPayment />;
  }

  return <BankPayment />;
};

export default BankPaymentIndex;
