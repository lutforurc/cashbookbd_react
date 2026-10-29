import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { FiArrowDownLeft, FiArrowUpRight, FiCheckSquare, FiInbox, FiRotateCcw } from 'react-icons/fi';

import httpService from '../../services/httpService';
import { API_INTERBRANCH_TRANSFER_DASHBOARD_URL } from '../../services/apiRoutes';
import Table from '../../utils/others/Table';
import { CARD, CARD_FOOT, CARD_HEAD, CardTitle, Tile, money, count } from './dashboardKit';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { hasPermission } from '../../utils/permissionChecker';
import ReceiveTransferModal, { ReceivableTransfer } from '../inter-branch-transfer/ReceiveTransferModal';
import ReverseTransferModal, { ReversibleTransfer } from '../inter-branch-transfer/ReverseTransferModal';
import CategoryDropdown from '../../utils/utils-functions/CategoryDropdown';
import { formatDayMonthYear } from '../../utils/utils-functions/formatDate';
import { interBranchDashboardVisible } from '../../utils/userFeatureSettings';

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
  // Branch setting: when off the section is not drawn AND its API is not called.
  const enabled = interBranchDashboardVisible(settings);
  const permissions = settings?.data?.permissions ?? [];
  const canReceive = canAct && hasPermission(permissions, 'interbranch.transfer.receive');
  const canReverse = canAct && hasPermission(permissions, 'interbranch.transfer.reverse');
  // Undoing one branch's receipt is its own trust, not implied by receiving or
  // by the right to reverse a whole transfer.
  const canReverseReceipt = canAct && hasPermission(permissions, 'inter_branch.receipt.reverse');

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
  const [reverseTarget, setReverseTarget] = useState<
    (ReversibleTransfer & { scope: 'receipt' | 'full' }) | null
  >(null);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => now - i);
  }, []);

  // Stable option lists for the themed dropdowns.
  const monthOptions = useMemo(() => MONTHS.map((name, index) => ({ id: index + 1, name })), []);
  const yearOptions = useMemo(() => years.map((y) => ({ id: y, name: String(y) })), [years]);

  // Only the newest request may write state. Changing month/year (or branch)
  // quickly can put two requests in flight; without this the slower, older one
  // lands last and the cards show a month the filter no longer names.
  const requestSeq = useRef(0);

  const load = useCallback(() => {
    if (!branchId) return;

    const seq = ++requestSeq.current;
    setLoading(true);

    httpService
      .get(API_INTERBRANCH_TRANSFER_DASHBOARD_URL, { params: { branch_id: branchId, month, year } })
      .then((res) => {
        if (seq !== requestSeq.current) return;
        setData(res?.data?.data?.data ?? null);
      })
      .catch(() => {
        if (seq !== requestSeq.current) return;
        setData(null);
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoading(false);
      });
  }, [branchId, month, year]);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      return;
    }

    load();
  }, [enabled, load, tick]);

  const summary = data?.summary;
  const rows: any[] = Array.isArray(data?.rows) ? data.rows : [];

  const columns = [
    {
      key: 'payment_date',
      header: 'Date',
      render: (row: any) => formatDayMonthYear(row.payment_date),
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
      render: (row: any) => {
        const status = Number(row.status);
        const style =
          status === 2
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
            : status === 3
              ? 'bg-slate-200 text-slate-600 dark:bg-gray-700 dark:text-slate-300'
              : status === 4
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
        return (
          <div>
            <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${style}`}>
              {row.status_label}
              {status === 2 && row.receipt_date ? ` on ${formatDayMonthYear(row.receipt_date)}` : ''}
              {status === 2 && row.received_by_name ? ` by ${row.received_by_name}` : ''}
            </span>
            {status === 4 && row.reversal_reason ? (
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {row.reversal_reason}
                {row.reversed_by_name ? ` — ${row.reversed_by_name}` : ''}
                {row.reversed_at ? `, ${formatDayMonthYear(row.reversed_at)}` : ''}
              </p>
            ) : null}
            {status === 1 && row.last_event?.event === 'receipt_reversed' ? (
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Receipt reversed {formatDayMonthYear(row.last_event.at)}
                {row.last_event.user_name ? ` by ${row.last_event.user_name}` : ''}
                {row.last_event.branch_name ? ` (${row.last_event.branch_name})` : ''}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'action',
      header: '',
      render: (row: any) => {
        const status = Number(row.status);
        const isIncoming = row.direction === 'incoming';
        const showReceive = status === 1 && canReceive && isIncoming;
        // Incoming rows are the destination undoing its receipt; outgoing rows
        // are the sender undoing the whole transfer. Different keys.
        const showReverse = status === 2 && (isIncoming ? canReverseReceipt : canReverse);

        if (!showReceive && !showReverse) return null;

        return (
          <div className="flex items-center gap-1">
            {showReceive ? (
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
            ) : null}
            {showReverse ? (
              <button
                type="button"
                onClick={() =>
                  setReverseTarget({
                    id: row.id,
                    reference: row.reference,
                    amount: row.amount,
                    from_branch_name: row.from_branch_name,
                    to_branch_name: row.to_branch_name,
                    payment_date: row.payment_date,
                    receipt_date: row.receipt_date,
                    received_by_name: row.received_by_name,
                    scope: row.direction === 'outgoing' ? 'full' : 'receipt',
                  })
                }
                className="inline-flex items-center gap-1 rounded-sm border border-rose-300 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:border-rose-800 dark:text-rose-300"
              >
                <FiRotateCcw /> {row.direction === 'outgoing' ? 'Reverse Transfer' : 'Reverse Receipt'}
              </button>
            ) : null}
          </div>
        );
      },
    },
  ];

  const monthLabel = `${MONTHS[month - 1] ?? ''} ${year}`;

  // Hidden by the branch's "Show on dashboard" switch.
  if (!enabled) return null;

  return (
    <div className={CARD}>
      <div className={CARD_HEAD}>
        <CardTitle href={href}>Inter-Branch Transfers</CardTitle>
        <div className="flex shrink-0 items-center gap-1.5">
          <CategoryDropdown
            categoryDdl={monthOptions}
            value={String(month)}
            onChange={(option: any) => setMonth(Number(option.value))}
            placeholder="Month"
            isSearchable={false}
            ariaLabel="Month"
            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            className="w-28"
          />
          <CategoryDropdown
            categoryDdl={yearOptions}
            value={String(year)}
            onChange={(option: any) => setYear(Number(option.value))}
            placeholder="Year"
            isSearchable={false}
            ariaLabel="Year"
            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            className="w-20"
          />
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-2 p-3 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
        <Tile
          label="Sent (gross)"
          value={money(summary?.sent_gross_this_month ?? summary?.sent_this_month)}
          working={`${monthLabel} — payments dated this month`}
          icon={<FiArrowUpRight />}
        />
        <Tile
          label="Reversed"
          value={money(summary?.sent_reversed_this_month)}
          working={`${monthLabel} — reversals dated this month`}
          tone="text-rose-600 dark:text-rose-400"
          icon={<FiRotateCcw />}
        />
        <Tile
          label="Net Sent"
          value={money(summary?.sent_net_this_month)}
          working={`${monthLabel} — this month's payments less those reversed`}
          icon={<FiArrowUpRight />}
        />
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
          {monthLabel} — payments, receipts and reversals dated in this month.
        </span>
      </div>

      <ReceiveTransferModal
        transfer={receiveTarget}
        onClose={() => setReceiveTarget(null)}
        onReceived={() => load()}
      />

      <ReverseTransferModal
        // Remount per transfer, so a reason typed for one never carries to the next.
        key={reverseTarget?.id ?? 'none'}
        transfer={reverseTarget}
        scope={reverseTarget?.scope ?? 'full'}
        onClose={() => setReverseTarget(null)}
        onReversed={() => load()}
      />
    </div>
  );
};

export default InterBranchTransfersCard;
