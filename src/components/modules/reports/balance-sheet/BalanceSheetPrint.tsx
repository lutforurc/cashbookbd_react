import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintFooter from '../../../utils/utils-functions/PrintFooter';
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

type ColumnAmounts = {
  opening: number;
  movement: number;
  closing: number;
};

type BalanceSheetItem = {
  name?: string;
  balance?: number;
};

type BalanceSheetGroup = {
  group_name?: string;
  total?: number;
  opening?: number;
  movement?: number;
  closing?: number;
  items?: BalanceSheetItem[];
};

type BalanceSheetPrintProps = {
  branchName: string;
  startDate: string;
  endDate: string;
  rowsPerPage?: number;
  fontSize?: number;
  assets: BalanceSheetGroup[];
  liabilities: BalanceSheetGroup[];
  equity: BalanceSheetGroup[];
  totals: {
    assets: number;
    liabilities: number;
    equity: number;
    liabilitiesAndEquity: number;
    difference: number;
    assetsColumns?: ColumnAmounts;
    liabilitiesColumns?: ColumnAmounts;
    equityColumns?: ColumnAmounts;
  };
};

/**
 * One line of the printed sheet. The balance sheet reads as a single running
 * table -- the way the trial balance prints -- so the section headings and the
 * section totals travel in the same list as the accounts and break across
 * pages with them.
 *
 * `side` is which column the money stands in: assets are debits, liabilities
 * and equity are credits. That is what makes the Grand Total's two figures
 * agree when the sheet balances.
 */
type PrintLine =
  | { kind: "section"; label: string }
  | { kind: "item"; serial: number; name: string; side: Side; amounts: ColumnAmounts }
  | { kind: "total"; label: string; side: Side; amounts: ColumnAmounts };

type Side = "debit" | "credit";

