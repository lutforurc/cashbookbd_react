import React from 'react';
import { FaArrowDown, FaArrowUp, FaMinus } from 'react-icons/fa';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import Sparkline from './Sparkline';

interface KpiValue {
  value: number;
  previous: number;
  spark: number[];
}

interface KpiRowProps {
  kpis?: Record<string, KpiValue>;
  isLoading?: boolean;
  trxDate?: string;
}

/**
 * Fixed order, fixed hue per tile.
 *
 * The hue is decoration — the label carries identity — so it never rotates
 * with the data. Green and red are deliberately absent: they are reserved for
 * genuine warnings (ageing debt, negative stock), and paying a supplier is not
 * a bad outcome that deserves a red number.
 */
const TILES: Array<{
  key: string;
  label: string;
  colour: string;
  money?: boolean;
}> = [
  // Received, payment and balance are not here on purpose: the branch summary
  // card already carries all three, now with their own sparklines. Repeating
  // them would be the same number twice on one screen.
  { key: 'sales', label: 'Today Sales', colour: '#14b8a6', money: true },
  { key: 'purchase', label: 'Today Purchase', colour: '#f59e0b', money: true },
  { key: 'newCustomers', label: 'New Customers', colour: '#06b6d4' },
  { key: 'vouchers', label: 'Today Vouchers', colour: '#64748b' },
];

const formatValue = (value: number, money?: boolean) => {
  const n = Math.round(Number(value) || 0);

  // thousandSeparator renders zero as "-", which reads as "no data" rather
  // than "nothing came in today". The existing balance card prints 0 here, so
  // these tiles do the same.
  if (n === 0) return '0';

  return money ? thousandSeparator(n) : String(n);
};

/**
 * Percentage change against the previous day.
 *
 * Returns null when there is no baseline: "up from zero" is not a percentage,
 * and printing ∞ or 100% there would invent a trend the data doesn't support.
 */
const changePercent = (value: number, previous: number): number | null => {
  const prev = Number(previous) || 0;
  if (prev === 0) return null;
  return ((Number(value) || 0) - prev) / Math.abs(prev) * 100;
};

/**
 * "Today" on this dashboard is the branch's day-close transaction date, not the
 * server date — the two are routinely days apart, so the date is printed rather
 * than left for the reader to assume.
 */
const formatTrxDate = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const KpiTile: React.FC<{
  label: string;
  colour: string;
  money?: boolean;
  kpi?: KpiValue;
}> = ({ label, colour, money, kpi }) => {
  const value = kpi?.value ?? 0;
  const change = changePercent(value, kpi?.previous ?? 0);
  const spark = kpi?.spark ?? [];

  const Arrow = change === null || change === 0 ? FaMinus : change > 0 ? FaArrowUp : FaArrowDown;

  return (
    <div className="flex flex-col overflow-hidden bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-slate-300 dark:bg-gray-800 dark:ring-gray-700">
      <div className="px-3 pt-2.5">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
          {label}
        </p>

        <div className="mt-0.5 flex items-baseline justify-between gap-2">
          <span className="truncate text-lg font-bold tabular-nums text-slate-700 dark:text-slate-100">
            {formatValue(value, money)}
          </span>

          {/* Direction stays in muted ink: "payment is up" is information,
              not an alarm, so it must not read as one. */}
          <span
            className="flex shrink-0 items-center gap-1 text-[10px] font-semibold tabular-nums text-slate-400 dark:text-slate-400"
            title="Compared with the previous day"
          >
            <Arrow className="text-[8px]" />
            {change === null ? '—' : `${Math.abs(change).toFixed(0)}%`}
          </span>
        </div>
      </div>

      <Sparkline
        values={spark}
        stroke={colour}
        className="mt-1 h-7 w-full"
        ariaLabel={`${label} over the last ${spark.length} days`}
      />
    </div>
  );
};

const KpiRow: React.FC<KpiRowProps> = ({ kpis, isLoading, trxDate }) => {
  if (isLoading && !kpis) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((tile) => (
          <div
            key={tile.key}
            className="h-[86px] animate-pulse bg-slate-100 dark:bg-gray-800"
          />
        ))}
      </div>
    );
  }

  if (!kpis) return null;

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">
          Today at a glance
          {trxDate && (
            <span className="ml-2 font-semibold normal-case tracking-normal text-slate-400">
              Trx Date: {formatTrxDate(trxDate)}
            </span>
          )}
        </h3>
        <span className="text-[10px] text-slate-400">
          change vs previous day · sparkline last 14 days
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((tile) => (
          <KpiTile
            key={tile.key}
            label={tile.label}
            colour={tile.colour}
            money={tile.money}
            kpi={kpis[tile.key]}
          />
        ))}
      </div>
    </div>
  );
};

export default KpiRow;
