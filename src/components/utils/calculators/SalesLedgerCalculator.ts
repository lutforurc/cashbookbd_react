class SalesLedgerCalculator {
  private tableData: any[];

  constructor(tableData: any[]) {
    this.tableData = tableData || [];
  }

  // Total Quantity
  getTotalQuantity(): number {
    return this.tableData.reduce((sum, row) => {
      const rowTotal =
        row?.sales_master?.details?.reduce(
          (subSum: number, detail: any) =>
            subSum + (Number(detail?.quantity) || 0),
          0,
        ) || 0;
      return sum + rowTotal;
    }, 0);
  }

  // Total Payment
  getTotalPayment(): number {
    return this.tableData.reduce((sum, row) => {
      const rowTotal =
        row?.sales_master?.details?.reduce(
          (subSum: number, detail: any) =>
            subSum +
            (Number(detail?.sales_price) || 0) *
              (Number(detail?.quantity) || 0),
          0,
        ) || 0;
      return sum + rowTotal;
    }, 0);
  }

  // Grand Total (Received)
  getGrandTotal(): number {
    return this.tableData.reduce((sum, row) => {
      const transaction = row?.acc_transaction_master?.find((tm: any) =>
        tm?.acc_transaction_details?.some((d: any) => d?.coa4_id === 17),
      );

      const debitValue =
        transaction?.acc_transaction_details?.find(
          (d: any) => d?.coa4_id === 17,
        )?.debit || 0;

      return sum + Number(debitValue);
    }, 0);
  }

  // Total Balance (Due)
  getTotalBalance(): number {
    return this.tableData.reduce((sum, row) => {
      const transaction = row?.acc_transaction_master?.find(
        (tm: any) => tm?.acc_transaction_details?.[0]?.coa4_id === 17,
      );

      const debitValue = transaction?.acc_transaction_details?.[0]?.debit
        ? parseFloat(transaction.acc_transaction_details[0].debit)
        : 0;

      const balance = (row?.sales_master?.total || 0) - debitValue;
      return sum + balance;
    }, 0);
  }

  // Grand Discount Total
  getDiscountTotal(): number {
    return this.tableData.reduce((sum, row) => {
      const transaction = row?.acc_transaction_master?.find((tm: any) =>
        tm?.acc_transaction_details?.some((d: any) => d?.coa4_id === 23),
      );

      const debitValue =
        transaction?.acc_transaction_details?.find(
          (d: any) => d?.coa4_id === 23,
        )?.debit || 0;

      return sum + Number(debitValue);
    }, 0);
  }
}

export default SalesLedgerCalculator;
