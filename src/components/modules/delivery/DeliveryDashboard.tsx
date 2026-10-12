import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaCheckCircle,
  FaClipboardList,
  FaHourglassHalf,
  FaTimesCircle,
  FaTruck,
  FaTruckLoading,
} from 'react-icons/fa';

import HelmetTitle from '../../utils/others/HelmetTitle';
import httpService from '../../services/httpService';
import { API_DELIVERY_REPORT_URL } from '../../services/apiRoutes';
import routes from '../../services/appRoutes';
import { reportUrl } from '../../utils/hooks/useReportQuery';
import {
  DashboardRangeBar,
  rangeCaption,
  useAutoRefresh,
  useDashboardRange,
  useViewBranch,
} from '../dashboard/dashboardRange';
import {
  CARD,
  CARD_FOOT,
  CARD_HEAD,
  DASHBOARD_FADE,
  DASHBOARD_GRID,
  Tile,
  count,
} from '../dashboard/dashboardKit';

/**
 * Delivery System Dashboard: the state of the delivery system at a glance.
 *
 * One read -- the delivery report -- answers what the page is asked: how many
 * invoices are complete, partial or not delivered at all, and how much is still
 * on the road. Underneath, the same rows are split into the two lists a
 * dispatcher works from, because they are two different jobs:
 *
 *   - PARTIAL deliveries: something has gone out, something has not. The next
 *     trip is planned against what is still pending on them.
 *   - DUE FOR DELIVERY: nothing has gone out yet. The invoices whose goods are
 *     sitting on the floor waiting to be sent at all.
 *
 * Same endpoint the Delivery Report reads (mode = delivery), so the two never
 * disagree; only the shape differs. The report's own links carry the dates the
 * dashboard was showing, so opening it argues over the same window.
 */

