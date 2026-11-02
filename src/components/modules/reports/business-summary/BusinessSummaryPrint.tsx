import React from "react";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintFooter from "../../../utils/utils-functions/PrintFooter";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import BusinessSummaryGrid, { buildLines } from "./BusinessSummaryGrid";
import type { BusinessSummaryData } from "./BusinessSummaryGrid";

type Props = {
  data: BusinessSummaryData | null;
  branchName?: string;
  year?: number | string;
  title?: string;
  rowsPerPage?: number;
  fontSize?: number;
};

const chunkRows = <T,>(data: T[], size: number): T[][] => {
  if (size <= 0) return [data];
  const out: T[][] = [];
  for (let i = 0; i < data.length; i += size) {
    out.push(data.slice(i, i + size));
  }
  return out;
};

const BusinessSummaryPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ data, branchName, year, title = "Business Summary", rowsPerPage = 0, fontSize }, ref) => {
    // Twenty-six columns on one landscape sheet, so the type starts small.
    const fs = Number.isFinite(fontSize) && Number(fontSize) > 0 ? Number(fontSize) : 8;
    const pages = data ? chunkRows(buildLines(data), rowsPerPage) : [];

    return (
      <div ref={ref} className="p-4 text-gray-900 print-root">
        <PrintStyles orientation="landscape" narrowMargins />

        {pages.map((pageLines, pageIndex) => (
          <div key={pageIndex} className="print-page">
            <PadPrinting />

            <div className="mb-3">
              <h1 className="text-center text-xl font-bold">{title}</h1>
              <div className="mt-1 text-xs">
                {branchName ? <span className="mr-4"><span className="font-semibold">Branch:</span> {branchName}</span> : null}
                <span><span className="font-semibold">Year:</span> {year ?? "-"}</span>
              </div>
            </div>

            <BusinessSummaryGrid data={data} lines={pageLines} print fontSize={fs} />

            <PrintFooter page={pageIndex + 1} total={pages.length} fontSize={fs} />

            {pageIndex !== pages.length - 1 && <div className="page-break" />}
          </div>
        ))}
      </div>
    );
  }
);

BusinessSummaryPrint.displayName = "BusinessSummaryPrint";

export default BusinessSummaryPrint;
