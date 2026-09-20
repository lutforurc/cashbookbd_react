import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import httpService from '../services/httpService';
import { API_USER_LIST_URL } from '../services/apiRoutes';

const extractUserTotal = (payload: any): number => {
  const total =
    payload?.data?.data?.total ??
    payload?.data?.total ??
    payload?.total ??
    0;

  return Number(total || 0);
};

/**
 * Sends a company that has already used up its plan's user seats to
 * /no-access before the Add User form even opens, rather than letting them
 * fill it in and meet the server's refusal on submit.
 *
 * ⚠️ No company is exempt here, and that is deliberate -- there used to be a
 * `SUBSCRIPTION_EXEMPT_COMPANY_IDS = new Set([1])`, mirroring the same
 * mistake RequireSubscription had: every tenant has its own database and is
 * company 1 inside it, so that exempted every customer rather than the
 * platform. The API's own check (UserController::ensureUserQuotaAvailable)
 * never consulted any exemption list to begin with, so this simply matches
 * what the server already does: a plan with no max_users (null) is
 * unlimited, and nothing here blocks it.
 */
const RequireUserQuota: React.FC = () => {
  const location = useLocation();
  const currentSubscription = useSelector((state: any) => state.subscription?.current);
  const [loading, setLoading] = useState(true);
  const [userTotal, setUserTotal] = useState(0);

  const maxUsers = currentSubscription?.max_users;
  const isLimited = typeof maxUsers === 'number' && maxUsers > 0;

  useEffect(() => {
    let ignore = false;

    if (!isLimited) {
      setLoading(false);
      return () => {
        ignore = true;
      };
    }

    setLoading(true);

    httpService
      .get(`${API_USER_LIST_URL}?page=1&per_page=1&search=`)
      .then((res) => {
        if (ignore) return;
        setUserTotal(extractUserTotal(res?.data));
      })
      .catch(() => {
        if (ignore) return;
        setUserTotal(0);
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isLimited, maxUsers]);

  if (loading) return null;

  if (isLimited && userTotal >= maxUsers) {
    return (
      <Navigate
        to="/no-access"
        replace
        state={{
          from: location.pathname,
          reason: 'subscription_quota',
          quota_type: 'users',
          quota_limit: maxUsers,
          current_usage: userTotal,
        }}
      />
    );
  }

  return <Outlet />;
};

export default RequireUserQuota;
