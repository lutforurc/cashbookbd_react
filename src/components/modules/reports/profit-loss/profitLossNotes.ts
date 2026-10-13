import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import type { ReportNote } from "../../../utils/utils-functions/ReportNotes";

/**
 * Notes to the Profit & Loss Account.
 *
 * The figures are the report's own, read off the object the statement is built
 * from, so a note cannot disagree with the row it explains.
 *
 * ⚠️ EVERY CLAIM HERE WAS READ OFF THE CODE OR THE BOOKS, NOT ASSUMED. Where a
 * policy is unsettled the note says so and names the effect of settling it --
 * it does not choose a policy, and it does not present an unverified method as
 * the validated one. The stock walk, the discount postings, the two income
 * vouchers and their approval flags were all read for this revision.
 *
 * ⚠️ NO FIGURE IS WRITTEN IN AS TEXT. What a note names comes from the report
 * object or from the account it is talking about; a measured difference that
 * cannot be read off the object is described, not quoted, because this file
 * ships to every client and the numbers of one database are not the numbers of
 * another.
 *
 * The numbering is fixed and the report's rows point at it: [1] the heading,
 * [2] the cost of goods sold, [3] direct acquisition costs, [4] the income
 * accounts, [5] the stock valuation, [6] what is unresolved.
 */
const money = (value: any) => thousandSeparator(Number(value) || 0);

type Period = { startDate?: string; endDate?: string };

