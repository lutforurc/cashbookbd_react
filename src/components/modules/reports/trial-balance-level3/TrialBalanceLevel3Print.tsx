import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

type TrialBalancePrintRow = {
  key: string;
  code: string;
  name: string;
  openingDebit: number;
  openingCredit: number;
  movementDebit: number;
  movementCredit: number;
  closingDebit: number;
  closingCredit: number;
};

type TrialBalanceLevel3PrintProps = {
  branchName: string;
  startDate: string;
  endDate: string;
  fontSize?: number;
  rows: TrialBalancePrintRow[];
  totals: {
    openingDebit: number;
    openingCredit: number;
    movementDebit: number;
    movementCredit: number;
    closingDebit: number;
    closingCredit: number;
  };
};

const formatAmount = (amount: number) => {
  const formatted = thousandSeparator(Math.abs(amount), 2);
  return amount < 0 ? `(${formatted})` : formatted;
};

const TrialBalanceLevel3Print = ({
  branchName,
  startDate,
  endDate,
  fontSize,
  rows,
  totals,
}: TrialBalanceLevel3PrintProps) => {
  const fs = Number.isFinite(fontSize) ? Number(fontSize) : 12;

  return (
    <div className="bg-white p-6 text-slate-900 print-root">
      <PrintStyles />
      <div className="print-page">
        <PadPrinting />

        <div className="mb-6 text-center" style={{ fontSize: `${fs}px` }}>
          <h1 className="mt-3 font-bold" style={{ fontSize: `${fs + 10}px` }}>
            Trial Balance Level 3
          </h1>
          <p>{branchName}</p>
          <p>
            Period: {startDate} to {endDate}
          </p>
        </div>

        <table
          className="w-full border-collapse"
          style={{ fontSize: `${fs}px` }}
        >
          <thead>
            <tr>
              <th
                rowSpan={2}
                className="border border-slate-300 bg-slate-100 px-3 py-2 text-left font-semibold"
              >
                COA L3 Name
              </th>
              <th colSpan={2} className="border border-slate-300 bg-slate-100 px-3 py-2 text-center font-semibold">
                Opening
              </th>
              <th colSpan={2} className="border border-slate-300 bg-slate-100 px-3 py-2 text-center font-semibold">
                Movement
              </th>
              <th colSpan={2} className="border border-slate-300 bg-slate-100 px-3 py-2 text-center font-semibold">
                Closing
              </th>
            </tr>
            <tr>
              <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-right font-semibold">
                Dr
              </th>
              <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-right font-semibold">
                Cr
              </th>
              <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-right font-semibold">
                Dr
              </th>
              <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-right font-semibold">
                Cr
              </th>
              <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-right font-semibold">
                Dr
              </th>
              <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-right font-semibold">
                Cr
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="border border-slate-300 px-3 py-2">{row.name}</td>
                <td className="border border-slate-300 px-3 py-2 text-right">
                  {formatAmount(row.openingDebit)}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-right">
                  {formatAmount(row.openingCredit)}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-right">
                  {formatAmount(row.movementDebit)}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-right">
                  {formatAmount(row.movementCredit)}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-right">
                  {formatAmount(row.closingDebit)}
                </td>
                <td className="border border-slate-300 px-3 py-2 text-right">
                  {formatAmount(row.closingCredit)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td
                className="border border-slate-300 px-3 py-2 font-bold"
              >
                Grand Total
              </td>
              <td className="border border-slate-300 px-3 py-2 text-right font-bold">
                {formatAmount(totals.openingDebit)}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-right font-bold">
                {formatAmount(totals.openingCredit)}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-right font-bold">
                {formatAmount(totals.movementDebit)}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-right font-bold">
                {formatAmount(totals.movementCredit)}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-right font-bold">
                {formatAmount(totals.closingDebit)}
              </td>
              <td className="border border-slate-300 px-3 py-2 text-right font-bold">
                {formatAmount(totals.closingCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default TrialBalanceLevel3Print;
