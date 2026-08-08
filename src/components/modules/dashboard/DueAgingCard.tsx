import React from 'react';
import { FaRegHandshake } from 'react-icons/fa';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

interface Bucket {
  label: string;
  amount: number;
  parties: number;
}

interface DueAgingCardProps {
  aging?: {
    total: number;
    parties: number;
    advance: number;
    buckets: Bucket[];
  };
  isLoading?: boolean;
}

/**
 * One hue, light to dark, in bucket order — older money is darker.
 *
 * A sequential ramp rather than four categorical colours because the buckets
 * are an ordered scale, not four unrelated things; the darkening itself says
 * "this end is the problem" without needing a legend.
 */
const RAMP = ['#fcd34d', '#fbbf24', '#f59e0b', '#b45309'];

const DueAgingCard: React.FC<DueAgingCardProps> = ({ aging, isLoading }) => {
  if (isLoading && !aging) {
    return <div className="h-56 animate-pulse bg-slate-100 dark:bg-gray-800" />;
  }

  if (!aging) return null;

  const buckets = aging.buckets || [];
  // Bars are scaled against the largest bucket, not the total: with one bucket
  // holding most of the money the others would otherwise be invisible slivers.
  const max = Math.max(...buckets.map((b) => Number(b.amount) || 0), 1);

  return (
    <div className="flex flex-col overflow-hidden bg-white shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:ring-gray-700">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-gray-700">
        <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-100">
          Receivable Ageing
        </span>
        <FaRegHandshake className="shrink-0 text-amber-500" />
      </div>

      <div className="px-4 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Outstanding
        </p>
        <p className="text-2xl font-bold tabular-nums text-slate-700 dark:text-slate-100">
          {thousandSeparator(Math.round(Number(aging.total) || 0))}
        </p>
        <p className="text-[11px] text-slate-400">
          across {aging.parties} {aging.parties === 1 ? 'party' : 'parties'}
        </p>
      </div>

      <ul className="mt-3 space-y-2 px-4 pb-3">
        {buckets.map((bucket, index) => {
          const amount = Number(bucket.amount) || 0;
          const width = Math.max((amount / max) * 100, amount > 0 ? 2 : 0);

          return (
            <li key={bucket.label} className="text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-500 dark:text-slate-300">
                  {bucket.label} days
                </span>
                <span className="tabular-nums font-bold text-slate-700 dark:text-slate-100">
                  {thousandSeparator(Math.round(amount))}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden bg-slate-100 dark:bg-gray-700">
                  <div
                    className="h-full rounded-r-sm"
                    style={{
                      width: `${width}%`,
                      backgroundColor: RAMP[Math.min(index, RAMP.length - 1)],
                    }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right tabular-nums text-slate-400">
                  {bucket.parties} {bucket.parties === 1 ? 'party' : 'parties'}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {Number(aging.advance) > 0 && (
        <div className="mt-auto flex items-center justify-between bg-slate-50 px-4 py-2 text-[11px] text-slate-400 dark:bg-gray-700/50">
          <span>Advance received</span>
          <span className="tabular-nums">
            {thousandSeparator(Math.round(Number(aging.advance)))}
          </span>
        </div>
      )}
    </div>
  );
};

export default DueAgingCard;
