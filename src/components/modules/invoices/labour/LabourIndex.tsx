import { useSelector } from 'react-redux';
import ConstructionLabourInvoice from './ConstructionLabourInvoice';

const LabourIndex = () => {
  const currentBranch = useSelector(
    (state: any) => state.branchList.currentBranch,
  );

  const components: { [key: number]: JSX.Element } = {
    8: <ConstructionLabourInvoice />,
  };

  return (
    components[currentBranch?.business_type_id] || <ConstructionLabourInvoice />
  );
};

export default LabourIndex;