/** A quantity, not money -- the report counts what was ordered and sent, not what it sold for. */
const qty = (value: number | null | undefined) =>
  Number(value ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const statusMeta = (status: string) => {
  switch (status) {
    case 'complete':
      return { label: 'Complete', cls: 'text-green-600 dark:text-green-400' };
    case 'partial':
      return { label: 'Partial', cls: 'text-amber-600 dark:text-amber-400' };
    case 'none':
      return { label: 'Not delivered', cls: 'text-red-600 dark:text-red-400' };
    default:
      return { label: 'Stock on invoice', cls: 'text-slate-500 dark:text-slate-400' };
  }
};

/** The longest wait first, so the invoice that has been pending the most is on top. */
const byPendingDesc = (a: any, b: any) => Number(b.pending || 0) - Number(a.pending || 0);

/**
 * One list of invoices still to send -- the same table for both cards, so the
 * two cannot drift apart in columns, alignment or empty state.
 */
const DeliveryLinesCard = ({
  title,
  rows,
  loading,
  emptyText,
  accent,
  reportHref,
}: {
  title: string;
  rows: any[];
  loading: boolean;
  emptyText: string;
  accent: string;
  reportHref: string;
}) => {
  const pendingTotal = rows.reduce((sum, row) => sum + Number(row.pending || 0), 0);

  return (
    <div className={CARD}>
      <div className={CARD_HEAD}>
        <Link to={reportHref} title="Open the delivery report" className="truncate hover:underline">
          {title}
        </Link>
        <span className="shrink-0 text-[11px] font-normal text-slate-400">
          {count(rows.length)} invoice{rows.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-[rgb(var(--c-table-head))]">
            <tr>
              <th className="px-3 py-2 text-center">Sl.</th>
              <th className="px-3 py-2">Invoice No.</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2 text-right">Ordered</th>
              <th className="px-3 py-2 text-right">Delivered</th>
              <th className="px-3 py-2 text-right">Pending</th>
              <th className="px-3 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center text-gray-500">
                  {loading ? 'Loading…' : emptyText}
                </td>
              </tr>
            )}
            {rows.map((row, index) => {
              const meta = statusMeta(row.status);
              return (
                <tr key={row.mtm_id} className="border-b bg-[rgb(var(--c-table-body))]">
                  <td className="px-3 py-2 text-center">{index + 1}</td>
                  <td className="px-3 py-2">{row.vr_no}</td>
                  <td className="px-3 py-2">{row.vr_date}</td>
                  <td className="px-3 py-2">{row.customer_name || '-'}</td>
                  <td className="px-3 py-2 text-right">{row.ordered}</td>
                  <td className="px-3 py-2 text-right">{row.delivered}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${accent}`}>{row.pending}</td>
                  <td className={`px-3 py-2 text-center font-semibold ${meta.cls}`}>
                    {meta.label}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && (
        <div
          className={`${CARD_FOOT} justify-between gap-3 border-t border-[rgb(var(--c-border))] bg-slate-50 dark:bg-gray-700/50`}
        >
          <span className="min-w-0 truncate text-slate-500 dark:text-slate-300">
            Still to send across these invoices
          </span>
          <span className={`shrink-0 font-bold tabular-nums ${accent}`}>{qty(pendingTotal)}</span>
        </div>
      )}
    </div>
  );
};

const DeliveryDashboard = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [settled, setSettled] = useState(false);

  const range = useDashboardRange();
  const view = useViewBranch();
  const { tick, refresh, refreshedAt, markRefreshed } = useAutoRefresh();

  useEffect(() => {
    let alive = true;
    setLoading(true);

    httpService
      .post(API_DELIVERY_REPORT_URL, {
        from: range.from || undefined,
        to: range.to || undefined,
        mode: 'delivery',
      })
      .then((res) => {
        if (!alive) return;
        const data = res?.data?.data?.data;
        setRows(Array.isArray(data) ? data : []);
        setSettled(true);
        markRefreshed();
      })
      .catch(() => {
        if (!alive) return;
        setRows([]);
        setSettled(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [range.from, range.to, tick]);

  const summary = useMemo(() => {
    const counts = { complete: 0, partial: 0, none: 0 };
    rows.forEach((row) => {
      const status = String(row?.status ?? '');
      if (status === 'complete' || status === 'partial' || status === 'none') {
        counts[status] += 1;
      }
    });
    return counts;
  }, [rows]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          ordered: acc.ordered + Number(row.ordered || 0),
          delivered: acc.delivered + Number(row.delivered || 0),
          pending: acc.pending + Number(row.pending || 0),
        }),
        { ordered: 0, delivered: 0, pending: 0 },
      ),
    [rows],
  );

  /** Something has gone out, something has not -- the next trip is planned off these. */
  const partialRows = useMemo(
    () =>
      rows
        .filter((row) => Number(row.delivered || 0) > 0 && Number(row.pending || 0) > 0)
        .sort(byPendingDesc),
    [rows],
  );

  /** Nothing has gone out yet -- the goods are on the floor waiting to be sent. */
  const dueRows = useMemo(
    () =>
      rows
        .filter((row) => Number(row.delivered || 0) <= 0 && Number(row.pending || 0) > 0)
        .sort(byPendingDesc),
    [rows],
  );

  const reportHref = reportUrl(routes.report_delivery, { from: range.from, to: range.to });

  return (
    <div>
      <HelmetTitle title="Delivery System" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-slate-700 dark:text-slate-100">
            Delivery System
          </h1>
          <p className="text-xs text-slate-400">
            {rangeCaption(range.from, range.to, refreshedAt) || 'Reading deliveries…'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={routes.inv_delivery}
            className="inline-flex items-center gap-2 rounded-sm border border-[rgb(var(--c-border))] bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary dark:bg-gray-800 dark:text-slate-100"
          >
            <FaTruckLoading className="text-base" />
            Open Delivery
          </Link>
          <DashboardRangeBar range={range} view={view} onRefresh={refresh} busy={loading} />
        </div>
      </div>

      <div
        className={`${DASHBOARD_GRID} gap-4 mb-4 ${DASHBOARD_FADE} ${
          settled ? '' : 'opacity-60'
        }`}
      >
        <Tile
          label="Invoices"
          value={count(rows.length)}
          working="delivery invoices in this window"
          icon={<FaClipboardList className="text-[11px] text-slate-400" />}
        />
        <Tile
          label="Complete"
          value={count(summary.complete)}
          working="everything ordered has gone out"
          icon={<FaCheckCircle className="text-[11px] text-green-500" />}
          tone="text-green-600 dark:text-green-400"
        />
        <Tile
          label="Partial"
          value={count(summary.partial)}
          working="some lines still to send"
          icon={<FaHourglassHalf className="text-[11px] text-amber-500" />}
          tone="text-amber-600 dark:text-amber-400"
        />
        <Tile
          label="Not delivered"
          value={count(summary.none)}
          working="nothing has gone out yet"
          icon={<FaTimesCircle className="text-[11px] text-red-500" />}
          tone="text-red-600 dark:text-red-400"
        />

        <Tile
          label="Ordered"
          value={qty(totals.ordered)}
          working="quantity billed across these invoices"
          icon={<FaClipboardList className="text-[11px] text-slate-400" />}
        />
        <Tile
          label="Delivered"
          value={qty(totals.delivered)}
          working="quantity already dispatched"
          icon={<FaTruck className="text-[11px] text-slate-400" />}
          tone="text-primary dark:text-secondary"
        />
        <Tile
          label="Pending"
          value={qty(totals.pending)}
          working="quantity still to load"
          icon={<FaHourglassHalf className="text-[11px] text-slate-400" />}
          lead
          tone={
            totals.pending > 0
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-700 dark:text-slate-100'
          }
        />
      </div>

      <div className="flex flex-col gap-4">
        <DeliveryLinesCard
          title="Partial Deliveries"
          rows={partialRows}
          loading={loading}
          emptyText="No partially delivered invoices in this window."
          accent="text-amber-600 dark:text-amber-400"
          reportHref={reportHref}
        />

        <DeliveryLinesCard
          title="Due for Delivery"
          rows={dueRows}
          loading={loading}
          emptyText="Nothing due — every invoice in this window has gone out."
          accent="text-red-600 dark:text-red-400"
          reportHref={reportHref}
        />
      </div>
    </div>
  );
};

export default DeliveryDashboard;
