import React from "react";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintFooter from "../../../utils/utils-functions/PrintFooter";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

type GeneralLedgerPrintRow = {
  atd_id: number;
  vr_no: string;
  vr_date: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  balance_type: string;
  is_bank_voucher?: boolean;
};

type GeneralLedgerPrintAccount = {
  coa4_id: number;
  code: string;
  name: string;
  group_name: string;
  group2_name: string;
  type_name: string;
  opening_balance: number;
  opening_debit: number;
  opening_credit: number;
  debit: number;
  credit: number;
  closing_balance: number;
  closing_debit: number;
  closing_credit: number;
  rows: GeneralLedgerPrintRow[];
};

type GeneralLedgerPrintProps = {
  branchName: string;
  startDate: string;
  endDate: string;
  accountsHeadName: string;
  fontSize?: number;
  accounts: GeneralLedgerPrintAccount[];
  totals: {
    opening_debit: number;
    opening_credit: number;
    debit: number;
    credit: number;
    closing_debit: number;
    closing_credit: number;
  };
};

const number = (value: number) => thousandSeparator(Math.abs(Number(value) || 0));

const balanceText = (value: number, type?: string) => {
  if (!Number(value)) return "0.00";
  const side = type || (Number(value) >= 0 ? "Dr" : "Cr");
  return `${number(value)} ${side}`;
};

const dateText = (value?: string) => {
  if (!value) return "-";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : String(value);
};

