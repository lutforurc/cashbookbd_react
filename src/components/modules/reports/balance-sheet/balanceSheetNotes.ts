import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { stockMovementNote } from "../../../utils/utils-functions/ReportNotes";
import type { ReportNote } from "../../../utils/utils-functions/ReportNotes";

/**
 * The notes to the Balance Sheet, and the report's own labels.
 *
 * ⚠️ A CHART NAME IS NOT ALWAYS A REPORT LABEL. Some names on this sheet come
 * straight out of the chart of accounts and describe the ASSET branch the head
 * was filed in — "Account Receivable" on the liability side, "Advance" for
 * money the business borrowed. The server renames those groups to what the
 * money is on the side it now sits on; the section heading is still the chart's
 * own "Current Liability", and is renamed here. Matched BY NAME because the ids
 * differ from database to database. Keep these in step with
 * CREDIT_BALANCE_GROUPS and CREDIT_BALANCE_SECTIONS in ReportsController.
 */
const SECTION_LABELS: Record<string, string> = {
  "Current Liability": "Current Liabilities",
};

export const reportSectionLabel = (name?: string): string =>
  SECTION_LABELS[name || ""] || name || "-";

/**
 * Which groups carry a note, in the order the notes are numbered.
 *
 * ⚠️ THE NUMBER IS NOT FIXED HERE ANY MORE. A note is written only where the
 * sheet has the row that points at it, so a group this sheet does not carry
 * takes its note — and its number — with it, and the rest close up. The numbers
 * are therefore worked out from the sheet in hand by balanceSheetNoteIndex(),
 * and the row labels and the note list read that one answer; a fixed map would
 * have the rows pointing at numbers the notes no longer use.
 */
const GROUP_NOTE_ORDER = [
  "Supplier Advances",
  "Account Payable",
  "Customer Advances",
  "Bank & Finance Borrowings",
  "Loans Received",
] as const;

/** Either name the server gives the period's result, whichever side it landed. */
const RESULT_GROUPS = ["Current Period Profit", "Current Period Loss"] as const;

/** The group's own name with its note number after it, where this sheet has one. */
export const reportGroupLabel = (
  name: string | undefined,
  index: Record<string, number> = {},
): string => {
  const label = name || "-";

  return index[label] ? `${label} [${index[label]}]` : label;
};

type AnyGroup = {
  group_name?: string;
  opening?: any;
  movement?: any;
  closing?: any;
  total?: any;
};

type AnySection = { name?: string; groups?: AnyGroup[] };

const money = (value: any) => thousandSeparator(Number(value) || 0);

/** The group itself, wherever it sits on the sheet. */
const findGroup = (
  sections: Record<string, AnySection[]>,
  name: string,
): AnyGroup | undefined => {
  for (const side of Object.keys(sections || {})) {
    for (const section of sections[side] || []) {
      for (const group of section.groups || []) {
        if (group.group_name === name) return group;
      }
    }
  }

  return undefined;
};

/** A group's closing figure, wherever it sits on the sheet. */
const groupAmount = (
  sections: Record<string, AnySection[]>,
  name: string,
): number => {
  const group = findGroup(sections, name);

  return Number(group?.closing ?? group?.total) || 0;
};

/**
 * Which note number each group on THIS sheet points at, [1] being the basis.
 *
 * ⚠️ ONE ANSWER FOR BOTH SIDES OF THE SHEET. The rows take their `[n]` from
 * here and buildBalanceSheetNotes() numbers its list the same way, so a note
 * can never be listed under one number while the row that explains it carries
 * another. A group the sheet does not carry gets no entry and no note; the
 * groups after it move up.
 *
 * The result is one note for both names the server may give it — it names the
 * group after the sign of its closing column, so only one of the two exists,
 * and the row that does exist reads the same number.
 */
/**
 * Did the period move stock outside the ledger — either direction?
 *
 * ⚠️ EITHER, NOT ONLY A WRITE-OFF. Both directions are explained by the same
 * note, so a period that only received goods has as much to say. Shared by the
 * sheet's line builder, the printed sheet and the note list, so all three agree
 * on whether that note exists.
 */
export const stockMoved = (
  productOut?: number | null,
  productIn?: number | null,
): boolean => (Number(productOut) || 0) > 0 || (Number(productIn) || 0) > 0;

export const balanceSheetNoteIndex = (
  sections: Record<string, AnySection[]>,
  hasStockNote = false,
): Record<string, number> => {
  const index: Record<string, number> = {};
  let n = 1; // [1] is the basis, and it hangs on the sheet's title

  for (const name of GROUP_NOTE_ORDER) {
    if (findGroup(sections, name)) index[name] = ++n;
  }

  if (RESULT_GROUPS.some((name) => findGroup(sections, name))) {
    const result = ++n;
    for (const name of RESULT_GROUPS) index[name] = result;
  }

  /**
   * ⚠️ THE STOCK-MOVEMENT NOTE HAS NO ROW OF ITS OWN. The Closing Stock group
   * is where the stock it talks about stands, so that row carries its number --
   * and only when the note exists. Numbered without a row it was a note nothing
   * on the sheet pointed at, which is the one thing a note may not be.
   */
  if (hasStockNote && findGroup(sections, "Closing Stock")) {
    index["Closing Stock"] = ++n;
  }

  return index;
};

