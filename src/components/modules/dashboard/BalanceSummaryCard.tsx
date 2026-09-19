import React from 'react';
import { useSelector } from 'react-redux';
import { FaArrowDown, FaArrowUp, FaRegCalendarAlt, FaRegClock, FaWallet } from 'react-icons/fa';

import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import Sparkline from './Sparkline';

/**
 * The cash-book card: trx date, today's received and payment, and the running
 * book balance, each with its fortnight's trend beside it.
 *
 * Reads getDashboard()'s payload (figures, branch name, last update) and
 * getDashboardSummary()'s sparklines straight from the store, so a page that
 * shows it only has to dispatch both — the shop and the trade both do.
 */
const BalanceSummaryCard = ({ rowClass = 'px-4 py-2.5' }: { rowClass?: string }) => {
  const dashboard = useSelector((state: any) => state.dashboard);
  const settings = useSelector((s: any) => s.settings);
  const summaryData = useSelector((s: any) => s.dashboard?.summary?.data);

  return (
    <div className="group relative flex flex-col overflow-hidden bg-white text-[rgb(var(--c-text))] shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-slate-300 dark:bg-gray-800 dark:text-[rgb(var(--c-text))] dark:ring-gray-700">
      <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] bg-white px-4 py-3 dark:bg-gray-800">
        <span className="truncate text-sm font-bold tracking-wide text-slate-700 dark:text-slate-100">
          {dashboard?.data?.branch?.name}
        </span>
        <FaWallet className="shrink-0 text-indigo-500" />
      </div>

      <div className="divide-y divide-slate-100 dark:divide-gray-700">
        <div className={`flex items-center gap-3 ${rowClass}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-slate-300">
            <FaRegCalendarAlt className="text-sm" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Trx Date
            </p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-100">
              {settings?.data?.trx_dt}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-3 ${rowClass}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <FaArrowDown className="text-sm" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Today Received
            </p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {dashboard?.data?.todayReceived?.debit > 0
                ? thousandSeparator(dashboard?.data?.todayReceived?.debit)
                : 0}
            </p>
          </div>
          {/* Trend sits beside the figure rather than in its own tile,
              so the card answers "how much" and "which way" together. */}
          <Sparkline
            values={summaryData?.kpis?.received?.spark ?? []}
            stroke="#10b981"
            className="h-16 min-w-0 flex-1"
            ariaLabel="Received over the last 14 days"
          />
        </div>

        <div className={`flex items-center gap-3 ${rowClass}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
            <FaArrowUp className="text-sm" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Today Payment
            </p>
            <p className="text-base font-bold text-rose-600 dark:text-rose-400">
              {dashboard?.data?.todayReceived?.credit > 0
                ? thousandSeparator(dashboard?.data?.todayReceived?.credit)
                : 0}
            </p>
          </div>
          <Sparkline
            values={summaryData?.kpis?.payment?.spark ?? []}
            stroke="#f43f5e"
            className="h-16 min-w-0 flex-1"
            ariaLabel="Payment over the last 14 days"
          />
        </div>

        <div className={`flex items-center gap-3 ${rowClass}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
            <FaWallet className="text-sm" />
          </span>
          <div className="min-w-0 flex-1">
            {/* ⚠️ "BOOK BALANCE", NOT "BALANCE". This is every taka
                through the cash head since the branch opened, not the
                drawer at the start of the day -- and "Balance" on a
                cash-book card beside a received/payment pair reads as
                today's, which is a different figure entirely. */}
            <p
              className="text-[11px] font-medium uppercase tracking-wide text-slate-400"
              title="Cash book balance — everything through the cash head since the branch opened"
            >
              Book Balance
            </p>
            <p className="text-base font-bold text-indigo-600 dark:text-indigo-300">
              {thousandSeparator(
                (Number(dashboard?.data?.totalTransaction?.debit) || 0) -
                  (Number(dashboard?.data?.totalTransaction?.credit) || 0),
              )}
            </p>
          </div>
          <Sparkline
            values={summaryData?.kpis?.balance?.spark ?? []}
            stroke="#6366f1"
            className="h-16 min-w-0 flex-1"
            ariaLabel="Balance over the last 14 days"
          />
        </div>
      </div>

      <div className="mt-auto flex items-center gap-1.5 bg-slate-50 px-4 py-2 text-xs text-slate-400 dark:bg-gray-700/50 dark:text-slate-400">
        <FaRegClock className="text-[11px]" />
        <span>Last updated: {dashboard?.data?.last_update}</span>
      </div>
    </div>
  );
};

export default BalanceSummaryCard;
