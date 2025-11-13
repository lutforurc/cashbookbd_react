import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { userCurrentBranch } from '../branch/branchSlice';
import Loader from '../../../common/Loader';

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
  return (
    <div>
      
    </div>
  )
}

export default DashboardIndex
