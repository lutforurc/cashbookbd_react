import React from "react";
import PrintStyles from "../../../utils/utils-functions/PrintStyles";
import PadPrinting from "../../../utils/utils-functions/PadPrinting";
import PrintFooter from "../../../utils/utils-functions/PrintFooter";
import MonthlyStatementBody from "./MonthlyStatementBody";
import { MonthlyStatementData } from "./monthlyStatementSlice";

type Props = {
  data: MonthlyStatementData | null;
  startDate?: string;
  endDate?: string;
  fontSize?: number;
};

const MonthlyStatementPrint = React.forwardRef<HTMLDivElement, Props>(
  ({ data, startDate, endDate, fontSize = 12 }, ref) => (
    <div ref={ref} className="p-8 text-gray-900 print-root">
      <PrintStyles />

      <div className="print-page">
        <PadPrinting />

        <div className="text-center mb-4">
          <h1 className="text-lg font-bold underline">MONTHLY STATEMENT</h1>
          <div className="text-sm font-semibold">
            {startDate || "-"} to {endDate || "-"}
          </div>
        </div>

        {data ? <MonthlyStatementBody data={data} print fontSize={fontSize} /> : null}

        <PrintFooter page={1} total={1} />
      </div>
    </div>
  )
);

MonthlyStatementPrint.displayName = "MonthlyStatementPrint";
export default MonthlyStatementPrint;
