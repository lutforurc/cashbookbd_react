import { useDispatch, useSelector } from 'react-redux';
import TradingBusinessSales from './TradingBusinessSales';
import GeneralBusinessSales from './GeneralBusinessSales';
import ElectronicsBusinessSales from './ElectronicsBusinessSales';
import TilesBusinessSales from './TilesBusinessSales';
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

  // ⚠️ Before the map, and by the branch flag rather than the system id: a
  // Tiles and Sanitary branch runs inventory_system_id 4, which is Trading's
  // row, so without this check it would fall straight back to the screen it
  // uses today and never see its own four figures.
  if (currentBranch?.is_tiles_and_sanitary) return <TilesBusinessSales />;

  const components: { [key: number]: JSX.Element } = {
    // An electronics branch that sells on a brand's scheme (Branch Setup ->
    // Company Scheme) gets the scheme sale form instead.
    2: isBranchSettingOn(settings, 'company_scheme') ? <CompanySchemeSales /> : <ElectronicsBusinessSales />,
    4: <TradingBusinessSales />,
  };

  return components[currentBranch.inventory_system_id] || <GeneralBusinessSales />;
};

export default SalesIndex;
