import React, { useEffect } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import HelmetTitle from '../../utils/others/HelmetTitle';
import {
  clearResellerFeedback,
  fetchResellerDashboardData,
} from './resellerSlice';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

const currency = (value: number | string | null | undefined, code = 'BDT') => {
  const formatted = thousandSeparator(Number(value || 0));
  return formatted === '-' ? '-' : `${code} ${formatted}`;
};

const ResellerDashboard: React.FC = () => {
  const dispatch = useDispatch<any>();
  const { overview, companies, payments, commissionLedgers, loading, error } = useSelector((state: any) => state.reseller);

  useEffect(() => {
    dispatch(fetchResellerDashboardData());

    return () => {
      dispatch(clearResellerFeedback());
    };
  }, [dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  return (
    <div className="space-y-4">
      <HelmetTitle title="Reseller Dashboard" />

      <section className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-black dark:text-white">Reseller Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-bodydark2">Your clients, subscription status, and commission position.</p>
          </div>

          <ButtonLoading
            type="button"
            onClick={() => dispatch(fetchResellerDashboardData())}
            buttonLoading={loading}
            disabled={loading}
            icon={<FiRefreshCw className="text-white" />}
            label={loading ? 'Refreshing...' : 'Refresh'}
            className="h-10 w-34 p-2"
          />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Clients" value={overview?.assigned_companies ?? 0} />
        <StatCard label="Approved Payments" value={(overview?.approved_payments ?? 0)} />
        <StatCard label="Approved Amount" value={thousandSeparator(overview?.approved_amount)} />
        <StatCard label="Commission" value={currency(overview?.approved_commission)} />
        <StatCard label="Paid" value={currency(overview?.paid_commission)} />
        <StatCard label="Payable" value={currency(overview?.payable_commission)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-5 py-4 dark:border-strokedark">
            <h2 className="text-base font-semibold text-black dark:text-white">My Clients</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-2 text-left text-xs uppercase text-slate-500 dark:bg-meta-4 dark:text-bodydark2">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Subscription</th>
                  <th className="px-4 py-3">Access</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company: any) => (
                  <tr key={company.id} className="border-t border-stroke text-sm text-slate-600 dark:border-strokedark dark:text-bodydark">
                    <td className="px-4 py-3 font-medium text-black dark:text-white">{company.name}</td>
                    <td className="px-4 py-3">{company.plan_name || '-'}</td>
                    <td className="px-4 py-3 capitalize">{company.subscription_status || '-'}</td>
                    <td className="px-4 py-3 capitalize">{company.access_status || '-'}</td>
                  </tr>
                ))}
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                      No client assigned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-5 py-4 dark:border-strokedark">
            <h2 className="text-base font-semibold text-black dark:text-white">Commission History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-2 text-left text-xs uppercase text-slate-500 dark:bg-meta-4 dark:text-bodydark2">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Commission</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment: any) => (
                  <tr key={payment.id} className="border-t border-stroke text-sm text-slate-600 dark:border-strokedark dark:text-bodydark">
                    <td className="px-4 py-3 font-medium text-black dark:text-white">{payment.company_name || '-'}</td>
                    <td className="px-4 py-3 capitalize">{payment.payment_status || '-'}</td>
                    <td className="px-4 py-3">{currency(payment.amount, payment.currency || 'BDT')}</td>
                    <td className="px-4 py-3 font-medium text-black dark:text-white">{currency(payment.commission_amount, payment.currency || 'BDT')}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                      No payment commission found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke px-5 py-4 dark:border-strokedark">
          <h2 className="text-base font-semibold text-black dark:text-white">Payment Details</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-2 text-left text-xs uppercase text-slate-500 dark:bg-meta-4 dark:text-bodydark2">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {commissionLedgers.filter((ledger: any) => ledger.ledger_type === 'paid').map((ledger: any) => (
                <tr key={ledger.id} className="border-t border-stroke text-sm text-slate-600 dark:border-strokedark dark:text-bodydark">
                  <td className="px-4 py-3">{formatDate(ledger.ledger_date || ledger.paid_at)}</td>
                  <td className="px-4 py-3">{paymentMethodLabel(ledger.payment_method)}</td>
                  <td className="px-4 py-3">{ledger.paid_to_account || '-'}</td>
                  <td className="px-4 py-3">{ledger.payment_reference || ledger.reference_no || '-'}</td>
                  <td className="px-4 py-3 font-medium text-black dark:text-white">{currency(ledger.amount, ledger.currency || 'BDT')}</td>
                  <td className="px-4 py-3">{ledger.notes || '-'}</td>
                </tr>
              ))}
              {commissionLedgers.filter((ledger: any) => ledger.ledger_type === 'paid').length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No reseller payment found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
    <p className="text-sm font-medium text-slate-500 dark:text-bodydark2">{label}</p>
    <p className="mt-2 text-title-sm font-bold text-black dark:text-white">{value}</p>
  </div>
);

const paymentMethodLabel = (method?: string | null) => {
  const labels: Record<string, string> = {
    bkash: 'bKash',
    nagad: 'Nagad',
    bank: 'Bank',
    cash: 'Cash',
    other: 'Other',
  };
  return method ? labels[method] || method : '-';
};

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('en-GB') : '-');

export default ResellerDashboard;
