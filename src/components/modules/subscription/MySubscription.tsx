import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import HelmetTitle from '../../utils/others/HelmetTitle';
import routes from '../../services/appRoutes';
import { fetchCurrentSubscription } from './subscriptionSlice';

const MySubscription: React.FC = () => {
  const dispatch = useDispatch<any>();
  const { current, loadingCurrent } = useSelector((state: any) => state.subscription);

  useEffect(() => {
    dispatch(fetchCurrentSubscription());
  }, [dispatch]);

  const hasRenderableSubscription =
    !!current && typeof current === 'object' && !!current.plan_id && !!current.status;

  const statusLabel = String(current?.status || '-').replace('_', ' ');
  const statusClassName =
    current?.status === 'trialing'
      ? 'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-200'
      : 'border border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100';

  return (
    <div className="space-y-6">
      <HelmetTitle title="My Subscription" />

      <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
        <h1 className="text-2xl font-semibold text-black dark:text-white">
          My Subscription
        </h1>
        <p className="mt-2 text-sm text-bodydark2">
          Review your active plan, expiry date, and billing status from here.
        </p>
      </div>

      {hasRenderableSubscription ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-black dark:text-white">
                  {current.plan_name || 'Subscription Plan'}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`rounded px-3 py-1 text-xs font-medium capitalize ${statusClassName}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>
              <span className="rounded border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100">
                Access: {current.access_status || '-'}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Start Date
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-white">
                  {current.start_date || '-'}
                </p>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  End Date
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-white">
                  {current.end_date || '-'}
                </p>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Trial Ends
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-white">
                  {current.trial_end_at || '-'}
                </p>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Next Billing Date
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-white">
                  {current.next_billing_date || '-'}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium text-black dark:text-white">
                Enabled Features
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(current.features || []).map((feature) => (
                  <span
                    key={feature.feature_key}
                    className="rounded border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100"
                  >
                    {feature.feature_name}
                  </span>
                ))}
                {(current.features || []).length === 0 && (
                  <span className="text-sm text-bodydark2">
                    Feature list will appear when the backend sends plan features.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
            <h3 className="text-lg font-semibold text-black dark:text-white">
              Need Renewal?
            </h3>
            <p className="mt-2 text-sm text-bodydark2">
              Submit your bKash, Nagad, bank, or cash payment and wait for admin
              approval.
            </p>
            <div className="mt-5 space-y-3">
              <Link
                to={routes.subscription_payment_submit}
                className="block rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-white"
              >
                Submit Payment
              </Link>
              <Link
                to={routes.subscription_billing_history}
                className="block rounded-lg border border-stroke px-4 py-2 text-center text-sm font-medium text-black dark:border-strokedark dark:text-white"
              >
                Billing History
              </Link>
              <Link
                to={routes.subscription_pricing}
                className="block rounded-lg border border-stroke px-4 py-2 text-center text-sm font-medium text-black dark:border-strokedark dark:text-white"
              >
                Compare Plans
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-xl border border-dashed border-stroke p-8 text-center text-sm text-bodydark2 dark:border-strokedark lg:col-span-2">
            {loadingCurrent
              ? 'Loading subscription details...'
              : 'No subscription data found yet. You can still choose a plan and submit a manual payment request.'}
          </div>

          <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
            <h3 className="text-lg font-semibold text-black dark:text-white">
              Manual Subscription
            </h3>
            <p className="mt-2 text-sm text-bodydark2">
              Choose a plan and submit your payment for admin approval.
            </p>
            <div className="mt-5 space-y-3">
              <Link
                to={routes.subscription_pricing}
                className="block rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-white"
              >
                View Plans
              </Link>
              <Link
                to={routes.subscription_payment_submit}
                className="block rounded-lg border border-stroke px-4 py-2 text-center text-sm font-medium text-black dark:border-strokedark dark:text-white"
              >
                Submit Payment
              </Link>
              <Link
                to={routes.subscription_billing_history}
                className="block rounded-lg border border-stroke px-4 py-2 text-center text-sm font-medium text-black dark:border-strokedark dark:text-white"
              >
                Billing History
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MySubscription;
