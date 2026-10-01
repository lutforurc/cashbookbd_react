import dayjs from 'dayjs';
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';
import type { PrintBranch } from '../../../utils/utils-functions/printBranch';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { getRelevantCoaName } from '../utils/ledgerNameResolver';
import { ledgerProductLabel } from '../utils/ledgerProductLabel';

/**
 * A Purchase Ledger report, in the shape the print designer draws.
 *
 * The twin of salesLedgerDocumentData.ts -- read that one's notes, which hold
 * for this the same way, in particular the one about every per-row figure here
 * mirroring the one PurchaseLedgerPrint.tsx foots. The differences are the
 * supplier's side of the money and nothing else:
 *
 * ⚠️ A purchase's money is on the CREDIT side of its own accounts -- discount
 * coa4_id 40 and payment coa4_id 17, both read from `credit`, where the sales
 * ledger reads the same two accounts from `debit`. Taking the debit here prints
 * a supplier's ledger of zeroes.
 *
 * ⚠️ The `received` key carries what the shop PAID the supplier, because that
 * is the column the renderer knows how to foot. The designer labels it
 * "Payment" on this paper -- see ledgerHeading.
 */
export type PurchaseLedgerDocumentOptions = {
  rows: any[];
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  accountName?: string | null;
  productName?: string | null;
  branch?: PrintBranch | null;
  /** The branch's name for the heading -- see the note on the sales twin. */
  branchName?: string | null;
  showCategory?: boolean;
  /**
   * Branch > Invoice Setup > "Show Product Information in Ledger Details".
   * Undefined/false-y keeps the product lines (the report has always printed
   * them); only an explicit `false` drops them from the cell's block, leaving
   * the account and the note. The quantity/rate/total lines are untouched.
   */
  showProductDetails?: boolean;
};

const num = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** The first matching transaction, and the first matching line in it -- the
 *  calculator's rule, kept so the printed foot and the screen's agree. */
const postedCredit = (row: any, coa4Id: number) => {
  const masters = Array.isArray(row?.acc_transaction_master)
    ? row.acc_transaction_master
    : [];

  const master = masters.find((entry: any) =>
    entry?.acc_transaction_details?.some((detail: any) => detail?.coa4_id === coa4Id),
  );

  return num(
    master?.acc_transaction_details?.find((detail: any) => detail?.coa4_id === coa4Id)?.credit,
  );
};

const dateText = (value?: Date | string | null) =>
  value ? dayjs(value).format('DD/MM/YYYY') : '';

export const toPurchaseLedgerDocumentData = ({
  rows,
  startDate,
  endDate,
  accountName,
  productName,
  branch,
  branchName,
  showCategory,
  showProductDetails,
}: PurchaseLedgerDocumentOptions): DocumentData => {
  const list = Array.isArray(rows) ? rows : [];
  const from = dateText(startDate);
  const to = dateText(endDate);

  const products = list.map((row) => {
    const details: any[] = Array.isArray(row?.purchase_master?.details)
      ? row.purchase_master.details
      : [];

    const coaName = getRelevantCoaName(row) ?? '';

    const label = (detail: any) => ledgerProductLabel(detail, !!showCategory);

    const perLine = (draw: (detail: any) => string) =>
      details.length ? details.map(draw) : ['-'];

    const discount = postedCredit(row, 40);
    const paid = postedCredit(row, 17);
    const amount = details.reduce(
      (sum, detail) => sum + num(detail?.quantity) * num(detail?.purchase_price),
      0,
    );

    // The products alone, for the composed column's {products} token -- empty
    // when the branch has switched product information off, so the cell keeps
    // its account and its note and loses only the product lines.
    const productLines = showProductDetails === false ? [] : details.map(label);

    // The cell's block, the bespoke print's own order: the account, then a
    // product per line, then the voucher's note. Blank parts dropped, so an
    // account-less or note-less voucher leaves no empty line box behind.
    const block = [
      coaName,
      ...productLines,
      String(row?.purchase_master?.notes ?? '').trim(),
    ].filter(Boolean);

    return {
      id: row?.id ?? row?.mtmid,
      sl: row?.sl_number,
      challan_no: row?.challan_no ?? '',
      challan_date: row?.challan_date ?? '',
      coa_name: coaName,
      // The products alone, for the composed column's {products} token.
      products: productLines,

      // The account, then the products, then the voucher's own note: exactly
      // the block the bespoke print draws in this cell, handed over three ways
      // (LEDGER_LINE_FIELDS) -- as lines, as one line, and as the parts a
      // pattern may arrange.
      product_details_lines: block,
      product_details_flat: block.join(' '),

      // ⚠️ THE OLD NAME, KEPT FILLED. A layout saved before the ledger got its
      // own Product & Details column still points at `product_lines`, whose
      // composed pattern names the invoice's product facts and so composes to
      // nothing on a ledger row. DocumentPrint draws the row's own lines
      // wherever the pattern wrote nothing, so filling this too means such a
      // layout prints its block instead of a blank cell -- migration or no
      // migration. See retargetLedgerProductColumn in printTemplate.ts.
      product_lines: block,

      qty_lines: perLine((detail) => thousandSeparator(num(detail?.quantity))),
      rate_lines: perLine((detail) =>
        num(detail?.purchase_price) ? thousandSeparator(num(detail.purchase_price)) : '-',
      ),
      amount_lines: perLine((detail) =>
        num(detail?.purchase_price)
          ? thousandSeparator(num(detail?.quantity) * num(detail.purchase_price))
          : '-',
      ),

      qty: details.reduce((sum, detail) => sum + num(detail?.quantity), 0),
      amount,
      discount,
      received: paid,
      // ⚠️ The column the purchase paper has never had. Its foot printed the
      // report's balance as one figure with no column above it that added up to
      // it; here the column exists and the foot sums it, to the same number.
      balance: amount - discount - paid,
      notes: row?.purchase_master?.notes ?? '',
    };
  });

  return {
    basic: {
      report_range: from && to ? `${from} to ${to}` : from || to,
      ledger_account: accountName ?? '',
      ledger_product: productName ?? '',
      branch_name: branchName || branch?.name || '',
    },
    products,
    branch: branch ?? null,
  };
};
