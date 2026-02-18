// src/components/CustomerDashboard.tsx

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Table from '../../../utils/others/Table';
import StatusIcon from '../../../utils/utils-functions/StatusIcon';
import { FaSun, FaMoon } from 'react-icons/fa';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import formatDate from '../../../utils/utils-functions/formatDate';
import { set } from 'react-datepicker/dist/date_utils';

interface CustomerProfile {
  id: number;
  name: string;
  phone: string;
  address: string;
}
interface Summary {
  totalInstallments: number;
  paid: number;
  due: number;
  overdue: number;
  earlyPaymentMessage: string;
  total: [];
}
interface PaidInstallment {
  id: number;
  installmentNo: number;
  dueDate: string;
  amount: number;
}
interface Payment {
  id: number;
  date: string;
  amount: number;
  installmentNo: number;
  method: 'Cash' | 'Wallet' | 'Online';
}

const CustomerDashboard: React.FC = () => {
  const dispatch = useDispatch();
  const customer = useSelector((state: any) => state.customerAuth);
  // Theme state: true = dark, false = light
  const [isDark, setIsDark] = useState<boolean>(false);
  // Active tab: 'overview' | 'installments' | 'payments'
  const [activeTab, setActiveTab] = useState<'overview' | 'installments' | 'payments' | 'others'>('overview');
  const [installments, setInstallments] = useState(null);
  const [payment, setPayments] = useState<any[]>([]); // Make it an array from the start
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  useEffect(() => { 
  }, [customer]);
  // Demo data
  const [profile, setProfile] = useState<CustomerProfile>({
    id: 0,
    name: '',
    phone: '',
    address: '',
  });


  const [walletBalance] = useState<number>(10000.0);
  const [earlyDiscountEligible] = useState<boolean>(true);
  const [summary, setSummary] = useState<Summary>({
    totalInstallments: 0,
    paid: 0,
    due: 0,
    overdue: 0,
    earlyPaymentMessage: '',
    total: [],
  });

  useEffect(() => {
    const currentCustomer = customer?.me.data?.user;
    setInstallments(customer?.me.data?.installments?.original?.data?.data);

    if (currentCustomer?.id) {
      setProfile({
        id: currentCustomer.id,
        name: currentCustomer.name,
        phone: currentCustomer.mobile,
        address: currentCustomer.address || '',
      });
    }
    const summeries = customer?.me.data?.payments?.original?.data?.data.summary;
    if (summeries) {
      setSummary({
        totalInstallments: summeries.total_installments,
        paid: summeries.paid_installments,
        due: summeries.due_installments,
        overdue: summeries.overdue_installments,
        earlyPaymentMessage: summeries.early_discount_message,
        total: customer?.me?.data?.summery,
      });
    }

    const raw = customer?.me?.data?.payments?.original?.data?.data?.data;

    if (raw && Array.isArray(raw)) {
      setPayments(raw);
    }

    if( customer?.me.data?.installments?.original?.data?.data[0].payments){
      setPaymentHistory(customer?.me.data?.installments?.original?.data?.data[0].payments);
    }

  }, [customer]);
 

  // Apply 'dark' class to <html> or <body> when isDark is true
  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);


const paymentList = customer?.me?.data?.payments?.original?.data?.data?.payments || [];