export const buildProfitLossNotes = (
  report: any,
  period: Period = {}
): ReportNote[] => {
  const cogs = report?.cogs || {};
  const net = report?.net || {};
  const trading = report?.trading || {};
  const incomes: any[] = Array.isArray(net.incomes) ? net.incomes : [];

  const periodText =
    period.startDate && period.endDate
      ? `${period.startDate} to ${period.endDate}`
      : "the period selected";

  /** The head rows, flattened, so an account can be found by its name. */
  const children: any[] = incomes.flatMap((group: any) =>
    Array.isArray(group.children) ? group.children : []
  );

  /**
   * What one named account earned, as the statement lists it.
   *
   * ⚠️ THE MISSPELT CHART NAME IS MATCHED TOO. The chart head is "Company
   * Comission (Income)". The report corrects the spelling on the way in, so
   * matching the correction alone would work -- and would go quietly blank the
   * day that correction is dropped, which is the note missing rather than the
   * note being wrong. Both spellings are taken.
   */
  const earnedBy = (name: RegExp) =>
    children
      .filter((child) => name.test(child.name ?? ""))
      .reduce((sum, child) => sum + (Number(child.credit) || 0), 0);

  /** Every income account, group by group, as the statement lists them. */
  const incomeLines = incomes
    .map((group) => {
      const inner = (Array.isArray(group.children) ? group.children : [])
        .map((child: any) => `${child.name} ${money(child.credit)}`)
        .join("; ");

      return inner
        ? `${group.name} ${money(group.credit)} (${inner})`
        : `${group.name} ${money(group.credit)}`;
    })
    .join("; ");

  /**
   * The two accounts that need something said about them, each written only
   * when the period actually earned it -- a branch that never received this
   * interest must not read a note about it.
   */
  const interest = earnedBy(/Personal Interest/);
  const commission = earnedBy(/Comi?ssion/);

  const interestNote = interest
    ? " Personal Interest is interest charged on a loan the business carries as" +
      " an asset. It was added to the loan balance rather than received, and on" +
      " the same date the loan account was credited with money received into the" +
      " bank and described as interest and principal together: the collection is" +
      " evidenced, the split between the two is not recorded. The interest is" +
      " charged for a year that ends before these books open."
    : "";

  const commissionNote = commission
    ? " Company Commission was settled in cash: the amount was debited against a" +
      " supplier's payable and credited to the bank on the same date, and its" +
      " remark dates it to the year before this period."
    : "";

  /**
   * ⚠️ THE APPROVAL FLAG RIDES WITH THE TWO NOTES IT DESCRIBES. Written as a
   * fixed sentence it would tell a branch that earned neither account that two
   * postings of its own are unapproved.
   */
  const unapprovedNote =
    interestNote || commissionNote
      ? " Both of those postings are unapproved (is_approved = 0). Neither" +
        " account has been moved, and no historical posting has been changed."
      : "";

  /** The same two accounts, for the effect of setting them aside. */
  const asideNote =
    interest || commission
      ? " Setting them aside would reduce the result by " +
        `${money(interest + commission)} in all` +
        (interest && commission
          ? `, of which ${money(interest)} is the interest and ${money(commission)} the commission.`
          : ".")
      : "";

  return [
    {
      n: 1,
      title: "Basis of preparation",
      body:
        `The account covers ${periodText} for the branch selected. Income and ` +
        "expenses come from eligible posted vouchers: posted, not a year-end " +
        "closing entry, this company and branch, and dated within the period. " +
        "Net sales is sales less the sales returns and sales discounts of the " +
        "period, and net purchase is purchases less purchase returns and purchase " +
        "discounts. Goods transferred to or from another branch are carried at " +
        "cost as Goods Issued and Goods Received, and are counted once. Each " +
        "branch carries its own side of a consignment -- the sender credits the " +
        "cost of the goods it sent, the receiver debits the same cost as a " +
        "purchase -- and the transfer heads are excluded from the income and " +
        "expenses below the trading account, so the transfer reaches the result " +
        "exactly once. This account is always drawn for one branch, so there is no " +
        "consolidation in which the two sides would meet and have to be eliminated.",
    },
    {
      n: 2,
      title: "Cost of goods sold",
      body:
        `Opening stock ${money(cogs.opening)}, plus net purchase ${money(cogs.netPurchase)}, ` +
        `plus direct acquisition costs ${money(cogs.directAcquisitionCosts)}, less closing ` +
        `stock ${money(cogs.closing)}, gives a cost of goods sold of ${money(cogs.total)}. ` +
        "This states the consequence of figures already in the trading account and is " +
        `added to no total; it explains the gross profit of ${money(net.grossProfit)} ` +
        "shown beside it.",
    },
    {
      n: 3,
      title: "Direct acquisition costs",
      body:
        "No freight, unloading or handling cost is carried into the value of the " +
        "inventory, and none is included in the cost of goods sold above. Stock is " +
        "valued at the price recorded on each purchase line, and the stock records " +
        "hold no separate part for such a cost; the accounts that take them book " +
        "them as expenses of the period they were incurred in. Whether some of " +
        "that expenditure is directly attributable to bringing goods in, and so " +
        "belongs in the cost of that inventory, has not been decided and no " +
        "allocation has been made. Settling it is not a matter of adding an amount " +
        "here: the same cost would have to come out of the expense it currently " +
        "sits in, or it is counted once in the stock and again in the expenses. " +
        "The treatment is therefore a limitation of this account as it stands, and " +
        "the figures are as the vouchers posted them.",
    },
    {
      n: 4,
      title: "Income accounts",
      body:
        `The income of the period is ${money(net.totalIncome)}` +
        (incomeLines ? `: ${incomeLines}. ` : ". ") +
        "The accounts shown inside a group are part of that group's own figure and " +
        "are not added to it a second time." +
        interestNote +
        commissionNote +
        unapprovedNote,
    },
    {
      n: 5,
      title: "Stock valuation",
      body:
        `Closing stock ${money(cogs.closing)}. The layers are the purchase records, ` +
        "and what is left standing is taken from the newest layer backwards until " +
        "the quantity on hand is met -- last-in, first-out. That is not the method " +
        "this account has been described with, and the code agrees with the " +
        "description elsewhere: the routine's own name, and the separate walk that " +
        "prices stock for the product-wise report, both take the oldest layers " +
        "first. The two readings have been measured over the period reviewed and " +
        "differ on a minority of products; the correction is not applied, and the " +
        "figures on this report are the ones the walk produces today. Three limits " +
        "of that walk: it caps both the number of layers it reads and the quantity " +
        "it consumes at the whole-number part of the quantity on hand, so a product " +
        "held in a fractional quantity can be valued over too few layers with part " +
        "of its quantity left unpriced; a layer is valued at the price recorded on " +
        "the purchase line, less any rebate recorded on that line, and carries no " +
        "acquisition cost (note 3); and stock is carried at cost, because there is " +
        "no net realisable value review and no write-down mechanism, so stock that " +
        "has fallen in value or become unsaleable is not reduced until a stock-out " +
        "voucher takes it out.",
    },
    {
      n: 6,
      title: "Unresolved items",
      body:
        "These are reported as the books and the code have them, and are not " +
        "changed by this report. (a) The stock method: the walk described in note " +
        "5 does not match the first-in, first-out method the account is labelled " +
        "with; the difference is measured and the correction is not applied. " +
        "(b) Purchase discounts are taken to the trading account in full and are " +
        "not allocated between goods sold and goods still held, while the stock " +
        "layer keeps the gross price on the bill line -- so the stock held is " +
        "carried above its net cost by the share of the discount attributable to " +
        `it. The discounts of this period are ${money(trading.purchaseDiscountCredit)} ` +
        "in all, and any allocation would have to take the same amount out of net " +
        "purchase for the sold part, or the discount is deducted twice. " +
        "(c) Acquisition costs are unallocated, for the reason in note 3. " +
        "(d) There is no net realisable value review and no write-down mechanism. " +
        "(e) The interest and the commission in note 4 are recognised in this " +
        "period although their own remarks date them to earlier years, and both " +
        "postings are unapproved; left as posted, the period's result includes " +
        "them in full." +
        asideNote,
    },
  ];
};
