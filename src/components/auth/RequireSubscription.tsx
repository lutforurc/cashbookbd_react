import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { SubscriptionAccessState } from '../modules/subscription/subscriptionSlice';

type Props = {
  loading?: boolean;
  initialized?: boolean;
  error?: string | null;
  bypass?: boolean;
  current?: {
    status?: string;
    access_status?: string;
    access_state?: SubscriptionAccessState;
  } | null;
  allowedPaths?: string[];
};

/**
 * Keeps a blocked company out of the screens it has stopped paying for.
 *
 * ⚠️ This is NOT the lock -- SubscriptionActive on the API is. It used to be,
 * and that was the whole problem: the rule lived only in the browser, so the
 * Android app and anything else holding a token carried on working after a
 * subscription lapsed. This is now the polite half, redirecting to a screen
 * that explains rather than letting every call on the page fail with a 403.
 *
 * ⚠️ And it no longer works the dates out for itself. It reads access_state,
 * which SubscriptionGate decided, because a second implementation of one rule
 * is a second answer: the old copy treated any past end_date as shut, which
 * would now slam the door on a company the server is still letting in on its
 * grace period.
 */
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

  // An older API that has not been told about access_state yet: fall back to
  // the stored column, where 'blocked' means the same thing and 'limited'
  // (grace) is deliberately not in the list.
  const state: SubscriptionAccessState =
    current.access_state ?? (current.access_status === 'blocked' ? 'blocked' : 'full');

  if (state !== 'blocked') return <Outlet />;

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
