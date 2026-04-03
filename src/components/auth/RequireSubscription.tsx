import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

type Props = {
  loading?: boolean;
  initialized?: boolean;
  error?: string | null;
  bypass?: boolean;
  current?: {
    status?: string;
    access_status?: string;
  } | null;
  allowedPaths?: string[];
};

const restrictedStatuses = new Set(['expired', 'suspended', 'cancelled']);
const restrictedAccessStatuses = new Set(['billing_only', 'blocked']);

const isDateExpired = (value?: string | null): boolean => {
  if (!value) return false;

  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return expiry < today;
};

const RequireSubscription: React.FC<Props> = ({
  loading = false,
  initialized = false,
  error = null,
  bypass = false,
  current,
  allowedPaths = [],
}) => {
  const location = useLocation();
  const pathname = location.pathname;

  const isAllowedPath = allowedPaths.some((path) => pathname === path);

  if (bypass) return <Outlet />;

  if (isAllowedPath) return <Outlet />;

  if (loading && !initialized) return null;

  if (!initialized) return <Outlet />;

  if (error || !current) {
    return (
      <Navigate
        to="/no-access"
        replace
        state={{
          from: pathname,
          reason: 'subscription',
          status: current?.status || 'unavailable',
          access_status: current?.access_status || 'blocked',
        }}
      />
    );
  }

  const hasRestrictedStatusByState =
    (current.status && restrictedStatuses.has(current.status)) ||
    (current.access_status && restrictedAccessStatuses.has(current.access_status));

  const hasRestrictedStatusByDate =
    isDateExpired((current as any)?.end_date) ||
    (current?.status === 'trialing' && isDateExpired((current as any)?.trial_end_at));

  if (!hasRestrictedStatusByState && !hasRestrictedStatusByDate) return <Outlet />;

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
