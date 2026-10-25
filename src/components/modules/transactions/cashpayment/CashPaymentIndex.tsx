import { useDispatch, useSelector } from 'react-redux';
import { useEffect } from 'react';

import TradingCashPayment from './TradingCashPayment';
import GeneralCashPayment from './GeneralCashPayment';
import HeadOfficeCashPayment from './HeadOfficeCashPayment';
import TilesCashPayment from './TilesCashPayment';
import ProjectExpense from '../../real-estate/project-expense/ProjectExpense';
import { userCurrentBranch } from '../../branch/branchSlice';
import Loader from '../../../../common/Loader';

const CashPaymentIndex = () => {
  const dispatch = useDispatch();
  const currentBranch = useSelector((state: any) => state.branchList.currentBranch);

  useEffect(() => {
    if (!currentBranch?.inventory_system_id) {
      dispatch(userCurrentBranch());
    }
  }, [currentBranch?.inventory_system_id, dispatch]);

  if (!currentBranch?.inventory_system_id) {
    return <Loader />;
  }
  
  console.log('Current Branch:', currentBranch);

  // Head office is a branch role, not an inventory system, so it keeps its own
  // business_type_id check and wins over the inventory-system mapping below.
  if (Number(currentBranch?.branch_types_id) === 1) {
    return <HeadOfficeCashPayment />;
  }

  if (Number(currentBranch?.business_type_id) === 9) {
    return <ProjectExpense />;
  }

  // The trade is recognised by NAME, server-side, and arrives as this flag --
  // never by business_type_id, which differs from install to install. Asked
  // before the inventory-system map because a tiles branch runs the trading
  // inventory system and would otherwise land on the trading screen. Same
  // order as CashReceivedIndex.
  if (currentBranch?.is_tiles_and_sanitary) {
    return <TilesCashPayment />;
  }

  // Every other branch picks its screen from its inventory system (see the
  // inventory_system table: 4 = trading). Electronics (2) and construction (3)
  // have no dedicated screen yet, so they fall through to General.
  const components: { [key: number]: JSX.Element } = {
    4: <TradingCashPayment />,
  };

  return (
    components[Number(currentBranch?.inventory_system_id)] || <GeneralCashPayment />
  );
};

export default CashPaymentIndex;
