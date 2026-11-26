import { stockMovementNote } from "../../../utils/utils-functions/ReportNotes";
import type { ReportNote } from "../../../utils/utils-functions/ReportNotes";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import i18n from "../../../../i18n";

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
 * stock that moved without a purchase or a sale -- written only when the period
 * has such a movement, and last, so leaving it out moves no other number.
 *
 * Nothing here is a figure of its own. The amounts a note names are the rows
 * above it, so no total can pick a note up a second time -- note 6's amounts are
 * in no row at all, which is the point it makes.
 *
 * ⚠️ BOTH DIRECTIONS SINCE 2026-10-17. Note 6 named the write-off alone while a
 * write-off was the only way stock could move without a voucher. Product In
 * arrived on 2026-10-16 and moves stock the other way -- in, with no purchase --
 * so a note naming one of them would be explaining the gap with half its causes.
 */
type Context = {
  branchName?: string;
  startDate?: string;
  endDate?: string;
  /** Write-offs of the period at cost (reports/trialbalance-level3-write-off). */
  productOut?: number;
  /** Goods received without a purchase, at the rate they went in at. */
  productIn?: number;
};

export const buildTrialBalanceNotes = ({
  branchName,
  startDate,
  endDate,
  productOut,
  productIn,
}: Context = {}): ReportNote[] => {
  const inventoryLoss = Number(productOut) || 0;
  const stockReceipts = Number(productIn) || 0;

  const stockNote = stockMovementNote(
    inventoryLoss,
    stockReceipts,
    "Neither figure is a balance on this Trial Balance: a write-off and a receipt each " +
      "move stock only and make no ledger posting, so neither is in any line above. Their " +
      "effect is in the inventory valuation and the cost of goods sold (note 4), and " +
      "neither is deducted or added again as a separate adjustment."
  );
  // The same notes in Bangla when the screen is in Bangla.
  if ((i18n.language || "en") !== "en") {
    const periodBn =
      startDate && endDate && startDate !== "-" && endDate !== "-"
        ? `${startDate} থেকে ${endDate}`
        : "বাছাই করা সময়";
    const stockBn = stockNote
      ? {
          n: 6,
          title:
            inventoryLoss > 0 && stockReceipts > 0
              ? "ক্রয়-বিক্রয় ছাড়া মজুদের আনা-নেওয়া"
              : inventoryLoss > 0
                ? "মজুদ ক্ষতি — নষ্ট বা হারানো পণ্য"
                : "ক্রয় ছাড়া পাওয়া পণ্য",
          body:
            (inventoryLoss > 0
              ? `এই সময়ে নষ্ট বা হারানো হিসেবে বাদ দেওয়া পণ্যের মূল্য ${thousandSeparator(inventoryLoss)}, প্রতিটি বাদ দেওয়ার সময়ের লিপিবদ্ধ দরে। `
              : "") +
            (stockReceipts > 0
              ? `একই সময়ে ক্রয় ছাড়া পাওয়া পণ্যের মূল্য ${thousandSeparator(stockReceipts)}, খাতায় থাকা দরে। `
              : "") +
            "কোনো অঙ্কই এই রেওয়ামিলের ব্যালেন্স নয়: বাদ দেওয়া ও পাওয়া দুটোই শুধু মজুদ সরায়, খাতায় কোনো পোস্টিং করে না, " +
            "তাই ওপরের কোনো লাইনে নেই। এদের প্রভাব মজুদ মূল্যায়ন ও বিক্রীত পণ্যের ব্যয়ে (নোট ৪), এবং কোনোটিই আলাদা " +
            "সমন্বয় হিসেবে আবার বাদ বা যোগ হয় না।",
        }
      : null;

    return [
      {
        n: 1,
        title: "প্রস্তুতির ভিত্তি",
        body:
          `এই রিপোর্ট ${branchName || "বাছাই করা শাখা"}-র ${periodBn} সময়ের, বাছাই করা পরিসরের যোগ্য পোস্ট করা ` +
          "ভাউচার থেকে তৈরি। বছর-শেষের সমাপনী এন্ট্রি বাদ। পোস্ট করা সমন্বয় এন্ট্রি অন্তর্ভুক্ত, যদি না রিপোর্টের " +
          "সেটিংসে স্পষ্টভাবে বাদ দেওয়া হয়।",
      },
      {
        n: 2,
        title: "কলামগুলো পড়ার নিয়ম",
        body:
          "প্রারম্ভিক ব্যালেন্স হলো শুরুর তারিখের ঠিক আগের খাতার ব্যালেন্স। লেনদেনের ডেবিট ও ক্রেডিট সময়ের মোট " +
          "ডেবিট ও ক্রেডিট পোস্টিং আলাদাভাবে দেখায়। সমাপনী ব্যালেন্স হলো শেষ তারিখে খাতার ব্যালেন্স। লেনদেন থাকা " +
          "হিসাব সমাপনী ব্যালেন্স শূন্য হলেও দেখা যেতে পারে।",
      },
      {
        n: 3,
        title: "গ্রুপের মোট",
        body:
          "প্রতিটি নম্বরযুক্ত সারি একটি হিসাব-গ্রুপ। প্রারম্ভিক ও সমাপনী ডেবিট-ক্রেডিট ব্যালেন্স প্রতিটি খাতার জন্য " +
          "আলাদা হিসাব করে গ্রুপের মধ্যে আলাদাভাবে যোগ করা হয়। এক খাতার ডেবিট ব্যালেন্স অন্য খাতার ক্রেডিট " +
          "ব্যালেন্সের সাথে কাটাকাটি হয় না। খাতাভিত্তিক বিস্তারিত বিস্তারিত রিপোর্টে পাওয়া যাবে।",
      },
      {
        n: 4,
        title: "মজুদ ও মিলকরণ",
        body:
          "সমাপনী মজুদ সাধারণ খাতার বাইরের মজুদ রেকর্ড থেকে মূল্যায়িত, তাই এই রেওয়ামিলে নেই। ব্যালেন্স শিটের সাথে " +
          "মেলাতে মজুদ মূল্যায়ন ও সংশ্লিষ্ট লাভের হিসাব একসাথে বিবেচনা করতে হয়, দুবার না গুনে। আয় ও খরচের ব্যালেন্স " +
          "ব্যালেন্স শিটে চলতি সময়ের লাভের মধ্য দিয়ে দেখানো হয়।",
      },
      {
        n: 5,
        title: "পার্থক্য",
        body:
          "প্রারম্ভিক, লেনদেন ও সমাপনী — প্রতিটির ডেবিট-ক্রেডিট মোট মেলার কথা। কোনো পার্থক্য থাকলে কৃত্রিম সমন্বয় " +
          "ছাড়াই দেখানো হয়। পার্থক্যের কারণ খুঁজতে হবে মূল পোস্টিং, প্রারম্ভিক ব্যালেন্স, রিপোর্টের ফিল্টার ও হিসাবের " +
          "নিয়মে।",
      },
      ...(stockBn ? [stockBn] : []),
    ];
  }

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
    ...(stockNote ? [{ n: 6, title: stockNote.title, body: stockNote.body }] : []),
  ];
};
