import React, { useEffect, useMemo, useState } from 'react';
import { FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';
import dayjs from 'dayjs';

import httpService from '../../services/httpService';
import { API_DASHBOARD_BRANCHES_URL } from '../../services/apiRoutes';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { CARD, CARD_HEAD } from './dashboardKit';
import { useViewBranch } from './dashboardRange';

/**
 * The morning roll-call: every branch on one line, for a head office.
 *
 * Today's sales and purchase, today's cash in and out, the book balance,
 * what is owed to the branch and by it, and how much of the receivable is
 * past sixty days -- the figures each branch's own dashboard shows, read
 * through the same code on the server (BranchRollCall), so clicking through
 * lands on the same numbers.
 *
 * ⚠️ "Today" is each branch's OWN transaction date, and they are routinely
 * days apart, so the date is on the row. The list is not ranged: it is a
 * roll-call of now, not a month's account.
 *
 * Clicking a branch's name is the same as choosing it in the dropdown: its
 * own page opens with its own figures.
 */
type Row = {
  id: number;
  name: string;
  is_head_office: boolean;
  trx_date: string;
  sales: number;
  purchase: number;
  received: number;
  payment: number;
  balance: number;
  receivable: number;
  overdue: number;
  payable: number;
};

type SortKey = keyof Row;

const COLUMNS: { key: SortKey; label: string; money?: boolean }[] = [
  { key: 'name', label: 'Branch' },
  { key: 'trx_date', label: 'Trx Date' },
  { key: 'sales', label: 'Today Sales', money: true },
  { key: 'purchase', label: 'Today Purchase', money: true },
  { key: 'received', label: 'Today Received', money: true },
  { key: 'payment', label: 'Today Payment', money: true },
  { key: 'balance', label: 'Book Balance', money: true },
  { key: 'receivable', label: 'Receivable', money: true },
  { key: 'overdue', label: '60+ Overdue', money: true },
  { key: 'payable', label: 'Payable', money: true },
];

/** Nought prints as a dash: nothing moved, not "no data". */
const money = (value: number) => (Number(value) ? thousandSeparator(Number(value)) : '—');

const BranchRollCallCard = ({ tick, rowClass = 'px-3 py-2' }: { tick: number; rowClass?: string }) => {
  const view = useViewBranch();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [readAt, setReadAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'name', desc: false });

  useEffect(() => {
    if (!view.isHeadOffice) return undefined;
    let alive = true;
    setBusy(true);
    httpService
      .get(API_DASHBOARD_BRANCHES_URL)
      .then((response) => {
        if (!alive) return;
        const data = response?.data?.data?.data;
        setRows(Array.isArray(data?.rows) ? data.rows : []);
        setReadAt(data?.read_at ?? null);
      })
      .catch(() => {
        if (alive) setRows([]);
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [view.isHeadOffice, tick]);

  const sorted = useMemo(() => {
    const list = [...(rows ?? [])];
    const { key, desc } = sort;
    list.sort((a, b) => {
      const x = a[key];
      const y = b[key];
      const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return desc ? -order : order;
    });
    return list;
  }, [rows, sort]);

  const totals = useMemo(
    () =>
      COLUMNS.filter((c) => c.money).reduce<Record<string, number>>((acc, c) => {
        acc[c.key] = (rows ?? []).reduce((sum, row) => sum + Number(row[c.key] || 0), 0);
        return acc;
      }, {}),
    [rows],
  );

  if (!view.isHeadOffice) return null;

  const sortBy = (key: SortKey) =>
    setSort((current) => ({ key, desc: current.key === key ? !current.desc : key !== 'name' }));

  return (
    <div className={`${CARD} ${busy ? 'opacity-60' : ''} transition-opacity duration-300`}>
      <div className={CARD_HEAD}>
        <span className="truncate">All Branches</span>
        <span className="shrink-0 text-[11px] font-normal text-slate-400">
          {rows ? `${rows.length} branches` : ''}
          {readAt ? ` · read ${dayjs(readAt).format('hh:mm A')}` : ''}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-[12px]">
          <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:bg-gray-700/50">
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  onClick={() => sortBy(column.key)}
                  className={`cursor-pointer select-none whitespace-nowrap ${rowClass} ${column.money ? 'text-right' : 'text-left'}`}
                  title="Sort"
                >
                  <span className="inline-flex items-center gap-1">
                    {column.label}
                    {sort.key === column.key ? (
                      sort.desc ? <FaSortAmountDown className="text-[9px]" /> : <FaSortAmountUp className="text-[9px]" />
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
            {sorted.map((row) => (
              <tr key={row.id} className="transition hover:bg-slate-50 dark:hover:bg-gray-700/50">
                <td className={`whitespace-nowrap ${rowClass}`}>
                  {/* The same act as the dropdown: this branch's own page opens. */}
                  <button
                    type="button"
                    onClick={() => view.setChosen(String(row.id))}
                    className="font-semibold text-slate-700 hover:underline dark:text-slate-100"
                  >
                    {row.name}
                  </button>
                  {row.is_head_office ? (
                    <span className="ml-1.5 rounded bg-slate-100 px-1 text-[9px] uppercase text-slate-500 dark:bg-gray-700 dark:text-slate-300">
                      H/O
                    </span>
                  ) : null}
                </td>
                <td className={`whitespace-nowrap text-slate-400 ${rowClass}`}>
                  {dayjs(row.trx_date).format('DD/MM/YYYY')}
                </td>
                <td className={`text-right tabular-nums ${rowClass}`}>{money(row.sales)}</td>
                <td className={`text-right tabular-nums ${rowClass}`}>{money(row.purchase)}</td>
                <td className={`text-right tabular-nums text-emerald-600 dark:text-emerald-400 ${rowClass}`}>
                  {money(row.received)}
                </td>
                <td className={`text-right tabular-nums text-rose-600 dark:text-rose-400 ${rowClass}`}>
                  {money(row.payment)}
                </td>
                {/* A book below nought is money the branch does not have. */}
                <td
                  className={`text-right font-semibold tabular-nums ${rowClass} ${
                    row.balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-300'
                  }`}
                >
                  {money(row.balance)}
                </td>
                <td className={`text-right tabular-nums ${rowClass}`}>{money(row.receivable)}</td>
                {/* Past sixty days is the figure somebody has to act on -- red where there is any. */}
                <td
                  className={`text-right font-semibold tabular-nums ${rowClass} ${
                    row.overdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                  }`}
                >
                  {money(row.overdue)}
                </td>
                <td className={`text-right tabular-nums ${rowClass}`}>{money(row.payable)}</td>
              </tr>
            ))}
            {rows && rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className={`text-center text-slate-400 ${rowClass}`}>
                  No branch could be read.
                </td>
              </tr>
            ) : null}
          </tbody>
          {rows && rows.length > 1 ? (
            <tfoot className="border-t border-[rgb(var(--c-border))] bg-slate-50 font-bold dark:bg-gray-700/50">
              <tr>
                <td colSpan={2} className={`text-right ${rowClass}`}>
                  Total
                </td>
                {COLUMNS.filter((c) => c.money).map((c) => (
                  <td key={c.key} className={`text-right tabular-nums ${rowClass}`}>
                    {money(totals[c.key])}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
};

export default BranchRollCallCard;
