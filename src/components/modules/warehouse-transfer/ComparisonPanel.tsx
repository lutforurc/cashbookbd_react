import React from 'react';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { Button } from '../../../pages/UiElements/CustomButtons';

/**
 * What was sent against what arrived, for one challan.
 *
 * Shared by the Transfer List and the Receive List: the question is the same
 * from either end -- "against what was sent" -- and the endpoint answers about
 * the issue whichever of the two you hand it.
 *
 * The difference is the column worth reading, so it is the one that carries
 * colour: red where less landed than left, amber where more did, and plain ink
 * where the two agree -- which is every line nobody needs to look into.
 *
 * A consignment is rarely one price. Nine freezers can be three bought at
 * 3,500, three at 4,000 and three at 4,500, and the branch receiving them has
 * to know which: that is what its stock is now worth, and what a later sale is
 * measured against. So each line carries its cost and opens to show the layers
 * behind it.
 *
 * Where there is more than one price the Rate cell is left empty rather than
 * averaged. The total is real money and stays; an average rate is not a price
 * anything was bought at, and printing one invites it to be read as if it were.
 */
const ComparisonPanel = ({
  comparison,
  onClose,
}: {
  comparison: any;
  onClose: () => void;
}) => {
  const rows: any[] = Array.isArray(comparison?.rows) ? comparison.rows : [];
  const totals = comparison?.totals ?? {};

  // Transfers posted before they carried their cost have nothing to show, and
  // a column of dashes is worse than no column.
  const hasCost = rows.some((row) => Number(row?.amount || 0) > 0);

  const [openRows, setOpenRows] = React.useState<Record<number, boolean>>({});

  const toggle = (productId: number) =>
    setOpenRows((prev) => ({ ...prev, [productId]: !prev[productId] }));

  const difference = (value: number) => {
    const n = Number(value || 0);
    if (n === 0) return <span className="text-[rgb(var(--c-text-muted))] dark:text-[rgb(var(--c-text-muted))]">0</span>;
    return (
      <span className={n < 0 ? 'font-semibold text-danger' : 'font-semibold text-meta-6'}>
        {n > 0 ? `+${thousandSeparator(n)}` : thousandSeparator(n)}
      </span>
    );
  };

  const cell = 'border border-stroke px-2 py-1.5 dark:border-strokedark';
  const columnCount = hasCost ? 8 : 6;

  return (
    <div className="border-y border-blue-500/30 bg-gray-2 px-3 py-3 dark:bg-meta-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
          Issued vs Received
          {!comparison?.is_received && (
            <span className="ml-2 text-xs font-normal text-danger">
              nothing received against this challan yet
            </span>
          )}
        </h3>
        <Button
          type="button"
          onClick={onClose}
          className="text-xs text-blue-500 underline-offset-2 hover:underline"
        >
          Close
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-gray-3 text-left dark:bg-boxdark">
              <th className={cell}>Product</th>
              <th className={`${cell} w-28 text-right`}>Issued</th>
              <th className={`${cell} w-28 text-right`}>Received</th>
              <th className={`${cell} w-24 text-right`}>Damaged</th>
              <th className={`${cell} w-24 text-right`}>Short</th>
              <th className={`${cell} w-28 text-right`}>Difference</th>
              {hasCost && <th className={`${cell} w-28 text-right`}>Rate</th>}
              {hasCost && <th className={`${cell} w-32 text-right`}>Amount</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className={`${cell} py-4 text-center text-[rgb(var(--c-text-muted))] dark:text-[rgb(var(--c-text-muted))]`}
                >
                  No product on this challan
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const layers: any[] = Array.isArray(row?.cost_layers) ? row.cost_layers : [];
                // One price needs no breakdown; the average is that price.
                const canOpen = layers.length > 1;
                const isOpen = Boolean(openRows[row.product_id]);

                return (
                  <React.Fragment key={row.product_id}>
                    <tr>
                      <td className={cell}>
                        {canOpen ? (
                          <Button
                            type="button"
                            onClick={() => toggle(row.product_id)}
                            className="text-left text-blue-500 underline-offset-2 hover:underline"
                            title="Show the prices this product came in at"
                          >
                            {row.product_name}
                            <span className="ml-1 text-xs">
                              ({layers.length} rates {isOpen ? '▴' : '▾'})
                            </span>
                          </Button>
                        ) : (
                          row.product_name
                        )}
                      </td>
                      <td className={`${cell} text-right`}>{thousandSeparator(row.issued_qty)}</td>
                      <td className={`${cell} text-right`}>{thousandSeparator(row.received_qty)}</td>
                      <td className={`${cell} text-right`}>{thousandSeparator(row.damaged_qty)}</td>
                      <td className={`${cell} text-right`}>{thousandSeparator(row.short_qty)}</td>
                      <td className={`${cell} text-right`}>{difference(row.difference)}</td>
                      {hasCost && (
                        <td className={`${cell} text-right`}>
                          {/* Blank when the goods came in at more than one
                              price: the API sends no rate, because an average
                              of them is a figure nothing was bought at. The
                              layers below carry the real ones. */}
                          {row.rate === null || row.rate === undefined
                            ? ''
                            : thousandSeparator(row.rate)}
                        </td>
                      )}
                      {hasCost && (
                        <td className={`${cell} text-right`}>{thousandSeparator(row.amount)}</td>
                      )}
                    </tr>

                    {hasCost &&
                      isOpen &&
                      layers.map((layer, index) => (
                        <tr key={`${row.product_id}-${index}`} className="bg-gray-2 dark:bg-meta-4">
                          <td className={`${cell} pl-8 text-xs text-[rgb(var(--c-text-muted))] dark:text-[rgb(var(--c-text-muted))]`}>
                            at {thousandSeparator(layer.rate)}
                          </td>
                          <td className={`${cell} text-right text-xs`}>
                            {thousandSeparator(layer.qty)}
                          </td>
                          <td className={cell} colSpan={3}></td>
                          <td className={cell}></td>
                          <td className={`${cell} text-right text-xs`}>
                            {thousandSeparator(layer.rate)}
                          </td>
                          <td className={`${cell} text-right text-xs`}>
                            {thousandSeparator(layer.amount)}
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-3 font-semibold dark:bg-boxdark">
                <td className={`${cell} text-right`}>Total</td>
                <td className={`${cell} text-right`}>{thousandSeparator(totals.issued_qty)}</td>
                <td className={`${cell} text-right`}>{thousandSeparator(totals.received_qty)}</td>
                <td className={`${cell} text-right`}>{thousandSeparator(totals.damaged_qty)}</td>
                <td className={`${cell} text-right`}>{thousandSeparator(totals.short_qty)}</td>
                <td className={`${cell} text-right`}>{difference(totals.difference)}</td>
                {hasCost && <td className={cell}></td>}
                {hasCost && (
                  <td className={`${cell} text-right`}>{thousandSeparator(totals.amount)}</td>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default ComparisonPanel;
