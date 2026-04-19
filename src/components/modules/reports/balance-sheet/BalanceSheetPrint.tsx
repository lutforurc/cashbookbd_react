import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

type BalanceSheetItem = {
  name?: string;
  balance?: number;
};

type BalanceSheetGroup = {
  group_name?: string;
  total?: number;
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
  };
};

const formatAmount = (amount: number | string) => {
  const sanitizedAmount =
    typeof amount === "string" ? amount.replace(/,/g, "") : amount;
  const numericAmount = Number(sanitizedAmount || 0);
  const formatted = thousandSeparator(Math.abs(numericAmount), 2);

  return numericAmount < 0 ? `(${formatted})` : formatted;
};

const Section = ({
  title,
  groups,
  totalLabel,
  totalValue,
  fontSize,
}: {
  title: string;
  groups: BalanceSheetGroup[];
  totalLabel: string;
  totalValue: string | number;
  fontSize: number;
}) => (
  <div className="w-full">
    <table className="w-full border-collapse" style={{ fontSize: `${fontSize}px` }}>
      <thead>
        <tr>
          <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left font-semibold text-slate-900">
            {title}
          </th>
          <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-right font-semibold text-slate-900">
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {groups.map((group, index) => (
          <FragmentRow group={group} key={`${group.group_name}-${index}`} />
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td className="border border-slate-300 px-3 py-2 font-bold">
            {totalLabel}
          </td>
          <td className="border border-slate-300 px-3 py-2 text-right font-bold">
            {formatAmount(totalValue)}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
);

const FragmentRow = ({ group }: { group: BalanceSheetGroup }) => (
  <>
    <tr>
      <td className="border border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
        {group.group_name}
      </td>
      <td className="border border-slate-300 bg-slate-50 px-3 py-2 text-right font-semibold text-slate-800">
        {formatAmount(Number(group.total || 0))}
      </td>
    </tr>
  </>
);

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
  const contentWidthClass =
    Number.isFinite(rowsPerPage) && Number(rowsPerPage) <= 10 ? "gap-4" : "gap-6";

  return (
    <div className="bg-white p-6 text-slate-900 print-root">
      <PrintStyles />
      <div className="print-page">
        <PadPrinting />

        <div className="mb-6 text-center" style={{ fontSize: `${fs}px` }}>
          <h1 className="font-bold mt-3" style={{ fontSize: `${fs + 10}px` }}>Balance Sheet</h1>
          <p>
            Period: {startDate} to {endDate}
          </p>
          <p>As on: {endDate}</p>
        </div>

        <div className={`grid grid-cols-2 ${contentWidthClass}`}>
          <Section
            title="Assets"
            groups={assets}
            totalLabel="Total Assets"
            totalValue={totals.assets}
            fontSize={fs}
          />
          <div className="space-y-6">
            <Section
              title="Liabilities"
              groups={liabilities}
              totalLabel="Liabilities Total"
              totalValue={ thousandSeparator(totals.liabilities, 0)}
              fontSize={fs}
            />
            <Section
              title="Equity"
              groups={equity}
              totalLabel="Equity Total"
              totalValue={ thousandSeparator(totals.equity, 0)}
              fontSize={fs}
            />
            <table className="w-full border-collapse" style={{ fontSize: `${fs}px` }}>
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-3 py-2 font-bold">
                    Total Liabilities & Equity
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-right font-bold">
                    {formatAmount(totals.liabilitiesAndEquity)}
                  </td>
                </tr>
                {Math.abs(totals.difference) > 0.009 && (
                  <tr>
                    <td className="border border-amber-300 bg-amber-50 px-3 py-2 font-semibold text-amber-800">
                      Difference
                    </td>
                    <td className="border border-amber-300 bg-amber-50 px-3 py-2 text-right font-semibold text-amber-800">
                      {formatAmount(totals.difference)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheetPrint;
