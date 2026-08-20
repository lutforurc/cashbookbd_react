import React, { useEffect, useState } from 'react';
import customerHttpService from '../../../services/customerHttpService';
import { API_CUSTOMER_DUES_URL } from '../../../services/apiRoutes';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

type DueRow = {
  sl_number: number;
  invoice_no: string;
  installment_no: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  due_amount: number;
  status: string;
};

type DueSummary = {
  total_installments: number;
  paid_installments: number;
  due_installments: number;
  overdue_installments: number;
  early_discount_message: string | null;
};

const statusClasses: Record<string, string> = {
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  'due today': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  pending: 'bg-gray-100 text-gray-700 dark:bg-strokedark dark:text-gray-300',
  partial: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const CustomerDue: React.FC = () => {
  const [dues, setDues] = useState<DueRow[]>([]);
  const [summary, setSummary] = useState<DueSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    customerHttpService
      .get(API_CUSTOMER_DUES_URL)
      .then((res) => {
        const data = res.data?.data;
        setDues(Array.isArray(data?.dues) ? data.dues : []);
        setSummary(data?.summary || null);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to load dues');
        setDues([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalDue = dues.reduce((sum, d) => sum + Number(d.due_amount || 0), 0);
  const money = (n: number) => thousandSeparator(Number(n || 0).toFixed(2));

  return (
    <div className="bg-[rgb(var(--c-surface))] dark:border dark:border-strokedark shadow rounded p-4 transition-colors">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Outstanding Dues</h2>
        <div className="text-right">
          <p className="text-xs text-gray-600 dark:text-gray-300">Total Due</p>
          <p className="text-lg font-bold text-red-600 dark:text-red-400">Tk. {money(totalDue)}</p>
        </div>
      </div>

      {summary?.early_discount_message && (
        <div className="mb-3 rounded border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {summary.early_discount_message}
        </div>
      )}

      {/* Summary counts */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-center">
          <div className="p-3 bg-gray-50 dark:bg-strokedark rounded">
            <p className="text-xs text-gray-600 dark:text-gray-300">Total</p>
            <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{summary.total_installments}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-strokedark rounded">
            <p className="text-xs text-green-600 dark:text-green-400">Paid</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{summary.paid_installments}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-strokedark rounded">
            <p className="text-xs text-blue-600 dark:text-blue-400">Due</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{summary.due_installments}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-strokedark rounded">
            <p className="text-xs text-red-600 dark:text-red-400">Overdue</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{summary.overdue_installments}</p>
          </div>
        </div>
      )}

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

      {/* Due table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-strokedark text-gray-700 dark:text-gray-200">
              <th className="p-2 text-left">Invoice</th>
              <th className="p-2 text-center">Inst. No</th>
              <th className="p-2 text-left">Due Date</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2 text-right">Paid</th>
              <th className="p-2 text-right">Due</th>
              <th className="p-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {dues.map((d, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-strokedark text-gray-700 dark:text-gray-300">
                <td className="p-2">{d.invoice_no}</td>
                <td className="p-2 text-center">{d.installment_no}</td>
                <td className="p-2">{d.due_date}</td>
                <td className="p-2 text-right">{money(d.amount)}</td>
                <td className="p-2 text-right">{money(d.paid_amount)}</td>
                <td className="p-2 text-right font-medium">{money(d.due_amount)}</td>
                <td className="p-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs capitalize ${statusClasses[d.status] || 'bg-gray-100 text-gray-700'}`}>
                    {d.status}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && dues.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={7}>
                  {error ? '—' : 'No outstanding dues. 🎉'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerDue;
