import React, { useEffect, useRef } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

import ProductDropdown from '../../utils/utils-functions/ProductDropdown';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

export type OrderLine = {
  /** Stable row key; the saved line id when editing, a local key otherwise. */
  key: string;
  id?: number;
  product_id: string;
  product_name: string;
  order_rate: string;
  total_order: string;
  contract_order_qty: string;
  /** Quantity already delivered — such a line may be edited but not removed. */
  delivered_qty?: number;
};

export const makeOrderLine = (seed: Partial<OrderLine> = {}): OrderLine => ({
  key: `line-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  product_id: '',
  product_name: '',
  order_rate: '',
  total_order: '',
  contract_order_qty: '',
  ...seed,
});

export const lineAmount = (line: OrderLine): number =>
  (Number(line.order_rate) || 0) * (Number(line.total_order) || 0);

type Props = {
  lines: OrderLine[];
  onChange: (lines: OrderLine[]) => void;
  disabled?: boolean;
  /** The form's own focusNextField, so Enter walks the row like it does above. */
  focusNextField?: (nextFieldId: string) => void;
};

/**
 * The product lines of a multi-product order.
 *
 * Only rendered for branches set up for multi-product orders — a single-product
 * branch keeps the original one-product form untouched, which is the whole point
 * of the branch switch.
 */
const OrderItemsGrid: React.FC<Props> = ({ lines, onChange, disabled, focusNextField }) => {
  const update = (key: string, patch: Partial<OrderLine>) =>
    onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  // Enter walks Product → Order Qty → Rate → Contract Qty → Add Product, and
  // pressing it there opens a new row and lands on its product — so a whole
  // order can be typed without touching the mouse.
  const goNext =
    (nextFieldId?: string, preventDefault = true) =>
    (event: React.KeyboardEvent) => {
      if (event.key !== 'Enter' || !nextFieldId || !focusNextField) return;

      // The product cell is a react-select: it only picks the highlighted option
      // if Enter reaches it, so that one must NOT be prevented. Plain inputs are
      // prevented, otherwise Enter would submit the form.
      if (preventDefault) event.preventDefault();

      // focusNextField defers with a timeout, so the move happens after
      // react-select has taken the selection.
      focusNextField(nextFieldId);
    };

  // Which row's product to focus once React has rendered the new row. Focusing
  // straight after onChange would miss: the input does not exist yet.
  const focusRowRef = useRef<number | null>(null);

  useEffect(() => {
    const row = focusRowRef.current;
    if (row === null) return;

    focusRowRef.current = null;
    focusNextField?.(`item_product_${row}`);
  }, [lines.length, focusNextField]);

  const addLine = () => {
    focusRowRef.current = lines.length;
    onChange([...lines, makeOrderLine()]);
  };

  const removeLine = (key: string) =>
    // Never leave the order with no lines: the last row is cleared, not removed.
    onChange(
      lines.length > 1
        ? lines.filter((line) => line.key !== key)
        : [makeOrderLine()],
    );

  const totalQty = lines.reduce((sum, line) => sum + (Number(line.total_order) || 0), 0);
  const totalAmount = lines.reduce((sum, line) => sum + lineAmount(line), 0);

  const cell = 'border border-stroke px-2 py-1.5 dark:border-strokedark';

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <label className="font-medium">Products</label>
        {/* Enter on a focused button fires its click, so the row's last field
            hands over to here and this hands over to the new row's product. */}
        <button
          type="button"
          id="add_product_btn"
          onClick={addLine}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
        >
          <FiPlus /> Add Product
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse">
          <thead>
            <tr className="bg-gray-2 text-left text-sm dark:bg-meta-4">
              <th className={`${cell} w-10 text-center`}>#</th>
              <th className={cell}>Product</th>
              <th className={`${cell} w-36`}>Order Qty</th>
              <th className={`${cell} w-32`}>Rate</th>
              <th className={`${cell} w-36`}>Contract Qty</th>
              <th className={`${cell} w-32 text-right`}>Amount</th>
              <th className={`${cell} w-14 text-center`}>—</th>
            </tr>
          </thead>

          <tbody>
            {lines.map((line, index) => (
              <tr key={line.key} className="text-sm">
                <td className={`${cell} text-center align-middle`}>{index + 1}</td>

                <td className={cell}>
                  <ProductDropdown
                    id={`item_product_${index}`}
                    name={`item_product_${index}`}
                    className="h-9"
                    value={
                      line.product_id
                        ? { value: line.product_id, label: line.product_name || line.product_id }
                        : null
                    }
                    onSelect={(option: any) =>
                      update(line.key, {
                        product_id: option?.value?.toString?.() || '',
                        product_name: option?.label || '',
                      })
                    }
                    onKeyDown={goNext(`item_qty_${index}`, false)}
                  />
                </td>

                <td className={cell}>
                  <input
                    id={`item_qty_${index}`}
                    type="number"
                    value={line.total_order}
                    onChange={(e) => update(line.key, { total_order: e.target.value })}
                    onKeyDown={goNext(`item_rate_${index}`)}
                    placeholder="Qty"
                    className="w-full rounded-xs border border-gray-300 p-1 text-sm outline-none dark:border-gray-600 dark:bg-boxdark dark:text-white text-right"
                  />
                </td>

                <td className={cell}>
                  <input
                    id={`item_rate_${index}`}
                    type="number"
                    value={line.order_rate}
                    onChange={(e) => update(line.key, { order_rate: e.target.value })}
                    onKeyDown={goNext(`item_contract_${index}`)}
                    placeholder="Rate"
                    className="w-full rounded-xs border border-gray-300 p-1 text-sm outline-none dark:border-gray-600 dark:bg-boxdark dark:text-white text-right"
                  />
                </td>

                <td className={cell}>
                  <input
                    id={`item_contract_${index}`}
                    type="number"
                    value={line.contract_order_qty}
                    onChange={(e) => update(line.key, { contract_order_qty: e.target.value })}
                    onKeyDown={goNext('add_product_btn')}
                    placeholder="Contract Qty"
                    className="w-full rounded-xs border border-gray-300 p-1 text-sm outline-none dark:border-gray-600 dark:bg-boxdark dark:text-white text-right"
                  />
                </td>

                <td className={`${cell} text-right align-middle`}>
                  {lineAmount(line) ? thousandSeparator(lineAmount(line)) : '-'}
                </td>

                <td className={`${cell} text-center align-middle`}>
                  {line.delivered_qty ? (
                    // Removing it would orphan the invoices already raised on it;
                    // the server refuses this too.
                    <span
                      title={`${line.delivered_qty} already delivered`}
                      className="text-xs text-amber-600 dark:text-amber-300"
                    >
                      sent
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      disabled={disabled}
                      className="text-danger disabled:opacity-50"
                      aria-label="Remove product"
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="bg-gray-2 text-sm font-bold dark:bg-meta-4">
              <td className={`${cell} text-right`} colSpan={2}>
                Total ({lines.filter((l) => l.product_id).length} product)
              </td>
              <td className={cell}>{totalQty ? thousandSeparator(totalQty) : '-'}</td>
              <td className={cell} />
              <td className={cell} />
              <td className={`${cell} text-right`}>
                {totalAmount ? thousandSeparator(totalAmount) : '-'}
              </td>
              <td className={cell} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default OrderItemsGrid;
