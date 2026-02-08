// src/components/auth/RequirePermission.tsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { hasAllPermissions, hasAnyPermission, Permission } from "../Sidebar/permissionUtils";

type Props = {
  permissions: Permission[] | undefined | null;
  anyOf?: string[];
  allOf?: string[];
  redirectTo?: string;   // default: /no-access
  loading?: boolean;     // ✅ add
};

const RequirePermission: React.FC<Props> = ({
  permissions,
  anyOf,
  allOf,
  redirectTo = "/no-access",
  loading = false,       // ✅ add
}) => {
  const location = useLocation();

  // ✅ permissions/settings loading থাকলে redirect না করে wait
  if (loading) return null;

  const okAny = anyOf ? hasAnyPermission(permissions, anyOf) : true;
  const okAll = allOf ? hasAllPermissions(permissions, allOf) : true;

  const isAllowed = okAny && okAll;

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default RequirePermission;
