import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

type Props = {
  loading?: boolean;
  initialized?: boolean;
  current?: {
    status?: string;
    access_status?: string;
  } | null;
  allowedPaths?: string[];
};

const restrictedStatuses = new Set(['expired', 'suspended', 'cancelled']);
const restrictedAccessStatuses = new Set(['billing_only', 'blocked']);

const RequireSubscription: React.FC<Props> = ({
  loading = false,
  initialized = false,
  current,
  allowedPaths = [],
}) => {
  const location = useLocation();
  const pathname = location.pathname;

  const isAllowedPath = allowedPaths.some((path) => pathname === path);

  if (isAllowedPath) return <Outlet />;

  if (loading && !initialized) return null;

  if (!initialized || !current) return <Outlet />;

  const hasRestrictedStatus =
    (current.status && restrictedStatuses.has(current.status)) ||
    (current.access_status && restrictedAccessStatuses.has(current.access_status));

  if (!hasRestrictedStatus) return <Outlet />;

  return (
    <Navigate
      to="/no-access"
      replace
      state={{
        from: pathname,
        reason: 'subscription',
        status: current.status,
        access_status: current.access_status,
      }}
    />
  );
};

export default RequireSubscription;
