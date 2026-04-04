import React, { useEffect } from 'react';
import { FiEdit, FiPlus } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import HelmetTitle from '../../utils/others/HelmetTitle';
import routes from '../../services/appRoutes';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { clearSubscriptionFeedback, fetchAdminPlans } from './subscriptionSlice';

const SubscriptionPlanList: React.FC = () => {
  const dispatch = useDispatch<any>();
  const { adminPlans, loadingAdminPlans, error } = useSelector((state: any) => state.subscription);

  useEffect(() => {
    dispatch(fetchAdminPlans());

    return () => {
      dispatch(clearSubscriptionFeedback());
    };
  }, [dispatch]);

  return (
    <div className="space-y-4">
      <HelmetTitle title="Subscription Plan List" />

      <div className="flex flex-col gap-3 rounded border border-gray-400 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Subscription Plans</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pricing plan, quota, trial days, and activation state এখান থেকে manage করতে পারবেন।
          </p>
        </div>

        <Link to={routes.subscription_plan_entry} className="inline-flex">
          <ButtonLoading
            label="New Plan"
            className="h-10 px-4"
            icon={<FiPlus className="text-lg" />}
          />
        </Link>
      </div>

      {error && (
        <div className="rounded border border-red bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded border border-gray-400 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100 dark:bg-gray-900/40">
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Billing</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Limits</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {adminPlans.map((plan: any) => (
                <tr
                  key={plan.id}
                  className="border-t border-gray-200 text-sm text-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold">{plan.name}</div>
                    <div className="text-xs text-gray-500">{plan.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{plan.billing_interval || '-'}</div>
                    <div className="text-xs text-gray-500">Trial {plan.trial_days || 0} days</div>
                  </td>
                  <td className="px-4 py-3">
                    {(plan.currency || 'BDT') + ' '}
                    {Number(plan.price || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs leading-5 text-gray-600 dark:text-gray-300">
                    <div>Employees: {plan.max_employees ?? 'Unlimited'}</div>
                    <div>Customers: {plan.max_customers ?? 'Unlimited'}</div>
                    <div>Users: {plan.max_users ?? 'Unlimited'}</div>
                    <div>Branches: {plan.max_branches ?? 'Unlimited'}</div>
                    <div>Txn/Month: {plan.max_transactions_per_month ?? 'Unlimited'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        plan.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}
                    >
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <div className="mt-2 text-xs text-gray-500">Sort: {plan.sort_order ?? 0}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={routes.subscription_plan_edit.replace(':id', String(plan.id))}
                      className="inline-flex items-center gap-2 rounded bg-gray-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-400"
                    >
                      <FiEdit />
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}

              {!loadingAdminPlans && adminPlans.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                    No subscription plan found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlanList;
