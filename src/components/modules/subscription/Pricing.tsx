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

  useEffect(() => {
    dispatch(fetchSubscriptionPlans());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <HelmetTitle title="Subscription Pricing" />

      <div className="rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
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
            className="rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-black dark:text-white">
                {plan.name}
              </h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {plan.billing_interval}
              </span>
            </div>

            <div className="mt-5">
              <p className="text-3xl font-bold text-black dark:text-white">
                {plan.currency || 'BDT'} {Number(plan.price || 0).toFixed(0)}
              </p>
              <p className="mt-1 text-sm text-bodydark2">
                Trial: {plan.trial_days || 0} days
              </p>
            </div>

            <ul className="mt-5 space-y-2 text-sm text-bodydark2">
              <li>Users: {plan.max_users ?? 'Unlimited'}</li>
              <li>Branches: {plan.max_branches ?? 'Unlimited'}</li>
              <li>
                Transactions/month: {plan.max_transactions_per_month ?? 'Unlimited'}
              </li>
              <li>{plan.description || 'Manual approval based subscription plan'}</li>
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={`${routes.subscription_payment_submit}?plan_id=${plan.id}`}
                className="inline-flex"
              >
                <ButtonLoading
                  label="Pay Manually"
                  className="whitespace-nowrap text-center mr-0 py-2"
                />
              </Link>
              <Link
                to={routes.my_subscription}
                className="text-white bg-gray-700 hover:bg-blue-400 focus:outline-none font-medium text-sm px-5 text-center dark:hover:bg-blue-400 focus:bg-blue-400 inline-flex justify-center items-center whitespace-nowrap py-2"
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
