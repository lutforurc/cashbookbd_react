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
import Table from '../../utils/others/Table';
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
 * Both lists are drawn by the shared Table component, the same one the rest of
 * the reports use -- so the columns, the cell rules and the "Columns" menu are
 * the app's, not this screen's own.
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
 * One list of invoices still to send.
 *
 * ⚠️ `keyPrefix` is not decoration. The shared Table remembers which columns a
 * reader has put away against the ROUTE plus the column keys -- so two tables on
 * one page sharing a set of keys would hide a column in both when the reader
 * meant one. The two lists carry the same columns, so the prefix is what tells
 * their choices apart. It is also why the keys do not need to name a data field:
 * every cell is drawn by its own `render`.
 */
const DeliveryLinesCard = ({
  title,
  keyPrefix,
  rows,
  loading,
  emptyText,
  accent,
  reportHref,
}: {
  title: string;
  keyPrefix: string;
  rows: any[];
  loading: boolean;
  emptyText: string;
  accent: string;
  reportHref: string;
}) => {
  const columns = [
    {
      key: `${keyPrefix}-sl`,
      header: 'Sl.',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (_row: any, index: number) => index + 1,
    },
    {
      key: `${keyPrefix}-vr-no`,
      header: 'Invoice No.',
      render: (row: any) =>
        row.vr_no ? (
          <Link
            to={`${routes.inv_delivery}?invoice_no=${encodeURIComponent(row.vr_no)}`}
            title="Open this invoice on the Delivery screen"
            className="font-semibold text-primary hover:underline dark:text-secondary"
          >
            {row.vr_no}
          </Link>
        ) : (
          row.vr_no
        ),
    },
    {
      key: `${keyPrefix}-date`,
      header: 'Date',
      render: (row: any) => row.vr_date,
    },
    {
      key: `${keyPrefix}-customer`,
      header: 'Customer',
      render: (row: any) => row.customer_name || '-',
    },
    {
      key: `${keyPrefix}-ordered`,
      header: 'Ordered',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => row.ordered,
    },
    {
      key: `${keyPrefix}-delivered`,
      header: 'Delivered',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => row.delivered,
    },
    {
      key: `${keyPrefix}-pending`,
      header: 'Pending',
      headerClass: 'text-right',
      cellClass: `text-right font-semibold ${accent}`,
      render: (row: any) => row.pending,
    },
    {
      key: `${keyPrefix}-status`,
      header: 'Status',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => {
        const meta = statusMeta(row.status);
        return <span className={`font-semibold ${meta.cls}`}>{meta.label}</span>;
      },
    },
  ];

  const pendingTotal = rows.reduce((sum, row) => sum + Number(row.pending || 0), 0);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <Link
          to={reportHref}
          title="Open the delivery report"
          className="truncate text-sm font-bold text-slate-700 hover:underline dark:text-slate-100"
        >
          {title}
        </Link>
        <span className="shrink-0 text-[11px] font-normal text-slate-400">
          {count(rows.length)} invoice{rows.length === 1 ? '' : 's'}
        </span>
      </div>

      <Table
        columns={columns}
        data={rows}
        noDataMessage={loading ? 'Loading…' : emptyText}
        footerRows={
          rows.length > 0
            ? [
                [
                  {
                    label: 'Still to send across these invoices',
                    colSpan: 6,
                    className: 'text-right font-normal text-slate-500 dark:text-slate-300',
                  },
                  {
                    label: <span className={`font-bold tabular-nums ${accent}`}>{qty(pendingTotal)}</span>,
                    className: 'text-right',
                  },
                  { label: '' },
                ],
              ]
            : undefined
        }
      />
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

      <div className="flex flex-col gap-5">
        <DeliveryLinesCard
          title="Partial Deliveries"
          keyPrefix="partial"
          rows={partialRows}
          loading={loading}
          emptyText="No partially delivered invoices in this window."
          accent="text-amber-600 dark:text-amber-400"
          reportHref={reportHref}
        />

        <DeliveryLinesCard
          title="Due for Delivery"
          keyPrefix="due"
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
