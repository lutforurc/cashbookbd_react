// src/components/CustomerDashboard.tsx

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Table from '../../../utils/others/Table';
import StatusIcon from '../../../utils/utils-functions/StatusIcon';
import { FaSun, FaMoon } from 'react-icons/fa';
import {
  FiLogOut,
  FiShoppingBag,
  FiCreditCard,
  FiTrendingUp,
  FiLayers,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiGrid,
  FiFileText,
} from 'react-icons/fi';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import formatDate from '../../../utils/utils-functions/formatDate';
import { logout } from '../../../../features/customerAuthReducer';
import customerHttpService from '../../../services/customerHttpService';
import { API_CUSTOMER_SUMMARY_URL } from '../../../services/apiRoutes';
import CustomerStatement from './CustomerStatement';
import CustomerDue from './CustomerDue';

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
  total: any[];
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
  const [activeTab, setActiveTab] = useState<'overview' | 'statement' | 'due' | 'installments' | 'payments' | 'others'>('overview');
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


  const [summary, setSummary] = useState<Summary>({
    totalInstallments: 0,
    paid: 0,
    due: 0,
    overdue: 0,
    earlyPaymentMessage: '',
    total: [],
  });

  // Branch filter shared with the Statement tab. Changing it also refreshes
  // the header KPI totals (Total Received / Payment / Balance) for that branch.
  const [branchId, setBranchId] = useState<string>('');
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [branchTotals, setBranchTotals] = useState<{ total_debit: number; total_credit: number } | null>(null);

  useEffect(() => {
    customerHttpService
      .get(API_CUSTOMER_SUMMARY_URL, { params: { branch_id: branchId || undefined } })
      .then((res) => {
        const d = res.data?.data;
        if (d) setBranchTotals({ total_debit: Number(d.total_debit || 0), total_credit: Number(d.total_credit || 0) });
      })
      .catch(() => {
        /* keep last known totals on error */
      });
  }, [branchId]);

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

    const firstInstallment = customer?.me?.data?.installments?.original?.data?.data?.[0];
    if (firstInstallment?.payments) {
      setPaymentHistory(firstInstallment.payments);
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
  vr_no: pay.main_transaction?.vr_no || pay.main_trx_id, // main_transaction Ã Â¦Â¥Ã Â§â€¡Ã Â¦â€¢Ã Â§â€¡ vr_no
  paid_at: pay.paid_at,
  amount: pay.amount,
  installment_no: pay.installment?.installment_no,       // installment relation Ã Â¦Â¥Ã Â§â€¡Ã Â¦â€¢Ã Â§â€¡
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
              Tk. {thousandSeparator(row.amount)}
            </div>
          </>
        );
      },
    }, 
  ];

  // Build avatar initials from real letters only — skip punctuation like "("
  // so a name such as "Abdur Rahim (House Owner)" yields "AR", not "R(".
  const initials =
    (profile.name || 'Customer')
      .replace(/[^\p{L}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase() || 'C';

  // Prefer the branch-aware totals; fall back to the login payload until loaded.
  const totalDebit = branchTotals
    ? branchTotals.total_debit
    : Number(summary.total?.[0]?.total_debit || 0);
  const totalCredit = branchTotals
    ? branchTotals.total_credit
    : Number(summary.total?.[0]?.total_credit || 0);
  const balance = totalDebit - totalCredit;
  const money = (n: number) => thousandSeparator(Number(n || 0).toFixed(2));

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-boxdark-2 transition-colors">
      <div className="max-w-5xl mx-auto px-3 py-4 sm:px-6 sm:py-6 space-y-5">
        {/* ===== Hero header ===== */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg sm:text-xl font-bold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-bodydark">Welcome back 👋</p>
                <h1 className="truncate text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">
                  {profile.name || 'Customer'}
                </h1>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs sm:text-sm text-gray-500 dark:text-bodydark">
                  {profile.phone && <span>📞 {profile.phone}</span>}
                  {profile.address && <span className="truncate">📍 {profile.address}</span>}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setIsDark((prev) => !prev)}
                title="Toggle theme"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-strokedark dark:text-bodydark dark:hover:bg-strokedark transition-colors"
              >
                {isDark ? <FaSun /> : <FaMoon />}
              </button>
              <button
                onClick={() => dispatch(logout() as any)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-opacity-90 transition-colors"
              >
                <FiLogOut />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* ===== KPI cards ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-bodydark">Total Received</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                <FiShoppingBag />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">৳ {money(totalDebit)}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-bodydark">Total Payment</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                <FiCreditCard />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">৳ {money(totalCredit)}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-bodydark">{balance > 0 ? 'Balance Due' : 'Balance'}</span>
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${balance > 0 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                <FiTrendingUp />
              </span>
            </div>
            <p className={`mt-2 text-2xl font-bold ${balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-800 dark:text-white'}`}>৳ {money(balance)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-strokedark dark:bg-boxdark shadow-md">
          <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 px-2 dark:border-strokedark sm:gap-2 sm:px-3">
            {[
              { key: 'overview', label: 'Overview', icon: <FiGrid /> },
              { key: 'statement', label: 'Statement', icon: <FiFileText /> },
              { key: 'due', label: 'Due', icon: <FiClock /> },
              { key: 'installments', label: 'Installments', icon: <FiLayers /> },
              { key: 'payments', label: 'Payments', icon: <FiCreditCard /> },
            ].map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`relative flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors
                    ${
                      active
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-bodydark dark:hover:text-white'
                    }`}
                >
                  <span className={active ? 'text-primary' : 'opacity-70'}>{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </nav>
          <div className="p-4">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {summary.earlyPaymentMessage && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-200">
                    <span>🎁</span>
                    <span>{summary.earlyPaymentMessage}</span>
                  </div>
                )}

                <div>
                  <h2 className="mb-3 text-base font-semibold text-gray-800 dark:text-gray-100">
                    Installment Summary
                  </h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: 'Total', value: summary.totalInstallments, icon: <FiLayers />, tone: 'text-slate-600 dark:text-slate-300', ring: 'bg-slate-100 dark:bg-slate-700' },
                      { label: 'Paid', value: summary.paid, icon: <FiCheckCircle />, tone: 'text-emerald-600 dark:text-emerald-400', ring: 'bg-emerald-100 dark:bg-emerald-900/40' },
                      { label: 'Due', value: summary.due, icon: <FiClock />, tone: 'text-blue-600 dark:text-blue-400', ring: 'bg-blue-100 dark:bg-blue-900/40' },
                      { label: 'Overdue', value: summary.overdue, icon: <FiAlertTriangle />, tone: 'text-rose-600 dark:text-rose-400', ring: 'bg-rose-100 dark:bg-rose-900/40' },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-strokedark dark:bg-gray-700/40"
                      >
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${s.ring} ${s.tone}`}>
                          {s.icon}
                        </span>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                          <p className={`text-xl font-bold ${s.tone}`}>{s.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-gray-200 dark:border-strokedark p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Use the <span className="font-medium text-blue-600 dark:text-blue-400">Statement</span> and{' '}
                  <span className="font-medium text-blue-600 dark:text-blue-400">Due</span> tabs above for full details.
                </div>
              </div>
            )}

            {/* Statement Tab */}
            {activeTab === 'statement' && (
              <CustomerStatement
                branchId={branchId}
                setBranchId={setBranchId}
                branches={branches}
                setBranches={setBranches}
              />
            )}

            {/* Due Tab */}
            {activeTab === 'due' && <CustomerDue />}

            {/* Installments Tab */}
            {activeTab === 'installments' && (
              <div
                className="bg-white dark:bg-boxdark dark:border dark:border-strokedark 
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
                className="bg-white dark:bg-boxdark dark:border dark:border-strokedark 
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
                className="bg-white dark:bg-boxdark dark:border dark:border-strokedark 
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
