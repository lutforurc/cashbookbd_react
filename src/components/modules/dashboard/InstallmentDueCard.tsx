import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaExclamationTriangle,
  FaHourglassHalf,
  FaRegCalendarCheck,
} from 'react-icons/fa';
import routes from '../../services/appRoutes';
import { money, count } from './dashboardKit';

interface Bucket {
  count: number;
  amount: number;
}

interface InstallmentDueCardProps {
  installments?: {
    days: number;
    as_of: string;
    overdue: Bucket;
    today: Bucket;
    upcoming: Bucket;
  };
  isLoading?: boolean;
}

/**
 * Installments falling due: late, today, and the window ahead.
 *
 * ⚠️ THREE BUCKETS, AND "TODAY" IS THE ONE WORTH THE CARD. A shop collecting
 * installments works a day at a time — what is late and has to be chased, what
 * is due today and will walk in, and what is coming next week. Overdue plus a
 * "due soon" total cannot say the middle one, so the day's own work was
 * invisible in the very figure meant to list it.
 *
 * ⚠️ NOTHING IS HIDDEN WHEN NOTHING IS THERE. Every row is drawn even at zero,
 * unlike most cards here: "nothing overdue" is an answer somebody opens this
 * page for, and a band that vanished on a good month would send them to the due
 * list to check.
 *
 * ⚠️ AND THE DAYS ARE THE BRANCH'S, NOT THE CALENDAR'S, so this can disagree
 * with the due-installments screen and the real estate dashboard, which both
 * count on today's calendar date. Every other card on this page is read as at
 * the branch's day, and a card headed "Today" beside them has to mean the same
 * day. The footer says so rather than leaving the reader to find out.
 */
const InstallmentDueCard: React.FC<InstallmentDueCardProps> = ({
  installments,
  isLoading,
}) => {
  if (isLoading && !installments) {
    return <div className="h-56 animate-pulse bg-slate-100 dark:bg-gray-800" />;
  }

  if (!installments) return null;

  const days = Number(installments.days) || 7;
  const bucket = (key: keyof typeof installments) =>
    (installments[key] as Bucket) ?? { count: 0, amount: 0 };

  const rows = [
    {
      key: 'overdue',
      label: 'Overdue',
      hint: 'past the due date',
      icon: <FaExclamationTriangle className="text-sm" />,
      chip: 'bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300',
      amount: 'text-rose-600 dark:text-rose-400',
    },
    {
      key: 'today',
      label: 'Due Today',
      hint: 'due today',
      icon: <FaRegCalendarCheck className="text-sm" />,
      chip: 'bg-primary/10 text-primary dark:bg-secondary/15 dark:text-secondary',
      amount: 'text-primary dark:text-secondary',
    },
    {
      key: 'upcoming',
      label: `Next ${days} ${days === 1 ? 'day' : 'days'}`,
      hint: `falling due inside ${days} days`,
      icon: <FaHourglassHalf className="text-sm" />,
      chip: 'bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-300',
      amount: 'text-amber-600 dark:text-amber-400',
    },
  ] as const;

  return (
    <div className="flex flex-col overflow-hidden bg-white shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:ring-gray-700">
      <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
        <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-100">
          Installments Due
        </span>
        <Link
          to={routes.due_installment_list}
          className="shrink-0 text-xs font-normal text-primary hover:underline dark:text-secondary"
        >
          Due list →
        </Link>
      </div>

      <div className="flex-1 divide-y divide-slate-100 dark:divide-gray-700">
        {rows.map((row) => {
          const { count: n, amount } = bucket(row.key);

          return (
            <div
              key={row.key}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${row.chip}`}
              >
                {row.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  {row.label}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {count(n)} {n === 1 ? 'installment' : 'installments'} {row.hint}
                </p>
              </div>
              <span
                className={`shrink-0 text-lg font-bold tabular-nums ${row.amount}`}
              >
                {money(amount)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-auto bg-slate-50 px-4 py-2 text-[11px] text-slate-400 dark:bg-gray-700/50">
        What each installment still owes, after early-payment discounts and
        receipts — the same rule the{' '}
        <Link
          to={routes.due_installment_list}
          className="text-primary hover:underline dark:text-secondary"
        >
          due list
        </Link>{' '}
        uses, counted on the branch's transaction date rather than today's
        calendar date.
      </div>
    </div>
  );
};

export default InstallmentDueCard;
