import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { stockMovementNote } from "../../../utils/utils-functions/ReportNotes";
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
 * the validated one. The stock walk, the discount postings and the two income
 * vouchers and their approval flags were all read for this revision.
 *
 * ⚠️ NO FIGURE IS WRITTEN IN AS TEXT. What a note names comes from the report
 * object or from the account it is talking about; a measured difference that
 * cannot be read off the object is described, not quoted, because this file
 * ships to every client and the numbers of one database are not the numbers of
 * another.
 *
 * ⚠️ A NOTE EXISTS ONLY WHERE A ROW POINTS AT IT, and the notes that remain are
 * numbered [1] to [n] with nothing skipped. Basis [1], the cost of goods sold
 * [2] and direct acquisition costs [3] always have rows and always print; the
 * income note prints only where the account has income rows; the stock note
 * always does; and the stock-movement note comes last, only for a period that
 * moved stock outside the ledger. `profitLossNoteIndex()` is the one place that
 * decides the numbers, and the screen and the paper both label their rows from
 * it -- a pointer that disagrees with the list underneath is worse than none.
 *
 * Until 2026-10-17 there was a sixth note, "Unresolved items", and no row
 * pointed at it. What was worth keeping moved into the notes that are pointed
 * at: the purchase-discount caveat into the stock note, and the effect of
 * setting the two income postings aside into the income note.
 */
const money = (value: any) => thousandSeparator(Number(value) || 0);

type Period = { startDate?: string; endDate?: string };

const incomeRows = (report: any): any[] =>
  Array.isArray(report?.net?.incomes) ? report.net.incomes : [];

const stockMoved = (report: any) =>
  (Number(report?.productOut) || 0) > 0 || (Number(report?.productIn) || 0) > 0;

/**
 * The number each note will carry, keyed by what the note is about.
 *
 * ⚠️ THE SCREEN AND THE PAPER BOTH READ THIS. Written out by hand at the four
 * call sites it would be four chances to disagree -- and the income note is
 * absent on a branch that earned nothing outside the trading account, which
 * moves the stock note's own number.
 */
export const profitLossNoteIndex = (report: any): Record<string, number> => {
  const index: Record<string, number> = { basis: 1, cogs: 2, acquisition: 3 };

  let n = 4;
  if (incomeRows(report).length > 0) index.income = n++;
  index.stock = n++;
  if (stockMoved(report)) index.stockMovement = n++;

  return index;
};

export const buildProfitLossNotes = (
  report: any,
  period: Period = {}
): ReportNote[] => {
  const index = profitLossNoteIndex(report);

  const cogs = report?.cogs || {};
  const net = report?.net || {};
  const trading = report?.trading || {};
  const incomes = incomeRows(report);

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
  // ⚠️ `m+`, not `mi?`: the corrected spelling is "Commission" and the misspelt
  // chart head is "Comission". The old pattern matched the misspelling only, so
  // the commission paragraph fell off every report that uses the corrected name.
  const commission = earnedBy(/Co(m+)i?ssion/);

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

  /**
   * The same two accounts, for the effect of setting them aside -- the one
   * sentence of the old "Unresolved items" note worth keeping.
   */
  const asideNote =
    interest || commission
      ? " Setting them aside would reduce the result by " +
        `${money(interest + commission)} in all` +
        (interest && commission
          ? `, of which ${money(interest)} is the interest and ${money(commission)} the commission.`
          : ".")
      : "";

  /**
   * ⚠️ THE DISCOUNT CAVEAT HAS NO ROW OF ITS OWN. A purchase discount is taken
   * to the trading account in full while the stock layer keeps the gross price
   * on the bill line, so the stock still held stands above its net cost. It is
   * said inside the stock note because that is the note a reader follows when
   * the closing stock looks high. It is written only for a period that granted
   * a discount: with no discount the layer's price IS the net cost, and the
   * sentence would raise a doubt that is not there.
   */
  const discountCaveat = Number(trading.purchaseDiscountCredit)
    ? " Purchase discounts are taken to the trading account in full and are not" +
      " allocated between goods sold and goods still held, while the stock layer" +
      " keeps the gross price on the bill line -- so the stock held is carried" +
      " above its net cost by the share of the discount attributable to it. The" +
      ` discounts of this period are ${money(trading.purchaseDiscountCredit)} in` +
      " all, and any allocation would have to take the same amount out of net" +
      " purchase for the goods sold, or the discount is deducted twice."
    : "";

  /**
   * ⚠️ THE AMOUNT IS A LABEL, NEVER A DEDUCTION. The goods are already out of
   * the closing stock, so the cost of goods sold carries them; a line taking
   * the amount off again would charge it twice.
   *
   * ⚠️ IT NEED NOT EQUAL ITS EFFECT ON THE COST OF GOODS SOLD, and the last
   * sentence says so. The write-off is priced FIFO at the oldest layer; the
   * closing-stock walk (the stock note) gives up the newest layer for the same
   * units. Measured 2026-10-16: 100 @ 400 then 100 @ 500, ten written off --
   * slip 4,000, closing stock 5,000 lower. One price, and the two agree.
   */
  const inventoryLoss = Number(report?.productOut) || 0;
  const stockReceipts = Number(report?.productIn) || 0;

  const stockNote = stockMovementNote(
    inventoryLoss,
    stockReceipts,
    "The written-off quantity has left the stock on hand and the received quantity has joined " +
      "it, so both are already inside the closing stock the cost of goods sold is worked out " +
      `from (note ${index.cogs}) -- the loss has raised that cost and the receipt has lowered it -- and ` +
      "neither is adjusted again as a separate expense. Where a product was bought at more " +
      `than one price, the closing-stock valuation (note ${index.stock}) can price the same quantity ` +
      "differently, so the effect on the cost of goods sold may differ from the write-off " +
      "amount."
  );

  const notes: ReportNote[] = [
    {
      n: index.basis,
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
      n: index.cogs,
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
      n: index.acquisition,
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
    ...(index.income
      ? [
          {
            n: index.income,
            title: "Income accounts",
            body:
              `The income of the period is ${money(net.totalIncome)}` +
              (incomeLines ? `: ${incomeLines}. ` : ". ") +
              "The accounts shown inside a group are part of that group's own figure and " +
              "are not added to it a second time." +
              interestNote +
              commissionNote +
              unapprovedNote +
              asideNote,
          },
        ]
      : []),
    {
      n: index.stock,
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
        `the purchase line, less any rebate recorded on that line, and carries no ` +
        `acquisition cost (note ${index.acquisition}); and stock is carried at ` +
        "cost, because there is no net realisable value review and no write-down " +
        "mechanism, so stock that has fallen in value or become unsaleable is not " +
        "reduced until a stock-out voucher takes it out." +
        discountCaveat,
    },
  ];

  if (stockNote) {
    notes.push({ n: index.stockMovement, title: stockNote.title, body: stockNote.body });
  }

  return notes;
};
