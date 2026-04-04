import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import HelmetTitle from '../../utils/others/HelmetTitle';
import routes from '../../services/appRoutes';
import { fetchSubscriptionPlans } from './subscriptionSlice';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

const Pricing: React.FC = () => {
  const dispatch = useDispatch<any>();
  const { plans, loadingPlans } = useSelector((state: any) => state.subscription);
  const getEnabledFeatures = (plan: any) =>
    (plan?.features || []).filter(
      (feature: any) => String(feature?.feature_value ?? '0') === '1',
    );

  useEffect(() => {
    dispatch(fetchSubscriptionPlans());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <HelmetTitle title="Subscription Pricing" />

      <div className="rounded-sm border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
        <h1 className="text-2xl font-semibold text-black dark:text-white">
          Subscription Plans
        </h1>
        <p className="mt-2 text-sm text-bodydark2">
          Manual billing mode is active. Choose a plan, send payment, and your
          subscription will be approved by admin.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan: any) => (
          <div
            key={plan.id}
            className="flex h-full flex-col rounded-sm border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/60 dark:border-strokedark dark:bg-boxdark dark:shadow-none"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {plan.name}
              </h2>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold capitalize tracking-wide text-slate-700">
                {plan.billing_interval}
              </span>
            </div>

            <div className="mt-5">
              <p className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
                {plan.currency || 'BDT'} {Number(plan.price || 0).toFixed(0)}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-bodydark2">
                Trial: {plan.trial_days || 0} days
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/20">
              <ul className="space-y-3 text-sm text-slate-700 dark:text-bodydark2">
                <li className="flex items-start justify-between gap-4">
                  <span className="font-medium text-slate-500 dark:text-slate-300">Employees</span>
                  <span className="text-right font-semibold text-slate-900 dark:text-white">
                    {plan.max_employees ?? 'Unlimited'}
                  </span>
                </li>
                <li className="flex items-start justify-between gap-4">
                  <span className="font-medium text-slate-500 dark:text-slate-300">Customers</span>
                  <span className="text-right font-semibold text-slate-900 dark:text-white">
                    {plan.max_customers ?? 'Unlimited'}
                  </span>
                </li>
                <li className="flex items-start justify-between gap-4">
                  <span className="font-medium text-slate-500 dark:text-slate-300">Products</span>
                  <span className="text-right font-semibold text-slate-900 dark:text-white">
                    {plan.max_products ?? 'Unlimited'}
                  </span>
                </li>
                <li className="flex items-start justify-between gap-4">
                  <span className="font-medium text-slate-500 dark:text-slate-300">Users</span>
                  <span className="text-right font-semibold text-slate-900 dark:text-white">
                    {plan.max_users ?? 'Unlimited'}
                  </span>
                </li>
                <li className="flex items-start justify-between gap-4">
                  <span className="font-medium text-slate-500 dark:text-slate-300">Branches</span>
                  <span className="text-right font-semibold text-slate-900 dark:text-white">
                    {plan.max_branches ?? 'Unlimited'}
                  </span>
                </li>
                <li className="flex items-start justify-between gap-4">
                  <span className="font-medium text-slate-500 dark:text-slate-300">Transactions/month</span>
                  <span className="text-right font-semibold text-slate-900 dark:text-white">
                    {plan.max_transactions_per_month ?? 'Unlimited'}
                  </span>
                </li>
              </ul>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-bodydark2">
              {plan.description || 'Manual approval based subscription plan'}
            </p>

            {getEnabledFeatures(plan).length > 0 && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-transparent">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                  Included Features
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-bodydark2">
                  {getEnabledFeatures(plan).map((feature: any) => (
                    <li key={feature.feature_key} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="font-medium text-slate-800 dark:text-white">{feature.feature_name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-auto flex flex-wrap gap-3 pt-6">
              <Link
                to={`${routes.subscription_payment_submit}?plan_id=${plan.id}`}
                className="inline-flex"
              >
                <ButtonLoading
                  label="Pay Manually"
                  className="mr-0 whitespace-nowrap rounded-sm px-5 py-2.5 text-center"
                />
              </Link>
              <Link
                to={routes.my_subscription}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-sm bg-slate-700 px-5 py-2.5 text-center text-sm font-medium text-white transition hover:bg-blue-500 focus:bg-blue-500 focus:outline-none dark:hover:bg-blue-400"
              >
                Current Status
              </Link>
            </div>
          </div>
        ))}
      </div>

      {!loadingPlans && plans.length === 0 && (
        <div className="rounded-xl border border-dashed border-stroke p-8 text-center text-sm text-bodydark2 dark:border-strokedark">
          No plans found yet. Connect the subscription API to show live pricing.
        </div>
      )}
    </div>
  );
};

export default Pricing;