const allPayments = paymentList.map((pay: any) => ({
  id: pay.id,
  vr_no: pay.main_transaction?.vr_no || pay.main_trx_id, // main_transaction থেকে vr_no
  paid_at: pay.paid_at,
  amount: pay.amount,
  installment_no: pay.installment?.installment_no,       // installment relation থেকে
  due_date: pay.installment?.due_date,
  status: pay.installment?.status,
  invoice_no: pay.installment?.invoice_no ?? null,       // future-proof
}));
 
  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No',
      width: '90px',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'invoice_no',
      header: 'Invoice. No',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'installment_no',
      header: 'Install. No',
      width: '90px',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'due_date',
      header: 'Due Date',
      width: '100px',
      render: (row: any) => {
        return (
          <>
            <div>{row.due_date}</div>
          </>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '100px',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (row: any) => <StatusIcon status={row.status} />,
    },
  ];

  const paymentsColumns = [
    {
      key: 'vr_no',
      header: 'Vr. No',
      width: '90px',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'paid_at',
      header: 'Vr. date',
      width: '90px',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'installment_id',
      header: 'Inst. No',
      width: '90px',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '90px',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        return (
          <>
            <div className="text-right">
              ৳ {thousandSeparator(row.amount, 0)}
            </div>
          </>
        );
      },
    }, 
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Theme Toggle */}
        <div className="flex justify-end">
          <button
            onClick={() => setIsDark((prev) => !prev)}
            className="px-3 py-1 rounded focus:outline-none text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            {isDark ? (
              <>
                <FaSun />
              </>
            ) : (
              <>
                <FaMoon />
              </>
            )}
          </button>
          <button
            className="px-3 py-1 border rounded focus:outline-none
                       bg-white dark:bg-gray-800 dark:border-gray-600
                       text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ml-4"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 shadow rounded">
          <nav className="flex mt-3">
            {['overview', 'installments', 'payments', 'others'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 px-4 py-2 text-center font-medium transition-colors
                  ${
                    activeTab === tab
                      ? 'bg-blue-500 text-white dark:bg-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                {tab === 'overview'
                  ? 'Overview'
                  : tab === 'installments'
                    ? 'Installments'
                    : tab === 'payments'
                      ? 'Payments'
                      : 'Others'}
              </button>
            ))}
          </nav>
          <div className="p-4">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {/* Profile & Wallet */}
                <div
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6
                                bg-white dark:bg-gray-800 dark:border dark:border-gray-700 
                                shadow rounded p-4 transition-colors"
                >
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                      {profile.name}
                    </h2>
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Phone:</span>{' '}
                      {profile.phone}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Address:</span>{' '}
                      {profile.address}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <div className="flex flex-col">
                      <div className="">
                        <span className="text-gray-800  text-sm dark:text-gray-100 block mb-0">
                          Total Purchase
                        </span>
                        <span className="text-green-600 text-sm dark:text-green-400 mt-0">
                          ৳{' '}
                          {thousandSeparator(
                            summary.total[0]?.total_debit,0,
                          ) || 0}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-gray-800 text-sm  dark:text-gray-100 mb-0 block">
                          Total Payment
                        </span>
                        <span className="text-cyan-700 text-sm dark:text-cyan-400">
                          ৳{' '}
                          {thousandSeparator(
                            summary.total[0]?.total_credit,
                            0,
                          ) || 0}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="">
                        <span className="text-gray-800  text-sm dark:text-gray-100 block mb-0">
                          Balance (Due)
                        </span>
                        <span className="text-green-600 text-sm dark:text-green-400 mt-0">
                          ৳{' '}
                          {thousandSeparator(
                            summary.total[0]?.total_debit -
                              summary.total[0]?.total_credit,
                            0,
                          )}
                        </span>
                      </div>
                    </div>
                    {earlyDiscountEligible && (
                      <p className="mt-2 text-yellow-700 dark:text-yellow-300">
                        {summary.earlyPaymentMessage}
                      </p>
                    )}
                  </div>
                </div>

                {/* Summary */}
                <div
                  className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 
                                shadow rounded p-4 transition-colors"
                >
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                    Installment Summary
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded transition-colors">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Total Installments
                      </p>
                      <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {summary.totalInstallments}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded transition-colors">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        Paid
                      </p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {summary.paid}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded transition-colors">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        Due
                      </p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {summary.due}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded transition-colors">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">
                        Overdue
                      </p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">
                        {summary.overdue}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Installments Tab */}
            {activeTab === 'installments' && (
              <div
                className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 
                              shadow rounded p-4 transition-colors"
              >
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                  Installment Information
                </h2>
                <div className="overflow-x-auto">
                  <Table columns={columns} data={installments || []} />
                </div>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div
                className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 
                              shadow rounded p-4 transition-colors"
              >
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                  Payment History
                </h2>
                <div className="overflow-x-auto">
                  <Table columns={paymentsColumns} data={allPayments || []} />
                </div>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'others' && (
              <div
                className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 
                              shadow rounded p-4 transition-colors"
              >
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                  Payment History
                </h2>
                <div className="overflow-x-auto">
                  <Table columns={paymentsColumns} data={allPayments || []} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
