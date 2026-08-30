import React from "react";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintFooter from "../../../utils/utils-functions/PrintFooter";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { useSelector } from "react-redux";
import { formatMobile, useMobileFormat } from '../../../utils/utils-functions/mobileFormat';
import { isBranchSettingOn } from '../../../utils/userFeatureSettings';
import formatAge, { Age } from '../../../utils/utils-functions/formatAge';


type DueRow = {
  sl_number?: number | string;
  coa4_name?: string;
  mobile?: string;
  manual_address?: string;
  ledger_page?: string | number;
  area_id?: string | number;
  debit?: number;
  credit?: number;
  ageing?: { label: string; amount: number }[];
  oldest_days?: number;
  oldest_age?: Age;
};

/** The four ages, in the order they are printed. */
const BUCKETS = ['0-30', '31-60', '61-90', '90+'];

/** A row's own figure for one bucket. Absent means nothing owed, not unknown. */
const aged = (row: DueRow, label: string) =>
  Number(row.ageing?.find((b) => b.label === label)?.amount ?? 0);

type Props = {
  rows: DueRow[];
  endDate?: string;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
  /**
   * Follows the screen's own switch, rather than deciding for itself.
   *
   * Somebody who turned the ageing off and then pressed Print meant to print
   * the list they were looking at.
   */
  showAgeing?: boolean;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) out.push(data.slice(i, i + size));
  return out;
};

const DueListPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ rows, endDate, title = "Due List", rowsPerPage = 20, fontSize = 10, showAgeing = false }, ref) => {
    const rowsArr = Array.isArray(rows) ? rows : [];
    const pages = chunkRows(rowsArr, rowsPerPage);
    const fs = fontSize;
    const settings = useSelector((state: any) => state.settings);
    const mobileFormat = useMobileFormat();

    // The setting is text: '0' is what "off" looks like, and a bare `&&` reads
    // that as true. Asked properly, so the printed report matches the screen.
    const showAddress = isBranchSettingOn(settings, 'due_list_with_address');

    return (
      <div ref={ref} className="p-8 text-gray-900 print-root">
        <PrintStyles />

        {pages.map((pageRows, pIdx) => (
          <div key={pIdx} className="print-page">

            {/* Optional pad print header */}
            <PadPrinting />

            {/* Header */}
            <div className="mb-4 text-center">
              <h1 className="text-2xl font-bold">{title}</h1>
              <div className="text-xs mt-1">
                <span className="font-semibold">As On:</span> {endDate || "-"}
              </div>

              {/* On the paper, not only the screen. The buckets are the result
                  of a rule -- payments applied oldest-first, because a receipt
                  here never names the bill it settles -- and the page will be
                  read by somebody who never saw the screen. */}
              {showAgeing ? (
                <div className="text-xs mt-1">
                  Ageing from voucher date, oldest unpaid amount settled first.
                </div>
              ) : null}
            </div>

            {/* Table */}
            <table className="w-full table-fixed border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th style={{ fontSize: fs }} className="border border-gray-900 py-2 px-2 w-12 text-center">Sl</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 py-2 px-2">Member Info</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 py-2 px-2 w-20 text-center">Area</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 py-2 px-2 w-24 text-right">Debit</th>
                  <th style={{ fontSize: fs }} className="border border-gray-900 py-2 px-2 w-24 text-right">Credit</th>
                  {showAgeing
                    ? BUCKETS.map((label) => (
                        <th
                          key={label}
                          style={{ fontSize: fs }}
                          className="border border-gray-900 py-2 px-2 w-20 text-right"
                        >
                          {label === '90+' ? '90+ d' : label}
                        </th>
                      ))
                    : null}
                </tr>
              </thead>

              <tbody>
                {pageRows.length ? (
                  pageRows.map((row, idx) => (
                    <tr key={idx} className="align-top avoid-break">
                      {/* Sl Number */}
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center align-middle">
                        {row.sl_number}
                      </td>

                      {/* Member Info */}
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1">
                        <div className={showAddress ? `font-semibold` : ``}>{row.coa4_name}</div>
                        {showAddress && (row.mobile?.length ?? 0) > 10 && (
                          <>
                            <div className="text-xs">{formatMobile(row.mobile, mobileFormat)}</div>
                            <div className="text-xs">{row.manual_address}</div>
                            {/* <div className="text-xs">{row.ledger_page}</div> */}
                          </>
                        )}
                      </td>
                      {/* Area */}
                      <td style={{ fontSize: fs }} className="border border-gray-900 px-2 py-1 text-center">
                        {row.area_id || "-"}
                      </td>

                      {/* Debit */}
                      <td
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-1 text-right align-middle"
                      >
                        {Number(row?.debit) > 0 ? thousandSeparator(Number(row?.debit)) : "-"}
                      </td>

                      {/* Credit */}
                      <td
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-1 text-right align-middle"
                      >
                        {Number(row.credit) > 0 ? thousandSeparator(Number(row.credit)) : "-"}
                      </td>

                      {/* ⚠️ These four add up to Debit, and the server checks
                          that they do for every row -- see ageing_check.php.
                          A printed page outlives the screen it came from, so a
                          bucket total that disagreed with the balance beside it
                          would be argued over long after anyone could re-run
                          the report. */}
                      {showAgeing
                        ? BUCKETS.map((label) => (
                            <td
                              key={label}
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-1 text-right align-middle"
                            >
                              {aged(row, label) > 0 ? thousandSeparator(aged(row, label)) : "-"}

                              {/* Only against the oldest bucket, and only once
                                  it is past ninety days: below that the column
                                  heading already says the age closely enough. */}
                              {label === '90+' && aged(row, label) > 0 && Number(row.oldest_days) > 90 ? (
                                <div style={{ fontSize: Math.max(fs - 3, 5) }} className="text-gray-600">
                                  {formatAge(row.oldest_age)}
                                </div>
                              ) : null}
                            </td>
                          ))
                        : null}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={showAgeing ? 9 : 5}
                      className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                    >
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Footer */}
            <PrintFooter page={pIdx + 1} total={pages.length} fontSize={fs} />

            {pIdx !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}
      </div>
    );
  }
);

DueListPrint.displayName = "DueListPrint";
export default DueListPrint;
