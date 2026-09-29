import { number } from 'yup';

export interface TableRow {
  sl_number: number | '';
  vr_date: string;
  mid: number | string;
  mtm_id?: number | string;
  combined_number?: string | null;
  /** The voucher Edit should open, when the server names a different one. */
  edit_vr_no?: string | null;
  vr_no: string;
  name: string;
  remarks: string | null;
  branch_id: string | null;
  branch_name?: string | null;
  is_approved?: number | string;
  approved_by?: string | null;
  /**
   * Whether the voucher Edit will open was typed on a bank screen. Same trap as
   * edit_vr_no below: the server sends it, the mapper is a whitelist, and a key
   * not named here is gone before the Edit button looks at the row -- which sent
   * every bank receipt on this Ledger to the Cash Received screen.
   */
  is_bank_voucher?: boolean;
  /**
   * The Tiles & Sanitary trade's own numbers, typed on the voucher by hand.
   *
   * ⚠️ NOT the system's voucher number (`vr_no`) and not a system challan --
   * these are what the shop wrote in its own khata, stored on the voucher
   * itself (main_trx_master), so the report already knows the row that holds
   * them. The endpoint selects them already, and the filled ones are read
   * through here so a printed ledger may show them in a column of their own.
   * (The server also folds each into `name`, in brackets -- see the note on
   * the catalogue in printTemplate.ts.)
   */
  manual_voucher_no?: string | null;
  manual_challan_no?: string | null;
  debit: number;
  credit: number;
  voucher_image: string | null;
  running_balance?: number | '';
}

export const generateTableData = (data: any, descending = false): TableRow[] => {

  if (!data) return []; // safeguard if data is undefined

  
  const details = data.details || [];
  let branchId: number | null = null;

  // Opening balance calculation
  const totalDebit = data?.opening_balance?.total_debit;
  const totalCredit = data?.opening_balance?.total_credit;
     

  const openingRow: TableRow = {
    sl_number: '',
    vr_date: '',
    mid: '',
    vr_no: '',
    name: 'Opening',
    remarks: '',
    branch_id: '',
    branch_name: '',
    debit: Math.max(totalDebit - totalCredit, 0),
    credit: Math.max(totalCredit - totalDebit, 0),
    voucher_image: '',
    running_balance: Math.max(totalDebit - totalCredit, 0) - Math.max(totalCredit - totalDebit, 0),
  };

  // Flatten details safely
  const detailsRows: TableRow[] = details.map((trx: any, index: number) => ({
  sl_number: index + 1,
  vr_date: trx.vr_date,
  mid: trx.mid || '',
  mtm_id: trx.mtm_id || trx.mid || '',
  combined_number: trx.combined_number || null,
  // ⚠️ This mapper is a whitelist -- a column the server sends but is not named
  // here is silently gone by the time the table (and its Edit button) sees the
  // row. A tiles receipt's discount journal is edited on the receipt's screen,
  // and the server says so in edit_vr_no; without this line Edit falls back to
  // the row's own 5- number and opens the Journal Entry form instead.
  edit_vr_no: trx.edit_vr_no || null,
  vr_no: trx.vr_no,
  name: trx.name, // এখন coa_l4 relation লোড হচ্ছে না, তাই placeholder
  remarks: trx.remarks || '-',
  branch_id: String(trx.branch_id).padStart(4, '0'), // 4-digit format
  branch_name: trx.branch_name || '',
  is_approved: trx.is_approved ?? 0,
  // `Boolean()` and not `=== true`: the server sends a real boolean today, but a
  // 1 from anywhere else would have to fail silently for the desk to notice.
  is_bank_voucher: Boolean(trx.is_bank_voucher),
  approved_by: trx.approved_by || null,
  // ⚠️ This mapper is a whitelist -- a key the server sends but is not named
  // here never reaches the row. The two hand-typed Tiles numbers are read
  // through so the printed ledger can show them. See the note on the TableRow
  // type.
  manual_voucher_no: trx.manual_voucher_no ?? null,
  manual_challan_no: trx.manual_challan_no ?? null,
  debit: parseFloat(trx.debit || 0),
  credit: parseFloat(trx.credit || 0),
  voucher_image: trx.voucher_image || null,
}));

  // ⚠️ WALKED OLDEST FIRST WHATEVER THE LAYOUT: the figure beside a row is the
  // balance after that voucher, and that does not change because the customer
  // reads the list the other way up.
  let previousAmount = Number(openingRow.running_balance || 0);
  detailsRows.forEach((row) => {
    previousAmount = previousAmount + Number(row.debit || 0) - Number(row.credit || 0);
    row.running_balance = previousAmount;
  });

  /**
   * Descending = the newest voucher first, read like a statement: the three
   * summary rows on top, the vouchers newest to oldest under them, and Opening
   * (the state before the period) left at the very end. Ascending is untouched
   * -- Opening first, the summaries at the foot, as it has always been.
   *
   * The line numbers follow the order shown, so the list reads 1, 2, 3 from the
   * top in either format.
   */
  const shownDetails = descending ? [...detailsRows].reverse() : detailsRows;
  // ⚠️ A LINE WITH NO VOUCHER OF ITS OWN GETS NO NUMBER, AND DOES NOT TAKE ONE.
  // The discount a discounted bill is broken into rides along under it as a row
  // of its own, with the number and the date left blank by the split in
  // ReportsController, and the owner asked for the Sl. No. to read blank beside
  // it as well. Counting it left a gap in the list -- 1, 2, 4 -- so the counter
  // moves only for the rows that are a document.
  let slNumber = 0;
  shownDetails.forEach(
    (row) => (row.sl_number = row.vr_no ? ++slNumber : ''),
  );

  // Sum all debit
  const rangeDebit = detailsRows.reduce(
    (sum, row) => sum + (Number(row.debit) || 0),
    0,
  );

  const rangeCredit = detailsRows.reduce(
    (sum, row) => sum + (Number(row?.credit) || 0),
    0,
  );
  const rangeRow: TableRow = {
    sl_number: '',
    vr_date: '',
    vr_no: '',
    name: 'Range Total',
    remarks: '',
    branch_id: '',
    debit: Math.max(rangeDebit, 0),
    credit: Math.max(rangeCredit, 0),
    voucher_image: '',
    running_balance: '',
  };

  // Total & Balance. The sums below do not care which way the rows are shown,
  // so this is the report as it would read oldest-first.
  const allRows = [openingRow, ...shownDetails];
  const totalDebitSum = allRows.reduce((sum, row) => sum + row.debit, 0);
  const totalCreditSum = allRows.reduce((sum, row) => sum + row.credit, 0);

  const totalRow: TableRow = {
    sl_number: '',
    vr_date: '',
    vr_no: '',
    name: 'Total',
    remarks: '',
    branch_id: '',
    debit: totalDebitSum,
    credit: totalCreditSum,
    voucher_image: '',
    running_balance: '',
  };

  const balanceRow: TableRow = {
    sl_number: '',
    vr_date: '',
    vr_no: '',
    name: 'Balance',
    remarks: '',
    branch_id: branchId,
    debit: Math.max(totalDebitSum - totalCreditSum, 0),
    credit: Math.max(totalCreditSum - totalDebitSum, 0),
    voucher_image: '',
    running_balance: '',
  };

  // Descending is the ascending report stood on its head: the three summary
  // rows turn round with everything else, so the closing Balance is the very
  // first line and Range Total the last of them, above the vouchers.
  return descending
    ? [balanceRow, totalRow, rangeRow, ...shownDetails, openingRow]
    : [...allRows, rangeRow, totalRow, balanceRow];
};
