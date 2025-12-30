import React from 'react';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintStyles from '../../../utils/utils-functions/PrintStyles';

type Somity = {
  idfr_code?: string;
  somity_name?: string;
  somity_id?: string | number;
  mobile?: string;
};

export type CashRow = {
  sl_number?: string | number;
  vr_date?: string; // already formatted string
  vr_no?: string | number;
  nam?: string; // may contain HTML
  somity?: Somity | null;
  remarks?: string;
  credit?: number; // Received
  debit?: number; // Payment
  branchPad?: string;
  is_approved?: boolean;
};

type Props = {
  rows: CashRow[];
  startDate?: string; // e.g. '01/10/2025'
  endDate?: string; // e.g. '31/10/2025'
  title?: string; // default 'Cash Book'
  rowsPerPage?: number; // default 20
  fontSize?: number; // default 9 (in px)
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

const CashBookPrint = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      rows,
      startDate,
      endDate,
      title = 'Cash Book',
      rowsPerPage = 8,
      fontSize,
    },
    ref,
  ) => {
    // SAFETY: ensure array to avoid reduce/map errors
    const rowsArr: CashRow[] = Array.isArray(rows) ? rows : [];

    const pages = chunkRows(rowsArr, rowsPerPage);
    const fs = Number.isFinite(fontSize) ? fontSize! : 9;

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />

        {/* Pages */}
        {pages.map((pageRows, pIdx) => {
          return (
            <div key={pIdx} className="print-page">
              <PadPrinting />
              {/* Per-page header (prints on every page) */}
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-center">{title}</h1>
                <div className="mt-1 grid grid-cols-1 gap-1 text-xs">
                  <div>
                    <span className="font-semibold">Report Date:</span>{' '}
                    {startDate || '-'} — {endDate || '-'}
                  </div>
                </div>
              </div>

              <div className="w-full overflow-hidden">
                <table className="w-full table-fixed border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th
                        style={{ fontSize: fs }}
                        className={`border border-gray-900 px-2 py-2 w-8 text-center`}
                      >
                        #
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className={`border border-gray-900 px-2 py-2 w-25 text-center`}
                      >
                        Vr No
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className={`border border-gray-900 px-2 py-2`}
                      >
                        Description
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className={`border border-gray-900 px-2 py-2 w-28 text-right`}
                      >
                        Received
                      </th>
                      <th
                        style={{ fontSize: fs }}
                        className={`border border-gray-900 px-2 py-2 w-28 text-right`}
                      >
                        Payment
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageRows.length ? (pageRows.map((row, idx) => (
                      <tr key={idx} className="avoid-break align-top">
                        <td
                          style={{ fontSize: fs }}
                          className={`border border-gray-900 px-2 py-1 text-center`}
                        >
                          {row?.sl_number == 0 ? '' : row?.sl_number}
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center leading-normal">
                          <div className={`text-[${fs - 3}px]`}>
                            {row?.vr_no}
                          </div>
                          <div className={`text-[${fs}px]`}>
                            {row?.vr_date}
                          </div>
                        </td>
                        <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1">
                          <div className="w-full max-w-4xl leading-normal">
                            <div className="truncate leading-normal">
                              <span
                                className={`text-[${fs}px]`}
                                dangerouslySetInnerHTML={{
                                  __html: row?.nam || '',
                                }}
                              ></span>
                              {row?.somity?.idfr_code && (
                                <span className={`text-[${fs}px]`}>
                                  {' '}
                                  ({row.somity.idfr_code})
                                </span>
                              )}
                            </div>
                            {row?.somity && (
                              <div className={`text-[${fs}px]`}>
                                {row.somity.somity_name &&
                                  row.somity.somity_id && (
                                    <div>
                                      {row.somity.somity_name} (
                                      {row.somity.somity_id})
                                    </div>
                                  )}
                                {row.somity.mobile && (
                                  <div>{row.somity.mobile}</div>
                                )}
                              </div>
                            )}
                            {row?.remarks && (
                              <div
                                className={`break-words whitespace-normal`}
                              >
                                {row.remarks}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: fs }} className={`border border-gray-900 px-2 py-1 text-right align-middle`}>
                          <span>{thousandSeparator(Number(row?.credit), 0)}</span>
                        </td>
                        <td
                          style={{ fontSize: fs }}
                          className={`border border-gray-900 px-2 py-1 text-right align-middle`}
                        >
                          {thousandSeparator(Number(row?.debit), 0)}
                        </td>
                      </tr>
                    ))
                    ) : (
                      <tr>
                        <td
                          colSpan={7}
                          className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                        >
                          No data found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* 👇 Force break after each page except the last */}
              </div>
              <div style={{ fontSize: fs }} className="mt-auto text-right text-xs">
                Page {pIdx + 1} of {pages.length}
              </div>

              {/* Page break between pages */}

              {pIdx !== pages.length - 1 && <div className="page-break" />}

            </div>
          );
        })}

        {/* Note */}
        <div className="mt-2 text-xs text-gray-900">
          * This document is system generated.
        </div>
      </div>
    );
  },
);

CashBookPrint.displayName = 'CashBooPrint';
export default CashBookPrint;
