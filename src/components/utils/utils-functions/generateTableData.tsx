import { number } from 'yup';

export interface TableRow {
  sl_number: number | '';
  vr_date: string;
  mid: number | string;
  vr_no: string;
  name: string;
  remarks: string | null;
  branch_id: string | null;
  branch_name?: string | null;
  debit: number;
  credit: number;
  voucher_image: string | null;
}

export const generateTableData = (data: any): TableRow[] => {

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
  };

  // Flatten details safely
  const detailsRows: TableRow[] = details.map((trx: any, index: number) => ({
  sl_number: index + 1,
  vr_date: trx.vr_date,
  mid: trx.mid || '',
  vr_no: trx.vr_no,
  name: trx.name, // এখন coa_l4 relation লোড হচ্ছে না, তাই placeholder
  remarks: trx.remarks || '-',
  branch_id: String(trx.branch_id).padStart(4, '0'), // 4-digit format
  branch_name: trx.branch_name || '',
  debit: parseFloat(trx.debit || 0),
  credit: parseFloat(trx.credit || 0),
  voucher_image: trx.voucher_image || null,
}));

  // Assign sequential sl_number
  detailsRows.forEach((row, idx) => (row.sl_number = idx + 1));

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
  };

  // Total & Balance
  const allRows = [openingRow, ...detailsRows];
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
  };

  return [...allRows, rangeRow, totalRow, balanceRow];
};
