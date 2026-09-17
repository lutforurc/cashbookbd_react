import React from 'react';
import { Link } from 'react-router-dom';
import routes from '../../services/appRoutes';
import type { CurrentSubscription, SubscriptionAccessState } from './subscriptionSlice';

interface SubscriptionStatusBannerProps {
  subscription: CurrentSubscription | null;
}

const GRACE_TONE =
  'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-100';

const BLOCKED_TONE =
  'border-red-300 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-900/20 dark:text-red-100';

/**
 * The line across the top of every screen once a subscription has lapsed.
 *
 * It says one of two things, and the difference between them is the whole
 * feature: inside the grace window it counts the days down, and after it it
 * reports that access has closed. Both come from the server's own verdict --
 * see RequireSubscription for why the browser no longer works this out from
 * the dates itself.
 *
 * ⚠️ It renders on `limited` too, which looks like a warning about nothing
 * until you remember that 'limited' IS grace in the stored column.
 */
const SubscriptionStatusBanner: React.FC<SubscriptionStatusBannerProps> = ({
  subscription,
}) => {
  if (!subscription || !subscription.status) return null;

  // Falls back to the stored column for an API that has not been redeployed.
  const state: SubscriptionAccessState =
    subscription.access_state ??
    (subscription.access_status === 'blocked'
      ? 'blocked'
      : subscription.access_status === 'limited'
        ? 'grace'
        : 'full');

  if (state === 'full') return null;

  const planName = subscription.plan_name || 'Current plan';
  const daysLeft = subscription.grace_days_left;
  const isGrace = state === 'grace';

  const headline = isGrace
    ? `${planName} - Subscription expired`
    : `${planName} - Access closed`;

  const detail = isGrace
    ? daysLeft === 0
      ? `Your subscription ended${subscription.end_date ? ` on ${subscription.end_date}` : ''}. Access closes at the end of today — renew now to keep working.`
      : daysLeft != null
        ? `Your subscription ended${subscription.end_date ? ` on ${subscription.end_date}` : ''}. Access closes in ${daysLeft} day${daysLeft === 1 ? '' : 's'} unless it is renewed.`
        : `Your subscription has expired. Renew to keep your access.`
    : `Entries and reports are closed${subscription.end_date ? ` — the plan ended on ${subscription.end_date}` : ''}. Renew to restore access.`;

  return (
    <div className={`mb-4 rounded border px-4 py-3 ${isGrace ? GRACE_TONE : BLOCKED_TONE}`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold capitalize">{headline}</p>
          <p className="text-xs opacity-90">{detail}</p>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <Link to={routes.my_subscription} className="hover:underline">
            My Subscription
          </Link>
          <Link to={routes.subscription_payment_submit} className="hover:underline">
            Submit Payment
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionStatusBanner;
