import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { userCurrentBranch } from '../branch/branchSlice';
import Loader from '../../../common/Loader';
import ConstructionDashboard from './ConstructionDashboard';
import ComputerAccessories from './ComputerAccessories';
import HotelDashboard from './HotelDashboard';
import RealEstateDashboard from './RealEstateDashboard';
import TradingDashboard from './TradingDashboard';

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

  /**
   * ⚠️ AND THE SAME ARGUMENT FOR A DEVELOPER, asked the same way and placed in
   * the same spot — before the map below, never in it.
   *
   * "Real Estate" is 9 here and the map has no 9 entry, so a branch selling
   * flats has been falling through to the shop's dashboard: Today Sales, Today
   * Purchase, New Customers, Low Stock. Every one of those reads nought on a
   * business that sells a flat once and then collects for eight years. Adding
   * `9:` to the map would work on this install and open the wrong trade's page
   * on the next one, where 9 is something else. The server answers from the
   * business type's NAME instead, and the answer travels.
   */
  if (currentBranch?.is_real_estate === true) {
    return <RealEstateDashboard />;
  }

  /**
   * ⚠️ AND THE THIRD, FOR THE TRADE THAT BUYS AND SELLS. Same argument, same
   * place — before the map, not in it.
   *
   * A trading branch was landing on the shop's dashboard, and `8:` below still
   * points there. That entry is left alone rather than repointed, because it is
   * a number and this install's 8 is not the next install's 8: on a database
   * where the trade's row happens to be 8 this flag is what opens the page, and
   * on one where it is 3 only the flag can. The map entry is now unreachable on
   * a trading branch and harmless on any other.
   *
   * ⚠️ It is asked LAST of the three, which matters only if a tenant's business
   * type row could answer two of them at once. It cannot — the three words are
   * `lodging`, `realestate` and `trade`, and a name holding two of those is not
   * one this product seeds — so the order is a reading order rather than a
   * precedence, and any of them may be moved.
   */
  if (currentBranch?.is_trading === true) {
    return <TradingDashboard />;
  }

  const components: { [key: number]: JSX.Element } = {
    4: <ComputerAccessories />, // 4 for Computer and Accessories
    7: <ConstructionDashboard />, // 7 for Construction Business
    8: <ComputerAccessories />, // 8 for Trading Business — see is_trading above
  };

  return components[currentBranch.business_type_id] || <ComputerAccessories />;
}

export default DashboardIndex
