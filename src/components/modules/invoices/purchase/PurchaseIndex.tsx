import { useDispatch, useSelector } from 'react-redux';
import TradingBusinessPurchase from './TradingBusinessPurchase';
import ConstructionBusinessPurchase from './ConstructionBusinessPurchase';
import { useEffect } from 'react';
import { userCurrentBranch } from '../../branch/branchSlice';
import Loader from '../../../../common/Loader'; 
import ElectronicsBusinessPurchase from './ElectronicsBusinessPurchase';
import TilesBusinessPurchase from './TilesBusinessPurchase';
import { branchInvoiceVariant } from '../../../utils/userFeatureSettings';

const PurchaseIndex = () => {
  const dispatch = useDispatch();
  const currentBranch = useSelector(
    (state: any) => state.branchList.currentBranch,
  );
  const settings = useSelector((state: any) => state.settings);

  useEffect(() => {
    if (!currentBranch?.inventory_system_id) {
      dispatch(userCurrentBranch());
    }
  }, [dispatch, currentBranch?.inventory_system_id]);

  if (!currentBranch?.inventory_system_id) {
    return <Loader />;
  }

  // Branch Setup -> Invoice Setup: the branch's own choice, when it has made
  // one, opens before anything the business type would decide. An empty
  // preference is Automatic and falls through to the logic below, unchanged.
  const preferred = branchInvoiceVariant(settings, 'invoice_variant_purchase');
  if (preferred === 'tiles') return <TilesBusinessPurchase />;
  if (preferred === 'electronics') return <ElectronicsBusinessPurchase />;
  if (preferred === 'construction') return <ConstructionBusinessPurchase />;
  if (preferred === 'trading') return <TradingBusinessPurchase />;

  // ⚠️ Before the map, and by the branch flag rather than the system id: a
  // Tiles and Sanitary branch runs inventory_system_id 4, which is Trading's
  // row, so without this check it would fall straight back to the screen it
  // uses today and never see its own four figures.
  if (currentBranch?.is_tiles_and_sanitary) {
    return <TilesBusinessPurchase />;
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
