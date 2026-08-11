import React, { useEffect, useState } from 'react';
import customerHttpService from '../../../services/customerHttpService';
import { API_CUSTOMER_STATEMENT_URL } from '../../../services/apiRoutes';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import CustomerVoucherModal from './CustomerVoucherModal';

type StatementRow = {
  mtm_id: number;
  vr_no: string;
  vr_date: string;
  ledger_name: string;
  remarks: string;
  debit: number;
  credit: number;
  balance: number;
};

type StatementSummary = {
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
};

// Default range: first day of the current month → today.
const toInputDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

type CustomerStatementProps = {
  branchId: string;
  setBranchId: (id: string) => void;
  branches: { id: number; name: string }[];
  setBranches: (b: { id: number; name: string }[]) => void;
};

const CustomerStatement: React.FC<CustomerStatementProps> = ({
  branchId,
  setBranchId,
  branches,
  setBranches,
}) => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState<Date | null>(monthStart);
  const [endDate, setEndDate] = useState<Date | null>(today);
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voucherId, setVoucherId] = useState<number | null>(null);

  const fetchStatement = () => {
    setLoading(true);
    setError('');
    customerHttpService
      .get(API_CUSTOMER_STATEMENT_URL, {
        params: {
          start_date: startDate ? toInputDate(startDate) : undefined,
          end_date: endDate ? toInputDate(endDate) : undefined,
          branch_id: branchId || undefined,
        },
      })
      .then((res) => {
        const data = res.data?.data;
        setRows(data?.rows || []);
        setSummary(data?.summary || null);
        if (Array.isArray(data?.branches)) setBranches(data.branches);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Failed to load statement');
        setRows([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  };

  // Load on mount and whenever the selected branch changes.
  useEffect(() => {
    fetchStatement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const money = (n: number) => `Tk. ${thousandSeparator(Number(n || 0).toFixed(2))}`;

  return (
    <div className="bg-white dark:bg-boxdark dark:border dark:border-strokedark shadow rounded p-4 transition-colors">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Account Statement</h2>

      {/* Date range filter */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        {branches.length > 1 && (
          <div className="w-52">
            <label className="text-gray-900 dark:text-white text-sm">Select Branch</label>
            <BranchDropdown
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="mt-0.5 w-full font-medium text-sm p-2 h-9"
              branchDdl={[{ id: '', name: 'All Branches' }, ...branches.map((b) => ({ id: String(b.id), name: b.name }))]}
            />
          </div>
        )}
        <div className="w-40">
          <InputDatePicker
            label="From"
            className="font-medium text-sm w-full h-9"
            selectedDate={startDate}
            setSelectedDate={setStartDate}
            setCurrentDate={setStartDate}
          />
        </div>
        <div className="w-40">
          <InputDatePicker
            label="To"
            className="font-medium text-sm w-full h-9"
            selectedDate={endDate}
            setSelectedDate={setEndDate}
            setCurrentDate={setEndDate}
          />
        </div>
        <button
          onClick={fetchStatement}
          disabled={loading}
          className="bg-primary text-white px-4 py-2 rounded text-sm hover:bg-opacity-90 disabled:opacity-60"
        >
          {loading ? 'Loading...' : 'Show'}
        </button>
      </div>

      {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-center">
          <div className="p-3 bg-gray-50 dark:bg-strokedark rounded">
            <p className="text-xs text-gray-600 dark:text-gray-300">Opening</p>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{money(summary.opening_balance)}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-strokedark rounded">
            <p className="text-xs text-gray-600 dark:text-gray-300">Total Debit</p>
            <p className="text-sm font-bold text-green-600 dark:text-green-400">{money(summary.total_debit)}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-strokedark rounded">
            <p className="text-xs text-gray-600 dark:text-gray-300">Total Credit</p>
            <p className="text-sm font-bold text-cyan-700 dark:text-cyan-400">{money(summary.total_credit)}</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-strokedark rounded">
            <p className="text-xs text-gray-600 dark:text-gray-300">Closing</p>
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{money(summary.closing_balance)}</p>
          </div>
        </div>
      )}

      {/* Ledger table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-strokedark text-gray-700 dark:text-gray-200">
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Vr. No</th>
              <th className="p-2 text-left">Particulars</th>
              <th className="p-2 text-right">Debit</th>
              <th className="p-2 text-right">Credit</th>
              <th className="p-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 dark:border-strokedark font-medium">
              <td className="p-2" colSpan={5}>Opening Balance</td>
              <td className="p-2 text-right">{summary ? money(summary.opening_balance) : '-'}</td>
            </tr>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-strokedark text-gray-700 dark:text-gray-300">
                <td className="p-2">{r.vr_date}</td>
                <td className="p-2">
                  <button
                    type="button"
                    onClick={() => setVoucherId(r.mtm_id)}
                    className="text-primary hover:underline"
                    title="View voucher"
                  >
                    {r.vr_no}
                  </button>
                </td>
                <td className="p-2">
                  <div className="font-medium text-gray-800 dark:text-gray-100">
                    {r.ledger_name || 'Transaction'}
                  </div>
                  {r.remarks && r.remarks !== r.ledger_name && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {r.remarks}
                    </div>
                  )}
                </td>
                <td className="p-2 text-right">{r.debit ? thousandSeparator(r.debit.toFixed(2)) : '-'}</td>
                <td className="p-2 text-right">{r.credit ? thousandSeparator(r.credit.toFixed(2)) : '-'}</td>
                <td className="p-2 text-right">{thousandSeparator(r.balance.toFixed(2))}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={6}>
                  No transactions in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {voucherId !== null && (
        <CustomerVoucherModal mtmId={voucherId} onClose={() => setVoucherId(null)} />
      )}
    </div>
  );
};

export default CustomerStatement;
