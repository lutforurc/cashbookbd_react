import { useSelector } from 'react-redux';

import TradingCashPayment from './TradingCashPayment';
import GeneralCashPayment from './GeneralCashPayment';
import HeadOfficeCashPayment from './HeadOfficeCashPayment';

const CashPaymentIndex = () => {
  const currentBranch = useSelector((state: any) => state.branchList.currentBranch);
  const settings = useSelector((state: any) => state.settings);

  const branchTypesId =
    settings?.data?.branch?.branch_types_id ?? currentBranch?.branch_types_id;
  const branchTypeId =
    settings?.data?.branch?.business_type_id ?? currentBranch?.business_type_id;

  if (Number(branchTypesId) === 1) {
    return <HeadOfficeCashPayment />;
  }

  const components: { [key: number]: JSX.Element } = {
    1: <HeadOfficeCashPayment />,
    8: <TradingCashPayment />,
  };

  return components[branchTypeId] || <GeneralCashPayment />;
};

export default CashPaymentIndex;
