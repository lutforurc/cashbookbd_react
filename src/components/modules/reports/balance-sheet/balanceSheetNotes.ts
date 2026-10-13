import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
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
 * Which note each group's row points at. Same numbering as the list below —
 * [1] the basis, [2] supplier advances, [3] accounts payable, [4] customer
 * credit balances, [5] bank and finance balances in credit, [6] loans received,
 * [7] the current period's result, [8] what is unresolved.
 */
const GROUP_NOTES: Record<string, number> = {
  "Supplier Advances": 2,
  "Account Payable": 3,
  "Customer Advances": 4,
  "Bank & Finance Borrowings": 5,
  "Loans Received": 6,
  "Current Period Profit": 7,
  "Current Period Loss": 7,
};

/** The group's own name with its note number after it, where it has one. */
export const reportGroupLabel = (name?: string): string => {
  const label = name || "-";

  return GROUP_NOTES[label] ? `${label} [${GROUP_NOTES[label]}]` : label;
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

export const buildBalanceSheetNotes = (
  sections: Record<string, AnySection[]>,
  period: { asOn?: string } = {},
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

  return [
    {
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
    },
    {
      n: 2,
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
    },
    {
      n: 3,
      title: "Accounts payable",
      body:
        `${money(payables)} owed to suppliers — the credit balances of the supplier ` +
        "ledgers, in full. They are not reduced by the advances in note 2: the two are " +
        "different suppliers' balances, and one party's debit does not settle another's " +
        "credit.",
    },
    {
      n: 4,
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
    },
    {
      n: 5,
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
    },
    {
      n: 6,
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
    },
    {
      n: 7,
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
    },
    {
      n: 8,
      title: "Unresolved classifications",
      body:
        "The following are reported as the books have them and are not changed by " +
        "this report. (a) No borrowing carries a repayment date or term anywhere in " +
        "the books, so none is divided between current and non-current and no " +
        "maturity is shown (notes 5 and 6). (b) Whether a bank or finance ledger in " +
        "credit is an overdraft, a cash-credit facility or a loan cannot be settled " +
        "from the books, and the report does not settle it (note 5). (c) Whether a " +
        "supplier debit will come back as goods or as money is not recorded (note 2). " +
        "(d) The interest income standing in the Profit & Loss Account is charged on " +
        "a loan account whose ownership the books do not settle — whether it belongs " +
        "to the business or to its owner; see note 4 to that report. It is left where " +
        "it is posted, and until that is decided the period's result, and the owners' " +
        "stake shown here, include it in full: were it found not to belong to the " +
        "business, both figures would fall by that amount, and no posting has been " +
        "changed in the meantime.",
    },
  ];
};
