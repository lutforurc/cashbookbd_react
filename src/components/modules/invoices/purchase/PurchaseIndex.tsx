import { useDispatch, useSelector } from 'react-redux';
import TradingBusinessPurchase from './TradingBusinessPurchase';
import ConstructionBusinessPurchase from './ConstructionBusinessPurchase';
import { useEffect } from 'react';
import { userCurrentBranch } from '../../branch/branchSlice';
import Loader from '../../../../common/Loader'; 
import ElectronicsBusinessPurchase from './ElectronicsBusinessPurchase';

const PurchaseIndex = () => {
  const dispatch = useDispatch();
  const currentBranch = useSelector(
    (state: any) => state.branchList.currentBranch,
  );

  useEffect(() => {
    if (!currentBranch?.inventory_system_id) {
      dispatch(userCurrentBranch());
    }
  }, [dispatch, currentBranch?.inventory_system_id]);

  if (!currentBranch?.inventory_system_id) {
    return <Loader />;
  }

  const components: { [key: number]: JSX.Element } = {
    2: <ElectronicsBusinessPurchase />,
    3: <ConstructionBusinessPurchase />,
    4: <TradingBusinessPurchase />,
  };

  return (
    components[currentBranch?.inventory_system_id] || (
      <ConstructionBusinessPurchase />
    )
  );
};

export default PurchaseIndex;
