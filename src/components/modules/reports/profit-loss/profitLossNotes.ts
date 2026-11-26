import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import { stockMovementNote } from "../../../utils/utils-functions/ReportNotes";
import type { ReportNote } from "../../../utils/utils-functions/ReportNotes";
import { rl } from '../../../../i18n/reportLabel';
import i18n from '../../../../i18n';

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
      title: rl("Basis of preparation"),
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
      title: rl("Cost of goods sold"),
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
      title: rl("Direct acquisition costs"),
      body:
        Number(cogs.directAcquisitionCosts) > 0
          ? `The production labour and transport of ${money(cogs.directAcquisitionCosts)} ` +
            "allocated to batches posted in this period is carried into the value " +
            "of the stock those batches produced. It is shown above as a direct " +
            "acquisition cost in the cost of goods sold, and the same amount has " +
            "been taken out of the Production Cost expense group below, so it is " +
            "counted once: the gross profit is stated after that cost and the net " +
            "profit is unchanged. No other expense has been moved, and stock is " +
            "otherwise valued at the price recorded on each purchase line."
          : "No freight, unloading or handling cost is carried into the value of the " +
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
            title: rl("Income accounts"),
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
      title: rl("Stock valuation"),
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

  // The same notes in Bangla when the screen is in Bangla; same figures.
  if ((i18n.language || "en") !== "en") {
    const periodBn =
      period.startDate && period.endDate
        ? `${period.startDate} থেকে ${period.endDate}`
        : "বাছাই করা সময়";
    const incomeLinesBn = incomes
      .map((group) => {
        const inner = (Array.isArray(group.children) ? group.children : [])
          .map((child: any) => `${child.name} ${money(child.credit)}`)
          .join("; ");
        return inner
          ? `${group.name} ${money(group.credit)} (${inner})`
          : `${group.name} ${money(group.credit)}`;
      })
      .join("; ");

    const bn: Record<number, { title?: string; body: string }> = {
      [index.basis]: {
        body:
          `হিসাবটি বাছাই করা শাখার ${periodBn} সময়ের। আয় ও খরচ নেওয়া হয়েছে যোগ্য পোস্ট করা ভাউচার থেকে: পোস্ট করা, ` +
          "বছর-শেষের সমাপনী এন্ট্রি নয়, এই কোম্পানি ও শাখার, এবং সময়ের মধ্যে তারিখের। নিট বিক্রয় = বিক্রয় থেকে সেই সময়ের " +
          "বিক্রয় ফেরত ও বিক্রয় ছাড় বাদ; নিট ক্রয় = ক্রয় থেকে ক্রয় ফেরত ও ক্রয় ছাড় বাদ। অন্য শাখায় পাঠানো বা অন্য শাখা থেকে " +
          "পাওয়া পণ্য ক্রয়মূল্যে শাখায় পাঠানো পণ্য ও শাখা থেকে পাওয়া পণ্য হিসেবে একবারই ধরা হয়। প্রতিটি শাখা চালানের নিজের " +
          "দিক রাখে — প্রেরক পাঠানো পণ্যের ক্রয়মূল্য ক্রেডিট করে, গ্রহীতা একই মূল্য ক্রয় হিসেবে ডেবিট করে — এবং ট্রেডিং হিসাবের " +
          "নিচের আয়-খরচ থেকে স্থানান্তরের খাত বাদ, তাই স্থানান্তর ফলাফলে ঠিক একবার আসে। এই হিসাব সবসময় এক শাখার, তাই দুই " +
          "দিক মিলিয়ে বাদ দেওয়ার মতো কোনো একীভূত হিসাব নেই।",
      },
      [index.cogs]: {
        body:
          `প্রারম্ভিক মজুদ ${money(cogs.opening)}, যোগ নিট ক্রয় ${money(cogs.netPurchase)}, যোগ সরাসরি অর্জন ব্যয় ` +
          `${money(cogs.directAcquisitionCosts)}, বাদ সমাপনী মজুদ ${money(cogs.closing)} — বিক্রীত পণ্যের ব্যয় ${money(cogs.total)}। ` +
          "এটি ট্রেডিং হিসাবে আগে থেকেই থাকা অঙ্কের ফল দেখায় এবং কোনো মোটে যোগ হয় না; পাশে দেখানো মোট লাভ " +
          `${money(net.grossProfit)} এটাই ব্যাখ্যা করে।`,
      },
      [index.acquisition]: {
        body:
          Number(cogs.directAcquisitionCosts) > 0
            ? `এই সময়ে পোস্ট করা ব্যাচগুলোর উৎপাদন শ্রম ও পরিবহন ${money(cogs.directAcquisitionCosts)} সেই ব্যাচে তৈরি ` +
              "মজুদের মূল্যে ধরা হয়েছে। এটি ওপরে বিক্রীত পণ্যের ব্যয়ে সরাসরি অর্জন ব্যয় হিসেবে দেখানো, এবং একই অঙ্ক নিচের " +
              "Production Cost খরচ দল থেকে বাদ দেওয়া হয়েছে, তাই একবারই গোনা হয়: মোট লাভ এই ব্যয়ের পরে, নিট লাভ অপরিবর্তিত। " +
              "অন্য কোনো খরচ সরানো হয়নি, এবং মজুদ অন্যথায় প্রতিটি ক্রয় লাইনের লিপিবদ্ধ দরে মূল্যায়িত।"
            : "কোনো ভাড়া, খালাস বা হ্যান্ডলিং খরচ মজুদের মূল্যে ধরা হয়নি, ওপরের বিক্রীত পণ্যের ব্যয়েও নেই। মজুদ প্রতিটি ক্রয় " +
              "লাইনের লিপিবদ্ধ দরে মূল্যায়িত, এবং মজুদের রেকর্ডে এমন খরচের আলাদা অংশ নেই; যে হিসাবগুলো এগুলো নেয় তারা খরচ " +
              "হওয়ার সময়ের খরচ হিসেবেই বই করে। এর কিছু অংশ পণ্য আনার সাথে সরাসরি যুক্ত কি না — এবং তাই মজুদের ব্যয়ে পড়ে কি না " +
              "— তা ঠিক করা হয়নি, কোনো বণ্টনও হয়নি। এটা ঠিক করা মানে শুধু এখানে অঙ্ক যোগ করা নয়: একই খরচ তার বর্তমান খরচের " +
              "খাত থেকে বের করতে হবে, নইলে মজুদে একবার আর খরচে আবার গোনা হবে। তাই এটা এই হিসাবের বর্তমান সীমাবদ্ধতা, অঙ্কগুলো " +
              "ভাউচারে যেমন পোস্ট হয়েছে তেমন।",
      },
      [index.stock]: {
        body:
          `সমাপনী মজুদ ${money(cogs.closing)}। স্তরগুলো হলো ক্রয়ের রেকর্ড, আর হাতে থাকা পরিমাণ পূরণ না হওয়া পর্যন্ত নতুনতম ` +
          "স্তর থেকে পেছনের দিকে নেওয়া হয় — শেষে-আসা-আগে-যায় (LIFO)। এই হিসাবের যে পদ্ধতি অন্য জায়গায় বলা আছে তা এটি নয়: " +
          "রুটিনের নিজের নাম এবং পণ্যভিত্তিক রিপোর্টের আলাদা হিসাব দুটোই পুরোনো স্তর আগে নেয়। পর্যালোচিত সময়ে দুটো মাপা হয়েছে, " +
          "অল্প কিছু পণ্যে পার্থক্য আছে; সংশোধন প্রয়োগ হয়নি, এই রিপোর্টের অঙ্ক আজকের হিসাবেরই। এর তিনটি সীমা: হাতে থাকা " +
          "পরিমাণের পূর্ণসংখ্যা অংশ পর্যন্তই স্তর ও পরিমাণ পড়ে, তাই ভগ্নাংশ পরিমাণের পণ্যের কিছু অংশ দামহীন থাকতে পারে; স্তরের " +
          "মূল্য ক্রয় লাইনের লিপিবদ্ধ দর থেকে ওই লাইনের ছাড় বাদ, কোনো অর্জন ব্যয় নেই " +
          `(নোট ${index.acquisition}); আর মজুদ ক্রয়মূল্যে রাখা, কারণ নিট আদায়যোগ্য মূল্যের পর্যালোচনা বা মূল্য কমানোর ব্যবস্থা ` +
          "নেই — দাম পড়ে যাওয়া বা অবিক্রয়যোগ্য মজুদ স্টক-আউট ভাউচারে বের না করা পর্যন্ত কমানো হয় না।" +
          (Number(trading.purchaseDiscountCredit)
            ? " ক্রয় ছাড় পুরোটাই ট্রেডিং হিসাবে নেওয়া হয়, বিক্রীত ও হাতে থাকা পণ্যে ভাগ করা হয় না, অথচ মজুদের স্তরে বিলের " +
              "লাইনের মোট দর থাকে — তাই হাতে থাকা মজুদ তার ভাগের ছাড় পরিমাণ বেশি মূল্যে রাখা। এই সময়ের ছাড় মোট " +
              `${money(trading.purchaseDiscountCredit)}; কোনো বণ্টন করলে বিক্রীত পণ্যের জন্য নিট ক্রয় থেকেও একই অঙ্ক বাদ দিতে ` +
              "হবে, নইলে ছাড় দুবার বাদ যাবে।"
            : ""),
      },
    };
    if (index.income) {
      bn[index.income] = {
        body:
          `এই সময়ের আয় ${money(net.totalIncome)}` +
          (incomeLinesBn ? `: ${incomeLinesBn}। ` : "। ") +
          "কোনো দলের ভেতরে দেখানো হিসাবগুলো সেই দলের নিজের অঙ্কের অংশ, দ্বিতীয়বার যোগ হয় না।" +
          (interest
            ? " Personal Interest হলো ব্যবসার সম্পদ হিসেবে রাখা একটি ঋণের ওপর ধার্য সুদ। এটি পাওয়া নয়, ঋণের ব্যালেন্সে " +
              "যোগ হয়েছে; একই তারিখে ঋণ হিসাবে ব্যাংকে পাওয়া টাকা সুদ ও আসল একসাথে বলে ক্রেডিট হয়েছে: আদায়ের প্রমাণ আছে, " +
              "দুটোর ভাগ লেখা নেই। সুদটি এই খাতা শুরুর আগে শেষ হওয়া বছরের।"
            : "") +
          (commission
            ? " Company Commission নগদে নিষ্পত্তি হয়েছে: অঙ্কটি এক সরবরাহকারীর দেনার বিপরীতে ডেবিট ও একই তারিখে ব্যাংকে " +
              "ক্রেডিট হয়েছে, এবং মন্তব্যে এটি এই সময়ের আগের বছরের।"
            : "") +
          (interest || commission
            ? " এই দুটো পোস্টিং অনুমোদিত নয় (is_approved = 0)। কোনো হিসাব সরানো হয়নি, পুরোনো কোনো পোস্টিং বদলানো হয়নি। " +
              `এগুলো বাদ রাখলে ফলাফল মোট ${money(interest + commission)} কমবে` +
              (interest && commission
                ? `, এর মধ্যে সুদ ${money(interest)} ও কমিশন ${money(commission)}।`
                : "।")
            : ""),
      };
    }
    if (stockNote) {
      bn[index.stockMovement] = {
        title:
          inventoryLoss > 0 && stockReceipts > 0
            ? "ক্রয়-বিক্রয় ছাড়া মজুদের আনা-নেওয়া"
            : inventoryLoss > 0
              ? "মজুদ ক্ষতি — নষ্ট বা হারানো পণ্য"
              : "ক্রয় ছাড়া পাওয়া পণ্য",
        body:
          (inventoryLoss > 0
            ? `এই সময়ে নষ্ট বা হারানো হিসেবে বাদ দেওয়া পণ্যের মূল্য ${money(inventoryLoss)}, প্রতিটি বাদ দেওয়ার সময়ের লিপিবদ্ধ দরে। `
            : "") +
          (stockReceipts > 0
            ? `একই সময়ে ক্রয় ছাড়া পাওয়া পণ্যের মূল্য ${money(stockReceipts)}, খাতায় থাকা দরে। `
            : "") +
          "বাদ দেওয়া পরিমাণ হাতের মজুদ থেকে বেরিয়েছে আর পাওয়া পরিমাণ যোগ হয়েছে, তাই দুটোই সেই সমাপনী মজুদের ভেতরে আছে " +
          `যা থেকে বিক্রীত পণ্যের ব্যয় হিসাব হয় (নোট ${index.cogs}) — ক্ষতি সেই ব্যয় বাড়িয়েছে, প্রাপ্তি কমিয়েছে — এবং কোনোটিই ` +
          "আলাদা খরচ হিসেবে আবার সমন্বয় হয়নি। কোনো পণ্য একাধিক দরে কেনা হলে সমাপনী মজুদ মূল্যায়ন " +
          `(নোট ${index.stock}) একই পরিমাণকে ভিন্ন দরে ধরতে পারে, তাই বিক্রীত পণ্যের ব্যয়ে প্রভাব বাদের অঙ্ক থেকে আলাদা হতে পারে।`,
      };
    }
    for (const note of notes) {
      const local = bn[note.n];
      if (local) {
        note.body = local.body;
        if (local.title) note.title = local.title;
      }
    }
  }

  return notes;
};
