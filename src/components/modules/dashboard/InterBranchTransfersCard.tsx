import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { FiArrowDownLeft, FiArrowUpRight, FiCheckSquare, FiInbox } from 'react-icons/fi';

import httpService from '../../services/httpService';
import { API_INTERBRANCH_TRANSFER_DASHBOARD_URL } from '../../services/apiRoutes';
import Table from '../../utils/others/Table';
import { CARD, CARD_FOOT, CARD_HEAD, CardTitle, Tile, money, count } from './dashboardKit';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { hasPermission } from '../../utils/permissionChecker';
import ReceiveTransferModal, { ReceivableTransfer } from '../inter-branch-transfer/ReceiveTransferModal';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type Props = {
  /** The branch the dashboard is about (the user's own, or a head office's pick). */
  branchId?: number;
  /** Refetch key, moved by the page's auto-refresh tick. */
  tick?: number;
  /** Where the card's title opens the full Incoming/Outgoing screen. */
  href?: string;
  /**
   * False when a head office is looking at ANOTHER branch: it may read, but the
   * Receive button would move that branch's books, so it is not offered.
   */
  canAct?: boolean;
  rowClass?: string;
};

/**
 * The permanent Inter-Branch Transfers section on a branch's dashboard.
 *
 * Always drawn, including when there are no transfers -- its emptiness is the
 * answer, and a section that vanishes reads as a feature that has gone wrong.
 * Figures come from the authoritative transfer records on the server, never
 * from counting rows that share a number.
 */
const InterBranchTransfersCard = ({ branchId, tick = 0, href, canAct = true, rowClass = 'px-4 py-2' }: Props) => {
  const settings = useSelector((s: any) => s.settings);
  const permissions = settings?.data?.permissions ?? [];
  const canReceive = canAct && hasPermission(permissions, 'interbranch.transfer.receive');

  // Default to the branch's business month, read from its transaction date
  // (DD/MM/YYYY), falling back to today.
  const initial = useMemo(() => {
    const raw = String(settings?.data?.trx_dt || '');
    const parts = raw.split('/');
    if (parts.length === 3) {
      return { month: Number(parts[1]) || new Date().getMonth() + 1, year: Number(parts[2]) || new Date().getFullYear() };
    }
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }, [settings?.data?.trx_dt]);

  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<ReceivableTransfer | null>(null);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => now - i);
  }, []);

  const load = useCallback(() => {
    if (!branchId) return;
    setLoading(true);
    httpService
      .get(API_INTERBRANCH_TRANSFER_DASHBOARD_URL, { params: { branch_id: branchId, month, year } })
      .then((res) => setData(res?.data?.data?.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [branchId, month, year]);

  useEffect(() => {
    load();
  }, [load, tick]);

  const summary = data?.summary;
  const rows: any[] = Array.isArray(data?.rows) ? data.rows : [];

  const columns = [
    {
      key: 'payment_date',
      header: 'Date',
      render: (row: any) => row.payment_date || '-',
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (row: any) => (
        <span className="font-mono text-xs">
          {row.reference}
          {row.direction === 'incoming' ? (
            <span className="ml-1 text-emerald-600 dark:text-emerald-400">(In)</span>
          ) : (
            <span className="ml-1 text-rose-500">(Out)</span>
          )}
        </span>
      ),
    },
    {
      key: 'branches',
      header: 'From → To',
      render: (row: any) => (
        <span className="text-xs">
          {row.from_branch_name} → {row.to_branch_name}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <span className="font-semibold">{thousandSeparator(Number(row.amount) || 0)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) =>
        Number(row.status) === 2 ? (
          <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            Received {row.receipt_date ? `on ${row.receipt_date}` : ''}
            {row.received_by_name ? ` by ${row.received_by_name}` : ''}
          </span>
        ) : (
          <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            Pending Receive
          </span>
        ),
    },
    {
      key: 'action',
      header: '',
      render: (row: any) =>
        Number(row.status) === 1 && canReceive && row.direction === 'incoming' ? (
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
            className="inline-flex items-center gap-1 rounded-sm bg-primary px-2 py-0.5 text-[11px] font-medium text-white"
          >
            <FiCheckSquare /> Receive
          </button>
        ) : null,
    },
  ];

  const monthLabel = `${MONTHS[month - 1] ?? ''} ${year}`;

  return (
    <div className={CARD}>
      <div className={CARD_HEAD}>
        <CardTitle href={href}>Inter-Branch Transfers</CardTitle>
        <div className="flex shrink-0 items-center gap-1 text-xs">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-1 py-0.5 text-xs dark:text-slate-200"
          >
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-1 py-0.5 text-xs dark:text-slate-200"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-2 p-3 lg:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
        <Tile label="Sent" value={money(summary?.sent_this_month)} working={monthLabel} icon={<FiArrowUpRight />} />
        <Tile label="Received" value={money(summary?.received_this_month)} working={monthLabel} icon={<FiArrowDownLeft />} />
        <Tile
          label="Outgoing Pending"
          value={money(summary?.outgoing_pending?.amount)}
          working={`${count(summary?.outgoing_pending?.count)} transfer(s)`}
          tone="text-amber-600 dark:text-amber-400"
          icon={<FiArrowUpRight />}
        />
        <Tile
          label="Incoming Pending"
          value={money(summary?.incoming_pending?.amount)}
          working={`${count(summary?.incoming_pending?.count)} transfer(s)`}
          tone="text-amber-600 dark:text-amber-400"
          icon={<FiArrowDownLeft />}
        />
      </div>

      <div className="px-1 pb-2">
        {loading && rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-slate-400">Loading…</p>
        ) : (
          <Table
            columns={columns as any}
            data={rows}
            perPage={8}
            noDataMessage="No inter-branch transfers this month."
          />
        )}
      </div>

      <div className={`${CARD_FOOT} gap-1.5 border-t border-[rgb(var(--c-border))] bg-slate-50 text-slate-400 dark:bg-gray-700/50 dark:text-slate-400`}>
        <FiInbox className="shrink-0 text-[11px]" />
        <span className="min-w-0 truncate">
          {monthLabel} — transfers sent or received, plus any still pending from before.
        </span>
      </div>

      <ReceiveTransferModal
        transfer={receiveTarget}
        onClose={() => setReceiveTarget(null)}
        onReceived={() => load()}
      />
    </div>
  );
};

export default InterBranchTransfersCard;
