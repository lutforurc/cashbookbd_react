import { useDispatch, useSelector } from 'react-redux';
import TradingBusinessSales from './TradingBusinessSales';
import GeneralBusinessSales from './GeneralBusinessSales';
import ElectronicsBusinessSales from './ElectronicsBusinessSales';
import CompanySchemeSales from './CompanySchemeSales';
import Loader from '../../../../common/Loader';
import { userCurrentBranch } from '../../branch/branchSlice';
import { isBranchSettingOn } from '../../../utils/userFeatureSettings';
import { useEffect } from 'react';

const SalesIndex = () => {
  const dispatch = useDispatch();
  const currentBranch = useSelector((state: any) => state.branchList.currentBranch);
  const settings = useSelector((state: any) => state.settings);

  useEffect(() => {
    if (!currentBranch?.inventory_system_id) {
      dispatch(userCurrentBranch());
    }
  }, [dispatch, currentBranch?.inventory_system_id]);

  if (!currentBranch?.inventory_system_id) {
    return <Loader />;
  }

  const components: { [key: number]: JSX.Element } = {
    // An electronics branch that sells on a brand's scheme (Branch Setup ->
    // Company Scheme) gets the scheme sale form instead.
    2: isBranchSettingOn(settings, 'company_scheme') ? <CompanySchemeSales /> : <ElectronicsBusinessSales />,
    4: <TradingBusinessSales />,
  };

  return components[currentBranch.inventory_system_id] || <GeneralBusinessSales />;
};

export default SalesIndex;
