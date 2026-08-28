import React from 'react';

import PrintStyles from '../../../utils/utils-functions/PrintStyles';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
// formatDayMonthYear rather than formatDate: it takes an optional value and
// returns a STRING, where formatDate returns JSX and insists on one.
import { formatDayMonthYear } from '../../../utils/utils-functions/formatDate';

/**
 * The guest register, on paper.
 *
 * ⚠️ THIS IS THE COPY SOMEBODY MAY BE ASKED TO HAND OVER. A hotel in Bangladesh
 * keeps a register of who stayed, and it is asked for by people who do not have
 * a login. So it carries the NIDs and the mobiles, and it says at the top which
 * property and which night it is about -- a page of names with no night on it
 * answers no question at all.
 *
 * ⚠️ It prints what the screen shows, and the screen shows who SLEPT here. The
 * server reads that from the nights a booking holds rather than from the
 * booking's own dates, because check-out deletes the nights a guest did not
 * sleep. Nothing here re-derives it, and nothing should: a printed register that
 * disagreed with the screen would be two answers to a question that has one.
 *
 * Not on the print designer. That is for papers a tenant re-arranges to their
 * own taste; this one is a record whose columns are not really theirs to choose,
 * and a register missing the NID column because somebody dragged it off is a
 * register that fails at the only moment it matters.
 */

type Row = {
  serial_no?: number;
  name?: string;
  named?: boolean;
  is_primary?: boolean;
  mobile?: string | null;
  national_id?: string | null;
  address?: string | null;
  gender?: string | null;
  age?: number | null;
  room?: string;
  booking_no?: string;
  check_in_date?: string;
  check_out_date?: string;
};

type Props = {
  rows: Row[];
  date: string;
  mode: string;
  branch?: { name?: string | null; address?: string | null; phone?: string | null } | null;
  rowsPerPage?: number;
  fontSize?: number;
};

const HEADINGS: Record<string, string> = {
  in_house: 'Guest Register',
  arrivals: 'Arrivals',
  departures: 'Departures',
};

const SUBTITLES: Record<string, string> = {
  in_house: 'Guests in the building on the night of',
  arrivals: 'Expected to arrive on',
  departures: 'Leaving on the morning of',
};

/**
 * Split across pages, never inside a row.
 *
 * A person's name parted from their own NID by a page break is exactly the
 * failure this document cannot afford.
 */
const chunkRows = <T,>(rows: T[], size: number): T[][] => {
  if (size <= 0) return [rows];

  const pages: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    pages.push(rows.slice(index, index + size));
  }

  return pages.length ? pages : [[]];
};

const RegisterPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ rows, date, mode, branch, rowsPerPage = 22, fontSize = 10 }, ref) => {
    const list = Array.isArray(rows) ? rows : [];
    const pages = chunkRows(list, rowsPerPage);

    return (
      <div ref={ref} className="print-root p-8 text-gray-900" style={{ fontSize }}>
        <PrintStyles />

        {pages.map((pageRows, pageIndex) => (
          <div key={pageIndex} className="print-page">
            {/* ⚠️ The REPORT's branch, not the reader's. A head-office user
                printing a property's register must head the paper with that
                property -- PadPrinting falls back to the session's branch when
                none is passed, which would put the wrong name over the wrong
                guests. */}
            <PadPrinting branch={branch ?? undefined} />

            <div className="mb-3 text-center">
              <h1 className="text-xl font-bold">{HEADINGS[mode] ?? 'Guest Register'}</h1>

              {branch?.name ? (
                <div className="text-xs">
                  {branch.name}
                  {branch.address ? `, ${branch.address}` : ''}
                </div>
              ) : null}

              <div className="mt-1 text-xs">
                <span className="font-semibold">{SUBTITLES[mode] ?? 'On'}:</span>{' '}
                {formatDayMonthYear(date)}
                <span className="ml-3 font-semibold">Persons:</span> {list.length}
              </div>
            </div>

            <table className="w-full table-fixed border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-400 px-1 py-1 text-center" style={{ width: '5%' }}>
                    #
                  </th>
                  <th className="border border-gray-400 px-1 py-1 text-left" style={{ width: '22%' }}>
                    Name
                  </th>
                  <th className="border border-gray-400 px-1 py-1 text-left" style={{ width: '10%' }}>
                    Room
                  </th>
                  <th className="border border-gray-400 px-1 py-1 text-left" style={{ width: '13%' }}>
                    Mobile
                  </th>
                  <th className="border border-gray-400 px-1 py-1 text-left" style={{ width: '16%' }}>
                    NID
                  </th>
                  <th className="border border-gray-400 px-1 py-1 text-left" style={{ width: '19%' }}>
                    Address
                  </th>
                  <th className="border border-gray-400 px-1 py-1 text-center" style={{ width: '15%' }}>
                    Stay
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => (
                  <tr key={`${row.booking_no}-${row.serial_no ?? index}`}>
                    <td className="border border-gray-400 px-1 py-1 text-center">
                      {row.serial_no ?? index + 1}
                    </td>
                    <td className="border border-gray-400 px-1 py-1">
                      {row.name}
                      {/* ⚠️ Marked on the paper too. A register that printed the
                          person who telephoned as the person who slept there
                          would be wrong about its only fact — and on paper
                          nobody can hover over anything to find out. */}
                      {row.named === false ? (
                        <span className="ml-1 text-[0.85em] italic">(booker — nobody named)</span>
                      ) : null}
                    </td>
                    <td className="border border-gray-400 px-1 py-1">{row.room || '—'}</td>
                    <td className="border border-gray-400 px-1 py-1">{row.mobile || '—'}</td>
                    <td className="border border-gray-400 px-1 py-1">{row.national_id || '—'}</td>
                    <td className="border border-gray-400 px-1 py-1">{row.address || '—'}</td>
                    <td className="border border-gray-400 px-1 py-1 text-center">
                      {formatDayMonthYear(row.check_in_date)} → {formatDayMonthYear(row.check_out_date)}
                    </td>
                  </tr>
                ))}

                {pageRows.length === 0 ? (
                  <tr>
                    <td className="border border-gray-400 px-1 py-3 text-center" colSpan={7}>
                      Nobody on this list.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            {/* Signed on the last page only. A signature under every page of a
                register would be four signatures for one night's record. */}
            {pageIndex === pages.length - 1 ? (
              <div className="mt-10 flex justify-end">
                <div className="w-56 border-t border-gray-500 pt-1 text-center text-xs">
                  For the Hotel
                </div>
              </div>
            ) : null}

            <PrintFooter />
          </div>
        ))}
      </div>
    );
  },
);

RegisterPrint.displayName = 'RegisterPrint';

export default RegisterPrint;
