import { useSelector } from 'react-redux';
 
import TradingCashPayment from './TradingCashPayment';
import GeneralCashPayment from './GeneralCashPayment';


const CashPaymentIndex = () => {
  const currentBranch = useSelector((state: any) => state.branchList.currentBranch);

  const components: { [key: number]: JSX.Element } = {
    8: <TradingCashPayment />,
  };
 
  return components[currentBranch?.business_type_id] || <GeneralCashPayment />;
};

export default CashPaymentIndex;
