import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import httpService from '../services/httpService';
import { API_BRANCH_LIST_URL } from '../services/apiRoutes';

const extractBranchTotal = (payload: any): number => {
  const total =
    payload?.data?.data?.total ??
    payload?.data?.total ??
    payload?.total ??
    0;

  return Number(total || 0);
};

/**
 * Sends a company that has already used up its plan's branch seats to
 * /no-access before the Add Branch form even opens, rather than letting them
 * fill it in and meet the server's refusal on submit.
 *
 * The exact twin of RequireUserQuota -- see that file for why there is no
 * hardcoded exempt-company list here either. The one difference: the API's
 * check (BranchController::ensureBranchQuotaAvailable) DOES consult the
 * platform exemption, via SubscriptionLimitService -- but that shows up here
 * simply as max_branches being null for an exempt company, not as a second
 * list to keep in step with the server's.
 */
const RequireBranchQuota: React.FC = () => {
  const location = useLocation();
  const currentSubscription = useSelector((state: any) => state.subscription?.current);
  const [loading, setLoading] = useState(true);
  const [branchTotal, setBranchTotal] = useState(0);

  const maxBranches = currentSubscription?.max_branches;
  const isLimited = typeof maxBranches === 'number' && maxBranches > 0;

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
      .get(`${API_BRANCH_LIST_URL}?page=1&per_page=1&search=`)
      .then((res) => {
        if (ignore) return;
        setBranchTotal(extractBranchTotal(res?.data));
      })
      .catch(() => {
        if (ignore) return;
        setBranchTotal(0);
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isLimited, maxBranches]);

  if (loading) return null;

  if (isLimited && branchTotal >= maxBranches) {
    return (
      <Navigate
        to="/no-access"
        replace
        state={{
          from: location.pathname,
          reason: 'subscription_quota',
          quota_type: 'branches',
          quota_limit: maxBranches,
          current_usage: branchTotal,
        }}
      />
    );
  }

  return <Outlet />;
};

export default RequireBranchQuota;
