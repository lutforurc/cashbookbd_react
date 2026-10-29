import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { FiCheckSquare, FiInbox, FiRotateCcw, FiSend } from 'react-icons/fi';
import { toast } from 'react-toastify';

import httpService from '../../services/httpService';
import {
  API_INTERBRANCH_TRANSFER_INCOMING_URL,
  API_INTERBRANCH_TRANSFER_OUTGOING_URL,
} from '../../services/apiRoutes';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Loader from '../../../common/Loader';
import Table from '../../utils/others/Table';
import Pagination from '../../utils/utils-functions/Pagination';
import InputDatePicker from '../../utils/fields/DatePicker';
import { hasPermission } from '../../utils/permissionChecker';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import ReceiveTransferModal, { ReceivableTransfer } from './ReceiveTransferModal';

type Tab = 'incoming' | 'outgoing';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: '1', label: 'Pending Receive' },
  { value: '2', label: 'Received' },
];

const StatusBadge = ({ status, label }: { status: number; label?: string }) => {
  const received = Number(status) === 2;
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        received
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
      }`}
    >
      {label || (received ? 'Received' : 'Pending Receive')}
    </span>
  );
};

/**
 * Incoming and Outgoing inter-branch money transfers.
 *
 * The sender does not come here to send: a transfer is opened by an
 * Inter-Branch line on the Cash Payment, Bank Payment or Payment Entry screen.
 * This screen is where either branch watches it -- and where the destination
 * receives it.
 */
const InterBranchTransfers = ({ user }: any) => {
  const settings = useSelector((state: any) => state.settings);
  const permissions = settings?.data?.permissions ?? [];
  const canReceive = hasPermission(permissions, 'interbranch.transfer.receive');

  const [tab, setTab] = useState<Tab>('incoming');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage] = useState(15);
  const [totalPages, setTotalPages] = useState(1);

  const [status, setStatus] = useState('');
  const [reference, setReference] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const [receiveTarget, setReceiveTarget] = useState<ReceivableTransfer | null>(null);

  const url = tab === 'incoming' ? API_INTERBRANCH_TRANSFER_INCOMING_URL : API_INTERBRANCH_TRANSFER_OUTGOING_URL;

  const load = useCallback(() => {
    setLoading(true);
    const params: any = { page, per_page: perPage };
    if (status) params.status = status;
    if (reference) params.reference = reference;
    if (fromDate) params.from_date = fromDate.toISOString().split('T')[0];
    if (toDate) params.to_date = toDate.toISOString().split('T')[0];

    httpService
      .get(url, { params })
      .then((res) => {
        const payload = res?.data?.data?.data;
        setRows(Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []);
        setTotalPages(Number(payload?.last_page || 1));
      })
      .catch((err) => {
        setRows([]);
        toast.error(err?.response?.data?.message || err?.message || 'Could not load transfers.');
      })
      .finally(() => setLoading(false));
  }, [url, page, perPage, status, reference, fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const resetFilters = () => {
    setStatus('');
    setReference('');
    setFromDate(null);
    setToDate(null);
    setPage(1);
  };

  const columns = [
    {
      key: 'branch',
      header: tab === 'incoming' ? 'Sending Branch' : 'Destination Branch',
      render: (row: any) => (
        <span className="font-medium">
          {tab === 'incoming' ? row.from_branch_name : row.to_branch_name}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Transfer Ref.',
      render: (row: any) => <span className="font-mono text-xs">{row.reference}</span>,
    },
    {
      key: 'payment_date',
      header: 'Payment Date',
      render: (row: any) => row.payment_date || '-',
    },
    {
      key: 'amount',
      header: 'Amount',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => (
        <span className="font-semibold">{thousandSeparator(Number(row.amount) || 0)}</span>
      ),
    },
    {
      key: 'note',
      header: 'Note',
      render: (row: any) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">{row.note || '-'}</span>
      ),
    },
    ...(tab === 'outgoing'
      ? [
          {
            key: 'received_by',
            header: 'Received By',
            render: (row: any) => row.received_by_name || '-',
          },
          {
            key: 'received_at',
            header: 'Received Date/Time',
            render: (row: any) => row.received_at || '-',
          },
          {
            key: 'vouchers',
            header: 'Vouchers',
            render: (row: any) => (
              <span className="text-xs">
                {row.payment_vr_no ? <span title="Payment voucher">{row.payment_vr_no}</span> : '-'}
                {row.receipt_vr_no ? <span className="ml-1 text-emerald-600">→ {row.receipt_vr_no}</span> : null}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => <StatusBadge status={row.status} label={row.status_label} />,
    },
    ...(tab === 'incoming'
      ? [
          {
            key: 'action',
            header: 'Action',
            render: (row: any) =>
              Number(row.status) === 1 && canReceive ? (
                <button
                  type="button"
                  onClick={() =>
                    setReceiveTarget({
                      id: row.id,
                      reference: row.reference,
                      amount: row.amount,
                      from_branch_id: row.from_branch_id,
                      from_branch_name: row.from_branch_name,
                      payment_date: row.payment_date,
                      note: row.note,
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-sm bg-primary px-2.5 py-1 text-xs font-medium text-white transition hover:opacity-90"
                >
                  <FiCheckSquare className="text-sm" /> Receive
                </button>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              ),
          },
        ]
      : []),
  ];

  const tabClass = (value: Tab) =>
    `inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
      tab === value
        ? 'border-primary text-primary'
        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
    }`;

  return (
    <div>
      <HelmetTitle title={'Inter-Branch Transfers'} />

      <div className="border-b border-[rgb(var(--c-border))]">
        <button type="button" className={tabClass('incoming')} onClick={() => setTab('incoming')}>
          <FiInbox /> Incoming
        </button>
        <button type="button" className={tabClass('outgoing')} onClick={() => setTab('outgoing')}>
          <FiSend /> Outgoing
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-44 rounded-sm border border-[rgb(var(--c-border))] bg-white px-2 py-2 text-sm dark:bg-gray-900 dark:text-slate-200"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Reference</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => {
              setReference(e.target.value);
              setPage(1);
            }}
            placeholder="IBT-…"
            className="w-40 rounded-sm border border-[rgb(var(--c-border))] bg-white px-2 py-2 text-sm dark:bg-gray-900 dark:text-slate-200"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">From</label>
          <InputDatePicker
            className="w-full text-sm"
            selectedDate={fromDate}
            setSelectedDate={(d: any) => {
              setFromDate(d);
              setPage(1);
            }}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">To</label>
          <InputDatePicker
            className="w-full text-sm"
            selectedDate={toDate}
            setSelectedDate={(d: any) => {
              setToDate(d);
              setPage(1);
            }}
          />
        </div>

        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1 rounded-sm bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          <FiCheckSquare /> Apply
        </button>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1 rounded-sm border border-[rgb(var(--c-border))] px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          <FiRotateCcw /> Reset
        </button>
      </div>

      <div className="mt-3 overflow-y-auto">
        {loading ? <Loader /> : null}
        <Table
          columns={columns as any}
          data={rows}
          perPage={rows.length || perPage}
          noDataMessage={
            tab === 'incoming'
              ? 'No incoming inter-branch transfers. When another branch sends money to yours, it appears here.'
              : 'No outgoing inter-branch transfers. Pay a branch through its Inter-Branch account head on the Cash/Bank Payment screen and it appears here.'
          }
        />

        {totalPages > 1 ? (
          <div className="mt-3">
            <Pagination currentPage={page} totalPages={totalPages} handlePageChange={setPage} />
          </div>
        ) : null}
      </div>

      <ReceiveTransferModal
        transfer={receiveTarget}
        onClose={() => setReceiveTarget(null)}
        onReceived={() => load()}
      />
    </div>
  );
};

export default InterBranchTransfers;
