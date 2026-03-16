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

const formatAmount = (amount: number) => {
  const formatted = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return amount < 0 ? `(${formatted})` : formatted;
};

const SUMMARY_ONLY_GROUP_PATTERNS = [
  "account receivable",
  "accounts receivable",
  "account payable",
  "accounts payable",
  "receivable",
  "payable",
];

const shouldShowSummaryOnly = (groupName?: string) => {
  const normalizedName = String(groupName || "").trim().toLowerCase();
  return SUMMARY_ONLY_GROUP_PATTERNS.some((pattern) =>
    normalizedName.includes(pattern),
  );
};

const Section = ({
  title,
  groups,
  totalLabel,
  totalValue,
}: {
  title: string;
  groups: BalanceSheetGroup[];
  totalLabel: string;
  totalValue: number;
}) => (
  <div className="w-full">
    <table className="w-full border-collapse text-sm">
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
    {(shouldShowSummaryOnly(group.group_name) ? [] : group.items || []).map((item, itemIndex) => (
      <tr key={`${group.group_name}-${item.name}-${itemIndex}`}>
        <td className="border border-slate-300 px-3 py-2 pl-8 text-slate-700">
          {item.name}
        </td>
        <td className="border border-slate-300 px-3 py-2 text-right text-slate-700">
          {formatAmount(Number(item.balance || 0))}
        </td>
      </tr>
    ))}
  </>
);

const BalanceSheetPrint = ({
  branchName,
  startDate,
  endDate,
  assets,
  liabilities,
  equity,
  totals,
}: BalanceSheetPrintProps) => {
  return (
    <div className="bg-white p-6 text-slate-900">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Balance Sheet</h1>
        <p className="mt-1 text-sm">Branch: {branchName}</p>
        <p className="text-sm">
          Period: {startDate} to {endDate}
        </p>
        <p className="text-sm">As on: {endDate}</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Section
          title="Assets"
          groups={assets}
          totalLabel="Total Assets"
          totalValue={totals.assets}
        />
        <div className="space-y-6">
          <Section
            title="Liabilities"
            groups={liabilities}
            totalLabel="Liabilities Total"
            totalValue={totals.liabilities}
          />
          <Section
            title="Equity"
            groups={equity}
            totalLabel="Equity Total"
            totalValue={totals.equity}
          />
          <table className="w-full border-collapse text-sm">
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
  );
};

export default BalanceSheetPrint;
