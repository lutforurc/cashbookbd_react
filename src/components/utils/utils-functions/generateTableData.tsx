export interface TableRow {
  sl_number: number | '';
  vr_date: string;
  vr_no: string;
  name: string;
  remarks: string | null;
  branch_id: string | null;
  debit: number;
  credit: number;
  voucher_image: string | null;
}

export const generateTableData = (data: any): TableRow[] => {

    console.log(data);
  if (!data) return []; // safeguard if data is undefined

  const openingBalance = data.opening_balance || [];
  const details = data.details || [];
  let branchId: number | null = null;

  // Opening balance calculation
  const totalDebit = openingBalance.reduce((sum: number, trx: any) => {
    branchId = trx.branch_id;
    return (
      sum +
      (trx.acc_transaction_master || []).reduce((mSum: number, master: any) => {
        return (
          mSum +
          (master.acc_transaction_details || []).reduce(
            (dSum: number, detail: any) => dSum + parseFloat(detail.debit || 0),
            0
          )
        );
      }, 0)
    );
  }, 0);

  const totalCredit = openingBalance.reduce((sum: number, trx: any) => {
    return (
      sum +
      (trx.acc_transaction_master || []).reduce((mSum: number, master: any) => {
        return (
          mSum +
          (master.acc_transaction_details || []).reduce(
            (dSum: number, detail: any) => dSum + parseFloat(detail.credit || 0),
            0
          )
        );
      }, 0)
    );
  }, 0);

  const openingRow: TableRow = {
    sl_number: '',
    vr_date: '',
    vr_no: '',
    name: 'Opening',
    remarks: '',
    branch_id: '',
    debit: Math.max(totalDebit - totalCredit, 0),
    credit: Math.max(totalCredit - totalDebit, 0),
    voucher_image: '',
  };

  // Flatten details safely
  const detailsRows: TableRow[] = details.flatMap((trx: any) =>
    (trx.acc_transaction_master || []).flatMap((master: any) =>
      (master.acc_transaction_details || []).map((detail: any) => ({
        sl_number: 0, // will assign next
        vr_date: trx.vr_date,
        vr_no: trx.vr_no,
        name: detail.coa_l4?.name || '-',
        remarks: detail.remarks,
        branch_id: String(trx.branch_id).padStart(4, '0'), // Ensure branch_id is a 3-digit string
        debit: parseFloat(detail.debit || 0),
        credit: parseFloat(detail.credit || 0),
        voucher_image: trx.voucher_image || null,
      }))
    )
  );

  // Assign sequential sl_number
  detailsRows.forEach((row, idx) => (row.sl_number = idx + 1));

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

  return [...allRows, totalRow, balanceRow];
};
