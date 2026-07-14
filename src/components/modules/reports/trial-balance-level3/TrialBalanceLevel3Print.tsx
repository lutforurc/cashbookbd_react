import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import ReportFooter from "../../../utils/utils-functions/ReportFooter";
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
  const formatted = thousandSeparator(Math.abs(amount));
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
  const totalFs = Math.max(fs - 1, 8);

  return (
    <div className="bg-white p-6 text-slate-900 print-root">
      <PrintStyles />
      <div className="print-page">
        <PadPrinting />

        <div className="mb-4 text-center" style={{ fontSize: `${fs}px` }}>
          <h1 className="mt-1 font-bold" style={{ fontSize: `${fs + 10}px` }}>
            Trial Balance Group
          </h1>
          <p>
            Period: {startDate} to {endDate}
          </p>
        </div>

        <table
          className="w-full border-collapse leading-tight"
          style={{ fontSize: `${fs}px` }}
        >
          <colgroup>
            <col style={{ width: "36px" }} />
            <col style={{ width: "140px" }} />
            <col />
            <col />
            <col />
            <col />
            <col />
            <col />
          </colgroup>
          <thead className="bg-gray-100">
            <tr>
              <th
                rowSpan={2}
                className="border border-gray-900 px-1 py-1 text-center font-semibold"
              >
                Serial
              </th>
              <th
                rowSpan={2}
                className="border border-gray-900 px-2 py-1 text-left font-semibold whitespace-nowrap"
              >
                Description
              </th>
              <th colSpan={2} className="border border-gray-900 px-2 py-1 text-center font-semibold">
                Opening
              </th>
              <th colSpan={2} className="border border-gray-900 px-2 py-1 text-center font-semibold">
                Movement
              </th>
              <th colSpan={2} className="border border-gray-900 px-2 py-1 text-center font-semibold">
                Closing
              </th>
            </tr>
            <tr>
              <th className="border border-gray-900 px-1 py-1 text-center font-semibold">
                Dr
              </th>
              <th className="border border-gray-900 px-1 py-1 text-center font-semibold">
                Cr
              </th>
              <th className="border border-gray-900 px-1 py-1 text-center font-semibold">
                Dr
              </th>
              <th className="border border-gray-900 px-1 py-1 text-center font-semibold">
                Cr
              </th>
              <th className="border border-gray-900 px-1 py-1 text-center font-semibold">
                Dr
              </th>
              <th className="border border-gray-900 px-1 py-1 text-center font-semibold">
                Cr
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key}>
                <td className="border border-gray-900 px-1 py-0.5 text-center align-middle">
                  {index + 1}
                </td>
                <td className="border border-gray-900 px-2 py-0.5 align-middle whitespace-nowrap">{row.name}</td>
                <td className="border border-gray-900 px-1 py-0.5 text-right">
                  {thousandSeparator(row.openingDebit)}
                </td>
                <td className="border border-gray-900 px-1 py-0.5 text-right">
                  {thousandSeparator(row.openingCredit)}
                </td>
                <td className="border border-gray-900 px-1 py-0.5 text-right">
                  {thousandSeparator(row.movementDebit)}
                </td>
                <td className="border border-gray-900 px-1 py-0.5 text-right">
                  {thousandSeparator(row.movementCredit)}
                </td>
                <td className="border border-gray-900 px-1 py-0.5 text-right">
                  {thousandSeparator(row.closingDebit)}
                </td>
                <td className="border border-gray-900 px-1 py-0.5 text-right">
                  {thousandSeparator(row.closingCredit)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-semibold">
              <td colSpan={2}
                className="border border-gray-900 px-2 py-0.5 text-right"
              >
                Grand Total
              </td>
              {/* <td className="border border-gray-900 px-2 py-0.5"></td> */}
              <td
                style={{ fontSize: `${totalFs}px` }}
                className="border border-gray-900 px-1 py-0.5 text-right"
              >
                {thousandSeparator(totals.openingDebit)}
              </td>
              <td
                style={{ fontSize: `${totalFs}px` }}
                className="border border-gray-900 px-1 py-0.5 text-right"
              >
                {thousandSeparator(totals.openingCredit)}
              </td>
              <td
                style={{ fontSize: `${totalFs}px` }}
                className="border border-gray-900 px-1 py-0.5 text-right"
              >
                {thousandSeparator(totals.movementDebit)}
              </td>
              <td
                style={{ fontSize: `${totalFs}px` }}
                className="border border-gray-900 px-1 py-0.5 text-right"
              >
                {thousandSeparator(totals.movementCredit)}
              </td>
              <td
                style={{ fontSize: `${totalFs}px` }}
                className="border border-gray-900 px-1 py-0.5 text-right"
              >
                {thousandSeparator(totals.closingDebit)}
              </td>
              <td
                style={{ fontSize: `${totalFs}px` }}
                className="border border-gray-900 px-1 py-0.5 text-right"
              >
                {thousandSeparator(totals.closingCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <ReportFooter />
    </div>
  );
};

export default TrialBalanceLevel3Print;
