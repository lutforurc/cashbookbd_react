import React, { useEffect } from 'react';
import { FiCreditCard, FiGrid, FiRefreshCw, FiTrendingUp, FiUsers } from 'react-icons/fi';
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

      <section className="border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-5 shadow-default">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FiGrid className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Reseller Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-bodydark2">Your clients, subscription status, and commission position.</p>
            </div>
          </div>

          <ButtonLoading
            type="button"
            onClick={() => dispatch(fetchResellerDashboardData())}
            buttonLoading={loading}
            disabled={loading}
            icon={<FiRefreshCw className="" />}
            label={loading ? 'Refreshing...' : 'Refresh'}
            className="w-34 p-2"
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
        <section className="overflow-hidden border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default">
          <div className="flex items-center gap-3 border-b border-[rgb(var(--c-border))] px-5 py-3.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-500">
              <FiUsers className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">My Clients</h2>
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

        <section className="overflow-hidden border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default">
          <div className="flex items-center gap-3 border-b border-[rgb(var(--c-border))] px-5 py-3.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-violet-500/10 text-violet-500">
              <FiTrendingUp className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Commission History</h2>
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

      <section className="overflow-hidden border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default">
        <div className="flex items-center gap-3 border-b border-[rgb(var(--c-border))] px-5 py-3.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
            <FiCreditCard className="h-4 w-4" />
          </span>
          <h2 className="text-base font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Payment Details</h2>
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

const STAT_TONES: Record<string, { bar: string; value: string }> = {
  Clients: { bar: 'bg-indigo-500', value: 'text-indigo-600 dark:text-indigo-400' },
  'Approved Payments': { bar: 'bg-sky-500', value: 'text-sky-600 dark:text-sky-400' },
  'Approved Amount': { bar: 'bg-cyan-500', value: 'text-cyan-600 dark:text-cyan-400' },
  Commission: { bar: 'bg-violet-500', value: 'text-violet-600 dark:text-violet-400' },
  Paid: { bar: 'bg-emerald-500', value: 'text-emerald-600 dark:text-emerald-400' },
  Payable: { bar: 'bg-amber-500', value: 'text-amber-600 dark:text-amber-400' },
};

const StatCard = ({ label, value }: { label: string; value: number | string }) => {
  const tone = STAT_TONES[label] || { bar: 'bg-slate-400', value: 'text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]' };
  return (
    <div className="relative overflow-hidden border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-5 shadow-default transition hover:shadow-lg">
      <span className={`absolute inset-y-0 left-0 w-1 ${tone.bar}`} />
      <p className="text-sm font-medium text-slate-500 dark:text-bodydark2">{label}</p>
      <p className={`mt-2 text-title-sm font-bold ${tone.value}`}>{value}</p>
    </div>
  );
};

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
