import React, { forwardRef, useMemo } from 'react';
import { useSelector } from 'react-redux';

import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { formatTransportationNumber } from '../../../utils/utils-functions/formatRoleName';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import { getRelevantCoaName } from '../utils/ledgerNameResolver';
import { ledgerProductLabel } from '../utils/ledgerProductLabel';
import {
  returnGrandTotals,
  returnLines,
  returnRowBalance,
  returnRowCash,
  returnRowDiscount,
  returnRowTotal,
  type ReturnLedgerConfig,
} from './returnLedgerTotals';

/**
 * The printed Purchase Return / Sales Return sheet.
 *
 * ⚠️ TEN HEADINGS, AND THE FOOTER'S colSpan IS TEN. SalesLedgerPrint.tsx carries
 * the long version of why: an HTML table takes its column count from the widest
 * row, so a stray colSpan quietly adds a phantom column and every detail row
 * ends short of the table's right edge. The number must equal the headings.
 *
 * ⚠️ THE TOTALS COME FROM returnLedgerTotals.ts, the same functions the screen
 * calls. A printed total that disagreed with the screen would be the worst kind
 * of bug -- the paper is what gets filed.
 *
 * ⚠️ NO SAVED-LAYOUT PATH, unlike the two ledgers. There is no `return_ledger`
 * row in print_templates, so the designer branch would never fire; when a
 * layout is saved for these reports, this is where it would be read.
 */

type Props = {
  rows: any[];
  cfg: ReturnLedgerConfig;
  title: string;
  cashLabel: string;
  startDate?: string | null;
  endDate?: string | null;
  rowsPerPage?: number;
  fontSize?: number;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (!Array.isArray(data)) return [[]];
  if (size <= 0) return [data];

  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));

  return out;
};

/** The ten headings, in order. The ninth is the cash column's own label. */
const headingsFor = (cashLabel: string) => [
  { key: 'sl', label: 'Sl', className: 'w-10 text-center' },
  { key: 'challan', label: 'Chal. & Date', className: 'w-22 text-center' },
  { key: 'description', label: 'Description', className: 'text-left' },
  { key: 'vehicle', label: 'Vehicle', className: 'w-18 text-center' },
  { key: 'qty', label: 'Qty', className: 'w-16 text-center' },
  { key: 'rate', label: 'Rate', className: 'w-16 text-center' },
  { key: 'total', label: 'Total', className: 'w-20 text-center' },
  { key: 'discount', label: 'Discount', className: 'w-16 text-center' },
  { key: 'cash', label: cashLabel, className: 'w-18 text-center' },
  { key: 'balance', label: 'Balance', className: 'w-18 text-center' },
];

