import { useDispatch, useSelector } from 'react-redux';
import TradingBusinessSales from './TradingBusinessSales';
import GeneralBusinessSales from './GeneralBusinessSales';
import ElectronicsBusinessSales from './ElectronicsBusinessSales';
import Loader from '../../../../common/Loader';
import { userCurrentBranch } from '../../branch/branchSlice';
import { useEffect } from 'react';

const SalesIndex = () => {
  const dispatch = useDispatch();
  const currentBranch = useSelector((state: any) => state.branchList.currentBranch);

  useEffect(() => {
    if (!currentBranch?.inventory_system_id) {
      dispatch(userCurrentBranch());
    }
  }, [dispatch, currentBranch?.inventory_system_id]);

  if (!currentBranch?.inventory_system_id) {
    return <Loader />;
  }

  const components: { [key: number]: JSX.Element } = {
    2: <ElectronicsBusinessSales />,
    4: <TradingBusinessSales />,
  };

  return components[currentBranch.inventory_system_id] || <GeneralBusinessSales />;
};

export default SalesIndex;
