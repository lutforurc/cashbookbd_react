import React from 'react';
import { FaBoxOpen, FaExclamationTriangle } from 'react-icons/fa';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

interface StockItem {
  id: number;
  name: string;
  stock: number;
  orderLevel: number;
}

interface LowStockCardProps {
  lowStock?: {
    mode: 'order_level' | 'lowest';
    items: StockItem[];
  };
  isLoading?: boolean;
}

/**
 * What to reorder.
 *
 * With reorder levels configured this lists what has fallen to or below them.
 * With none configured — the usual state on a new branch — it falls back to the
 * lowest stock on hand and says so, because an empty card would read as
 * "nothing to worry about" when the truth is "nobody set a threshold".
 */
const LowStockCard: React.FC<LowStockCardProps> = ({ lowStock, isLoading }) => {
  if (isLoading && !lowStock) {
    return <div className="h-56 animate-pulse bg-slate-100 dark:bg-gray-800" />;
  }

  if (!lowStock) return null;

  const items = lowStock.items || [];
  const byThreshold = lowStock.mode === 'order_level';

  return (
    <div className="flex flex-col overflow-hidden bg-white shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:ring-gray-700">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-gray-700">
        <span className="truncate text-sm font-bold text-slate-700 dark:text-slate-100">
          {byThreshold ? 'Reorder Now' : 'Lowest Stock'}
        </span>
        <FaBoxOpen className="shrink-0 text-slate-400" />
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs italic text-slate-400">
          Nothing below its reorder level
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-gray-700">
          {items.map((item) => {
            // Negative stock means more has gone out than ever came in — an
            // entry problem, not a slow-moving line, so it is flagged rather
            // than shown as just another small number.
            const oversold = Number(item.stock) < 0;

            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 px-4 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-600 dark:text-slate-200">
                  {item.name}
                </span>

                {oversold && (
                  <FaExclamationTriangle
                    className="shrink-0 text-[10px] text-rose-500"
                    title="Issued more than received — check entries"
                    aria-label="Issued more than received"
                  />
                )}

                <span
                  className={`shrink-0 text-right text-[12px] font-bold tabular-nums ${
                    oversold
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-700 dark:text-slate-100'
                  }`}
                >
                  {thousandSeparator(Math.round(Number(item.stock) || 0))}
                </span>

                {byThreshold && (
                  <span className="w-14 shrink-0 text-right text-[10px] tabular-nums text-slate-400">
                    / {thousandSeparator(item.orderLevel)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!byThreshold && items.length > 0 && (
        <div className="mt-auto bg-slate-50 px-4 py-2 text-[10px] text-slate-400 dark:bg-gray-700/50">
          No reorder levels set — showing lowest stock instead
        </div>
      )}
    </div>
  );
};

export default LowStockCard;
