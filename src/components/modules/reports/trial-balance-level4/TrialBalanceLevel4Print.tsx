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

type TrialBalanceLevel4PrintProps = {
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

const TrialBalanceLevel4Print = ({
  branchName,
  startDate,
  endDate,
  fontSize,
  rows,
  totals,
}: TrialBalanceLevel4PrintProps) => {
  const fs = Number.isFinite(fontSize) ? Number(fontSize) : 12;

  return (
    <div className="bg-white p-6 text-slate-900 print-root">
      <PrintStyles />
      <div className="print-page">
        <PadPrinting />

        <div className="mb-6 text-center" style={{ fontSize: `${fs}px` }}>
          <h1 className="mt-3 font-bold" style={{ fontSize: `${fs + 10}px` }}>
            Trial Balance Level 4
          </h1>
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
                className="border border-slate-300 bg-slate-100 px-1 py-1 text-center font-semibold"
              >
                Serial
              </th>
              <th
                rowSpan={2}
                className="border border-slate-300 bg-slate-100 px-1 py-1 text-left font-semibold"
              >
                COA L4 Name
              </th>
              <th colSpan={2} className="border border-slate-300 bg-slate-100 px-1 py-1 text-center font-semibold">
                Opening
              </th>
              <th colSpan={2} className="border border-slate-300 bg-slate-100 px-1 py-1 text-center font-semibold">
                Movement
              </th>
              <th colSpan={2} className="border border-slate-300 bg-slate-100 px-1 py-1 text-center font-semibold">
                Closing
              </th>
            </tr>
            <tr>
              <th className="border border-slate-300 bg-slate-100 px-1 py-1 text-right font-semibold">
                Dr
              </th>
              <th className="border border-slate-300 bg-slate-100 px-1 py-1 text-right font-semibold">
                Cr
              </th>
              <th className="border border-slate-300 bg-slate-100 px-1 py-1 text-right font-semibold">
                Dr
              </th>
              <th className="border border-slate-300 bg-slate-100 px-1 py-1 text-right font-semibold">
                Cr
              </th>
              <th className="border border-slate-300 bg-slate-100 px-1 py-1 text-right font-semibold">
                Dr
              </th>
              <th className="border border-slate-300 bg-slate-100 px-1 py-1 text-right font-semibold">
                Cr
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key}>
                <td className="border border-slate-300 px-1 py-1 text-center">
                  {index + 1}
                </td>
                <td className="border border-slate-300 px-1 py-1">{row.name}</td>
                <td className="border border-slate-300 px-1 py-1 text-right">
                  {thousandSeparator(row.openingDebit, 0)}
                </td>
                <td className="border border-slate-300 px-1 py-1 text-right">
                  {thousandSeparator(row.openingCredit, 0)}
                </td>
                <td className="border border-slate-300 px-1 py-1 text-right">
                  {thousandSeparator(row.movementDebit, 0)}
                </td>
                <td className="border border-slate-300 px-1 py-1 text-right">
                  {thousandSeparator(row.movementCredit, 0)}
                </td>
                <td className="border border-slate-300 px-1 py-1 text-right">
                  {thousandSeparator(row.closingDebit, 0)}
                </td>
                <td className="border border-slate-300 px-1 py-1 text-right">
                  {thousandSeparator(row.closingCredit, 0)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={2}
                className="border border-slate-300 px-1 py-1 font-bold text-right"
              >
                Grand Total
              </td>
              <td className="border border-slate-300 px-1 py-1 text-right font-bold">
                {thousandSeparator(totals.openingDebit, 0)}
              </td>
              <td className="border border-slate-300 px-1 py-1 text-right font-bold">
                {thousandSeparator(totals.openingCredit, 0)}
              </td>
              <td className="border border-slate-300 px-1 py-1 text-right font-bold">
                {thousandSeparator(totals.movementDebit, 0)}
              </td>
              <td className="border border-slate-300 px-1 py-1 text-right font-bold">
                {thousandSeparator(totals.movementCredit, 0)}
              </td>
              <td className="border border-slate-300 px-1 py-1 text-right font-bold">
                {thousandSeparator(totals.closingDebit, 0)}
              </td>
              <td className="border border-slate-300 px-1 py-1 text-right font-bold">
                {thousandSeparator(totals.closingCredit, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default TrialBalanceLevel4Print;
