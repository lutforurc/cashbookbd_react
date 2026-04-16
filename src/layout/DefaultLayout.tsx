import React, { useEffect, useState } from 'react';
import Header from '../components/Header/index';
import Sidebar from '../components/Sidebar/index';
import TopbarMenu from '../components/TopbarMenu';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import ROUTES from '../components/services/appRoutes';
import { fetchCurrentSubscription } from '../components/modules/subscription/subscriptionSlice';
import SubscriptionStatusBanner from '../components/modules/subscription/SubscriptionStatusBanner';

interface DefaultLayoutProps {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: any;
}

const DefaultLayout: React.FC<DefaultLayoutProps> = ({ isLoggedIn, isLoading, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const dispatch = useDispatch<any>();
  const subscription = useSelector((state: any) => state.subscription);
  const settings = useSelector((state: any) => state.settings);
  const useSidebarMenu = String(settings?.data?.branch?.sidebar_menu ?? '') === '1';

  useEffect(() => {
    if (!isLoggedIn || isLoading || !user) return;
    if (subscription.initialized) return;
    if (subscription.loadingCurrent) return;
    dispatch(fetchCurrentSubscription());
  }, [dispatch, isLoading, isLoggedIn, subscription.initialized, subscription.loadingCurrent, user]);

  return isLoggedIn ? (
    <div className="dark:bg-boxdark-2 dark:text-bodydark">
      {/* <!-- ===== Page Wrapper Start ===== --> */}
      <div className="flex h-screen overflow-hidden">
        {/* <!-- ===== Sidebar Start ===== --> */}
        {useSidebarMenu ? (
          <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        ) : null}
        {/* <!-- ===== Sidebar End ===== --> */}

        {/* <!-- ===== Content Area Start ===== --> */}
        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          {/* <!-- ===== Header Start ===== --> */}
          <Header
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            showSidebarToggle={useSidebarMenu}
          />
          {/* <!-- ===== Header End ===== --> */}

          {!useSidebarMenu ? <TopbarMenu /> : null}

          {/* <!-- ===== Main Content Start ===== --> */}
          <main>
            {/* <div className="mx-auto max-w-screen-2xl p-4 2xl:p-6">  */}
            <div className="mx-auto max-w-screen-max-w-4xl p-4 2xl:p-6">
              <SubscriptionStatusBanner subscription={subscription.current} />
              <Outlet />
            </div>
          </main>
          {/* <!-- ===== Main Content End ===== --> */}
        </div>
        {/* <!-- ===== Content Area End ===== --> */}
      </div>
      {/* <!-- ===== Page Wrapper End ===== --> */}
    </div>
  ) : (
    <Navigate to={ROUTES.login} replace state={{ from: location }} />
  );
};

export default DefaultLayout;
