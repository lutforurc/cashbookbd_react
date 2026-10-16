import type { ReportNote } from "../../../utils/utils-functions/ReportNotes";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";

/**
 * Notes to the Trial Balance (Group).
 *
 * This report used to carry one paragraph of basis, which was enough while it
 * was a compact list. It now has two ways of being read -- groups alone, or
 * each group followed by the ledgers it was summed from -- so the basis is
 * split into numbered notes and the reader is told where the ledgers live
 * instead of being left to add them into the Grand Total themselves.
 *
 * Numbering is fixed: [1] the heading, [2] the Movement column, [3] the
 * Description column (each row is a group), [4] and [5] the Grand Total, [6]
 * the inventory loss -- written only when the period wrote goods off, and
 * last, so leaving it out moves no other number.
 *
 * Nothing here is a figure of its own. The amounts a note names are the rows
 * above it, so no total can pick a note up a second time -- note 6's amount is
 * in no row at all, which is the point it makes.
 */
type Context = {
  branchName?: string;
  startDate?: string;
  endDate?: string;
  /** Write-offs of the period at cost (reports/trialbalance-level3-write-off). */
  productOut?: number;
};

export const buildTrialBalanceNotes = ({
  branchName,
  startDate,
  endDate,
  productOut,
}: Context = {}): ReportNote[] => {
  const inventoryLoss = Number(productOut) || 0;
  const periodText =
    startDate && endDate && startDate !== "-" && endDate !== "-"
      ? `${startDate} to ${endDate}`
      : "the selected period";

  const scopeText = `This report covers ${periodText} for ${
    branchName || "the selected branch"
  } and uses eligible posted vouchers within the selected reporting scope.`;

  return [
    {
      n: 1,
      title: "Basis of preparation",
      body:
        `${scopeText} Year-end closing entries are excluded. Any posted adjusting ` +
        "entries are included unless explicitly excluded by the report settings.",
    },
    {
      n: 2,
      title: "Reading the columns",
      body:
        "Opening balances represent ledger balances immediately before the start " +
        "date. Movement Dr and Cr show the period's total debit and credit postings " +
        "separately. Closing balances represent ledger balances as at the end date. " +
        "Accounts with activity may appear even when their closing balance is zero.",
    },
    {
      n: 3,
      title: "Group totals",
      body:
        "Each numbered row represents an account group. Opening and Closing debit " +
        "and credit balances are calculated for each ledger and then summed " +
        "separately within the group. Debit balances of one ledger are not offset " +
        "against credit balances of another. Ledger details are available in the " +
        "detailed report.",
    },
    {
      n: 4,
      title: "Inventory and reconciliation",
      body:
        "Closing inventory is valued from stock records outside the general ledger " +
        "and is therefore excluded from this Trial Balance. Reconciliation with the " +
        "Balance Sheet requires the inventory valuation and the related profit " +
        "calculation to be considered together, without double counting. Income and " +
        "expense balances are presented through current-period profit in the Balance " +
        "Sheet.",
    },
    {
      n: 5,
      title: "Differences",
      body:
        "Opening, Movement and Closing debit-credit totals are expected to agree. " +
        "Any difference is displayed without an artificial balancing adjustment. A " +
        "difference should be investigated in the underlying postings, opening " +
        "balances, report filters and calculation logic.",
    },
    ...(inventoryLoss > 0
      ? [
          {
            n: 6,
            title: "Inventory loss — damaged or lost goods",
            body:
              `Goods written off as damaged or lost in this period are valued at ${thousandSeparator(inventoryLoss)}, ` +
              "at the cost recorded on each write-off. A write-off moves stock only and makes no " +
              "ledger posting, so it is in no balance on this Trial Balance. Its effect is in the " +
              "inventory valuation and the cost of goods sold (note 4), and it is not deducted " +
              "again as a separate expense.",
          },
        ]
      : []),
  ];
};
