/**
 * The money on one Purchase Return / Sales Return, read off its voucher.
 *
 * ⚠️ SHARED, NOT COPIED, BETWEEN THE SCREEN AND THE PAPER. The print sheet is
 * mounted hidden beside the table and has to arrive at the same totals the
 * screen shows; two copies of this arithmetic is how the paper and the screen
 * come to disagree about the same rows.
 *
 * ⚠️ A RETURN'S MONEY SITS ON THE OPPOSITE SIDE TO THE INVOICE'S -- that is the
 * whole of the difference between the two, and it is why the sides are config
 * rather than constants here. A purchase return brings cash back in (Cash 17
 * debit) and reverses the discount against head 40 debit; a sales return pays
 * cash out (17 credit) and reverses against head 23 credit. Read off
 * CommonFunction\ReturnTransaction, which writes them. The Balance column is
 * then the invoice's own formula, unchanged: total - discount - cash.
 *
 * ⚠️ THE DISCOUNT AND THE CASH LEG ARE READ FROM THE VOUCHER, NOT FROM THE
 * MASTER ROW. `inventory_*_return_masters.discount` and `.netpayment` are what
 * the screen was told; the legs are what was actually posted, and the two have
 * disagreed before. The ledger beside this reads the legs too.
 */

export type ReturnLedgerConfig = {
  /** Which relation on the voucher holds the lines. */
  partyRelation: 'purchase_return_master' | 'sales_return_master';
  discountCoa4: number;
  discountSide: 'debit' | 'credit';
  cashCoa4: number;
  cashSide: 'debit' | 'credit';
};

const parseNumber = (value: unknown): number => {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const cleaned = String(value).replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
};

/** Every posting line on the voucher, whichever journal it was written in. */
const allLegs = (row: any): any[] => {
  const masters = Array.isArray(row?.acc_transaction_master)
    ? row.acc_transaction_master
    : row?.acc_transaction_master
      ? [row.acc_transaction_master]
      : [];

  return masters.reduce((acc: any[], master: any) => {
    if (Array.isArray(master?.acc_transaction_details)) {
      acc.push(...master.acc_transaction_details);
    }

    return acc;
  }, []);
};

const legSum = (row: any, coa4: number, side: 'debit' | 'credit'): number =>
  allLegs(row)
    .filter((leg: any) => Number(leg?.coa4_id) === coa4)
    .reduce((sum: number, leg: any) => sum + parseNumber(leg?.[side]), 0);

export const returnLines = (row: any, cfg: ReturnLedgerConfig): any[] => {
  const lines = row?.[cfg.partyRelation]?.details;

  return Array.isArray(lines) ? lines : [];
};

/** Rate x quantity across the returned lines — the Total column. */
export const returnRowTotal = (row: any, cfg: ReturnLedgerConfig): number =>
  returnLines(row, cfg).reduce(
    (sum: number, line: any) =>
      sum + parseNumber(line?.return_price) * parseNumber(line?.quantity),
    0,
  );

export const returnRowDiscount = (row: any, cfg: ReturnLedgerConfig): number =>
  legSum(row, cfg.discountCoa4, cfg.discountSide);

/** Cash handed back on a purchase return, or paid out on a sales return. */
export const returnRowCash = (row: any, cfg: ReturnLedgerConfig): number =>
  legSum(row, cfg.cashCoa4, cfg.cashSide);

export const returnRowBalance = (row: any, cfg: ReturnLedgerConfig): number =>
  returnRowTotal(row, cfg) - returnRowDiscount(row, cfg) - returnRowCash(row, cfg);

export type ReturnLedgerTotals = {
  quantity: number;
  total: number;
  discount: number;
  cash: number;
  balance: number;
};

export const returnGrandTotals = (
  rows: any[],
  cfg: ReturnLedgerConfig,
): ReturnLedgerTotals =>
  (Array.isArray(rows) ? rows : []).reduce<ReturnLedgerTotals>(
    (totals, row) => ({
      quantity:
        totals.quantity +
        returnLines(row, cfg).reduce(
          (sum: number, line: any) => sum + parseNumber(line?.quantity),
          0,
        ),
      total: totals.total + returnRowTotal(row, cfg),
      discount: totals.discount + returnRowDiscount(row, cfg),
      cash: totals.cash + returnRowCash(row, cfg),
      balance: totals.balance + returnRowBalance(row, cfg),
    }),
    { quantity: 0, total: 0, discount: 0, cash: 0, balance: 0 },
  );
