import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import { fetchSubscriptionPayments } from './subscriptionSlice';

const BillingHistory: React.FC = () => {
  const dispatch = useDispatch<any>();
  const { payments, loadingPayments } = useSelector((state: any) => state.subscription);

  useEffect(() => {
    dispatch(fetchSubscriptionPayments());
  }, [dispatch]);

  const columns = [
    {
      key: 'paid_at',
      header: 'Date',
      render: (row: any) => <span>{row.paid_at || row.created_at || '-'}</span>,
    },
    {
      key: 'plan_name',
      header: 'Plan',
      render: (row: any) => <span>{row.plan_name || '-'}</span>,
    },
    {
      key: 'payment_method',
      header: 'Method',
      render: (row: any) => <span>{row.payment_method || '-'}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row: any) => (
        <span>{(row.currency || 'BDT') + ' ' + Number(row.amount || 0).toFixed(2)}</span>
      ),
    },
    {
      key: 'billing_months',
      header: 'Months',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => <span>{row.billing_months || 1}</span>,
    },
    {
      key: 'transaction_id',
      header: 'Transaction ID',
      render: (row: any) => <span>{row.transaction_id || '-'}</span>,
    },
    {
      key: 'payment_status',
      header: 'Status',
      render: (row: any) => (
        <span className="rounded border border-gray-300 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100">
          {row.payment_status || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <HelmetTitle title="Billing History" />

      <div className="border-stroke bg-white pl-3 pt-6 pb-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
        <h1 className="text-2xl font-semibold text-black dark:text-white">
          Billing History
        </h1>
        <p className="mt-2 text-sm text-bodydark2">
          Every manual payment request and approval status will appear here.
        </p>
      </div>

        <Table
          columns={columns}
          data={payments}
          noDataMessage={
            loadingPayments ? 'Loading billing history...' : 'No billing history found yet.'
          }
        />
    </div>
  );
};

export default BillingHistory;
