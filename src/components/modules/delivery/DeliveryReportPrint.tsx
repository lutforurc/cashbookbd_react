import React from 'react';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';

export type DeliveryReportRow = {
  mtm_id?: number;
  vr_no?: string;
  vr_date?: string;
  customer_name?: string | null;
  ordered?: number;
  delivered?: number;
  pending?: number;
  status?: string;
};

type Props = {
  rows: DeliveryReportRow[];
  startDate?: string; // 'DD/MM/YYYY'
  endDate?: string;
  title?: string;
  rowsPerPage?: number; // 0 = one block, the browser breaks the pages
  fontSize?: number; // px
};

/** The words the screen shows for a status, so the paper reads the same. */
export const deliveryStatusLabel = (status?: string) => {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'partial':
      return 'Partial';
    case 'none':
      return 'Not delivered';
    default:
      return 'Invoice (stock taken)';
  }
};

/**
 * The invoice date as the Cash Book shows one, DD/MM/YYYY. The report sends
 * YYYY-MM-DD; anything else is shown as it came.
 */
export const deliveryDate = (value?: string) => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : value || '-';
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

/**
 * The Delivery Report on paper, laid out the way the Cash Book prints:
 * the branch pad and the heading on every sheet, a ruled table, the Rows box
 * cutting the sheets, and the print footer at the foot of each.
 *
 * ⚠️ THE TOTAL IS ON THE LAST SHEET ONLY. A per-sheet total would be a
 * sub-total nobody asked for, and repeating the grand total on every sheet
 * would read as though each sheet carried all of it.
 */
const DeliveryReportPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ rows, startDate, endDate, title = 'Delivery Report', rowsPerPage = 0, fontSize }, ref) => {
    const rowsArr: DeliveryReportRow[] = Array.isArray(rows) ? rows : [];
    const pages = chunkRows(rowsArr, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? fontSize! : 9;

    const totals = rowsArr.reduce(
      (acc, row) => ({
        ordered: acc.ordered + Number(row.ordered || 0),
        delivered: acc.delivered + Number(row.delivered || 0),
        pending: acc.pending + Number(row.pending || 0),
      }),
      { ordered: 0, delivered: 0, pending: 0 },
    );

    const th = 'border border-gray-900 px-2 py-2';
    const td = 'border border-gray-900 px-2 py-1';

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pIdx) => {
          const isLast = pIdx === pages.length - 1;
          const offset = rowsPerPage > 0 ? pIdx * rowsPerPage : 0;

          return (
            <div key={pIdx} className="print-page">
              <PadPrinting />
              <div className="mb-2">
                <h1 className="text-2xl font-bold text-center">{title}</h1>
                <div className="mt-1 text-xs">
                  <span className="font-semibold">Report Date:</span>{' '}
                  {startDate || endDate ? `${startDate || '-'} to ${endDate || '-'}` : 'All dates'}
                </div>
              </div>

              <div className="w-full overflow-hidden">
                <table className="w-full table-fixed border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th style={{ fontSize: fs }} className={`${th} w-8 text-center`}>#</th>
                      <th style={{ fontSize: fs }} className={`${th} w-28 text-center`}>Invoice No</th>
                      <th style={{ fontSize: fs }} className={`${th} w-20 text-center`}>Date</th>
                      <th style={{ fontSize: fs }} className={th}>Customer</th>
                      <th style={{ fontSize: fs }} className={`${th} w-20 text-right`}>Ordered</th>
                      <th style={{ fontSize: fs }} className={`${th} w-20 text-right`}>Delivered</th>
                      <th style={{ fontSize: fs }} className={`${th} w-20 text-right`}>Pending</th>
                      <th style={{ fontSize: fs }} className={`${th} w-28 text-center`}>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageRows.length ? (
                      pageRows.map((row, idx) => (
                        <tr key={row.mtm_id ?? idx} className="avoid-break align-top">
                          <td style={{ fontSize: fs }} className={`${td} text-center`}>
                            {offset + idx + 1}
                          </td>
                          <td style={{ fontSize: fs }} className={`${td} text-center`}>{row.vr_no}</td>
                          <td style={{ fontSize: fs }} className={`${td} text-center`}>{deliveryDate(row.vr_date)}</td>
                          <td style={{ fontSize: fs }} className={`${td} wrap-break-word`}>
                            {row.customer_name || '-'}
                          </td>
                          <td style={{ fontSize: fs }} className={`${td} text-right`}>
                            {thousandSeparator(Number(row.ordered || 0))}
                          </td>
                          <td style={{ fontSize: fs }} className={`${td} text-right`}>
                            {thousandSeparator(Number(row.delivered || 0))}
                          </td>
                          <td style={{ fontSize: fs }} className={`${td} text-right`}>
                            {thousandSeparator(Number(row.pending || 0))}
                          </td>
                          <td style={{ fontSize: fs }} className={`${td} text-center`}>
                            {deliveryStatusLabel(row.status)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="border border-gray-900 px-3 py-6 text-center text-gray-500">
                          No data found
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {isLast && rowsArr.length > 0 && (
                    <tfoot>
                      <tr className="font-semibold">
                        <td style={{ fontSize: fs }} colSpan={4} className={`${td} text-right`}>
                          Total
                        </td>
                        <td style={{ fontSize: fs }} className={`${td} text-right`}>
                          {thousandSeparator(totals.ordered)}
                        </td>
                        <td style={{ fontSize: fs }} className={`${td} text-right`}>
                          {thousandSeparator(totals.delivered)}
                        </td>
                        <td style={{ fontSize: fs }} className={`${td} text-right`}>
                          {thousandSeparator(totals.pending)}
                        </td>
                        <td style={{ fontSize: fs }} className={td} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Pinned only when the report did not cut its own sheets -- the
                  same rule, and the same reason, as CashBookPrint. */}
              <PrintFooter fixed={pages.length === 1} page={pIdx + 1} total={pages.length} fontSize={fs} />

              {!isLast && <div className="page-break" />}
            </div>
          );
        })}
      </div>
    );
  },
);

DeliveryReportPrint.displayName = 'DeliveryReportPrint';
export default DeliveryReportPrint;
