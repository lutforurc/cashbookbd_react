import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';

import BankPayment from './BankPayment';
import TilesBankPayment from './TilesBankPayment';
import { userCurrentBranch } from '../../branch/branchSlice';
import Loader from '../../../../common/Loader';

const BankPaymentIndex = () => {
  const dispatch = useDispatch();
  const currentBranch = useSelector((state: any) => state.branchList.currentBranch);

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

  // The trade is recognised by NAME, server-side, and arrives as this flag --
  // never by business_type_id, which differs from install to install.
  if (currentBranch?.is_tiles_and_sanitary) {
    return <TilesBankPayment />;
  }

  return <BankPayment />;
};

export default BankPaymentIndex;