export const buildBalanceSheetNotes = (
  sections: Record<string, AnySection[]>,
  period: {
    asOn?: string;
    /**
     * Write-offs of the sheet's period at cost, read from the same read-only
     * endpoint the Trial Balance uses. A figure that could not be read arrives
     * as null and leaves the note out -- it is never taken for a zero.
     */
    productOut?: number | null;
    /** Goods received without a purchase in the same period, at their rate. */
    productIn?: number | null;
  } = {},
): ReportNote[] => {
  const supplierAdvances = groupAmount(sections, "Supplier Advances");
  const payables = groupAmount(sections, "Account Payable");
  const customerCredits = groupAmount(sections, "Customer Advances");
  const bankCredits = groupAmount(sections, "Bank & Finance Borrowings");
  const loans = groupAmount(sections, "Loans Received");

  /**
   * ⚠️ THE TWO EARNINGS GROUPS ARE ONE FIGURE, NOT TWO. The server names the
   * group after the sign of its closing column, so exactly one of them exists
   * and a loss arrives NEGATIVE. Subtracting one from the other — which this
   * did — turns a loss into a profit of the same size.
   */
  const result =
    groupAmount(sections, "Current Period Profit") +
    groupAmount(sections, "Current Period Loss");

  /**
   * ⚠️ THE RECONCILIATION IS DERIVED, NOT ASSERTED. Stock is valued from the
   * stock records rather than posted to a head, so the ledger's own income and
   * expense do not make up the period's result on their own; the stock
   * movement in the Closing Stock group is what stands between them. Reading
   * both off the sheet is what lets the note state the arithmetic and show it
   * adding up, instead of claiming the figure is right.
   */
  const stockMovement = Number(findGroup(sections, "Closing Stock")?.movement) || 0;
  const ledgerResult = result - stockMovement;

  const asOn = period.asOn ? ` as at ${period.asOn}` : "";

  /**
   * The write-offs of the sheet's period at cost, and the goods received without
   * a purchase in the same period. Null is "not read" and writes no note; only a
   * figure greater than zero does. A read that failed is not turned into a zero
   * here -- it stays absent.
   */
  const inventoryLoss = Number(period.productOut) || 0;
  const stockReceipts = Number(period.productIn) || 0;

  // The numbers this sheet's rows carry, worked out once from the sheet itself.
  // The stock-movement note takes the Closing Stock row's number, so the row
  // and the note are numbered from the same place.
  const index = balanceSheetNoteIndex(
    sections,
    stockMoved(period.productOut, period.productIn),
  );
  const resultNote = Number(index["Current Period Profit"] || index["Current Period Loss"] || 0);

  const stockNote = stockMovementNote(
    inventoryLoss,
    stockReceipts,
    "The written-off quantities are excluded from closing inventory within assets and the " +
      "received quantities are inside it, and their financial effect is reflected through " +
      "inventory valuation and the current period's profit or loss within equity" +
      (resultNote ? ` (note ${resultNote})` : "") +
      ". Accordingly, neither disclosed amount is adjusted again against assets or equity. " +
      "Where purchase costs vary, the inventory valuation method may cause the effect on the " +
      "current period's result to differ from the recorded write-off amount; and a receipt " +
      "taken in at no rate, which happens where the books held none, adds nothing to closing " +
      "inventory even though the goods are on the shelf."
  );

  const notes: ReportNote[] = [];

  notes.push({
    n: 1,
    title: "Basis of preparation",
    body:
      `The sheet${asOn} is drawn from posted vouchers, including a year-end ` +
      "closing voucher where a year has been closed, so the capital accounts carry " +
      "the years already closed and the current period carries only what is left " +
      "standing. Every account is placed by its own closing balance and by what " +
      "the account is: a head carrying a debit is shown among the assets, a head " +
      "carrying a credit among what is owed, wherever in the chart the head is " +
      "filed. Where that puts an account on the opposite side to the one the chart " +
      "files it in, it is shown once, under a group named for what it is on that " +
      "side — a customer ledger and a party loan account both sit in the chart's " +
      "asset branch, and both are money owed. Assets, liabilities and the owners' " +
      "stake are shown gross, with no account netted against another; only the " +
      "sign of a balance decides its side, and no balance is moved for any other " +
      "reason.",
  });

  // The rest is written only where the sheet carries the row that points at it;
  // `index` is the same numbering those rows carry, so the two cannot disagree.
  if (index["Supplier Advances"]) {
    notes.push({
      n: index["Supplier Advances"],
      title: "Supplier advances",
      body:
        `${money(supplierAdvances)} in the business's favour with suppliers — ` +
        "supplier ledgers carrying a debit balance, shown inside Current Assets and " +
        "kept apart from the amounts owed to suppliers on the other side. These are " +
        "recoverable amounts, and they are not necessarily money paid ahead of a " +
        "bill: the direction of the balance is all the books record, and it is the " +
        "same for a prepayment, an overpayment and an opening balance carried in when " +
        "the books were brought across. Whether a particular balance will come back as " +
        "goods still to come, as a refund, or against a bill already raised is not " +
        "recorded anywhere, so the report does not say — it reports the balance as it " +
        "stands and leaves the reason to the ledger behind it.",
    });
  }

  if (index["Account Payable"]) {
    notes.push({
      n: index["Account Payable"],
      title: "Accounts payable",
      body:
        `${money(payables)} owed to suppliers — the credit balances of the supplier ` +
        "ledgers, in full. They are not reduced by a debit balance standing on " +
        "another supplier's ledger: the two are different parties' balances, and one " +
        "party's debit does not settle another's credit.",
    });
  }

  if (index["Customer Advances"]) {
    notes.push({
      n: index["Customer Advances"],
      title: "Customer credit balances",
      body:
        `${money(customerCredits)} held for customers — customer ledgers standing in ` +
        "credit, which is money the business owes back rather than a negative " +
        "receivable. It is shown in a section of its own, apart from the borrowings " +
        "below it, because it is not a borrowing: a balance owed to a customer is " +
        "settled by supplying goods or by refunding the money, not by repaying a loan " +
        "with interest, and the two have nothing in common but the side of the sheet " +
        "they land on. No repayment terms are recorded for it and the books do not say " +
        "which of the two is expected, so the amount is reported as it stands.",
    });
  }

  if (index["Bank & Finance Borrowings"]) {
    notes.push({
      n: index["Bank & Finance Borrowings"],
      title: "Bank and finance borrowings",
      body:
        `${money(bankCredits)} of bank and finance ledgers standing in credit, on ` +
        "which the business is the one that owes. ⚠️ A credit balance on a bank ledger " +
        "does not by itself make the account an overdraft, and this group is not named " +
        "as one: what stands behind the balance may be a current account the bank has " +
        "been paid into, a cash-credit or overdraft facility, or a finance company's " +
        "ledger, and only the ledgers themselves say which. The report does not pick " +
        "one, and no head in the chart is named as an overdraft either. No facility " +
        "terms, limits or maturity dates are recorded for these accounts — no voucher " +
        "in the books carries a due date — so the report says only what the balances " +
        "establish and leaves the nature of each account to the reader. Interest " +
        "charged on such an account is posted to Bank Interest as an expense of the " +
        "period; it does not change the classification of the balance.",
    });
  }

  if (index["Loans Received"]) {
    notes.push({
      n: index["Loans Received"],
      title: "Loans received",
      body:
        `${money(loans)} borrowed from parties, filed in the chart under the heading ` +
        '"Advance" inside the asset branch and shown here for what it is — money the ' +
        "business has taken, not given. ⚠️ That same chart heading also carries loans " +
        "the business has GIVEN, which stand on the asset side; the two are told apart " +
        "by the direction of the balance and by nothing else, so the same heading can " +
        "appear on both sides of the sheet. A balance here may be an opening balance " +
        "carried in when the books were brought across or money actually drawn during " +
        "the period — the report shows the balance and does not sort it. No repayment " +
        "date or term is recorded for any of them, so the sheet does not divide them " +
        "between current and non-current.",
    });
  }

  if (resultNote) {
    notes.push({
      n: resultNote,
      title: "Current period result",
      body:
        `${money(result)} — the result of the period, carried to the owners' stake ` +
        "and not yet distributed. It is not a balancing figure: nothing is ever " +
        "inserted to make the two sides agree, and a sheet whose sides differ prints " +
        "its Difference rather than closing the gap with profit. The figure is the " +
        "ledger's own income and expense heads, which have no other home on this " +
        "sheet, together with the change in the value of the stock — stock is valued " +
        "from the stock records rather than posted to a head, so it has nowhere in " +
        "the ledger to sit. For the period shown the ledger's income and expense heads " +
        `leave ${money(ledgerResult)}, which is normally negative while goods are ` +
        "still on hand, because the purchases of the period sit in there as expense " +
        `in full; adding the ${money(stockMovement)} by which the stock held rose over ` +
        `the period gives ${money(result)}. That is the same amount the Profit & Loss ` +
        "Account reports as its net result for the same dates, worked out " +
        "independently of this sheet; if the two ever disagree it is the stock " +
        "valuation or a voucher that does not balance, and both are reported " +
        "elsewhere rather than absorbed here. Where a year has been closed, the " +
        "closing voucher has already emptied that year's income and expense into " +
        "capital, so this line then carries only what the period itself has left " +
        "standing.",
    });
  }

  // Written only where the sheet has the row that points at it. With no Closing
  // Stock group there is nothing to point at, and the note is left out rather
  // than listed under a number no row carries.
  if (stockNote && index["Closing Stock"]) {
    notes.push({ n: index["Closing Stock"], title: stockNote.title, body: stockNote.body });
  }

  return notes;
};