const GeneralLedgerPrint = React.forwardRef<HTMLDivElement, GeneralLedgerPrintProps>(
  ({ branchName, startDate, endDate, accountsHeadName, fontSize, accounts, totals }, ref) => {
    const fs = Number.isFinite(fontSize) ? Number(fontSize) : 12;
    const totalFs = Math.max(fs - 1, 8);

    return (
      <div ref={ref} className="p-8 text-sm text-gray-900 print-root">
        <PrintStyles />
        <style>{`
          @media print {
            .print-root { padding: 0 !important; }
            .print-page {
              padding: 8mm !important;
              min-height: var(--print-page-height);
              display: flex;
              flex-direction: column;
            }
            .ledger-account { page-break-inside: avoid; }
          }
        `}</style>

        <div className="print-page">
          <PadPrinting />

          <div className="mb-4" style={{ fontSize: `${fs}px` }}>
            <h1 className="mt-3 text-center font-bold" style={{ fontSize: `${fs + 10}px` }}>
              General Ledger
            </h1>
            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
              <div className="text-left">
                <span className="font-semibold">Branch:</span> {branchName || "-"}
              </div>
              <div className="text-right">
                <span className="font-semibold">Period:</span> {startDate} - {endDate}
              </div>
              <div className="text-left">
                <span className="font-semibold">Accounts Head:</span>{" "}
                {accountsHeadName || "All Accounts"}
              </div>
              <div className="text-right">
                <span className="font-semibold">Basis:</span> Posted vouchers, excluding
                year-closing entries
              </div>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="border border-gray-900 px-3 py-6 text-center text-gray-500">
              No data found
            </div>
          ) : (
            accounts.map((account) => (
              <div className="ledger-account mt-4" key={account.coa4_id}>
                <div className="mb-1 flex items-end justify-between" style={{ fontSize: `${fs + 1}px` }}>
                  <div className="font-semibold">
                    {account.name}
                    <span className="ml-2 text-xs font-normal text-gray-600">
                      {account.type_name} / {account.group2_name} / {account.group_name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">Code: {account.code}</div>
                </div>

                <table className="w-full border-collapse leading-tight">
                  <colgroup>
                    <col style={{ width: "70px" }} />
                    <col style={{ width: "100px" }} />
                    <col />
                    <col style={{ width: "90px" }} />
                    <col style={{ width: "90px" }} />
                    <col style={{ width: "110px" }} />
                  </colgroup>
                  <thead className="bg-gray-100">
                    <tr>
                      {["Date", "Voucher", "Narration", "Debit", "Credit", "Balance"].map(
                        (label, index) => (
                          <th
                            key={label}
                            style={{ fontSize: fs }}
                            className={`border border-gray-900 px-2 py-1 ${
                              index >= 3 ? "text-right" : "text-left"
                            }`}
                          >
                            {label}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-semibold">
                      <td
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-0.5"
                      >
                        -
                      </td>
                      <td
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-0.5"
                      >
                        -
                      </td>
                      <td
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-0.5"
                      >
                        Opening Balance
                      </td>
                      <td
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-0.5 text-right"
                      >
                        {account.opening_debit ? number(account.opening_debit) : ""}
                      </td>
                      <td
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-0.5 text-right"
                      >
                        {account.opening_credit ? number(account.opening_credit) : ""}
                      </td>
                      <td
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-0.5 text-right"
                      >
                        {balanceText(account.opening_balance)}
                      </td>
                    </tr>

                    {account.rows.map((row) => (
                      <tr key={row.atd_id}>
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-0.5 whitespace-nowrap"
                        >
                          {dateText(row.vr_date)}
                        </td>
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-0.5 whitespace-nowrap"
                        >
                          {row.vr_no || "-"}
                        </td>
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-0.5"
                        >
                          {row.narration || "-"}
                        </td>
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-0.5 text-right"
                        >
                          {row.debit ? number(row.debit) : ""}
                        </td>
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-0.5 text-right"
                        >
                          {row.credit ? number(row.credit) : ""}
                        </td>
                        <td
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-0.5 text-right whitespace-nowrap"
                        >
                          {balanceText(row.balance, row.balance_type)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td
                        colSpan={3}
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-0.5 text-right"
                      >
                        Total
                      </td>
                      <td
                        style={{ fontSize: totalFs }}
                        className="border border-gray-900 px-2 py-0.5 text-right"
                      >
                        {number(account.debit)}
                      </td>
                      <td
                        style={{ fontSize: totalFs }}
                        className="border border-gray-900 px-2 py-0.5 text-right"
                      >
                        {number(account.credit)}
                      </td>
                      <td
                        style={{ fontSize: totalFs }}
                        className="border border-gray-900 px-2 py-0.5 text-right whitespace-nowrap"
                      >
                        {balanceText(account.closing_balance)}
                      </td>
                    </tr>
                    <tr className="font-semibold">
                      <td
                        colSpan={5}
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-0.5 text-right"
                      >
                        Closing Balance
                      </td>
                      <td
                        style={{ fontSize: totalFs }}
                        className="border border-gray-900 px-2 py-0.5 text-right whitespace-nowrap"
                      >
                        {balanceText(account.closing_balance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))
          )}

          {accounts.length > 0 && (
            <div className="mt-4">
              <table className="w-full border-collapse leading-tight">
                <colgroup>
                  <col />
                  <col style={{ width: "105px" }} />
                  <col style={{ width: "105px" }} />
                  <col style={{ width: "105px" }} />
                  <col style={{ width: "105px" }} />
                  <col style={{ width: "105px" }} />
                  <col style={{ width: "105px" }} />
                </colgroup>
                <thead className="bg-gray-100">
                  <tr>
                    {[
                      "Grand Total",
                      "Opening Dr",
                      "Opening Cr",
                      "Debit",
                      "Credit",
                      "Closing Dr",
                      "Closing Cr",
                    ].map((label, index) => (
                      <th
                        key={label}
                        style={{ fontSize: totalFs }}
                        className={`border border-gray-900 px-2 py-1 ${
                          index === 0 ? "text-left" : "text-right"
                        }`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-semibold">
                    <td style={{ fontSize: totalFs }} className="border border-gray-900 px-2 py-0.5">
                      {accounts.length === 1 ? "Account Total" : "All Accounts"}
                    </td>
                    <td
                      style={{ fontSize: totalFs }}
                      className="border border-gray-900 px-2 py-0.5 text-right"
                    >
                      {number(totals.opening_debit)}
                    </td>
                    <td
                      style={{ fontSize: totalFs }}
                      className="border border-gray-900 px-2 py-0.5 text-right"
                    >
                      {number(totals.opening_credit)}
                    </td>
                    <td
                      style={{ fontSize: totalFs }}
                      className="border border-gray-900 px-2 py-0.5 text-right"
                    >
                      {number(totals.debit)}
                    </td>
                    <td
                      style={{ fontSize: totalFs }}
                      className="border border-gray-900 px-2 py-0.5 text-right"
                    >
                      {number(totals.credit)}
                    </td>
                    <td
                      style={{ fontSize: totalFs }}
                      className="border border-gray-900 px-2 py-0.5 text-right"
                    >
                      {number(totals.closing_debit)}
                    </td>
                    <td
                      style={{ fontSize: totalFs }}
                      className="border border-gray-900 px-2 py-0.5 text-right"
                    >
                      {number(totals.closing_credit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <PrintFooter page={1} total={1} fontSize={fs} />
        </div>
      </div>
    );
  },
);

GeneralLedgerPrint.displayName = "GeneralLedgerPrint";

export default GeneralLedgerPrint;