const ReturnLedgerPrint = forwardRef<HTMLDivElement, Props>(
  (
    {
      rows = [],
      cfg,
      title,
      cashLabel,
      startDate,
      endDate,
      rowsPerPage = 0,
      fontSize,
    },
    ref,
  ) => {
    const settings = useSelector((state: any) => state.settings);
    const stockReportType = settings?.data?.branch?.stock_report_type;
    const showProductDetails =
      String(settings?.data?.branch?.ledger_show_product_details ?? '1') !== '0';

    const rowsArr: any[] = Array.isArray(rows) ? rows : [];
    const pages = chunkRows(rowsArr, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? (fontSize as number) : 9;

    const totals = useMemo(() => returnGrandTotals(rowsArr, cfg), [rowsArr, cfg]);
    const headings = headingsFor(cashLabel);

    const getProductFs = (name: string, baseFs: number) => {
      const len = (name || '').trim().length;

      if (len > 35) return Math.max(baseFs - 4, 7);
      if (len > 28) return Math.max(baseFs - 3, 7);
      if (len > 20) return Math.max(baseFs - 2, 7);
      if (len > 16) return Math.max(baseFs - 1, 7);

      return baseFs;
    };

    const lineFont = Math.max(fs - 2, 7);

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pIdx) => (
          <div key={pIdx} className="print-page">
            <PadPrinting />

            <div className="mb-4">
              <h1 className="text-2xl font-bold text-center">{title}</h1>

              <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
                <div>
                  <span className="font-semibold">Report Date:</span> {startDate || '-'}{' '}
                  {endDate ? `to ${endDate}` : ''}
                </div>
              </div>
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full table-fixed border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    {headings.map((heading) => (
                      <th
                        key={heading.key}
                        style={{ fontSize: fs }}
                        className={`border border-gray-900 px-2 py-2 ${heading.className}`}
                      >
                        {heading.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length ? (
                    pageRows.map((row: any, idx: number) => {
                      const coaName = getRelevantCoaName(row);
                      const lines = returnLines(row, cfg);

                      return (
                        <tr key={row?.id ?? `${pIdx}-${idx}`} className="avoid-break align-top">
                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 text-center"
                          >
                            {row?.sl_number ?? idx + 1 + pIdx * rowsPerPage}
                          </td>

                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 text-center leading-normal"
                          >
                            <div style={{ fontSize: lineFont }}>{row?.challan_no || ''}</div>
                            <div>{row?.challan_date || ''}</div>
                            {row?.ref_invoice_no ? (
                              <div style={{ fontSize: lineFont }}>{row.ref_invoice_no}</div>
                            ) : null}
                          </td>

                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1"
                          >
                            <div className="w-full leading-normal">
                              {coaName ? <div className="font-semibold">{coaName}</div> : null}

                              {showProductDetails &&
                                lines.map((line: any, i: number) => {
                                  const label = ledgerProductLabel(
                                    line,
                                    String(stockReportType) === '1',
                                  );

                                  return (
                                    <div
                                      key={line?.id ?? i}
                                      className="leading-normal whitespace-nowrap"
                                      style={{ fontSize: getProductFs(label, fs) }}
                                    >
                                      {label}
                                    </div>
                                  );
                                })}

                              {row?.[cfg.partyRelation]?.notes ? (
                                <div className="mt-1 text-xs">
                                  {row[cfg.partyRelation].notes}
                                </div>
                              ) : null}
                            </div>
                          </td>

                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 text-left"
                          >
                            {formatTransportationNumber(row?.vehicle_no)}
                          </td>

                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 text-right"
                          >
                            {showProductDetails && lines.length
                              ? lines.map((line: any, i: number) => (
                                  <div key={line?.id ?? i} className="leading-normal">
                                    {thousandSeparator(line?.quantity ?? 0)}
                                  </div>
                                ))
                              : '-'}
                          </td>

                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 text-right"
                          >
                            {showProductDetails && lines.length
                              ? lines.map((line: any, i: number) => (
                                  <div key={line?.id ?? i} className="leading-normal">
                                    {thousandSeparator(line?.return_price ?? 0)}
                                  </div>
                                ))
                              : '-'}
                          </td>

                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 text-right"
                          >
                            {showProductDetails && lines.length
                              ? lines.map((line: any, i: number) => (
                                  <div key={line?.id ?? i} className="leading-normal">
                                    {thousandSeparator(
                                      (line?.return_price || 0) * (line?.quantity || 0),
                                    )}
                                  </div>
                                ))
                              : thousandSeparator(returnRowTotal(row, cfg))}
                          </td>

                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 text-right"
                          >
                            {thousandSeparator(returnRowDiscount(row, cfg))}
                          </td>

                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 text-right"
                          >
                            {thousandSeparator(returnRowCash(row, cfg))}
                          </td>

                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-1 text-right"
                          >
                            {thousandSeparator(returnRowBalance(row, cfg))}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={headings.length}
                        className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                      >
                        No data found
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* ⚠️ colSpan MUST EQUAL the heading count -- see the note above. */}
                {rowsArr.length > 0 && pIdx === pages.length - 1 && (
                  <tfoot>
                    <tr className="avoid-break">
                      <td colSpan={headings.length} className="border border-gray-900 px-2 py-1">
                        <div
                          className="flex items-center justify-end gap-3 whitespace-nowrap font-bold"
                          style={{ fontSize: lineFont }}
                        >
                          <div>Grand Total</div>
                          <div className="flex gap-3">
                            <div>Quantity: {thousandSeparator(totals.quantity)}</div>
                            <div>Total: {thousandSeparator(totals.total)}</div>
                            <div>Discount: {thousandSeparator(totals.discount)}</div>
                            <div>
                              {cashLabel}: {thousandSeparator(totals.cash)}
                            </div>
                            <div>Balance: {thousandSeparator(totals.balance)}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <PrintFooter
              fixed={pages.length === 1}
              page={pIdx + 1}
              total={pages.length}
              fontSize={fs}
            />

            {pIdx !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}
      </div>
    );
  },
);

ReturnLedgerPrint.displayName = 'ReturnLedgerPrint';

export default ReturnLedgerPrint;
