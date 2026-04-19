import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { hasAllPermissions, hasAnyPermission, Permission } from "../Sidebar/permissionUtils";

type Props = {
  permissions: Permission[] | undefined | null;
  anyOf?: string[];
  allOf?: string[];
  redirectTo?: string;
  loading?: boolean;
};

const RequirePermission: React.FC<Props> = ({
  permissions,
  anyOf,
  allOf,
  redirectTo = "/no-access",
  loading = false,
}) => {
  const location = useLocation();
  const hasResolvedPermissions = Array.isArray(permissions) && permissions.length > 0;

  // Keep the current route visible during background settings refreshes.
  if (loading && !hasResolvedPermissions) return null;

  const okAny = anyOf ? hasAnyPermission(permissions, anyOf) : true;
  const okAll = allOf ? hasAllPermissions(permissions, allOf) : true;
  const isAllowed = okAny && okAll;

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default RequirePermission;
