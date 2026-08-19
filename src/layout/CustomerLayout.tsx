import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import ROUTES from "../components/services/appRoutes";
import { customerCheck } from "../features/customerAuthReducer";
import Loader from "../common/Loader";
// import Header from "../components/Header/index";
// import Sidebar from "../components/Sidebar/index";


const CustomerLayout: React.FC = () => {
  const location = useLocation();
  const dispatch = useDispatch();

  // Assuming your auth state in redux has isLoggedIn flag for customer
  const { isLoggedIn, isLoading, authChecked, mustChange } = useSelector((state: any) => state.customerAuth);

  // Restore the session from the stored token on first load / reload.
  useEffect(() => {
    if (!authChecked) {
      dispatch(customerCheck());
    }
  }, [authChecked, dispatch]);

  // Wait for the initial session check (and any in-flight request) to resolve
  // before deciding whether to render the portal or redirect to login.
  if (isLoading || !authChecked) {
    return <div className="flex justify-center items-center h-screen">
      <Loader />
    </div>;
  }

  if (!isLoggedIn) {
    // Redirect to login page if not authenticated
    return <Navigate to={ROUTES.customerLogin} replace state={{ from: location }} />;
  }

  // Still on the default (mobile) password → force a change before anything else.
  if (mustChange && location.pathname !== ROUTES.customerChangePassword) {
    return <Navigate to={ROUTES.customerChangePassword} replace />;
  }

  return (
    <div className="dark:bg-boxdark-2 dark:text-[rgb(var(--c-text-muted))]">
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
