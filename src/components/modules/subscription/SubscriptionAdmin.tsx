import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { FiCheck, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import HelmetTitle from '../../utils/others/HelmetTitle';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import routes from '../../services/appRoutes';
import {
  approveSubscriptionPayment,
  assignSubscriptionToCompany,
  clearSubscriptionFeedback,
  fetchAdminSubscriptionCompanies,
  fetchAdminSubscriptionPayments,
  fetchAdminTenantSubscriptions,
  fetchSubscriptionAdminOverview,
  fetchSubscriptionPlans,
  rejectSubscriptionPayment,
} from './subscriptionSlice';
import { chartDate, chartDateTime, formatDateUsdToBd } from '../../utils/utils-functions/formatDate';

const SubscriptionAdmin: React.FC = () => {
  const dispatch = useDispatch<any>();
  const {
    adminOverview,
    adminTenants,
    adminPayments,
    adminCompanies,
    plans,
    error,
    submitSuccessMessage,
    updatingAdminPayment,
  } = useSelector((state: any) => state.subscription);

  const [form, setForm] = useState({
    company_id: '',
    plan_id: '',
    status: 'active',
    access_status: 'full',
    start_date: dayjs().format('YYYY-MM-DD'),
    end_date: '',
    trial_end_at: '',
    notes: '',
  });

  const [startDateObj, setStartDateObj] = useState<Date | null>(new Date());
  const [endDateObj, setEndDateObj] = useState<Date | null>(null);
  const [trialEndDateObj, setTrialEndDateObj] = useState<Date | null>(null);

  useEffect(() => {
    dispatch(fetchSubscriptionAdminOverview());
    dispatch(fetchAdminSubscriptionCompanies());
    dispatch(fetchAdminTenantSubscriptions());
    dispatch(fetchAdminSubscriptionPayments());
    dispatch(fetchSubscriptionPlans());

    return () => {
      dispatch(clearSubscriptionFeedback());
    };
  }, [dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (!submitSuccessMessage) return;
    toast.success(submitSuccessMessage);
    dispatch(fetchSubscriptionAdminOverview());
    dispatch(fetchAdminTenantSubscriptions());
    dispatch(fetchAdminSubscriptionPayments());
  }, [dispatch, submitSuccessMessage]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAssign = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.company_id) return toast.error('Please select a company.');
    if (!form.plan_id) return toast.error('Please select a plan.');

    await dispatch(
      assignSubscriptionToCompany({
        company_id: Number(form.company_id),
        plan_id: Number(form.plan_id),
        status: form.status as any,
        access_status: form.access_status as any,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        trial_end_at: form.trial_end_at || undefined,
        notes: form.notes || undefined,
      }),
    );
  };

  const companyOptions = [
    { id: '', name: 'Select company' },
    ...adminCompanies.map((company: any) => ({
      id: String(company.id),
      name: company.name,
    })),
  ];

  const planOptions = [
    { id: '', name: 'Select plan' },
    ...plans.map((plan: any) => ({
      id: String(plan.id),
      name: `${plan.name}${plan.price ? ` - ${plan.currency || 'BDT'} ${Number(plan.price).toFixed(0)}` : ''}`,
    })),
  ];

  const statusOptions = [
    { id: 'active', name: 'Active' },
    { id: 'trialing', name: 'Trialing' },
    { id: 'pending_payment', name: 'Pending Payment' },
    { id: 'expired', name: 'Expired' },
    { id: 'suspended', name: 'Suspended' },
    { id: 'cancelled', name: 'Cancelled' },
  ];

  const accessOptions = [
    { id: 'full', name: 'Full Access' },
    { id: 'limited', name: 'Limited Access' },
    { id: 'billing_only', name: 'Billing Only' },
    { id: 'blocked', name: 'Blocked' },
  ];

  return (
    <div className="space-y-4">
      <HelmetTitle title="Subscription Admin" />

      <div className="rounded border border-gray-400 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">Subscription Admin</h1>
            <p className="mt-1 text-sm text-gray-500">
              Review subscriptions, pending manual payments, and activation status.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to={routes.subscription_plan_list} className="inline-flex">
              <ButtonLoading label="Plan List" className="h-10 px-4" />
            </Link>
            <Link to={routes.subscription_plan_entry} className="inline-flex">
              <ButtonLoading label="New Plan" className="h-10 px-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Pending Payments" value={adminOverview?.pending_payments ?? 0} />
        <StatCard label="Active" value={adminOverview?.active_subscriptions ?? 0} />
        <StatCard label="Expired" value={adminOverview?.expired_subscriptions ?? 0} />
        <StatCard label="Trialing" value={adminOverview?.trial_subscriptions ?? 0} />
      </div>

      <section className="rounded border border-gray-400 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white">Assign Subscription</h2>
        <p className="mt-1 text-sm text-gray-500">
          Payment ছাড়া direct plan assign বা renew করতে এখানে company এবং plan select করুন।
        </p>

        <form onSubmit={handleAssign} className="mt-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DropdownCommon
              id="company_id"
              name="company_id"
              label="Company"
              value={form.company_id}
              onChange={handleChange}
              className="h-8.5 bg-transparent"
              data={companyOptions}
            />

            <DropdownCommon
              id="plan_id"
              name="plan_id"
              label="Plan"
              value={form.plan_id}
              onChange={handleChange}
              className="h-8.5 bg-transparent"
              data={planOptions}
            />

            <DropdownCommon
              id="status"
              name="status"
              label="Status"
              value={form.status}
              onChange={handleChange}
              className="h-8.5 bg-transparent"
              data={statusOptions}
            />

            <DropdownCommon
              id="access_status"
              name="access_status"
              label="Access Status"
              value={form.access_status}
              onChange={handleChange}
              className="h-8.5 bg-transparent"
              data={accessOptions}
            />

            <div>
              <label className="mb-1 block text-sm text-gray-900 dark:text-white">Start Date</label>
              <InputDatePicker
                id="start_date"
                name="start_date"
                className="h-8.5 w-full text-sm"
                selectedDate={startDateObj}
                setSelectedDate={(date: Date | null) => {
                  setStartDateObj(date);
                  setForm((prev) => ({
                    ...prev,
                    start_date: date ? dayjs(date).format('YYYY-MM-DD') : '',
                  }));
                }}
                setCurrentDate={(date: Date | null) => {
                  setStartDateObj(date);
                  setForm((prev) => ({
                    ...prev,
                    start_date: date ? dayjs(date).format('YYYY-MM-DD') : '',
                  }));
                }}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-900 dark:text-white">End Date</label>
              <InputDatePicker
                id="end_date"
                name="end_date"
                className="h-8.5 w-full text-sm"
                selectedDate={endDateObj}
                setSelectedDate={(date: Date | null) => {
                  setEndDateObj(date);
                  setForm((prev) => ({
                    ...prev,
                    end_date: date ? dayjs(date).format('YYYY-MM-DD') : '',
                  }));
                }}
                setCurrentDate={(date: Date | null) => {
                  setEndDateObj(date);
                  setForm((prev) => ({
                    ...prev,
                    end_date: date ? dayjs(date).format('YYYY-MM-DD') : '',
                  }));
                }}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-900 dark:text-white">Trial End</label>
              <InputDatePicker
                id="trial_end_at"
                name="trial_end_at"
                className="h-8.5 w-full text-sm"
                selectedDate={trialEndDateObj}
                setSelectedDate={(date: Date | null) => {
                  setTrialEndDateObj(date);
                  setForm((prev) => ({
                    ...prev,
                    trial_end_at: date ? dayjs(date).format('YYYY-MM-DD') : '',
                  }));
                }}
                setCurrentDate={(date: Date | null) => {
                  setTrialEndDateObj(date);
                  setForm((prev) => ({
                    ...prev,
                    trial_end_at: date ? dayjs(date).format('YYYY-MM-DD') : '',
                  }));
                }}
              />
            </div>

            <InputElement
              id="notes"
              name="notes"
              label="Short Note"
              placeholder="Optional admin note"
              value={form.notes}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              className="h-8.5"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLoading
              type="submit"
              buttonLoading={updatingAdminPayment}
              disabled={updatingAdminPayment}
              label={updatingAdminPayment ? 'Saving...' : 'Assign Subscription'}
              className="w-45 p-2"
            />
          </div>
        </form>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded border border-gray-400 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-300 px-4 py-3 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">Subscriptions</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100 dark:bg-gray-900/40">
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3">Ends</th>
                </tr>
              </thead>
              <tbody>
                {adminTenants.map((tenant: any) => (
                  <tr
                    key={tenant.id}
                    className="border-t border-gray-200 text-sm text-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <td className="px-4 py-3">{tenant.company_name || '-'}</td>
                    <td className="px-4 py-3">{tenant.plan_name || '-'}</td>
                    <td className="px-4 py-3">{tenant.status || '-'}</td>
                    <td className="px-4 py-3">{tenant.access_status || '-'}</td>
                    <td className="px-4 py-3">{ chartDate(tenant.end_date) || '-'}</td>
                  </tr>
                ))}

                {adminTenants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                      No subscription assigned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded border border-gray-400 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-300 px-4 py-3 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">Payment Requests</h2>
          </div>

          <div className="space-y-3 p-4">
            {adminPayments.map((payment: any) => (
              <div
                key={payment.id}
                className="rounded border border-gray-300 p-3 dark:border-gray-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">
                      {payment.company_name || 'Unknown Company'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {payment.plan_name || '-'} | {payment.payment_method} |{' '}
                      {payment.transaction_id || '-'}
                    </p>
                  </div>

                  <span className="rounded bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-100">
                    {payment.payment_status || '-'}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-gray-600 dark:text-gray-300 md:grid-cols-2">
                  <p>
                    Amount: {(payment.currency || 'BDT') + ' '}
                    {Number(payment.amount || 0).toFixed(2)}
                  </p>
                  <p>Months: {payment.billing_months || 1}</p>
                  <p>Sender: {payment.sender_number || '-'}</p>
                  <p>Paid At: { chartDateTime(payment.created_at) || '-'}</p>
                </div>

                {payment.payment_status === 'pending' && (
                  <div className="mt-4 flex gap-3">
                    <ButtonLoading
                      type="button"
                      disabled={updatingAdminPayment}
                      onClick={() => dispatch(approveSubscriptionPayment({ paymentId: payment.id }))}
                      buttonLoading={false}
                      label="Approve"
                      className="w-30 p-2"
                      icon={<FiCheck className="mr-2 text-white" />}
                    />

                    <button
                      type="button"
                      disabled={updatingAdminPayment}
                      onClick={() => dispatch(rejectSubscriptionPayment({ paymentId: payment.id }))}
                      className="flex w-30 items-center justify-center rounded bg-red px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      <FiX className="mr-2" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}

            {adminPayments.length === 0 && (
              <div className="rounded border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
                No payment requests found.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded border border-gray-400 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
  </div>
);

export default SubscriptionAdmin;
