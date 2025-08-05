import React, { useState, ReactNode } from 'react';
import Header from '../components/Header/index';
import Sidebar from '../components/Sidebar/index';
import { useSelector } from 'react-redux';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import ROUTES from '../components/services/appRoutes';

interface DefaultLayoutProps {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: any; // You can specify the type of user more precisely, if known
}

const DefaultLayout: React.FC<DefaultLayoutProps> = ({ isLoggedIn, isLoading, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return isLoggedIn ? (
    <div className="dark:bg-boxdark-2 dark:text-bodydark">
      {/* <!-- ===== Page Wrapper Start ===== --> */}
      <div className="flex h-screen overflow-hidden">
        {/* <!-- ===== Sidebar Start ===== --> */}
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        {/* <!-- ===== Sidebar End ===== --> */}

        {/* <!-- ===== Content Area Start ===== --> */}
        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          {/* <!-- ===== Header Start ===== --> */}
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          {/* <!-- ===== Header End ===== --> */}

          {/* <!-- ===== Main Content Start ===== --> */}
          <main>
            {/* <div className="mx-auto max-w-screen-2xl p-4 2xl:p-6">  */}
            <div className="mx-auto max-w-screen-max-w-4xl p-4 2xl:p-6"> 
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
