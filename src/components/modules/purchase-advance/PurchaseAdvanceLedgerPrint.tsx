import React, { Fragment } from 'react';

import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

/**
 * The Purchase Advance ledger, on paper.
 *
 * ⚠️ It prints what the screen was showing -- the same answer, nothing
 * recomputed -- so the paper can never disagree with the screen it came from.
 * The goods under each bill are printed when asked for.
 */

export type LedgerRow = {
  id: number;
  kind: 'advance' | 'bill' | 'refund' | 'topup';
  given: number;
  used: number;
  bought_from?: string | null;
  note?: string | null;
  vr_no: string;
  vr_date: string;
  /** The voucher's own id: a number alone is not unique across branches. */
  main_trx_id: number;
  balance: number;
  items?: { name: string | null; kind: string; quantity: number; unit: string | null; rate: number; amount: number }[];
};

type Props = {
  employee: { name: string; designation?: string | null };
  from: string;
  to: string;
  opening: number;
  rows: LedgerRow[];
  debit: number;
  credit: number;
  balance: number;
  withItems: boolean;
};

const LABEL: Record<LedgerRow['kind'], string> = {
  advance: 'Advance given',
  bill: 'Goods bought',
  refund: 'Returned by him',
  topup: 'Paid over the advance',
};

const money = (value: number) => thousandSeparator(Number(value) || 0);
const day = (value?: string | null) => (value ? String(value).slice(0, 10).split('-').reverse().join('/') : '');
const balanceText = (value: number) =>
  Number(value) === 0 ? '-' : `${money(Math.abs(Number(value)))}${Number(value) < 0 ? ' Cr' : ' Dr'}`;

const td = 'border border-gray-800 px-1 py-0.5 align-top';

const PurchaseAdvanceLedgerPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ employee, from, to, opening, rows, debit, credit, balance, withItems }, ref) => (
    <div ref={ref} className="print-container hidden print:block">
      <PrintStyles />

      <div className="print-page">
        <PadPrinting />

        <div className="mb-3 text-xs">
          <h1 className="mt-3 text-center text-lg font-bold">Purchase Advance Ledger</h1>
          <div className="mt-1 text-center">
            {employee.name}
            {employee.designation ? ` (${employee.designation})` : ''} · {day(from)} to {day(to)}
          </div>
        </div>

        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className={`${td} text-left`}>Date</th>
              <th className={`${td} text-left`}>Vr. No.</th>
              <th className={`${td} text-left`}>Particulars</th>
              <th className={`${td} text-right !align-middle`}>Debit</th>
              <th className={`${td} text-right !align-middle`}>Credit</th>
              <th className={`${td} text-right !align-middle`}>Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="avoid-break font-semibold">
              <td className={td}>{day(from)}</td>
              <td className={td} />
              <td className={td}>Opening Balance</td>
              <td className={td} />
              <td className={td} />
              <td className={`${td} text-right !align-middle`}>{balanceText(opening)}</td>
            </tr>

            {rows.map((row) => (
              <Fragment key={row.id}>
                <tr className="avoid-break">
                  <td className={td}>{day(row.vr_date)}</td>
                  <td className={td}>{row.vr_no}</td>
                  <td className={td}>
                    {LABEL[row.kind] ?? row.kind}
                    {row.bought_from ? ` from ${row.bought_from}` : ''}
                    {row.note ? ` — ${row.note}` : ''}
                    {withItems && row.items?.length ? (
                      <table className="mt-0.5 w-full text-[10px]">
                        <tbody>
                          {row.items.map((item, index) => (
                            <tr key={index}>
                              <td className="pr-1">{item.name || '-'}</td>
                              <td className="pr-1 text-right">
                                {Number(item.quantity)} {item.unit || ''}
                              </td>
                              <td className="pr-1 text-right">@ {money(Number(item.rate))}</td>
                              <td className="text-right">{money(Number(item.amount))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                  </td>
                  <td className={`${td} text-right !align-middle`}>{Number(row.given) ? money(Number(row.given)) : ''}</td>
                  <td className={`${td} text-right !align-middle`}>{Number(row.used) ? money(Number(row.used)) : ''}</td>
                  <td className={`${td} text-right !align-middle`}>{balanceText(Number(row.balance))}</td>
                </tr>
              </Fragment>
            ))}

            <tr className="avoid-break font-bold">
              <td className={`${td} text-right`} colSpan={3}>
                Total / Closing Balance
              </td>
              <td className={`${td} text-right !align-middle`}>{money(debit)}</td>
              <td className={`${td} text-right !align-middle`}>{money(credit)}</td>
              <td className={`${td} text-right !align-middle`}>{balanceText(balance)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-2 text-[10px]">
          Dr: the employee holds the company's money. Cr: the company owes the employee.
        </div>

        {/* Pinned to every sheet: the page breaks are the browser's. */}
        <PrintFooter fixed />
      </div>
    </div>
  ),
);

export default PurchaseAdvanceLedgerPrint;
