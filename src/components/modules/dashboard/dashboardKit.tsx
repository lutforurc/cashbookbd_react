import React from 'react';

/**
 * The few pieces every vertical dashboard draws its own way of.
 *
 * ⚠️ SHARED ON PURPOSE, AND `money()` IS THE REASON. Each dashboard was going to
 * carry its own copy of these six, which works until somebody fixes a rounding
 * in one of them: two screens then format the same taka differently and the
 * desk has to work out which figure to believe. The rules below are not
 * formatting preferences, they are claims about what a figure means — `money()`
 * exists precisely because the obvious helper gets nought wrong — and a claim
 * with two copies is a claim that will disagree with itself.
 *
 * ⚠️ AND `money()` IS NOT thousandSeparator. That one returns "-" for nought,
 * and a tile printing "-" makes "the answer is zero" and "this figure could not
 * be read" look identical — which is the exact question a tile is asked. It is
 * still right where it already appears, reading an empty drawer on the shop's
 * cash-book card.
 *
 * en-IN, so lakh and crore group the way every other screen in this product
 * groups them. The `(-)` is soldUnitReport's habit and is kept for the same
 * reason.
 */
export const money = (value: number | null | undefined) => {
  const amount = Math.trunc(Number(value ?? 0));
  return amount < 0
    ? `(-) ${Math.abs(amount).toLocaleString('en-IN')}`
    : amount.toLocaleString('en-IN');
};

export const count = (value: number | null | undefined) => String(Math.trunc(Number(value ?? 0)));

export const share = (part: number, whole: number) =>
  !whole ? 0 : Math.min(100, Math.max(0, Math.round((part / whole) * 100)));

/**
 * The card grid: as many columns as 18rem cards fit in the space the page
 * actually has, not in the viewport. `lg:grid-cols-4` counted the sidebar as
 * room and squeezed four cards into 190px each on a 1024px screen -- a name
 * column of nothing beside a truncated figure. Construction had this right.
 */
export const DASHBOARD_GRID = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))]';

export const CARD =
  'flex flex-col overflow-hidden bg-white text-[rgb(var(--c-text))] shadow-sm ring-1 ring-slate-200 transition hover:shadow-md dark:bg-gray-800 dark:text-[rgb(var(--c-text))] dark:ring-gray-700';

export const CARD_HEAD =
  'flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3 text-sm font-bold tracking-wide text-slate-700 dark:text-slate-100';

/** One tile: the figure, and underneath it the sum that produced it. */
export const Tile = ({
  label,
  value,
  working,
  icon,
  tone,
  lead,
  hint,
}: {
  label: string;
  value: string;
  working?: string;
  icon?: JSX.Element;
  tone?: string;
  lead?: boolean;
  /** What the label is short for, on hover. */
  hint?: string;
}) => (
  <div
    className={`flex flex-col justify-between px-4 py-3 shadow-sm ring-1 transition hover:shadow-md ${
      lead
        ? 'bg-primary/5 ring-primary/40 dark:bg-secondary/10 dark:ring-secondary/40'
        : 'bg-white ring-slate-200 dark:bg-gray-800 dark:ring-gray-700'
    }`}
  >
    <div
      className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400"
      title={hint}
    >
      {icon}
      <span
        className={`truncate ${
          hint ? 'cursor-help decoration-dotted underline-offset-2 hover:underline' : ''
        }`}
      >
        {label}
      </span>
    </div>
    <div className={`mt-1 text-2xl font-bold ${tone ?? 'text-slate-700 dark:text-slate-100'}`}>
      {value}
    </div>
    {/* ⚠️ The working is on the tile deliberately. "2,57,45,000 outstanding" is
        quoted at meetings by people who did not run the report, and "still to
        collect on 6 sales" can be argued with where a bare figure can only be
        believed. */}
    {working ? (
      <div className="mt-0.5 truncate text-[11px] text-slate-400" title={working}>
        {working}
      </div>
    ) : null}
  </div>
);
