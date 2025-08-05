import { useDispatch, useSelector } from 'react-redux';
import TradingBusinessSales from './TradingBusinessSales';
import GeneralBusinessSales from './GeneralBusinessSales';
import ElectronicsBusinessSales from './ElectronicsBusinessSales';
import Loader from '../../../../common/Loader';
import { userCurrentBranch } from '../../branch/branchSlice';
import { useEffect } from 'react';

const SalesIndex = () => {
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
    4: <ElectronicsBusinessSales />,
    8: <TradingBusinessSales />,
  };

  return components[currentBranch.business_type_id] || <GeneralBusinessSales />;
};

export default SalesIndex;
