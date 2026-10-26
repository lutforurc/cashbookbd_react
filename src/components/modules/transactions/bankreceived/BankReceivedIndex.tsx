import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';

import BankReceived from './BankReceived';
import TilesBankReceived from './TilesBankReceived';
import { userCurrentBranch } from '../../branch/branchSlice';
import Loader from '../../../../common/Loader';
import { branchFormVariant } from '../../../utils/userFeatureSettings';

const BankReceivedIndex = () => {
  const dispatch = useDispatch();
  const currentBranch = useSelector((state: any) => state.branchList.currentBranch);
  const settings = useSelector((state: any) => state.settings);

  useEffect(() => {
    if (!currentBranch?.inventory_system_id) {
      dispatch(userCurrentBranch());
    }
  }, [currentBranch?.inventory_system_id, dispatch]);

  // ⚠️ Waited on, not defaulted past. currentBranch starts as {} and the tiles
  // flag arrives in the same /user/current-branch answer -- without this the
  // generic screen would mount first, fire getCoal3ByCoal4(2), and then be
  // thrown away. CashReceivedIndex waits the same way.
  if (!currentBranch?.inventory_system_id) {
    return <Loader />;
  }

  // Branch Setup -> Forms Setup: the branch's own choice, when it has made one,
  // opens before anything here would decide. An empty preference is Automatic
  // and falls through to the logic below, unchanged. Under the unified Received
  // Entry mode this screen is no longer the branch's way in, so its saved form
  // preference is ignored and the screen keeps its own choice.
  const preferred = branchFormVariant(settings, 'received_entry_mode') === 'unified'
    ? ''
    : branchFormVariant(settings, 'form_variant_bank_received');
  if (preferred === 'tiles') return <TilesBankReceived />;
  if (preferred === 'general') return <BankReceived />;

  // The trade is recognised by NAME, server-side, and arrives as this flag --
  // never by business_type_id, which differs from install to install. There is
  // no head-office bank screen and no inventory-system map here: every other
  // branch keeps the one generic screen.
  if (currentBranch?.is_tiles_and_sanitary) {
    return <TilesBankReceived />;
  }

  return <BankReceived />;
};

export default BankReceivedIndex;
