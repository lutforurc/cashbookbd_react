import { useDispatch, useSelector } from 'react-redux';
import TradingCashReceived from './TradingCashReceived';
import GeneralCashReceived from './GeneralCashReceived';
import { useEffect } from 'react';
import { userCurrentBranch } from '../../branch/branchSlice';
import Loader from '../../../../common/Loader';


const CashReceivedIndex = () => { 

  const dispatch = useDispatch();
  const currentBranch = useSelector((state: any) => state.branchList.currentBranch);

  useEffect(() => {
  if (!currentBranch?.business_type_id) {
    dispatch(userCurrentBranch());
  }
}, [currentBranch, dispatch]);

console.log('Loading current branch...', currentBranch);
if (!currentBranch || !currentBranch.business_type_id) {
  return <Loader />;
}

  const components: { [key: number]: JSX.Element } = {
    4: <GeneralCashReceived />,
    8: <TradingCashReceived />,
  };
 
  return components[currentBranch?.business_type_id] || <GeneralCashReceived />;
};

export default CashReceivedIndex;