const toNum = (value: any) => {
  const parsed = Number(typeof value === "string" ? value.replace(/,/g, "") : value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (amount: number | null) => {
  if (amount === null) return "-";

  const numericAmount = Number(amount || 0);
  if (numericAmount === 0) return "-";

  const formatted = thousandSeparator(Math.abs(numericAmount));

  return numericAmount < 0 ? `(${formatted})` : formatted;
};

const groupAmounts = (group: BalanceSheetGroup): ColumnAmounts => ({
  opening: toNum(group.opening),
  movement: toNum(group.movement),
  closing: toNum(group.closing ?? group.total),
});

const addAmounts = (left: ColumnAmounts, right: ColumnAmounts): ColumnAmounts => ({
  opening: left.opening + right.opening,
  movement: left.movement + right.movement,
  closing: left.closing + right.closing,
});

const chunkLines = (lines: PrintLine[], size: number): PrintLine[][] => {
  if (!Array.isArray(lines)) return [[]];
  // Zero is "All": one unbroken sheet.
  if (size <= 0) return [lines];

  const out: PrintLine[][] = [];
  for (let index = 0; index < lines.length; index += size) {
    out.push(lines.slice(index, index + size));
  }

  return out.length > 0 ? out : [[]];
};

const buildLines = (
  assets: BalanceSheetGroup[],
  liabilities: BalanceSheetGroup[],
  equity: BalanceSheetGroup[],
  sectionTotals: {
    assets: ColumnAmounts;
    liabilities: ColumnAmounts;
    equity: ColumnAmounts;
    liabilitiesAndEquity: ColumnAmounts;
  },
): PrintLine[] => {
  const lines: PrintLine[] = [];
  let serial = 0;

  const pushSection = (
    title: string,
    groups: BalanceSheetGroup[],
    side: Side,
    totalLabel: string,
    totalAmounts: ColumnAmounts,
  ) => {
    if (groups.length === 0) return;

    lines.push({ kind: "section", label: title });

    groups.forEach((group) => {
      serial += 1;
      lines.push({
        kind: "item",
        serial,
        name: group.group_name || "-",
        side,
        amounts: groupAmounts(group),
      });
    });

    lines.push({ kind: "total", label: totalLabel, side, amounts: totalAmounts });
  };

  pushSection("Assets", assets, "debit", "Total Assets", sectionTotals.assets);
  pushSection("Liabilities", liabilities, "credit", "Liabilities Total", sectionTotals.liabilities);
  pushSection("Equity", equity, "credit", "Equity Total", sectionTotals.equity);

  lines.push({
    kind: "total",
    label: "Total Liabilities & Equity",
    side: "credit",
    amounts: sectionTotals.liabilitiesAndEquity,
  });

  return lines;
};

const BalanceSheetPrint = ({
  branchName,
  startDate,
  endDate,
  rowsPerPage,
  fontSize,
  assets,
  liabilities,
  equity,
  totals,
}: BalanceSheetPrintProps) => {
  const fs = Number.isFinite(fontSize) ? Number(fontSize) : 12;
  const totalFs = Math.max(fs - 1, 8);
  const askedRows = Number(rowsPerPage);

  // Older callers passed closing figures only; the opening and movement
  // columns then print empty rather than wrong.
  const assetsColumns = totals.assetsColumns || { opening: 0, movement: 0, closing: totals.assets };
  const liabilitiesColumns =
    totals.liabilitiesColumns || { opening: 0, movement: 0, closing: totals.liabilities };
  const equityColumns = totals.equityColumns || { opening: 0, movement: 0, closing: totals.equity };
  const liabilitiesAndEquityColumns = addAmounts(liabilitiesColumns, equityColumns);

  const lines = buildLines(assets, liabilities, equity, {
    assets: assetsColumns,
    liabilities: liabilitiesColumns,
    equity: equityColumns,
    liabilitiesAndEquity: liabilitiesAndEquityColumns,
  });
  const pages = chunkLines(lines, askedRows > 0 ? askedRows : 0);
  const isUnbalanced = Math.abs(totals.difference) > 0.009;

  /** The six money cells of one line: Opening, Movement and Closing, Dr then Cr. */
  const amountCells = (side: Side, amounts: ColumnAmounts, cellFs: number, bold: boolean) => {
    const cellClass = `border border-gray-900 px-1 py-0.5 text-right${bold ? " font-semibold" : ""}`;

    return (["opening", "movement", "closing"] as const).flatMap((column) => [
      <td key={`${column}-dr`} style={{ fontSize: cellFs }} className={cellClass}>
        {formatAmount(side === "debit" ? amounts[column] : null)}
      </td>,
      <td key={`${column}-cr`} style={{ fontSize: cellFs }} className={cellClass}>
        {formatAmount(side === "credit" ? amounts[column] : null)}
      </td>,
    ]);
  };

  return (
    <div className="bg-white text-gray-900 print-root p-8 text-sm">
      <PrintStyles />
      <style>{`
        @media print {
          .page-break { page-break-after: always; }
          .print-root { padding: 0 !important; }
          .print-page {
            padding: 8mm !important;
            min-height: var(--print-page-height);
            display: flex;
            flex-direction: column;
          }
        }
      `}</style>

      {pages.map((pageLines, pageIndex) => {
        const isLastPage = pageIndex === pages.length - 1;

        return (
          <div key={pageIndex} className="print-page">
            <PadPrinting />

            <div className="mb-4 text-center" style={{ fontSize: `${fs}px` }}>
              <h1 className="mt-3 font-bold" style={{ fontSize: `${fs + 10}px` }}>
                Balance Sheet
              </h1>
              <p>
                Period: {startDate} to {endDate}
              </p>
              <p>As on: {endDate}</p>
            </div>

            <div className="w-full overflow-hidden">
              <table className="w-full border-collapse leading-tight">
                <colgroup>
                  <col style={{ width: "40px" }} />
                  <col />
                  <col style={{ width: "78px" }} />
                  <col style={{ width: "78px" }} />
                  <col style={{ width: "78px" }} />
                  <col style={{ width: "78px" }} />
                  <col style={{ width: "78px" }} />
                  <col style={{ width: "78px" }} />
                </colgroup>
                <thead className="bg-gray-100">
                  <tr>
                    <th
                      rowSpan={2}
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-1 py-1 text-center"
                    >
                      Serial
                    </th>
                    <th
                      rowSpan={2}
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-1 text-left"
                    >
                      Description
                    </th>
                    <th
                      colSpan={2}
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-1 text-center"
                    >
                      Opening
                    </th>
                    <th
                      colSpan={2}
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-1 text-center"
                    >
                      Movement
                    </th>
                    <th
                      colSpan={2}
                      style={{ fontSize: fs }}
                      className="border border-gray-900 px-2 py-1 text-center"
                    >
                      Closing
                    </th>
                  </tr>
                  <tr>
                    {["Dr", "Cr", "Dr", "Cr", "Dr", "Cr"].map((label, index) => (
                      <th
                        key={`${label}-${index}`}
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-1 py-1 text-center"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageLines.length > 0 ? (
                    pageLines.map((line, index) => {
                      if (line.kind === "section") {
                        return (
                          <tr key={`${line.label}-${index}`} className="bg-gray-100 font-semibold">
                            <td
                              colSpan={8}
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-1 text-left uppercase"
                            >
                              {line.label}
                            </td>
                          </tr>
                        );
                      }

                      if (line.kind === "total") {
                        return (
                          <tr key={`${line.label}-${index}`} className="font-semibold">
                            <td
                              colSpan={2}
                              style={{ fontSize: fs }}
                              className="border border-gray-900 px-2 py-0.5 text-right"
                            >
                              {line.label}
                            </td>
                            {amountCells(line.side, line.amounts, totalFs, true)}
                          </tr>
                        );
                      }

                      return (
                        <tr key={`${line.name}-${line.serial}`}>
                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-1 py-0.5 text-center align-middle"
                          >
                            {line.serial}
                          </td>
                          <td
                            style={{ fontSize: fs }}
                            className="border border-gray-900 px-2 py-0.5 align-middle"
                          >
                            {line.name}
                          </td>
                          {amountCells(line.side, line.amounts, fs, false)}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="border border-gray-900 px-3 py-6 text-center text-gray-500"
                      >
                        No data found
                      </td>
                    </tr>
                  )}
                </tbody>
                {isLastPage && (
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold">
                      <td
                        colSpan={2}
                        style={{ fontSize: fs }}
                        className="border border-gray-900 px-2 py-1 text-right"
                      >
                        Grand Total
                      </td>
                      {(["opening", "movement", "closing"] as const).flatMap((column) => [
                        <td
                          key={`grand-${column}-dr`}
                          style={{ fontSize: totalFs }}
                          className="border border-gray-900 px-1 py-1 text-right"
                        >
                          {formatAmount(assetsColumns[column])}
                        </td>,
                        <td
                          key={`grand-${column}-cr`}
                          style={{ fontSize: totalFs }}
                          className="border border-gray-900 px-1 py-1 text-right"
                        >
                          {formatAmount(liabilitiesAndEquityColumns[column])}
                        </td>,
                      ])}
                    </tr>
                    {isUnbalanced && (
                      <tr className="font-semibold">
                        <td
                          colSpan={2}
                          style={{ fontSize: fs }}
                          className="border border-gray-900 px-2 py-0.5 text-right"
                        >
                          Difference
                        </td>
                        <td
                          colSpan={6}
                          style={{ fontSize: totalFs }}
                          className="border border-gray-900 px-2 py-0.5 text-right"
                        >
                          {formatAmount(totals.difference)}
                        </td>
                      </tr>
                    )}
                  </tfoot>
                )}
              </table>
            </div>

            <PrintFooter page={pageIndex + 1} total={pages.length} fontSize={fs} />

            {!isLastPage && <div className="page-break" />}
          </div>
        );
      })}
    </div>
  );
};

export default BalanceSheetPrint;
