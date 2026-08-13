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
 * Four buckets, and only one of them is allowed to shout.
 *
 * The card used to draw all four in bright amber, which is the worst hue to
 * spend a working day beside: yellow reads brighter than anything else at the
 * same lightness, so four amber bars on a dark card glare long before the
 * contrast figures say anything is wrong.
 *
 * The ramp is muted now -- grey, then two low-chroma earth tones -- and the
 * only saturated colour on the card is the overdue one. That is also the only
 * bucket anyone has to do something about, so the eye is spent where it buys
 * something. A book with nothing past sixty days draws no colour at all.
 *
 * The values live in tokens.css, with a further-dimmed set for dark mode: a
 * colour that reads as muted on white is still bright against a dark surface.
 */
const SEVERITY = [
  { bar: 'bg-[rgb(var(--c-age-current))]', text: 'text-slate-700 dark:text-slate-100' },
  { bar: 'bg-[rgb(var(--c-age-watch))]', text: 'text-slate-700 dark:text-slate-100' },
  { bar: 'bg-[rgb(var(--c-age-chase))]', text: 'text-[rgb(var(--c-age-chase))]' },
  { bar: 'bg-[rgb(var(--c-age-overdue))]', text: 'text-[rgb(var(--c-age-overdue))]' },
];

const severityFor = (index: number) => SEVERITY[Math.min(index, SEVERITY.length - 1)];

const DueAgingCard: React.FC<DueAgingCardProps> = ({ aging, isLoading }) => {
  if (isLoading && !aging) {
    return <div className="h-56 animate-pulse bg-slate-100 dark:bg-gray-800" />;
  }

  if (!aging) return null;

  const buckets = aging.buckets || [];
  const total = buckets.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  /**
   * Anything past sixty days, which is the figure somebody has to act on.
   *
   * The outstanding total is the headline but it is not the question -- a large
   * book with everything current is healthy, and a small one that is all ninety
   * days old is not.
   */
  const overdue = buckets
    .slice(2)
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const overdueParties = buckets.slice(2).reduce((sum, b) => sum + (Number(b.parties) || 0), 0);
  const overdueShare = total > 0 ? (overdue / total) * 100 : 0;

  const share = (amount: number) => (total > 0 ? (amount / total) * 100 : 0);

  return (
    <div className="flex flex-col overflow-hidden bg-white shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:ring-gray-700">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-gray-700">
        <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-100">
          Receivable Ageing
        </span>
        <FaRegHandshake className="shrink-0 text-slate-400" />
      </div>

      <div className="px-4 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Outstanding
        </p>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p className="text-2xl font-bold tabular-nums text-slate-700 dark:text-slate-100">
            {thousandSeparator(Math.round(Number(aging.total) || 0))}
          </p>
          {/* The one number worth reading twice, and only shown when there is
              something to read. */}
          {overdue > 0 && (
            <span className="rounded-full bg-[rgb(var(--c-age-overdue))]/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-[rgb(var(--c-age-overdue))]">
              {overdueShare.toFixed(0)}% over 60 days
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-400">
          across {aging.parties} {aging.parties === 1 ? 'party' : 'parties'}
        </p>
      </div>

      {/* The whole book as one bar. Four separate bars say how big each bucket
          is; this says what the book is made of, which is the thing a glance is
          actually after. */}
      {total > 0 && (
        <div className="mt-3 flex h-2 gap-px overflow-hidden px-4">
          {buckets.map((bucket, index) => {
            const width = share(Number(bucket.amount) || 0);
            if (width <= 0) return null;

            return (
              <div
                key={`stack-${bucket.label}`}
                className={`h-full ${severityFor(index).bar}`}
                style={{ width: `${width}%` }}
                title={`${bucket.label} days — ${width.toFixed(0)}%`}
              />
            );
          })}
        </div>
      )}

      <ul className="mt-3 space-y-2.5 px-4 pb-3">
        {buckets.map((bucket, index) => {
          const amount = Number(bucket.amount) || 0;
          const severity = severityFor(index);
          // Scaled against the total, so a row's bar and its share are the same
          // fact told twice rather than two different ones.
          const width = share(amount);

          return (
            <li key={bucket.label} className="text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-300">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${severity.bar}`} />
                  {bucket.label} days
                </span>
                <span
                  className={`tabular-nums font-bold ${
                    index >= 2 && amount > 0
                      ? severity.text
                      : 'text-slate-700 dark:text-slate-100'
                  }`}
                >
                  {thousandSeparator(Math.round(amount))}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${severity.bar}`}
                    style={{ width: `${Math.max(width, amount > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <span className="w-9 shrink-0 text-right tabular-nums font-semibold text-slate-500 dark:text-slate-300">
                  {width >= 1 ? `${width.toFixed(0)}%` : amount > 0 ? '<1%' : '—'}
                </span>
                <span className="w-16 shrink-0 text-right tabular-nums text-slate-400">
                  {bucket.parties} {bucket.parties === 1 ? 'party' : 'parties'}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto">
        {/* Said in words, because a row of figures does not tell anyone what to
            do on Monday morning. */}
        {overdue > 0 && (
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-[rgb(var(--c-age-overdue))]/5 px-4 py-2 text-[11px] dark:border-gray-700">
            <span className="font-semibold text-[rgb(var(--c-age-overdue))]">
              {thousandSeparator(Math.round(overdue))} to chase
            </span>
            <span className="tabular-nums text-slate-400">
              {overdueParties} {overdueParties === 1 ? 'party' : 'parties'} over 60 days
            </span>
          </div>
        )}

        {Number(aging.advance) > 0 && (
          <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-[11px] text-slate-400 dark:bg-gray-700/50">
            <span>Advance received</span>
            <span className="tabular-nums">
              {thousandSeparator(Math.round(Number(aging.advance)))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DueAgingCard;
