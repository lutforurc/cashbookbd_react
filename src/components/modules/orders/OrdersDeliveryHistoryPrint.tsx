import React from 'react';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import type { DeliveryHistory, DeliveryLine } from './OrdersDeliveryHistory';

type Props = {
  history: DeliveryHistory | null;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value: any) => {
  const numeric = toNumber(value);
  return numeric === 0 ? '-' : thousandSeparator(numeric);
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

/**
 * One order's delivery history on paper: the order's own figures above the
 * ruled table, every delivery against it, and the total on the last sheet only.
 * The header is repeated on each sheet so a page that gets separated from the
 * rest still says whose order it is.
 */
const OrdersDeliveryHistoryPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ history, title = 'Delivery History', rowsPerPage = 0, fontSize = 10 }, ref) => {
    const lines: DeliveryLine[] = Array.isArray(history?.lines) ? history!.lines : [];
    const pages = chunkRows(lines, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? fontSize : 10;
    const unit = history?.unit ? ` ${history.unit}` : '';

    const totals = lines.reduce(
      (acc, line) => {
        acc.qty += line.qty;
        acc.amount += line.amount;
        acc.freight += line.freight;
        return acc;
      },
      { qty: 0, amount: 0, freight: 0 },
    );

    const th = 'border border-gray-900 px-2 py-1';
    const td = 'border border-gray-900 px-2 py-1';

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles orientation="landscape" />

        {pages.map((pageLines, pIdx) => {
          const isLast = pIdx === pages.length - 1;
          const offset = rowsPerPage > 0 ? pIdx * rowsPerPage : 0;

          return (
            <div key={pIdx} className="print-page">
              <PadPrinting />

              <div className="mb-2">
                <h1 className="text-2xl font-bold text-center">{title}</h1>

                {history ? (
                  <>
                    <div className="mt-1 flex flex-wrap justify-between gap-x-6 gap-y-1 text-xs">
                      <span><span className="font-semibold">Order No:</span> {history.orderNumber}</span>
                      <span><span className="font-semibold">Order Date:</span> {history.orderDate}</span>
                      <span><span className="font-semibold">Order For:</span> {history.orderFor}</span>
                      <span><span className="font-semibold">Type:</span> {history.orderType}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap justify-between gap-x-6 gap-y-1 text-xs">
                      <span><span className="font-semibold">Product:</span> {history.productName}</span>
                      <span><span className="font-semibold">Order Qty:</span> {formatNumber(history.orderQty)}{unit}</span>
                      <span>
                        <span className="font-semibold">Contract Qty:</span>{' '}
                        {history.contractQty == null ? '-' : formatNumber(history.contractQty)}
                      </span>
                      <span><span className="font-semibold">Delivered:</span> {formatNumber(history.deliveredQty)}{unit}</span>
                      <span><span className="font-semibold">Remaining:</span> {formatNumber(history.remainingQty)}{unit}</span>
                      <span><span className="font-semibold">Deliveries:</span> {lines.length}</span>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="w-full overflow-hidden">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '19%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '12%' }} />
                  </colgroup>

                  <thead className="bg-gray-100">
                    <tr>
                      <th style={{ fontSize: fs }} className={`${th} text-center`}>SL. NO.</th>
                      <th style={{ fontSize: fs }} className={th}>
                        <span className="block">CHALLAN NO.</span>
                        <span className="block">&amp; DATE</span>
                      </th>
                      <th style={{ fontSize: fs }} className={th}>VEHICLE / REMARKS</th>
                      <th style={{ fontSize: fs }} className={`${th} text-right`}>DELIVERY QTY</th>
                      <th style={{ fontSize: fs }} className={`${th} text-right`}>RATE</th>
                      <th style={{ fontSize: fs }} className={`${th} text-right`}>AMOUNT</th>
                      <th style={{ fontSize: fs }} className={`${th} text-right`}>FREIGHT</th>
                      <th style={{ fontSize: fs }} className={`${th} text-right`}>DUE AMOUNT</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageLines.length ? (
                      pageLines.map((line, idx) => (
                        <tr key={line.key ?? idx} className="avoid-break align-top">
                          <td style={{ fontSize: fs }} className={`${td} text-center align-top`}>
                            {offset + idx + 1}
                          </td>
                          <td style={{ fontSize: fs }} className={td}>
                            <span className="block">{line.vr_no}</span>
                            <span className="block">{line.date}</span>
                          </td>
                          <td style={{ fontSize: fs }} className={`${td} wrap-break-word`}>
                            {line.vehicle_no ? <span className="block">{line.vehicle_no}</span> : null}
                            {line.remarks ? <span className="block">{line.remarks}</span> : null}
                            {!line.vehicle_no && !line.remarks ? '-' : null}
                          </td>
                          <td style={{ fontSize: fs }} className={`${td} text-right font-semibold`}>
                            {formatNumber(line.qty)}{line.unit ? ` ${line.unit}` : ''}
                          </td>
                          <td style={{ fontSize: fs }} className={`${td} text-right`}>
                            {formatNumber(line.rate)}
                          </td>
                          <td style={{ fontSize: fs }} className={`${td} text-right`}>
                            {formatNumber(line.amount)}
                          </td>
                          <td style={{ fontSize: fs }} className={`${td} text-right`}>
                            {formatNumber(line.freight)}
                          </td>
                          <td style={{ fontSize: fs }} className={`${td} text-right`}>
                            {formatNumber(line.due)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={8}
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                        >
                          No delivery has been made against this order yet.
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {isLast && lines.length > 0 ? (
                    <tfoot>
                      <tr className="font-semibold">
                        <td style={{ fontSize: fs }} colSpan={3} className={`${td} text-right`}>
                          Total ({lines.length} deliver{lines.length === 1 ? 'y' : 'ies'})
                        </td>
                        <td style={{ fontSize: fs }} className={`${td} text-right`}>
                          {formatNumber(totals.qty)}{unit}
                        </td>
                        <td style={{ fontSize: fs }} className={td} />
                        <td style={{ fontSize: fs }} className={`${td} text-right`}>
                          {formatNumber(totals.amount)}
                        </td>
                        <td style={{ fontSize: fs }} className={`${td} text-right`}>
                          {formatNumber(totals.freight)}
                        </td>
                        <td style={{ fontSize: fs }} className={td} />
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

OrdersDeliveryHistoryPrint.displayName = 'OrdersDeliveryHistoryPrint';
export default OrdersDeliveryHistoryPrint;
