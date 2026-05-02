import React, { useMemo } from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

export type CollectionSheetRow = {
  bangla?: string | null;
  idfr_code?: string | number | null;
  name?: string | null;
  relation?: string | number | null;
  father_bangla?: string | null;
  father_name?: string | null;
  father?: string | null;
  mobile?: string | null;
  sales?: number | string | null;
  down_payment?: number | string | null;
  previous_collection?: number | string | null;
  installment?: number | string | null;
  this_month_collection?: number | string | null;
};

type Props = {
  rows: CollectionSheetRow[];
  somityName?: string;
  branchName?: string;
  monthYear?: string;
  statusLabel?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasBanglaText = (value?: string | null) => /[\u0980-\u09FF]/.test(String(value || ''));

const withCode = (value?: string | null, code?: string | number | null) => {
  const text = String(value || '').trim();
  const idCode = String(code || '').trim();
  if (!text) return '';
  return idCode ? `${text} (${idCode})` : text;
};

const guardianNameOf = (row: CollectionSheetRow) => {
  const banglaGuardian = String(row.father_bangla || '').trim();
  return banglaGuardian || row.father_name || row.father || '';
};

const banglaValueOf = (value?: string | null) => String(value || '').trim();

const banglaTextClass = (value?: string | null) =>
  hasBanglaText(value) ? 'font-semibold' : 'sutonny-text text-[20px] leading-6';

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const pages: T[][] = [];
  for (let i = 0; i < data.length; i += size) pages.push(data.slice(i, i + size));
  return pages;
};

const balanceOf = (row: CollectionSheetRow) =>
  toNumber(row.sales) -
  toNumber(row.down_payment) -
  toNumber(row.previous_collection) -
  toNumber(row.this_month_collection);

const CollectionSheetPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      somityName,
      branchName,
      monthYear,
      statusLabel = 'Opening',
      rowsPerPage = 16,
      fontSize = 11,
    },
    ref,
  ) => {
    const rowsArr = Array.isArray(rows) ? rows : [];
    const pages = chunkRows(rowsArr, rowsPerPage);
    const printedAt = new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const totals = useMemo(
      () =>
        rowsArr.reduce(
          (acc, row) => {
            acc.sales += toNumber(row.sales);
            acc.downPayment += toNumber(row.down_payment);
            acc.previous += toNumber(row.previous_collection);
            acc.thisMonth += toNumber(row.this_month_collection);
            acc.balance += balanceOf(row);
            return acc;
          },
          { sales: 0, downPayment: 0, previous: 0, thisMonth: 0, balance: 0 },
        ),
      [rowsArr],
    );

    return (
      <div ref={ref} className="p-8 text-gray-900 print-root">
        <PrintStyles />
        <style>
          {`
            @font-face {
              font-family: 'SutonnyMJ';
              src: url('/suttony/SutonnyMJ.woff') format('woff'),
                   url('/suttony/SutonnyMJ.ttf') format('truetype');
              font-weight: normal;
              font-style: normal;
            }
            .sutonny-text { font-family: 'SutonnyMJ', serif; }
            @media print {
              @page { size: A4 landscape; margin: 7mm; }
              .print-page { min-height: calc(210mm - 14mm - 16mm); }
            }
          `}
        </style>

        {pages.map((pageRows, pageIndex) => (
          <div key={pageIndex} className="print-page">
            <PadPrinting />

            <div className="mb-3 text-center">
              <div className="text-lg font-semibold">Monthly Collection Sheet</div>
              <div className="mt-1 text-xs">
                <span className="font-semibold">Branch:</span> {branchName || '-'} |{' '}
                <span className="font-semibold">Somity:</span> {somityName || '-'} |{' '}
                <span className="font-semibold">Month:</span> {monthYear || '-'} ({statusLabel})
              </div>
              <div className="text-xs">Print time: {printedAt}</div>
            </div>

            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="bg-green-700 text-white">
                  <th style={{ fontSize }} className="w-12 border border-gray-900 px-2 py-2 text-center">#</th>
                  <th style={{ fontSize }} className="border border-gray-900 px-2 py-2 text-left">Member Details</th>
                  <th style={{ fontSize }} className="w-28 border border-gray-900 px-2 py-2 text-right">Total Sales</th>
                  <th style={{ fontSize }} className="w-28 border border-gray-900 px-2 py-2 text-right">Down Payment</th>
                  <th style={{ fontSize }} className="w-28 border border-gray-900 px-2 py-2 text-right">Prv. Coll.</th>
                  <th style={{ fontSize }} className="w-28 border border-gray-900 px-2 py-2 text-right">Installment</th>
                  <th style={{ fontSize }} className="w-28 border border-gray-900 px-2 py-2 text-right">This Month</th>
                  <th style={{ fontSize }} className="w-28 border border-gray-900 px-2 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => {
                  const globalIndex = pageIndex * rowsPerPage + index + 1;
                  const balance = balanceOf(row);
                  const isClosed = balance === 0;
                  const banglaName = banglaValueOf(row.bangla);
                  const guardianName = guardianNameOf(row);

                  return (
                    <tr key={`${row.idfr_code ?? globalIndex}-${globalIndex}`} className={isClosed ? 'bg-pink-100 font-semibold' : ''}>
                      <td style={{ fontSize }} className="border border-gray-900 px-2 py-2 text-center align-middle">{globalIndex}</td>
                      <td style={{ fontSize }} className="border border-gray-900 px-2 py-2">
                        {banglaName ? <div className={banglaTextClass(banglaName)}>{withCode(banglaName, row.idfr_code)}</div> : null}
                        <div>{withCode(row.name || '-', row.idfr_code)}</div>
                        {guardianName ? (
                          <div>
                            পি:/স্বা: <span className={hasBanglaText(guardianName) ? '' : 'sutonny-text text-[20px] leading-6'}>{guardianName}</span>
                          </div>
                        ) : null}
                        {row.mobile ? <div>{row.mobile}</div> : null}
                      </td>
                      <td style={{ fontSize }} className="border border-gray-900 px-2 py-2 text-right align-middle">{thousandSeparator(toNumber(row.sales))}</td>
                      <td style={{ fontSize }} className="border border-gray-900 px-2 py-2 text-right align-middle">{thousandSeparator(toNumber(row.down_payment))}</td>
                      <td style={{ fontSize }} className="border border-gray-900 px-2 py-2 text-right align-middle">{thousandSeparator(toNumber(row.previous_collection))}</td>
                      <td style={{ fontSize }} className="border border-gray-900 px-2 py-2 text-right align-middle">{thousandSeparator(toNumber(row.installment))}</td>
                      <td style={{ fontSize }} className="border border-gray-900 px-2 py-2 text-right align-middle">{thousandSeparator(toNumber(row.this_month_collection))}</td>
                      <td style={{ fontSize }} className="border border-gray-900 px-2 py-2 text-right align-middle">{thousandSeparator(balance)}</td>
                    </tr>
                  );
                })}

                {pageIndex === pages.length - 1 && (
                  <tr className="font-bold">
                    <td style={{ fontSize }} colSpan={2} className="border border-gray-900 px-2 py-2 text-right">Grand Total</td>
                    <td style={{ fontSize }} className="border border-gray-900 px-2 py-2 text-right">{thousandSeparator(totals.sales)}</td>
                    <td style={{ fontSize }} className="border border-gray-900 px-2 py-2 text-right">{thousandSeparator(totals.downPayment)}</td>
                    <td style={{ fontSize }} className="border border-gray-900 px-2 py-2 text-right">{thousandSeparator(totals.previous)}</td>
                    <td style={{ fontSize }} className="border border-gray-900 px-2 py-2 text-right"></td>
                    <td style={{ fontSize }} className="border border-gray-900 px-2 py-2 text-right">{thousandSeparator(totals.thisMonth)}</td>
                    <td style={{ fontSize }} className="border border-gray-900 px-2 py-2 text-right">{thousandSeparator(totals.balance)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="mt-2 text-right text-xs">
              Page {pageIndex + 1} of {pages.length || 1}
            </div>
            {pageIndex !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}
      </div>
    );
  },
);

CollectionSheetPrint.displayName = 'CollectionSheetPrint';
export default CollectionSheetPrint;
