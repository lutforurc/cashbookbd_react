import React from 'react';
import { FaArrowDown, FaArrowUp, FaRegCalendarAlt, FaWallet } from 'react-icons/fa';
import dayjs from 'dayjs';

import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { CardTitle } from './dashboardKit';

/**
 * The Cash Book card for the chosen range, drawn the way the today card is
 * drawn so the two read as a pair side by side: the range where the today
 * card has the trx date, received and payment over it where that card has
 * today's, and the book balance as on its last day where that card has the
 * balance as on today.
 *
 * ⚠️ NOT a replacement for the today card. That one is the till at the desk
 * and stays on the transaction date whatever the range says; this one is
 * the month's (or last month's) answer to the same three questions.
 */
const RangeCashCard = ({
  cash,
  rowClass = 'px-4 py-2.5',
  href,
}: {
  cash: { from: string; to: string; received: number; payment: number; balance: number } | null | undefined;
  rowClass?: string;
  /** The Cash Book report over this range. */
  href?: string;
}) => {
  if (!cash) return null;

  const day = (value: string) => dayjs(value).format('DD/MM/YYYY');

  return (
    <div className="flex flex-col overflow-hidden bg-white text-[rgb(var(--c-text))] shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-slate-300 dark:bg-gray-800 dark:ring-gray-700">
      <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
        <span className="min-w-0 text-sm font-bold tracking-wide text-slate-700 dark:text-slate-100">
          <CardTitle href={href}>Cash Book · Range</CardTitle>
        </span>
        <FaWallet className="shrink-0 text-indigo-500" />
      </div>

      <div className="divide-y divide-slate-100 dark:divide-gray-700">
        <div className={`flex items-center gap-3 ${rowClass}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-slate-300">
            <FaRegCalendarAlt className="text-sm" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Range</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-100">
              {day(cash.from)} – {day(cash.to)}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-3 ${rowClass}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <FaArrowDown className="text-sm" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Received</p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {cash.received > 0 ? thousandSeparator(cash.received) : 0}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-3 ${rowClass}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
            <FaArrowUp className="text-sm" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Payment</p>
            <p className="text-base font-bold text-rose-600 dark:text-rose-400">
              {cash.payment > 0 ? thousandSeparator(cash.payment) : 0}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-3 ${rowClass}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
            <FaWallet className="text-sm" />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="text-[11px] font-medium uppercase tracking-wide text-slate-400"
              title={`Cash book balance as on ${day(cash.to)} — everything through the cash head since the branch opened`}
            >
              Book Balance · {day(cash.to)}
            </p>
            <p className="text-base font-bold text-indigo-600 dark:text-indigo-300">
              {thousandSeparator(cash.balance)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-auto bg-slate-50 px-4 py-2 text-xs text-slate-400 dark:bg-gray-700/50">
        Net {cash.received - cash.payment >= 0 ? '+' : '−'}
        {thousandSeparator(Math.abs(cash.received - cash.payment))} over the range
      </div>
    </div>
  );
};

export default RangeCashCard;
