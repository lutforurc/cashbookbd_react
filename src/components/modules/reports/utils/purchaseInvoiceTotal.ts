/**
 * What the supplier billed for one purchase voucher.
 *
 * ⚠️ THE INVOICE'S OWN TOTAL, NOT THE SUM OF ITS PRODUCT LINES. A Tiles bill can
 * add carriage, the tax head and service charge on top of the goods; they are
 * posted to the ledger and stored in purchase_master.total, which is the bill's
 * own figure. Summing the details instead leaves the report short by those
 * charges -- a bill paid in full then reads a negative balance (-1,800 on the
 * first bill that carried them), which is what the desk reported.
 *
 * The details stay as the fallback: a payload without a master, or a bill from a
 * screen that stores goods only (production, electronics, labour), reads exactly
 * as it did.
 */
export const purchaseInvoiceTotal = (row: any): number => {
  const masterTotal = Number(row?.purchase_master?.total);
  if (Number.isFinite(masterTotal) && masterTotal !== 0) {
    return masterTotal;
  }

  const details = Array.isArray(row?.purchase_master?.details)
    ? row.purchase_master.details
    : [];

  return details.reduce(
    (sum: number, detail: any) =>
      sum + (Number(detail?.quantity) || 0) * (Number(detail?.purchase_price) || 0),
    0,
  );
};