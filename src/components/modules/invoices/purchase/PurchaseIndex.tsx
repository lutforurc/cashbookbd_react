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
    if (!currentBranch?.business_type_id) {
      dispatch(userCurrentBranch());
    }
  }, [dispatch, currentBranch?.business_type_id]);

  if (!currentBranch?.business_type_id) {
    return <Loader />;
  }

  const components: { [key: number]: JSX.Element } = {
    4: <ElectronicsBusinessPurchase />,
    7: <ConstructionBusinessPurchase />,
    8: <TradingBusinessPurchase />,
  };

  return (
    components[currentBranch?.business_type_id] || (
      <ConstructionBusinessPurchase />
    )
  );
};

export default PurchaseIndex;
