import React from 'react';
import { Link } from 'react-router-dom';
import routes from '../../services/appRoutes';
import type { CurrentSubscription } from './subscriptionSlice';

interface SubscriptionStatusBannerProps {
  subscription: CurrentSubscription | null;
}

const statusToneMap: Record<string, string> = {
  active: 'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
  trialing:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-200',
  pending_payment:
    'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
  expired:
    'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
  suspended:
    'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
  cancelled:
    'border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
};

const isDateExpired = (value?: string | null): boolean => {
  if (!value) return false;

  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return expiry < today;
};

const SubscriptionStatusBanner: React.FC<SubscriptionStatusBannerProps> = ({
  subscription,
}) => {
  if (!subscription) return null;
  if (!subscription.status) return null;

  const isExpired =
    subscription.status === 'expired' ||
    isDateExpired(subscription.end_date) ||
    (subscription.status === 'trialing' && isDateExpired((subscription as any).trial_end_at));

  if (!isExpired) return null;

  const tone = statusToneMap.expired || statusToneMap.active;
  const planName = subscription.plan_name || 'Current plan';

  return (
    <div className={`mb-4 rounded border px-4 py-3 ${tone}`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold capitalize">
            {planName} - Subscription expired
          </p>
          <p className="text-xs opacity-90">
            {subscription.end_date
              ? `Your access expired on ${subscription.end_date}. Renew to restore menu access.`
              : 'Your subscription has expired. Renew to restore menu access.'}
          </p>
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
