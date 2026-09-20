import React from 'react';
import { FaBoxes } from 'react-icons/fa';
import { money, count } from './dashboardKit';

interface DeadItem {
  id: number;
  name: string;
  qty: number;
  value: number;
  last_sold: string | null;
  idle_days: number | null;
}

interface StockValueCardProps {
  stock?: {
    value: number;
    qty: number;
    items: number;
    dead_days: number;
    dead_value: number;
    dead_items: number;
    dead: DeadItem[];
  };
  isLoading?: boolean;
}

/**
 * What the godown is worth, and what is standing in it unwanted.
 *
 * ⚠️ THE TWO NUMBERS ARE THE POINT, AND THE SHOP ONLY HAD ONE OF THEM. The
 * low-stock card says what is about to run out — a buying decision. This says
 * what the branch is holding and what has stopped selling — a money decision.
 * A shop can be fully stocked and still be short of cash because the shelf is
 * full of last year's models, and no card on this page said so.
 *
 * The dead list is sorted by money, not by age, because the question the owner
 * is asking is which pile to do something about.
 */
const StockValueCard: React.FC<StockValueCardProps> = ({ stock, isLoading }) => {
  if (isLoading && !stock) {
    return <div className="h-56 animate-pulse bg-slate-100 dark:bg-gray-800" />;
  }

  if (!stock) return null;

  const dead = stock.dead ?? [];

  return (
    <div className="flex flex-col overflow-hidden bg-white shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:ring-gray-700">
      <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
        <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-100">
          Stock on Hand
        </span>
        <FaBoxes className="shrink-0 text-slate-400" />
      </div>

      <div className="px-4 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Cost of what is in the godown
        </p>
        <p className="text-2xl font-bold tabular-nums text-slate-700 dark:text-slate-100">
          {money(stock.value)}
        </p>
        <p className="text-[11px] text-slate-400">
          {count(stock.items)} {stock.items === 1 ? 'product' : 'products'} ·{' '}
          {count(stock.qty)} on hand
        </p>
      </div>

      {/* The money that is not moving. Absent when everything in stock has
          sold inside the window, which is the healthy case and needs no
          row of zeros to say so. */}
      {stock.dead_items > 0 && (
        <div className="mt-3 border-t border-[rgb(var(--c-border))] px-4 pt-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Not sold in {stock.dead_days} days
            </span>
            <span className="text-[12px] font-bold tabular-nums text-amber-600 dark:text-amber-300">
              {money(stock.dead_value)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {count(stock.dead_items)} {stock.dead_items === 1 ? 'product' : 'products'}
            {stock.items > 0 && stock.value > 0 && (
              <>
                {' '}
                — {Math.round((stock.dead_value / stock.value) * 100)}% of the godown
              </>
            )}
          </p>

          {dead.length > 0 && (
            <ul className="mt-1.5 divide-y divide-slate-100 dark:divide-gray-700">
              {dead.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 py-1.5"
                >
                  <span
                    className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-600 dark:text-slate-200"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                  {/* ⚠️ "never", NOT A NUMBER OF DAYS. A product that has never
                      sold has no last-sold date to count from, and printing the
                      age of the stock instead would put a checkable-looking
                      figure on a different fact. */}
                  <span className="w-16 shrink-0 text-right text-[10px] tabular-nums text-slate-400">
                    {item.idle_days === null ? 'never sold' : `${item.idle_days}d ago`}
                  </span>
                  <span className="w-20 shrink-0 text-right text-[12px] font-bold tabular-nums text-amber-600 dark:text-amber-300">
                    {money(item.value)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default StockValueCard;
