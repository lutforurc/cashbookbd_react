import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { stockMovementNote } from "../../../utils/utils-functions/ReportNotes";
import type { ReportNote } from "../../../utils/utils-functions/ReportNotes";
import { rl } from '../../../../i18n/reportLabel';
import i18n from '../../../../i18n';

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
  rl(SECTION_LABELS[name || ""] || name || "-");

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
        if (((group as any).group_name_en ?? group.group_name) === name) return group;
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
  // The notes read in Bangla when the screen does; the amounts are the same.
  const bn = (i18n.language || "en") !== "en";
  const asOnBn = period.asOn ? `${period.asOn} তারিখের ` : "";

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

  if (stockNote && bn) {
    stockNote.title =
      inventoryLoss > 0 && stockReceipts > 0
        ? "ক্রয়-বিক্রয় ছাড়া মজুদের আনা-নেওয়া"
        : inventoryLoss > 0
          ? "মজুদ ক্ষতি — নষ্ট বা হারানো পণ্য"
          : "ক্রয় ছাড়া পাওয়া পণ্য";
    stockNote.body =
      (inventoryLoss > 0
        ? `এই সময়ে নষ্ট বা হারানো হিসেবে বাদ দেওয়া পণ্যের মূল্য ${money(inventoryLoss)}, প্রতিটি বাদ দেওয়ার সময়ের লিপিবদ্ধ দরে। `
        : "") +
      (stockReceipts > 0
        ? `একই সময়ে ক্রয় ছাড়া পাওয়া পণ্যের মূল্য ${money(stockReceipts)}, খাতায় থাকা দরে। `
        : "") +
      "বাদ দেওয়া পরিমাণ সম্পদের সমাপনী মজুদ থেকে বাদ আছে এবং পাওয়া পরিমাণ তার ভেতরে আছে; এদের আর্থিক প্রভাব " +
      "মজুদ মূল্যায়ন ও মূলধনের চলতি সময়ের লাভ-ক্ষতির মধ্য দিয়ে প্রতিফলিত" +
      (resultNote ? ` (নোট ${resultNote})` : "") +
      "। তাই প্রকাশিত কোনো অঙ্ক সম্পদ বা মূলধনের সাথে আবার সমন্বয় করা হয়নি। ক্রয়মূল্য ভিন্ন হলে মজুদ মূল্যায়নের " +
      "পদ্ধতির কারণে চলতি ফলাফলে প্রভাব লিপিবদ্ধ বাদের অঙ্ক থেকে আলাদা হতে পারে; আর খাতায় কোনো দর না থাকায় " +
      "বিনা দরে নেওয়া পণ্য তাকে থাকলেও সমাপনী মজুদে কিছু যোগ করে না।";
  }

  const notes: ReportNote[] = [];

  notes.push({
    n: 1,
    title: rl("Basis of preparation"),
    body: bn
      ? `${asOnBn}এই হিসাব পোস্ট করা ভাউচার থেকে তৈরি, বছর বন্ধ হয়ে থাকলে বছর-শেষের সমাপনী ভাউচারসহ; তাই মূলধন হিসাবে ` +
        "বন্ধ হওয়া বছরগুলো থাকে এবং চলতি সময়ে থাকে শুধু যা বাকি আছে। প্রতিটি হিসাব তার নিজের সমাপনী ব্যালেন্স ও প্রকৃতি অনুযায়ী বসানো: " +
        "ডেবিট ব্যালেন্সের খাত সম্পদে, ক্রেডিট ব্যালেন্সের খাত দায়ে — হিসাব-তালিকায় খাতটি যেখানেই থাকুক। এতে কোনো হিসাব তালিকার " +
        "উল্টো দিকে পড়লে সেটি একবারই দেখানো হয়, ওই দিকে তার প্রকৃতি অনুযায়ী নামের দলে — যেমন গ্রাহকের খাতা ও পার্টির ঋণ হিসাব " +
        "দুটোই তালিকার সম্পদ শাখায় থাকে, অথচ দুটোই দেনা। সম্পদ, দায় ও মালিকের মূলধন মোট অঙ্কে দেখানো, কোনো হিসাব অন্যটির " +
        "সাথে কাটাকাটি করা হয়নি; শুধু ব্যালেন্সের চিহ্ন তার দিক ঠিক করে, অন্য কোনো কারণে কোনো ব্যালেন্স সরানো হয়নি।"
      :
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
      title: rl("Supplier advances"),
      body: bn
        ? `সরবরাহকারীদের কাছে ব্যবসার পাওনা ${money(supplierAdvances)} — ডেবিট ব্যালেন্সের সরবরাহকারী খাতা, চলতি সম্পদে দেখানো ` +
          "এবং অন্য দিকে সরবরাহকারীদের দেনা থেকে আলাদা রাখা। এগুলো আদায়যোগ্য অঙ্ক, তবে সবসময় বিলের আগে দেওয়া টাকা নয়: খাতায় " +
          "শুধু ব্যালেন্সের দিক লেখা থাকে, যা অগ্রিম, বেশি দেওয়া বা খাতা আনার সময়ের প্রারম্ভিক ব্যালেন্স — সবক্ষেত্রেই একই। কোনো " +
          "ব্যালেন্স পণ্য হিসেবে, ফেরত হিসেবে, নাকি আগের বিলের বিপরীতে ফিরবে তা কোথাও লেখা থাকে না, তাই রিপোর্ট তা বলে না — " +
          "ব্যালেন্স যেমন আছে তেমন দেখায় এবং কারণটি খাতার ওপর ছেড়ে দেয়।"
        :
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
      title: rl("Accounts payable"),
      body: bn
        ? `সরবরাহকারীদের কাছে দেনা ${money(payables)} — সরবরাহকারী খাতাগুলোর পুরো ক্রেডিট ব্যালেন্স। অন্য সরবরাহকারীর খাতার ` +
          "ডেবিট ব্যালেন্স দিয়ে এটি কমানো হয়নি: দুটো আলাদা পার্টির ব্যালেন্স, এক পার্টির ডেবিট অন্যের ক্রেডিট শোধ করে না।"
        :
        `${money(payables)} owed to suppliers — the credit balances of the supplier ` +
        "ledgers, in full. They are not reduced by a debit balance standing on " +
        "another supplier's ledger: the two are different parties' balances, and one " +
        "party's debit does not settle another's credit.",
    });
  }

  if (index["Customer Advances"]) {
    notes.push({
      n: index["Customer Advances"],
      title: rl("Customer credit balances"),
      body: bn
        ? `গ্রাহকদের জন্য রাখা ${money(customerCredits)} — ক্রেডিট ব্যালেন্সের গ্রাহক খাতা, অর্থাৎ ব্যবসা যা ফেরত দেবে, ঋণাত্মক ` +
          "পাওনা নয়। এটি নিচের ঋণগুলো থেকে আলাদা অংশে দেখানো, কারণ এটি ঋণ নয়: গ্রাহকের পাওনা শোধ হয় পণ্য দিয়ে বা টাকা ফেরত " +
          "দিয়ে, সুদসহ ঋণ শোধের মতো নয়; দুটোর মিল শুধু হিসাবের একই দিকে পড়া। এর কোনো পরিশোধের শর্ত লেখা নেই এবং কোনটি হবে খাতা " +
          "বলে না, তাই অঙ্কটি যেমন আছে তেমন দেখানো হয়েছে।"
        :
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
      title: rl("Bank and finance borrowings"),
      body: bn
        ? `ক্রেডিট ব্যালেন্সের ব্যাংক ও আর্থিক খাতা ${money(bankCredits)}, যেখানে ব্যবসাই দেনাদার। ⚠️ ব্যাংক খাতায় ক্রেডিট ` +
          "ব্যালেন্স থাকলেই সেটি ওভারড্রাফট নয়, এবং এই দলকেও সেই নাম দেওয়া হয়নি: পেছনে চলতি হিসাব, ক্যাশ-ক্রেডিট বা ওভারড্রাফট " +
          "সুবিধা, অথবা আর্থিক প্রতিষ্ঠানের খাতা থাকতে পারে — কোনটি তা শুধু খাতাই বলে। রিপোর্ট কোনোটি বেছে নেয় না, হিসাব-তালিকাতেও " +
          "কোনো খাত ওভারড্রাফট নামে নেই। এসব হিসাবের সুবিধার শর্ত, সীমা বা মেয়াদ লেখা নেই — কোনো ভাউচারে নির্ধারিত তারিখ নেই — " +
          "তাই রিপোর্ট শুধু ব্যালেন্স যা প্রমাণ করে তাই বলে। এমন হিসাবের সুদ সময়ের খরচ হিসেবে Bank Interest-এ পোস্ট হয়; তাতে " +
          "ব্যালেন্সের শ্রেণী বদলায় না।"
        :
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
      title: rl("Loans received"),
      body: bn
        ? `পার্টির কাছ থেকে নেওয়া ঋণ ${money(loans)}, হিসাব-তালিকায় সম্পদ শাখার "Advance" শিরোনামের নিচে রাখা এবং এখানে ` +
          "তার প্রকৃতি অনুযায়ী দেখানো — ব্যবসা নিয়েছে, দেয়নি। ⚠️ একই শিরোনামে ব্যবসার দেওয়া ঋণও থাকে, যা সম্পদের দিকে বসে; দুটো " +
          "আলাদা হয় শুধু ব্যালেন্সের দিক দিয়ে, তাই একই শিরোনাম হিসাবের দুই দিকেই আসতে পারে। এখানকার ব্যালেন্স খাতা আনার সময়ের " +
          "প্রারম্ভিক ব্যালেন্স বা এই সময়ে আসলে নেওয়া টাকা হতে পারে — রিপোর্ট ব্যালেন্স দেখায়, ভাগ করে না। কোনোটির পরিশোধের " +
          "তারিখ বা শর্ত লেখা নেই, তাই এগুলো চলতি ও দীর্ঘমেয়াদিতে ভাগ করা হয়নি।"
        :
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
      title: rl("Current period result"),
      body: bn
        ? `${money(result)} — এই সময়ের ফলাফল, মালিকের মূলধনে নেওয়া এবং এখনও বণ্টন হয়নি। এটি মেলানোর জন্য বসানো অঙ্ক নয়: ` +
          "দুই দিক মেলাতে কখনো কিছু ঢোকানো হয় না, দুই দিক না মিললে হিসাব লাভ দিয়ে ফাঁক না ভরে তার পার্থক্য দেখায়। অঙ্কটি হলো " +
          "খাতার নিজস্ব আয় ও খরচের খাত, যাদের এই হিসাবে আর জায়গা নেই, সাথে মজুদের মূল্যের পরিবর্তন — মজুদ খাতে পোস্ট না হয়ে " +
          "মজুদের রেকর্ড থেকে মূল্যায়ন হয়, তাই খাতায় তার জায়গা নেই। " +
          `এই সময়ে খাতার আয় ও খরচের খাত মিলে ${money(ledgerResult)}, যা পণ্য হাতে থাকলে সাধারণত ঋণাত্মক, কারণ এই সময়ের ক্রয় ` +
          `সেখানে পুরোটাই খরচ হিসেবে বসে; সময়ে মজুদ যে ${money(stockMovement)} বেড়েছে তা যোগ করলে হয় ${money(result)}। ` +
          "একই তারিখের লাভ-ক্ষতি হিসাব এই হিসাব থেকে আলাদাভাবে যে নিট ফলাফল দেখায়, এটি সেই অঙ্কই; কখনো না মিললে কারণ মজুদ " +
          "মূল্যায়ন বা না-মেলা কোনো ভাউচার, আর দুটোই অন্য জায়গায় দেখানো হয়, এখানে চাপা দেওয়া হয় না। বছর বন্ধ হয়ে থাকলে সমাপনী " +
          "ভাউচার সেই বছরের আয়-খরচ মূলধনে নিয়ে গেছে, তাই এই লাইনে থাকে শুধু এই সময়ের বাকি অংশ।"
        :
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
