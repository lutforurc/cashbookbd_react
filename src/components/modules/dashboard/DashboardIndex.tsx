import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { userCurrentBranch } from '../branch/branchSlice';
import Loader from '../../../common/Loader';
import ConstructionDashboard from './ConstructionDashboard';
import ComputerAccessories from './ComputerAccessories';
import HotelDashboard from './HotelDashboard';

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

  /**
   * ⚠️ ASKED BEFORE THE ID MAP, and asked as `is_lodging` rather than as a
   * number.
   *
   * The map below is business_type_id, and those ids are auto-increment and
   * seeded per install: "Hotel / Motel" is 10 in one tenant's database and
   * could be 9 in another's, where 9 is Real Estate. A hotel added to that map
   * by number would open the wrong dashboard for somebody. `is_lodging` is
   * worked out on the server from the business type's NAME (PropertyType), so
   * it travels between installs — and it covers Resort too, which is the same
   * inventory sold the same way.
   *
   * It comes first because a hotel is not a fallback. Falling through to the
   * shop's dashboard is what was happening, and it showed a motel four tiles
   * that read nought forever.
   */
  if (currentBranch?.is_lodging === true) {
    return <HotelDashboard />;
  }

  const components: { [key: number]: JSX.Element } = {
    4: <ComputerAccessories />, // 4 for Computer and Accessories
    7: <ConstructionDashboard />, // 7 for Construction Business
    8: <ComputerAccessories />, // 8 for Trading Business
  };

  return components[currentBranch.business_type_id] || <ComputerAccessories />;
}

export default DashboardIndex
