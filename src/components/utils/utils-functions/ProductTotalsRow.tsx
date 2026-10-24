import React from 'react';
import thousandSeparator from './thousandSeparator';

/**
 * The foot of an invoice's product details table.
 *
 * ⚠️ TWO COLUMNS ONLY -- the quantity and the money. A rate column has no
 * total (six identical prices add up to nothing a reader wants), and a weight
 * variance or a purchase rate beside them is not what this row answers. Every
 * other cell is left empty rather than filled with a figure that would only
 * invite the question of what it is.
 *
 * ⚠️ THE LINE TOTAL IS THE SCREEN'S OWN. `qty * price` is how every invoice
 * screen on this system already works its own `totalAmount` out, and therefore
 * how the "Total Tk." figure on the same page is reached -- so the foot comes
 * to the same number as the lines above it instead of a sum of its own.
 *
 * ⚠️ NOTHING IS DRAWN FOR AN EMPTY TABLE. A foot under a table with no lines on
 * it is a total of nothing, and the row is left off entirely.
 */
type ProductTotalsRowProps = {
  products: any[];
  /** How many columns the table this row belongs to has. */
  columnCount: number;
  /** The 0-based position of the Quantity column. */
  qtyColumn: number;
  /** The 0-based position of the Total column. */
  totalColumn: number;
  label?: string;
};

const cellClass =
  'px-2 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-[rgb(var(--c-text))]';

const ProductTotalsRow: React.FC<ProductTotalsRowProps> = ({
  products,
  columnCount,
  qtyColumn,
  totalColumn,
  label = 'Grand Total',
}) => {
  if (!products?.length) return null;

  const totalQty = products.reduce((sum, row) => sum + (Number(row?.qty) || 0), 0);
  const totalAmount = products.reduce(
    (sum, row) => sum + Number(row?.qty) * Number(row?.price),
    0,
  );

  // The label takes every column before the first figure it introduces.
  const labelSpan = Math.max(1, qtyColumn);

  const cells: React.ReactNode[] = [
    <td key="label" colSpan={labelSpan} className={`${cellClass} text-right`}>
      {label}
    </td>,
  ];

  for (let index = labelSpan; index < columnCount; index += 1) {
    if (index === qtyColumn) {
      cells.push(
        <td key={`qty-${index}`} className={`${cellClass} text-right`}>
          {thousandSeparator(totalQty)}
        </td>,
      );
    } else if (index === totalColumn) {
      cells.push(
        <td key={`total-${index}`} className={`${cellClass} text-right`}>
          {thousandSeparator(totalAmount)}
        </td>,
      );
    } else {
      cells.push(<td key={`blank-${index}`} className={cellClass} />);
    }
  }

  return (
    <tr className="bg-[rgb(var(--c-table-body))] border-b font-bold dark:border-gray-700">
      {cells}
    </tr>
  );
};

export default ProductTotalsRow;
