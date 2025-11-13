import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { userCurrentBranch } from '../branch/branchSlice';
import Loader from '../../../common/Loader'; 
import ConstructionDashboard from './ConstructionDashboard'; 
import ComputerAccessories from './ComputerAccessories';

function DashboardIndex() {
      const dispatch = useDispatch();
  const currentBranch = useSelector((state: any) => state.branchList.currentBranch);

  useEffect(() => {
    if (!currentBranch?.business_type_id) {
      dispatch(userCurrentBranch());
    }
  }, [dispatch, currentBranch?.business_type_id]);

  if (!currentBranch?.business_type_id) {
    return <Loader />;
  }
  const components: { [key: number]: JSX.Element } = {
    4: <ComputerAccessories />, // 4 for Computer and Accessories
    7: <ConstructionDashboard />, // 7 for Construction Business
    8: <ConstructionDashboard />, // 8 for Trading Business
  };

  return components[currentBranch.business_type_id] || <ConstructionDashboard />;
}

export default DashboardIndex
