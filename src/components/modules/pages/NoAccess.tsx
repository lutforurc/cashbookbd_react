// src/pages/NoAccess.tsx
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import routes from "../../services/appRoutes";
import { formatDayMonthYear } from "../../utils/utils-functions/formatDate";

export default function NoAccess() {
  const location = useLocation();
  const from = (location.state as any)?.from;
  const quotaType = (location.state as any)?.quota_type;
  const quotaLimit = (location.state as any)?.quota_limit;
  const currentUsage = (location.state as any)?.current_usage;

  // httpService redirects here with a query string rather than router state,
  // because it navigates with window.location and has no router to hand.
  const params = new URLSearchParams(location.search);
  const reason = (location.state as any)?.reason ?? params.get("reason");

  const subscription = useSelector((s: any) => s.subscription?.current);
  const status = (location.state as any)?.status ?? subscription?.status;

  const isSubscriptionQuota = reason === "subscription_quota";
  const isSubscription = reason === "subscription";

  // ISO on the wire, day-first on screen -- the same dates the banner shows,
  // and grace_period_end_at arrives as a full timestamp that must not print one.
  const endedOn = subscription?.end_date ? formatDayMonthYear(subscription.end_date) : null;
  const graceEndedOn = subscription?.grace_period_end_at
    ? formatDayMonthYear(subscription.grace_period_end_at)
    : null;

  const title = isSubscriptionQuota
    ? "Plan Limit Reached"
    : isSubscription
      ? "Subscription Expired"
      : "Access Denied";

  const description = isSubscriptionQuota
    ? quotaType === "users"
      ? "Your subscription user limit has been reached. Upgrade the plan or reduce users to add a new one."
      : quotaType === "branches"
        ? "Your subscription branch limit has been reached. Upgrade the plan or disable a branch to add a new one."
        : "Your subscription limit has been reached for this action."
    : isSubscription
      ? `Entries and reports are closed because the subscription${
          endedOn ? ` ended on ${endedOn}` : " has expired"
        }${
          graceEndedOn ? `, and the grace period ended on ${graceEndedOn}` : ""
        }. Submit a payment to restore access — your data is untouched and comes back the moment the plan is renewed.`
      : "You do not have permission to access this page.";

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg  p-6 text-center ">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
        {from && (
          <p className="mt-1 text-xs text-gray-500">
            Requested: <span className="font-medium">{from}</span>
          </p>
        )}
        {isSubscriptionQuota && quotaLimit ? (
          <p className="mt-1 text-xs text-gray-500">
            Usage: <span className="font-medium">{currentUsage}</span> /{" "}
            <span className="font-medium">{quotaLimit}</span>
          </p>
        ) : null}
        {isSubscription && status && (
          <p className="mt-1 text-xs text-gray-500">
            Current status: <span className="font-medium">{status}</span>
          </p>
        )}

        <div className="mt-4 flex items-center justify-center gap-4">
          {/* No "Go to Dashboard" for a blocked subscription — the dashboard is
              one of the screens that is closed, so offering it sends the user
              on a round trip back to this page. */}
          {!isSubscription && (
            <Link to="/dashboard" className="text-blue-600 hover:underline">
              Go to Dashboard
            </Link>
          )}
          {(isSubscription || isSubscriptionQuota) && (
            <>
              <Link to={routes.my_subscription} className="text-blue-600 hover:underline">
                My Subscription
              </Link>
              <Link to={routes.subscription_payment_submit} className="text-blue-600 hover:underline">
                Submit Payment
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
