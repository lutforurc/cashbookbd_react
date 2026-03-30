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
