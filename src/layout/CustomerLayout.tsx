import React from "react";
import { useSelector } from "react-redux";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import ROUTES from "../components/services/appRoutes";
import Loader from "../common/Loader";
// import Header from "../components/Header/index";
// import Sidebar from "../components/Sidebar/index";

const CustomerLayout: React.FC = () => {
  const location = useLocation();

  // Assuming your auth state in redux has isLoggedIn flag for customer
  const { isLoggedIn, isLoading } = useSelector((state: any) => state.customerAuth);

  // You can add loading spinner or placeholder during isLoading if you want
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">
      <Loader />
    </div>;
  }

  if (!isLoggedIn) {
    // Redirect to login page if not authenticated
    return <Navigate to={ROUTES.customerLogin} replace state={{ from: location }} />;
  }

  return (
    <div className="dark:bg-boxdark-2 dark:text-bodydark">
      {/* Page Wrapper */}
      <div className="flex h-screen overflow-hidden">
        {/* Uncomment to enable Sidebar and Header later */}
        {/* <Sidebar /> */}
        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          {/* <Header /> */}
          <main>
            <div className="mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default CustomerLayout;
