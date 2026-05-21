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
import Table from '../../utils/others/Table';

const currency = (value: number | string | null | undefined, code = '') => {
  const formatted = thousandSeparator(Number(value || 0));
  return formatted === '-' ? '-' : `${code} ${formatted}`;
};

const statNumber = (value: number | string | null | undefined) => {
  const numericValue = Number(value || 0);
  return numericValue > 0 ? thousandSeparator(numericValue) : '-';
};

const ResellerDashboard: React.FC = () => {
  const dispatch = useDispatch<any>();
  const { overview, companies, payments, commissionLedgers, loading, error } = useSelector((state: any) => state.reseller);
  const clientColumns = [
    { key: 'company', header: 'Company' },
    { key: 'plan', header: 'Plan' },
    { key: 'subscription', header: 'Subscription' },
    { key: 'access', header: 'Access' },
  ];
  const clientTableData = companies.map((company: any) => ({
    id: company.id,
    company: company.name,
    plan: company.plan_name || '-',
    subscription: company.subscription_status || '-',
    access: company.access_status || '-',
  }));
  const commissionColumns = [
    { key: 'company', header: 'Company' },
    { key: 'payment', header: 'Payment' },
    { key: 'amount', header: 'Amount' },
    { key: 'commission', header: 'Commission' },
  ];
  const commissionTableData = payments.map((payment: any) => ({
    id: payment.id,
    company: payment.company_name || '-',
    payment: payment.payment_status || '-',
    amount: currency(payment.amount, payment.currency || 'BDT'),
    commission: currency(payment.commission_amount, payment.currency || 'BDT'),
  }));
  const paymentDetails = commissionLedgers.filter((ledger: any) => ledger.ledger_type === 'paid');
  const paymentColumns = [
    { key: 'date', header: 'Date' },
    { key: 'method', header: 'Method' },
    { key: 'account', header: 'Account' },
    { key: 'reference', header: 'Reference' },
    { key: 'amount', header: 'Amount' },
    { key: 'notes', header: 'Notes' },
  ];
  const paymentTableData = paymentDetails.map((ledger: any) => ({
    id: ledger.id,
    date: formatDate(ledger.ledger_date || ledger.paid_at),
    method: paymentMethodLabel(ledger.payment_method),
    account: ledger.paid_to_account || '-',
    reference: ledger.payment_reference || ledger.reference_no || '-',
    amount: currency(ledger.amount, ledger.currency || ''),
    notes: ledger.notes || '-',
  }));

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
      <HelmetTitle title="Reseller" />

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
        <StatCard label="Clients" value={statNumber(overview?.assigned_companies)} />
        <StatCard label="Approved Payments" value={statNumber(overview?.approved_payments)} />
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
          <Table
            columns={clientColumns}
            data={clientTableData || []}
            perPage={10}
            noDataMessage="No client assigned yet."
            className="shadow-none"
            theadClassName="bg-gray-2 text-slate-500 dark:bg-meta-4 dark:text-bodydark2"
            tbodyClassName="dark:bg-boxdark"
          />
        </section>

        <section className="overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-5 py-4 dark:border-strokedark">
            <h2 className="text-base font-semibold text-black dark:text-white">Commission History</h2>
          </div>
          <Table
            columns={commissionColumns}
            data={commissionTableData || []}
            perPage={10}
            noDataMessage="No payment commission found."
            className="shadow-none"
            theadClassName="bg-gray-2 text-slate-500 dark:bg-meta-4 dark:text-bodydark2"
            tbodyClassName="dark:bg-boxdark"
          />
        </section>
      </div>

      <section className="overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="border-b border-stroke px-5 py-4 dark:border-strokedark">
          <h2 className="text-base font-semibold text-black dark:text-white">Payment Details</h2>
        </div>
        <Table
          columns={paymentColumns}
          data={paymentTableData || []}
          perPage={10}
          noDataMessage="No reseller payment found."
          className="shadow-none"
          theadClassName="bg-gray-2 text-slate-500 dark:bg-meta-4 dark:text-bodydark2"
          tbodyClassName="dark:bg-boxdark"
        />
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
