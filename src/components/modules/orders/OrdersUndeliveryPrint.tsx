import React from 'react';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import type { UndeliveredGroup } from './OrdersUndelivery';

type Props = {
  groups: UndeliveredGroup[];
  title?: string;
  searchText?: string;
  startDate?: string;
  endDate?: string;
  onlyUndelivered?: boolean;
  rowsPerPage?: number;
  fontSize?: number;
};

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatQty = (value: any) => {
  const numeric = toNumber(value);
  return numeric === 0
    ? '-'
    : numeric.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const formatMoney = (value: any) => {
  const numeric = toNumber(value);
  return numeric === 0
    ? '-'
    : numeric.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
};

/** The filter sends YYYY-MM-DD; the sheet reads dates DD/MM/YYYY. */
const formatDate = (value?: string) => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : value || '';
};

/**
 * How many table rows an order's block takes: one per line, plus its own Total
 * row. A single-product block prints no Total row -- see the screen for the
 * same rule -- so it costs one row.
 */
const blockRowCount = (group: UndeliveredGroup) =>
  group.lines.length + (group.lines.length > 1 ? 1 : 0);

/**
 * Cuts the blocks into sheets without ever splitting one. A block is kept whole
 * as a page's unit because its order number, party and Total row are written
 * once down the side and cannot be repeated on the next sheet without the
 * reader mistaking the block for two.
 */
const paginate = (groups: UndeliveredGroup[], size: number): UndeliveredGroup[][] => {
  if (size <= 0) return [groups];

  const pages: UndeliveredGroup[][] = [];
  let current: UndeliveredGroup[] = [];
  let count = 0;

  groups.forEach((group) => {
    const cost = blockRowCount(group);
    if (current.length && count + cost > size) {
      pages.push(current);
      current = [];
      count = 0;
    }
    current.push(group);
    count += cost;
  });

  if (current.length) pages.push(current);
  return pages.length ? pages : [[]];
};

/**
 * The Pending Deliveries Report on paper: one block per order, its number, date
 * and party merged down the side, a row per product line, and the block's Total
 * row where it has more than one line. A single In Total row closes the last
 * sheet.
 */
const OrdersUndeliveryPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      groups,
      title = 'Pending Deliveries Report',
      searchText,
      startDate,
      endDate,
      onlyUndelivered = true,
      rowsPerPage = 0,
      fontSize = 10,
    },
    ref,
  ) => {
    const groupsArr = Array.isArray(groups) ? groups : [];
    const pages = paginate(groupsArr, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? fontSize : 10;

    const totals = groupsArr.reduce(
      (acc, group) => {
        acc.orderQty += group.order_qty;
        acc.deliveredQty += group.delivered_qty;
        acc.remainingQty += group.remaining_qty;
        acc.remainingAmount += group.remaining_amount;
        return acc;
      },
      { orderQty: 0, deliveredQty: 0, remainingQty: 0, remainingAmount: 0 },
    );

    const th = 'border border-gray-900 px-2 py-1';
    const td = 'border border-gray-900 px-2 py-1';

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles orientation="landscape" />

        {pages.map((pageGroups, pIdx) => {
          const isLast = pIdx === pages.length - 1;

          return (
            <div key={pIdx} className="print-page">
              <PadPrinting />

              <div className="mb-2">
                <h1 className="text-2xl font-bold text-center">{title}</h1>
                <div className="mt-1 text-xs">
                  <span className="font-semibold">Report Date:</span>{' '}
                  {startDate || endDate
                    ? `${formatDate(startDate) || '-'} to ${formatDate(endDate) || '-'}`
                    : 'All dates'}
                  {searchText ? <span className="ml-3">Search: {searchText}</span> : null}
                  <span className="ml-3">
                    {onlyUndelivered ? 'Pending only' : 'All lines'}
                  </span>
                </div>
              </div>

              <div className="w-full overflow-hidden">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '23%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '10%' }} />
                  </colgroup>

                  <thead className="bg-gray-100">
                    <tr>
                      <th style={{ fontSize: fs }} className={`${th} text-center`}>SL. NO.</th>
                      <th style={{ fontSize: fs }} className={th}>
                        <span className="block">ORDER NO.</span>
                        <span className="block">ORDER DATE</span>
                      </th>
                      <th style={{ fontSize: fs }} className={th}>ORDER FOR</th>
                      <th style={{ fontSize: fs }} className={th}>PRODUCT</th>
                      <th style={{ fontSize: fs }} className={`${th} text-right`}>ORDER QTY</th>
                      <th style={{ fontSize: fs }} className={`${th} text-right`}>DELIVERED QTY</th>
                      <th style={{ fontSize: fs }} className={`${th} text-right`}>REMAINING QTY</th>
                      <th style={{ fontSize: fs }} className={`${th} text-right`}>RATE</th>
                      <th style={{ fontSize: fs }} className={`${th} text-right`}>REMAINING AMOUNT</th>
                    </tr>
                  </thead>

                  {pageGroups.length ? (
                    pageGroups.map((group) => {
                      // A single-product block prints no Total row: it would say
                      // nothing the one line above has not already said.
                      const hasTotalRow = group.lines.length > 1;
                      const identitySpan = group.lines.length + (hasTotalRow ? 1 : 0);

                      return (
                        <tbody key={group.key} className="avoid-break">
                          {group.lines.map((line, lineIndex) => (
                            <tr key={line.key} className="align-top">
                              <td
                                style={{ fontSize: fs }}
                                className={`${td} text-center align-top`}
                              >
                                {lineIndex + 1}
                              </td>
                              {lineIndex === 0 ? (
                                <>
                                  <td
                                    rowSpan={identitySpan}
                                    style={{ fontSize: fs }}
                                    className={`${td} text-center align-middle`}
                                  >
                                    <span className="block font-medium">{group.order_number}</span>
                                    <span className="block">{group.order_date}</span>
                                  </td>
                                  <td
                                    rowSpan={identitySpan}
                                    style={{ fontSize: fs }}
                                    className={`${td} align-middle wrap-break-word`}
                                  >
                                    {group.order_for}
                                  </td>
                                </>
                              ) : null}
                              <td style={{ fontSize: fs }} className={`${td} wrap-break-word`}>
                                {line.product_name}
                              </td>
                              <td style={{ fontSize: fs }} className={`${td} text-right`}>
                                {formatQty(line.order_qty)}
                              </td>
                              <td style={{ fontSize: fs }} className={`${td} text-right`}>
                                {formatQty(line.delivered_qty)}
                              </td>
                              <td style={{ fontSize: fs }} className={`${td} text-right font-semibold`}>
                                {formatQty(line.remaining_qty)}
                              </td>
                              <td style={{ fontSize: fs }} className={`${td} text-right`}>
                                {formatMoney(line.order_rate)}
                              </td>
                              <td style={{ fontSize: fs }} className={`${td} text-right font-semibold`}>
                                {formatMoney(line.remaining_amount)}
                              </td>
                            </tr>
                          ))}

                          {hasTotalRow ? (
                            <tr className="font-semibold">
                              <td style={{ fontSize: fs }} className={td} />
                              <td style={{ fontSize: fs }} className={`${td} text-right`}>
                                Total:
                              </td>
                              <td style={{ fontSize: fs }} className={`${td} text-right`}>
                                {formatQty(group.order_qty)}
                              </td>
                              <td style={{ fontSize: fs }} className={`${td} text-right`}>
                                {formatQty(group.delivered_qty)}
                              </td>
                              <td style={{ fontSize: fs }} className={`${td} text-right`}>
                                {formatQty(group.remaining_qty)}
                              </td>
                              <td style={{ fontSize: fs }} className={td} />
                              <td style={{ fontSize: fs }} className={`${td} text-right`}>
                                {formatMoney(group.remaining_amount)}
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      );
                    })
                  ) : (
                    <tbody>
                      <tr>
                        <td
                          colSpan={9}
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                        >
                          No order line matched these filters.
                        </td>
                      </tr>
                    </tbody>
                  )}

                  {isLast && groupsArr.length > 0 ? (
                    <tfoot>
                      <tr className="font-semibold">
                        <td style={{ fontSize: fs }} colSpan={4} className={`${td} text-right`}>
                          In Total
                        </td>
                        <td style={{ fontSize: fs }} className={`${td} text-right`}>
                          {formatQty(totals.orderQty)}
                        </td>
                        <td style={{ fontSize: fs }} className={`${td} text-right`}>
                          {formatQty(totals.deliveredQty)}
                        </td>
                        <td style={{ fontSize: fs }} className={`${td} text-right`}>
                          {formatQty(totals.remainingQty)}
                        </td>
                        <td style={{ fontSize: fs }} className={td} />
                        <td style={{ fontSize: fs }} className={`${td} text-right`}>
                          {formatMoney(totals.remainingAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>

              <PrintFooter fixed={pages.length === 1} page={pIdx + 1} total={pages.length} fontSize={fs} />

              {!isLast ? <div className="page-break" /> : null}
            </div>
          );
        })}
      </div>
    );
  },
);

OrdersUndeliveryPrint.displayName = 'OrdersUndeliveryPrint';
export default OrdersUndeliveryPrint;
